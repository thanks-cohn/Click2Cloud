"""Generate and verify isolated right-click readiness scenarios."""
import hashlib
import json
import os
import random
import subprocess
import sys
from pathlib import Path
from uuid import uuid4

from .errors import LabError
from .evidence import document

MODES = ('simple', 'narrow', 'depth')
INTERNAL_MODE = {'narrow': 'nested'}
CONDITIONS = ('cold', 'registration-race', 'returning', 'compatible-build', 'transient-health',
              'revoked', 'sibling', 'lost-deploy-ack', 'endpoint-missing', 'evicted-setup')
FOCUSED = [(mode, condition) for mode in MODES for condition in ('cold', 'registration-race')]
FOCUSED += [('simple', 'returning'), ('narrow', 'compatible-build'), ('depth', 'transient-health'),
            ('simple', 'revoked'), ('narrow', 'sibling'), ('simple', 'lost-deploy-ack'),
            ('depth', 'endpoint-missing'), ('narrow', 'evicted-setup')]


def scenarios(seed, count):
    pairs = list(FOCUSED)
    rng = random.Random(seed)
    while len(pairs) < count:
        block = [(mode, condition) for mode in MODES for condition in CONDITIONS]
        rng.shuffle(block)
        pairs.extend(block)
    for case, (mode, condition) in enumerate(pairs[:count], 1):
        case_83_regression = seed == 271127 and case == 83
        if case_83_regression:
            mode, condition = 'depth', 'endpoint-missing'
        name = f'{mode}-{case:03d}.txt'
        prefix = 'qa/folder/'
        payload = f'ReDown 2B.1 fixture {seed} {case}\n'
        plan = {
            'case': case, 'mode': INTERNAL_MODE.get(mode, mode), 'scenario': condition,
            'prefix': prefix, 'filename': name, 'payload': payload,
            'expected': {
                'verified': condition != 'revoked',
                'key': prefix + name,
                'sha256': hashlib.sha256(payload.encode('utf-8')).hexdigest(),
                'publicationRequests': 0 if condition == 'revoked' else 2 if condition == 'sibling' else 1,
                'deployments': 0 if condition in ('returning', 'compatible-build', 'revoked', 'transient-health') else 1,
            },
        }
        if case_83_regression:
            plan['capabilityFaults'] = ['post-deploy', 'post-probe']
        yield plan


def _verdict(expected, observed):
    if observed.get('status') != 'OBSERVED':
        return [{'predicate': 'fixture completed', 'expected': True, 'actual': observed.get('code')}]
    actual = observed['actual']
    checks = {
        'isolatedMode': expected['mode'],
        'compiled': True,
        'registrationAcknowledged': True,
        'coldProbeMadeWorkerRequests': False,
        'localProofBefore': expected['scenario'] in ('returning', 'compatible-build', 'revoked', 'transient-health', 'endpoint-missing'),
        'nativeInput': None,
        'sourceAdmitted': True,
        'workerResponsive': expected['expected']['verified'],
        'dispatched': expected['expected']['verified'],
        'publicationVerified': True if expected['expected']['verified'] else None,
        'outsideScopeDenied': True,
        'publicationRequests': expected['expected']['publicationRequests'],
        'deployments': expected['expected']['deployments'],
        'objectCount': expected['expected']['publicationRequests'],
        'verified': expected['expected']['verified'],
        'key': expected['expected']['key'] if expected['expected']['verified'] else None,
        'sha256': expected['expected']['sha256'] if expected['expected']['verified'] else None,
        'manualIntervention': not expected['expected']['verified'],
    }
    if expected['scenario'] in ('transient-health', 'lost-deploy-ack', 'registration-race', 'endpoint-missing', 'evicted-setup'):
        checks['scenarioExercised'] = True
    if 'capabilityFaults' in expected:
        checks.update({
            'accountAuthorized': True,
            'capabilityFaults': expected['capabilityFaults'],
            'peakLocalRuntimes': 1,
            'firstFailedBoundary': 'worker.health',
            'initialHealthCode': 'WORKER_ENDPOINT_MISSING',
            'readinessProbeRequests': 1,
            'originalOperationVerified': True,
        })
    return [{'predicate': name, 'expected': value, 'actual': actual.get(name)}
            for name, value in checks.items() if actual.get(name) != value]


def fixture(seed, count, selected, *, repository):
    repository = Path(repository).resolve()
    runner = repository / 'scripts' / 'verify-python-lab.mjs'
    if not runner.is_file():
        raise LabError('RIGHT_CLICK_FIXTURE_REPOSITORY_REQUIRED')
    if not 1 <= count <= 300 or selected is not None and not 1 <= selected <= 300:
        raise LabError('RIGHT_CLICK_FIXTURE_CASE_LIMIT')
    plans = [case for case in scenarios(seed, max(count, selected or 0))
             if selected is None or case['case'] == selected]
    root = repository / 'lab-local' / 'verification' / f'right-click-{uuid4()}'
    root.mkdir(parents=True, mode=0o700)
    manifest = root / 'scenario-plan.json'
    document(manifest, {'schema': 'redown.right-click-scenarios/1', 'seed': seed, 'cases': plans})
    logs = root / 'fixture.log'
    with logs.open('w', encoding='utf-8') as output:
        completed = subprocess.run(['node', str(runner), '--right-click-fixture', str(manifest)],
                                   cwd=repository, stdout=output, stderr=subprocess.STDOUT,
                                   env={**os.environ, 'REDOWN_LAB_PYTHON': sys.executable}, check=False)
    results_file = root / 'observations.json'
    results = json.loads(results_file.read_text(encoding='utf-8')) if results_file.is_file() else {}
    observed_cases = {case['case']: case for case in results.get('cases', [])}
    cases = []
    for case in plans:
        observed = observed_cases.get(case['case'], {'status': 'NOT_TESTED', 'code': 'FIXTURE_NOT_OBSERVED'})
        differences = _verdict(case, observed)
        status = ('PASS' if not differences else 'NOT_TESTED' if observed['status'] == 'NOT_TESTED' else 'FAIL')
        cases.append({**observed, 'case': case['case'], 'mode': case['mode'], 'scenario': case['scenario'],
                      'status': status, 'differences': differences})
    overall = 'PASS' if completed.returncode == 0 and all(case['status'] == 'PASS' for case in cases) else 'FAIL'
    summary = {'status': overall, 'seed': seed, 'revision': results.get('revision'),
               'sourceDigest': results.get('sourceDigest'), 'workerCodeDigest': results.get('workerCodeDigest'), 'extensionVersion': results.get('extensionVersion'),
               'protocol': results.get('protocol'), 'evidenceLayer': results.get('evidenceLayer'),
               'platform': results.get('platform'), 'nodeVersion': results.get('nodeVersion'),
               'nativeInput': 'NOT_TESTED', 'liveProvider': 'NOT_TESTED', 'counts': {
                   status: sum(case['status'] == status for case in cases)
                   for status in ('PASS', 'FAIL', 'NOT_TESTED')}, 'receipt': str(root)}
    document(root / 'summary.json', {**summary, 'cases': cases})
    return summary
