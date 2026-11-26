"""Exercise the public command-line receipt paths in disposable workspaces."""
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


class CliDiagnostics(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        self.env = {**os.environ, 'REDOWN_LAB_STATE_DIR': str(self.root / 'private-helper-state')}
        package = Path(__file__).resolve().parents[1]
        self.env['PYTHONPATH'] = os.pathsep.join(filter(None, (str(package), os.environ.get('PYTHONPATH'))))

    def call(self, *args, expected=0):
        result = subprocess.run([sys.executable, '-m', 'redown_live_lab', *args], env=self.env,
                                cwd=self.root, capture_output=True, encoding='utf-8', timeout=15)
        self.assertEqual(result.returncode, expected, result.stderr)
        return json.loads(result.stdout), result.stderr

    def test_diagnostic_report_without_pairing(self):
        report, _ = self.call('doctor', '--diagnostics')
        self.assertEqual(report['session'], 'NOT_REACHED')
        result, _ = self.call('doctor', '--session', '--diagnostics', expected=2)
        self.assertEqual(result['code'], 'EXTENSION_UNAVAILABLE')
        self.assertEqual(result['detail'], {'stage': 'native-endpoint', 'reason': 'NATIVE_ENDPOINT_MISSING'})
        self.assertEqual(result['providerRoundTrip'], 'NOT_TESTED_BY_DIAGNOSTICS')
        self.assertNotIn('private-helper-state', json.dumps(result))

    def test_manifest_and_plan_receipt_collisions_preserve_bytes(self):
        self.call('init')
        (self.root / 'lab-local' / 'input' / 'file.txt').write_bytes(b'test')
        arguments = ('corpus', '--operations', 'round-trip', '--dry-run', '--manifest', 'stable.json')
        good, progress = self.call(*arguments, '--plan-receipt', 'baseline.json')
        self.assertEqual(good['status'], 'READY')
        self.assertIn('Inventory complete: 1 files, 4 bytes hashed', progress)
        target = self.root / 'lab-local' / 'manifests' / 'stable.json'
        before = target.read_bytes()
        result, _ = self.call(*arguments, expected=2)
        self.assertEqual(result['code'], 'MANIFEST_ALREADY_EXISTS')
        self.assertEqual(target.read_bytes(), before)
        receipt = self.root / 'lab-local' / 'runs' / 'baseline.json'
        before = receipt.read_bytes()
        result, _ = self.call('validate', '--manifest', str(target), '--dry-run',
                              '--plan-receipt', receipt.name, expected=2)
        self.assertEqual(result['code'], 'PLAN_RECEIPT_ALREADY_EXISTS')
        self.assertEqual(receipt.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
