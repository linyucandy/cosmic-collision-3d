"""API contracts for a real, shared community database."""
import pathlib
import tempfile
import unittest

try:
    from community_server import create_app
except ModuleNotFoundError:
    create_app = None


class CommunityTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(create_app, 'Shared community server has not been implemented')
        self.tmp = tempfile.TemporaryDirectory()
        self.db = str(pathlib.Path(self.tmp.name) / 'community.sqlite3')
        self.app = create_app({'TESTING': True, 'DATABASE': self.db})
        self.client = self.app.test_client()
        self.headers = {}

    def tearDown(self):
        if hasattr(self, 'tmp'):
            self.tmp.cleanup()

    def signup(self, username, client=None):
        client = client or self.client
        response = client.post('/api/auth/register', json={'username':username, 'password':'test-password-2026'})
        self.assertEqual(response.status_code, 201, response.json)
        return {'X-CSRF-Token':response.json['csrf']}

    def game(self, title='玩家的新游戏'):
        return {'title':title,'description':'这是一款可以让玩家探索和挑战的独立网页游戏，欢迎体验并交流建议。',
                'category':'puzzle','play_url':'https://example.com/my-game'}

    def publish(self):
        self.headers = self.signup('作者晨晨')
        response = self.client.post('/api/games', json=self.game(), headers=self.headers)
        self.assertEqual(response.status_code, 201, response.json)
        return response.json['game']['id']

    def test_publish_is_shared_and_persists_across_app_restart(self):
        game_id = self.publish()
        second = create_app({'TESTING':True,'DATABASE':self.db}).test_client()
        response = second.get(f'/api/games/{game_id}')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['game']['title'], '玩家的新游戏')
        self.assertIsNone(response.json['game']['rating_average'])

    def test_review_upsert_recalculates_average_without_duplicate_votes(self):
        game_id = self.publish()
        reviewer = self.app.test_client()
        headers = self.signup('玩家甲', reviewer)
        path = f'/api/games/{game_id}/review'
        for rating in [5,4]:
            response = reviewer.put(path, json={'rating':rating,'body':'很好玩，期待新的关卡！'}, headers=headers)
            self.assertEqual(response.status_code, 200, response.json)
        second = self.app.test_client()
        second_headers = self.signup('玩家乙', second)
        second.put(path, json={'rating':1,'body':'目前操作还需要继续优化。'}, headers=second_headers)
        detail = self.client.get(f'/api/games/{game_id}').json
        self.assertEqual(detail['game']['rating_count'], 2)
        self.assertEqual(detail['game']['rating_average'], 2.5)
        self.assertEqual(detail['distribution']['4'], 1)
        self.assertEqual(detail['distribution']['5'], 0)

    def test_author_can_reply_but_cannot_rate_own_game(self):
        game_id = self.publish()
        path = f'/api/games/{game_id}/review'
        own = self.client.put(path, json={'rating':5,'body':'自己的游戏'}, headers=self.headers)
        self.assertEqual(own.status_code, 400)
        reviewer = self.app.test_client()
        headers = self.signup('玩家甲', reviewer)
        review = reviewer.put(path, json={'rating':5,'body':'希望增加新玩法'}, headers=headers).json['review']
        response = self.client.post(f"/api/reviews/{review['id']}/replies", json={'body':'收到，感谢反馈！'}, headers=self.headers)
        self.assertEqual(response.status_code, 201, response.json)
        detail = reviewer.get(f'/api/games/{game_id}').json
        self.assertEqual(detail['reviews'][0]['replies'][0]['body'], '收到，感谢反馈！')

    def test_ownership_csrf_and_withdrawal(self):
        game_id = self.publish()
        other = self.app.test_client()
        other_headers = self.signup('其他作者', other)
        self.assertEqual(other.patch(f'/api/games/{game_id}', json=self.game(), headers=other_headers).status_code, 403)
        self.assertEqual(self.client.patch(f'/api/games/{game_id}', json=self.game()).status_code, 403)
        self.assertEqual(self.client.delete(f'/api/games/{game_id}', headers=self.headers).status_code, 200)
        self.assertEqual(other.get(f'/api/games/{game_id}').status_code, 404)
        self.assertEqual(self.client.get(f'/api/games/{game_id}').status_code, 200)
        self.assertEqual(self.client.post(f'/api/games/{game_id}/restore', headers=self.headers).status_code, 200)
        self.assertEqual(other.get(f'/api/games/{game_id}').status_code, 200)

    def test_invalid_urls_ratings_and_private_files(self):
        self.headers = self.signup('作者晨晨')
        for url in ['javascript:alert(1)','data:text/html,test','//evil.example','https://user:pass@example.com','https://example.com/\\bad']:
            payload = self.game()
            payload['play_url'] = url
            self.assertEqual(self.client.post('/api/games', json=payload, headers=self.headers).status_code, 400, url)
        for path in ['/community_server.py','/.git/config','/community_data/community.sqlite3','/tests/test_community.py']:
            self.assertEqual(self.client.get(path).status_code, 404, path)
        game_id = self.client.post('/api/games', json=self.game(), headers=self.headers).json['game']['id']
        other = self.app.test_client()
        headers = self.signup('玩家甲', other)
        for rating in [0,6,2.5,True,'5']:
            self.assertEqual(other.put(f'/api/games/{game_id}/review', json={'rating':rating,'body':'有效的评价文本'}, headers=headers).status_code, 400)

    def test_search_filters_and_logout_revokes_session(self):
        self.publish()
        result = self.client.get('/api/games?q=玩家的新游戏&category=puzzle&sort=rating').json
        self.assertEqual(result['total'], 1)
        self.assertEqual(self.client.get('/api/games?q=不存在的游戏').json['total'], 0)
        self.assertEqual(self.client.get('/api/games?category=unknown').status_code, 400)
        self.client.post('/api/auth/logout', headers=self.headers)
        self.assertIsNone(self.client.get('/api/auth/me').json['user'])
        self.assertEqual(self.client.post('/api/games', json=self.game(), headers=self.headers).status_code, 401)

    def test_pagination_recovers_after_last_page_disappears(self):
        game_id = self.publish()
        response = self.client.get(f'/api/games/{game_id}?page=99')
        self.assertEqual(response.json['page'], 1)
        response = self.client.get('/api/games?page=99')
        self.assertEqual(response.json['page'], 1)
        self.assertGreater(len(response.json['games']), 0)

    def test_login_cookie_flags_and_old_session_revocation(self):
        headers = self.signup('测试用户')
        old_cookie = self.client.get_cookie('community_session')
        self.assertTrue(old_cookie.http_only)
        self.assertEqual(old_cookie.same_site,'Lax')
        self.client.post('/api/auth/logout',headers=headers)
        replay = self.app.test_client()
        replay.set_cookie('community_session',old_cookie.value)
        self.assertIsNone(replay.get('/api/auth/me').json['user'])
        self.assertEqual(self.client.post('/api/auth/login',json={'username':'测试用户','password':'wrong-password'}).status_code,401)
        login = self.client.post('/api/auth/login',json={'username':'测试用户','password':'test-password-2026'})
        self.assertEqual(login.status_code,200)
        self.assertEqual(self.client.get('/api/auth/me').json['user']['username'],'测试用户')
        self.assertEqual(self.client.post('/api/games',json=self.game(),headers={'X-CSRF-Token':login.json['csrf'],'Origin':'https://evil.example'}).status_code,403)


if __name__ == '__main__':
    unittest.main()
