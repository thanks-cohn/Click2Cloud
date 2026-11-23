const commands=new Set(['screenshot.capture.alt-q','screenshot.capture.ctrl-shift-y','shelf.explorer.search','shelf.history.toggle']);
const phases=new Set([
 'COMMAND_RECEIVED','HANDLER_ENTERED','UI_TARGET_RESOLVED','UI_READY','ACTION_DISPATCHED',
 'ACTION_ACKNOWLEDGED','UI_STATE_VERIFIED','WINDOW_RESOLVED','TAB_RESOLVED','PAGE_ELIGIBLE',
 'DOCUMENT_VERIFIED','RULES_MATCHED','CAPTURE_REQUESTED','PNG_CAPTURED','CLOUD_SAVE',
 'VERIFIED_RECEIPT','HISTORY_RECORDED','FAILED','FEEDBACK','SUPERSEDED'
]);
const outcomes=new Set(['started','ok','pending','blocked','failed','unknown','confirmed','partial','interrupted','no-match']);
const nativeMessages=[
 [/^`?sidePanel\.open\(\)`? may only be called in response to a user gesture\.$/i],
 [/^Either the '<all_urls>' or 'activeTab' permission is required\.$/],
 [/^(?:The )?MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND quota exceeded\.?$/i],
 [/^Taking screenshots has been disabled(?: by (?:policy|DLP))?\.$/i],
 [/^Cannot access contents of url "[^"\r\n]+"\. Extension manifest must request permission to access this host\.$/i,
  'Cannot access contents of url "[redacted]". Extension manifest must request permission to access this host.'],
 [/^No active web contents to capture$/],
 [/^No active side panel for windowId: (?:-?\d+|\[redacted\])\.?$/i,'No active side panel for windowId: [redacted]'],
 [/^No browser window for windowId: (?:-?\d+|\[redacted\])\.?$/i,'No browser window for windowId: [redacted]'],
 [/^No window with id: (?:-?\d+|\[redacted\])\.?$/i,'No window with id: [redacted]'],
 [/^No tab with id: (?:-?\d+|\[redacted\])\.?$/i,'No tab with id: [redacted]'],
 [/^Could not establish connection\. Receiving end does not exist\.$/],
 [/^The message port closed before a response was received\.$/]
];

export const shortcutIdentity=(commandId,correlationId=crypto.randomUUID())=>({commandId,correlationId});
export function shortcutRecord(event,{raw=false}={}){
 if(!commands.has(event?.commandId)||!/^[a-f0-9-]{36}$/i.test(event?.correlationId??'')||
    !phases.has(event.phase)||!outcomes.has(event.outcome))return null;
 const {commandId,correlationId,phase,outcome}=event;
 const message=typeof event.chromeMessage==='string'&&event.chromeMessage.length<=200?event.chromeMessage:'';
 const matched=raw?nativeMessages.find(([pattern])=>pattern.test(message)):null;
 const sanitized=matched?.[1]??(matched?message:undefined);
 return {commandId,correlationId,phase,outcome,
  ...(Number.isSafeInteger(event.at)&&event.at>=0?{at:event.at}:{}),
  ...(Number.isSafeInteger(event.epoch)&&event.epoch>=0?{epoch:event.epoch}:{}),
  ...(/^[A-Z][A-Z0-9_]{1,79}$/.test(event.code??'')?{code:event.code}:{}),
  ...(typeof event.commandTab==='boolean'?{commandTab:event.commandTab}:{}),
  ...(['window-observation','tab-observation','page-eligibility','rule-matching','capture-preparation','capture-api','png-validation','r2-upload']
   .includes(event.failureStage)?{failureStage:event.failureStage}:{}),
  ...(/^[a-z-]{3,48}$/.test(event.browserError??'')?{browserError:event.browserError}:{}),
  ...(sanitized?{chromeMessage:sanitized}:{})};
}
