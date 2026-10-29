"""Shared game publishing and review service. Run: python community_server.py."""
import hashlib
import hmac
import os
from pathlib import Path
import re
import secrets
import sqlite3
import threading
import time
from collections import defaultdict, deque
from contextlib import closing
from datetime import datetime, timezone
from urllib.parse import urlsplit

from flask import Flask, abort, g, jsonify, request, send_from_directory
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash, generate_password_hash

ROOT = Path(__file__).resolve().parent
CATEGORIES = {'sandbox':'沙盒模拟', 'puzzle':'益智解谜', 'action':'动作挑战',
              'adventure':'冒险探索', 'casual':'休闲小游戏', 'other':'其他'}
PUBLIC_FILES = {'index.html', 'community.html', 'game.html', 'publish.html',
                'community.css', 'community.js', 'community-github.js', 'community-github-data.js', 'community-snapshot.json', 'cosmic-collision-3d.html',
                'cosmic-collision-simulator.html', 'planet-assessment.js', 'game-overlays.css'}
SCHEMA = '''
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
 password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 csrf TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS games (
 id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL,
 play_url TEXT NOT NULL, user_id INTEGER REFERENCES users(id), author_name TEXT NOT NULL,
 published INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reviews (
 id INTEGER PRIMARY KEY, game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
 user_id INTEGER NOT NULL REFERENCES users(id), rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
 body TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(game_id,user_id));
CREATE TABLE IF NOT EXISTS replies (
 id INTEGER PRIMARY KEY, review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
 user_id INTEGER NOT NULL REFERENCES users(id), body TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS reviews_game ON reviews(game_id,id);
CREATE INDEX IF NOT EXISTS replies_review ON replies(review_id,id);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
'''
GAME_SELECT = '''SELECT games.*,
 (SELECT AVG(rating) FROM reviews WHERE game_id=games.id) AS rating_average,
 (SELECT COUNT(*) FROM reviews WHERE game_id=games.id) AS rating_count,
 ((SELECT COUNT(*) FROM reviews WHERE game_id=games.id) +
  (SELECT COUNT(*) FROM replies JOIN reviews ON replies.review_id=reviews.id WHERE reviews.game_id=games.id)) AS discussion_count
 FROM games'''


