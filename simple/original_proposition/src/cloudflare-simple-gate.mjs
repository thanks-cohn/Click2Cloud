/**
 * SIMPLE only — Cloudflare's progressive R2 onboarding and automatic
 * flat bucket selection. No references to Depth, Narrow, or Time Machine.
 * This is a PURE reference decision model, not wired to Chrome/provider APIs.
 */
export const R2_SETUP_URL = 'https://dash.cloudflare.com/?to=/:account/r2/overview';
export const DEFAULT_BUCKET = 'redown';
export const MENU_CONTEXTS = Object.freeze(['link','image','video','audio','page']);

const keyOf = target => String(target?.bucketName ?? '');
const rootOf = target => target?.prefix === '' && typeof target?.bucketName === 'string';
const sameAccount = (target,accountId) => target?.accountId === accountId;
const compareName = (a,b) => a < b ? -1 : a > b ? 1 : 0;

/**
 * A user's explicitly unchecked buckets persist through refreshes.
 * autoIncludeNew defaults true, but becomes false when the user unchecks
 * their last additional bucket. A new bucket must not silently destroy
 * their deliberately chosen flat-Cloudflare preference.
 */
export function newSimpleBucketSelection(accountId){
  if(typeof accountId !== 'string' || !accountId) throw new TypeError('Expected exact Cloudflare account ID');
  return {version:1,accountId,revision:0,autoIncludeNew:true,hiddenBucketNames:[]};
}
export function selectedSimpleBuckets(selection,availableBucketNames){
  const hidden = new Set(selection?.hiddenBucketNames || []);
  const names = [...new Set(availableBucketNames.filter(n=>typeof n==='string' && n && n !== DEFAULT_BUCKET))].sort(compareName);
  return names.filter(name=>!hidden.has(name) && (selection?.autoIncludeNew !== false || (selection?.knownBucketNames || []).includes(name)));
}
/**
 * Toggle an eligible non-default bucket, with exact account-specific state.
 * 'knownBucketNames' freezes the discovered baseline when all extras are
 * unchecked; newly discovered buckets then remain unchecked by default.
 */
export function toggleSimpleBucket(selection,bucketName,checked,availableBucketNames){
  if(!selection || selection.version!==1)throw new TypeError('Invalid Simple bucket selection');
  if(typeof bucketName!=='string'||!bucketName||bucketName===DEFAULT_BUCKET)
    throw new TypeError('The redown default cannot be unchecked');
  const available = [...new Set(availableBucketNames)].filter(n=>typeof n==='string'&&n!==DEFAULT_BUCKET);
  if(!available.includes(bucketName))throw new TypeError('Cannot select an unknown bucket');
  const currentKnown=new Set(selection.knownBucketNames||available);
  const hidden=new Set(selection.hiddenBucketNames||[]);
  if(checked)hidden.delete(bucketName);else hidden.add(bucketName);
  let autoIncludeNew=selection.autoIncludeNew!==false;
  if(!checked && available.every(n=>hidden.has(n)))autoIncludeNew=false;
  // An explicit user change establishes a known baseline. With autoIncludeNew
  // false, future buckets are excluded until the user enables auto-add again.
  currentKnown.add(bucketName);
  return {version:1,accountId:selection.accountId,revision:selection.revision+1,
    autoIncludeNew,knownBucketNames:[...new Set([...currentKnown,...available])].sort(compareName),
    hiddenBucketNames:[...hidden].sort(compareName)};
}
export function setSimpleAutoIncludeNew(selection,enabled,availableBucketNames){
  if(!selection||selection.version!==1)throw new TypeError('Invalid Simple selection');
  const available=[...new Set(availableBucketNames)].filter(n=>n!==DEFAULT_BUCKET);
  return {...selection,revision:selection.revision+1,autoIncludeNew:!!enabled,
    knownBucketNames:[...new Set([...(selection.knownBucketNames||[]),...available])].sort(compareName)};
}

/**
 * validSaveTargets contains independently verified and authorized bucket
 * roots and optionally explicit configured Simple folder targets.
 * Merely listing a bucket is not proof its destination can receive bytes.
 *
 * By default, every verified non-redown BUCKET ROOT is visible, without
 * hand-entering an alias or switching to any other menu mode.
 */
export function decideSimpleCloudflare({
  cloudflareSession='unknown', cloudflareAccountId=null,
  r2Subscription='unknown',validSaveTargets=[],selection=null
}={}){
  if(!Array.isArray(validSaveTargets))throw new TypeError('validSaveTargets must be an array');
  const setup=(reason,action)=>({mode:'flat-setup',title:'Cloudflare',target:null,reason,action,children:[]});
  if(cloudflareSession!=='verified')return setup('cloudflare-login-required',{kind:'start-cloudflare-login'});
  if(typeof cloudflareAccountId!=='string'||!cloudflareAccountId)return setup('choose-cloudflare-account',{kind:'choose-cloudflare-account'});
  if(r2Subscription!=='active')return setup('r2-activation-required',{kind:'open-r2-setup',url:R2_SETUP_URL});
  if(selection && selection.accountId!==cloudflareAccountId)
    return setup('account-selection-mismatch',{kind:'choose-cloudflare-account'});

  const roots=validSaveTargets.filter(x=>sameAccount(x,cloudflareAccountId)&&rootOf(x));
  const redown=roots.find(x=>keyOf(x)===DEFAULT_BUCKET);
  if(!redown)return setup('redown-not-prepared',{kind:'ensure-redown-bucket',accountId:cloudflareAccountId});

  const extras=[];
  const seen=new Set([DEFAULT_BUCKET]);
  for(const target of roots){
    const name=keyOf(target);
    if(seen.has(name))continue;
    seen.add(name);extras.push(target);
  }
  extras.sort((a,b)=>compareName(keyOf(a),keyOf(b)));
  const chosenNames=new Set(selectedSimpleBuckets(selection,extras.map(keyOf)));
  const enabledExtras=extras.filter(target=>chosenNames.has(keyOf(target)));
  // Real configured folder shortcuts, if present, are a separate explicit
  // Simple setting; bucket checkboxes never fabricate a folder destination.
  const configured=validSaveTargets.filter(x=>sameAccount(x,cloudflareAccountId)&&
    x?.prefix!==''&&x?.configured===true&&typeof x?.prefix==='string');
  const children=[{kind:'save',title:DEFAULT_BUCKET,target:redown,role:'default'},
    ...enabledExtras.map(target=>({kind:'save',title:target.bucketName,target,role:'bucket'})),
    ...configured.map(target=>({kind:'save',title:target.label||target.prefix.split('/').at(-1),
      target,role:'configured'}))];

  if(children.length===1)return {mode:'flat-save',title:'Cloudflare',
    action:{kind:'save',target:redown},target:redown,children:[]};
  return {mode:'nested',title:'Cloudflare',action:null,target:null,children};
}
