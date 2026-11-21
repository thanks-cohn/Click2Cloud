import {isImage} from '../explorer/image-preview.mjs';
import {normalizeTarget,freeze} from '../core/menu-identity.mjs';
// GUI consumes these same descriptors. View gestures collect inputs; fileAction
// and the existing navigation/configuration operations own all business effects.
export function describeExplorerContextMenu(target,{entry,hasClipboard=false,mutations=false,available=true,defaultAvailable=available,exports={}}={}){
 const folder=!entry||entry.folder,items=[{id:'explorer.open',label:'Open',kind:'navigate',method:entry&&!entry.folder?'readFileChunk':'navigateExplorer',enabled:true}];
 if(entry&&!entry.folder)items.push({id:'explorer.preview',label:'Preview',method:'readFileChunk',enabled:true},{id:'explorer.save',label:'Save to cloud…',method:'dispatchExplorerSave',enabled:false,reason:'REMOTE_EXPLORER_SOURCE_UNAVAILABLE'});
 const canDownload=folder||!!entry;
 if(canDownload){
  const nested=exports.nest&&(exports.tags||exports.metadata);
  items.push({id:'explorer.download',label:nested?'Download original':'Download',method:folder?'listDirectoryObjects':'readFileChunk',enabled:true,...(nested?{group:'Download'}:{})});
  for(const [flag,label] of [['tags','Download with Tags'],['metadata','Download with All Metadata']]){
   if(exports[flag])items.push({id:'explorer.download.'+flag,label,method:'getExportObjectMetadata',enabled:true,...(nested?{group:'Download'}:{})});
  }
  if(exports.urls)items.push({id:'explorer.getUrl',label:'Get URL',method:'getPublicUrls',enabled:true});
  if(exports.tags&&entry&&!entry.folder&&isImage(entry))items.push({id:'explorer.tags',label:'Add Tags',method:'getExportObjectMetadata',enabled:true});
 }
 if(folder)items.push({id:'explorer.rightClickSetup',label:'+ Right Click',method:'commitConfigChange',enabled:true},{id:'explorer.setFlatDefault',label:'Make Default',method:'commitConfigChange',enabled:defaultAvailable,...(!defaultAvailable?{reason:'DEFAULT_DESTINATION_UNAVAILABLE'}:{})});
 if(folder&&target.provider==='cloudflare')items.push({id:'explorer.screenshotHere',label:'Screenshot2Here',kind:'screenshot-rule',enabled:true});
 if(entry)for(const [id,label,action] of [['copy','Copy','copy'],['cut','Cut','move'],['move','Move','move'],['rename','Rename','rename'],['delete','Delete','delete']])items.push({id:'explorer.'+id,label,method:'fileAction',action,enabled:mutations});
 if(entry&&isImage(entry))items.push({id:'explorer.copyImage',label:'Copy Image to Clipboard',method:'readFileChunk',enabled:true});
 if(entry)items.push({id:'explorer.properties',label:'Properties',method:entry.folder?'listFolders':'fileMetadata',enabled:true});
 if(folder)items.push({id:'explorer.mkdir',label:'New Folder',method:'fileAction',action:'mkdir',enabled:mutations},{id:'explorer.paste',label:'Paste',method:'fileAction',enabled:mutations&&hasClipboard});
 if(!available)for(const item of items){item.enabled=false;item.reason='AUTH_REQUIRED';}
 return freeze({schemaVersion:1,kind:folder?'explorer.folder':'explorer.file',target:normalizeTarget(target),items});
}
