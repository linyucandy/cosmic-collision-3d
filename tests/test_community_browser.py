"""End-to-end community flows use separate browser contexts and a disposable database."""
import pathlib
import json
import tempfile
import threading
import unittest
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright
from werkzeug.serving import make_server
from community_server import create_app

ROOT = pathlib.Path(__file__).resolve().parents[1]


class CommunityBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.app = create_app({'TESTING':True,'DATABASE':str(pathlib.Path(cls.tmp.name)/'community.sqlite3')})
        cls.server = make_server('127.0.0.1',0,cls.app,threaded=True)
        threading.Thread(target=cls.server.serve_forever,daemon=True).start()
        cls.url = f'http://127.0.0.1:{cls.server.server_port}'
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(channel='chrome',headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.pw.stop()
        cls.server.shutdown(); cls.server.server_close(); cls.tmp.cleanup()

    def signup(self,page,username):
        page.locator('[data-auth-open]').first.click()
        page.locator('#authRegisterTab').click()
        page.locator('#authUsername').fill(username)
        page.locator('#authPassword').fill('browser-test-password')
        page.locator('#authSubmit').click()
        page.locator('#authDialog').wait_for(state='hidden')

    def test_two_people_publish_rate_reply_and_search(self):
        author_context = self.browser.new_context(viewport={'width':1440,'height':1000})
        player_context = self.browser.new_context(viewport={'width':1440,'height':1000})
        author, player = author_context.new_page(), player_context.new_page()
        errors = []
        for page in [author,player]:
            page.on('pageerror',lambda error: errors.append(str(error)))
        try:
            author.goto(self.url+'/community.html')
            self.assertTrue(author.get_by_role('heading',name='每个好游戏，都值得被看见。').is_visible())
            self.signup(author,'测试作者')
            author.goto(self.url+'/publish.html')
            author.locator('#gameTitle').fill('星际迷宫 <测试>')
            author.locator('#gameUrl').fill('https://example.com/space-maze')
            author.locator('#gameCategory').select_option('puzzle')
            author.locator('#gameDescription').fill('穿越星际迷宫，寻找通往下一颗星球的出口。这是一个用于验证多人发布的独立网页游戏。')
            author.locator('#publishSubmit').click()
            author.wait_for_url('**/game.html?id=*')
            game_url = author.url
            author.get_by_role('heading',name='星际迷宫 <测试>',exact=True).wait_for()
            self.assertTrue(author.get_by_role('heading',name='星际迷宫 <测试>',exact=True).is_visible())
            player.goto(game_url)
            self.signup(player,'测试玩家')
            player.get_by_label('5 星',exact=True).check()
            player.locator('#reviewBody').fill('很喜欢这个探索玩法，希望加入更多关卡。<script>alert(1)</script>')
            player.locator('#reviewSubmit').click()
            player.wait_for_function("() => document.getElementById('ratingCount').textContent.includes('1')")
            self.assertIn('5.0',player.locator('#averageRating').inner_text())
            author.reload()
            author.locator('[data-reply-open]').first.click()
            author.locator('textarea[name="reply"]').first.fill('收到，谢谢支持！下一版会增加关卡。')
            author.locator('[data-reply-submit]').first.click()
            author.get_by_text('收到，谢谢支持！下一版会增加关卡。',exact=True).wait_for()
            player.reload()
            player.get_by_text('收到，谢谢支持！下一版会增加关卡。',exact=True).wait_for()
            self.assertTrue(player.get_by_text('收到，谢谢支持！下一版会增加关卡。',exact=True).is_visible())
            self.assertEqual(player.locator('#reviewsList script').count(),0)
            player.screenshot(path=str(ROOT/'.screenshots/community-detail-verified.png'),full_page=True)
            author.get_by_role('link',name='编辑作品',exact=True).click()
            author.wait_for_url('**/publish.html?id=*')
            author.locator('#gameDescription').fill('穿越星际迷宫，寻找通往下一颗星球的出口。新版本增加了第二关和更清晰的操作说明。')
            author.locator('#publishSubmit').click()
            author.wait_for_url('**/game.html?id=*')
            author.get_by_text('穿越星际迷宫，寻找通往下一颗星球的出口。新版本增加了第二关和更清晰的操作说明。',exact=True).wait_for()
            player.goto(self.url+'/community.html')
            player.locator('#gameSearch').fill('星际迷宫')
            player.get_by_text('发现 1 款游戏',exact=True).wait_for()
            self.assertEqual(player.locator('.game-card').count(),1)
            player.screenshot(path=str(ROOT/'.screenshots/community-desktop-verified.png'),full_page=True)
            player.set_viewport_size({'width':390,'height':844})
            self.assertTrue(player.evaluate('document.documentElement.scrollWidth <= innerWidth'))
            player.screenshot(path=str(ROOT/'.screenshots/community-mobile-verified.png'),full_page=True)
            self.assertEqual(errors,[])
        finally:
            author_context.close(); player_context.close()

    def test_network_failure_has_retry_and_does_not_fake_success(self):
        page = self.browser.new_page()
        try:
            page.route('**/api/**',lambda route: route.abort())
            page.goto(self.url+'/community.html')
            page.locator('[data-retry]').wait_for()
            self.assertTrue(page.get_by_text('暂时无法连接游戏社区',exact=True).is_visible())
            self.assertEqual(page.locator('.game-card').count(),0)
        finally:
            page.close()

    def test_github_pages_publication_rating_and_discussion(self):
        def record(number,login,kind,metadata,comments=0):
            return {'number':number,'state':'open','user':{'login':login},'comments':comments,
                    'body':f'<!-- cosmic-{kind}:v1 -->\n```json\n'+json.dumps(metadata,ensure_ascii=False)+'\n```',
                    'created_at':'2026-10-29T01:00:00Z','updated_at':'2026-10-29T02:00:00Z'}
        records=[record(3,'github-author','game',{'title':'公开发布的星际迷宫','description':'一款通过 GitHub 账号发布的独立网页游戏，邀请更多玩家一起探索迷宫。','category':'puzzle','play_url':'https://example.com/game'}),
                 record(4,'github-player','review',{'game_id':'gh-3','rating':5,'body':'很喜欢这个玩法，期待更多关卡。'},1)]
        page=self.browser.new_page(viewport={'width':1440,'height':1000})
        errors=[]; page.on('pageerror',lambda error:errors.append(str(error)))
        def github(route):
            payload=[{'user':{'login':'github-author'},'body':'谢谢支持，我们会继续更新！','created_at':'2026-10-29T03:00:00Z'}] if '/comments' in route.request.url else records
            route.fulfill(json=payload,headers={'Access-Control-Allow-Origin':'*'})
        page.route('https://api.github.com/**',github)
        try:
            page.goto(self.url+'/community.html?source=github')
            page.get_by_role('link',name='公开发布的星际迷宫',exact=True).click()
            page.get_by_text('5.0',exact=True).wait_for()
            page.locator('[data-comments]').click()
            page.get_by_text('谢谢支持，我们会继续更新！',exact=True).wait_for()
            page.get_by_label('4 星',exact=True).check()
            page.locator('#reviewBody').fill('新的游戏评价，准备由 GitHub 账号确认。')
            page.locator('#reviewSubmit').click()
            link=page.get_by_role('link',name='前往 GitHub 确认评价 ↗')
            draft=parse_qs(urlparse(link.get_attribute('href')).query)['body'][0]
            self.assertIn('cosmic-review:v1',draft)
            self.assertIn('"rating": 4',draft)
            page.set_viewport_size({'width':390,'height':844})
            self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
            page.screenshot(path=str(ROOT/'.screenshots/community-github-mobile-verified.png'),full_page=True)
            page.goto(self.url+'/publish.html?source=github')
            page.locator('#gameTitle').fill('我的公开游戏')
            page.locator('#gameUrl').fill('https://example.com/my-game')
            page.locator('#gameDescription').fill('这是通过游戏广场提交到 GitHub 的游戏介绍，确认提交后才会公开发布。')
            page.locator('#publishSubmit').click()
            link=page.get_by_role('link',name='前往 GitHub 确认发布 ↗')
            draft=parse_qs(urlparse(link.get_attribute('href')).query)['body'][0]
            self.assertIn('cosmic-game:v1',draft)
            self.assertIn('https://example.com/my-game',draft)
            self.assertFalse(page.locator('#authDialog').count())
            self.assertEqual(errors,[])
        finally:
            page.close()

    def test_github_network_failure_uses_dated_snapshot(self):
        page=self.browser.new_page()
        page.route('https://api.github.com/**',lambda route:route.abort())
        snapshot={'schema':1,'generated_at':'2026-10-29T10:00:00Z','issues':[],'comments':{}}
        page.route('**/community-snapshot.json*',lambda route:route.fulfill(json=snapshot))
        try:
            page.goto(self.url+'/community.html?source=github')
            page.locator('.game-card').first.wait_for(timeout=20000)
            self.assertEqual(page.locator('.game-card').count(),7)
            self.assertTrue(page.locator('#snapshotNotice').is_visible())
            self.assertIn('2026',page.locator('#snapshotNotice').inner_text())
        finally:
            page.close()
