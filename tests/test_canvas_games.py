"""User input and rendering regressions for the two standalone canvas games."""
import functools
import http.server
from pathlib import Path
import threading
import unittest
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]

class CanvasGameTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ROOT)))
        threading.Thread(target=cls.server.serve_forever,daemon=True).start()
        cls.base=f'http://127.0.0.1:{cls.server.server_port}/'
        cls.pw=sync_playwright().start();cls.browser=cls.pw.chromium.launch(channel='chrome',headless=True)
    @classmethod
    def tearDownClass(cls):
        cls.browser.close();cls.pw.stop();cls.server.shutdown();cls.server.server_close()
    def setUp(self):
        self.page=self.browser.new_page(viewport={'width':1440,'height':900});self.errors=[]
        self.page.on('pageerror',lambda error:self.errors.append(str(error)))
    def tearDown(self):self.page.close()
    def cosmos(self):
        source=(ROOT/'cosmos_collision_lab.html').read_text(encoding='utf-8')
        source=source.replace('const b=sorted[j];', 'window.pairChecks=(window.pairChecks||0)+1;const b=sorted[j];')
        source=source.replace('resize();reset();requestAnimationFrame(loop);', '''resize();reset();window.cosmos={get bodies(){return bodies},cam,body,physics,collisionsStep,draw,ctx,resize,addObject,get pointer(){return pointer},clear:()=>{bodies=[]},setScene:value=>{scene=value}};''')
        self.page.route('**/cosmos_collision_lab.html',lambda route:route.fulfill(body=source,content_type='text/html'))
        self.page.goto(self.base+'cosmos_collision_lab.html');self.page.wait_for_function('window.cosmos')
    def fish(self):
        source=(ROOT/'pickFish.html').read_text(encoding='utf-8');end=source.rfind('requestAnimationFrame(loop);')
        source=source[:end]+'''window.fish={game,boat,cam,keys,update,updateFishing,updateCamera,castLine,startReel,draw,FISH_TYPES,FP,get progress(){return progress},get paused(){return paused},get holding(){return isRightMouseDown}};updateCamera();'''+source[end+len('requestAnimationFrame(loop);'):]
        self.page.route('**/pickFish.html',lambda route:route.fulfill(body=source,content_type='text/html'))
        self.page.goto(self.base+'pickFish.html');self.page.wait_for_function('window.fish')
    def test_cosmos_galaxy_omits_inert_tracer_pair_work(self):
        self.cosmos();self.page.evaluate('window.pairChecks=0;cosmos.collisionsStep()')
        self.assertLess(self.page.evaluate('window.pairChecks'),1000)
    def test_cosmos_resize_preserves_view_and_placement_is_bounded(self):
        self.cosmos();self.page.evaluate('cosmos.cam.x=123;cosmos.cam.y=-45;cosmos.cam.zoom=.8')
        self.page.set_viewport_size({'width':1200,'height':800});self.page.wait_for_timeout(100)
        self.assertEqual(self.page.evaluate('cosmos.cam.x'),123)
        count=self.page.evaluate('for(let i=0;i<1000;i++)cosmos.addObject({x:500,y:400},{x:0,y:0});cosmos.bodies.length')
        self.assertLessEqual(count,600)
    def test_cosmos_second_pointer_and_trail_draw_budget(self):
        self.cosmos();cv=self.page.locator('#universe')
        cv.evaluate('(cv)=>{cv.setPointerCapture=()=>{};cv.releasePointerCapture=()=>{}}')
        cv.dispatch_event('pointerdown',{'pointerId':1,'button':0,'clientX':700,'clientY':400})
        cv.dispatch_event('pointerdown',{'pointerId':2,'button':0,'clientX':900,'clientY':500})
        self.assertEqual(self.page.evaluate('cosmos.pointer.id'),1)
        strokes=self.page.evaluate('''() => {for(let i=0;i<60;i++)cosmos.physics(.01);let n=0;const old=cosmos.ctx.stroke.bind(cosmos.ctx);cosmos.ctx.stroke=()=>{n++;old()};cosmos.draw(1000);return n;}''')
        self.assertLess(strokes,600)
    def test_cosmos_merge_preserves_mass_and_momentum(self):
        self.cosmos();result=self.page.evaluate('''() => {cosmos.clear();cosmos.body('planet',0,0,2,0,{mass:10});cosmos.body('planet',0,0,-1,0,{mass:5});cosmos.collisionsStep();return {n:cosmos.bodies.length,m:cosmos.bodies[0].m,p:cosmos.bodies[0].vx*cosmos.bodies[0].m};}''')
        self.assertEqual(result,{'n':1,'m':15,'p':15});self.assertEqual(self.errors,[])
    def test_fish_blur_releases_movement_and_reeling(self):
        self.fish();self.page.keyboard.down('d');box=self.page.locator('#game').bounding_box();self.page.mouse.move(box['x']+100,box['y']+100);self.page.mouse.down(button='right')
        self.page.evaluate("window.dispatchEvent(new Event('blur'))")
        self.assertFalse(self.page.evaluate('Boolean(fish.keys.d)'));self.assertFalse(self.page.evaluate('fish.holding'))
    def test_fish_keyboard_reeling_can_land_a_fish_once(self):
        self.fish();self.page.evaluate("fish.game.mode='bite';fish.game.biteFish=fish.FISH_TYPES[0];fish.startReel()")
        self.page.keyboard.down('e');self.page.evaluate('fish.updateFishing(.5)');self.page.keyboard.up('e')
        self.assertGreater(self.page.evaluate('fish.game.reeling.prog'),0)
        self.page.evaluate('fish.game.reeling.prog=99.9;fish.game.reeling.tension=0')
        self.page.keyboard.down('e');self.page.evaluate('fish.updateFishing(.01);fish.updateFishing(.01)');self.page.keyboard.up('e')
        self.assertEqual(self.page.evaluate('fish.game.caught'),1);self.assertEqual(self.page.evaluate('fish.game.gold'),4)
    def test_fish_keyboard_still_works_after_pause_button(self):
        self.fish();self.page.locator('#fishPause').click();self.page.locator('#fishPause').click()
        before=self.page.evaluate('fish.boat.x');self.page.keyboard.down('d');self.page.evaluate('fish.update(.2)');self.page.keyboard.up('d')
        self.assertGreater(self.page.evaluate('fish.boat.x'),before)
    def test_fish_touch_controls_and_world_cast_bounds(self):
        self.fish();self.page.set_viewport_size({'width':390,'height':844})
        self.assertTrue(self.page.locator('#fishAction').is_visible())
        self.page.locator('[data-move="d"]').evaluate('(button)=>{button.setPointerCapture=()=>{}}')
        self.page.locator('[data-move="d"]').dispatch_event('pointerdown',{'pointerId':21,'button':0})
        before=self.page.evaluate('fish.boat.x');self.page.evaluate('fish.update(.2)')
        self.assertGreater(self.page.evaluate('fish.boat.x'),before)
        self.page.locator('[data-move="d"]').dispatch_event('pointerup',{'pointerId':21})
        self.page.locator('#fishAction').click();self.assertEqual(self.page.evaluate('fish.game.mode'),'casting')
        self.page.evaluate('fish.game.mode="idle";fish.boat.x=60;fish.boat.y=60;fish.updateCamera()')
        self.page.locator('#game').dispatch_event('pointermove',{'clientX':0,'clientY':0})
        self.page.evaluate('fish.castLine()');point=self.page.evaluate('({x:fish.game.float.ex,y:fish.game.float.ey})')
        self.assertGreaterEqual(point['x'],20);self.assertGreaterEqual(point['y'],20)
        self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth<=innerWidth'))

if __name__=='__main__':unittest.main()
