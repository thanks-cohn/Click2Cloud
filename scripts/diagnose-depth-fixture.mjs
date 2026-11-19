// Run only in a separate review checkout. No browser profile or live cloud writes.
// Six serial isolated runs cover OFF/BASIC/EXPANSIVE twice; two full suites follow.
// Keep every failure, including when a later execution passes.
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const out=`work/depth-fixture-${Date.now()}-${process.pid}`;
await mkdir(out,{recursive:true});
const sourceRevision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const sourceFiles={};
for(const path of ['tests/depth-plan-recovery.test.mjs','tests/fixtures/depth-fetch-diagnostics.mjs','tests/fixtures/depth-observation.mjs','tests/final-focused.mjs']){
 sourceFiles[path]=createHash('sha256').update(await readFile(path)).digest('hex');
}
const tasks=[
 ...Array.from({length:6},(_,i)=>({label:`isolated-${i+1}`,mode:['OFF','BASIC','EXPANSIVE'][i%3],args:['--test','tests/depth-plan-recovery.test.mjs']})),
 {label:'full-1',mode:'OFF',args:['--test','--test-concurrency=1','tests/final-focused.mjs']},
 {label:'full-2',mode:'EXPANSIVE',args:['tests/final-focused.mjs']}
];
const results=[];
console.log(`Depth fixture evidence: ${out}`);
for(const task of tasks){
 const trace=`${out}/${task.label}-trace`,start=performance.now();let output='',spawnFailed=false;
 const child=spawn(process.execPath,task.args,{
  env:{...process.env,C2C_DEPTH_RECORDER_MODE:task.mode,C2C_DEPTH_TRACE_DIR:trace,FORCE_COLOR:'0',NODE_DISABLE_COLORS:'1'},
  stdio:['ignore','pipe','pipe']
 });
 for(const stream of [child.stdout,child.stderr])stream.on('data',bytes=>output+=bytes);
 const exit=await new Promise(resolve=>{
  child.on('error',()=>{spawnFailed=true;resolve(null);});
  child.on('close',resolve);
 });
 await writeFile(`${out}/${task.label}.txt`,output);
 const count=key=>{
  const match=new RegExp('(?:ℹ |# )'+key+' (\\d+)').exec(output);
  return match?Number(match[1]):null;
 };
 let observation=null;
 try{
  const data=JSON.parse(await readFile(`${trace}/depth-plan-recovery.json`,'utf8'));
  observation={traceEvents:data.events.length,requestErrors:data.events.filter(e=>e.stage==='request.error').length,requests:data.events.filter(e=>e.stage==='fixture.request').length,clicks:data.samples.length,completedClicks:data.samples.filter(e=>e.state==='completed').length};
 }catch{ /* Missing trace is explicit, never a successful observation. */ }
 const row={...task,executable:process.execPath,trace,exit,spawnFailed,tests:count('tests'),pass:count('pass'),fail:count('fail'),durationMs:performance.now()-start,observation};
 results.push(row);console.log(JSON.stringify(row));
 await writeFile(`${out}/summary.json`,JSON.stringify({sourceRevision,sourceFiles,node:process.version,os:process.platform,arch:process.arch,jobs:1,results},null,2)+'\n');
}
if(results.some(row=>row.exit!==0||row.spawnFailed||row.tests===null||row.fail!==0||!row.observation))process.exitCode=1;
