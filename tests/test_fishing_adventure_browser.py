import json
import unittest
import test_canvas_games as support

class FishingAdventureBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):support.CanvasGameTests.setUpClass()
    @classmethod
    def tearDownClass(cls):support.CanvasGameTests.tearDownClass()
    def setUp(self):
        self.helper=support.CanvasGameTests();self.helper.setUp();self.helper.fish();self.page=self.helper.page
    def tearDown(self):self.helper.tearDown()
    def land(self,count=1):
        for _ in range(count):
            self.page.evaluate("fish.game.mode='bite';fish.game.biteFish=fish.FISH_TYPES[0];fish.startReel();fish.game.reeling.prog=99.9;fish.game.reeling.tension=0")
            self.page.keyboard.down('e');self.page.evaluate('fish.updateFishing(.01)');self.page.keyboard.up('e');self.page.evaluate('fish.updateFishing(3)')
    def test_illustrated_guide_and_sourced_biology_nutrition(self):
        self.page.locator('#openGuide').click()
        self.assertTrue(self.page.evaluate('fish.paused'))
        self.assertEqual(self.page.locator('.fish-card').count(),7)
        self.assertEqual(self.page.locator('.fish-card canvas[role="img"]').count(),7)
        self.page.locator('[data-fish-detail="trout"]').click()
        self.assertIn('19.1',self.page.locator('.fish-detail').inner_text())
        self.assertIn('生物介绍',self.page.locator('.fish-detail').inner_text())
        self.assertTrue(self.page.locator('.source-links a').first.get_attribute('href').startswith('https://'))
        self.page.locator('[data-back]').click();self.page.locator('#closeFishPanel').click()
        self.assertFalse(self.page.evaluate('fish.paused'));self.assertEqual(self.helper.errors,[])
    def test_actual_catches_bag_upgrade_complete_travel_and_restore(self):
        self.land(5);self.page.locator('#openBag').click()
        self.assertIn('背包 5 条',self.page.locator('.fish-card').inner_text())
        self.page.locator('[data-panel-tab="workshop"]').click()
        self.page.locator('[data-upgrade="rod"]').click();self.page.locator('[data-upgrade="boat"]').click()
        self.assertEqual(self.page.evaluate('fish.progress.inventory.crucian'),1)
        self.assertEqual(self.page.evaluate('fish.progress.discovered.crucian'),5)
        self.assertEqual(self.page.evaluate('fish.progress.rod'),1)
        self.page.locator('[data-panel-tab="waters"]').click();self.page.locator('[data-complete]').click()
        gold=self.page.evaluate('fish.progress.gold');self.assertTrue(self.page.locator('[data-complete]').is_disabled())
        self.page.locator('[data-travel="1"]').click();self.assertIn('回旋溪流',self.page.locator('#waterName').inner_text())
        self.page.locator('#closeFishPanel').click();self.page.reload();self.page.wait_for_function('window.fish')
        self.assertEqual(self.page.evaluate('fish.progress.zone'),1);self.assertEqual(self.page.evaluate('fish.progress.gold'),gold)
        self.assertEqual(self.page.evaluate('fish.progress.inventory.crucian'),1)
        self.assertEqual(self.helper.errors,[])
    def test_mobile_panels_manual_pause_and_travel_lock_during_cast(self):
        self.page.set_viewport_size({'width':390,'height':844});self.page.locator('#fishPause').click()
        self.page.locator('#openGuide').click();self.page.locator('#closeFishPanel').click();self.assertTrue(self.page.evaluate('fish.paused'))
        self.page.locator('#fishPause').click();self.page.locator('#fishAction').click()
        self.page.locator('#openWaters').click();self.assertTrue(self.page.locator('[data-travel="1"]').is_disabled())
        self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        self.assertLessEqual(self.page.locator('#fishPanel').bounding_box()['width'],390)
        self.page.locator('[data-panel-tab="guide"]').click();self.page.locator('[data-fish-detail="eel"]').click()
        self.assertIn('并不属于真鳗',self.page.locator('.fish-detail').inner_text())
        self.assertEqual(self.helper.errors,[])
    def test_space_casts_and_hooks_after_closing_guide(self):
        self.page.locator('#openGuide').click();self.page.keyboard.press('Escape')
        self.assertEqual(self.page.evaluate('document.activeElement.id'),'game')
        self.page.keyboard.press('Space');self.assertEqual(self.page.evaluate('fish.game.mode'),'casting')
        self.page.evaluate("fish.game.mode='bite';fish.game.biteFish=fish.FISH_TYPES[0]")
        self.page.keyboard.press('Space');self.assertEqual(self.page.evaluate('fish.game.mode'),'reeling')
        self.assertEqual(self.helper.errors,[])
    def test_storage_failure_is_explicit_and_reset_can_be_cancelled(self):
        self.page.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}})")
        self.page.reload();self.page.wait_for_function('window.fish');self.land()
        self.page.locator('#openBag').click();self.assertIn('保存失败',self.page.locator('#saveStatus').inner_text())
        self.page.locator('#newJourney').click();self.page.locator('#cancelJourneyReset').click()
        self.assertEqual(self.page.evaluate('fish.progress.caught'),1)
        self.page.locator('#newJourney').click();self.page.locator('#confirmJourneyReset').click()
        self.assertEqual(self.page.evaluate('fish.progress.caught'),0)
        self.assertTrue(self.page.locator('.empty-bag').is_visible())
        self.assertEqual(self.helper.errors,[])
    def test_entire_campaign_remains_valid_after_reload(self):
        result=self.page.evaluate('''() => {const P=FishingProgress,s=P.create();let token=0;for(let z=0;z<4;z++){P.travel(s,z);for(let n=0;n<150;n++){const f=P.chooseFish(s,()=>0);P.catchFish(s,f.id,'campaign-'+(++token),()=>.5);P.upgrade(s,'rod');P.upgrade(s,'boat');if(P.complete(s).ok)break;}}localStorage.setItem('chenchen-fishing-adventure-v1',JSON.stringify(s));return s.cleared.every(Boolean);}''')
        self.assertTrue(result);self.page.reload();self.page.wait_for_function('window.fish');self.page.locator('#openWaters').click()
        self.assertTrue(self.page.locator('.campaign-win').is_visible())
        self.assertEqual(self.page.locator('[data-travel]:disabled').count(),1)
        self.assertEqual(self.helper.errors,[])

if __name__=='__main__':unittest.main()
