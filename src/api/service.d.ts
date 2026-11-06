/** V3+1.1 trusted in-process contract. Runtime JSON Schemas are toolRegistry in service.mjs. */
export type Version = '3+1.1';
export interface Target {provider:string;connectionId:string;accountId:string;bucketName:string;prefix:string}
export interface Level {hidden?:boolean;label?:string}
export interface Destination {id:string;target:Target;label?:string;hidden?:boolean;quick?:boolean;order?:number;levels?:Record<string,Level>}
export type Mode = 'simple'|'nested'|'narrow';
export interface Show {simple:boolean;nested:boolean;depth:boolean;flat:boolean}
export interface RecoveryPolicy {cadence:'weekly'|'daily';simple:boolean;nested:boolean;location:'automatic'|'documents';buckets:{target:Target;enabled:boolean;depth:number}[]}
export type Change =
 | {type:'createDestination';mode:Mode;target:Target;label?:string;levels?:Record<string,Level>}
 | {type:'updateDestination';mode:Mode;id:string;label?:string;levels?:Record<string,Level>;hidden?:boolean;quick?:boolean;order?:number}
 | {type:'deleteDestinationConfig';mode:Mode;id:string}
 | {type:'setShowInChrome';show:Show}
 | {type:'setDepthDisplayBuckets';scopes:{target:Target;maxDepth:number}[]}
 | {type:'makeDefault';target:Target}
 | {type:'setTheme';theme:'dark'|'light'}
 | {type:'setView';view:'details'|'list'}
 | {type:'setFavorite';connectionId:string;favorite:boolean}
 | {type:'setProviderPlacement';provider:string;placement:'direct'|'other'}
 | {type:'dismissOrganizationSuggestion';signature:string}
 | {type:'updateRecoveryPolicy';policy:RecoveryPolicy};
