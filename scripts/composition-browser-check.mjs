import assert from 'node:assert/strict';
export async function checkComposition(page){
 await page.reload();await page.waitForFunction(()=>!!window.productFixture);
 const result=await page.evaluate(async()=>{
  const f=productFixture,commit=async changes=>{const s=await f.current.read(),r=await f.api.invoke({version:'3+1.1',method:'commitConfigChange',params:{expectedRevision:s.product.revision,idempotencyKey:crypto.randomUUID(),changes}},'gui');if(r.state!=='completed')throw Error(r.code);return r;};
  let s=await f.current.read(),a=s.configs.nested.destinations[0],target=a.target;
  await commit([{type:'updateDestination',mode:'nested',id:a.id,quick:false,hidden:false,visibilityMode:'all'},{type:'clearDefault'},{type:'createDestination',mode:'nested',target},{type:'createDestination',mode:'simple',target,label:'Direct'},{type:'setDepthDisplayBuckets',scopes:[{target:{...target,prefix:''},maxDepth:4,hidden:false}]}]);
  s=await f.current.read();const saved=structuredClone(s.configs),cases=[];
  for(let i=0;i<8;i++)for(const flat of [false,true]){
   const show={simple:!!(i&1),nested:!!(i&2),depth:!!(i&4),flat};await commit([{type:'setShowInChrome',show}]);
   const native=(await f.api.invoke({version:'3+1.1',method:'inspectNativeACK',params:{}},'gui')).data,spec=(await f.api.invoke({version:'3+1.1',method:'previewNativeMenu',params:{}},'gui')).data;
   const saves=spec.rows.filter(r=>r.role==='save'),modes=Object.fromEntries(['simple','nested','depth'].map(m=>[m,saves.some(r=>r.origin.mode===m)]));
   if(Object.keys(modes).some(m=>modes[m]!==show[m]))throw Error('MODE_COMPOSITION_MISMATCH '+JSON.stringify({show,modes,rows:spec.rows.map(r=>({mode:r.origin.mode,label:r.label,role:r.role}))}));if(JSON.stringify((await f.current.read()).configs)!==JSON.stringify(saved))throw Error('CONFIG_CHANGED');
   if(native.pending||native.desired?.generation!==native.acknowledgedGeneration)throw Error('ACK_MISSING');
   const chain=r=>{const labels=[];while(r){labels.unshift(r.label);r=spec.rows.find(p=>p.id===r.parentId);}return labels;};
   cases.push({show,modes,nativeACK:true,routes:saves.filter(r=>r.target.prefix===target.prefix).map(r=>({id:r.id,presentationId:r.presentationId,mode:r.origin.mode,target:r.target,chain:chain(r)}))});
  }
  await commit([{type:'setShowInChrome',show:{simple:true,nested:true,depth:true,flat:false}}]);return {cases,saved};
 });
 assert.equal(result.cases.length,16);const all=result.cases.find(c=>c.show.simple&&c.show.nested&&c.show.depth&&!c.show.flat);assert.equal(all.routes.filter(r=>r.mode==='nested').length,2);assert(all.routes.some(r=>r.mode==='depth'&&r.chain.length>=6));
 await page.getByRole('button',{name:'File Explorer',exact:true}).click();await page.getByRole('button',{name:'Manage Destinations',exact:true}).click();await page.locator('#narrow-filter').click();await page.waitForFunction(()=>document.querySelectorAll('.dest-row').length===2);assert.equal(await page.locator('.dest-row').count(),2);
 await page.locator('[data-hide="1"]').click();await page.locator('.dest-row.hidden').waitFor();const hidden=await page.evaluate(async()=>{const f=productFixture,s=await f.current.read(),r=await f.api.invoke({version:'3+1.1',method:'previewNativeMenu',params:{}},'gui');return {configs:s.configs,routes:r.data.rows.filter(r=>r.origin.mode==='nested'&&r.role==='save')};});assert.equal(hidden.routes.length,1);assert.equal(hidden.configs.nested.destinations.length,2);assert.equal(hidden.configs.nested.destinations[0].hidden,false);
 await page.locator('[data-hide="1"]').click();await page.locator('.dest-row.hidden').waitFor({state:'detached'});await page.getByRole('button',{name:'Close',exact:true}).click();
 const persisted=await page.evaluate(async()=>{const f=productFixture,b=(await f.current.read()).configs;await f.api.invoke({version:'3+1.1',method:'disconnect',params:{}},'gui');await f.api.invoke({version:'3+1.1',method:'loginBegin',params:{}},'gui');return {before:b,after:(await f.current.read()).configs};});assert.deepEqual(persisted.before,persisted.after);await page.reload();await page.waitForFunction(()=>!!window.productFixture);const kept=await page.evaluate(async()=>(await productFixture.current.read()).configs);assert.deepEqual(kept,persisted.after);
 return {gate:'gateA-additive16-Flat-matrix-two-presentations-real-IDB-eye-relogin-reload-native-callback-ACK',state:'PASS',...result};
}
