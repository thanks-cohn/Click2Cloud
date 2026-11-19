// Public synthetic QA-shaped configuration only; never reads a Chrome profile.
import {writeFile,mkdir} from 'node:fs/promises';
import {compileMenuSpec as after} from '../src/core/menu-spec.mjs';
import {generateChromePlan} from '../src/chrome/registrar.mjs';
const before=(await import('file:///tmp/c2c-p1-before/src/core/menu-spec.mjs')).compileMenuSpec;
const root=bucketName=>({provider:'cloudflare',connectionId:'cloudflare:fixture',accountId:'fixture',bucketName,prefix:''});
const destinations=['click2cloud-qa','click2cloud-qa-2'].flatMap(bucketName=>['A','B','C'].map(x=>({id:bucketName+'-'+x,target:{...root(bucketName),prefix:'C2C-QA/Narrow/'+x+'/'},label:bucketName.endsWith('-2')?'C2C-QA2/Narrow/'+x:x})));
const input={mode:'composite',generation:1,product:{show:{simple:false,nested:true,depth:false,flat:false}},configs:{nested:{destinations}},inventory:{scopes:['click2cloud-qa','click2cloud-qa-2'].map(bucketName=>({target:root(bucketName),folders:destinations.filter(x=>x.target.bucketName===bucketName).map(x=>x.target.prefix),authorized:true,workerReady:true,complete:true}))}};
const serialize=compile=>{const spec=compile(input),plan=generateChromePlan(spec);return {rows:spec.rows.map(r=>({id:r.id,parentId:r.parentId,label:r.label,role:r.role,target:r.target,enabled:r.enabled,presentationId:r.presentationId,provenance:r.provenance})),nativePlan:plan.rows.map(r=>r.properties)};};
await mkdir('codex/11.14.2026/implementation',{recursive:true});await writeFile('codex/11.14.2026/implementation/native-plan-comparison.json',JSON.stringify({evidenceClass:'GENERATED_NATIVE_PLAN_NOT_INSTALLED_CHROME',before:serialize(before),after:serialize(after)},null,2)+'\n');
