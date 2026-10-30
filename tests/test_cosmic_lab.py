"""Regression tests for the separately published Cosmic Lab HTML."""
import functools
import http.server
import json
from pathlib import Path
import threading
import unittest
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
FILE='宇宙实验室_3D碰撞模拟器.html'

class CosmicLabTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ROOT)))
        threading.Thread(target=cls.server.serve_forever,daemon=True).start()
        cls.url=f'http://127.0.0.1:{cls.server.server_port}/lab-test.html'
        cls.pw=sync_playwright().start();cls.browser=cls.pw.chromium.launch(channel='chrome',headless=True)
    @classmethod
    def tearDownClass(cls):
        cls.browser.close();cls.pw.stop();cls.server.shutdown();cls.server.server_close()
    def setUp(self):
        self.page=self.browser.new_page(viewport={'width':1440,'height':900});self.errors=[]
        self.page.on('pageerror',lambda error:self.errors.append(str(error)))
        self.page.on('dialog',lambda dialog:dialog.dismiss())
        source=(ROOT/FILE).read_text(encoding='utf-8')
        hook="window.lab={get bodies(){return bodies},makeBody,clearWorld,physics,collide,preset,renderer,scene,THREE,camera,orbitGroup,updateTrails,get effects(){return effects}};running=false;preset('impact');updateCamera();"
        source=source.replace("preset('impact');updateCamera();",hook)
        self.page.route('**/lab-test.html',lambda route:route.fulfill(body=source,content_type='text/html'))
        fixture=ROOT/'vendor/three.module.js'
        if not fixture.exists():fixture=ROOT/'.screenshots/three.module.js'
        if fixture.exists():self.page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',lambda route:route.fulfill(path=str(fixture),content_type='text/javascript'))
        self.page.goto(self.url);self.page.wait_for_function('window.lab',timeout=30000)
    def tearDown(self):self.page.close()
    def upload(self,data):
        self.page.locator('#file').set_input_files({'name':'scene.json','mimeType':'application/json','buffer':json.dumps(data).encode()})
        self.page.wait_for_timeout(200)
    def test_roundtrip_preserves_physical_radius(self):
        with self.page.expect_download() as pending:self.page.locator('#save').click()
        data=json.loads(Path(pending.value.path()).read_text(encoding='utf-8'))
        radii=self.page.evaluate('lab.bodies.map(b=>b.radius)');self.upload(data)
        self.assertEqual(self.page.evaluate('lab.bodies.map(b=>b.radius)'),radii)
        self.assertEqual(self.errors,[])
    def test_invalid_import_keeps_current_scene_and_names_are_text(self):
        before=self.page.evaluate('lab.bodies.map(b=>b.id)')
        self.upload({'version':1,'bodies':[{'kind':'invalid'}]})
        self.assertEqual(self.page.evaluate('lab.bodies.map(b=>b.id)'),before)
        data={'version':1,'bodies':[{'kind':'planet','mass':1,'radius':1,'position':[0,0,0],'vel':[0,0,0],'color':123,'name':'<img src=x onerror="window.importExecuted=true">'}]}
        self.upload(data)
        self.assertFalse(self.page.evaluate('Boolean(window.importExecuted)'))
        self.assertIn('<img',self.page.locator('#details').inner_text())
    def test_fragment_preserves_mass_and_linear_momentum(self):
        result=self.page.evaluate('''() => {lab.clearWorld();const V=lab.THREE.Vector3;
          const a=lab.makeBody({mass:4,radius:2,position:new V(-2,0,0),vel:new V(2,1,0)}),b=lab.makeBody({mass:3,radius:2,position:new V(2,0,0),vel:new V(-1,0,0)});
          document.querySelector('#collision').value='fragment';lab.collide(a,b);
          return {mass:lab.bodies.reduce((s,b)=>s+b.mass,0),momentum:lab.bodies.reduce((v,b)=>v.addScaledVector(b.vel,b.mass),new V()).toArray()};}''')
        self.assertAlmostEqual(result['mass'],7)
        for actual,expected in zip(result['momentum'],[5,4,0]):self.assertAlmostEqual(actual,expected)
    def test_reset_disposes_children_trails_and_effects(self):
        result=self.page.evaluate('''() => {let disposed=0;lab.clearWorld();const b=lab.makeBody({kind:'star'});
          b.mesh.children[0].geometry.addEventListener('dispose',()=>disposed++);b.mesh.children[0].material.addEventListener('dispose',()=>disposed++);
          lab.updateTrails();lab.updateTrails();b.line.material.addEventListener('dispose',()=>disposed++);
          document.querySelector('#trails').checked=false;lab.updateTrails();
          const other=lab.makeBody();document.querySelector('#collision').value='merge';lab.collide(b,other);lab.clearWorld();
          return {disposed,effects:lab.effects.length};}''')
        self.assertGreaterEqual(result['disposed'],3);self.assertEqual(result['effects'],0)
    def test_display_toggles_and_body_limit(self):
        self.page.locator('#labels').uncheck();self.page.locator('#orbits').uncheck()
        self.page.wait_for_timeout(100)
        self.assertFalse(self.page.evaluate('lab.orbitGroup.visible'))
        self.page.locator('#orbits').check();self.page.wait_for_timeout(100)
        self.assertGreater(self.page.evaluate('lab.orbitGroup.children.length'),0)
        self.page.locator('#labels').check();self.page.wait_for_timeout(100)
        self.assertGreater(self.page.locator('#labelsLayer span').count(),0)
        self.assertLessEqual(self.page.evaluate('for(let i=0;i<110;i++)lab.makeBody();lab.bodies.length'),100)
    def test_repeated_drag_does_not_jump_and_ignores_other_pointers(self):
        self.page.evaluate("lab.clearWorld();lab.makeBody({mass:1,position:new lab.THREE.Vector3(),vel:new lab.THREE.Vector3()});lab.renderer.render(lab.scene,lab.camera)")
        def screen():
            return self.page.evaluate('''() => {const p=lab.bodies[0].mesh.position.clone().project(lab.camera),r=document.querySelector('#view').getBoundingClientRect();return {x:r.left+(p.x*.5+.5)*r.width,y:r.top+(-p.y*.5+.5)*r.height};}''')
        positions=[]
        for _ in range(2):
            point=screen();self.page.mouse.move(point['x']+8,point['y']);self.page.mouse.down()
            before=self.page.evaluate('lab.bodies[0].mesh.position.toArray()')
            self.page.locator('#view').dispatch_event('pointermove',{'pointerId':99,'clientX':point['x']+100,'clientY':point['y']+100})
            self.assertEqual(self.page.evaluate('lab.bodies[0].mesh.position.toArray()'),before)
            self.page.mouse.move(point['x']+18,point['y'],steps=3);self.page.mouse.up()
            after=self.page.evaluate('lab.bodies[0].mesh.position.toArray()')
            positions.append([a-b for a,b in zip(after,before)])
        for a,b in zip(*positions):self.assertAlmostEqual(a,b,places=2)
        self.assertEqual(self.errors,[])
    def test_real_page_offline_dependency_and_mobile(self):
        page=self.browser.new_page(viewport={'width':390,'height':844})
        errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        page.route('https://**',lambda route:route.abort())
        from urllib.parse import quote
        try:
            page.goto(self.url.rsplit('/',1)[0]+'/'+quote(FILE));page.wait_for_function("Number(document.querySelector('#count').textContent)>0")
            page.locator('#pause').click();self.assertIn('暂停',page.locator('#status').inner_text())
            self.assertTrue(page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
            page.locator('#view').screenshot(path=str(ROOT/'.screenshots/lab-mobile.png'))
            page.set_viewport_size({'width':1440,'height':900});page.wait_for_timeout(200)
            page.screenshot(path=str(ROOT/'.screenshots/lab-desktop.png'))
            self.assertEqual(errors,[])
        finally:page.close()
    def test_trails_reuse_gpu_buffer_and_update_bounds(self):
        result=self.page.evaluate('''() => {lab.clearWorld();const b=lab.makeBody({velocity:0});lab.updateTrails();lab.updateTrails();lab.renderer.render(lab.scene,lab.camera);
          const attribute=b.line.geometry.getAttribute('position');b.mesh.position.set(500,0,0);
          for(let i=0;i<100;i++)lab.updateTrails();
          return {same:attribute===b.line.geometry.getAttribute('position'),center:b.line.geometry.boundingSphere.center.x};}''')
        self.assertTrue(result['same']);self.assertAlmostEqual(result['center'],500,places=3)
    def test_fast_bodies_contact_in_all_collision_modes(self):
        for mode in ['merge','bounce','fragment']:
            result=self.page.evaluate('''mode => {lab.clearWorld();document.querySelector('#gravity').value=0;document.querySelector('#collision').value=mode;
              lab.makeBody({mass:1,radius:.2,physicalRadius:true,position:new lab.THREE.Vector3(-1,0,0),vel:new lab.THREE.Vector3(50,0,0)});
              lab.makeBody({mass:1,radius:.2,physicalRadius:true,position:new lab.THREE.Vector3(1,0,0),vel:new lab.THREE.Vector3(-50,0,0)});
              lab.physics(.016);return {hits:Number(document.querySelector('#hits').textContent),mass:lab.bodies.reduce((s,b)=>s+b.mass,0)};}''',mode)
            self.assertEqual(result['hits'],1,mode);self.assertAlmostEqual(result['mass'],2)
    def test_chained_contacts_resolve_in_the_same_step(self):
        result=self.page.evaluate('''() => {lab.clearWorld();document.querySelector('#gravity').value=0;document.querySelector('#collision').value='merge';
          for(const [x,v] of [[-2,100],[0,0],[2,0]])lab.makeBody({mass:1,radius:.2,physicalRadius:true,position:new lab.THREE.Vector3(x,0,0),vel:new lab.THREE.Vector3(v,0,0)});
          lab.physics(.016);return {count:lab.bodies.length,mass:lab.bodies.reduce((s,b)=>s+b.mass,0),hits:Number(document.querySelector('#hits').textContent)};}''')
        self.assertEqual(result,{'count':1,'mass':3,'hits':2})

if __name__=='__main__':unittest.main()
