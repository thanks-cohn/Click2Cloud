// The packaged console renderer runs in Chromium with simulated extension messages.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';

const script=await readFile('dist/click2cloud/extension/console-save-notice.js');
const art=await readFile('dist/click2cloud/extension/icons/redown-console-r.png');
const baseline=process.env.C2C_BASELINE_BUILD&&await readFile(join(process.env.C2C_BASELINE_BUILD,'extension/console-save-notice.js'));
const server=createServer((request,response)=>{
  if(request.url==='/extension/console-save-notice.js'){
    response.writeHead(200,{'Content-Type':'text/javascript'}).end(script);
  }else if(request.url==='/baseline-console.js'&&baseline){
    response.writeHead(200,{'Content-Type':'text/javascript'}).end(baseline);
  }else if(request.url==='/extension/icons/redown-console-r.png'){
    response.writeHead(200,{'Content-Type':'image/png'}).end(art);
  }else{
    response.writeHead(200,{'Content-Type':'text/html','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'"});
    response.end('<!doctype html><title>Console save notice fixture</title><script src="'+
      (request.url==='/baseline'?'/baseline-console.js':'/extension/console-save-notice.js')+'"></script>');
  }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
  browser=await chromium.launch({executablePath:process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium',headless:true});
  const page=await browser.newPage({viewport:{width:260,height:420}});
  await page.addInitScript(()=>{
    // Open the otherwise closed shadow for accessibility and timing assertions.
    const nativeAnimate=Element.prototype.animate;
    window.noticeAnimations=0;
    Element.prototype.animate=function(...args){window.noticeAnimations++;return nativeAnimate.apply(this,args);};
    const NativeImage=window.Image;
    window.noticeImageLoads=0;
    window.Image=new Proxy(NativeImage,{construct(target,args){window.noticeImageLoads++;return Reflect.construct(target,args);}});
    const attach=Element.prototype.attachShadow;
    Element.prototype.attachShadow=function(options){return attach.call(this,{...options,mode:'open'});};
    Object.defineProperty(window,'chrome',{value:{runtime:{id:'fixture',getURL:path=>new URL(path,location.origin).href,
      sendMessage:async message=>message.claim===true&&message.token!=='expired-offer',
      onMessage:{addListener(listener){
        window.emitConsoleNotice=(id,provider,sender='fixture',options={})=>new Promise(resolve=>{
          const reply=listener({channel:'redown-console-save',id,provider,surface:'page',token:id,deliverBy:Date.now()+500,...options},{id:sender},resolve);
          if(!reply)resolve(false);
        });
      }}}}});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  const send=(id,provider,sender,options)=>page.evaluate(args=>window.emitConsoleNotice(...args),[id,provider,sender,options]);
  const notice=page.getByRole('button',{name:'Dismiss save notification'});
  const origin='http://127.0.0.1:'+server.address().port;
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
  await page.setViewportSize({width:900,height:720});
  let baselineSize;
  if(baseline){
    await page.goto(origin+'/baseline');
    assert.equal(await send('baseline-large','dropbox'),true);
    baselineSize=await notice.evaluate(button=>[button.parentElement.offsetWidth,button.parentElement.offsetHeight]);
    await page.goto(origin+'/');
  }
  assert.equal(await send('expired-offer','google'),false);
  for(const [size,width] of [['small',253],['standard',338],['large',422]]){
    for(const position of ['center','bottom-right']){
      assert.equal(await send(size+position,'dropbox',undefined,{size,position,hover:false}),true);
      const box=await notice.evaluate(button=>button.parentElement.getBoundingClientRect().toJSON());
      assert.equal(box.width,width);
      if(size==='large'&&baselineSize)assert.deepEqual(
        await notice.evaluate(button=>[button.parentElement.offsetWidth,button.parentElement.offsetHeight]),baselineSize);
      if(position==='center'){
        assert(Math.abs(box.x+box.width/2-450)<1);assert(Math.abs(box.y+box.height/2-360)<1);
      }else{
        assert.equal(box.right,892);assert.equal(box.bottom,708);
      }
      await page.mouse.move(box.x+30,box.y+30);
      assert.equal(await notice.count(),1);
      await notice.focus();await page.keyboard.press('Escape');
      assert.equal(await notice.count(),0);
    }
  }
  // Fresh document: a parked cursor must suppress even the first artwork load.
  await page.goto(origin+'/');
  const activity=()=>page.evaluate(()=>[window.noticeImageLoads,window.noticeAnimations]);
  await page.mouse.move(850,680);
  assert.deepEqual(await send('hover','dropbox'),{state:'suppressed-hover'});
  assert.equal(await notice.count(),0);
  assert.deepEqual(await activity(),[0,0],'Suppression must precede artwork and animation');
  for(const [size,width] of [['small',253],['standard',338],['large',422]]){
    for(const position of ['center','bottom-right']){
      await page.mouse.move(...(position==='center'?[450,360]:[890,700]));
      assert.deepEqual(await send('parked-'+size+position,'google',undefined,{size,position}),{state:'suppressed-hover'});
      assert.equal(await notice.count(),0);
    }
  }
  assert.deepEqual(await activity(),[0,0]);
  await page.mouse.move(400,450);
  assert.deepEqual(await send('hover','dropbox'),{state:'suppressed-hover'},'Suppressed ID must not replay');
  assert.equal(await send('moving-hover','dropbox'),true);
  assert.equal(await notice.count(),1);
  await page.mouse.move(850,680);
  await notice.waitFor({state:'detached'});
  assert.equal(await send('moving-hover','dropbox'),true);
  assert.equal(await notice.count(),0);
  assert.equal(await send('hover-disabled','dropbox',undefined,{hover:false}),true);
  assert.equal(await notice.count(),1,'Hover disabled must preserve parked-pointer display');
  await notice.focus();await page.keyboard.press('Escape');
  await page.mouse.move(400,450);
  assert.equal(await send('after-hover','dropbox'),true);
  assert.equal(await notice.count(),1);
  await send('hover','dropbox',undefined,{stop:true});
  assert.equal(await notice.count(),1,'An old stop cannot dismiss a newer notice');
  console.log('PASS: palettes, approved timings, narrow viewport, both positions, three sizes, baseline Large geometry, hover, keyboard dismissal, reduced motion, deduplication and expiry in Chromium.');
}finally{
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
