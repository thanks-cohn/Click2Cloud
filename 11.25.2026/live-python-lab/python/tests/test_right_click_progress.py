import contextlib
import io
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from redown_live_lab.right_click import fixture


class RightClickProgressTests(unittest.TestCase):
    def test_deadline_preserves_completed_case_and_identifies_interrupted_case(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            scripts = root / 'scripts'
            scripts.mkdir()
            (scripts / 'verify-python-lab.mjs').write_text(
                r"""import {appendFileSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
const manifest=process.argv[3],root=dirname(manifest);
const {case:id,expected}=JSON.parse(readFileSync(manifest,'utf8')).cases[0];
const report=(ordinal,phase,status)=>appendFileSync(join(root,'progress.ndjson'),JSON.stringify({
 ordinal,total:3,case:ordinal,mode:'simple',scenario:'cold',phase,status,elapsedMs:10,caseElapsedMs:3
})+'\n');
report(1,'fixture-initialization','RUNNING');
writeFileSync(join(root,'observations.json'),JSON.stringify({revision:'fixture',cases:[{
 case:id,status:'OBSERVED',actual:{
  isolatedMode:'simple',compiled:true,registrationAcknowledged:true,coldProbeMadeWorkerRequests:false,
  localProofBefore:false,nativeInput:null,sourceAdmitted:true,workerResponsive:true,dispatched:true,
  publicationVerified:true,outsideScopeDenied:true,publicationRequests:1,deployments:1,
  objectCount:1,verified:true,key:expected.key,sha256:expected.sha256,manualIntervention:false
 }
}]}));
report(1,'case-complete','OBSERVED');
report(2,'readiness-probe','RUNNING');
setInterval(()=>{},1000);
""", encoding='utf-8')
            messages = io.StringIO()
            with contextlib.redirect_stderr(messages):
                result = fixture(271127, 3, None, repository=root, timeout_seconds=2)
            self.assertEqual(result['status'], 'FAIL')
            self.assertEqual(result['stopCode'], 'FIXTURE_CAMPAIGN_TIMEOUT')
            self.assertEqual(result['counts'], {'PASS': 1, 'FAIL': 1, 'NOT_TESTED': 1})
            receipt = json.loads((Path(result['receipt']) / 'summary.json').read_text(encoding='utf-8'))
            self.assertEqual(receipt['cases'][1]['phase'], 'readiness-probe')
            self.assertIn('[1/3] case 1', messages.getvalue())
            self.assertIn('[2/3] case 2 simple cold | readiness-probe', messages.getvalue())
