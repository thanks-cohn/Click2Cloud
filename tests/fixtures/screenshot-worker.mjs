import {build} from 'esbuild';
import {Miniflare} from 'miniflare';

export const fixtureTarget={provider:'cloudflare',connectionId:'cloudflare:qa-screen',accountId:'qa-screen',bucketName:'qa-screenshots',prefix:''};
export const fixtureSecret='disposable-screenshot-fixture-signing-key';
export const fixtureSession='disposable-screenshot-session';
export async function localScreenshotWorker({codeDigest='screenshot-fixture',prefixScope='',r2Persist}={}){
 const code=(await build({entryPoints:['src/cloudflare/worker.mjs'],bundle:true,write:false,format:'esm',platform:'browser'})).outputFiles[0].text;
 const worker=new Miniflare({modules:true,script:code,compatibilityDate:'2026-01-01',r2Buckets:['STORAGE'],r2Persist,
  durableObjects:{CLAIMS:{className:'RemoteClaims',useSQLite:true}},bindings:{SIGNING_KEY:fixtureSecret,ACCOUNT_ID:fixtureTarget.accountId,
   BUCKET_NAME:fixtureTarget.bucketName,CODE_DIGEST:codeDigest,PREFIX_SCOPE:prefixScope}});
 await worker.ready;
 return worker;
}
