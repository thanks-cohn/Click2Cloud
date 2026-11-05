// JSON-lines in-process adapter. No TCP listener, credentials or hard-coded grants.
// A trusted host module exports createSession(): {api, actor}; it owns consent/persistence/Chrome.
import {createInterface} from 'node:readline';
import {pathToFileURL} from 'node:url';
const host=process.argv[2];if(!host){console.error('Usage: node scripts/agent-client.mjs /absolute/trusted-host.mjs');process.exit(2);}
const {api,actor}=await (await import(pathToFileURL(host))).createSession();
for await(const line of createInterface({input:process.stdin,crlfDelay:Infinity})) {
 if(Buffer.byteLength(line)>65536){console.log(JSON.stringify({ok:false,code:'REQUEST_TOO_LARGE'}));continue;}
 try{const request=JSON.parse(line);const data=await api.invoke(request,actor);const text=JSON.stringify({ok:true,data});console.log(text.length<=262144?text:JSON.stringify({ok:false,code:'RESPONSE_TOO_LARGE'}));}
 catch(error){console.log(JSON.stringify({ok:false,code:/^[A-Z_]+$/.test(error.code)?error.code:'REQUEST_FAILED'}));}
}
