import {freeze,normalizeTarget,targetKey} from '../core/menu-identity.mjs';
import {captureUuid,screenshotFilename} from '../cloudflare/screenshot-wire.mjs';
export {captureUuid};

export const screenshotSignal='screenshot.capture';
export const screenshotCommands=Object.freeze(['screenshot.capture.alt-q','screenshot.capture.ctrl-shift-y']);
export const screenshotPreference='screenshotRulesV1';
export const screenshotRulePageSize=25;
export const screenshotError=code=>Object.assign(Error(code),{code});
export function ordinaryPage(value){
 try{
  const url=new URL(value);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)return null;
  url.hostname=url.hostname.replace(/\.$/,'');
  return url;
 }catch{return null;}
}

export function websiteCondition({kind,value}={}){
 if(kind==='all')return {kind};
 if(kind==='url'){
  const url=ordinaryPage(value);
  if(!url)throw screenshotError('SCREENSHOT_URL_INVALID');
  return {kind,value:url.href};
 }
 if(!['domain','host'].includes(kind)||typeof value!=='string'||!value.trim()||/[\s:/@?#\\]/.test(value.trim()))
  throw screenshotError('SCREENSHOT_HOST_INVALID');
 const url=ordinaryPage('https://'+value.trim());
 if(!url?.hostname)throw screenshotError('SCREENSHOT_HOST_INVALID');
 return {kind,value:url.hostname};
}
export function matchesWebsite(websites,url){
 return !websites.length||websites.some(site=>site.kind==='all'||
  (site.kind==='url'?url.href===site.value:
   url.hostname===site.value||site.kind==='domain'&&url.hostname.endsWith('.'+site.value)));
}
export function screenshotTarget(target){
 const normalized=normalizeTarget(target);
 if(normalized.provider!=='cloudflare'||normalized.connectionId!=='cloudflare:'+normalized.accountId)
  throw screenshotError('SCREENSHOT_TARGET_INVALID');
 return normalized;
}

function validatedRule(value){
 if(!value||!Array.isArray(value.websites)||!Array.isArray(value.destinations)||!value.destinations.length||
   !captureUuid(value.ruleId)||typeof value.active!=='boolean'||typeof value.name!=='string'||!value.name.trim()||
   !Number.isSafeInteger(value.revision)||value.revision<1)throw screenshotError('SCREENSHOT_RULE_INVALID');
 const websites=[...new Map(value.websites.map(site=>{const item=websiteCondition(site);return [JSON.stringify(item),item];})).values()];
 const destinations=[...new Map(value.destinations.map(input=>{const target=screenshotTarget(input);return [targetKey(target),target];})).values()];
 const shortcut=value.shortcut||null;
 if(shortcut&&!screenshotCommands.includes(shortcut))throw screenshotError('SCREENSHOT_RULE_INVALID');
 return {...(shortcut?{shortcut}:{}),ruleId:value.ruleId,name:value.name.trim(),active:value.active,revision:value.revision,websites,destinations};
}
const defaults=()=>({schemaVersion:1,revision:0,dedup:true,rules:[]});
export const screenshotDefaultName='Default Screenshots';

export function createScreenshotRules({storage,authorizeTarget,discoverDefault=async()=>null}){
 let writes=Promise.resolve();
 async function read(){
  const saved=(await storage.get(screenshotPreference))[screenshotPreference];
  if(saved===undefined)return defaults();
  if(saved?.schemaVersion!==1||!Number.isSafeInteger(saved.revision)||typeof saved.dedup!=='boolean'||!Array.isArray(saved.rules))
   throw screenshotError('SCREENSHOT_RULES_UNAVAILABLE');
  const rules=saved.rules.map(validatedRule);
  if(new Set(rules.map(rule=>rule.ruleId)).size!==rules.length)throw screenshotError('SCREENSHOT_RULES_UNAVAILABLE');
  return {...saved,rules};
 }
 function change(method,params={}){
  const work=writes.catch(()=>{}).then(async()=>{
   const config=await read();
   if(['initialize-default','save-default','dismiss-default'].includes(method)){
    if(config.defaultHandled)return config;
    const existing=config.rules.some(rule=>rule.name===screenshotDefaultName&&
     (!rule.websites.length||rule.websites.some(site=>site.kind==='all'))&&
     rule.destinations.some(target=>target.bucketName==='redown'&&target.prefix==='screenshots/'));
    if(!existing&&method==='initialize-default'&&(config.revision!==0||config.rules.length))return config;
    if(!existing&&method!=='dismiss-default'){
     const inputs=method==='initialize-default'?[await discoverDefault()]:params.destinations;
     if(method==='initialize-default'&&!inputs[0])return config;
     const rule=validatedRule({ruleId:crypto.randomUUID(),revision:1,name:screenshotDefaultName,
      websites:[{kind:'all'}],destinations:inputs,shortcut:params.shortcut,active:true});
     if(method==='save-default')for(const target of rule.destinations)await authorizeTarget(target);
     config.rules.unshift(rule);
    }
    config.defaultHandled=true;
   }else if(method==='dedup'){
    if(typeof params.enabled!=='boolean')throw screenshotError('SCREENSHOT_RULE_INVALID');
    config.dedup=params.enabled;
   }else{
    const index=config.rules.findIndex(rule=>rule.ruleId===params.ruleId),prior=config.rules[index];
    if(params.ruleId&&!prior)throw screenshotError('SCREENSHOT_RULE_NOT_FOUND');
    if(method==='save'){
     if(prior&&prior.revision!==params.expectedRevision)throw screenshotError('SCREENSHOT_RULE_CHANGED');
     const rule=validatedRule({ruleId:prior?.ruleId??crypto.randomUUID(),revision:(prior?.revision??0)+1,
      name:params.name,websites:params.websites,destinations:params.destinations,shortcut:Object.hasOwn(params,'shortcut')?params.shortcut:prior?.shortcut,active:prior?.active??true});
     const previous=new Set(prior?.destinations.map(targetKey));
     for(const target of rule.destinations)if(!previous.has(targetKey(target)))await authorizeTarget(target);
     if(prior)config.rules[index]=rule;
     else config.rules.unshift(rule);
    }else if(method==='toggle'&&prior&&typeof params.active==='boolean'){
     config.rules[index]={...prior,revision:prior.revision+1,active:params.active};
    }else if(method==='delete'&&prior)config.rules.splice(index,1);
    else throw screenshotError('SCREENSHOT_RULE_INVALID');
   }
   config.revision++;
   await storage.set({[screenshotPreference]:config});
   return config;
  });
  writes=work;
  return work;
 }
 return {read,change};
}

export function screenshotIds(commandId){
 const operationId=crypto.randomUUID();
 return {commandId,signal:screenshotSignal,signalId:crypto.randomUUID(),captureId:crypto.randomUUID(),operationId,jobId:operationId};
}
export function capturePlan({ids,config,context,oneOff,startedAt}){
 const claims=new Map(),matchedRules=[];
 const rules=oneOff?[{active:true,ruleId:null,websites:[],destinations:[oneOff]}]:config.rules;
 const url=ordinaryPage(context.url);
 if(!url)throw screenshotError('SCREENSHOT_PAGE_UNSUPPORTED');
 for(const rule of rules){
  if(!rule.active||rule.shortcut&&rule.shortcut!==ids.commandId||!matchesWebsite(rule.websites,url))continue;
  if(rule.ruleId)matchedRules.push({ruleId:rule.ruleId,name:rule.name});
  for(const target of rule.destinations){
   const identity=JSON.stringify([targetKey(target),config.dedup?null:rule.ruleId]);
   if(!claims.has(identity))claims.set(identity,{target,ruleIds:new Set()});
   const contributors=claims.get(identity).ruleIds;
   if(rule.ruleId)contributors.add(rule.ruleId);
  }
 }
 if(!claims.size)return null;
 const outputs=[...claims.values()].map((intent,index)=>{
  const outputId=ids.captureId+'-'+(index+1);
  return {...intent,ruleIds:[...intent.ruleIds],outputId,key:intent.target.prefix+screenshotFilename(ids.captureId,outputId)};
 });
 return freeze({schemaVersion:1,...ids,startedAt,context,configurationVersion:oneOff?null:config.revision,
  dedup:config.dedup,matchedRuleIds:matchedRules.map(rule=>rule.ruleId),matchedRules,outputs});
}
