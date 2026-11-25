// The packaged console renderer runs in Chromium with simulated extension messages.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';

const script=await readFile('dist/click2cloud/extension/console-save-notice.js');
const art=await readFile('dist/click2cloud/extension/icons/redown-console-r.png');
const server=createServer((request,response)=>{
  if(request.url==='/extension/console-save-notice.js'){
    response.writeHead(200,{'Content-Type':'text/javascript'}).end(script);
  }else if(request.url==='/extension/icons/redown-console-r.png'){
    response.writeHead(200,{'Content-Type':'image/png'}).end(art);
  }else{
    response.writeHead(200,{'Content-Type':'text/html','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'"});
    response.end('<!doctype html><title>Console save notice fixture</title><script src="/extension/console-save-notice.js"></script>');
  }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
  browser=await chromium.launch({executablePath:process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium',headless:true});
  const page=await browser.newPage({viewport:{width:260,height:420}});
  await page.addInitScript(()=>{
    // Open the otherwise closed shadow for accessibility and timing assertions.
    const attach=Element.prototype.attachShadow;
    Element.prototype.attachShadow=function(options){return attach.call(this,{...options,mode:'open'});};
    Object.defineProperty(window,'chrome',{value:{runtime:{id:'fixture',getURL:path=>new URL(path,location.origin).href,
      onMessage:{addListener(listener){
        window.emitConsoleNotice=(id,provider,sender='fixture')=>new Promise(resolve=>{
          const reply=listener({channel:'redown-console-save',id,provider,surface:'page',deliverBy:Date.now()+500},{id:sender},resolve);
          if(!reply)resolve(false);
        });
      }}}}});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  const send=(id,provider,sender)=>page.evaluate(args=>window.emitConsoleNotice(...args),[id,provider,sender]);
  const notice=page.getByRole('button',{name:'Dismiss save notification'});
  const providerTags={dropbox:['Dropbox','#ffe097','91'],google:['Google Drive','#b9ee71','115'],
    onedrive:['OneDrive','#71caff','85'],cloudflare:['Cloudflare R2','#ffb85d','125']};
  assert.equal(await send('untrusted','google','other'),false);
  assert.equal(await send('invalid','unknown'),false);
  for(const [provider,tag] of Object.entries(providerTags)){
    assert.equal(await send(provider,provider),true);
    assert.equal(await notice.count(),1);
    const actual=await notice.evaluate(button=>{
      const reward=button.parentElement,svg=reward.querySelector('svg'),rect=svg.querySelector('rect');
      return {
        tag:[rect.nextElementSibling.textContent,rect.getAttribute('fill'),rect.getAttribute('width')],
        heading:svg.querySelector('text').textContent,
        image:svg.querySelector('image').getAttribute('href'),
        animations:reward.getAnimations({subtree:true}).map(animation=>{
          const {delay,duration}=animation.effect.getTiming();
          return [delay,duration];
        }).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),
        bounds:reward.getBoundingClientRect().toJSON()
      };
    });
    assert.deepEqual(actual.tag,tag);
    assert.equal(actual.heading,'SUCCESS!');
    assert.match(actual.image,/\/extension\/icons\/redown-console-r\.png$/);
    assert.deepEqual(actual.animations,[[0,900],[0,10000],[650,650],[1250,240],[9200,800]]);
    assert(actual.bounds.left>=0&&actual.bounds.right<=260&&actual.bounds.bottom<=420);
  }
  await notice.focus();
  await page.keyboard.press('Enter');
  assert.equal(await notice.count(),0);
  assert.equal(await send('cloudflare','cloudflare'),true);
  assert.equal(await notice.count(),0);
  await page.clock.install();
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await send('reduced','google'),true);
  assert.deepEqual(await notice.evaluate(button=>button.parentElement.getAnimations({subtree:true}).map(animation=>animation.effect.getTiming().duration)),[10000]);
  await page.clock.fastForward(10001);
  assert.equal(await notice.count(),0);
  assert.equal(await send('reduced','google'),true);
  assert.equal(await notice.count(),0);
  console.log('PASS: four provider palettes, approved timings, narrow viewport, keyboard dismissal, reduced motion, deduplication and 10-second expiry in Chromium.');
}finally{
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
