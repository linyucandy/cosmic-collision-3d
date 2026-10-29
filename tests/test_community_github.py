import pathlib
import subprocess
import unittest

class GitHubCommunityModelTests(unittest.TestCase):
    def test_publication_and_rating_model(self):
        root=pathlib.Path(__file__).resolve().parents[1]
        result=subprocess.run(['node','--test','tests/community-github.test.cjs'],cwd=root,capture_output=True,text=True,encoding='utf-8')
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
