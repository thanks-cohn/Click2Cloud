import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp, mkdir, readFile, rm} from 'node:fs/promises';
import {createServer} from 'node:https';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {chromium} from 'playwright-core';

const root = await mkdtemp(join(tmpdir(), 'click2cloud-get-url-'));
const extension = resolve(process.env.C2C_GET_URL_BUILD ?? 'dist/click2cloud');
const evidence = process.env.C2C_GET_URL_EVIDENCE;
if (evidence) await mkdir(evidence, {recursive:true});
const account = 'a'.repeat(32), bucket = 'redown', bucketId = 'b'.repeat(32);
const domain = `pub-${bucketId}.r2.dev`;
const key = 'Nested/café #100%?.png', sibling = 'Nested/sibling.png';
const bucketsPath = `/client/v4/accounts/${account}/r2/buckets`;
const path = `${bucketsPath}/${bucket}`;
const url = `https://${domain}/${key.split('/').map(encodeURIComponent).join('/')}`;
const operations = [];
let enabled = false, custom = [], readbackDelay = 0, failReadback = false, putStatus = 200;
const cert = join(root, 'certificate.pem'), privateKey = join(root, 'key.pem');
execFileSync('openssl', ['req','-x509','-newkey','rsa:2048','-nodes','-subj','/CN=api.cloudflare.com',
  '-days','1','-keyout',privateKey,'-out',cert], {stdio:'ignore'});
const provider = createServer({key:await readFile(privateKey),cert:await readFile(cert)}, async (request, response) => {
  const address = new URL(request.url, 'https://api.cloudflare.com');
  const json = (result, status=200) => response.writeHead(status, {'content-type':'application/json'})
    .end(JSON.stringify({success:status===200,result,errors:status===200?[]:[{code:10000,message:'Fixture denied the request'}]}));
  if (request.headers.authorization !== 'Bearer disposable-get-url-fixture') return json(null, 401);
  if (address.pathname === bucketsPath) return json({buckets:[{name:bucket}]});
  if (address.pathname === path) return json({name:bucket});
  if (address.pathname === path + '/objects') {
    const prefix = address.searchParams.get('prefix') ?? '';
    const objects = prefix ? [key,sibling].filter(name => name.startsWith(prefix)).map(key => ({key,size:'12',etag:'fixture'})) : [];
    return json({objects,delimited:prefix?[]:['Nested/']});
  }
  if (address.pathname === path + '/domains/custom') {
    operations.push({method:request.method,path:address.pathname,query:address.search});
    const page = Number(address.searchParams.get('page') ?? 1);
    const entries = custom.slice((page-1)*2,page*2);
    return response.writeHead(200, {'content-type':'application/json'}).end(JSON.stringify({success:true,
      result:{domains:entries.map(domain => ({domain,enabled:true,status:{ownership:'active',ssl:'active'}}))},
      ...(custom.length>2?{result_info:{page,total_pages:Math.ceil(custom.length/2)}}:{})}));
  }
  if (address.pathname === path + '/domains/managed') {
    const operation = {method:request.method,path:address.pathname};
    operations.push(operation);
    if (request.method === 'PUT') {
      const chunks=[];
      for await (const chunk of request) chunks.push(chunk);
      operation.body = JSON.parse(Buffer.concat(chunks));
      if (putStatus!==200) return json(null,putStatus);
      enabled = true;
      return json({enabled:true,domain:'pub-acknowledgement-only.r2.dev',bucketId});
    }
    if (enabled && readbackDelay) await new Promise(resolve => setTimeout(resolve,readbackDelay));
    return json({enabled:enabled && !failReadback,domain,bucketId});
  }
  json(null,404);
});
await new Promise(resolve => provider.listen(0,'127.0.0.1',resolve));

