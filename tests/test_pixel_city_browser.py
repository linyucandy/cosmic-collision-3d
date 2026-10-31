"""Exercise real city controls, persistence, mobile layout and pointer placement."""
import functools
import http.server
import pathlib
import threading
import unittest
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

class PixelCityBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.url = f'http://127.0.0.1:{cls.server.server_port}/pixel-city.html'
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(channel='chrome', headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.pw.stop(); cls.server.shutdown(); cls.server.server_close()

    def test_build_settle_save_restore_and_restart(self):
        context = self.browser.new_context(viewport={'width':1440, 'height':1000})
        page = context.new_page(); errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        try:
            page.goto(self.url)
            page.wait_for_selector('#tool-house')
            self.assertEqual(page.locator('#toolGrid button').count(), 44)
            page.locator('#cityMap').focus(); page.keyboard.press('Enter')
            self.assertEqual(page.locator('#moneyValue').inner_text(), '840')
            page.locator('#nextMonthButton').click()
            page.wait_for_function("document.querySelector('#monthValue').textContent.includes('2 月')")
            money = page.locator('#moneyValue').inner_text()
            page.wait_for_timeout(400); page.reload(); page.wait_for_selector('#tool-house')
            self.assertEqual(page.locator('#moneyValue').inner_text(), money)
            self.assertIn('2 月', page.locator('#monthValue').inner_text())
            self.assertTrue(page.locator('#grantButton').is_disabled())
            page.locator('#restartButton').click(); page.locator('#cancelRestart').click()
            self.assertEqual(page.locator('#moneyValue').inner_text(), money)
            page.locator('#pauseButton').click()
            page.wait_for_function("document.querySelector('#runStatus').textContent.includes('运营')")
            for _ in range(2): page.locator('#speedButton').click()
            page.wait_for_function("document.querySelector('#monthValue').textContent.includes('3 月')", timeout=7000)
            page.locator('#pauseButton').click()
            page.locator('#restartButton').click(); page.locator('#confirmRestart').click()
            self.assertEqual(page.locator('#moneyValue').inner_text(), '900')
            # Click a real tile, using the documented isometric projection rather than a test hook.
            page.locator('#tool-shop').click()
            point = page.evaluate("""() => {const c=document.querySelector('#cityMap'),r=c.getBoundingClientRect(),w=c.width,h=c.height,z=Math.max(.2,Math.min((w-30)/640,(h-40)/360,1.25));return {x:r.left+(w/2+(14-10)*16*z)*r.width/w,y:r.top+(h/2+(14+10-20)*8*z)*r.height/h};}""")
            page.mouse.click(point['x'], point['y'])
            self.assertEqual(page.locator('#moneyValue').inner_text(), '810')
            pathlib.Path(ROOT/'.screenshots').mkdir(exist_ok=True)
            page.locator('#cityMap').blur(); page.mouse.move(0,0);page.screenshot(path=str(ROOT/'.screenshots/pixel-city-desktop.png'))
            self.assertEqual(errors, [])
        finally: context.close()

    def test_fast_road_drag_fills_the_gap(self):
        context=self.browser.new_context(viewport={'width':1440,'height':1000})
        page=context.new_page()
        try:
            page.goto(self.url);page.wait_for_selector('#tool-road');page.locator('#tool-road').click()
            points=page.evaluate("""() => {const c=document.querySelector('#cityMap'),r=c.getBoundingClientRect(),w=c.width,h=c.height,z=Math.max(.2,Math.min((w-30)/640,(h-40)/360,1.25));return [11,15].map(x=>({x:r.left+(w/2+(x-8)*16*z)*r.width/w,y:r.top+(h/2+(x+8-20)*8*z)*r.height/h}));}""")
            page.mouse.move(points[0]['x'],points[0]['y']);page.mouse.down()
            page.locator('#cityMap').dispatch_event('pointermove',{'pointerId':99,'pointerType':'touch','clientX':points[1]['x'],'clientY':points[1]['y']})
            self.assertEqual(page.locator('#moneyValue').inner_text(),'890','another pointer must not build')
            page.mouse.move(points[1]['x'],points[1]['y'],steps=1);page.mouse.up()
            page.wait_for_timeout(400)
            self.assertEqual(page.evaluate("JSON.parse(localStorage.getItem('chenchen-pixel-city-v1')).tiles.slice(8*PixelCity.SIZE+11,8*PixelCity.SIZE+16).map(t=>t.type)"),['road']*5)
            self.assertEqual(page.locator('#moneyValue').inner_text(),'850')
        finally:context.close()

    def test_mobile_and_unavailable_storage(self):
        context = self.browser.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
        page = context.new_page(); errors=[]
        page.on('pageerror',lambda error: errors.append(str(error)))
        try:
            page.goto(self.url); page.wait_for_selector('#tool-house')
            self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
            page.locator('#cityInfoToggle').click()
            self.assertTrue(page.locator('#cityReport').is_visible())
            page.locator('#cityInfoToggle').click()
            page.locator('#helpButton').click()
            self.assertTrue(page.locator('#helpDialog').is_visible())
            page.locator('[data-close]').last.click()
            page.screenshot(path=str(ROOT/'.screenshots/pixel-city-mobile.png'))
            self.assertEqual(errors, [])
        finally: context.close()
        context=self.browser.new_context()
        context.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new Error('storage blocked')}})")
        page=context.new_page()
        try:
            page.goto(self.url); page.wait_for_selector('#tool-house')
            page.locator('#cityMap').focus();page.keyboard.press('Enter');page.locator('#saveButton').click()
            self.assertIn('保存失败',page.locator('#saveStatus').inner_text())
            self.assertEqual(page.locator('#moneyValue').inner_text(),'840')
        finally:context.close()

    def test_stage_reward_area_unlock_and_v2_save(self):
        context=self.browser.new_context(viewport={'width':1440,'height':1000});page=context.new_page();errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        try:
            page.goto(self.url);page.wait_for_selector('#tool-house')
            page.evaluate("""() => {const s=PixelCity.createCity();s.money=5000;PixelCity.build(s,6,10,'house');PixelCity.build(s,14,10,'shop');s.population=20;localStorage.setItem('chenchen-pixel-city-v1',JSON.stringify(s));}""")
            page.reload();page.wait_for_selector('#completeStage');self.assertTrue(page.locator('#completeStage').is_enabled())
            page.locator('#completeStage').click();self.assertIn('第 2 阶段',page.locator('#goalTitle').inner_text())
            self.assertTrue(page.locator('#tool-apartment').is_enabled())
            self.assertNotIn('undefined',page.locator('#tool-apartment').get_attribute('title'))
            page.locator('#tool-apartment').click()
            point=page.evaluate("""() => {const c=document.querySelector('#cityMap'),r=c.getBoundingClientRect(),w=c.width,h=c.height,z=Math.max(.2,Math.min((w-30)/640,(h-40)/360,1.25));return {x:r.left+(w/2+(6-9)*16*z)*r.width/w,y:r.top+(h/2+(6+9-20)*8*z)*r.height/h};}""")
            page.mouse.click(point['x'],point['y'])
            page.locator('[data-area="north"]').click()
            self.assertIn('已开放',page.locator('.district-card').first.inner_text())
            page.locator('#tool-road').click();box=page.locator('#cityMap').bounding_box();page.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2)
            page.wait_for_timeout(400);saved=page.evaluate("JSON.parse(localStorage.getItem('chenchen-pixel-city-v1'))")
            self.assertEqual(saved['stage'],1);self.assertIn('north',saved['areas']);self.assertEqual(saved['tiles'][5*96+25]['type'],'road');self.assertEqual(saved['tiles'][9*96+6]['type'],'apartment')
            page.reload();self.assertIn('第 2 阶段',page.locator('#goalTitle').inner_text());self.assertEqual(errors,[])
        finally:context.close()

    def test_legacy_save_migrates_without_losing_the_town(self):
        context=self.browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);page=context.new_page();errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        try:
            page.goto(self.url);page.wait_for_selector('#tool-house')
            page.evaluate("""() => {const s=PixelCity.createCity();s.version=1;s.money=1234;s.month=18;s.achievements=['neighbors'];s.tiles=Array.from({length:400},(_,i)=>s.tiles[PixelCity.index(i%20,Math.floor(i/20))]);delete s.stage;delete s.areas;delete s.stableMonths;localStorage.setItem('chenchen-pixel-city-v1',JSON.stringify(s));}""")
            page.reload();page.wait_for_selector('#tool-house');self.assertEqual(page.locator('#moneyValue').inner_text(),'1,234')
            self.assertIn('6 月',page.locator('#monthValue').inner_text());page.locator('#cityInfoToggle').click()
            self.assertTrue(page.locator('#cityReport').is_visible());self.assertIn('第 1 阶段',page.locator('#goalTitle').inner_text())
            self.assertEqual(page.locator('#toolGrid button').count(),44);self.assertGreater(page.locator('#toolGrid').evaluate('(e)=>e.scrollWidth-e.clientWidth'),0)
            self.assertEqual(errors,[])
        finally:context.close()

    def test_completed_city_projects_and_contracts_persist(self):
        context=self.browser.new_context(viewport={'width':1440,'height':1000});page=context.new_page();errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        try:
            page.goto(self.url);page.wait_for_selector('#tool-house')
            page.evaluate("""() => {const s=PixelCity.createCity();s.stage=PixelCity.STAGES.length;s.areas=PixelCity.AREAS.map(a=>a.id);s.money=10000;s.population=500;PixelCity.build(s,6,10,'hospital');delete s.projectDone;delete s.contract;delete s.contractsCompleted;localStorage.setItem('chenchen-pixel-city-v1',JSON.stringify(s));}""")
            page.reload();page.wait_for_selector('#aftergameSection')
            self.assertTrue(page.locator('#aftergameSection').is_visible());self.assertTrue(page.locator('#tool-tower').is_enabled())
            page.locator('[data-project="health"]').click();self.assertIn('已完成',page.locator('[data-project="health"]').inner_text())
            page.locator('[data-contract="budget"]').click();self.assertTrue(page.locator('[data-contract-action="claim"]').is_disabled())
            page.wait_for_timeout(400);page.reload();self.assertIn('已完成',page.locator('[data-project="health"]').inner_text())
            self.assertTrue(page.locator('[data-contract-action="cancel"]').is_visible())
            page.locator('[data-contract-action="cancel"]').click();page.locator('[data-contract="growth"]').click()
            page.wait_for_timeout(400);saved=page.evaluate("JSON.parse(localStorage.getItem('chenchen-pixel-city-v1'))")
            self.assertEqual(saved['projectDone'],['health']);self.assertEqual(saved['contract']['id'],'growth');self.assertEqual(errors,[])
        finally:context.close()

    def test_completed_city_contract_on_mobile(self):
        context=self.browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);page=context.new_page();errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        try:
            page.goto(self.url);page.wait_for_selector('#tool-house')
            page.evaluate("""() => {const s=PixelCity.createCity();s.stage=PixelCity.STAGES.length;s.areas=PixelCity.AREAS.map(a=>a.id);localStorage.setItem('chenchen-pixel-city-v1',JSON.stringify(s));}""")
            page.reload();page.locator('#cityInfoToggle').click()
            self.assertTrue(page.locator('#aftergameSection').is_visible())
            page.locator('[data-contract="services"]').click()
            self.assertTrue(page.locator('[data-contract-action="claim"]').is_disabled())
            self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
            page.wait_for_timeout(400);page.reload();page.locator('#cityInfoToggle').click()
            self.assertTrue(page.locator('[data-contract-action="cancel"]').is_visible());self.assertEqual(errors,[])
        finally:context.close()

    def test_regional_commerce_route_sales_pause_and_reload(self):
        context=self.browser.new_context(viewport={'width':1440,'height':1000});page=context.new_page();errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        try:
            page.goto(self.url);page.wait_for_selector('#tool-house')
            page.evaluate("""() => {const C=PixelCity,s=C.createCity();s.stage=7;s.areas=C.AREAS.map(a=>a.id);s.money=10000;
              for(let x=3;x<=30;x++)if(s.tiles[C.index(x,13)].type==='empty')C.build(s,x,13,'road');C.build(s,14,12,'road');
              for(const [x,y,type] of [[3,12,'vegetable'],[4,12,'warehouse'],[21,12,'warehouse'],[22,12,'mall'],[6,12,'wind'],[7,12,'pump']]){const r=C.build(s,x,y,type);if(!r.ok)throw Error(r.message);}
              localStorage.setItem('chenchen-pixel-city-v1',JSON.stringify(s));}""")
            page.reload();page.locator('#businessButton').click();self.assertTrue(page.locator('#businessDialog').is_visible())
            page.locator('#routeFrom').select_option('center');page.locator('#routeTo').select_option('east');page.locator('#routeGood').select_option('vegetables');page.locator('#routeQuota').fill('4');page.locator('#createRoute').click()
            self.assertEqual(page.locator('.business-route').count(),1);page.locator('#businessNextMonth').click();page.wait_for_timeout(400)
            saved=page.evaluate("JSON.parse(localStorage.getItem('chenchen-pixel-city-v1'))")
            self.assertGreater(saved['economy']['last']['transported'],0);self.assertLessEqual(saved['economy']['last']['transported'],4);self.assertEqual(saved['economy']['routes'][0]['quota'],4);self.assertGreater(saved['economy']['last']['revenue'],0)
            page.locator('#routeOverlay').check();page.locator('[data-action="toggle"]').click();page.locator('#businessNextMonth').click();page.wait_for_timeout(400)
            saved=page.evaluate("JSON.parse(localStorage.getItem('chenchen-pixel-city-v1'))");self.assertEqual(saved['economy']['last']['transported'],0)
            page.screenshot(path=str(ROOT/'.screenshots/pixel-city-commerce-desktop.png'))
            page.reload();page.locator('#businessButton').click();self.assertEqual(page.locator('.business-route').count(),1)
            self.assertIn('手动暂停',page.locator('.business-route').inner_text());self.assertEqual(errors,[])
        finally:context.close()

    def test_farm_building_filter_and_industry_panel_on_mobile(self):
        context=self.browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);page=context.new_page();errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        try:
            page.goto(self.url);page.wait_for_selector('#tool-house')
            page.evaluate("""() => {const s=PixelCity.createCity();s.stage=7;s.areas=PixelCity.AREAS.map(a=>a.id);s.money=10000;localStorage.setItem('chenchen-pixel-city-v1',JSON.stringify(s));}""")
            page.reload();page.locator('#toolCategory').select_option('farm');self.assertEqual(page.locator('#toolGrid button:visible').count(),3)
            page.locator('#tool-field').tap()
            point=page.evaluate("""() => {const c=document.querySelector('#cityMap'),r=c.getBoundingClientRect(),w=c.width,h=c.height,z=Math.max(.2,Math.min((w-30)/640,(h-40)/360,1.25));return {x:r.left+(w/2+(6-10)*16*z)*r.width/w,y:r.top+(h/2+(6+10-20)*8*z)*r.height/h};}""")
            page.touchscreen.tap(point['x'],point['y']);page.locator('#businessButton').tap();page.locator('#businessNextMonth').tap();page.wait_for_timeout(400)
            saved=page.evaluate("JSON.parse(localStorage.getItem('chenchen-pixel-city-v1'))");self.assertEqual(saved['tiles'][10*96+6]['type'],'field');self.assertGreater(saved['economy']['stock']['center']['grain'],0)
            self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
            self.assertLessEqual(page.locator('#businessDialog').evaluate('(e)=>e.scrollWidth-e.clientWidth'),1)
            page.screenshot(path=str(ROOT/'.screenshots/pixel-city-commerce-mobile.png'))
            page.locator('#businessClose').tap();self.assertEqual(errors,[])
        finally:context.close()

    def test_old_v2_city_migrates_then_builds_in_a_new_region(self):
        context=self.browser.new_context(viewport={'width':1440,'height':1000});page=context.new_page();errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        try:
            page.goto(self.url);page.wait_for_selector('#tool-house')
            page.evaluate("""() => {const C=PixelCity,s=C.createCity();s.version=2;s.stage=7;s.money=6543;s.areas=['center','north','east','south','valley'];s.projectDone=['health'];s.tiles=Array.from({length:1024},(_,i)=>s.tiles[C.index(i%32,Math.floor(i/32))]);s.economy.stock=Object.fromEntries(Object.entries(s.economy.stock).filter(([id])=>s.areas.includes(id)));s.economy.stock.center.grain=23;delete s.metroStage;delete s.economy.exportedTotal;delete s.economy.last.exportRevenue;delete s.economy.last.exported;localStorage.setItem('chenchen-pixel-city-v1',JSON.stringify(s));}""")
            page.reload();page.wait_for_selector('#regionAtlasButton');self.assertEqual(page.locator('#moneyValue').inner_text(),'6,543')
            page.locator('#regionAtlasButton').click();self.assertEqual(page.locator('.region-card').count(),13);self.assertIn('9,216',page.locator('#regionSummary').inner_text())
            page.screenshot(path=str(ROOT/'.screenshots/pixel-city-regions-desktop.png'))
            page.locator('[data-region-open="meadow"]').click();self.assertEqual(page.locator('[data-region-open="meadow"]').count(),0)
            page.locator('[data-region-focus="meadow"]').click();page.locator('#tool-road').click()
            box=page.locator('#cityMap').bounding_box();page.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2)
            page.wait_for_timeout(400);saved=page.evaluate("JSON.parse(localStorage.getItem('chenchen-pixel-city-v1'))")
            self.assertEqual(saved['version'],3);self.assertEqual(len(saved['tiles']),9216);self.assertEqual(saved['tiles'][16*96+48]['type'],'road');self.assertEqual(saved['economy']['stock']['center']['grain'],23);self.assertEqual(saved['projectDone'],['health'])
            self.assertIn('meadow',saved['areas']);self.assertEqual(saved['money'],4533)
            page.evaluate("() => {const stats=PixelCity.stats;window.cityStatsCalls=0;PixelCity.stats=(...args)=>{window.cityStatsCalls++;return stats(...args)};}")
            page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2+20,steps=5);page.wait_for_timeout(700)
            self.assertEqual(page.evaluate('window.cityStatsCalls'),0,'idle rendering and pointer hover reuse the city report')
            page.reload();self.assertEqual(page.locator('#moneyValue').inner_text(),'4,533');self.assertEqual(errors,[])
        finally:context.close()

    def test_region_atlas_and_minimap_work_on_mobile(self):
        context=self.browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);page=context.new_page();errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        try:
            page.goto(self.url);page.wait_for_selector('#regionAtlasButton');page.locator('#regionAtlasButton').tap()
            self.assertEqual(page.locator('.region-card').count(),13);self.assertLessEqual(page.locator('#regionDialog').evaluate('(e)=>e.scrollWidth-e.clientWidth'),1)
            page.screenshot(path=str(ROOT/'.screenshots/pixel-city-regions-mobile.png'))
            page.locator('[data-region-focus="frontier"]').tap();self.assertFalse(page.locator('#regionDialog').is_visible())
            mini=page.locator('#regionMinimap').bounding_box();page.touchscreen.tap(mini['x']+mini['width']*10/96,mini['y']+mini['height']*10/96)
            self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth'));self.assertEqual(errors,[])
        finally:context.close()

    def test_citizens_autonomously_build_and_report_in_a_live_council(self):
        context=self.browser.new_context(viewport={'width':1440,'height':1000});page=context.new_page();errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        try:
            page.goto(self.url);page.wait_for_selector('#councilButton');page.locator('#councilButton').click()
            self.assertEqual(page.locator('.council-member').count(),6);page.locator('#councilEnable').click()
            page.wait_for_function("JSON.parse(localStorage.getItem('chenchen-pixel-city-v1'))?.autonomy?.reports.length >= 1",timeout=9000)
            page.locator('#councilRun').click()
            for _ in range(2):page.locator('#councilNextMonth').click()
            page.wait_for_timeout(400);saved=page.evaluate("JSON.parse(localStorage.getItem('chenchen-pixel-city-v1'))")
            self.assertTrue(saved['autonomy']['enabled']);self.assertEqual(len(saved['autonomy']['reports']),3);self.assertEqual(saved['autonomy']['reports'][0]['kind'],'quarter');self.assertGreater(saved['autonomy']['totalSpent'],0)
            page.locator('#councilReportFilter').select_option('quarter');self.assertEqual(page.locator('.council-report').count(),1)
            page.screenshot(path=str(ROOT/'.screenshots/pixel-city-council-desktop.png'))
            page.locator('#councilEnable').click();page.locator('#councilNextMonth').click();page.wait_for_timeout(400)
            paused=page.evaluate("JSON.parse(localStorage.getItem('chenchen-pixel-city-v1'))");self.assertFalse(paused['autonomy']['enabled']);self.assertEqual(paused['autonomy']['totalSpent'],saved['autonomy']['totalSpent']);self.assertEqual(len(paused['autonomy']['reports']),3)
            page.reload();page.locator('#councilButton').click();self.assertEqual(page.locator('#councilFocus').input_value(),'balanced');self.assertEqual(errors,[])
        finally:context.close()

    def test_council_budget_focus_reports_and_resume_on_mobile(self):
        context=self.browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);page=context.new_page();errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        try:
            page.goto(self.url);page.wait_for_selector('#councilButton');page.locator('#councilButton').tap();page.locator('#councilEnable').tap();page.locator('#councilRun').tap()
            page.locator('#councilFocus').select_option('food');page.locator('#councilReserve').fill('350');page.locator('#councilBudget').fill('25');page.locator('#councilSettings button').tap()
            page.screenshot(path=str(ROOT/'.screenshots/pixel-city-council-mobile.png'))
            for _ in range(3):page.locator('#councilNextMonth').tap()
            page.wait_for_timeout(400);saved=page.evaluate("JSON.parse(localStorage.getItem('chenchen-pixel-city-v1'))")
            self.assertEqual(saved['autonomy']['focus'],'food');self.assertEqual(saved['autonomy']['reserve'],350);self.assertEqual(saved['autonomy']['budgetPercent'],25);self.assertEqual(saved['autonomy']['reports'][0]['kind'],'quarter')
            self.assertLessEqual(page.locator('#councilDialog').evaluate('(e)=>e.scrollWidth-e.clientWidth'),1);self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
            page.reload();page.locator('#councilButton').tap();self.assertEqual(page.locator('#councilFocus').input_value(),'food');self.assertEqual(page.locator('#councilReserve').input_value(),'350');self.assertEqual(errors,[])
        finally:context.close()

if __name__ == '__main__': unittest.main()
