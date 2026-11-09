/** V3+1.1 trusted in-process contract. Runtime JSON Schemas are toolRegistry in service.mjs. */
export type Version = '3+1.1';
export interface GalleryLoadingVisual {warning?:'LOADING_MEDIA_INVALID';revision:number;mode:'math'|'media'|'plain';media:{name:string;type:string;size:number;base64?:string}|null}
export interface Target {provider:string;connectionId:string;accountId:string;bucketName:string;prefix:string}
export interface Level {hidden?:boolean;label?:string}
export interface Destination {id:string;target:Target;label?:string;hidden?:boolean;quick?:boolean;order?:number;visibilityMode?:'all'|'hide-all'|'custom';levels?:Record<string,Level>}
export type Mode = 'simple'|'nested'|'narrow';
export interface Show {simple:boolean;nested:boolean;depth:boolean;flat:boolean}
export interface RecoveryPolicy {cadence:'weekly'|'daily';simple:boolean;nested:boolean;location:'automatic'|'documents';buckets:{target:Target;enabled:boolean;depth:number}[]}
export type Change =
 | {type:'createDestination';mode:Mode;target:Target;label?:string;visibilityMode?:'all'|'hide-all'|'custom';levels?:Record<string,Level>}
 | {type:'updateDestination';mode:Mode;id:string;label?:string;visibilityMode?:'all'|'hide-all'|'custom';levels?:Record<string,Level>;hidden?:boolean;quick?:boolean;order?:number}
 | {type:'deleteDestinationConfig';mode:Mode;id:string}
 | {type:'setShowInChrome';show:Show}
 | {type:'setDepthDisplayBuckets';scopes:{target:Target;maxDepth:number;hidden?:boolean}[]}
 | {type:'makeDefault';target:Target}
 | {type:'clearDefault'}
 | {type:'setTheme';theme:'dark'|'light'}
 | {type:'setExplorerLayout';explorerLayout:{split:number;toolbarRows:number}}
 | {type:'setView';view:'details'|'list'|'grid'}
 | {type:'setFavorite';connectionId:string;favorite:boolean}
 | {type:'setProviderPlacement';provider:string;placement:'direct'|'other'}
 | {type:'setProviderMenuVisibility';provider:'google-drive'|'dropbox'|'onedrive'|'cloudflare';visible:boolean}
 | {type:'setAutoOpenAttention';visible:boolean}
 | {type:'dismissOrganizationSuggestion';signature:string}
 | {type:'updateRecoveryPolicy';policy:RecoveryPolicy};
