"""Source binding, frozen-byte verification and Windows sharing regressions."""
import errno
import hashlib
import importlib
import json
import os
import subprocess
import sys
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from redown_live_lab.errors import LabError
from redown_live_lab.fixtures import ASSET_SIZES, generate
from redown_live_lab.runner import source_chunks

source = importlib.import_module('redown_live_lab.inventory')
LIMITS = dict(max_files=5, max_file_bytes=65536, max_total_bytes=262144, max_entries=24, seconds=10)


class SourceInventory(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.file = self.root / 'source.txt'
        self.file.write_bytes(b'initial')

    def failure(self, code, stage, reason, attributes, call):
        with self.assertRaises(LabError) as caught:
            call()
        self.assertEqual(caught.exception.code, code)
        detail = caught.exception.detail
        self.assertEqual((detail['stage'], detail['reason'], detail['attributes']),
                         (stage, reason, attributes))
        self.assertNotIn(str(self.root), json.dumps(detail))
        return detail

    def test_owner_ctime_mismatch_with_same_file_id_size_and_mtime(self):
        path_stat = self.file.lstat()
        fd_stat = SimpleNamespace(**{
            key: getattr(path_stat, key) for key in ('st_dev', 'st_ino', 'st_size', 'st_mtime_ns', 'st_mode')
        }, st_ctime_ns=1795660635024773200)
        observed_path = SimpleNamespace(**vars(fd_stat))
        observed_path.st_ctime_ns = 1795570665323396800
        windows = SimpleNamespace(
            open_fd=lambda path: os.open(path, os.O_RDONLY | getattr(os, 'O_BINARY', 0)),
            change_time=lambda fd: 123456)
        with patch.object(source, 'windows_source', windows), patch.object(source.os, 'fstat', return_value=fd_stat):
            self.assertEqual(b''.join(source.chunks(self.file, 7, before=observed_path)), b'initial')
        with patch.object(source, 'windows_source', None):
            self.failure('SOURCE_CHANGED', 'open', 'METADATA_MISMATCH', ['st_ctime_ns'],
                         lambda: source.check_binding(observed_path, fd_stat, 'open'))

    def test_windows_same_handle_change_time_is_checked(self):
        windows = SimpleNamespace(
            open_fd=lambda path: os.open(path, os.O_RDONLY | getattr(os, 'O_BINARY', 0)),
            change_time=lambda fd: next(times))
        times = iter((100, 101))
        with patch.object(source, 'windows_source', windows):
            self.failure('SOURCE_CHANGED', 'after-read', 'METADATA_MISMATCH', ['ChangeTime'],
                         lambda: list(source.chunks(self.file, 7)))

    def test_mismatched_binding_attributes_and_missing_file_id(self):
        path_stat = self.file.lstat()
        for field in (*source.FILE_ID, *source.FILE_METADATA):
            with self.subTest(field=field):
                opened = SimpleNamespace(**{
                    key: getattr(path_stat, key) for key in
                    (*source.FILE_ID, *source.FILE_METADATA, 'st_ctime_ns', 'st_mode')
                })
                setattr(opened, field, getattr(opened, field) + 1)
                reason = 'IDENTITY_MISMATCH' if field in source.FILE_ID else 'METADATA_MISMATCH'
                self.failure('SOURCE_CHANGED', 'open', reason, [field],
                             lambda: source.check_binding(path_stat, opened, 'open'))
        opened.st_ino = 0
        self.failure('SOURCE_IDENTITY_UNAVAILABLE', 'open', 'FILE_ID_UNAVAILABLE', ['st_ino'],
                     lambda: source.check_binding(path_stat, opened, 'open'))

    def test_unreadable_open_reports_only_bounded_metadata(self):
        problem = PermissionError(errno.EACCES, 'local exception', str(self.file))
        adapter = SimpleNamespace(open_fd=lambda path: None)
        with patch.object(source, 'windows_source', adapter), patch.object(adapter, 'open_fd', side_effect=problem):
            detail = self.failure('LOCAL_FILE_UNREADABLE', 'open', 'READ_OR_INSPECTION_FAILED', [],
                                  lambda: list(source.chunks(self.file, 7)))
        self.assertEqual(detail['errno'], errno.EACCES)
        self.assertNotIn('local exception', json.dumps(detail))

    def test_stable_png_jpeg_text_zip_zero_and_unicode_in_separate_processes(self):
        self.file.unlink()
        (self.root / 'nested' / 'empty-dir').mkdir(parents=True)
        files = {
            'sample.png': generate('png', 512, 1, 'png'),
            'nested/sample.jpg': generate('jpg', ASSET_SIZES['jpg'], 1, 'jpg'),
            'nested/旅行.txt': b'stable text\r\n',
            'nested/bundle.zip': generate('zip', 2048, 1, 'zip'),
            'zero': b''
        }
        for name, contents in files.items():
            (self.root / name).write_bytes(contents)
        program = ('import json, sys; from redown_live_lab.inventory import inventory; '
                   'print(json.dumps(inventory(sys.argv[1], **json.loads(sys.argv[2]))))')
        call = [sys.executable, '-c', program, str(self.root), json.dumps(LIMITS)]
        first = json.loads(subprocess.check_output(call, timeout=15))
        self.assertEqual(first, json.loads(subprocess.check_output(call, timeout=15)))
        rows, empty = first
        self.assertEqual(empty, ['nested/empty-dir'])
        self.assertEqual({row['path']: (row['sizeBytes'], row['sha256']) for row in rows},
                         {name: (len(data), hashlib.sha256(data).hexdigest()) for name, data in files.items()})
        for row in rows:
            self.assertEqual(b''.join(source_chunks(row, 1, self.root, lambda: None)), files[row['path']])

    def test_same_size_edit_with_restored_mtime_fails_frozen_staging_and_validation(self):
        row = source.inventory(self.root, **LIMITS)[0][0]
        metadata = self.file.stat()
        self.file.write_bytes(b'changed')
        os.utime(self.file, ns=(metadata.st_atime_ns, metadata.st_mtime_ns))
        self.failure('SOURCE_CHANGED', 'local-staging', 'DIGEST_MISMATCH', ['sha256'],
                     lambda: list(source_chunks(row, 1, self.root, lambda: None)))
        from redown_live_lab.manifest import resolve
        self.failure('SOURCE_CHANGED', 'manifest-validation', 'DIGEST_MISMATCH', ['sha256'],
                     lambda: resolve({'fixtures': [row], 'seed': 1}, source=self.root, prefix_length=60))

    def test_replaced_path_before_open_fails_identity_binding(self):
        metadata = self.file.lstat()
        replacement = self.root / 'replacement.txt'
        replacement.write_bytes(b'initial')
        os.utime(replacement, ns=(metadata.st_atime_ns, metadata.st_mtime_ns))
        replacement.replace(self.file)
        observed = self.file.lstat()
        attributes = ['st_ino']
        if os.name != 'nt' and metadata.st_ctime_ns != observed.st_ctime_ns:
            attributes.append('st_ctime_ns')
        self.failure('SOURCE_CHANGED', 'open', 'IDENTITY_MISMATCH', attributes,
                     lambda: list(source.chunks(self.file, 7, before=metadata)))

    @unittest.skipIf(os.name == 'nt', 'Windows rejects writers and renames while the read handle is open')
    def test_concurrent_truncation_growth_and_rename(self):
        for kind, stage, reason, fields in (
            ('truncate', 'read', 'TRUNCATED_READ', ['st_size']),
            ('grow', 'after-read', 'EXTRA_BYTES', ['st_size']),
            ('rename', 'after-read', 'METADATA_MISMATCH', ['st_ctime_ns']),
        ):
            with self.subTest(kind=kind):
                self.file.write_bytes(b'initial')
                with patch.object(source, 'CHUNK_BYTES', 2):
                    stream = source.chunks(self.file, 7)
                    self.assertEqual(next(stream), b'in')
                    if kind == 'truncate':
                        self.file.write_bytes(b'i')
                    elif kind == 'grow':
                        with self.file.open('ab') as writer:
                            writer.write(b'extra')
                    else:
                        self.file.rename(self.root / 'renamed.txt')
                    with self.assertRaises(LabError) as caught:
                        list(stream)
                    self.assertEqual(caught.exception.code, 'SOURCE_CHANGED')
                    detail = caught.exception.detail
                    if kind == 'rename' and detail['reason'] == 'PATH_DISAPPEARED':
                        self.assertEqual(detail['stage'], 'after-read-path')
                    else:
                        self.assertEqual((detail['stage'], detail['reason'], detail['attributes']),
                                         (stage, reason, fields))

    @unittest.skipUnless(os.name == 'nt', 'requires real Windows sharing')
    def test_windows_concurrent_mutation_and_open_writer(self):
        replacement = self.root / 'replacement'
        replacement.write_bytes(b'initial')
        for mode in ('r+b', 'wb', 'ab'):
            with self.subTest(mode=mode):
                with closing(source.chunks(self.file, 7)) as stream:
                    self.assertEqual(next(stream), b'initial')
                    with self.assertRaises(PermissionError):
                        self.file.open(mode).close()
                    with self.assertRaises(PermissionError):
                        self.file.rename(self.root / 'renamed')
                    with self.assertRaises(PermissionError):
                        replacement.replace(self.file)
                    self.assertEqual(list(stream), [])
        with self.file.open('r+b'):
            detail = self.failure('LOCAL_FILE_UNREADABLE', 'open', 'READ_OR_INSPECTION_FAILED', [],
                                  lambda: list(source.chunks(self.file, 7)))
        self.assertEqual(detail['winerror'], 32)

    def test_symlink_fails_closed(self):
        alias = self.root / 'alias.txt'
        try:
            alias.symlink_to(self.file)
        except OSError as error:
            if os.name == 'nt' and error.winerror in (5, 1314):
                self.skipTest('Windows profile does not grant symlink creation')
            raise
        self.failure('LINK_OR_NONREGULAR', 'before-open', 'UNSAFE_FILE',
                     ['st_mode', 'st_file_attributes'], lambda: list(source.chunks(alias, 7)))

    @unittest.skipUnless(os.name == 'nt', 'requires a real Windows junction')
    def test_windows_junction_rejected_as_parent(self):
        folder = self.root / 'folder'
        folder.mkdir()
        (folder / 'data.txt').write_bytes(b'initial')
        alias = self.root / 'junction'
        subprocess.run(['cmd.exe', '/d', '/c', 'mklink', '/J', str(alias), str(folder)],
                       check=True, capture_output=True, timeout=10)
        try:
            with self.assertRaises(LabError) as caught:
                list(source.chunks(alias / 'data.txt', 7))
            self.assertEqual(caught.exception.code, 'UNSAFE_SOURCE_DIRECTORY')
        finally:
            alias.rmdir()


if __name__ == '__main__':
    unittest.main()
