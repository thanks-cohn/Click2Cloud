export interface Target {provider:string;connectionId:string;accountId:string;bucketName:string;prefix:string}
export type Mode='simple'|'narrow';
export interface Show {simple:boolean;narrow:boolean;depth:boolean;flat:boolean}
export interface Destination {id:string;target:Target;label?:string;aliases?:string[]}
export interface Configuration {schemaVersion:1;revision:number;configs:{simple:{revision:number;destinations:Destination[]};nested:{revision:number;destinations:Destination[]};depth:{revision:number;scopes:{target:Target;maxDepth:number}[]}};show:Show;previousShow:Omit<Show,'flat'>;flatDefault:Target|null}
export type Change = {type:'createDestination';mode:Mode;target:Target;label?:string;aliases?:string[]}|{type:'updateDestination';mode:Mode;id:string;label?:string;aliases?:string[]}|{type:'deleteDestinationConfig';mode:Mode;id:string}|{type:'setDepthDisplayBuckets';scopes:{target:Target;maxDepth:number}[]}|{type:'setShowInChrome';show:Partial<Show>}|{type:'setFlatDefault';target:Target}|{type:'updateRecoveryPolicy';policy:RecoveryPolicy}|{type:'batch';changes:Change[]};
export interface Params {
 describeCapabilities:Record<string,never>;getEngineHealth:Record<string,never>;getConfiguration:Record<string,never>;
 listDestinations:{mode?:Mode;limit?:number;cursor?:string};previewNativeMenu:Record<string,never>;inspectNativeACK:Record<string,never>;
 listAccounts:Record<string,never>;listAuthorizedBuckets:{accountId:string;cursor?:string};listFolders:{source:{accountId:string;bucketName:string;prefix:string};cursor?:string};
 previewConfigChange:{change:Change;expectedRevision:number};commitConfigChange:{previewId:string;expectedRevision:number;idempotencyKey:string};
 requestRestorePreview:{recoveryPoint:Record<string,unknown>;expectedRevision:number};restoreRightClickMenu:{previewId:string;expectedRevision:number;idempotencyKey:string};
 reconcileNativeMenu:Record<string,never>;dispatchSave:{itemId:string;generation:number;context:'image'|'link';source:{url?:string;bytes?:Uint8Array;filename:string};idempotencyKey:string};
}
export interface EngineApi {readonly tools:readonly unknown[]}
export function createEngineApi(options:{engine:unknown;current:unknown;fileApi?:unknown;getInventory?:()=>Promise<unknown>;authorize:(request:unknown)=>boolean|Promise<boolean>;confirm?:(request:unknown)=>boolean|Promise<boolean>;recovery?:unknown;clock?:()=>number}):EngineApi;
export interface RecoveryPolicy {cadence:'weekly'|'daily';simple:boolean;narrow:boolean;buckets:{target:Target;maxDepth:number}[];backupLocation:'automatic'|'documents'}
export interface Configuration {recoveryPolicy:RecoveryPolicy}
export interface CloudIdentity {provider:string;connectionId:string;accountId:string}
export interface Params {listRecoveryPolicies:Record<string,never>;inspectBackupRoots:Record<string,never>;inspectWholeCloudJobs:{identity:CloudIdentity};enableWholeCloudJob:{identity:CloudIdentity;cadence?:'weekly'|'daily'};disableWholeCloudJob:{identity:CloudIdentity}}
export interface NativeOutcome {state:'completed'|'partial'|'failed'|'blocked'|'uncertain';code:string;generation?:number;appliedGeneration?:number|null}
export interface CommitResult {version:1;revision:number;native:NativeOutcome;backup:{state:string;code?:string;receipts?:unknown[]}}
export interface PreviewResult {previewId:string;expectedRevision:number;configuration:Configuration;diff:{changes:unknown[];equivalent:boolean};requiresConfirmation:true}
export interface Results {getConfiguration:Configuration;listRecoveryPolicies:RecoveryPolicy;listDestinations:{items:Destination[];total:number;nextCursor:string|null};previewConfigChange:PreviewResult;requestRestorePreview:PreviewResult;commitConfigChange:CommitResult;restoreRightClickMenu:CommitResult;reconcileNativeMenu:NativeOutcome;dispatchSave:NativeOutcome}
export interface EngineApi {invoke<M extends keyof Params>(request:{version:1;method:M;params?:Params[M]},actor:string):Promise<M extends keyof Results?Results[M]:Record<string,unknown>>}