export interface Identity {provider:string;connectionId:string;accountId:string}
export interface Methods {
 fileAction:{action:'mkdir'|'copy'|'move'|'rename'|'delete';source:Target;destination?:Target;entry?:{key:string;folder:boolean;displayName?:string};name?:string;conflict?:'keep'|'skip'|'replace';idempotencyKey:string};
 initializeCloudflare:{resume?:boolean};inspectShelfAttention:{};openCloudflareDestinations:{};inspectCloudflare:{};checkCloudflareR2:{accountId?:string;target?:Target};selectCloudflareAccount:{accountId:string};openCloudflareActivation:{accountId:string};
 approveCloudflareSetup:{accountId:string;expectedRevision:number;idempotencyKey:string};repairCloudflareDestination:{accountId:string;target?:Target;expectedRevision:number;idempotencyKey:string};
 invokeProviderAction:{provider:'cloudflare'|'google-drive'|'dropbox'|'onedrive';generation?:number;source?:{url:string;filename:string;responseFilename?:boolean};idempotencyKey:string};inspectRemoteHistory:{cursor?:string;limit?:number};inspectRemoteReceipt:{operationId:string;target?:Target};inspectCloudflareSetup:{accountId:string;idempotencyKey:string};cancelRemoteOperation:{target:Target;operationId:string};openRemoteResult:{operationId:string};refreshExplorer:{source:Target;cursor?:string};enterExplorer:{};navigateExplorer:{target:Target};readFileChunk:{source:Target;key:string;offset:number;etag?:string;length?:number};
 inspectExplorerContextMenu:{target:Target;entry?:{key:string;folder:boolean;displayName?:string};hasClipboard?:boolean};previewContextMenu:{context?:'image'|'link'|'video'|'audio'|'page'|'selection'};describeCapabilities:{section?:'reliability'};getConfiguration:{};getEngineHealth:{view?:'health'|'trace'|'support';operationId?:number;cursor?:string;limit?:number};getProviderConnections:{};
 getGalleryLoadingVisual:{includeMedia?:boolean};setGalleryLoadingVisual:{expectedRevision:number;mode:'math'|'media'|'plain';removeMedia?:boolean;media?:{name:string;type:'image/png'|'image/jpeg'|'image/webp'|'image/gif'|'video/mp4';base64:string}};
 loginBegin:{verifyOnly?:boolean};loginStatus:{};loginCancel:{};disconnect:{};
 listAccounts:{};listAuthorizedBuckets:{accountId:string;cursor?:string};listFolders:{source:Target;cursor?:string};
 fileMetadata:{source:Target;key:string};readFile:{source:Target;entry:{key:string;folder:false}};
 listDestinations:{mode?:Mode|'depth';cursor?:string;limit?:number};inspectMenuTree:{generation:number;cursor?:string;limit?:number;parentId?:string;recursive?:boolean;includeOmissions?:boolean};previewNativeMenu:{};inspectNativeACK:{};getOrganizationSuggestion:{};
 previewConfigChange:{changes:Change[];expectedRevision:number};
 commitConfigChange:{changes:Change[];expectedRevision:number;idempotencyKey:string};
 reconcileNativeMenu:{expectedGeneration:number};inspectRecoveryCoverage:{target:Target};runRecoveryPage:{target:Target};inspectBackupRoots:{};chooseBackupLocation:{purpose?:'rebuild'};listRecoveryPolicies:{};writeRecovery:{};
 requestRestorePreview:{rebuild?:RebuildIntent};restoreRightClickMenu:{expectedRevision?:number;previewToken:string;idempotencyKey:string;rebuild?:RebuildIntent};
 inspectWholeCloudJobs:{};enableWholeCloudJob:{identity:Identity;cadence?:'weekly'|'daily'};disableWholeCloudJob:{identity:Identity};
 dispatchExplorerSave:{itemId:string;generation:number;context?:'image'|'link'|'video'|'audio'|'page';source:Target;entry:{key:string;folder:false;displayName?:string;contentType?:string};idempotencyKey:string};
 dispatchSave:{itemId:string;generation:number;context?:'image'|'link'|'video'|'audio'|'page';source:{filename:string;url?:string;bytes?:number[];contentType?:string;responseFilename?:boolean};idempotencyKey:string};
}
export type Request<K extends keyof Methods=keyof Methods> = K extends keyof Methods?{version:Version;method:K;params:Methods[K]}:never;
export interface Receipt {operationId:string;traceId?:number;durationMs?:number;method:string;before?:number|null;after?:number|null;replayed?:boolean}
export interface Response<T=unknown> {version:Version;state:'completed'|'partial'|'blocked'|'failed'|'uncertain'|'cancelled';code:string;data?:T;receipt:Receipt;diagnostic?:WorkerAccessDiagnostic|{stage:'current-read';origin?:'CURRENT_STORE'|'BACKGROUND_NATIVE_FENCE';subreason?:'ESTABLISHED_BOUNDARY_MISSING'|'HISTORICAL_EVIDENCE_WITHOUT_CONFIGURATION'|'REQUIRED_RECORD_MISSING'|'GENERATION_RECORD_MISSING'|'NATIVE_GENERATION_WITH_ZERO_CURRENT';causeName?:'AbortError'|'InvalidStateError'|'QuotaExceededError'|'SecurityError'|'VersionError'|'UnknownError'}}
export type CloudflareReadinessState = 'READY'|'ACTIVE'|'NOT_ACTIVATED'|'RECONNECT_REQUIRED'|'INSUFFICIENT_PERMISSION'|'ACCOUNT_AMBIGUOUS'|'NETWORK_UNAVAILABLE'|'UNKNOWN'|'CHOOSE_DESTINATION'|'DESTINATION_UNAVAILABLE'|'REPAIR_REQUIRED'|'SETUP_APPROVAL_REQUIRED'|'SETUP_RESUME_REQUIRED'|'SETUP_APPROVAL_RECORD_MISSING'|'NATIVE_APPLY_INCOMPLETE'|'PROVISIONING_BLOCKED';
export interface CloudflareReadiness {state:CloudflareReadinessState;statusCheckMs?:number;fromCache?:boolean;checkedAt?:number;code?:string;accountId?:string;target?:Target;accounts?:{id:string;name?:string}[];diagnostic?:WorkerAccessDiagnostic;worker?:{state:'READY'|'PREPARED'|'blocked';code?:string;checkedAt?:number;sourcePolicy?:string;transfer?:string;multipartConditionalCompletion?:'NOT_VERIFIED'}}
export interface RemoteDestination {provider:'cloudflare-r2';connectionId:string;accountId:string;bucketName:string;prefix:string;conflictPolicy:'keep-both'}
export interface RemoteReceipt {destination:RemoteDestination;operationId:string;key:string;size:number;etag:string;version:string;workerTimings?:Record<string,number>;transfer?:'bounded-spool'|'known-length-stream';stagingCleanup?:{removed:number;retained:number};provenance?:ObjectProvenance}
export interface RemoteStageDiagnostic {kind:'remote-save-stage';stage:'request'|'authenticate'|'claim'|'writer'|'source.fetch'|'destination.prepare'|'authorization.recheck'|'destination.record'|'destination.write';errorKind:'TypeError'|'RangeError'|'SyntaxError'|'AbortError'|'Error';causeCode?:string;runtimeCode?:string;sourceReason?:'http-empty-response'|'http2-response'|'http-truncated'|'http-status-line'|'http-header-framing'|'hostname-mismatch'|'certificate-rejected'|'outbound-address-blocked'|'outbound-connect-rejected'|'runtime-unsupported'|'socket-closed'|'network-error';sourceStage?:'dns'|'connect'|'tls'|'headers'|'body';httpStatus?:number}
export interface RemoteOperation {diagnostic?:RemoteStageDiagnostic;cause?:string;state:'pending'|'verified'|'completed'|'partial'|'blocked'|'failed'|'uncertain'|'cancelled';code:string;operationId?:string|number;remoteOperationId?:string;kind?:'save'|'readiness'|'file-action';destination?:RemoteDestination;receipt?:RemoteReceipt;stage?:string;bytes?:number;proofKind?:'independent-head-version-size'|'independent-get-byte-comparison';durationMs?:number;timings?:Record<string,number>;reconciliation?:RemoteOperation}
export interface CloudflareGrantStatus {requestedScopes:string[];issuedScopes:string[]|null;scopeEvidence:string;missingScopes:string[];needsReconsent:boolean;createGrant:boolean|null}
export interface WorkerAccessDiagnostic {code:string;kind:'cloudflare-worker-access';operation:string;workerIntent:string;requiredCreationRole:string|null;creationPermissionEvidence:string|null;method:string;endpoint:string;httpStatus:number|null;providerCodes:(string|number)[];omittedScopeCount:number;scopeListComplete:boolean;missingScopes:string[];requestedWorkerScopes:string[];referenceWorkerScopes:string[];grantedScopes:string[]|null;sessionScopes:string[];scopeEvidence:string;selectedAccountVerified:boolean;requiredPermissionAnyOf:string[];classification:string;correctiveAction:string;observedAt:string|null;requestId:string|null;challenge:string|null}
export interface CloudflareSetupResult {state:'completed'|'partial'|'blocked'|'uncertain';code:string;accountId?:string;native?:{state:string;code?:string};diagnostic?:WorkerAccessDiagnostic|{context:'r2';code:string;httpStatus:number|null;providerCodes:(number|string)[]};target?:Target;probe?:RemoteReceipt;provisionMs?:number;durationMs?:number;probeRetention?:string}
/** Canonical compiler output; composition explains Quick promotion without mutating configuration. */
export interface MenuComposition {policy:'quick-promoted';defaultKey:string|null;providerVisible:boolean;cloudflareChoiceCount:number;quickTargets:Target[];defaultQuickSuppressed:boolean;cloudflareShape:'hidden'|'flat-save'|'submenu'|'attention'}
export interface MenuRow {presentationId?:string;provenance?:SelectionProvenance;actionKind?:'save'|'attention'|'provider'|'branch'|'separator'|'navigation';setupProvider?:string;id:string;itemId:string;parentId:string|null;label:string;role:string;actionId:string|null;target:Target|null;enabled:boolean;visible:boolean;contexts:string[];reason:string;siblingIndex:number}
export interface MenuSpec {schemaVersion:1;generation:number;revision:number;rows:MenuRow[];omissions:unknown[];composition?:MenuComposition}
export interface RestorePreview {available:boolean;reason?:string;current:ConfigurationHealth;previewToken?:string;product?:unknown;configs?:unknown;provenance?:'VALIDATED_COMPLETE_LOCAL_JOURNAL'|'USER_AUTHORIZED_EXTERNAL_CHECKSUM_VERIFIED'|'NEW_OWNER_CONFIRMED_CONFIGURATION';nativePartial?:{target:Target;label:string}[];outcome?:'REBUILT_WITH_OWNER_CONFIRMATION';unknown?:string[];requiresPreservation?:boolean;nativeSalvage?:'PARTIAL_PROJECTION_ONLY_NOT_RESTORABLE'}
export interface Results {
 getGalleryLoadingVisual:GalleryLoadingVisual;setGalleryLoadingVisual:GalleryLoadingVisual;
 requestRestorePreview:RestorePreview;restoreRightClickMenu:{configuration:unknown;native:{state:string;code?:string};preservation?:{state:'VERIFIED';checksum:string;filename:string;evidenceClass:'external-filesystem-readback'};requiresReconnect:true;outcome?:'REBUILT_WITH_OWNER_CONFIRMATION';originalStateRestored?:false;remoteSave?:'NOT_VERIFIED'};
 describeCapabilities:ReliabilityDescription|{version:Version;build:unknown;tools:Tool[];publicEndpoint:false};
 getEngineHealth:EngineTrace|SafeSupportReport|{revision:number|null;generation:{desired:number;applied:number|null}|null;storage:{state:'available'|'blocked';code?:string};configuration?:ConfigurationHealth;storagePolicy?:{state:'OBSERVED_READ_ONLY'|'UNOBSERVED';persistent?:boolean;usageBytes?:number|null;quotaBytes?:number|null;pastDeletionCause?:'UNKNOWN'};origin:{extensionId:string|null;schemaVersion:1};native:unknown;externalRecovery:unknown};
 commitConfigChange:{configuration:unknown;native:{state:string;code?:string};backup:unknown;destinationReadiness?:{target:Target;state:'READY'|'blocked';code:string}[]};
 previewNativeMenu:MenuSpec;
 listDestinations:{items:(Destination|{target:Target;maxDepth:number;hidden?:boolean})[];total:number;nextCursor:string|null};
 inspectNativeACK:{schemaVersion:1;epoch:number;pending:number;desired:MenuSpec|null;acknowledgedGeneration:number|null;coverage:{nativeApi:string;nativeBehavior:string;nativeRendering:string;gaps:string[]};lastOutcome:unknown};
 fileAction:{state:string;code?:string;id:string;data?:{operationId:string;completed:number;skipped?:number;receipt?:RemoteReceipt;verification?:string;atomicDelete?:boolean}};
 enterExplorer:{state:string;code?:string;accounts:{id:string;name?:string}[];buckets:{name:string}[];target:Target|null;preferred:Target|null;accountId?:string};
 initializeCloudflare:CloudflareSetupResult;
 loginBegin:Results['loginStatus']&{initialization?:CloudflareSetupResult&{stage?:string;operationId?:string}};
 loginStatus:{state:'CONNECTED'|'CONNECTING'|'VERIFYING'|'DISCONNECTED';authenticated:boolean;refreshSupported?:boolean;identityVerified:boolean;permissions?:CloudflareGrantStatus;diagnostic?:{code:string}|null};
 inspectShelfAttention:{provider:string;view:'provider'|'manage-destinations';code:string;opening:{state:string;code?:string};target?:Target}|null;openCloudflareDestinations:{state:'completed'};
 inspectCloudflare:{onboarding:{initialized:string[];pending:string[];selectedAccountId:string|null;removed:string[];setupAuthorized?:boolean};status:CloudflareReadiness;limits:{totalFilePolicy:null;buffering:string};sourcePolicy:{kind:string;privateNetworks:boolean;browserCredentials:boolean;networkGuarantee:string}};
 checkCloudflareR2:CloudflareReadiness;selectCloudflareAccount:CloudflareReadiness;
 openCloudflareActivation:{state:'completed'|'blocked';code?:string;url?:string;setupPending?:boolean;accountId?:string};
 approveCloudflareSetup:CloudflareSetupResult;repairCloudflareDestination:CloudflareSetupResult;invokeProviderAction:RemoteOperation;dispatchSave:RemoteOperation;
 inspectRemoteHistory:RemoteOperation[]|{items:RemoteOperation[];nextCursor:string|null};inspectRemoteReceipt:RemoteOperation;
 inspectCloudflareSetup:{accountId:string;target:Target;stage:string;operationId?:string;result?:CloudflareSetupResult}|null;cancelRemoteOperation:RemoteOperation;openRemoteResult:{target:Target;highlightKey:string};navigateExplorer:{state:'completed';target:Target};refreshExplorer:{state:string;code?:string;data?:{entries:unknown[];cursor:string}};readFileChunk:{state:string;code?:string;data?:{bytes:number[];offset:number;etag?:string|null;total:number;done:boolean}};
}
export interface EngineApi {invoke<K extends keyof Methods>(request:Request<K>,authenticatedActor:string):Promise<Response<K extends keyof Results?Results[K]:unknown>>;readonly tools:readonly Tool[]}
export interface Tool {name:keyof Methods;scope:'inspect'|'configure'|'auth'|'execute'|'restore'|'provision';version:Version;inputSchema:object;outputSchema:object;effectful:boolean;transport:'trusted-local'}
export interface Grant {actor:string;methods:(keyof Methods)[];accounts:string[];expiresAt:number;allConfiguration?:boolean;interactiveAuth?:boolean}
export interface AgentGateway {request(handle:string,request:Request,authenticatedActor:string):Promise<Response>;grant(grant:Grant):string;revoke(handle:string):boolean}

