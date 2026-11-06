import {cloudflareR2Writer} from '../../right2cloud-module/src/cloudflare-r2-writer.mjs';
// The only production writer. Future writers are injected by trusted host code,
// never selected from an endpoint or registry supplied by a transfer request.
export function destinationWriter(cap,ports={},factories={'cloudflare-r2':c=>cloudflareR2Writer(c.storage,ports)}){
 const factory=Object.hasOwn(factories,cap.destination.provider)&&factories[cap.destination.provider];
 if(typeof factory!=='function')throw Error('WRITER_NOT_SUPPORTED');
 const writer=factory(cap);
 if(writer.kind!==cap.destination.provider||writer.capabilities?.conditionalCreate!==true||!['prepare','write','verify'].every(k=>typeof writer[k]==='function'))throw Error('WRITER_NOT_SUPPORTED');
 return writer;
}
