import {labError} from './spool.mjs';

export const campaignPolicyVersion = 1;
export const timerSeconds = Math.floor(2147483647 / 1000);
export const maxSessionMinutes = Math.floor(timerSeconds / 60);
export const auditPageSize = 128;
export const auditFrameBytes = 350_000;
export const budgetFields = ['files','trafficBytes','diskBytes','providerRequests','operations','seconds'];
export const auditFields = ['trafficBytes','providerRequests','operations','seconds'];
export const ceilingFields = ['files','trafficBytes','diskBytes','providerRequests','operations','costMicros'];
export const campaignDefaults = Object.freeze({
 files:2500,trafficBytes:20*1024**3,diskBytes:1024**3,providerRequests:660_000,operations:10_000,costMicros:7_000_000
});
export const validInt = (value,min=0,max=Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value)&&value>=min&&value<=max;
export const costMicros = (requests,trafficBytes) => requests*9+Math.ceil(trafficBytes*(15/1_000_000));

export function exactKeys(input, keys, optional=[]) {
 if(!input||typeof input!=='object'||Array.isArray(input)||!keys.every(key=>Object.hasOwn(input,key))||
    Object.keys(input).some(key=>!keys.includes(key)&&!optional.includes(key)))throw labError('INVALID_INPUT');
}

export function validateCeilings(ceilings,maxObjectBytes){
 exactKeys(ceilings,ceilingFields);
 if(ceilingFields.some(key=>!validInt(ceilings[key]))||ceilings.diskBytes>maxObjectBytes)
  throw labError('INVALID_LAB_CEILINGS');
 return ceilings;
}

export function validateCampaign(policy,approved,remaining){
 exactKeys(policy,['budget','audit','execution','benchmarkSeconds','transferSeconds','inactivitySeconds',
  'requestSeconds','uploadSeconds','verificationSeconds','costMicros']);
 const {budget,audit,execution,benchmarkSeconds,transferSeconds,inactivitySeconds,requestSeconds,uploadSeconds,verificationSeconds}=policy;
 exactKeys(budget,budgetFields);
 exactKeys(audit,auditFields);
 if(!['completion','timed','audit'].includes(execution)||
    budgetFields.some(key=>!validInt(budget[key],key==='seconds'?1:0,key==='seconds'?timerSeconds:Number.MAX_SAFE_INTEGER))||
    auditFields.some(key=>!validInt(audit[key],0,budget[key]))||
    !validInt(benchmarkSeconds,1,timerSeconds)||!validInt(transferSeconds,1,timerSeconds)||
    [inactivitySeconds,requestSeconds,uploadSeconds,verificationSeconds].some(value=>!validInt(value,1,transferSeconds))||
    !validInt(policy.costMicros))throw labError('INVALID_CAMPAIGN_POLICY');
 if((execution==='audit'&&(audit.seconds!==budget.seconds||budget.files!==0||budget.diskBytes!==0||
      auditFields.some(key=>audit[key]!==budget[key])))||execution!=='audit'&&audit.seconds>=budget.seconds)
  throw labError('INVALID_CAMPAIGN_AUDIT_RESERVE');
 if(budgetFields.some(key=>budget[key]>remaining[key])||policy.costMicros>approved.costMicros||
    costMicros(budget.providerRequests,budget.trafficBytes)>policy.costMicros)
  throw labError('LAB_BUDGET_EXCEEDED');
 return policy;
}
