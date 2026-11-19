import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

const root=fileURLToPath(new URL('../',import.meta.url)).replace(/\/$/,'');
const png=Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==','base64'));
const server=createServer(async(req,res)=>{
  try {
    const path=resolve(root,'.'+new URL(req.url,'http://fixture').pathname);
    if(!path.startsWith(root+'/'))throw Error('Invalid path');
    res.setHeader('Content-Type',{'.mjs':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png'}[extname(path)]??'application/octet-stream');
    res.end(await readFile(path));
  }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
const gates=[];
try{
  browser=await chromium.launch({executablePath:process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:520,height:800}});
  page.setDefaultTimeout(8000);
  const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
  await page.addInitScript(({png})=>{
    const host=import('/tests/product-browser-host.mjs'), events=new Set(), messages=new Set();
    window.fixtureImageData={'test.png':png};
    window.showSaveFilePicker=async({suggestedName})=>{
      const chunks=[];
      return {name:suggestedName,createWritable:async()=>({
        write:async bytes=>chunks.push(bytes),
        close:async()=>{window.fixtureDownload=new Blob(chunks);},
        abort:async()=>{chunks.length=0;}
      }),getFile:async()=>window.fixtureDownload};
    };
    const storage={
      async get(key){const data=JSON.parse(localStorage.getItem('release-prefs')??'{}');return key===null?data:{[key]:data[key]};},
      async set(update){const data=JSON.parse(localStorage.getItem('release-prefs')??'{}');
        localStorage.setItem('release-prefs',JSON.stringify({...data,...update}));
        for(const listener of events)listener(Object.fromEntries(Object.entries(update).map(([key,value])=>[key,{oldValue:data[key],newValue:value}])),'local');
      }
    };
    globalThis.chrome={runtime:{id:'release-fixture',onMessage:{addListener:fn=>messages.add(fn)},sendMessage:async message=>(await host).invoke({version:message.version,method:message.method,params:message.params})},
      storage:{local:storage,onChanged:{addListener:fn=>events.add(fn)}}};
  },{png});
  const origin='http://127.0.0.1:'+server.address().port;
  await page.goto(origin+'/extension/app.html?fixtureImages=1&fixtureRelease0320=1');
  await page.getByRole('heading',{name:'The Future is Now. True Remote is Here.'}).waitFor();
  await page.getByText('Nothing ever gets downloaded to your computer.',{exact:true}).waitFor();
  assert.equal(await page.getByText('☁ Cloudflare',{exact:true}).count(),0);
  await page.waitForFunction(()=>window.productFixture);
  await page.evaluate(png=>{
    const fixture=window.productFixture;
    fixture.r2Objects.set('fixture-bucket:test.png',{bucketName:'fixture-bucket',key:'test.png',folder:false,displayName:'test.png',size:png.length,etag:'fixture-preview'});
    fixture.setReady('fixture-bucket');
  },png);
  await page.getByRole('button',{name:'File Explorer',exact:true}).click();
  await page.getByRole('row').filter({hasText:'test.png'}).waitFor();
  assert.equal(await page.getByText('Cloud connections',{exact:true}).count(),0);
  await page.locator('#files').focus();
  await page.keyboard.press('Control+Shift+F7');
  await page.locator('#filename-search-popout #filename-search:focus').waitFor();
  assert.equal(await page.locator('#filename-search').count(),1);
  await page.keyboard.press('Escape');
  await page.locator('#filename-search-popout').waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>document.activeElement.id),'files');
  await page.keyboard.press('Control+Shift+F8');
  await page.locator('#command-items #filename-search').waitFor();
  assert.equal(await page.locator('#toolbar-splitter').getAttribute('aria-valuenow'),'2');
  gates.push('Search uses one accessible input in the shortcut pop-out and expanded toolbar');
  await page.locator('#toolbar-more').click();
  assert.equal(await page.locator('#toolbar-overflow').getByRole('button',{name:/Toggle one or two toolbar rows|Reset panels to 50\/50/}).count(),0);
  await page.keyboard.press('Escape');

  const openSettings=async()=>{
    await page.locator('#header-more').click();
    await page.getByRole('menuitem',{name:'Settings',exact:true}).click();
  };
  await openSettings();
  const card=page.locator('main .page > section.card').last();
  await card.getByRole('heading',{name:'Keyboard Shortcuts'}).waitFor();
  await card.getByRole('button',{name:'Change shortcut for Focus filename Search'}).click();
  const capture=card.getByRole('textbox',{name:/Press your new shortcut/});
  await capture.press('Control+Shift+F8');
  await card.getByRole('button',{name:'Save',exact:true}).click();
  await card.getByText('This shortcut is already assigned.').waitFor();
  await capture.press('Control+Shift+F4');
  await card.getByRole('button',{name:'Save',exact:true}).click();
  await card.getByText('Shortcut saved.').waitFor();
  await page.getByRole('button',{name:'File Explorer',exact:true}).click();
  await page.locator('#files').focus();
  await page.keyboard.press('Control+Shift+F7');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'files');
  await page.keyboard.press('Control+Shift+F4');
  await page.locator('#filename-search:focus').waitFor();
  await page.reload();
  await openSettings();
  await card.getByText('Ctrl+Shift+F4',{exact:true}).waitFor();
  page.once('dialog',dialog=>dialog.accept());
  await card.getByRole('button',{name:'Restore defaults'}).click();
  await card.getByText('Ctrl+Shift+F7',{exact:true}).waitFor();
  gates.push('Shortcut remapping rejects a collision, activates live, survives reload, and restores defaults');

  await page.setViewportSize({width:1050,height:800});
  await page.getByRole('button',{name:'File Explorer',exact:true}).click();
  await page.getByRole('row').filter({hasText:'test.png'}).dblclick();
  await page.locator('img.preview:not([hidden])').waitFor();
  assert.equal(await page.getByText('Images in this loaded folder').count(),0);
  await page.locator('#dialog-title').dblclick();
  const rename=page.getByRole('textbox',{name:'Image filename'});
  await rename.fill('unused.png');await rename.press('Escape');
  await page.getByRole('heading',{name:'test.png'}).waitFor();
  await page.locator('#dialog-title').dblclick();
  await rename.fill('renamed.png');await rename.press('Enter');
  await page.getByRole('heading',{name:'renamed.png'}).waitFor();
  assert(await page.locator('img.preview:not([hidden])').isVisible());
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('row').filter({hasText:'renamed.png'}).waitFor();
  gates.push('Preview rename uses the inline filename and retains the displayed image');

  const folder=page.getByRole('row',{name:/^projects .*File folder/});
  await folder.click({button:'right'});
  await page.getByRole('menuitem',{name:'Make Default',exact:true}).click();
  await page.getByText('Default set · Chrome menu acknowledged.',{exact:true}).waitFor();
  const saved=await page.evaluate(()=>window.productFixture.current.read());
  assert.equal(saved.product.defaultTarget.prefix,'projects/');
  assert.equal(saved.configs.simple.destinations.filter(row=>row.target.prefix==='projects/').length,1);
  await page.getByRole('button',{name:'Manage Destinations'}).click();
  await page.getByRole('heading',{name:'Show in Chrome'}).waitFor();
  assert.deepEqual(await page.locator('.show-mode-checkboxes label').allTextContents(),[' Simple',' Narrow',' Depth']);
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await folder.click({button:'right'});
  await page.getByRole('menuitem',{name:'+ Right Click',exact:true}).click();
  await page.getByRole('heading',{name:'Show in Chrome'}).waitFor();
  assert.deepEqual(await page.locator('.show-mode-checkboxes label').allTextContents(),[' Simple',' Narrow',' Depth']);
  await page.getByRole('button',{name:'Close',exact:true}).click();
  gates.push('Folder Make Default creates a Simple destination with ACK and both destination dialogs group checkboxes');

  await page.locator('#header-more').click();
  assert.equal(await page.getByRole('menuitem',{name:'Downloads',exact:true}).count(),0);
  await page.getByRole('menuitem',{name:'Settings',exact:true}).click();
  await page.getByText('Show Get URL in right-click menu').click();
  await page.getByRole('button',{name:'File Explorer',exact:true}).click();
  for(const item of [page.getByRole('row').filter({hasText:'renamed.png'}),folder]){
    await item.click({button:'right'});
    await page.getByRole('menuitem',{name:'Get URL',exact:true}).click();
    await page.getByRole('heading',{name:'Allow Public URL?',exact:true}).waitFor();
    await page.getByRole('button',{name:'No',exact:true}).click();
  }
  gates.push('Files and folders use the same first-time public URL gate');
  await page.evaluate(png=>{
    window.fixtureImageData['projects/2026.png']=png;
    const fixture=window.productFixture;
    fixture.r2Objects.set('fixture-bucket:projects/2026.png',{bucketName:'fixture-bucket',key:'projects/2026.png',folder:false,displayName:'2026.png',size:png.length,etag:'fixture-preview'});
  },png);
  await folder.click({button:'right'});
  await page.getByRole('menuitem',{name:'Download',exact:true}).click();
  await page.getByText(/Complete · file size verified · 1 file/).waitFor().catch(async error=>{
    console.error(await page.locator('#dialog').innerText(),pageErrors);
    console.error(await page.evaluate(()=>({last:window.productFixture.lastResponse,calls:window.productFixture.calls.slice(-4)})));
    throw error;
  });
  const evidence=await page.evaluate(async()=>{
    const bytes=new Uint8Array(await window.fixtureDownload.arrayBuffer());
    return {size:bytes.byteLength,zipSignature:new DataView(bytes.buffer).getUint32(0,true),body:new TextDecoder().decode(bytes)};
  });
  assert.equal(evidence.zipSignature,0x04034b50);assert(evidence.size>png.length);
  assert.match(evidence.body,/_click2cloud\/RRReceipt-/);
  await page.getByRole('button',{name:'Close',exact:true}).last().click();
  await openSettings();
  await page.locator('#debug-mode').check();
  await page.locator('#header-more').click();
  await page.getByRole('menuitem',{name:'Downloads',exact:true}).click();
  await page.getByRole('heading',{name:'Downloads',exact:true}).waitFor();
  await page.getByText(/projects · Download · Complete/).waitFor();
  await page.locator('.download-job summary').click();
  await page.getByText(/^RRReceipt-.*\.json$/).waitFor();
  assert.equal(await page.getByText('UNCONFIRMED_AT_RECEIPT_CREATION').count(),0);
  gates.push('Folder download delivers a ZIP, and Debug Downloads shows only its receipt filename');
  assert.deepEqual(pageErrors,[]);
  console.log(JSON.stringify({passed:gates.length,gates},null,2));
}finally{
  await browser?.close();await new Promise(resolve=>server.close(resolve));
}