export interface ConfigurationHealth {configurationOrigin?:'OWNER_CONFIRMED_REBUILD'|'VERIFIED_RECOVERY'|'UNKNOWN_OR_LEGACY';state:'UNKNOWN'|'FRESH_VERIFIED'|'ESTABLISHED_VALID'|'ESTABLISHED_MISSING'|'ESTABLISHED_CORRUPT'|'RECOVERY_CONFLICT';code?:string;subreason?:string;database:{name:string;present:boolean;version?:number;stores?:string[];sameOriginDatabaseCount?:number|null};records:Record<string,boolean>;remainingRecords?:number;generation?:{desired:number;applied:number|null}|null;journal:{count:number;firstSequence?:number|null;lastSequence?:number|null};checkpoints:{count:number};establishment?:{external:boolean;nativeGeneration:number|null};internalRecovery?:{journalPresent:boolean;checkpointsPresent:boolean;completeness:'NOT_PROVEN'}}

/** Explicit NEW owner choices, never inferred historical configuration. */
export interface RebuildIntent {accountId:string;changes:Change[];acknowledgeUnknown:true}
export interface ReliabilityDescription {version:1;operations:{method:keyof Methods;domainOwner:string;entryOwner:string;permission:string;effectful:boolean;invariants:string[];tests:string[];evidenceClass:'PARTIAL';gaps:string[]}[];invariants:{id:string;owner:string;rule:string;testId:string;evidenceClass:'PARTIAL';externalAcceptance:'EXTERNAL_NOT_TESTED'}[];failures:unknown[];coverage:'PARTIAL';gaps:string[];executionAuthority:'CANONICAL_API_WITH_HOST_GRANTS_ONLY'}
export interface RebuildResult {outcome:'REBUILT_WITH_OWNER_CONFIRMATION';originalStateRestored:false;remoteSave:'NOT_VERIFIED';configuration:unknown;native:{state:string;code:string}}

