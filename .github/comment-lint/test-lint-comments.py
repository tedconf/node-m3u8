import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("lint-comments.py").resolve()


class RatchetTest(unittest.TestCase):
    def test_worktree_against_base(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)

            def git(*args):
                subprocess.run(["git", *args], cwd=root, check=True, capture_output=True)

            def lint():
                result = subprocess.run([sys.executable, SCRIPT, "HEAD"], cwd=root, capture_output=True, text=True)
                self.assertIn(result.returncode, (0, 1), result.stderr)
                self.assertFalse(result.stderr)
                return result.returncode, result.stdout.splitlines()

            git("init", "-q")
            source = root / "sample.ts"
            source.write_text('// old\nexport const url = "https://example.org";\n')
            git("add", ".")
            git("-c", "commit.gpgsign=false", "-c", "user.name=Test", "-c", "user.email=test@example.org",
                "-c", "core.hooksPath=/dev/null", "commit", "-qm", "base")
            pins = root / "action.yml"
            pins.write_text("- uses: actions/checkout@" + "a" * 40 + " # v7.0.1\n")
            self.assertEqual(lint(), (0, []))
            pins.write_text(pins.read_text().replace("v7.0.1", "new prose"))
            self.assertEqual(lint(), (1, ["action.yml:1: new code comment"]))
            pins.unlink()
            git("mv", "sample.ts", "moved.ts")
            source = root / "moved.ts"
            self.assertEqual(lint(), (0, []))
            source.write_text(source.read_text().replace("// old", "// replacement"))
            (root / "tool.py").write_text('#!/usr/bin/env python3\nprint("# string")  # new\n')
            code, output = lint()
            self.assertEqual(code, 1)
            self.assertEqual([line.split(": ")[0] for line in output], ["moved.ts:1", "tool.py:2"])
            source.write_text('// old\n// old\nexport const url = "https://example.org";\n')
            (root / "tool.py").unlink()
            self.assertEqual(lint(), (1, ["moved.ts:2: new code comment"]))
            (root / "notice.js").write_text(
                "/* SPDX-License-Identifier: MIT */\n/* eslint-disable no-console */\n"
                "const sample = `/* sample */`;\n/* new\n   prose */\n"
            )
            source.write_text(source.read_text().replace("// old\n", "", 1))
            self.assertEqual(lint(), (1, ["notice.js:4: new code comment"]))
            (root / "notice.js").unlink()
            source.write_text('export const url = "https://example.org";\n')
            (root / "tool.py").write_text('#!/usr/bin/env python3\nprint("# string")\n')
            self.assertEqual(lint(), (0, []))

            source.write_text('/** @jest-environment node */\n// @ts-strict-ignore\nexport const x = 1;\n')
            self.assertEqual(lint(), (0, []))

if __name__ == "__main__":
    unittest.main()
