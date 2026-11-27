import errno
import io
import itertools
import os
from pathlib import Path
import random
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from redown_live_lab import native_host
from redown_live_lab.errors import LabError
from redown_live_lab.evidence import Journal
from redown_live_lab.location_audit import project_audit
from redown_live_lab.owner_campaign import (
    CampaignRetries, download_outcomes, offline_campaign_status, publication_outcomes, reconcile_attempt, run_window,
)
from redown_live_lab.resources import CampaignResources, DISK_RESERVE, MEMORY_RESERVE
from redown_live_lab.runner import operation_id
from redown_live_lab.transport import ExtensionClient

CAMPAIGN = '7997f311-fb23-45f9-878e-9ed02c4d18f6'
WINDOW = 'fixture-window'
SCENARIO = 'owner/1/transfer/0072'
TARGET = {'prefix': 'fixed/path/'}
PATH = 'Root A/旅行/0072 界界.txt'
ROW = {'scenarioId': SCENARIO, 'operationId': operation_id(CAMPAIGN, SCENARIO, 'upload'),
       'path': PATH, 'remotePath': PATH, 'expectedKey': TARGET['prefix'] + PATH,
       'sizeBytes': 997, 'sha256': '3' * 64}
RECEIPT = {'operationId': ROW['operationId'], 'key': ROW['expectedKey'], 'size': 997,
           'etag': 'etag-0072', 'version': 'version-1'}
PLAN = {'campaignId': CAMPAIGN, 'target': TARGET, 'resolvedDigest': '1' * 64,
        'inventory': [ROW], 'inventoryIssues': [], 'expectedSelectionFiles': 1}


class Events:
    def __init__(self):
        self.rows = []

    def append(self, event, **fields):
        self.rows.append({'event': event, **fields})


class Outcomes:
    def __init__(self, answers):
        self.answers = iter(answers)
        self.calls = []

    def query(self, method, **input_fields):
        self.calls.append((method, input_fields))
        answer = next(self.answers)
        if isinstance(answer, str):
            raise LabError(answer)
        return answer


