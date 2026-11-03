/**
 * SIMPLE ONLY. Testable first-run coordinator. Requires explicit user
 * authentication/R2 activation beforehand and injected authorized APIs.
 * It cannot create a bucket or modify any live account on its own.
 */
export const SIMPLE_DEFAULT_BUCKET='redown';
export class SimpleSetupError extends Error {
  constructor(message){super(message);this.name='SimpleSetupError';}
}
export async function ensureRedownDefault({session,r2,accountId,services}){
  if(session?.state!=='verified')return {state:'needs-cloudflare-login'};
  if(!accountId||session.accountId!==accountId)return {state:'choose-account'};
  if(r2?.state!=='active')return {state:'needs-r2-activation'};
  for(const name of ['withAccountLock','listBuckets','createBucket','prepareRoot','commitSimpleDefaultIfUnset']){
    if(typeof services?.[name]!=='function')throw new TypeError('Missing service '+name);
  }
  return services.withAccountLock('simple:default:'+accountId,async()=>{
    const read=async()=>{
      const buckets=await services.listBuckets(accountId);
      if(!Array.isArray(buckets))throw new SimpleSetupError('Bucket listing could not be verified');
      return buckets;
    };
    let buckets=await read();
    const existed=buckets.some(b=>b?.name===SIMPLE_DEFAULT_BUCKET);
    if(!existed){
      try{await services.createBucket(accountId,SIMPLE_DEFAULT_BUCKET);}
      catch(err){
        // A failed/ambiguous result requires a readback, never blind retry.
        buckets=await read();
        if(!buckets.some(b=>b?.name===SIMPLE_DEFAULT_BUCKET))
          throw new SimpleSetupError('Bucket creation unverified: '+String(err?.message||err));
      }
      buckets=await read();
      if(!buckets.some(b=>b?.name===SIMPLE_DEFAULT_BUCKET))
        throw new SimpleSetupError('redown bucket not verified after creation');
    }
    const target=await services.prepareRoot({accountId,bucketName:SIMPLE_DEFAULT_BUCKET,prefix:''});
    if(target?.verified!==true||target.accountId!==accountId||
      target.bucketName!==SIMPLE_DEFAULT_BUCKET||target.prefix!=='')
      throw new SimpleSetupError('Default redown root is not writable and verified');
    // This writer must be a CAS/transaction and touch *only* Simple settings.
    // It must preserve an explicitly user-selected later default.
    const committed=await services.commitSimpleDefaultIfUnset({
      accountId,target,onlyIfUnset:true,preserveUserPreferences:true
    });
    if(committed?.ok!==true)throw new SimpleSetupError('Simple default was not durably saved');
    return {state:'ready',created:!existed,bucketName:SIMPLE_DEFAULT_BUCKET,
      target,defaultAssigned:committed.assigned===true};
  });
}
