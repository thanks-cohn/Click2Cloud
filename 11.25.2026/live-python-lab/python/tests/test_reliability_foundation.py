import hashlib
import tempfile
import unittest
import uuid
from pathlib import Path
from types import SimpleNamespace

from redown_live_lab.download_output import DownloadOutput, prepare_output, verify_disk
from redown_live_lab.errors import LabError
from redown_live_lab.evidence import Journal, atomic_document
from redown_live_lab.owner_campaign import (
    check_downloads, freeze_selection, offline_campaign_status, reconcile_disk_downloads, workload_verdict,
)


class ReliabilityFoundation(unittest.TestCase):
    def test_exclusive_publish_reopens_final_content_and_never_overwrites(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = prepare_output(root / 'downloads', 'nested/empty.bin')
            checksum = hashlib.sha256(b'').hexdigest()
            with DownloadOutput(path) as sink:
                self.assertEqual(sink.publish(0, checksum, lambda: None)['diskSha256'], checksum)
            self.assertEqual(path.read_bytes(), b'')
            self.assertFalse(list(root.rglob('.redown-part-*')))
            with self.assertRaisesRegex(LabError, 'DOWNLOAD_DESTINATION_CONFLICT'):
                with DownloadOutput(path.with_name('EMPTY.bin')):
                    pass
            path.write_bytes(b'changed')
            with self.assertRaisesRegex(LabError, 'DOWNLOAD_DISK_IDENTITY_MISMATCH'):
                verify_disk(path, 0, checksum)

    def test_offline_reopen_resolves_lost_ack_without_remote_replay(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            run, window = str(uuid.uuid4()), str(uuid.uuid4())
            caps = dict(scopeId='scope', provider='cloudflare', accountId='account', bucketName='bucket', prefix='read/')
            plan = freeze_selection(root, run, caps, 'a'*64, [
                dict(key='read/nested/a.bin', etag='opaque', size=2, version='v1', staging=False)
            ], SimpleNamespace(expect_files=1, retain_downloads=True))
            row = plan['inventory'][0]
            journal = Journal(root, fields={'windowId': window})
            journal.append('windowStarted', mode='download')
            atomic_document(root / 'checkpoint.json', {'windowId': window})
            checksum = hashlib.sha256(b'OK').hexdigest()
            relative = 'retained-downloads/owner/1/transfer/nested/a.bin'
            path = prepare_output(root / 'retained-downloads', 'owner/1/transfer/nested/a.bin')
            journal.append('downloadPublishRequested', scenarioId=row['scenarioId'], savedCopy=relative,
                           key=row['expectedKey'], size=2, sha256=checksum, etag='opaque', version='v1')
            with DownloadOutput(path) as sink:
                sink.write(b'OK')
                sink.publish(2, checksum, lambda: None)
            self.assertEqual(offline_campaign_status(root, plan)['downloadStates'], {'UNCERTAIN': 1})
            result = check_downloads(root)
            self.assertEqual((result['status'], result['recoveredPublicationFiles']), ('PASS', 1))
            recovery = Journal(root, fields={'windowId': str(uuid.uuid4())})
            self.assertEqual(reconcile_disk_downloads(plan, recovery, True), {row['operationId']: 'PASS'})
            self.assertEqual(sum(event['event'] == 'downloadRecovered' for event in recovery.rows()), 1)
            self.assertEqual(check_downloads(root)['recoveredPublicationFiles'], 0)

    def test_workload_mismatch_separate_from_successful_reads_and_case_collision_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            caps = dict(scopeId='scope', provider='cloudflare', accountId='account', bucketName='bucket', prefix='r/')
            plan = freeze_selection(root, str(uuid.uuid4()), caps, 'b'*64, [
                dict(key=key, etag='tag', size=1, version=None, staging=False)
                for key in ('r/A/one', 'r/a/two', 'r/CON.txt')
            ], SimpleNamespace(expect_files=600, retain_downloads=False))
            self.assertEqual(set(issue['code'] for issue in plan['inventoryIssues']),
                             {'DOWNLOAD_PATH_COLLISION', 'INVALID_RELATIVE_PATH'})
            self.assertEqual(workload_verdict(plan)['code'], 'EXPECTED_FILE_COUNT_MISMATCH')
            self.assertEqual(workload_verdict(plan)['eligibleFiles'], 1)


if __name__ == '__main__':
    unittest.main()
