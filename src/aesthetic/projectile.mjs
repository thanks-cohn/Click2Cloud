import {feedbackAccentKey,flightDurations} from './visual-feedback.mjs';

const channel = 'redown-energy-projectile';
const staleAfter = 2200;
const burstDecay = 1250;
const maxDensity = 5;

export function projectileStyle(preferences, accent, energy, random = Math.random) {
  const variation = () => random()*2-1;
  const charge = Math.min(1,Math.max(0,energy/maxDensity));
  const duration = flightDurations[preferences.speed] * (1 + .17*variation()) * (1 - .37*charge);
  const base = preferences.colors === 'theme' && /^#[\da-f]{6}$/i.test(accent ?? '')
    ? accent : `hsl(${Math.round(random()*360)} 96% ${62+Math.round(variation()*8)}%)`;
  return {
    duration:Math.round(duration),
    curve:Math.round(variation()*58),
    color:base,
    white:Math.round(12 + 8*variation() + charge*58),
    trail:Math.round(33 + 11*variation() + charge*12),
    brightness:.77 + .08*variation() + charge*.15
  };
}

export function createProjectileFeedback({chrome, preferences, clock = Date.now, random = Math.random}) {
  const gestures = new WeakMap(), flights = [];
  let accent, palette, paletteChanged = false, density = 0, last = 0;
  chrome.storage?.onChanged?.addListener?.((changes, area) => {
    if (area === 'local' && Object.hasOwn(changes,feedbackAccentKey)) {
      paletteChanged = true;
      accent = changes[feedbackAccentKey].newValue;
    }
  });
  function loadAccent() {
    if (paletteChanged) return;
    return palette ??= Promise.resolve().then(() => chrome.storage?.local?.get(feedbackAccentKey)).then(saved => {
      if (!paletteChanged) accent = saved?.[feedbackAccentKey];
    }, () => {});
  }
  function send(tabId, frameId, message) {
    try { void Promise.resolve(chrome.tabs?.sendMessage?.(tabId,{channel,...message},{frameId})).catch(()=>{}); }
    catch { /* This page may not allow extension content scripts. */ }
  }
  function trim(now) {
    for (let i=flights.length-1; i>=0; i--) if (flights[i].ends<=now) flights.splice(i,1);
  }
  preferences.subscribe(value => {
    if (!value.rapidClicks || !value.projectile) density = 0;
    if (value.projectile) return;
    trim(clock());
    for (const {tabId,frameId} of flights) send(tabId,frameId,{stop:true});
    flights.length = 0;
  });
  function arm(info,tab) {
    if (!Number.isInteger(tab?.id)) return;
    gestures.set(info,{tabId:tab.id,frameId:info.frameId ?? 0,clickedAt:clock()});
  }
  async function play({tabId,frameId,clickedAt}) {
    await preferences.ready;
    if (!preferences.value.projectile || clock()-clickedAt>staleAfter) return;
    if (preferences.value.colors === 'theme') await loadAccent();
    let layout;
    try { layout = await chrome.sidePanel?.getLayout?.(); } catch { /* Placement API can be absent. */ }
    const now = clock(), value = preferences.value;
    if (!value.projectile || now-clickedAt>staleAfter) return;
    const energy = value.rapidClicks ? Math.max(0,density-(now-last)/burstDecay) : 0;
    density = value.rapidClicks ? Math.min(maxDensity,energy+1) : 0;
    last = now;
    trim(now);
    if (flights.length>=4) return;
    const style = projectileStyle(value,accent,energy,random);
    flights.push({tabId,frameId,ends:now+style.duration+180});
    send(tabId,frameId,{clickedAt,side:layout?.side==='left'?'left':'right',style});
  }
  function forClick(info) {
    const gesture = gestures.get(info);
    gestures.delete(info);
    if (!gesture) return;
    let played = false;
    return () => {
      if (played) return;
      played = true;
      void play(gesture).catch(()=>{});
    };
  }
  return {arm,forClick};
}