def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def create_app(config=None):
    app = Flask(__name__, static_folder=None)
    app.config.update(DATABASE=os.environ.get('COMMUNITY_DATABASE', str(ROOT / 'community_data/community.sqlite3')),
                      MAX_CONTENT_LENGTH=24 * 1024, COOKIE_SECURE=os.environ.get('COMMUNITY_HTTPS') == '1',
                      PUBLIC_ORIGIN=os.environ.get('COMMUNITY_ORIGIN', '').rstrip('/'))
    if config:
        app.config.update(config)
    Path(app.config['DATABASE']).parent.mkdir(parents=True, exist_ok=True)

    def connect():
        conn = sqlite3.connect(app.config['DATABASE'], timeout=15)
        conn.row_factory = sqlite3.Row
        conn.execute('PRAGMA foreign_keys=ON')
        return conn

    with closing(connect()) as conn:
        conn.execute('PRAGMA journal_mode=WAL')
        conn.executescript(SCHEMA)
        stamp = now()
        for game_id, title, description, url in [
            (1, '宇宙碰撞 · 3D 宇宙', '创造天体、探索引力与碰撞。在三维空间旋转观察星球、黑洞和冲击波，打造自己的宇宙。', '/cosmic-collision-3d.html'),
            (2, '宇宙碰撞 · 2D 引力沙盒', '拖动发射天体，体验轨道、碰撞和星系演化。轻量运行，适合随时开始一场引力实验。', '/cosmic-collision-simulator.html')]:
            conn.execute('INSERT OR IGNORE INTO games(id,title,description,category,play_url,author_name,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)',
                         (game_id,title,description,'sandbox',url,'晨晨',stamp,stamp))
        conn.execute('DELETE FROM sessions WHERE expires_at < ?', (int(time.time()),))
        conn.commit()

    def db():
        if 'db' not in g:
            g.db = connect()
        return g.db

    @app.teardown_appcontext
    def close_db(_error):
        if 'db' in g:
            g.db.close()

    attempts = defaultdict(deque)
    rate_lock = threading.Lock()

    @app.before_request
    def guard_api():
        if not request.path.startswith('/api/'):
            return
        g.user = None
        g.auth_session = None
        token = request.cookies.get('community_session', '')
        if token:
            row = db().execute('SELECT sessions.*,users.username FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>?',
                               (hashlib.sha256(token.encode()).hexdigest(),int(time.time()))).fetchone()
            if row:
                g.user = {'id':row['user_id'], 'username':row['username']}
                g.auth_session = row
        if request.method in {'POST','PUT','PATCH','DELETE'}:
            origin = request.headers.get('Origin')
            expected = app.config['PUBLIC_ORIGIN'] or request.host_url.rstrip('/')
            if origin and origin != expected:
                abort(403, description='请求来源不匹配，请从本站页面操作。')
            is_auth = request.path in {'/api/auth/login','/api/auth/register'}
            if is_auth:
                if not request.is_json:
                    abort(415, description='请使用 JSON 请求。')
                with rate_lock:
                    key = request.remote_addr or 'local'
                    current = time.monotonic()
                    # Bound inactive IP entries as well as each queue.
                    for stale in list(attempts):
                        if not attempts[stale] or attempts[stale][-1] < current - 600:
                            del attempts[stale]
                    queue = attempts[key]
                    while queue and queue[0] < current - 600:
                        queue.popleft()
                    if len(queue) >= 30:
                        abort(429, description='登录或注册尝试过多，请稍后再试。')
                    queue.append(current)
            else:
                if not g.user:
                    abort(401, description='请先登录后再操作。')
                if not hmac.compare_digest(request.headers.get('X-CSRF-Token','').encode(),g.auth_session['csrf'].encode()):
                    abort(403, description='登录校验已失效，请刷新页面重试。')

    @app.after_request
    def headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        if request.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-store'
        if request.path in {'/community.html','/game.html','/publish.html'}:
            response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' https://api.github.com; img-src 'self' data:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
        return response

    @app.errorhandler(HTTPException)
    def http_error(error):
        return jsonify(error=error.description), error.code

    def payload():
        data = request.get_json(silent=True)
        if not isinstance(data,dict):
            abort(400, description='提交内容格式不正确。')
        return data

    def text(data, name, minimum, maximum):
        value = data.get(name)
        if not isinstance(value,str) or not minimum <= len(value.strip()) <= maximum:
            abort(400, description=f'{name} 长度需要在 {minimum}–{maximum} 字之间。')
        return value.strip()

    def page_number():
        try:
            value = int(request.args.get('page',1))
        except ValueError:
            abort(400, description='页码无效。')
        if not 1 <= value <= 10000:
            abort(400, description='页码无效。')
        return value

    def game_json(row):
        result = dict(row)
        result['is_owner'] = bool(g.user and row['user_id'] == g.user['id'])
        if result['rating_average'] is not None:
            result['rating_average'] = round(result['rating_average'],2)
        return result

    def find_game(game_id, owner=False):
        row = db().execute(GAME_SELECT+' WHERE games.id=?',(game_id,)).fetchone()
        if not row or (not row['published'] and (not g.user or g.user['id'] != row['user_id'])):
            abort(404, description='游戏不存在或已下架。')
        if owner and (not g.user or row['user_id'] != g.user['id']):
            abort(403, description='只能管理自己发布的作品。')
        return row

    def review_json(row):
        result = dict(row)
        result['is_owner'] = bool(g.user and row['user_id'] == g.user['id'])
        return result

    def find_review(review_id):
        row = db().execute('SELECT reviews.*,users.username FROM reviews JOIN users ON users.id=reviews.user_id WHERE reviews.id=?',(review_id,)).fetchone()
        if not row:
            abort(404, description='评价不存在。')
        find_game(row['game_id'])
        return row

    def validate_game(data):
        title = text(data,'title',2,80)
        description = text(data,'description',20,4000)
        category = data.get('category')
        if not isinstance(category,str) or category not in CATEGORIES:
            abort(400, description='请选择有效游戏分类。')
        url = text(data,'play_url',8,1000)
        try:
            parsed = urlsplit(url)
            valid = parsed.scheme in {'http','https'} and bool(parsed.hostname) and not parsed.username and not parsed.password
            _port = parsed.port
        except ValueError:
            valid = False
        if not valid or re.search(r'[\x00-\x20\x7f\\]',url):
            abort(400, description='游戏网址必须是有效 HTTP/HTTPS 链接，不能包含账号密码。')
        return title,description,category,url

    def open_session(user, status=200):
        token = secrets.token_urlsafe(32)
        csrf = secrets.token_urlsafe(32)
        if g.auth_session:
            db().execute('DELETE FROM sessions WHERE token_hash=?',(g.auth_session['token_hash'],))
        db().execute('INSERT INTO sessions VALUES(?,?,?,?)',
                     (hashlib.sha256(token.encode()).hexdigest(),user['id'],csrf,int(time.time())+14*86400))
        db().commit()
        response = jsonify(user={'id':user['id'],'username':user['username']},csrf=csrf)
        response.status_code = status
        response.set_cookie('community_session',token,max_age=14*86400,httponly=True,samesite='Lax',secure=app.config['COOKIE_SECURE'])
        return response

    @app.get('/api/auth/me')
    def me():
        return jsonify(user=g.user,csrf=g.auth_session['csrf'] if g.auth_session else None)

    @app.post('/api/auth/register')
    def register():
        data = payload()
        username = text(data,'username',2,24)
        if not re.fullmatch(r'[\w-]{2,24}',username):
            abort(400, description='昵称仅支持中文、字母、数字、下划线和短横线。')
        password = data.get('password')
        if not isinstance(password,str) or not 8 <= len(password) <= 128:
            abort(400, description='密码长度需要为 8–128 位。')
        hashed = generate_password_hash(password)
        try:
            cursor = db().execute('INSERT INTO users(username,password_hash,created_at) VALUES(?,?,?)',(username,hashed,now()))
            db().commit()
        except sqlite3.IntegrityError:
            abort(409, description='昵称已被使用，请换一个。')
        return open_session({'id':cursor.lastrowid,'username':username},201)

    @app.post('/api/auth/login')
    def login():
        data = payload()
        username = text(data,'username',2,24)
        password = data.get('password')
        row = db().execute('SELECT * FROM users WHERE username=?',(username,)).fetchone()
        if not isinstance(password,str) or len(password)>128 or not row or not check_password_hash(row['password_hash'],password):
            abort(401, description='昵称或密码不正确。')
        return open_session(row)

    @app.post('/api/auth/logout')
    def logout():
        db().execute('DELETE FROM sessions WHERE token_hash=?',(g.auth_session['token_hash'],))
        db().commit()
        response = jsonify(ok=True)
        response.delete_cookie('community_session')
        return response

    @app.get('/api/games')
    def list_games():
        page = page_number()
        mine = request.args.get('mine') == '1'
        if mine and not g.user:
            abort(401, description='请登录后查看自己的作品。')
        clauses, params = (['games.user_id=?'],[g.user['id']]) if mine else (['games.published=1'],[])
        category = request.args.get('category','')
        if category:
            if category not in CATEGORIES:
                abort(400, description='游戏分类无效。')
            clauses.append('games.category=?'); params.append(category)
        query = request.args.get('q','').strip()[:100]
        if query:
            clauses.append('(games.title LIKE ? OR games.description LIKE ? OR games.author_name LIKE ?)')
            params.extend(['%'+query+'%']*3)
        order = {'newest':'games.id DESC','rating':'COALESCE(rating_average,0) DESC,rating_count DESC,games.id DESC'}
        sort = request.args.get('sort','newest')
        if sort not in order:
            abort(400, description='排序方式无效。')
        where = ' WHERE '+' AND '.join(clauses)
        total = db().execute('SELECT COUNT(*) FROM games'+where,params).fetchone()[0]
        page = min(page,max(1,(total+11)//12))
        rows = db().execute(GAME_SELECT+where+' ORDER BY '+order[sort]+' LIMIT 12 OFFSET ?',params+[(page-1)*12]).fetchall()
        stats = {'games':db().execute('SELECT COUNT(*) FROM games WHERE published=1').fetchone()[0],
                 'reviews':db().execute('SELECT COUNT(*) FROM reviews JOIN games ON games.id=reviews.game_id WHERE games.published=1').fetchone()[0],
                 'creators':db().execute("SELECT COUNT(DISTINCT CASE WHEN user_id IS NULL THEN 'builtin:'||author_name ELSE 'user:'||user_id END) FROM games WHERE published=1").fetchone()[0]}
        return jsonify(games=[game_json(row) for row in rows],total=total,page=page,pages=max(1,(total+11)//12),stats=stats)

    @app.post('/api/games')
    def publish_game():
        values = validate_game(payload())
        stamp = now()
        cursor = db().execute('INSERT INTO games(title,description,category,play_url,user_id,author_name,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)',
                             (*values,g.user['id'],g.user['username'],stamp,stamp))
        db().commit()
        return jsonify(game=game_json(find_game(cursor.lastrowid))),201

    @app.patch('/api/games/<int:game_id>')
    def edit_game(game_id):
        find_game(game_id,owner=True)
        values = validate_game(payload())
        db().execute('UPDATE games SET title=?,description=?,category=?,play_url=?,updated_at=? WHERE id=?',(*values,now(),game_id))
        db().commit()
        return jsonify(game=game_json(find_game(game_id)))

    @app.delete('/api/games/<int:game_id>')
    def hide_game(game_id):
        find_game(game_id,owner=True)
        db().execute('UPDATE games SET published=0,updated_at=? WHERE id=?',(now(),game_id)); db().commit()
        return jsonify(ok=True)

    @app.post('/api/games/<int:game_id>/restore')
    def restore_game(game_id):
        find_game(game_id,owner=True)
        db().execute('UPDATE games SET published=1,updated_at=? WHERE id=?',(now(),game_id)); db().commit()
        return jsonify(game=game_json(find_game(game_id)))

    @app.get('/api/games/<int:game_id>')
    def game_detail(game_id):
        game = find_game(game_id)
        page = min(page_number(),max(1,(game['rating_count']+19)//20))
        rows = db().execute('SELECT reviews.*,users.username FROM reviews JOIN users ON users.id=reviews.user_id WHERE game_id=? ORDER BY reviews.id DESC LIMIT 20 OFFSET ?',
                            (game_id,(page-1)*20)).fetchall()
        reviews = []
        for row in rows:
            item = review_json(row)
            replies = db().execute('SELECT replies.*,users.username FROM replies JOIN users ON users.id=replies.user_id WHERE review_id=? ORDER BY replies.id DESC LIMIT 50',(row['id'],)).fetchall()
            item['replies'] = [review_json(reply) for reply in reversed(replies)]
            item['reply_count'] = db().execute('SELECT COUNT(*) FROM replies WHERE review_id=?',(row['id'],)).fetchone()[0]
            reviews.append(item)
        mine = db().execute('SELECT * FROM reviews WHERE game_id=? AND user_id=?',(game_id,g.user['id'])).fetchone() if g.user else None
        distribution = {str(i):0 for i in range(1,6)}
        for row in db().execute('SELECT rating,COUNT(*) AS count FROM reviews WHERE game_id=? GROUP BY rating',(game_id,)):
            distribution[str(row['rating'])] = row['count']
        return jsonify(game=game_json(game),reviews=reviews,my_review=dict(mine) if mine else None,
                       distribution=distribution,page=page,pages=max(1,(game['rating_count']+19)//20))

    @app.put('/api/games/<int:game_id>/review')
    def save_review(game_id):
        game = find_game(game_id)
        if game['user_id'] == g.user['id']:
            abort(400, description='作者不能给自己的作品评分，可以回复玩家的评价。')
        if not game['published']:
            abort(400, description='游戏已下架。')
        data = payload()
        rating = data.get('rating')
        if type(rating) is not int or not 1 <= rating <= 5:
            abort(400, description='请选择 1–5 星的整数评分。')
        body = text(data,'body',2,2000)
        stamp = now()
        db().execute('''INSERT INTO reviews(game_id,user_id,rating,body,created_at,updated_at) VALUES(?,?,?,?,?,?)
          ON CONFLICT(game_id,user_id) DO UPDATE SET rating=excluded.rating,body=excluded.body,updated_at=excluded.updated_at''',
                     (game_id,g.user['id'],rating,body,stamp,stamp)); db().commit()
        row = db().execute('SELECT * FROM reviews WHERE game_id=? AND user_id=?',(game_id,g.user['id'])).fetchone()
        return jsonify(review=review_json(row))

    @app.delete('/api/reviews/<int:review_id>')
    def delete_review(review_id):
        review = find_review(review_id)
        if review['user_id'] != g.user['id']:
            abort(403, description='只能删除自己的评价。')
        db().execute('DELETE FROM reviews WHERE id=?',(review_id,)); db().commit()
        return jsonify(ok=True)

    @app.post('/api/reviews/<int:review_id>/replies')
    def add_reply(review_id):
        review = find_review(review_id)
        game = find_game(review['game_id'])
        if not game['published']:
            abort(400, description='游戏已下架，暂不能回复。')
        body = text(payload(),'body',1,1000)
        cursor = db().execute('INSERT INTO replies(review_id,user_id,body,created_at) VALUES(?,?,?,?)',(review_id,g.user['id'],body,now()))
        db().commit()
        return jsonify(reply={'id':cursor.lastrowid,'body':body,'username':g.user['username']}),201

    @app.delete('/api/replies/<int:reply_id>')
    def delete_reply(reply_id):
        row = db().execute('SELECT * FROM replies WHERE id=?',(reply_id,)).fetchone()
        if not row:
            abort(404, description='回复不存在。')
        find_review(row['review_id'])
        if row['user_id'] != g.user['id']:
            abort(403, description='只能删除自己的回复。')
        db().execute('DELETE FROM replies WHERE id=?',(reply_id,)); db().commit()
        return jsonify(ok=True)

    @app.get('/api/health')
    def health():
        db().execute('SELECT 1')
        return jsonify(ok=True)

    @app.get('/')
    def index():
        return send_from_directory(ROOT,'index.html')

    @app.get('/<path:filename>')
    def public_file(filename):
        if filename not in PUBLIC_FILES:
            abort(404, description='页面不存在。')
        return send_from_directory(ROOT,filename)

    return app


if __name__ == '__main__':
    from waitress import serve
    host = os.environ.get('COMMUNITY_HOST','127.0.0.1')
    port = int(os.environ.get('COMMUNITY_PORT','8766'))
    print(f'Game community: http://{host}:{port}/community.html',flush=True)
    serve(create_app(),host=host,port=port,threads=8,max_request_body_size=24*1024)
