import assert from 'node:assert/strict';

// Paints real images with the production gallery. Provider reads are fixtures.
export async function checkImmersiveView(page,{screenshot}={}){
 const previous=page.viewportSize(),saved=await page.evaluate(()=>structuredClone(window.productFixture.entries));
 await page.getByLabel('View',{exact:true}).selectOption('details');
 await page.setViewportSize({width:410,height:700});
 await page.evaluate(async()=>{
  const entries=[];
  for(const [name,width,height] of [['immersive-a-portrait.png',540,840],['immersive-b-landscape.png',1040,620]]){
   const canvas=document.createElement('canvas');
   canvas.width=width;canvas.height=height;
   const context=canvas.getContext('2d');
   context.fillStyle='#326e8e';context.fillRect(0,0,width,height);
   context.fillStyle='#f09053';context.fillRect(width/4,height/4,width/2,height/2);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   window.fixtureImageData[name]=[...new Uint8Array(await blob.arrayBuffer())];
   entries.push({key:name,displayName:name,size:blob.size,etag:'fixture-preview',folder:false});
  }
  window.productFixture.entries.splice(0,Infinity,...entries);
 });
 await page.locator('#refresh').evaluate(button=>button.click());
 await page.getByRole('row').filter({hasText:'immersive-a-portrait.png'}).dblclick();
 const preview=page.locator('img.preview:not([hidden])'),dialog=page.locator('#dialog'),
  dial=page.getByRole('slider',{name:'Zoom relative to Fit'}),fit=page.getByRole('button',{name:'Fit',exact:true});
 await preview.waitFor();
 const normal=await dialog.boundingBox();
 const reads=()=>page.evaluate(()=>window.productFixture.calls.filter(call=>call.operation==='readChunk').length);
 const cdp=await page.context().newCDPSession(page);
 const heap=async()=>{await cdp.send('HeapProfiler.collectGarbage');return (await cdp.send('Runtime.getHeapUsage')).usedSize;};
 const before=await heap(),initialReads=await reads(),url=await preview.getAttribute('src');
 const geometry=()=>preview.evaluate(image=>{
  const frame=image.parentElement;
  return {dx:frame.scrollWidth-frame.clientWidth,dy:frame.scrollHeight-frame.clientHeight,
   fit:Math.abs(image.clientWidth/image.clientHeight-image.naturalWidth/image.naturalHeight)<.01};
 });
 await page.getByRole('button',{name:'Immersive View'}).click();
 assert.deepEqual(await dialog.boundingBox(),{x:0,y:0,width:410,height:700});
 assert.equal(await dialog.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 0, 0)');
 assert.deepEqual(await geometry(),{dx:0,dy:0,fit:true});
 await preview.click({position:{x:75,y:480}});
 assert.equal(await dial.inputValue(),'200');
 assert.equal(await dialog.locator('output').textContent(),'200%');
 await dial.fill('400');
 const zoomed=await geometry();
 assert(zoomed.dx>0&&zoomed.dy>0&&zoomed.fit);
 await preview.evaluate(image=>{
  const frame=image.parentElement;
  frame.scrollTo(frame.scrollWidth,frame.scrollHeight);
 });
 assert.deepEqual(await preview.evaluate(image=>[image.parentElement.scrollLeft,image.parentElement.scrollTop]),[zoomed.dx,zoomed.dy]);
 await fit.click();
 assert.deepEqual(await geometry(),{dx:0,dy:0,fit:true});
 for(let i=0;i<12;i++){await preview.click();await preview.click();}
 assert.equal(await preview.getAttribute('src'),url);
 assert.equal(await reads(),initialReads);
 const during=await heap();
 await page.keyboard.press('Shift+Equal');
 assert.equal(await dial.inputValue(),'125');
 await page.keyboard.press('NumpadAdd');
 assert.equal(await dial.inputValue(),'150');
 await page.keyboard.press('NumpadSubtract');
 await page.keyboard.press('-');
 await page.keyboard.press('-');
 assert.equal(await dial.inputValue(),'100');
 await page.keyboard.press('ArrowRight');
 await page.locator('#dialog-title').filter({hasText:'immersive-b-landscape.png'}).waitFor();
 await preview.waitFor();
 assert.equal(await dial.inputValue(),'100');
 assert.deepEqual(await geometry(),{dx:0,dy:0,fit:true});
 await dial.fill('399');
 await dial.press('ArrowRight');
 assert.equal(await dial.inputValue(),'400','slider arrow remains a slider command');
 await page.getByRole('button',{name:'Exit Immersive View'}).focus();
 await page.keyboard.press('Shift+Equal');
 assert.equal(await dial.inputValue(),'400');
 const landscape=await geometry();
 assert(landscape.dx>0&&landscape.dy>0&&landscape.fit);
 if(screenshot)await page.screenshot({path:screenshot});
 const scroll=()=>preview.evaluate(img=>[img.parentElement.scrollLeft,img.parentElement.scrollTop]);
 await preview.evaluate(img=>img.parentElement.scrollTo(0,0));
 for(const key of ['ArrowRight','ArrowDown'])await page.keyboard.press(key);
 const middle=await scroll();
 assert(middle.every(value=>value>0));
 for(const key of ['ArrowLeft','ArrowUp'])await page.keyboard.press(key);
 assert.deepEqual(await scroll(),[0,0]);
 assert.equal(await dialog.locator('#dialog-title').textContent(),'immersive-b-landscape.png');
 await page.keyboard.press('Escape');
 assert.equal(await dialog.getAttribute('data-immersive'),'');
 assert.equal(await dial.inputValue(),'100');
 assert.deepEqual(await scroll(),[0,0]);
 await page.keyboard.press('Escape');
 assert(await dialog.isVisible());
 assert.equal(await dialog.getAttribute('data-immersive'),null);
 assert.deepEqual(await dialog.boundingBox(),normal);
 assert.equal(await dialog.locator('#dialog-title').textContent(),'immersive-b-landscape.png');
 await dialog.locator('#dialog-title').press('F2');
 const rename=page.getByRole('textbox',{name:'Image filename'});
 await rename.press('ArrowLeft');
 await rename.press('Control+Shift+F7');
 assert.equal(await rename.inputValue(),'immersive-b-landscape.png');
 await rename.press('Escape');
 assert(await dialog.isVisible());
 await page.keyboard.press('Escape');
 assert(!await dialog.isVisible());
 assert(await page.getByRole('row').filter({hasText:'immersive-a-portrait.png'}).evaluate(row=>row===document.activeElement||row.contains(document.activeElement)));

 const beforeCycles=await heap(),countersBefore=await cdp.send('Memory.getDOMCounters');
 await cdp.send('Performance.enable');
 const rendererSeconds=async()=>(await cdp.send('Performance.getMetrics')).metrics.find(entry=>entry.name==='TaskDuration')?.value;
 const taskBefore=await rendererSeconds();
 const cycles=105;
 const extraReads=await page.evaluate(async count=>{
  const readCount=()=>window.productFixture.calls.filter(call=>call.operation==='readChunk').length;
  const wait=async predicate=>{
   for(let frame=0;frame<90;frame++){
    if(predicate())return;
    await new Promise(requestAnimationFrame);
   }
   throw Error('Gallery cycle did not settle');
  };
  const key=value=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true}));
  let extra=0;
  for(let i=0;i<count;i++){
   document.querySelector('#files tr[data-index]').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
   await wait(()=>document.querySelector('img.preview:not([hidden])'));
   const before=readCount();
   document.querySelector('#immersive-view').click();
   key('+');key('ArrowDown');key('ArrowRight');
   for(let stage=0;stage<3;stage++)key('Escape');
   if(document.querySelector('#dialog').open)throw Error('Gallery did not close');
   extra+=readCount()-before;
  }
  return extra;
 },cycles);
 const taskAfter=await rendererSeconds();
 const afterCycles=await heap(),countersAfter=await cdp.send('Memory.getDOMCounters');
 assert.equal(extraReads,0);
 assert(countersAfter.jsEventListeners<=countersBefore.jsEventListeners+3,{countersBefore,countersAfter});
 assert(afterCycles-beforeCycles<4*1024*1024,{beforeCycles,afterCycles});
 await page.evaluate(saved=>window.productFixture.entries.splice(0,Infinity,...saved),saved);
 await page.setViewportSize(previous);
 await page.locator('#refresh').evaluate(button=>button.click());
 await page.getByLabel('View',{exact:true}).selectOption('grid');
 return {gate:'immersive-portrait-landscape-scroll-navigation-and-escape',state:'PASS',clickZoomCycles:12,openZoomPanCloseCycles:cycles,
  immersiveAdditionalReads:extraReads,gcHeapBeforeBytes:before,gcHeapImmersiveBytes:during,
  gcHeapBeforeCycles:beforeCycles,gcHeapAfterCycles:afterCycles,countersBefore,countersAfter,rendererTaskSeconds:taskAfter-taskBefore};
}
