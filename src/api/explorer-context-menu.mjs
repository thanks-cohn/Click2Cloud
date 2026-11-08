import {normalizeTarget,freeze} from '../core/menu-identity.mjs';
// GUI consumes these same descriptors. View gestures collect inputs; fileAction
// and the existing navigation/configuration operations own all business effects.
export function describeExplorerContextMenu(target,{entry,hasClipboard=false,mutations=false,available=true}={}){
 const folder=!entry||entry.folder,items=[{id:'explorer.open',label:'Open',kind:'navigate',method:entry&&!entry.folder?'readFileChunk':'navigateExplorer',enabled:true}];
 if(entry&&!entry.folder)items.push({id:'explorer.preview',label:'Preview',method:'readFileChunk',enabled:true},{id:'explorer.download',label:'Download',method:'readFileChunk',enabled:true},{id:'explorer.save',label:'Save to cloud…',method:'dispatchExplorerSave',enabled:false,reason:'REMOTE_EXPLORER_SOURCE_UNAVAILABLE'});
 if(folder)items.push({id:'explorer.rightClickSetup',label:'+ Right Click',method:'commitConfigChange',enabled:true},{id:'explorer.setFlatDefault',label:'Make Default',method:'commitConfigChange',enabled:true});
 if(entry)for(const [id,label,action] of [['copy','Copy','copy'],['cut','Cut','move'],['move','Move','move'],['rename','Rename','rename'],['delete','Delete','delete']])items.push({id:'explorer.'+id,label,method:'fileAction',action,enabled:mutations});
 if(entry)items.push({id:'explorer.properties',label:'Properties',method:entry.folder?'listFolders':'fileMetadata',enabled:true});
 if(folder)items.push({id:'explorer.mkdir',label:'New Folder',method:'fileAction',action:'mkdir',enabled:mutations},{id:'explorer.paste',label:'Paste',method:'fileAction',enabled:mutations&&hasClipboard});
 if(!available)for(const item of items){item.enabled=false;item.reason='AUTH_REQUIRED';}
 return freeze({schemaVersion:1,kind:folder?'explorer.folder':'explorer.file',target:normalizeTarget(target),items});
}