export interface Identity {provider:string;connectionId:string;accountId:string}
export interface Methods {
 inspectCloudflare:{};checkCloudflareR2:{accountId?:string;target?:Target};selectCloudflareAccount:{accountId:string};openCloudflareActivation:{accountId:string};
 approveCloudflareSetup:{accountId:string;expectedRevision:number;idempotencyKey:string};repairCloudflareDestination:{accountId:string;target?:Target;expectedRevision:number;idempotencyKey:string};
 invokeProviderAction:{provider:'cloudflare'|'google-drive'|'dropbox'|'onedrive';generation?:number;source?:{url:string;filename:string};idempotencyKey:string};inspectRemoteHistory:{};inspectRemoteReceipt:{operationId:string};
 inspectExplorerContextMenu:{target:Target};previewContextMenu:{context?:'image'|'link'|'page'|'selection'|'video'|'audio'};describeCapabilities:{};getConfiguration:{};getEngineHealth:{};getProviderConnections:{};
 loginBegin:{};loginStatus:{};loginCancel:{};disconnect:{};
 listAccounts:{};listAuthorizedBuckets:{accountId:string;cursor?:string};listFolders:{source:Target;cursor?:string};
 fileMetadata:{source:Target;key:string};readFile:{source:Target;entry:{key:string;folder:false}};
 listDestinations:{mode?:Mode;cursor?:string;limit?:number};inspectMenuTree:{generation:number;cursor?:string;limit?:number;parentId?:string;recursive?:boolean;includeOmissions?:boolean};previewNativeMenu:{};inspectNativeACK:{};getOrganizationSuggestion:{};
 previewConfigChange:{changes:Change[];expectedRevision:number};
 commitConfigChange:{changes:Change[];expectedRevision:number;idempotencyKey:string};
 reconcileNativeMenu:{expectedGeneration:number};inspectRecoveryCoverage:{target:Target};runRecoveryPage:{target:Target};inspectBackupRoots:{};chooseBackupLocation:{};listRecoveryPolicies:{};writeRecovery:{};
 requestRestorePreview:{};restoreRightClickMenu:{expectedRevision:number;idempotencyKey:string};
 inspectWholeCloudJobs:{};enableWholeCloudJob:{identity:Identity;cadence?:'weekly'|'daily'};disableWholeCloudJob:{identity:Identity};
 dispatchExplorerSave:{itemId:string;generation:number;context?:'image'|'link';source:Target;entry:{key:string;folder:false;displayName?:string;contentType?:string};idempotencyKey:string};
 dispatchSave:{itemId:string;generation:number;context?:'image'|'link';source:{filename:string;url?:string;bytes?:number[];contentType?:string};idempotencyKey:string};
}
export type Request<K extends keyof Methods=keyof Methods> = K extends keyof Methods?{version:Version;method:K;params:Methods[K]}:never;
export interface Receipt {operationId:string;method:string;before?:number;after?:number;replayed?:boolean}
export interface Response<T=unknown> {version:Version;state:'completed'|'partial'|'blocked'|'failed'|'uncertain'|'cancelled';code:string;data?:T;receipt:Receipt}
export type CloudflareReadinessState = 'READY'|'ACTIVE'|'NOT_ACTIVATED'|'RECONNECT_REQUIRED'|'INSUFFICIENT_PERMISSION'|'ACCOUNT_AMBIGUOUS'|'NETWORK_UNAVAILABLE'|'UNKNOWN'|'CHOOSE_DESTINATION'|'DESTINATION_UNAVAILABLE'|'REPAIR_REQUIRED'|'SETUP_APPROVAL_REQUIRED';
export interface CloudflareReadiness {state:CloudflareReadinessState;statusCheckMs?:number;fromCache?:boolean;checkedAt?:number;code?:string;accountId?:string;target?:Target;accounts?:{id:string;name?:string}[];worker?:{state:'READY'|'PREPARED'|'blocked';code?:string;checkedAt?:number;maxBytes?:number;maxBufferBytes?:number;allowedHosts?:string[]}}
export interface RemoteDestination {provider:'cloudflare-r2';connectionId:string;accountId:string;bucketName:string;prefix:string;conflictPolicy:'keep-both'}
export interface RemoteReceipt {destination:RemoteDestination;operationId:string;key:string;size:number;etag:string;version:string;workerTimings?:Record<string,number>}
export interface RemoteOperation {state:'verified'|'completed'|'partial'|'blocked'|'failed'|'uncertain'|'cancelled';code:string;operationId?:string|number;remoteOperationId?:string;kind?:'save'|'readiness';destination?:RemoteDestination;receipt?:RemoteReceipt;proofKind?:'independent-head-version-size';durationMs?:number;timings?:Record<string,number>;reconciliation?:RemoteOperation}
export interface CloudflareSetupResult {state:'completed'|'blocked'|'uncertain';code:string;target?:Target;probe?:RemoteReceipt;provisionMs?:number;durationMs?:number;probeRetention?:string}
export interface Results {
 inspectCloudflare:{onboarding:{initialized:string[];pending:string[];selectedAccountId:string|null};status:CloudflareReadiness;limits:{knownLength:number;unknownLength:number};sourcePolicy:string[]};
 checkCloudflareR2:CloudflareReadiness;selectCloudflareAccount:CloudflareReadiness;
 openCloudflareActivation:{state:'completed'|'blocked';code?:string;url?:string;setupPending?:boolean;accountId?:string};
 approveCloudflareSetup:CloudflareSetupResult;repairCloudflareDestination:CloudflareSetupResult;invokeProviderAction:RemoteOperation;dispatchSave:RemoteOperation;
 inspectRemoteHistory:RemoteOperation[];inspectRemoteReceipt:RemoteOperation;
}
export interface EngineApi {invoke<K extends keyof Methods>(request:Request<K>,authenticatedActor:string):Promise<Response<K extends keyof Results?Results[K]:unknown>>;readonly tools:readonly Tool[]}
export interface Tool {name:keyof Methods;scope:'inspect'|'configure'|'auth'|'execute'|'restore'|'provision';version:Version;inputSchema:object;outputSchema:object;effectful:boolean;transport:'trusted-local'}
export interface Grant {actor:string;methods:(keyof Methods)[];accounts:string[];expiresAt:number;allConfiguration?:boolean;interactiveAuth?:boolean}
export interface AgentGateway {request(handle:string,request:Request,authenticatedActor:string):Promise<Response>;grant(grant:Grant):string;revoke(handle:string):boolean}
