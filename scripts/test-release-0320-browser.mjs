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
    globalThis.chrome={runtime:{id:'release-fixture',onMessage:{addListener:fn=>messages.add(fn)},sendMessage:async message=>{
      if(message.method==='getPublicUrls'&&window.fixturePublicDomains){
        const {objectUrls}=await import('/src/explorer/object-exports.mjs');
        const {source,key}=message.params,domains=window.fixturePublicDomains;
        const managedDomain=domains.find(domain=>domain.endsWith('.r2.dev'))??null;
        return {state:'completed',data:{domains,domainCheckComplete:true,managedDomain,
          managedPublicAccess:managedDomain?'enabled':'disabled',...(key?{file:objectUrls(source,key,domains)}:{})}};
      }
      if(message.method==='enableBucketPublicAccess'){
        const {objectUrls}=await import('/src/explorer/object-exports.mjs');
        const {source,key,confirmed}=message.params;
        if(!confirmed||source.bucketName!=='fixture-bucket')return {state:'blocked',code:'PERMISSION_DENIED'};
        window.fixtureDomainWrites=(window.fixtureDomainWrites??0)+1;
        if(window.fixtureHoldActivation)await new Promise(resolve=>{window.fixtureReleaseActivation=()=>{delete window.fixtureReleaseActivation;resolve();};});
        const managedDomain='pub-provider-fixture.r2.dev';
        window.fixturePublicDomains=[managedDomain];
        return {state:'completed',data:{domains:[managedDomain],domainCheckComplete:true,managedDomain,
          managedPublicAccess:'enabled',file:objectUrls(source,key,[managedDomain])}};
      }
      if(message.method==='listDirectoryObjects'&&message.params.immediate&&window.fixtureDirectoryLinks)
        return {state:'completed',data:{entries:window.fixtureDirectoryLinks.map(key=>({key})),nextCursor:null}};
      return (await host).invoke({version:message.version,method:message.method,params:message.params});
    }},
      storage:{local:storage,onChanged:{addListener:fn=>events.add(fn)}}};
  },{png});
  const origin='http://127.0.0.1:'+server.address().port;
  await page.goto(origin+'/extension/app.html?fixtureImages=1&fixtureRelease0320=1');
  await page.getByRole('heading',{name:'The Future Is Now. True Remote Is Here.'}).waitFor();
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
  assert(await page.locator('#filename-search').isHidden());
  assert.equal(await page.locator('#toolbar-splitter').getAttribute('aria-valuenow'),'1');
  await page.locator('#toolbar-splitter').press('ArrowDown');
  await page.waitForFunction(()=>document.querySelector('#toolbar-splitter').getAttribute('aria-valuenow')==='2');
  await page.locator('#files').focus();
  await page.keyboard.press('Control+Shift+F7');
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
  const card=page.locator('main .page > section.card').filter({has:page.getByRole('heading',{name:'Keyboard Shortcuts'})});
  await card.getByRole('heading',{name:'Keyboard Shortcuts'}).waitFor();
  await card.getByRole('button',{name:'Change shortcut for Focus filename Search'}).click();
  const capture=card.getByRole('textbox',{name:/Press your new shortcut/});
  await capture.press('Control+Shift+F9');
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

  const pane=page.locator('#pane-splitter'),manage=page.locator('#manage'),signOut=page.locator('#manage + #sign-out');
  const split=async value=>page.waitForFunction(expected=>document.querySelector('#pane-splitter').getAttribute('aria-valuenow')===expected,String(value));
  for(const [mode,cycle] of [['alternate',[0,50,100,50]],['left',[0,50]],['right',[100,50]]]){
    await openSettings();await page.locator('#divider-cycle').selectOption(mode);
    await page.getByRole('button',{name:'File Explorer',exact:true}).click();
    await pane.dblclick();await split(50);
    await pane.press('ArrowLeft');await split(48);
    await pane.press('Control+Shift+F9');await split(50);
    for(let press=0;press<12;press++){
      await pane.press('Control+Shift+F9');await split(cycle[press%cycle.length]);
      const manageBox=await manage.boundingBox(),signBox=await signOut.boundingBox();
      assert(manageBox&&signBox&&signBox.x>=manageBox.x+manageBox.width);
    }
  }
  await page.reload();await openSettings();
  assert.equal(await page.locator('#divider-cycle').inputValue(),'right');
  await page.locator('#divider-cycle').selectOption('alternate');
  gates.push('F9 cycles 12 times in each mode across the true extremes, recovers from a manual adjustment, and persists the mode');

  await page.setViewportSize({width:1050,height:800});
  await page.getByRole('button',{name:'File Explorer',exact:true}).click();
  await page.locator('#files [data-index]').filter({hasText:'test.png'}).first().press('Enter');
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
    await page.getByText('Allow Public URL?',{exact:true}).waitFor();
    await page.getByRole('button',{name:'No',exact:true}).click();
  }
  gates.push('Files and folders use the same first-time public URL gate');
  await page.evaluate(()=>{window.fixturePublicDomains=[];});
  const reopenFileUrl=async()=>{
    await page.getByRole('row').filter({hasText:'renamed.png'}).click({button:'right'});
    await page.getByRole('menuitem',{name:'Get URL',exact:true}).click();
  };
  await reopenFileUrl();
  const urlDialog=page.getByRole('dialog');
  const customInput=urlDialog.getByRole('textbox',{name:'Custom domain'});
  await urlDialog.getByRole('button',{name:'Yes',exact:true}).waitFor();
  await urlDialog.getByRole('button',{name:'Recheck',exact:true}).click();
  await urlDialog.getByText('No public domain configured.').waitFor();
  assert.equal(await page.evaluate(()=>window.fixtureDomainWrites??0),0);
  await customInput.fill('assets.example.org');
  await page.evaluate(()=>{window.fixtureHoldActivation=true;});
  await urlDialog.getByRole('button',{name:'Yes',exact:true}).click();
  await urlDialog.getByText('Enabling public URL…').waitFor();
  assert(await urlDialog.locator('#public-url-yes').isDisabled());
  await page.waitForFunction(()=>typeof window.fixtureReleaseActivation==='function');
  await page.evaluate(()=>{document.querySelector('#public-url-yes').click();window.fixtureReleaseActivation();});
  const fixtureUrl='https://pub-provider-fixture.r2.dev/renamed.png';
  const inlineUrl=urlDialog.locator('#public-urls').getByText(fixtureUrl,{exact:true});
  await inlineUrl.waitFor();
  assert((await inlineUrl.boundingBox()).y>(await customInput.boundingBox()).y);
  assert.equal(await customInput.inputValue(),'assets.example.org');
  assert.equal(await urlDialog.getByRole('link',{name:/Open Development URL/}).getAttribute('href'),fixtureUrl);
  assert.equal(await page.evaluate(()=>window.fixtureDomainWrites),1);
  await urlDialog.getByRole('button',{name:'Close',exact:true}).click();
  await reopenFileUrl();
  await urlDialog.getByText('https://pub-provider-fixture.r2.dev/renamed.png',{exact:true}).waitFor();
  assert(await urlDialog.getByRole('button',{name:'Yes',exact:true}).isHidden());
  assert.equal(await page.evaluate(()=>window.fixtureDomainWrites),1);
  await urlDialog.getByRole('button',{name:'Close',exact:true}).click();
  await page.evaluate(()=>{window.fixturePublicDomains=[];});
  await reopenFileUrl();
  await urlDialog.getByRole('button',{name:'Yes',exact:true}).click();
  await urlDialog.getByText('Enabling public URL…').waitFor();
  await page.waitForFunction(()=>typeof window.fixtureReleaseActivation==='function');
  await urlDialog.getByRole('button',{name:'Close',exact:true}).click();
  await page.evaluate(()=>{window.fixturePublicDomains=['assets.example'];});
  await page.getByRole('row').filter({hasText:'notes.txt'}).click({button:'right'});
  await page.getByRole('menuitem',{name:'Get URL',exact:true}).click();
  // Use a different verified file for the next view while the old activation resolves.
  await urlDialog.getByText('notes.txt',{exact:true}).waitFor();
  await page.evaluate(()=>window.fixtureReleaseActivation());
  await urlDialog.getByText('notes.txt',{exact:true}).waitFor();
  assert.equal(await urlDialog.getByText(fixtureUrl,{exact:true}).count(),0);
  await urlDialog.getByRole('button',{name:'Close',exact:true}).click();
  gates.push('Get URL activates only after Yes and refreshes the same dialog without another prompt');
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
  await page.getByRole('button',{name:'File Explorer',exact:true}).click();
  await page.evaluate(()=>{
    window.fixturePublicDomains=['assets.example','pub-verified.r2.dev'];
    window.fixtureDirectoryLinks=['projects/2026.png','projects/report.cbz','projects/奇妙.pdf','projects/nested/skip.jpg','projects/'];
  });
  await page.context().grantPermissions(['clipboard-read','clipboard-write'],{origin});
  await page.getByRole('row').filter({hasText:'renamed.png'}).click({button:'right'});
  await page.getByRole('menuitem',{name:'Get URL',exact:true}).click();
  const getUrl=page.getByRole('dialog');
  await getUrl.getByRole('button',{name:/Development URL https/}).waitFor();
  assert.deepEqual(await getUrl.locator('.url-domain-row').evaluate(row=>[...row.children].map(el=>el.tagName==='INPUT'?'input':el.textContent)),['input','Check existing domain','Copy All']);
  await getUrl.getByRole('button',{name:'Copy All'}).click();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'https://assets.example/renamed.png\nhttps://pub-verified.r2.dev/renamed.png');
  await getUrl.getByRole('button',{name:/Development URL https/}).press('Space');
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'https://pub-verified.r2.dev/renamed.png');
  await getUrl.getByRole('button',{name:'Close',exact:true}).click();
  await folder.click({button:'right'});
  await page.getByRole('menuitem',{name:'Get URL',exact:true}).click();
  const exportUrl=async()=>{
    const [download]=await Promise.all([page.waitForEvent('download'),getUrl.getByRole('button',{name:'Export',exact:true}).click()]);
    return await readFile(await download.path(),'utf8');
  };
  const simple=(await exportUrl()).trimEnd().split('\n');
  assert.equal(simple.length,3);assert(simple.every(url=>url.startsWith('https://assets.example/projects/')));
  assert(simple.some(url=>url.endsWith('%E5%A5%87%E5%A6%99.pdf')));
  await getUrl.getByRole('radio',{name:'Get All URLs for Directory'}).check();
  assert.deepEqual(JSON.parse(await exportUrl()).counts,{files:3,urls:6,multiUrlFiles:3});
  await getUrl.getByRole('radio',{name:'One Link per Asset — Simple Text File'}).check();
  await getUrl.getByRole('checkbox',{name:'All files'}).uncheck();
  assert(await getUrl.getByRole('button',{name:'Export',exact:true}).isDisabled());
  await getUrl.getByRole('checkbox',{name:'Images'}).check();
  await page.evaluate(()=>window.fixturePublicDomains=['pub-verified.r2.dev']);
  await getUrl.getByRole('button',{name:'Export',exact:true}).click();
  await getUrl.getByText('Only developmental URLs exist. Add domain?').waitFor();
  await getUrl.getByRole('checkbox',{name:'Use non-developmental URLs where possible'}).uncheck();
  assert.equal((await exportUrl()).trim(),'https://pub-verified.r2.dev/projects/2026.png');
  await getUrl.getByRole('button',{name:'Close',exact:true}).click();
  gates.push('Get URL copies verified development cards and exports three immediate files as three or six links');
  gates.push('Folder download delivers a ZIP, and Debug Downloads shows only its receipt filename');
  assert.deepEqual(pageErrors,[]);
  console.log(JSON.stringify({passed:gates.length,gates},null,2));
}finally{
  await browser?.close();await new Promise(resolve=>server.close(resolve));
}
