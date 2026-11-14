// Business owners depend only on this optional callback contract, never diagnostic state.
let nextOperation = 0;
export const operationIdentity = context => Number.isSafeInteger(context?.operationId) && context.operationId > 0 ? context.operationId : ++nextOperation;
export function observe(sink, stage, outcome, code, context = {}, requires = [], count = 0) {
  if (typeof sink !== 'function') return 0;
  try {
    const result=sink({stage,outcome,code,operationId:context.operationId || 0,attempt:context.attempt || 1,
      generation:context.generation || 0,revision:context.revision || 0,parentOperation:context.parentOperation || 0,
      retryOf:context.retryOf || 0,requires,count});
    return Number.isSafeInteger(result)&&result>0?result:0;
  } catch { return 0; }
}
export const errorOutcome = error => error?.uncertain === true ? 'uncertain' : error?.name === 'AbortError' ? 'cancelled' : 'failed';

// Optional observer promises never gate business work or leak rejected IO.
export function passiveObservation(callback,event){try{const result=callback?.(event);if(result&&typeof result.then==='function')void Promise.resolve(result).catch(()=>{});}catch{}}
