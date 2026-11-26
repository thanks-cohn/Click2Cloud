import {readUploadReceiptSettings,uploadReceiptSettings,uploadReceiptSettingsKey} from '../src/chrome/upload-receipt-policy.mjs';

export async function mountUploadReceiptSettings(page,storage){
 const section=document.createElement('section');
 section.className='card';
 section.innerHTML=`<h2>Automatic upload receipts</h2>
  <label><input type="checkbox" data-policy="files"> Individual or selected-file uploads</label>
  <label><input type="checkbox" data-policy="folders"> Folder uploads</label>
  <label><input type="checkbox" data-policy="largeOnly"> Large uploads only</label>
  <div data-thresholds>
   <label><input type="checkbox" data-policy="sizeEnabled"> Use size threshold</label>
   <label>Size threshold (bytes) <input type="number" min="1" max="9007199254740991" step="1" required data-policy="sizeBytes"></label>
   <label><input type="checkbox" data-policy="countEnabled"> Use file-count threshold</label>
   <label>File-count threshold <input type="number" min="1" max="9007199254740991" step="1" required data-policy="count"></label>
   <label>Match <select data-policy="combine"><option value="or">Either enabled threshold</option><option value="and">Every enabled threshold</option></select></label>
  </div>
  <p role="status"></p>`;
 page.append(section);
 const fields=[...section.querySelectorAll('[data-policy]')],status=section.querySelector('[role=status]');
 const thresholds=section.querySelector('[data-thresholds]');
 const checkboxes=fields.filter(field=>field.type==='checkbox');
 const field=key=>fields.find(input=>input.dataset.policy===key);
 const toggle=()=>{thresholds.hidden=!field('largeOnly').checked;};
 try{
  const policy=await readUploadReceiptSettings(storage);
  for(const input of fields){
   if(checkboxes.includes(input))input.checked=policy[input.dataset.policy];
   else input.value=policy[input.dataset.policy];
  }
  toggle();
 }catch{status.textContent='Upload receipt preferences could not be loaded.';return;}
 let saving=Promise.resolve();
 section.onchange=()=>{
  toggle();
  if(fields.some(input=>!input.checkValidity())){status.textContent='Enter positive whole-number thresholds.';return;}
  const value=Object.fromEntries(fields.map(input=>[input.dataset.policy,
   input.type==='checkbox'?input.checked:input.type==='number'?input.valueAsNumber:input.value]));
  let policy;
  try{policy=uploadReceiptSettings(value);}
  catch{status.textContent='Enable at least one threshold for large uploads.';return;}
  saving=saving.catch(()=>{}).then(()=>storage.set({[uploadReceiptSettingsKey]:policy})).then(()=>{
   status.textContent='Saved for future upload selections.';
  },()=>{status.textContent='Upload receipt preferences could not be saved.';});
 };
}
