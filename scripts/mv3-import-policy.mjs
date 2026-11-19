import {build} from 'esbuild';
import {resolve,relative} from 'node:path';
// Use the JS parser/resolver, not a text grep: comments and page-only modules
// do not belong to the manifest service-worker dependency graph.
export async function inspectWorkerImports({root=process.cwd(),entry='extension/background.mjs'}={}){
 const result=await build({absWorkingDir:root,entryPoints:[entry],bundle:true,write:false,metafile:true,platform:'browser',format:'esm',logLevel:'silent',logOverride:{'unsupported-dynamic-import':'warning'}});
 const modules=Object.keys(result.metafile.inputs).sort(),violations=[];
 for(const [file,input] of Object.entries(result.metafile.inputs))for(const dependency of input.imports)if(dependency.kind==='dynamic-import')violations.push({file,dependency:dependency.original??dependency.path,reason:'dynamic_import_unsupported_in_service_worker'});
 for(const warning of result.warnings)if(warning.id==='unsupported-dynamic-import')violations.push({file:warning.location?.file,dependency:'nonliteral',line:warning.location?.line,reason:'dynamic_import_unsupported_in_service_worker'});
 return {entry:relative(root,resolve(root,entry)),modules,violations};
}
export async function assertWorkerImports(options){const report=await inspectWorkerImports(options);if(report.violations.length)throw Object.assign(Error('MV3_DYNAMIC_IMPORT_FORBIDDEN'),{report});return report;}