let browser, app;
const writes = () => operations.filter(operation => operation.method === 'PUT');
const clear = () => { operations.length=0; };
async function launch(seed=false) {
  browser = await chromium.launchPersistentContext(join(root,'profile'), {
    headless:true,executablePath:process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium',
    ignoreDefaultArgs:['--disable-extensions'],viewport:{width:690,height:790},
    args:['--no-sandbox','--disable-gpu','--no-proxy-server','--ignore-certificate-errors','--enable-unsafe-extension-debugging',
      `--disable-extensions-except=${extension}`,`--load-extension=${extension}`,
      `--host-resolver-rules=MAP api.cloudflare.com 127.0.0.1:${provider.address().port}`]
  });
  let worker = browser.serviceWorkers().find(worker => worker.url().startsWith('chrome-extension://'));
  if (!worker) {
    const cdp = await browser.browser().newBrowserCDPSession();
    await cdp.send('Extensions.loadUnpacked',{path:extension});
    worker = browser.serviceWorkers()[0] ?? await browser.waitForEvent('serviceworker');
  }
  if (seed) await worker.evaluate(async account => {
    await click2cloud.ready;
    await chrome.storage.local.set({explorerExportOptions:{urls:true},click2cloudOAuth:{
      sessionId:'get-url-fixture-session',accessToken:'disposable-get-url-fixture',expiresAt:Date.now()+3600000,
      scopes:['workers-r2.read','workers-r2.write','workers-r2-bucket-item.read'],scopeEvidence:'provider-returned',
      accounts:[{id:account,name:'Get URL fixture account'}]
    }});
  },account);
  app=await browser.newPage();
  app.setDefaultTimeout(4800);
  await app.goto(new URL('app.html',worker.url()).href);
  await app.getByRole('button',{name:'File Explorer',exact:true}).click();
  const folder = app.getByRole('row').filter({hasText:'Nested'});
  const file = app.getByRole('row').filter({hasText:key.split('/').at(-1)});
  await folder.or(file).first().waitFor();
  if (await folder.isVisible()) await folder.dblclick();
  await file.waitFor();
}
async function open(filename=key.split('/').at(-1)) {
  await app.getByRole('row').filter({hasText:filename}).click({button:'right'});
  await app.getByRole('menuitem',{name:'Get URL',exact:true}).click();
  return app.getByRole('dialog');
}
const close = () => app.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();

try {
  await launch(true);
  const view = await open();
  await view.getByRole('button',{name:'No',exact:true}).click();
  assert.equal(writes().length,0,'Opening and declining are read-only');
  await open();
  const yes = view.getByRole('button',{name:'Yes',exact:true});
  await yes.waitFor();
  if (evidence) await app.screenshot({path:join(evidence,'get-url-consent.png')});
  readbackDelay=240;
  await yes.click();
  const expected = view.getByText(url,{exact:true});
  try { await expected.waitFor(); }
  catch (error) {
    if (evidence) await app.screenshot({path:join(evidence,'get-url-yes.png')});
    const recheck=view.getByRole('button',{name:'Recheck',exact:true});
    if (await recheck.isVisible()) {
      await recheck.click();
      await view.locator('p[role=status]').last().waitFor();
    }
    console.error('After Yes and an optional read-only Recheck:',{writes:writes().length,text:await view.innerText()});
    throw error;
  }
  assert.deepEqual(writes(),[{method:'PUT',path:path+'/domains/managed',body:{enabled:true}}]);
  assert(operations.slice(operations.indexOf(writes()[0])+1).some(operation=>operation.method==='GET'&&operation.path===path+'/domains/managed'));
  assert.equal(await view.getByRole('link',{name:/Open Development URL/}).getAttribute('href'),url);
  assert(await view.locator('#url-domain').evaluate((input,address)=>{
    const displayed=[...document.querySelectorAll('#public-urls *')].find(node=>node.textContent===address);
    return displayed && displayed.getBoundingClientRect().top>=input.getBoundingClientRect().bottom;
  },url));
  if (evidence) await app.screenshot({path:join(evidence,'get-url-yes.png')});
  await close();
  await browser.close();browser=null;
  clear();readbackDelay=0;
  await launch();
  for (const filename of [key.split('/').at(-1),sibling.split('/').at(-1)]) {
    await open(filename);
    await view.getByRole('link',{name:/Open Development URL/}).waitFor();
    assert.equal(await yes.count(),0);
    await close();
  }
  assert.equal(writes().length,0,'Reopening after Chromium restart must rediscover the URL');

  enabled=false;custom=['static.example.org','assets.example.org','three.example.org','four.example.org','five.example.org'];
  await open();
  for (const host of custom) await view.getByText(`https://${host}/${url.split('/').slice(3).join('/')}`,{exact:true}).waitFor();
  assert.equal(await yes.count(),0);
  await view.getByRole('button',{name:'Recheck',exact:true}).click();
  await view.getByText('Active custom domains found.').waitFor();
  assert.equal(writes().length,0);
  await close();

  custom=[];putStatus=403;
  await open();await yes.click();
  await view.getByText(/Cloudflare denied activation/).waitFor();
  assert.equal(writes().length,1);
  assert.equal(await view.getByRole('link',{name:/Open Development URL/}).count(),0);
  await close();

  clear();putStatus=200;failReadback=true;
  await open();await yes.click();
  await view.getByText(/Cloudflare has not confirmed/).waitFor();
  assert.equal(writes().length,1);
  assert.equal(await expected.count(),0);
  failReadback=false;
  await view.getByRole('button',{name:'Recheck',exact:true}).click();
  await expected.waitFor();
  assert.equal(writes().length,1);
  console.log(`${browser.browser().version()} unpacked extension: cancel, scoped activation, independent readback, inline exact URL, restart, paginated custom-only, 403 and inconclusive readback passed against local HTTPS fixture.`);
} finally {
  await browser?.close();
  await new Promise(resolve => provider.close(resolve));
  await rm(root,{recursive:true,force:true});
}
