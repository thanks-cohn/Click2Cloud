import {createLocalPreference} from '../chrome/local-preference.mjs';

export const visualFeedbackKey = 'aestheticVisualFeedbackV1';
export const feedbackAccentKey = 'aestheticFeedbackAccentV1';
export const feedbackSwitches = Object.freeze({
  cardPulse:'Provider card success pulse',
  projectile:'Energy projectile',
  rapidClicks:'Rapid-click escalation',
  toolbar:'Toolbar transmission',
  notifications:'Save notifications when Shelf is closed',
});
export const flightDurations = Object.freeze({slow:850,normal:475,fast:250});
const colorModes = ['random','theme'];

export function normalizeVisualFeedback(value) {
  const flags = Object.fromEntries(Object.keys(feedbackSwitches).map(key => [key,value?.[key] !== false]));
  return Object.freeze({...flags,
    speed:Object.hasOwn(flightDurations,value?.speed) ? value.speed : 'normal',
    colors:colorModes.includes(value?.colors) ? value.colors : 'random'
  });
}

export function createVisualFeedbackPreference(storage) {
  return createLocalPreference(storage,visualFeedbackKey,normalizeVisualFeedback);
}
