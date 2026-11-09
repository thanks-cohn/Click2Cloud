import {selectionMatches,metadataJSON} from './provenance.mjs';
import {equal} from './common.mjs';
export function acceptProof(intent,receipt,proof){
 return equal(intent.destination,receipt?.destination)&&equal(intent.destination,proof?.destination)&&receipt.operationId===intent.operationId&&proof.operationId===intent.operationId&&
 typeof receipt.key==='string'&&receipt.key.startsWith(intent.destination.prefix?intent.destination.prefix+'/':'')&&receipt.key.slice(intent.destination.prefix?intent.destination.prefix.length+1:0).length>0&&
 !receipt.key.slice(intent.destination.prefix?intent.destination.prefix.length+1:0).includes('/')&&
 Number.isSafeInteger(receipt.size)&&receipt.size>=0&&!!receipt.etag&&!!receipt.version&&
 ['key','size','etag','version'].every(k=>proof[k]===receipt[k])&&(!intent.provenance||(selectionMatches(intent.provenance,proof.provenance)&&metadataJSON(proof.provenance)===metadataJSON(receipt.provenance)&&proof.provenance.operationId===intent.operationId&&proof.provenance.storedFilename===receipt.key.slice(intent.destination.prefix?intent.destination.prefix.length+1:0)));
}