export interface EngineTrace {snapshot:unknown|null;breadcrumbs:unknown|null;coverage:'PARTIAL'|'UNOBSERVED_OR_PARTIAL';gaps:string[]}
export interface SafeSupportReport {schemaVersion:1;incidentId:string;signature:string;classification:string;originalPhysicalCause:'UNKNOWN';firstObservedFailure:unknown|null;checkpoints:unknown[];gaps:string[];recoveryReadiness:string;nextAction:string;releaseGate:'BLOCKED';sharing:'LOCAL_REVIEW_ONLY_NO_TRANSMISSION'}

export interface SelectionProvenance {schema:1;mode:'simple'|'narrow'|'depth';entryId:string;location:{provider:'cloudflare';bucket:string;directories:string[]};menuPath:string[];presentation?:{placement?:'quick';configuredVisibilityMode?:'all'|'hide-all'|'custom';id?:string;title:string;configuredTitle?:string;labelSource?:'menu_title'|'name';visibility?:'hide-all';visibilityMode?:'all'|'hide-all'|'custom';levels?:{actual:string;title:string;visible:boolean}[];bucketTitle?:string;bucketVisible?:boolean}}
export interface ObjectProvenance extends SelectionProvenance {operationId:string;originalFilename:string;storedFilename:string}
