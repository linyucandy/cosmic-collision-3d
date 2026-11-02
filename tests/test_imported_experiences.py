"""Browser regressions for the four imported standalone experiences.

Test-only instrumentation exposes private state; shipped pages need no debug API.
Run: python -m unittest discover -s tests -p test_imported_experiences.py -v
"""
import functools
import http.server
from pathlib import Path
import threading
import unittest

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
COSMIC = 'cosmic-collision.html'
CITY = 'deepseek_html_20261018_27ab85.html'
MOON = 'deepseek_html-Earth-MoonSim_20261018_454973.html'
SKI = 'deepseek_html-everest-ski-3d_20261017_3b3830.html'
FILES = [COSMIC, CITY, MOON, SKI]


class ImportedExperienceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(
            http.server.SimpleHTTPRequestHandler, directory=str(ROOT)))
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}/'
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

    def load(self, name, instrument=True):
        source = (ROOT / name).read_text(encoding='utf-8')
        if instrument:
            if name == COSMIC:
                source = source.replace('/* ---------------- boot ---------------- */',
                    'window.audit={state,CAM,step}; /* ---------------- boot ---------------- */')
            elif name == CITY:
                source = source.replace('generateCity(); rebuildBlocks(); updateCamera();',
                    '''window.audit={renderer,scene,camera,fire,WEAPONS,blocks,
                    get destroyed(){return destroyedBlocks},get frags(){return frags}};
                    generateCity(); rebuildBlocks(); updateCamera();''')
            elif name == MOON:
                source = source.replace('// 启动', '''window.audit={landOn,returnToOrbit,updateTransition,
                    get state(){return state},get earth(){return earth},get moon(){return moon},
                    get camera(){return camera},get renderer(){return renderer}}; // 启动''')
            elif name == SKI:
                source = source.replace('/* ================= 录制 ================= */',
                    'window.audit={renderer,scene,camera,get recorder(){return recorder}}; /* ================= 录制 ================= */')
            self.page.route('**/' + name, lambda route: route.fulfill(body=source, content_type='text/html'))
        self.page.goto(self.base + name)
        if instrument:
            self.page.wait_for_function('window.audit', timeout=15000)

    def test_city_renders_real_webgl_and_all_weapons_execute(self):
        self.load(CITY)
        self.page.wait_for_timeout(250)
        self.assertEqual(self.page.evaluate('audit.renderer.getContext().drawingBufferWidth'), 1440)
        self.assertGreater(self.page.evaluate('audit.renderer.info.render.calls'), 0)
        self.assertGreater(self.page.evaluate('audit.blocks.length'), 0)
        for weapon in self.page.locator('#weapons button:not([data-w="reset"])').all():
            self.page.locator('[data-w="reset"]').click()
            weapon.click()
            self.page.evaluate('''() => {const b=audit.blocks.find(b=>b.alive);
                audit.fire(b.pos.x, b.pos.y, b.pos.z)}''')
        self.page.wait_for_timeout(450)
        self.assertGreater(self.page.evaluate('audit.destroyed'), 0)
        self.assertEqual(self.errors, [])

    def test_city_pointer_click_drag_and_zoom(self):
        self.load(CITY)
        point = self.page.evaluate('''() => {const b=audit.blocks.find(b=>b.alive);
            const p=b.pos.clone();p.y=0;p.project(audit.camera);
            return {x:(p.x+1)*720,y:(1-p.y)*450}}''')
        self.page.mouse.click(point['x'], point['y'])
        self.assertGreater(self.page.evaluate('audit.destroyed'), 0)
        before = self.page.evaluate('audit.camera.position.toArray()')
        self.page.mouse.move(900, 450)
        self.page.mouse.down()
        self.page.mouse.move(1000, 490, steps=5)
        self.page.mouse.up()
        self.assertNotEqual(self.page.evaluate('audit.camera.position.toArray()'), before)
        self.page.mouse.wheel(0, 200)
        self.page.wait_for_timeout(100)
        self.assertNotEqual(self.page.evaluate('audit.camera.position.toArray()'), before)
        self.assertEqual(self.errors, [])

    def test_city_rebuild_cancels_delayed_destruction(self):
        self.load(CITY)
        self.page.locator('[data-w="quake"]').click()
        self.page.evaluate('audit.fire(0,0,0)')
        self.page.locator('[data-w="reset"]').click()
        self.page.wait_for_timeout(600)
        self.assertEqual(self.page.evaluate('audit.destroyed'), 0)
        self.assertEqual(self.page.evaluate('audit.frags.length'), 0)
        self.assertEqual(self.errors, [])

    def test_cosmic_pause_presets_parameters_and_reset(self):
        self.load(COSMIC)
        self.page.locator('#play').click()
        before = self.page.evaluate('audit.state.t')
        self.page.wait_for_timeout(100)
        self.assertEqual(self.page.evaluate('audit.state.t'), before)
        for preset in ['graze', 'fast', 'retro', 'headon']:
            self.page.locator('[data-preset="' + preset + '"]').click()
            self.assertEqual(self.page.locator('.preset.active').get_attribute('data-preset'), preset)
        self.page.locator('#density').fill('800')
        self.page.locator('#density').dispatch_event('change')
        self.page.locator('#reset').click()
        self.assertEqual(self.page.evaluate('audit.state.particles.length'), 1600)
        self.assertEqual(self.errors, [])

    def test_moon_both_landings_and_return(self):
        self.load(MOON)
        self.page.wait_for_function('audit.renderer && audit.earth')
        for planet in ['earth', 'moon']:
            self.page.evaluate('(planet)=>{audit.landOn(planet);audit.updateTransition(3)}', planet)
            self.assertEqual(self.page.evaluate('audit.state'), 'landed')
            self.assertTrue(self.page.locator('#backBtn').is_visible())
            self.page.locator('#backBtn').click()
            self.page.evaluate('audit.updateTransition(3)')
            self.assertEqual(self.page.evaluate('audit.state'), 'orbit')
        self.assertEqual(self.errors, [])

    def test_moon_overview_keeps_both_planets_in_view(self):
        for width in [1440, 390]:
            self.page.set_viewport_size({'width': width, 'height': 844})
            self.load(MOON)
            self.page.wait_for_function('window.experienceRendered === true')
            points = self.page.evaluate('''() => [audit.earth,audit.moon].map(body=>{
                const p=body.position.clone().project(audit.camera); return [p.x,p.y,p.z]})''')
            for point in points:
                self.assertLess(abs(point[0]), .95)
                self.assertLess(abs(point[1]), .95)
                self.assertLess(point[2], 1)

    def test_ski_recording_without_media_recorder_is_handled(self):
        self.page.add_init_script('window.MediaRecorder=undefined')
        self.load(SKI)
        dialogs = []
        self.page.on('dialog', lambda dialog: (dialogs.append(dialog.message), dialog.dismiss()))
        self.page.locator('#recBtn').click()
        self.assertEqual(self.errors, [])
        self.assertTrue(dialogs)

    def test_ski_recording_download_and_track_cleanup(self):
        self.load(SKI)
        self.page.locator('#recBtn').click()
        self.page.wait_for_timeout(400)
        self.assertEqual(self.page.evaluate('audit.recorder.state'), 'recording')
        self.page.evaluate('window.recordedStream=audit.recorder.stream')
        with self.page.expect_download() as pending:
            self.page.evaluate('audit.recorder.stop()')
        self.assertGreater(Path(pending.value.path()).stat().st_size, 100)
        self.assertTrue(self.page.evaluate("recordedStream.getTracks().every(t=>t.readyState==='ended')"))
        self.assertEqual(self.errors, [])

    def test_ski_recording_constructor_failure_is_handled(self):
        self.page.add_init_script('''window.MediaRecorder=class {
            static isTypeSupported(){return true}
            constructor(){throw new Error('codec unavailable')}
        }''')
        self.load(SKI)
        dialogs = []
        self.page.on('dialog', lambda dialog: (dialogs.append(dialog.message), dialog.dismiss()))
        self.page.locator('#recBtn').click()
        self.assertEqual(self.errors, [])
        self.assertTrue(dialogs)

    def test_home_links_and_mobile_offline_startup(self):
        self.page.route('https://**/*', lambda route: route.abort())
        self.page.goto(self.base)
        for name in FILES:
            self.assertGreater(self.page.locator('a[href="' + name + '"]').count(), 0, name)
        self.page.set_viewport_size({'width': 390, 'height': 844})
        for name in FILES:
            self.load(name)
            if name != COSMIC:
                self.page.wait_for_function('window.experienceRendered === true')
            self.assertTrue(self.page.locator('#experienceHome').is_visible(), name)
            self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'), 390, name)
            self.assertFalse(self.page.locator('#experienceError').is_visible(), name)
        self.assertEqual(self.errors, [])

    def test_blocked_graphics_module_shows_recovery(self):
        self.page.route('**/vendor/three-r160/three.module.js', lambda route: route.abort())
        self.load(CITY, instrument=False)
        self.page.locator('#experienceError').wait_for(state='visible')
        self.assertTrue(self.page.locator('#experienceHome').is_visible())


if __name__ == '__main__':
    unittest.main()
