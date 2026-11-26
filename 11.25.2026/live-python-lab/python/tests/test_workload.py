"""Focused workload and local-corpus contracts. No native host or cloud access."""
import copy
import json
import os
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile
import io

from redown_live_lab.errors import LabError
from redown_live_lab.fixtures import ASSET_SIZES, generate
from redown_live_lab.inventory import inventory, relative_path
from redown_live_lab.manifest import build_plan, read_json, validate

PROFILES = Path(__file__).resolve().parents[2] / 'manifests'


class WorkloadContracts(unittest.TestCase):
    def manifest(self, name):
        return read_json(PROFILES / (name + '.json'))

    def assert_code(self, code, method, *args, **kwargs):
        with self.assertRaises(LabError) as caught:
            method(*args, **kwargs)
        self.assertEqual(caught.exception.code, code)

    def test_one_interpreter_all_profiles(self):
        for profile in ('quick', 'everyday', 'comprehensive', 'custom'):
            with self.subTest(profile=profile):
                plan = build_plan(self.manifest(profile))
                self.assertEqual(plan['status'], 'READY')
                self.assertTrue(plan['schedule'])
        endurance = build_plan(self.manifest('endurance'))
        self.assertIn('FAILURE_INJECTION_UNSUPPORTED', {row['code'] for row in endurance['blockers']})
        heavy = build_plan(self.manifest('heavy'))
        self.assertEqual(heavy['status'], 'BLOCKED')
        blockers = {row['code'] for row in heavy['blockers']}
        self.assertTrue({'GENERATOR_SIZE_UNSUPPORTED', 'FILE_SIZE_UNSUPPORTED', 'CONCURRENCY_UNSUPPORTED',
                         'OPERATION_UNSUPPORTED'} <= blockers)
        self.assertEqual(heavy['estimate']['plannedDeletes'], 100)
        self.assertEqual(heavy['estimate']['totalBytes'], 4_000_000_000)

    def test_repeatable_range_and_changed_expected_bytes(self):
        doc = self.manifest('custom')
        first = build_plan(doc)
        self.assertEqual(first, build_plan(copy.deepcopy(doc)))
        doc['seed'] += 1
        second = build_plan(doc)
        self.assertNotEqual(first['manifestDigest'], second['manifestDigest'])
        self.assertEqual([row['scenarioId'] for row in first['schedule']],
                         [row['scenarioId'] for row in second['schedule']])
        self.assertNotEqual(first['inventory'][0]['sha256'], second['inventory'][0]['sha256'])

    def test_duplicate_keys_and_spoofed_fields(self):
        with tempfile.TemporaryDirectory() as directory:
            manifest = Path(directory) / 'input.json'
            manifest.write_text('{"id":"a","id":"b"}')
            self.assert_code('DUPLICATE_JSON_KEY', read_json, manifest)
        doc = self.manifest('quick')
        doc['targets']['qa'] = '../escaped'
        self.assert_code('INVALID_RELATIVE_PATH', validate, doc)
        doc['targets']['qa'] = 'safe'
        doc['fixtures'][1]['id'] = doc['fixtures'][0]['id']
        self.assert_code('DUPLICATE_ID', validate, doc)
        doc['fixtures'][1]['id'] = 'blank'
        doc['credentials'] = 'not an allowed manifest field'
        self.assert_code('INVALID_MANIFEST_FIELDS', validate, doc)

    def test_budget_rejection_and_phase_dependencies(self):
        doc = self.manifest('quick')
        doc['budget']['providerRequests'] = 1
        plan = build_plan(doc)
        self.assertEqual(plan['status'], 'BLOCKED')
        self.assertIn('providerRequests', {row.get('field') for row in plan['blockers']})
        doc['phases'][0]['dependsOn'] = ['missing']
        self.assert_code('INVALID_PHASE_DEPENDENCY', validate, doc)

    def test_valid_small_media_and_archive_generators(self):
        with ZipFile(io.BytesIO(generate('docx', 4096, 2, 'letter'))) as archive:
            self.assertIn('word/document.xml', archive.namelist())
            self.assertIsNone(archive.testzip())
        with ZipFile(io.BytesIO(generate('cbz', 32768, 2, 'comic'))) as archive:
            self.assertTrue(archive.read('001.png').startswith(b'\x89PNG\r\n\x1a\n'))
        for kind, length in ASSET_SIZES.items():
            self.assertEqual(len(generate(kind, length, 2, 'test')), length)
            self.assert_code('GENERATOR_SIZE_UNSUPPORTED', generate, kind, length + 1, 2, 'test')
        json.loads(generate('json', 256, 5, 'generated'))

    def test_corpus_inventory_link_collision_and_windows_paths(self):
        for identity in ('../safe.txt', 'AUX.txt', 'folder/CON', 'disk:c', 'file.', 'a\\b', 'a//b'):
            self.assert_code('INVALID_RELATIVE_PATH', relative_path, identity)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            (path / 'A').mkdir()
            (path / 'B').mkdir()
            (path / 'B' / 'empty').mkdir()
            (path / 'A' / '旅行.txt').write_bytes(b'')
            (path / 'B' / 'custom.extension').write_bytes(b'unknown')
            limits = dict(max_files=8, max_file_bytes=100, max_total_bytes=250, max_entries=20, seconds=4)
            first, empty = inventory(path, **limits)
            self.assertEqual(empty, ['B/empty'])
            self.assertEqual(first, inventory(path, **limits)[0])
            self.assertEqual([row['format'] for row in first], ['txt', 'unknown'])
            if os.name != 'nt':
                (path / 'A' / '旅行.TXT').write_bytes(b'collision')
                self.assert_code('CORPUS_PATH_COLLISION', inventory, path, **limits)
                (path / 'A' / '旅行.TXT').unlink()
                (path / 'link').symlink_to(path / 'A', target_is_directory=True)
                self.assert_code('LINK_OR_REPARSE_POINT', inventory, path, **limits)


if __name__ == '__main__':
    unittest.main()
