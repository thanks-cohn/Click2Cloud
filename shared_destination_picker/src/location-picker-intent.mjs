/**
 * Mode-neutral destination-picker intent. It DOES NOT import mode engines,
 * write settings, or project a native Chrome menu.
 *
 * Shared Explorer tree is an editor, not the Simple native menu or Depth
 * inventory. Mode adapters must persist the returned intent independently.
 */
export const LABEL_CHOICES=Object.freeze(['lowest-folder','bucket','custom']);
export const TARGET_MODES=Object.freeze(['simple','narrow']);
function validString(s){return typeof s==='string'&&s.trim().length>0}
function normalizePath(prefix){
  if(typeof prefix!=='string'||prefix.startsWith('/')||prefix.endsWith('/')||prefix.includes('//')||
      prefix.split('/').some(s=>s==='.'||s==='..'))throw new TypeError('Invalid exact folder prefix');
  return prefix===''?[]:prefix.split('/');
}
export function locationLabel({bucketName,prefix='',labelChoice='lowest-folder',customLabel=''}){
  if(!validString(bucketName))throw new TypeError('Valid bucket name required');
  const segments=normalizePath(prefix);
  if(labelChoice==='lowest-folder')return segments.at(-1)||bucketName;
  if(labelChoice==='bucket')return bucketName;
  if(labelChoice==='custom'){
    const title=customLabel.trim();
    if(!title||title.length>60||/[\x00-\x1f]/.test(title))throw new TypeError('Custom title must be 1–60 clean characters');
    return title;
  }
  throw new TypeError('Invalid label choice');
}
/**
 * A selection emits ONE neutral intent; only the chosen mode's reducer
 * receives the intent. No Simple ↔ Narrow calls are permitted.
 */
export function makeLocationSelection({scope,prefix='',mode='simple',labelChoice='lowest-folder',
  customLabel='',existingTitles=[],allowDuplicate=false}){
  if(!scope||!validString(scope.providerKind)||!validString(scope.connectionId)||
      !validString(scope.accountId)||!validString(scope.containerId))
    throw new TypeError('Exact authorized scope required');
  if(!TARGET_MODES.includes(mode))throw new TypeError('Unsupported destination mode');
  const folders=normalizePath(prefix);
  const label=locationLabel({bucketName:scope.containerId,prefix,labelChoice,customLabel});
  const duplicate=existingTitles.includes(label);
  const target={scope:{...scope},prefix};
  const narrowBranch=[scope.containerId,...folders];
  narrowBranch[narrowBranch.length-1]=label;
  return {
    kind:'destination-selection-intent',
    mode,target,label,labelChoice,
    // Simple is ONE flat entry; Narrow is a FULL ancestral branch with
    // only the final selected directory label substituted.
    preview:mode==='simple'?[label]:narrowBranch,
    requiresDuplicateConfirmation:duplicate&&!allowDuplicate,
    accepted:!duplicate||allowDuplicate
  };
}
