/**
 * Assisted proposal: small pure replay reference for observable history.
 * Not a finished provider sync service, entitlement system, or persistence layer.
 * A snapshot is a known state at a sequence; prior snapshots/segments are
 * REQUIRED for historical queries before that sequence.
 */
export class HistoryIntegrityError extends Error {
  constructor(message){super(message);this.name='HistoryIntegrityError';}
}
const clone = value => structuredClone(value);
const assert = (ok, message) => {if(!ok)throw new HistoryIntegrityError(message);};
const isUTC = value => typeof value==='string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value) && Number.isFinite(Date.parse(value));
export function replayAt({snapshot,events,throughSequence}){
  assert(snapshot&&typeof snapshot.namespace==='string'&&snapshot.namespace,'Invalid snapshot namespace');
  assert(Number.isSafeInteger(snapshot.sequence)&&snapshot.sequence>=0,'Invalid snapshot generation');
  assert(snapshot.records&&typeof snapshot.records==='object'&&!Array.isArray(snapshot.records),'Invalid snapshot records');
  assert(Array.isArray(events),'Invalid journal');
  assert(Number.isSafeInteger(throughSequence)&&throughSequence>=snapshot.sequence,'Requested history predates snapshot');
  const records=clone(snapshot.records),processedIds=new Map();
  let sequence=snapshot.sequence;
  for(const event of events){
    if(event.seq>throughSequence)break;
    assert(event.namespace===snapshot.namespace,'Cross-namespace event');
    assert(Number.isSafeInteger(event.seq)&&event.seq>0,'Invalid event sequence');
    assert(typeof event.eventId==='string'&&event.eventId.length>0,'Missing event ID');
    assert(typeof event.entityId==='string'&&event.entityId.length>0,'Missing entity ID');
    assert(isUTC(event.observedAt),'Invalid observation timestamp');
    assert(event.effectiveAt===null||event.effectiveAt===undefined||isUTC(event.effectiveAt),'Invalid effective timestamp');
    assert(event.after===null||(typeof event.after==='object'&&!Array.isArray(event.after)&&event.after!==null),'Invalid event payload');
    const signature=JSON.stringify(event);
    if(processedIds.has(event.eventId)){
      assert(processedIds.get(event.eventId)===signature,'Conflicting retry of event ID');
      continue;
    }
    assert(event.seq===sequence+1,'Noncontiguous or conflicting journal sequence');
    processedIds.set(event.eventId,signature);
    if(Object.hasOwn(event,'before'))assert(JSON.stringify(records[event.entityId]??null)===JSON.stringify(event.before),'Historical precondition mismatch');
    if(event.after===null)delete records[event.entityId];
    else records[event.entityId]=clone(event.after);
    sequence=event.seq;
  }
  assert(sequence===throughSequence,'Journal gap before requested generation');
  return {namespace:snapshot.namespace,sequence,records};
}
