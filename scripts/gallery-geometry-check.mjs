import assert from 'node:assert/strict';
// Real DOM/decoder measurements; only object bytes and authorization are fixtures.
export async function checkGalleryGeometry(page,{baseline=false,screenshot}={}) {
 const saved=await page.evaluate(()=>structuredClone(window.productFixture.entries));
 await page.getByLabel('View',{exact:true}).selectOption('details');
 await page.evaluate(async()=>{
  const cases=[['geometry-0-portrait.png',240,960],['geometry-1-landscape.png',1600,200],['geometry-2-square.png',900,900]];
  for(const [name,width,height]of cases){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').fillRect(0,0,width,height);const blob=await new Promise(ok=>canvas.toBlob(ok,'image/png'));window.fixtureImageData[name]=[...new Uint8Array(await blob.arrayBuffer())];}
  window.productFixture.entries.splice(0,window.productFixture.entries.length,...[...cases.map(x=>x[0]),'picture.gif','large.jpg','broken.png'].filter(key=>window.fixtureImageData[key]).map(key=>({key,displayName:key==='geometry-1-landscape.png'?'A very long image title '.repeat(12)+'.png':key,size:window.fixtureImageData[key].length,etag:'fixture-preview',folder:false})));
  window.fixtureImageDelay={'geometry-0-portrait.png':450};
 });
 await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#files').getAttribute('aria-busy')==='false'&&document.querySelector('#item-count').textContent.startsWith('6 items'));
 const samples=[];
 async function measure(label){samples.push(await page.evaluate(label=>{const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};const image=document.querySelector('img.preview');return {label,dialog:rect(document.querySelector('dialog')),frame:rect(document.querySelector('.image-frame')),controls:rect(document.querySelector('.gallery-controls')),download:rect(document.querySelector('#download-stream')),image:rect(image),intrinsic:image?[image.naturalWidth,image.naturalHeight]:null,fit:image?getComputedStyle(image).objectFit:null};},label));}
 await page.getByRole('row').filter({hasText:'geometry-0-portrait.png'}).dblclick();await page.locator('#preview-state:not([hidden])').waitFor();await measure('portrait-pending');await page.locator('img.preview:not([hidden])').waitFor();await measure('portrait-decoded');
 for(const name of ['geometry-1-landscape.png','geometry-2-square.png','picture.gif','large.jpg','broken.png']){
  await page.keyboard.press('Escape');await page.getByRole('row').filter({hasText:name==='geometry-1-landscape.png'?'A very long image title':name}).dblclick();
  await page.locator(name==='broken.png'?'#preview-error:not([hidden])':'img.preview:not([hidden])').waitFor();await measure(name);
 }
 await page.keyboard.press('Escape');await page.evaluate(()=>window.fixtureImageDelay={'geometry-0-portrait.png':450});await page.getByRole('row').filter({hasText:'geometry-0-portrait.png'}).dblclick();await page.keyboard.press('ArrowRight');await page.locator('img.preview:not([hidden])').waitFor();await page.waitForTimeout(500);assert.equal(await page.locator('#dialog-title').textContent(),'geometry-2-square.png');await measure('rapid-superseded-portrait');
 const reference=samples[0],shifts=samples.map(s=>({label:s.label,maxShift:Math.max(...['dialog','frame','controls','download'].flatMap(k=>reference[k]&&s[k]?Object.keys(reference[k]).map(v=>Math.abs(s[k][v]-reference[k][v])):[0]))}));
 if(screenshot)await page.screenshot({path:screenshot});
 await page.setViewportSize({width:360,height:640});await measure('viewport-resized');const mobile=samples.at(-1);assert(mobile.dialog.x>=0&&mobile.dialog.width<=360&&mobile.dialog.y>=0&&mobile.dialog.y+mobile.dialog.height<=640);assert(mobile.controls.width<=mobile.dialog.width);await page.setViewportSize({width:1280,height:850});
 await page.keyboard.press('Escape');await page.evaluate(saved=>{window.productFixture.entries.splice(0,window.productFixture.entries.length,...saved);window.fixtureImageDelay={};},saved);await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#files').getAttribute('aria-busy')==='false');await page.getByLabel('View',{exact:true}).selectOption('grid');
 const result={gate:'stable-gallery-portrait-landscape-square-GIF-large-failed-slow-rapid-and-viewport-resize',state:samples.every(s=>s.frame&&s.fit==='contain')&&shifts.every(s=>s.maxShift<=1)?'PASS':'FAIL',samples,shifts,baseline};
 if(!baseline)assert.equal(result.state,'PASS',JSON.stringify(result));return result;
}