class TransportRepair(unittest.TestCase):
    def test_native_frames_keep_wire_bytes_and_partial_writes(self):
        class Partial(io.BytesIO):
            def write(self, value):
                return super().write(value[:97])

            def read(self, size):
                return super().read(min(size, 113))

        wire = Partial()
        message = {'method': 'uploadAppend', 'input': {'bytesBase64': 'A' * 174764, 'id': PATH}}
        native_host.write_frame(wire, message)
        wire.seek(0)
        self.assertEqual(native_host.read_frame(wire), message)
        self.assertEqual(wire.read(1), b'')

    def test_frame_allocation_failure_does_not_write_header_or_leave_a_pending_relay(self):
        stream = io.BytesIO()
        relay = native_host.Relay(stream)
        with patch.object(native_host.json, 'dumps', side_effect=MemoryError):
            with self.assertRaises(native_host.FrameAllocationError):
                native_host.write_frame(stream, {'input': {'bytesBase64': 'AAAA'}})
            response = relay.request('client', 'uploadAppend', {'bytesBase64': 'AAAA'})
        self.assertEqual(stream.getvalue(), b'')
        self.assertEqual(response['error']['code'], 'LOCAL_MEMORY_EXHAUSTED')
        self.assertEqual(relay.pending, {})

    def test_transport_distinguishes_encode_failure_and_read_failure(self):
        connection = ExtensionClient.__new__(ExtensionClient)
        connection.stream = io.BytesIO()
        connection.socket = None
        module = 'redown_live_lab.transport'
        with patch(module + '.write_frame', side_effect=native_host.FrameAllocationError):
            with self.assertRaises(LabError) as encode:
                connection.query('uploadStart', id=ROW['operationId'])
        self.assertEqual(encode.exception.code, 'LOCAL_MEMORY_EXHAUSTED')
        self.assertEqual(encode.exception.detail['stage'], 'native-encode')
        self.assertIsNotNone(connection.stream)
        with patch(module + '.read_frame', side_effect=MemoryError):
            with self.assertRaises(LabError) as read:
                connection.query('uploadStart', id=ROW['operationId'])
        self.assertEqual(read.exception.detail['stage'], 'native-frame')
        self.assertIsNone(connection.stream)

    def test_resource_thresholds_and_final_sample(self):
        for metric, value in (('freeDiskBytes', DISK_RESERVE - 1),
                              ('availablePhysicalBytes', MEMORY_RESERVE - 1),
                              ('availableCommitBytes', MEMORY_RESERVE - 1)):
            with self.subTest(metric=metric):
                journal = Events()
                resources = CampaignResources(Path('.'), journal)
                sample = {'freeDiskBytes': 2 * DISK_RESERVE, 'availablePhysicalBytes': 2 * MEMORY_RESERVE,
                          'availableCommitBytes': 2 * MEMORY_RESERVE, 'workingSetBytes': 8 * 1024**2, metric: value}
                with patch('redown_live_lab.resources.sample_resources', return_value=sample):
                    with self.assertRaises(LabError) as blocked:
                        resources.observe('preflight')
                    self.assertEqual(blocked.exception.code, 'LOCAL_RESOURCE_HEADROOM_LOW')
                    resources.observe('end', force=True, guard=False)
                self.assertEqual(resources.summary()['minimumObserved'][metric], value)
                self.assertEqual([row['event'] for row in journal.rows],
                                 ['resourceSample', 'resourceRejected', 'resourceSample'])

    def test_memory_exhaustion_and_torn_journal_reconstruct_without_connecting(self):
        for error, expected in ((MemoryError(), 'LOCAL_MEMORY_EXHAUSTED'),
                                (OSError(errno.ENOSPC, 'disk full'), 'LOCAL_DISK_EXHAUSTED')):
            with self.subTest(expected=expected), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)

                def fail(*args):
                    journal = args[-1]
                    journal.append('intent', scenarioId=SCENARIO, operationId=ROW['operationId'])
                    raise error

                with patch('redown_live_lab.owner_campaign.execute_window', side_effect=fail):
                    with self.assertRaises(LabError) as stopped:
                        run_window(None, None, None, root, PLAN, None, 'new', 0)
                self.assertEqual(stopped.exception.code, expected)
                with Journal(root).path.open('ab') as stream:
                    stream.write(b'{"event":"interrupted')
                before = offline_campaign_status(root, PLAN)
                self.assertEqual(before['uploadStates'], {'UNCERTAIN': 1})
                self.assertEqual(before['terminationReason'], expected)
                Journal(root).repair_tail()
                self.assertEqual(offline_campaign_status(root, PLAN), before)
                self.assertEqual(len(list(root.glob('.torn-journal-*'))), 1)

    def test_legacy_combined_location_failure_is_independent_from_matching_keys(self):
        frozen = {**PLAN, 'expectedSelectionFiles': 2}
        outcomes = {ROW['operationId']: {'productionConfirmed': True, 'receipt': RECEIPT}}
        listed = {'event': 'auditPage', 'providerCalls': 1, 'entries': [
            {'key': ROW['expectedKey'], 'size': 997, 'staging': False, 'etag': RECEIPT['etag'],
             'version': RECEIPT['version']}]}
        audit = project_audit(frozen, outcomes, [listed], complete=True)
        self.assertEqual(audit['state'], 'FAIL')
        self.assertEqual(audit['combinedReasonCodes'], ['EXPECTED_FILE_COUNT_MISMATCH'])
        self.assertEqual(audit['locationVerdict']['status'], 'PASS')
        listed['entries'].append({'key': TARGET['prefix'] + '.redown-beta-uploads/bounded/0072.txt',
                                  'size': 997, 'staging': True})
        audit = project_audit(frozen, outcomes, [listed], complete=True)
        self.assertEqual(audit['locationVerdict']['reasonCodes'], ['STAGING_OBJECTS_REMAIN'])
        self.assertEqual(audit['stagingBytes'], 997)

    def test_seeded_reconciliation_and_retry_decisions(self):
        seed = int(os.environ.get('REDOWN_PART2_SEED', '3372'))
        budget = min(8192, int(os.environ.get('REDOWN_PART2_CASES', '1024')))
        replay = os.environ.get('REDOWN_PART2_CASE')
        cases = list(itertools.product(
            ('ack', 'not-committed', 'unknown', 'mismatched-receipt', 'revoked'),
            (0, 1, 2), (0, 1, 2), (1, 2, 3), (True, False), ('TRANSPORT_UNAVAILABLE', 'HTTP_502'),
            (0, 250, 19_000, 21_000), ('UNCERTAIN', 'FAIL'),
        ))
        rng = random.Random(seed)
        rng.shuffle(cases)
        while len(cases) < budget:
            cases += cases[:budget - len(cases)]
        cases = cases[:budget]
        executed = 0
        for index, (outcome, lost, reserve, attempt, has_time, code, hint, state) in enumerate(cases):
            if replay is not None and index != int(replay):
                continue
            with self.subTest(seed=seed, case=index, outcome=outcome, lost=lost, reserve=reserve,
                              attempt=attempt, has_time=has_time, code=code, hint=hint, previous=state):
                answers = {
                    'ack': {'state': 'ACKNOWLEDGED', 'receipt': RECEIPT},
                    'not-committed': {'state': 'NOT_COMMITTED'},
                    'unknown': {'state': 'UNKNOWN'},
                    'mismatched-receipt': {'state': 'ACKNOWLEDGED', 'receipt': {**RECEIPT, 'size': 998}},
                    'revoked': 'AUTHORIZATION_REVOKED',
                }
                client = Outcomes(['TRANSPORT_UNAVAILABLE'] * lost + [answers[outcome]])
                journal = Events()
                journal.append('intent', scenarioId=SCENARIO)
                result = reconcile_attempt(client, ROW, journal, {
                    'state': state, 'code': code, 'errorPhase': 'publication', 'publicationRequested': True,
                    'retryAfterMs': hint,
                }, attempt)
                actual = result.get('reconciliationState')
                expected = ('ACKNOWLEDGED' if outcome == 'ack' else 'NOT_COMMITTED'
                            if outcome == 'not-committed' else 'UNKNOWN') if lost < 2 else 'UNKNOWN'
                self.assertEqual(actual, expected)
                expected_query = ('campaignOutcome', {'id': ROW['operationId'], 'path': PATH, 'size': 997})
                self.assertEqual(client.calls, [expected_query] * min(2, 1 + lost))
                retry = CampaignRetries(SimpleNamespace(run_id=CAMPAIGN), journal, reserve, 20 if has_time else 0)
                with patch('redown_live_lab.owner_campaign.time.monotonic', return_value=0), \
                     patch('redown_live_lab.owner_campaign.random.uniform', return_value=1):
                    scheduled = retry.schedule(ROW, {'operation': 'upload'}, result, attempt, 20,
                                               safe=result.get('precommitRetrySafe', False))
                self.assertEqual(scheduled, expected == 'NOT_COMMITTED' and reserve > 0 and attempt < 3 and
                                 has_time and hint < 19_000)
                projected = publication_outcomes(PLAN, journal.rows)[ROW['operationId']]
                self.assertEqual(projected['state'], {'ACKNOWLEDGED': 'PASS', 'NOT_COMMITTED': 'PENDING',
                                                    'UNKNOWN': 'UNCERTAIN'}[expected])
                if scheduled:
                    self.assertEqual(journal.rows[-1]['operationId'], ROW['operationId'])
            executed += 1
        self.assertGreater(executed, 0, 'Replay index is outside the selected case budget')
        print(f'PART2_REPLAY seed={seed} cases={executed} selection={replay or "all"}')

    def test_download_result_rejects_wrong_local_or_remote_path_even_with_matching_bytes(self):
        relative = 'window-receipts/' + WINDOW + '/downloads/owner/1/transfer/' + PATH
        event = {'event': 'result', 'scenarioId': SCENARIO, 'action': 'download', 'state': 'PASS',
                 'code': 'REMOTE_BYTES_OBSERVED', 'windowId': WINDOW}
        readback = {'key': ROW['expectedKey'], 'clientSha256': ROW['sha256'], 'clientBytes': 997, 'savedCopy': relative}
        self.assertEqual(download_outcomes(PLAN, [{**event, 'readback': readback}])[ROW['operationId']]['state'], 'PASS')
        for change in ({'key': 'unrelated/0072.txt'}, {'savedCopy': relative.replace(WINDOW, 'other-window')},
                       {'savedCopy': relative.replace('Root A', 'Wrong path')}, {'clientBytes': 996}):
            result = download_outcomes(PLAN, [{**event, 'readback': {**readback, **change}}])
            self.assertEqual(result[ROW['operationId']]['state'], 'FAIL')
