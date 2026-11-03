/**
 * Click2Cloud Simple original proposition — Cloudflare activation gate.
 * Pure decision model; no provider calls, Chrome API or browser session access.
 *
 * The Cloudflare onboarding link is the official Cloudflare R2 Dashboard
 * "Go to Overview" link (Cloudflare R2 get-started, verified 2026-11-03).
 */
export const R2_SETUP_URL='https://dash.cloudflare.com/?to=/:account/r2/overview';
export const MENU_CONTEXTS=Object.freeze(['link','image','video','audio','page']);

/**
 * Ready-to-project Cloudflare Simple surface.
 * cloudflareSession: 'verified'|'missing'|'unknown'|'expired'
 * r2Subscription: 'active'|'inactive'|'unknown'
 * validSaveTargets: array of independently verified, authorized targets.
 *
 * A connected Cloudflare account is NOT evidence that R2 is active.
 * A verified R2 subscription is NOT evidence a bucket is writable.
 */
export function decideSimpleCloudflare({cloudflareSession='unknown',r2Subscription='unknown',validSaveTargets=[]}={}){
  if(!Array.isArray(validSaveTargets))throw new TypeError('validSaveTargets must be an array');
  const ready=cloudflareSession==='verified'&&r2Subscription==='active';
  if(!ready||validSaveTargets.length===0){
    return Object.freeze({
      mode:'flat-setup',title:'Cloudflare',target:null,
      action:{kind:'open-r2-setup',url:R2_SETUP_URL},
      reason:cloudflareSession!=='verified'?'cloudflare-login-required'
        :r2Subscription!=='active'?'r2-activation-required':'no-authorized-bucket',
      children:[],
    });
  }
  if(validSaveTargets.length===1){
    return Object.freeze({mode:'flat-save',title:'Cloudflare',
      action:{kind:'save',target:validSaveTargets[0]},target:validSaveTargets[0],children:[]});
  }
  return Object.freeze({mode:'nested',title:'Cloudflare',
    target:null,action:null,children:validSaveTargets.map(target=>({kind:'save',target}))});
}
