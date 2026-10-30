import pathlib,subprocess,unittest
class FishingProgressionTests(unittest.TestCase):
    def test_progression_model(self):
        result=subprocess.run(['node','--test','tests/fishing-progression.test.cjs'],cwd=pathlib.Path(__file__).resolve().parents[1],capture_output=True,text=True,encoding='utf-8')
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
