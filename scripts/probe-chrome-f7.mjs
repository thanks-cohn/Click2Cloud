import assert from 'node:assert/strict';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright-core';

const root=await mkdtemp(join(tmpdir(),'click2cloud-f7-'));
let browser;
try{
 const extension=join(root,'probe');
 await mkdir(extension);
 await writeFile(join(extension,'manifest.json'),JSON.stringify({manifest_version:3,name:'Explorer F7 manifest probe',version:'1.0',
  background:{service_worker:'worker.js'},commands:{'test-f7':{suggested_key:{default:'Ctrl+Shift+F7'},description:'Probe F7'}}}));
 await writeFile(join(extension,'worker.js'),'chrome.commands.onCommand.addListener(()=>{});');
 browser=await chromium.launchPersistentContext(join(root,'profile'),{headless:true,executablePath:process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium',
  args:['--no-sandbox','--enable-unsafe-extension-debugging'],ignoreDefaultArgs:['--disable-extensions']});
 const devtools=await browser.browser().newBrowserCDPSession();
 const installed=await devtools.send('Extensions.loadUnpacked',{path:extension}).catch(error=>{
  assert.match(error.message,/suggested_key|invalid key|Ctrl\+Shift\+F7/i);
  console.log(JSON.stringify({browser:browser.browser().version(),chromeWideF7:'MANIFEST_REJECTED',reason:error.message}));
 });
 if(installed){
  const worker=browser.serviceWorkers().find(worker=>worker.url().includes(installed.id))??await browser.waitForEvent('serviceworker');
  const active=await worker.evaluate(async()=>(await chrome.commands.getAll()).find(command=>command.name==='test-f7')?.shortcut??'');
  console.log(JSON.stringify({browser:browser.browser().version(),chromeWideF7:active==='Ctrl+Shift+F7'?'ACTIVE':'UNASSIGNED',active}));
 }
}finally{await browser?.close();await rm(root,{recursive:true,force:true});}
