import assert from 'node:assert/strict';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {chromium} from 'playwright-core';

const extension=resolve('dist/click2cloud'), out=resolve('work/history-v2/ui');
const profile=await mkdtemp(join(tmpdir(),'redown-queue-ui-'));
const id='ajppphdiamdobknpamcheohmdbdbeoal', url=`chrome-extension://${id}/extension/app.html`;
const report={result:'FAIL',proof:'REAL_UNPACKED_CHROMIUM_DISCONNECTED_WITH_LOCAL_RECEIPT_FIXTURES',checks:[]};
const pass=check=>report.checks.push({check,state:'PASS'});
await mkdir(out,{recursive:true});
let context,page;
const open=async()=>{
  context=await chromium.launchPersistentContext(profile,{
    executablePath:process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium',headless:true,acceptDownloads:true,
    ignoreDefaultArgs:['--disable-extensions'],viewport:{width:900,height:780},
    args:['--no-sandbox','--enable-unsafe-extension-debugging',`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]
  });
  page=await context.newPage();
  page.setDefaultTimeout(10000);
  await page.goto(url);
  return page;
};
const waitForText=(locator,text)=>locator.filter({hasText:text}).waitFor({timeout:8000});
async function more(name){
  await page.getByRole('button',{name:'More',exact:true}).click();
  await page.getByRole('menuitem',{name,exact:true}).click();
}
const mainButtons=()=>page.locator('header nav > button:not([hidden])').allTextContents();
const selectPlacement=(name,value)=>page.locator('section.card').filter({has:page.getByRole('heading',{name:'Customize Navigation',exact:true})})
  .getByLabel(name,{exact:true}).selectOption(value);
try{
  await open();
  report.browser=context.browser().version();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const installed=await context.newPage();await installed.goto('chrome://extensions');
  const card=installed.locator('extensions-item#'+id);await card.waitFor();
  assert.deepEqual(await card.evaluate(node=>[node.data.name,node.data.version]),['REDOWN','0.3.26']);
  pass('chrome-extensions-card-0326');await installed.close();
  const checkDefault=async()=>assert.deepEqual((await mainButtons()).map(text=>text.trim()),['Files','Remotes','Queue']);
  await checkDefault();
  assert.equal(await page.locator('#header-more').textContent(),'⋯');
  const providers=page.locator('.remote-providers section h2, .remote-cloudflare h2');
  assert.deepEqual((await providers.allTextContents()).map(text=>text.trim()),['Google Drive','OneDrive','Dropbox','☁ Cloudflare R2']);
  const placement=await page.locator('.remote-provider').evaluateAll(cards=>cards.map(card=>{
    const rect=card.getBoundingClientRect(),box=selector=>card.querySelector(selector).getBoundingClientRect();
    const login=box('[data-connect]'),go=box('[data-go]'),refresh=box('[data-refresh]');
    return login.x>rect.x+rect.width*.5&&login.right<rect.right&&go.x<rect.x+rect.width*.5&&go.y>login.y&&refresh.x>go.x;
  }));
  assert.deepEqual(placement,[true,true,true]);pass('four-real-provider-cards-and-bottom-left-actions');
  await more('Settings');
  let queue=page.locator('.queue-settings');
  await queue.getByRole('button',{name:'Export Complete History ZIP'}).waitFor();
  assert(await queue.locator('[data-detailed]').isHidden());
  await page.locator('#debug-mode').check();
  for(const theme of ['minimal','standard','frames']){
    await page.locator('#appearance').selectOption(theme);
    await page.waitForFunction(theme=>document.documentElement.dataset.aesthetic===theme,theme);
    assert.equal(await page.locator('#settings-recovery').isVisible(),theme==='standard');
    assert.equal(await page.locator('#settings-whole-cloud').isVisible(),theme==='standard');
    await page.getByRole('button',{name:'More',exact:true}).click();
    assert.equal(await page.getByRole('menuitem',{name:'Downloads',exact:true}).count(),0);
    await page.keyboard.press('Escape');
  }
  pass('theme-visibility-and-downloads-exclusion-with-debug-on');
  for(const [label,id] of [['Files','explorer'],['Remotes','remotes'],['Queue','queue'],['History','history']]){
    for(const place of ['main','more','gone']){
      await selectPlacement(label,place);
      await page.waitForFunction(({id,place})=>{
        const button=document.querySelector('header [data-view="'+id+'"]');
        return !!button&&button.hidden===(place==='gone')&&!!button.closest('#header-menu')===(place==='more');
      },{id,place});
    }
  }
  await selectPlacement('Settings','main');
  await page.waitForFunction(()=>!!document.querySelector('header nav > [data-view=settings]'));
  assert.equal(await page.getByLabel('Settings',{exact:true}).locator('option[value=gone]').count(),0);
  assert(await page.getByRole('button',{name:'More',exact:true}).isVisible());
  await context.close();
  await open();
  page.on('pageerror',error=>errors.push(error.message));
  queue=page.locator('.queue-settings');
  assert.deepEqual((await mainButtons()).map(text=>text.trim()),['Settings']);
  await page.evaluate(()=>chrome.storage.local.set({shelfNavigationPlacementV1:{explorer:'gone',remotes:'gone',queue:'gone',history:'gone',settings:'gone'}}));
  await page.reload();
  await page.waitForFunction(async()=>(await chrome.storage.local.get('shelfNavigationPlacementV1')).shelfNavigationPlacementV1.settings==='more');
  await more('Settings');
  await page.getByRole('button',{name:'Reset to Defaults'}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('header nav > button:not([hidden])')].map(b=>b.textContent.trim()).join('|')==='Files|Remotes|Queue');
  await page.setViewportSize({width:340,height:680});
  await checkDefault();
  await page.getByRole('button',{name:'More',exact:true}).click();
  assert.equal(await page.getByRole('menuitem',{name:'Downloads',exact:true}).count(),0);
  await page.getByRole('menuitem',{name:'Screenshots',exact:true}).click();
  const select=page.getByLabel('Screenshot Shortcut',{exact:false}).first();
  await select.waitFor();
  const bindings=await page.evaluate(()=>chrome.commands.getAll());
  assert.equal(await select.inputValue(),'screenshot.capture.alt-q');
  assert.equal(await select.locator('option[value=""]').textContent(),'None');
  await select.selectOption('');
  assert.equal(await select.inputValue(),'');
  assert.deepEqual(await page.evaluate(()=>chrome.commands.getAll()),bindings);
  pass('three-way-navigation-protected-settings-restart-reset-and-new-rule-default');

  // Write synthetic fixtures through the original durable owner stores. The
  // extension reconciles them through its normal, trusted Shelf message path.
  await page.evaluate(async()=>{
    const {openStore}=await import('/src/basic/lib/store.js');
    const basic=await openStore(indexedDB);
    const time=new Date().toISOString();
    await basic.begin({id:'queue-basic-fixture',provider:'google',state:'RECEIVED',filename:'basic-fixture.txt',
      sourceUrl:'https://example.com/basic',createdAt:time,updatedAt:time,requestHash:'fixture'});
    await basic.finish('queue-basic-fixture',{state:'SAVED',confirmed:true,objectId:'fixture-object',bytes:4});
    basic.close();
    const {createCurrentStore}=await import('/src/persistence/current-store.mjs');
    const store=createCurrentStore();
    const now=Date.now();
    for(let i=0;i<57;i++){
      const id='queue-ui-'+String(i).padStart(2,'0'), key='fixture-'+i+'.txt';
      await store.recordRemoteResult({operationId:id,kind:'save',state:'verified',proofKind:'independent-head-version-size',
        attemptedFilename:key,receipt:{key,size:4,etag:'test-etag-'+i,version:'1',
          destination:{provider:'cloudflare',connectionId:'cloudflare:fixture',accountId:'fixture',bucketName:'fixture',prefix:''}},
        historyContext:{sourceURL:'https://example.net/file?token=not-exported',hostPageURL:'https://example.org/'}
      });
    }
    await store.recordRemoteResult({operationId:'queue-ui-interrupted',kind:'save',state:'pending',attemptedFilename:'interrupt.txt'});
    for(let i=0;i<12;i++)await store.recordRemoteResult({operationId:'queue-ui-failed-'+i,kind:'save',state:'failed',code:'SOURCE_UNAVAILABLE',attemptedFilename:'failed-'+i+'.txt'});
    await store.close();
  });
  await page.getByRole('button',{name:'Queue',exact:true}).click();
  await waitForText(page.locator('[data-history-notice]'),'70 results');
  await waitForText(page.locator('[data-job-counts]'),'Needs attention 13');
  assert.equal(await page.locator('.queue-job').count(),10);
  await page.locator('.queue-job-window').evaluate(node=>node.scrollTop=500);
  await page.waitForFunction(()=>document.querySelectorAll('.queue-job').length===13);
  const first=page.locator('.queue-history-card').first();
  await first.getByRole('button',{name:/^Download /}).waitFor({state:'visible'});
  assert(await first.getByRole('button',{name:/^Download /}).isDisabled());
  assert.equal(await first.locator('details').evaluate(node=>node.open),false);
  await page.getByRole('button',{name:'Last page'}).click();
  await page.waitForFunction(()=>document.querySelector('.queue-pager input').value==='3');
  await page.getByRole('button',{name:'Previous page'}).click();
  await page.waitForFunction(()=>document.querySelector('.queue-pager input').value==='2');
  await page.getByRole('button',{name:'First page'}).click();
  await page.waitForFunction(()=>document.querySelector('.queue-pager input').value==='1');
  await page.getByRole('spinbutton',{name:'Page',exact:true}).fill('3');
  await page.getByRole('spinbutton',{name:'Page',exact:true}).press('Enter');
  await page.waitForFunction(()=>document.querySelectorAll('.queue-history-card').length===20);
  await page.getByRole('searchbox',{name:'Find saved files'}).fill('fixture-21.txt');
  await waitForText(page.locator('[data-history-notice]'),'1 result');
  assert.equal(await page.locator('.queue-history-card').count(),1);
  await page.screenshot({path:join(out,'queue-narrow.png')});
  await page.getByRole('searchbox',{name:'Find saved files'}).fill('basic-fixture.txt');
  await first.getByText('This provider does not expose a file download through REDOWN.',{exact:true}).waitFor();
  assert(await first.getByRole('button',{name:'Download basic-fixture.txt',exact:true}).isDisabled());
  await page.getByRole('searchbox',{name:'Find saved files'}).fill('fixture-21.txt');
  await first.locator('.queue-card-summary strong').filter({hasText:'fixture-21.txt'}).waitFor();
  pass('receipt-reconciliation-interrupted-job-lazy-scroll-indexed-search-and-navigation');
  await more('Settings');
  await queue.locator('[data-preset]').selectOption('compact');
  await waitForText(queue.locator('[data-queue-settings-status]'),'History display preferences saved.');
  await queue.locator('[data-timer]').selectOption('off');
  await queue.getByText('Export Queue History',{exact:true}).waitFor();
  await queue.locator('[data-timer]').selectOption('hide');
  await queue.locator('[data-detailed]').waitFor({state:'hidden'});
  const pending=page.waitForEvent('download');
  await queue.getByRole('button',{name:'Export Complete History ZIP'}).click();
  await (await pending).saveAs(join(out,'queue-settings-history.zip'));
  await waitForText(queue.locator('[role=status]').first(),'Export complete · 70 records.');
  pass('settings-zip-download-while-cleanup-on');
  await page.getByRole('button',{name:'Queue',exact:true}).click();
  await waitForText(page.locator('[data-history-notice]'),'1 result');
  assert(await first.getByRole('button',{name:/^Download /}).isVisible());
  assert.equal(await first.getByText('Details',{exact:true}).count(),0);
  await more('History');
  await page.getByRole('heading',{name:'The Rest is History'}).waitFor();
  assert.deepEqual(errors,[]);
  pass('compact-card-text-download-and-legacy-history-access');
  report.result='PASS';
}catch(error){
  report.error=error.stack;
  process.exitCode=1;
  await page?.screenshot({path:join(out,'failed.png')}).catch(()=>{});
  if(page)await writeFile(join(out,'failed.html'),await page.content()).catch(()=>{});
}finally{
  await context?.close();
  await rm(profile,{recursive:true,force:true});
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
