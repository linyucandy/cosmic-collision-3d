import pathlib,subprocess,unittest

class PixelCityModelTests(unittest.TestCase):
    def test_city_simulation(self):
        result=subprocess.run(['node','--test','tests/pixel-city.test.cjs','tests/pixel-city-campaign.test.cjs','tests/pixel-city-aftergame.test.cjs','tests/pixel-city-economy.test.cjs','tests/pixel-city-metropolis.test.cjs'],cwd=pathlib.Path(__file__).resolve().parents[1],capture_output=True,text=True,encoding='utf-8')
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
