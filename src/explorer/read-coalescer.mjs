// Coalesce only concurrent metadata reads in the existing File API. No result
// cache, stream sharing, cross-session reuse, or mutation replay.
export function coalesceFileReads(api,{authority}={}){
 const pending=new Map();return Object.freeze({...api,async run(operation,input={},options={}){
  if(!['list','listRaw','stat'].includes(operation)||options.signal||Object.values(options).some(v=>typeof v==='function'))return api.run(operation,input,options);
  const session=await authority(),key=JSON.stringify([session.sessionId,operation,input,options]);let task=pending.get(key);
  if(!task){task=Promise.resolve().then(()=>api.run(operation,input,options));pending.set(key,task);task.finally(()=>{if(pending.get(key)===task)pending.delete(key);}).catch(()=>{});}
  const result=await task;if((await authority()).sessionId!==session.sessionId)throw Object.assign(Error('AUTH_SESSION_CHANGED'),{code:'AUTH_SESSION_CHANGED'});return result;
 }});
}
