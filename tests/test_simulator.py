"""Browser regressions. Requires: pip install playwright; local Chrome."""
import functools
import http.server
import pathlib
import threading
import unittest
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]


class SimulatorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.url = f'http://127.0.0.1:{cls.server.server_port}'
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(channel='chrome', headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.page = self.browser.new_page(viewport={'width': 1440, 'height': 900})
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))

    def tearDown(self):
        self.page.close()

    def open_sim(self):
        source = (ROOT / 'cosmic-collision-3d.html').read_text(encoding='utf-8')
        source = source.replace('\nloop();', '''
paused = true;
window.sim = { bodies, randomSystem, spawnBody, handleCollisions, removeBody, renderer,
  clearScene, explosions, shockwaves, flashes, step, updateEffects,
  clear: () => { while (bodies.length) removeBody(bodies[0]); },
  frame: () => renderer.render(scene, camera) };
loop();''')
        self.page.route('**/cosmic-collision-3d.html*', lambda route: route.fulfill(body=source, content_type='text/html'))
        self.page.goto(self.url + '/cosmic-collision-3d.html?scene=bh')
        self.page.wait_for_function('window.sim', timeout=60000)

    def test_random_system_replaces_existing_bodies_and_stays_bounded(self):
        self.open_sim()
        result = self.page.evaluate('''() => {
          const previous = sim.bodies[0];
          const counts = [];
          for (let i=0; i<5; i++) { sim.randomSystem(); counts.push(sim.bodies.length); }
          return { oldPresent: sim.bodies.includes(previous), counts };
        }''')
        self.assertFalse(result['oldPresent'], result)
        self.assertTrue(all(n <= 110 for n in result['counts']), result)
        self.assertEqual(self.errors, [])

    def test_impact_leaves_private_crater_texture_and_cleans_up(self):
        self.open_sim()
        result = self.page.evaluate('''() => {
          sim.clear();
          const target = sim.spawnBody(0,0,0,0,0,0,40,'planet');
          const original = target.mesh.material.map;
          const originalImage = original.image;
          const sibling = sim.spawnBody(200,0,0,0,0,0,40,'planet');
          const siblingMap = sibling.mesh.material.map;
          const impactor = sim.spawnBody(4,0,0,0,0,0,1,'asteroid');
          sim.handleCollisions();
          const changed = target.mesh.material.map !== original;
          const unchanged = sibling.mesh.material.map === siblingMap;
          const craterCount = target.impactCount || 0;
          let disposed = false;
          target.mesh.material.map.addEventListener('dispose', () => disposed = true);
          sim.removeBody(target);
          return { changed, unchanged, originalUnchanged: original.image === originalImage,
            craterCount, disposed, removed: !sim.bodies.includes(impactor) };
        }''')
        self.assertTrue(result['changed'], result)
        self.assertTrue(result['unchanged'], result)
        self.assertTrue(result['originalUnchanged'], result)
        self.assertEqual(result['craterCount'], 1, result)
        self.assertTrue(result['disposed'], result)
        self.assertTrue(result['removed'], result)
        self.assertEqual(self.errors, [])

    def test_home_links_author_and_mobile_layout(self):
        self.page.goto(self.url + '/index.html')
        self.assertTrue(self.page.get_by_role('link', name='进入 3D 宇宙').is_visible())
        self.assertTrue(self.page.get_by_role('link', name='进入 2D 沙盒').is_visible())
        self.assertTrue(self.page.get_by_text('晨晨', exact=True).is_visible())
        self.page.screenshot(path=str(ROOT / '.screenshots' / 'menu-desktop-verified.png'), full_page=True)
        for link in self.page.locator('a[href]').all():
            href = link.get_attribute('href').split('?')[0]
            if not href.startswith(('https:', '#')):
                self.assertTrue((ROOT / href).is_file(), href)
        self.page.set_viewport_size({'width': 390, 'height': 844})
        self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        self.page.screenshot(path=str(ROOT / '.screenshots' / 'menu-mobile-verified.png'), full_page=True)
        self.assertEqual(self.errors, [])

    def test_reset_removes_collision_effects_and_materials(self):
        self.open_sim()
        result = self.page.evaluate('''() => {
          sim.clearScene();
          const target = sim.spawnBody(0,0,0,0,0,0,40,'planet');
          let materialDisposed = false;
          target.mesh.material.addEventListener('dispose', () => materialDisposed = true);
          sim.spawnBody(4,0,0,0,0,0,1,'asteroid');
          sim.handleCollisions();
          const hadEffects = sim.explosions.length > 0;
          sim.clearScene();
          return {hadEffects, materialDisposed, remaining: sim.bodies.length +
            sim.explosions.length + sim.shockwaves.length + sim.flashes.length};
        }''')
        self.assertTrue(result['hadEffects'], result)
        self.assertTrue(result['materialDisposed'], result)
        self.assertEqual(result['remaining'], 0, result)

    def test_asteroid_crater_matches_mesh_uv_at_impact(self):
        self.open_sim()
        result = self.page.evaluate('''() => {
          sim.clearScene();
          const target = sim.spawnBody(0,0,0,0,0,0,9,'asteroid');
          const geometry = target.mesh.geometry;
          const uv = geometry.attributes.uv, positions = geometry.attributes.position;
          let index = 0;
          for (let i=0; i<uv.count; i++) {
            if (uv.getX(i) > 0.3 && uv.getX(i) < 0.7 && uv.getY(i) > 0.3 && uv.getY(i) < 0.7) {index=i;break;}
          }
          const image = target.mesh.material.map.image;
          const x = Math.floor(uv.getX(index) * image.width);
          const y = Math.floor((1 - uv.getY(index)) * image.height);
          const before = [...image.getContext('2d').getImageData(x,y,1,1).data];
          const point = target.mesh.position.clone().fromBufferAttribute(positions,index).normalize().multiplyScalar(2);
          sim.spawnBody(point.x,point.y,point.z,0,0,0,1,'asteroid');
          sim.handleCollisions();
          const after = [...target.mesh.material.map.image.getContext('2d').getImageData(x,y,1,1).data];
          return {before, after, count: target.impactCount};
        }''')
        self.assertEqual(result['count'], 1)
        self.assertNotEqual(result['before'], result['after'], result)

    def test_live_scene_entries_and_2d(self):
        for scene in ['', '?scene=craters', '?scene=galaxy', '?scene=bh', '?scene=demo']:
            self.page.goto(self.url + '/cosmic-collision-3d.html' + scene)
            self.page.wait_for_function("Number(document.getElementById('statBodies').textContent) > 0", timeout=60000)
            self.page.wait_for_timeout(1200)
            self.assertTrue(self.page.locator('a[href="index.html"]').is_visible())
            if scene == '?scene=craters':
                self.assertGreater(int(self.page.locator('#statCollisions').inner_text()), 0)
                self.page.locator('#btnPause').click()
                self.page.screenshot(path=str(ROOT / '.screenshots' / 'craters-verified.png'))
            self.assertEqual(self.errors, [], scene)
        self.page.goto(self.url + '/cosmic-collision-simulator.html')
        self.page.locator('#btnPause').click()
        for _ in range(4):
            self.page.locator('#btnSystem').click()
        self.page.wait_for_timeout(100)
        self.assertLessEqual(int(self.page.locator('#statBodies').inner_text()), 9)
        self.assertEqual(self.errors, [])


if __name__ == '__main__':
    unittest.main()
