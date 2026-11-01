"""Browser regressions. Requires: pip install playwright Pillow; local Chrome."""
import functools
import io
from PIL import Image, ImageChops
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
  clearScene, explosions, shockwaves, flashes, step, updateEffects, explode, transformBody, checkEvolution,
  get nebulae() { return typeof nebulae === "undefined" ? null : nebulae; },
  get updateProbeTelemetry() { return typeof updateProbeTelemetry === "undefined" ? null : updateProbeTelemetry; },
  get updatePlanetaryRings() { return typeof updatePlanetaryRings === "undefined" ? null : updatePlanetaryRings; },
  get lensPass() { return typeof lensPass === "undefined" ? null : lensPass; },
  get lensDemoGrid() { return typeof lensDemoGrid === "undefined" ? null : lensDemoGrid; },
  clear: () => { while (bodies.length) removeBody(bodies[0]); },
  frame: () => renderer.render(scene, camera), ghost, selectBody, focusChip, camera, controls,
  get selected() { return selected; },
  get shapeScale() { return typeof shapeScale === 'function' ? shapeScale : null; },
  get updateFocusLabel() { return typeof updateFocusLabel === 'function' ? updateFocusLabel : null; } };
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
          const impactor = sim.spawnBody(target.r*.7,0,0,0,0,0,1,'asteroid');
          sim.handleCollisions();
          const changed = target.mesh.material.map !== original;
          const unchanged = sibling.mesh.material.map === siblingMap;
          const craterCount = target.impactCount || 0;
          let disposed = false;
          target.mesh.material.map.addEventListener('dispose', () => disposed = true);
          sim.removeBody(target);
          return { changed, unchanged, originalUnchanged: original.image === originalImage,
            craterCount, disposed, heat:target.heat, removed: !sim.bodies.includes(impactor) };
        }''')
        self.assertTrue(result['changed'], result)
        self.assertTrue(result['unchanged'], result)
        self.assertTrue(result['originalUnchanged'], result)
        self.assertEqual(result['craterCount'], 1, result)
        self.assertTrue(result['disposed'], result)
        self.assertTrue(result['removed'], result)
        self.assertGreater(result['heat'], 0, result)
        self.assertEqual(self.errors, [])

    def test_reference_ratios_and_mode_switch_apply_to_existing_bodies(self):
        self.open_sim()
        self.page.evaluate("sim.clear(); sim.spawnBody(0,0,0,0,0,0,40,'planet'); sim.spawnBody(100,0,0,0,0,0,70,'gasGiant'); sim.spawnBody(300,0,0,0,0,0,600,'star');")
        radii = self.page.evaluate("sim.bodies.map(b => b.r)")
        self.assertAlmostEqual(radii[1] / radii[0], 11)
        self.assertAlmostEqual(radii[2] / radii[0], 109)
        self.page.evaluate("sim.spawnBody(500,0,0,0,0,0,2,'comet')")
        self.page.select_option('#sizeMode', 'display')
        comet = self.page.evaluate("({r:sim.bodies[3].r, tail:sim.bodies[3].tail.scale.y})")
        self.assertAlmostEqual(comet['tail'], comet['r'] * 18)
        switched = self.page.evaluate("sim.bodies.map(b => ({r:b.r,scale:b.mesh.scale.x,mass:b.mass}))")
        self.assertAlmostEqual(switched[0]['r'], 1.7 * 40**(1/3))
        self.assertAlmostEqual(switched[0]['scale'], switched[0]['r'])
        self.assertEqual(switched[0]['mass'], 40)
        self.page.select_option('#sizeMode', 'reference')
        self.assertAlmostEqual(self.page.evaluate('sim.bodies[0].r'), radii[0])
        self.assertEqual(self.errors, [])

    def test_wormhole_pair_transports_fast_bodies_without_absorbing_them(self):
        self.open_sim()
        result = self.page.evaluate("""() => {
          sim.clear();
          const entrance=sim.spawnBody(0,0,0,0,0,0,1500,'wormhole');
          const exit=sim.spawnBody(100,0,0,0,0,0,1500,'wormhole');
          entrance.stable=exit.stable=true;
          const planet=sim.spawnBody(-30,0,0,60,0,0,40,'planet');
          sim.step();
          return {count:sim.bodies.length, type:planet.type, mass:planet.mass,
            distance:planet.mesh.position.distanceTo(exit.mesh.position),
            minimum:exit.r+planet.r, cooldown:planet.tpCd, entranceRadius:entrance.r};
        }""")
        self.assertEqual(result['count'],3,result)
        self.assertEqual(result['type'],'planet',result)
        self.assertEqual(result['mass'],40,result)
        self.assertGreaterEqual(result['distance'],result['minimum'],result)
        self.assertLess(result['distance'],result['minimum']+10,result)
        self.assertGreater(result['cooldown'],0,result)
        self.assertGreater(result['entranceRadius'],1,result)

    def test_single_wormhole_does_not_absorb_body(self):
        self.open_sim()
        result = self.page.evaluate("""() => {
          sim.clear();sim.spawnBody(0,0,0,0,0,0,1500,'wormhole');
          sim.spawnBody(0,0,0,0,0,0,40,'planet');sim.step();
          return sim.bodies.map(b=>b.type).sort();
        }""")
        self.assertEqual(result,['planet','wormhole'])

    def test_escaping_body_is_not_deleted_after_crossing_old_boundary(self):
        self.open_sim()
        result=self.page.evaluate("""() => {
          sim.clear();const body=sim.spawnBody(3499,0,0,20,0,0,40,'planet');
          sim.step();return {present:sim.bodies.includes(body),x:body.mesh.position.x};
        }""")
        self.assertGreater(result['x'],3500)
        self.assertTrue(result['present'],result)

    def test_find_body_follows_distant_body_and_camera_can_render_it(self):
        self.open_sim()
        self.page.evaluate("sim.clear(); sim.spawnBody(50000,0,0,0,0,0,40,'planet')")
        self.page.wait_for_function('sim.camera.far > 50000')
        self.page.locator('#btnFindBody').click()
        self.page.wait_for_function('sim.selected && sim.controls.target.distanceTo(sim.selected.mesh.position) < 0.01')
        self.assertEqual(self.page.evaluate('sim.selected.type'),'planet')
        self.page.locator('#tools [data-type="star"]').click()
        self.page.mouse.move(900,450);self.page.mouse.down()
        self.page.mouse.move(960,450,steps=4);self.page.mouse.up()
        distance=self.page.evaluate('sim.bodies[1].mesh.position.distanceTo(sim.controls.target)')
        self.assertLess(distance,1000, 'new bodies should launch near the current view')
        self.assertEqual(self.errors,[])

    def test_cancelled_or_secondary_touch_does_not_launch_body(self):
        self.open_sim();self.page.evaluate('sim.clear()')
        self.page.evaluate("""() => {
          const c=document.getElementById('space');
          const fire=(type,id,primary,x)=>c.dispatchEvent(new PointerEvent(type,
            {pointerId:id,pointerType:'touch',isPrimary:primary,button:0,clientX:x,clientY:450,bubbles:true}));
          fire('pointerdown',1,true,1000);fire('pointerdown',2,false,1050);
          fire('pointerup',2,false,1050);fire('pointerup',1,true,1100);
          fire('pointerdown',3,true,1000);fire('pointercancel',3,true,1000);fire('pointerup',3,true,1100);
        }""")
        self.assertEqual(self.page.evaluate('sim.bodies.length'),0)
        self.assertEqual(self.errors,[])

    def test_click_empty_canvas_places_body(self):
        self.open_sim();self.page.evaluate('sim.clear()')
        self.page.mouse.click(1100,450)
        self.assertEqual(self.page.evaluate('sim.bodies.length'),1)
        self.assertEqual(self.errors,[])

    def test_focused_body_survives_collision_and_evolution_as_selection(self):
        self.open_sim()
        result=self.page.evaluate("""() => {
          sim.clear();const a=sim.spawnBody(0,0,0,0,0,0,100,'planet');
          const b=sim.spawnBody(a.r,0,0,0,0,0,40,'planet');
          sim.selectBody(b);sim.handleCollisions();
          const afterCollision=sim.selected===a;
          const evolved=sim.transformBody(a,'brownDwarf');
          return {afterCollision,afterEvolution:sim.selected===evolved,mass:evolved.mass};
        }""")
        self.assertTrue(result['afterCollision'],result)
        self.assertTrue(result['afterEvolution'],result)
        self.assertEqual(result['mass'],140)

    def test_full_scene_never_deletes_existing_body_to_make_room(self):
        self.open_sim()
        result=self.page.evaluate("""() => {
          sim.clear();for(let i=0;i<320;i++)sim.spawnBody(i*20,0,0,0,0,0,40,'planet');
          const existing=[...sim.bodies], extra=sim.spawnBody(9000,0,0,0,0,0,40,'planet');
          return {count:sim.bodies.length,allPresent:existing.every(b=>sim.bodies.includes(b)),rejected:extra===null};
        }""")
        self.assertEqual(result,{'count':320,'allPresent':True,'rejected':True})

    def test_drag_from_body_starts_outside_existing_surface(self):
        self.open_sim()
        self.page.evaluate("sim.clear();sim.spawnBody(0,0,0,0,0,0,600,'star')")
        self.page.mouse.move(720,450);self.page.mouse.down()
        self.page.mouse.move(800,450,steps=4);self.page.mouse.up()
        result=self.page.evaluate("""() => {
          const [a,b]=sim.bodies;return {count:sim.bodies.length,distance:a.mesh.position.distanceTo(b.mesh.position),minimum:a.r+b.r};
        }""")
        self.assertEqual(result['count'],2,result)
        self.assertGreater(result['distance'],result['minimum'],result)

    def test_xray_view_shows_high_energy_and_heated_bodies_without_changing_physics(self):
        self.open_sim()
        self.page.evaluate("sim.clear();sim.spawnBody(0,0,0,0,0,0,6000,'neutron');sim.spawnBody(200,0,0,0,0,0,40,'planet')")
        toggle=self.page.locator('#xrayToggle')
        self.assertTrue(toggle.is_checked())
        self.page.wait_for_function('sim.bodies[0].xray && sim.bodies[0].xray.visible')
        self.assertFalse(self.page.evaluate('sim.bodies[1].xray.visible'))
        self.page.evaluate('sim.bodies[1].heat=1')
        self.page.wait_for_function('sim.bodies[1].xray.visible')
        before=self.page.evaluate('sim.bodies.map(b=>({mass:b.mass,r:b.r}))')
        toggle.uncheck()
        self.page.wait_for_function('sim.bodies.every(b=>!b.xray.visible)')
        self.assertEqual(self.page.evaluate('sim.bodies.map(b=>({mass:b.mass,r:b.r}))'),before)
        toggle.check()
        self.page.wait_for_function('sim.bodies[1].xray.visible')
        self.assertEqual(self.errors,[])

    def test_probe_launch_and_nearby_target_telemetry(self):
        self.open_sim()
        self.page.evaluate("sim.clear();sim.spawnBody(0,0,0,0,0,0,40,'planet')")
        self.page.locator('#tools [data-type="probe"]').click()
        self.page.mouse.click(1100,450)
        data=self.page.evaluate("""() => {
          const probe=sim.bodies.find(b=>b.type==='probe');
          if(!probe)return null;
          probe.mesh.position.set(20,0,0);sim.updateProbeTelemetry();
          return {mass:probe.mass, text:document.querySelector('#probeTelemetry').textContent,
            visible:!document.querySelector('#probeTelemetry').hidden};
        }""")
        self.assertIsNotNone(data);self.assertGreater(data['mass'],0)
        self.assertTrue(data['visible']);self.assertIn('行星',data['text']);self.assertIn('距离',data['text'])
        self.page.evaluate("sim.bodies.find(b=>b.type==='probe').mesh.position.set(5000,0,0);sim.updateProbeTelemetry()")
        self.assertIn('超出扫描范围',self.page.locator('#probeReadout').inner_text())
        self.page.evaluate('sim.clearScene();sim.updateProbeTelemetry()')
        self.assertTrue(self.page.locator('#probeTelemetry').is_hidden())
        self.assertEqual(self.errors,[])

    def test_stellar_demos_and_natural_evolution_create_and_clear_nebulae(self):
        self.open_sim()
        self.page.locator('#btnSupernova').click()
        result=self.page.evaluate("""() => ({type:sim.nebulae[0]?.type,body:sim.bodies[0]?.type})""")
        self.assertEqual(result,{'type':'supernova','body':'blackhole'})
        self.page.locator('#btnPlanetaryNebula').click()
        result=self.page.evaluate("""() => ({count:sim.nebulae.length,type:sim.nebulae[0]?.type,body:sim.bodies[0]?.type})""")
        self.assertEqual(result,{'count':1,'type':'planetary','body':'whiteDwarf'})
        self.page.evaluate("sim.clearScene();sim.checkEvolution(sim.spawnBody(0,0,0,0,0,0,900,'redGiant'))")
        self.assertEqual(self.page.evaluate('sim.nebulae[0].type'),'planetary')
        self.page.evaluate('sim.nebulae[0].age=sim.nebulae[0].duration;sim.updateEffects()')
        self.assertEqual(self.page.evaluate('sim.nebulae.length'),0)
        self.page.evaluate("sim.clearScene();sim.checkEvolution(sim.spawnBody(0,0,0,0,0,0,5000,'whiteDwarf'))")
        self.assertEqual(self.page.evaluate('sim.nebulae[0].type'),'supernova')
        self.page.evaluate('sim.clearScene()')
        self.assertEqual(self.page.evaluate('sim.nebulae.length'),0)
        self.assertEqual(self.errors,[])

    def test_auto_orbit_uses_selected_body_nearest_heavier_center_and_preserves_position(self):
        self.open_sim()
        self.page.evaluate("""() => {
          sim.clear();sim.spawnBody(0,0,0,0,0,0,600,'star');
          const planet=sim.spawnBody(200,0,0,0,0,0,40,'planet');
          sim.spawnBody(1000,0,0,0,0,0,1200,'star');sim.selectBody(planet);
        }""")
        self.page.locator('#btnAutoOrbit').click(timeout=5000)
        result=self.page.evaluate("""() => {
          const star=sim.bodies[0],planet=sim.bodies[1];
          const r=planet.mesh.position.clone().sub(star.mesh.position);
          const v=planet.vel.clone().sub(star.vel);
          return {distance:r.length(),radial:r.dot(v),speed:v.length(),text:document.querySelector('#launchNotice').textContent};
        }""")
        expected=(3*(600+40)*200**2/(200**2+60)**1.5)**.5
        self.assertAlmostEqual(result['distance'],200,places=6)
        self.assertAlmostEqual(result['radial'],0,places=6)
        self.assertAlmostEqual(result['speed'],expected,places=6)
        self.assertIn('恒星',result['text'])
        self.assertEqual(self.errors,[])

    def test_auto_orbit_inherits_moving_center_velocity(self):
        self.open_sim()
        self.page.evaluate("sim.clear();sim.spawnBody(0,0,0,1.5,-0.5,2,600,'star');sim.selectBody(sim.spawnBody(200,0,0,0,0,0,40,'planet'))")
        self.page.locator('#btnAutoOrbit').click()
        result=self.page.evaluate("""() => {
          const [center,body]=sim.bodies, r=body.mesh.position.clone().sub(center.mesh.position);
          return {radial:r.dot(body.vel.clone().sub(center.vel)),center:center.vel.toArray()};
        }""")
        self.assertAlmostEqual(result['radial'],0,places=6)
        self.assertEqual(result['center'],[1.5,-.5,2])

    def test_auto_orbit_remains_bound_under_simulated_gravity(self):
        self.open_sim()
        self.page.evaluate("sim.clear();sim.spawnBody(0,0,0,0,0,0,600,'star');sim.selectBody(sim.spawnBody(200,0,0,0,0,0,40,'planet'))")
        self.page.locator('#btnAutoOrbit').click()
        result=self.page.evaluate("""() => {
          for(let i=0;i<500;i++)sim.step();
          return {count:sim.bodies.length,distance:sim.bodies[0].mesh.position.distanceTo(sim.bodies[1].mesh.position)};
        }""")
        self.assertEqual(result['count'],2,result)
        self.assertGreater(result['distance'],190,result)
        self.assertLess(result['distance'],210,result)

    def test_auto_orbit_requires_selected_body_and_valid_center(self):
        self.open_sim();self.page.evaluate('sim.clear()')
        self.page.locator('#btnAutoOrbit').click(timeout=5000)
        self.assertIn('选择',self.page.locator('#launchNotice').inner_text())
        self.page.evaluate("sim.selectBody(sim.spawnBody(0,0,0,0,0,0,40,'planet'))")
        self.page.locator('#btnAutoOrbit').click()
        self.assertIn('更大',self.page.locator('#launchNotice').inner_text())
        self.page.evaluate("sim.spawnBody(0,0,0,0,0,0,600,'star')")
        self.page.locator('#btnAutoOrbit').click()
        self.assertIn('重叠',self.page.locator('#launchNotice').inner_text())
        self.assertEqual(self.errors,[])

    def test_ring_tide_demo_visibly_deforms_during_real_simulation(self):
        self.open_sim()
        self.page.locator('#btnRingTides').click(timeout=5000)
        self.page.wait_for_function("""() => {
          const p=sim.bodies.find(b=>b.type==='ringplanet');
          return p && p.ringTide>.45 && p.ring.scale.x>1.3 && p.ring.scale.y<.85;
        }""",timeout=20000)
        result=self.page.evaluate("""() => {
          const p=sim.bodies.find(b=>b.type==='ringplanet');
          const positions=p.ring.geometry.attributes.position.array;
          const original=p.ring.geometry.userData.originalPositions;
          return {count:sim.bodies.length,selected:sim.selected===p,tidal:p.ringTide,
            warped:original && positions.some((v,i)=>Math.abs(v-original[i])>.01),
            mass:p.mass,radius:p.r,notice:document.querySelector('#launchNotice').textContent};
        }""")
        self.assertEqual(result['count'],2,result)
        self.assertTrue(result['selected'],result)
        self.assertTrue(result['warped'],result)
        self.assertEqual(result['mass'],55,result)
        self.assertGreater(result['radius'],0,result)
        self.assertIn('环潮汐',self.page.evaluate('sim.focusChip.textContent'))
        self.page.locator('#btnRingCompare').click()
        self.page.wait_for_function("sim.bodies.find(b=>b.type==='ringplanet').ringTide < .01",timeout=20000)
        self.assertEqual(self.page.locator('#btnRingCompare').inner_text(),'显示潮汐变形')
        self.page.locator('#btnRingCompare').click()
        self.page.wait_for_function("sim.bodies.find(b=>b.type==='ringplanet').ringTide > .45",timeout=20000)
        self.page.locator('#btnPause').click()
        self.assertTrue(self.page.locator('#btnRingCompare').is_hidden())
        self.assertEqual(self.errors,[])

    def test_planetary_ring_distorts_near_massive_body_and_recovers(self):
        self.open_sim()
        result=self.page.evaluate("""() => {
          if(!sim.updatePlanetaryRings)return null;
          sim.clear(); const star=sim.spawnBody(0,0,0,0,0,0,600,'star');
          const planet=sim.spawnBody(40,0,0,0,0,0,55,'ringplanet');
          const before={radius:planet.r,mass:planet.mass};
          for(let i=0;i<80;i++)sim.updatePlanetaryRings();
          const near={x:planet.ring.scale.x,y:planet.ring.scale.y, angle:planet.ring.rotation.z};
          planet.mesh.position.set(500,0,0);
          for(let i=0;i<150;i++)sim.updatePlanetaryRings();
          const position=planet.ring.geometry.attributes.position.array;
          const original=planet.ring.geometry.userData.originalPositions;
          const geometryError=Math.max(...position.map((v,i)=>Math.abs(v-original[i])));
          return {near,far:{x:planet.ring.scale.x,y:planet.ring.scale.y},geometryError,before,after:{radius:planet.r,mass:planet.mass}};
        }""")
        self.assertIsNotNone(result)
        self.assertGreater(result['near']['x'],1.05,result)
        self.assertLess(result['near']['y'],.98,result)
        self.assertAlmostEqual(result['far']['x'],1,places=4)
        self.assertAlmostEqual(result['far']['y'],1,places=4)
        self.assertLess(result['geometryError'],.0001,result)
        self.assertEqual(result['before'],result['after'])
        self.assertEqual(self.errors,[])

    def test_ring_geometry_is_independent_and_disposed_on_removal(self):
        self.open_sim()
        result=self.page.evaluate("""() => {
          sim.clear();const a=sim.spawnBody(0,0,0,0,0,0,55,'ringplanet');
          const b=sim.spawnBody(100,0,0,0,0,0,55,'ringplanet');
          let disposed=false;a.ring.geometry.addEventListener('dispose',()=>disposed=true);
          const independent=a.ring.geometry!==b.ring.geometry;
          sim.removeBody(a);return {independent,disposed,otherPresent:sim.bodies.includes(b)};
        }""")
        self.assertEqual(result,{'independent':True,'disposed':True,'otherPresent':True})

    def test_ring_stretches_toward_strongest_tidal_source(self):
        self.open_sim()
        result=self.page.evaluate("""() => {
          sim.clear();const ring=sim.spawnBody(0,0,0,0,0,0,55,'ringplanet');
          const star=sim.spawnBody(40,0,0,0,0,0,600,'star');
          sim.spawnBody(3,0,0,0,0,0,2,'asteroid');
          for(let i=0;i<80;i++)sim.updatePlanetaryRings();
          const first=ring.ring.rotation.z, strength=ring.ringTide;
          star.mesh.position.set(0,0,40);
          for(let i=0;i<3;i++)sim.updatePlanetaryRings();
          const second=ring.ring.rotation.z;
          sim.removeBody(star);for(let i=0;i<150;i++)sim.updatePlanetaryRings();
          return {first,second,strength,recovered:ring.ringTide};
        }""")
        self.assertGreater(result['strength'],.1,result)
        self.assertGreater(abs(result['first']-result['second']),.5,result)
        self.assertLess(result['recovered'],.00001,result)
        self.assertEqual(self.errors,[])

    def test_black_hole_lensing_demo_distorts_canvas_and_can_be_disabled(self):
        self.open_sim()
        self.page.locator('#btnLensDemo').click(timeout=5000)
        self.page.wait_for_function("sim.lensPass && sim.lensPass.enabled && sim.lensPass.uniforms.lenses.value[0].w > 0",timeout=15000)
        before=self.page.evaluate("sim.bodies.map(b=>({mass:b.mass,r:b.r,position:b.mesh.position.toArray()}))")
        on=Image.open(io.BytesIO(self.page.screenshot())).convert('RGB').crop((500,200,1000,700))
        self.page.locator('#lensToggle').uncheck()
        self.page.wait_for_function('!sim.lensPass.enabled')
        off=Image.open(io.BytesIO(self.page.screenshot())).convert('RGB').crop((500,200,1000,700))
        diff=ImageChops.difference(on,off)
        changed=sum(1 for pixel in diff.getdata() if max(pixel)>8)
        self.assertGreater(changed,100,'lensing should visibly warp the rendered canvas')
        self.assertEqual(self.page.evaluate("sim.bodies.map(b=>({mass:b.mass,r:b.r,position:b.mesh.position.toArray()}))"),before)
        self.page.locator('#lensToggle').check()
        self.page.select_option('#sizeMode','display')
        self.page.wait_for_function('sim.lensPass.enabled')
        self.assertGreater(self.page.evaluate('sim.camera.position.distanceTo(sim.controls.target) / sim.bodies[0].r'),20)
        disposed=self.page.evaluate("""() => {let done=false;
          sim.lensDemoGrid.geometry.addEventListener('dispose',()=>done=true);
          sim.clearScene();return done && !sim.lensDemoGrid;}""")
        self.assertTrue(disposed)
        self.assertEqual(self.errors,[])

    def test_black_hole_lens_demo_is_available_on_mobile(self):
        self.open_sim();self.page.set_viewport_size({'width':390,'height':844})
        self.page.wait_for_function("document.getElementById('panelControls').hidden")
        self.page.locator('#toggleControls').click()
        self.page.locator('#btnLensDemo').click()
        self.page.wait_for_function('sim.lensPass && sim.lensPass.enabled',timeout=15000)
        self.assertEqual(self.errors,[])

    def test_lensing_ignores_black_holes_behind_camera_and_caps_sources(self):
        self.open_sim()
        self.page.evaluate("""() => {
          sim.clear();sim.camera.position.set(0,0,100);sim.controls.target.set(0,0,0);sim.controls.update();
          for(let i=0;i<6;i++)sim.spawnBody((i-3)*2,0,0,0,0,0,2500,'blackhole');
        }""")
        self.page.wait_for_function("sim.lensPass && sim.lensPass.uniforms.lenses.value.filter(v=>v.w>0).length===4",timeout=15000)
        self.page.evaluate("""() => {sim.clear();sim.spawnBody(0,0,200,0,0,0,2500,'blackhole');}""")
        self.page.wait_for_function('!sim.lensPass.enabled',timeout=15000)
        self.assertEqual(self.errors,[])

    def test_deformation_preserves_body_volume(self):
        self.open_sim()
        result=self.page.evaluate('''() => {
          if (!sim.shapeScale) return null;
          return [[0,0,0],[0.28,0,0],[0,0.3,0.01],[0.28,0.3,-0.01]].map(([deform,tide,wobble]) => {
            const scales=sim.shapeScale(10,deform,tide,wobble);
            return {scales, volumeFactor:scales[0]*scales[1]*scales[2]/1000};
          });
        }''')
        self.assertIsNotNone(result, 'shape transformation should preserve the body volume')
        for item in result:
            self.assertAlmostEqual(item['volumeFactor'],1,places=10)
            self.assertTrue(all(value>0 for value in item['scales']))

    def test_dragged_body_matches_previewed_mass_and_radius(self):
        self.open_sim();self.page.evaluate("sim.clear();window.originalRandom=Math.random;Math.random=()=>0;")
        self.page.locator('#tools [data-type="star"]').click()
        self.page.mouse.move(900,450);self.page.mouse.down();preview=self.page.evaluate('sim.ghost.scale.x')
        self.page.mouse.move(960,450,steps=4);self.page.mouse.up()
        body=self.page.evaluate("() => ({mass:sim.bodies[0].mass,radius:sim.bodies[0].r})")
        self.assertEqual(body['mass'],600);self.assertAlmostEqual(body['radius'],preview,places=10)
        self.assertEqual(self.errors,[])

    def test_spherical_bodies_collide_when_their_surfaces_overlap(self):
        self.open_sim()
        result=self.page.evaluate('''() => {
          sim.clear();const a=sim.spawnBody(0,0,0,0,0,0,40,'planet');
          const b=sim.spawnBody(a.r*1.8,0,0,0,0,0,40,'planet');
          sim.handleCollisions();return {count:sim.bodies.length,mass:sim.bodies[0].mass,radius:sim.bodies[0].r};
        }''')
        self.assertEqual(result['count'],1);self.assertEqual(result['mass'],80)
        self.assertAlmostEqual(result['radius'],0.25*(2**(1/3)),places=9)

    def test_swept_collision_does_not_merge_a_removed_body_twice(self):
        self.open_sim()
        result = self.page.evaluate("""() => {
          sim.clear();const a=sim.spawnBody(-10,0,0,0,0,0,40,'planet');
          sim.spawnBody(0,0,0,0,0,0,80,'planet');
          sim.spawnBody(-5,0,0,0,0,0,10,'planet');
          a.mesh.position.x=10;sim.handleCollisions(true);
          return {mass:sim.bodies.reduce((sum,b)=>sum+b.mass,0), count:sim.bodies.length};
        }""")
        self.assertEqual(result['mass'],130)

    def test_fast_small_bodies_collide_along_their_paths(self):
        self.open_sim()
        result=self.page.evaluate('''() => {
          sim.clear();sim.spawnBody(-8,0,0,16,0,0,40,'planet');sim.spawnBody(8,0,0,-16,0,0,40,'planet');
          sim.step();return {count:sim.bodies.length,mass:sim.bodies[0].mass};
        }''')
        self.assertEqual(result['count'],1);self.assertEqual(result['mass'],80)

    def test_selected_body_displays_simulation_radius_and_volume(self):
        self.open_sim()
        result=self.page.evaluate('''() => {
          if(!sim.updateFocusLabel)return null;
          sim.clear();const b=sim.spawnBody(0,0,0,0,0,0,40,'planet');sim.selectBody(b);sim.updateFocusLabel();
          return {text:sim.focusChip.textContent,r:b.r};
        }''')
        self.assertIsNotNone(result);self.assertIn('模拟半径',result['text']);self.assertIn('模拟体积',result['text'])

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

    def test_planet_scores_respond_to_environment(self):
        self.open_sim()
        self.assertTrue(self.page.evaluate('typeof window.assessPlanet === "function"'))
        result = self.page.evaluate('''() => {
          const earth = {type:'planet', mass:40, heat:0};
          const sun = [{type:'star', mass:800, distance:390}];
          return {ideal:assessPlanet(earth,sun), frozen:assessPlanet(earth,[]),
            hot:assessPlanet({...earth,heat:2},sun), gas:assessPlanet({type:'gasGiant',mass:70},sun)};
        }''')
        self.assertGreater(result['ideal']['earthSimilarity'], 90)
        self.assertGreater(result['ideal']['lifePotential'], result['frozen']['lifePotential'])
        self.assertGreater(result['ideal']['lifePotential'], result['hot']['lifePotential'])
        self.assertEqual(result['gas']['lifePotential'], 0)

    def test_scores_and_shockwave_controls_visible_in_both_modes(self):
        for name in ['cosmic-collision-3d.html', 'cosmic-collision-simulator.html']:
            self.page.goto(self.url + '/' + name)
            self.page.wait_for_function("document.getElementById('earthScore')?.textContent.includes('%')", timeout=60000)
            self.assertTrue(self.page.locator('label[for="earthMeter"]').is_visible())
            self.assertTrue(self.page.locator('label[for="lifeMeter"]').is_visible())
            self.page.set_viewport_size({'width':390,'height':844})
            button = self.page.locator('#btnShockwave')
            self.assertTrue(button.is_visible())
            self.assertLess(button.bounding_box()['y'], 65)
            self.page.screenshot(path=str(ROOT / '.screenshots' / (name + '-scores-mobile.png')))
            button.click()
            self.page.wait_for_function("Number(document.getElementById('statCollisions').textContent)>0")
            self.page.set_viewport_size({'width':1440,'height':900})
            self.assertEqual(self.errors, [])

    def test_shockwave_demo_replays_and_stops_on_scene_change(self):
        self.open_sim()
        self.page.locator('#btnShockwave').click()
        self.page.wait_for_function('sim.shockwaves.length > 0')
        self.page.wait_for_function('sim.shockwaves.length === 0', timeout=10000)
        self.page.wait_for_function('sim.shockwaves.length > 0', timeout=10000)
        self.page.locator('#btnReset').click()
        self.page.wait_for_timeout(3200)
        self.assertEqual(self.page.evaluate('sim.shockwaves.length'), 0)
        self.assertEqual(self.page.evaluate('sim.bodies.length'), 0)
        self.assertEqual(self.errors, [])

        self.page.goto(self.url + '/cosmic-collision-simulator.html?scene=shockwave')
        self.page.wait_for_function('shockwaves.length > 0')
        self.page.wait_for_function('shockwaves.length === 0', timeout=10000)
        self.page.wait_for_function('shockwaves.length > 0', timeout=10000)
        self.page.locator('#btnPause').click()
        radius = self.page.evaluate('shockwaves[0].r')
        self.page.wait_for_timeout(200)
        self.assertEqual(self.page.evaluate('shockwaves[0].r'), radius)
        self.page.locator('#btnReset').click()
        self.page.locator('#btnPause').click()
        self.page.wait_for_timeout(3200)
        self.assertEqual(self.page.evaluate('shockwaves.length'), 0)
        self.assertEqual(self.errors, [])

    def test_mobile_controls_fold_and_can_be_reopened(self):
        self.page.set_viewport_size({'width':390,'height':844})
        for name in ['cosmic-collision-3d.html', 'cosmic-collision-simulator.html']:
            self.page.goto(self.url + '/' + name)
            self.page.wait_for_function("document.getElementById('earthScore')?.textContent.includes('%')", timeout=60000)
            toggle = self.page.locator('#toggleControls')
            self.assertTrue(toggle.is_visible())
            self.assertFalse(self.page.locator('#tools').is_visible())
            self.assertLess(self.page.locator('.panel').bounding_box()['height'], 150)
            toggle.click()
            self.assertTrue(self.page.locator('#tools').is_visible())
            self.assertEqual(toggle.get_attribute('aria-expanded'), 'true')
            toggle.click()
            self.assertFalse(self.page.locator('#tools').is_visible())
            self.page.screenshot(path=str(ROOT / '.screenshots' / (name + '-compact-mobile.png')))
            self.assertEqual(self.errors, [])

    def test_stop_replay_keeps_scene_and_explains_scores(self):
        self.open_sim()
        self.page.locator('#btnShockwave').click()
        self.page.wait_for_function('sim.shockwaves.length > 0')
        self.page.locator('#btnStopShockwave').click()
        count = self.page.evaluate('sim.bodies.length')
        self.assertGreater(count, 0)
        self.page.wait_for_function('sim.shockwaves.length === 0', timeout=10000)
        self.page.wait_for_timeout(3200)
        self.assertEqual(self.page.evaluate('sim.shockwaves.length'), 0)
        self.assertEqual(self.page.evaluate('sim.bodies.length'), count)
        self.assertFalse(self.page.locator('#btnStopShockwave').is_visible())
        self.page.locator('#scoreExplanation summary').click()
        self.assertTrue(self.page.get_by_text('分值表示环境适宜程度，不代表已经发现生命。', exact=True).is_visible())
        self.assertEqual(self.errors, [])

    def test_reset_removes_collision_effects_and_materials(self):
        self.open_sim()
        result = self.page.evaluate('''() => {
          sim.clearScene();
          const target = sim.spawnBody(0,0,0,0,0,0,40,'planet');
          let materialDisposed = false;
          target.mesh.material.addEventListener('dispose', () => materialDisposed = true);
          sim.spawnBody(target.r*.7,0,0,0,0,0,1,'asteroid');
          sim.handleCollisions();
          const hadEffects = sim.explosions.length > 0;
          sim.clearScene();
          return {hadEffects, materialDisposed, remaining: sim.bodies.length +
            sim.explosions.length + sim.shockwaves.length + sim.flashes.length};
        }''')
        self.assertTrue(result['hadEffects'], result)
        self.assertTrue(result['materialDisposed'], result)
        self.assertEqual(result['remaining'], 0, result)

    def test_shockwave_ring_expands_fades_and_disposes(self):
        self.open_sim()
        result = self.page.evaluate('''() => {
          sim.clearScene();
          const body = sim.spawnBody(0,0,0,0,0,0,40,'planet');
          sim.explode(body.mesh.position, body);
          const wave = sim.shockwaves[0];
          if (!wave.ring) return {hasRing:false};
          const radius = wave.mesh.scale.x;
          const opacity = wave.ring.material.opacity;
          let disposed = false;
          wave.ring.material.addEventListener('dispose', () => disposed = true);
          for(let i=0; i<12; i++) sim.updateEffects();
          const expanded = wave.mesh.scale.x > radius;
          const faded = wave.ring.material.opacity < opacity;
          for(let i=0; i<120; i++) sim.updateEffects();
          return {hasRing:true, expanded, faded, disposed, count:sim.shockwaves.length};
        }''')
        self.assertTrue(result['hasRing'], result)
        self.assertTrue(result['expanded'], result)
        self.assertTrue(result['faded'], result)
        self.assertTrue(result['disposed'], result)
        self.assertEqual(result['count'], 0, result)

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
          const point = target.mesh.position.clone().fromBufferAttribute(positions,index).normalize().multiplyScalar(target.r*.7);
          sim.spawnBody(point.x,point.y,point.z,0,0,0,1,'asteroid');
          sim.handleCollisions();
          const after = [...target.mesh.material.map.image.getContext('2d').getImageData(x,y,1,1).data];
          return {before, after, count: target.impactCount};
        }''')
        self.assertEqual(result['count'], 1)
        self.assertNotEqual(result['before'], result['after'], result)

    def test_live_scene_entries_and_2d(self):
        for scene in ['', '?scene=craters', '?scene=galaxy', '?scene=bh', '?scene=demo', '?scene=shockwave']:
            self.page.goto(self.url + '/cosmic-collision-3d.html' + scene)
            self.page.wait_for_function("Number(document.getElementById('statBodies').textContent) > 0", timeout=60000)
            if scene == '?scene=shockwave':
                self.page.wait_for_function("Number(document.getElementById('statCollisions').textContent) > 0")
                self.page.wait_for_timeout(100)
                self.page.locator('#btnPause').click()
                self.page.screenshot(path=str(ROOT / '.screenshots' / 'shockwave-verified.png'))
                self.page.locator('#btnShockwave').click()
                self.assertEqual(self.page.locator('#btnPause').inner_text(), '⏸ 暂停')
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
