/**
 * Source-preserved REDOWN V3 mode extraction (2026-11-03).
 * Origin: thanks-cohn/REDOWN/extension/right-click-v3.js
 * Source Git blob: 08ee4f847d776e8488f71fc7a846ecf5835c7a4a
 * This is not a redesign of the mode's algorithms. The only new code is
 * the mode-level entry/resolve adapter below.
 */
  const contexts=['link','image','video','audio','page'];
  const prepared=(d,profiles)=>profiles.find(p=>p.type==='cloudflare-r2'&&p.id===d.profileId&&p.accountId===d.accountId&&p.bucketName===d.bucketName&&p.workerUrl&&p.token);

  const identity=d=>JSON.stringify([d.profileId,d.accountId,d.bucketName]);

  // Presentation is deliberately independent of destination revisions and Legacy mode.
  const limits=Object.freeze({depth:10,entries:300,folders:500,known:5000,pages:80,milliseconds:20000,ttl:300000});
  function presentation(value){
    return {style:value?.style==='nested'?'nested':'simple',nested:value?.nested==='level'?'level':'narrow',depth:Number.isInteger(value?.depth)&&value.depth>=1&&value.depth<=limits.depth?value.depth:1};
  }
  function validatePresentation(value){
    if(!value||!['simple','nested'].includes(value.style)||!['narrow','level'].includes(value.nested)||!Number.isInteger(value.depth)||value.depth<1||value.depth>limits.depth)throw Error('Choose a menu style, nested option and integer depth from 1 to 10.');
    return presentation(value);
  }
  const within=(prefix,root)=>prefix===root||prefix.startsWith(root?root+'/':'');
  const emptyScopes=()=>({version:1,revision:0,buckets:[]});
  function validateScopes(value,profiles){
    if(value?.version!==1||!Number.isSafeInteger(value.revision)||value.revision<0||!Array.isArray(value.buckets)||value.buckets.length>200)throw Error('Invalid Level bucket selection.');
    const ids=new Set(),tuples=new Set();
    for(const d of value.buckets){
      if(!/^[a-zA-Z0-9_-]{1,80}$/.test(d.id)||ids.has(d.id)||tuples.has(identity(d))||typeof d.enabled!=='boolean'||!prepared(d,profiles))throw Error('Choose an activated bucket for Level.');
      ids.add(d.id);tuples.add(identity(d));
    }
    return value;
  }
  function roots(config,profiles){
    const scopes=config.levelScopes||emptyScopes();
    // Revoked scopes fail closed independently; never fall back to shortcuts.
    return (scopes.buckets||[]).filter(d=>d.enabled&&prepared(d,profiles)).map(d=>({...d,prefix:''}));
  }
  function inventoryKey(config,profiles,settings){
    return JSON.stringify([2,config.levelScopes?.revision||0,presentation(settings).depth,roots(config,profiles).map(d=>[d.id,d.profileId,d.accountId,d.bucketName,'',prepared(d,profiles).workerUrl])]);
  }
  function fresh(inventory,key,now=Date.now()){return inventory?.key===key&&Number.isFinite(inventory.at)&&now>=inventory.at&&now-inventory.at<limits.ttl;}
  const compare=(a,b)=>a<b?-1:a>b?1:0;
  function childPrefixes(page,prefix){
    if(!page||page.delimited!==undefined&&!Array.isArray(page.delimited)||page.objects!==undefined&&!Array.isArray(page.objects)||(page.delimited||[]).some(p=>typeof p!=='string'||!p.endsWith('/'))||(page.objects||[]).some(o=>!o||typeof (o.key||o.name)!=='string'))throw Error('invalid-page');
    const parent=prefix?prefix+'/':'',children=new Set();
    for(const raw of [...(page.delimited||[]),...(page.objects||[]).map(o=>o.key||o.name||'')]){
      if(typeof raw!=='string'||!raw.startsWith(parent))continue;
      const relative=raw.slice(parent.length),slash=relative.indexOf('/');
      if(slash<=0)continue;
      const child=parent+relative.slice(0,slash);
      // Match the existing exact-prefix save contract; never normalize cloud names.
      if(new TextEncoder().encode(child).length>900||/[\\\x00-\x1f\x7f]/.test(child)||child.split('/').some(s=>!s||s==='.'||s==='..'))throw Error('unsupported-folder');
      children.add(child);
    }
    return [...children].sort(compare);
  }
  // Depth/TTL affect checking and projection, never deletion of known paths.
  function rememberedNodes(config,profiles,inventory){
    let prior;try{prior=JSON.parse(inventory?.key||'null');}catch{return [];}
    if(inventory?.version!==2||prior?.[0]!==2||!Array.isArray(prior[3])||!Array.isArray(inventory.nodes))return [];
    const authorized=roots(config,profiles);
    return inventory.nodes.filter(n=>typeof n.prefix==='string'&&Number.isInteger(n.level)&&n.level>=0&&n.level<=limits.depth&&
      (!n.prefix||!/[\\\x00-\x1f\x7f]/.test(n.prefix)&&!n.prefix.split('/').some(p=>!p||p==='.'||p==='..'))&&
      authorized.some(d=>identity(d)===identity(n)&&prior[3].some(t=>t[1]===d.profileId&&t[2]===d.accountId&&t[3]===d.bucketName&&t[5]===prepared(d,profiles).workerUrl)));
  }
  async function discover(config,profiles,settings,listPage,clock=()=>Date.now(),previous=null,refresh=false){
    const options=presentation(settings),start=clock(),key=inventoryKey(config,profiles,options);
    const nodes=roots(config,profiles).map(d=>({profileId:d.profileId,accountId:d.accountId,bucketName:d.bucketName,prefix:d.prefix,parent:null,level:0}));
    const warnings=new Set();let pages=0,added=0,halt=false;
    const perBucket=Math.max(1,Math.floor(limits.folders/Math.max(1,nodes.length)));
    const remembered=rememberedNodes(config,profiles,previous);
    const reusable=[];
    for(const root of [...nodes]){
      const saved=remembered.filter(n=>identity(n)===identity(root)),old=saved.find(n=>n.prefix==='');
      const observed=old?.observedAt??previous?.at;
      const reuse=!refresh&&old&&Number.isFinite(observed)&&clock()>=observed&&clock()-observed<limits.ttl*12;
      if(reuse)reusable.push(root);
      if(old)Object.assign(root,old);
      for(const child of saved.filter(n=>n.prefix).sort((a,b)=>a.level-b.level||compare(a.prefix,b.prefix)))nodes.push({...child});
      if(!reuse)for(const node of nodes.filter(n=>identity(n)===identity(root)&&n.level<options.depth))node.listed=false;
    }
    const queue=[],retries=[];
    for(const node of nodes){
      if(node.level>=options.depth||node.listed&&!node.partial)continue;
      const frontier=(previous?.frontier||[]).find(t=>t.profileId===node.profileId&&t.prefix===node.prefix);
      queue.push({node,cursor:reusable.some(r=>identity(r)===identity(node))?frontier?.cursor||'':'',seen:frontier?.seen||[]});
    }
    while(queue.length&&!halt){
      const task=queue.shift(),node=task.node;if(node.level>=options.depth)continue;
      if(pages>=limits.pages||added>=limits.folders||nodes.length>=limits.known||clock()-start>=limits.milliseconds){warnings.add('Inventory limit reached; some folders are not shown.');queue.unshift(task);break;}
      let timedOut=false;
      try{
        let timer;const remaining=Math.max(1,Math.min(8000,limits.milliseconds-(clock()-start)));
        pages++;
        const page=await Promise.race([listPage(node.accountId,node.bucketName,node.prefix?node.prefix+'/':'',task.cursor,'/'),new Promise((_,reject)=>{timer=setTimeout(()=>{timedOut=true;reject(Error('timeout'));},remaining);})]).finally(()=>clearTimeout(timer));
        if(page.truncated&&!page.cursor||page.cursor&&(page.cursor===task.cursor||task.seen.includes(page.cursor)))throw Error('pagination');
        for(const prefix of childPrefixes(page,node.prefix)){
          if(nodes.some(n=>identity(n)===identity(node)&&n.prefix===prefix))continue;
          if(nodes.length>=limits.known||added>=limits.folders||nodes.filter(n=>identity(n)===identity(node)).length>=perBucket){node.partial=true;warnings.add('Folder limit reached; some folders are not shown.');break;}
          const child={profileId:node.profileId,accountId:node.accountId,bucketName:node.bucketName,prefix,parent:node.prefix,level:node.level+1,listed:false};nodes.push(child);added++;queue.push({node:child,cursor:'',seen:[]});
        }
        if(page.cursor)queue.push({node,cursor:page.cursor,seen:[...task.seen,page.cursor]});
        node.listed=!page.cursor;node.observedAt=clock();
      }catch{node.listed=false;retries.push(task);warnings.add('Some folders could not be read; inventory is incomplete.');if(timedOut)halt=true;}
    }
    if(nodes.some(n=>n.partial))warnings.add('Folder limit reached; some folders are not shown.');
    // Stable sibling order independent of network completion and provider page order.
    nodes.sort((a,b)=>compare(a.profileId,b.profileId)||compare(a.prefix,b.prefix));
    const observations=roots(config,profiles).map(d=>({profileId:d.profileId,accountId:d.accountId,bucketName:d.bucketName,checked:!!nodes.find(n=>identity(n)===identity(d)&&n.prefix==='')?.listed,knownFolders:nodes.filter(n=>identity(n)===identity(d)).length-1,observedAt:nodes.find(n=>identity(n)===identity(d)&&n.prefix==='')?.observedAt||null,complete:!nodes.some(n=>identity(n)===identity(d)&&n.level<options.depth&&(!n.listed||n.partial))}));
    return {version:2,key,at:clock(),depth:options.depth,nodes,pages,observations,frontier:[...queue,...retries].map(t=>({profileId:t.node.profileId,prefix:t.node.prefix,cursor:t.cursor,seen:t.seen})),unknownRemaining:!!warnings.size,complete:!warnings.size&&!nodes.some(n=>n.partial),warnings:[...warnings]};
  }
  const nodeId=n=>'v3:cloud:'+encodeURIComponent(JSON.stringify([n.profileId,n.accountId,n.bucketName,n.prefix]));
  function levelProjection(config,profiles,settings,inventory,root,now,budget=limits.entries){
    const key=inventoryKey(config,profiles,settings),valid=fresh(inventory,key,now),out=[],warnings=[];
    if(!roots(config,profiles).length)return {entries:out,warnings:['Select participating buckets in Level setup.'],complete:false};
    if(!valid)inventory={...inventory,nodes:rememberedNodes(config,profiles,inventory),warnings:['Folder discovery is pending.'],observations:[],at:inventory?.at||now,complete:false};
    warnings.push(...inventory.warnings||[]);
    const authorized=roots(config,profiles),nodes=(inventory.nodes||[]).filter(n=>n.level<=presentation(settings).depth&&authorized.some(d=>d.profileId===n.profileId&&d.accountId===n.accountId&&d.bucketName===n.bucketName&&within(n.prefix,d.prefix)));
    for(const d of authorized)if(!nodes.some(n=>identity(n)===identity(d)&&n.prefix===''))nodes.push({...d,prefix:'',parent:null,level:0});
    // Reserve every root before breadth-first allocation. Each folder reserves
    // its parent Save here atomically; later buckets cannot be starved by DFS.
    nodes.sort((a,b)=>compare(identity(a),identity(b))||compare(a.prefix,b.prefix));
    const pending=nodes.filter(n=>n.parent===null).map(n=>({node:n,parentId:root}));
    const byParent=n=>nodes.filter(c=>identity(c)===identity(n)&&c.parent===n.prefix&&c.level===n.level+1);
    while(pending.length){
      const {node,parentId}=pending.shift(),id=nodeId(node),children=byParent(node),cost=children.length?2:1;
      if(out.length+cost>budget){warnings.push('Chrome menu entry limit reached; some folders are not shown.');continue;}
      const collision=nodes.filter(n=>n.parent===null&&n.bucketName===node.bucketName).length>1;
      const title=node.prefix.split('/').at(-1)||node.bucketName+(collision?' · '+node.accountId+' · '+node.profileId:'');
      out.push({id,parentId,title,contexts});
      if(children.length)out.push({id:id+':send',parentId:id,title:'Save here',contexts});
      for(const child of children)pending.push({node:child,parentId:id});
    }
    return {entries:out,summary:{depth:presentation(settings).depth,knownFolders:Math.max(0,nodes.length-authorized.length),rootsChecked:(inventory.observations||[]).filter(o=>o.checked).length,rootsTotal:authorized.length,ageMs:now-inventory.at},warnings:[...new Set(warnings)],complete:!!inventory.complete&&!warnings.length};
  }


// Depth owns opt-in scopes, enumeration cache, traversal and projection.
// This adapter only wraps the preserved Level projection in the provider
// header. It deliberately does NOT import Simple's default bucket or aliases.
export function projectDepth(config,profiles,settings,inventory,root='redown',now=Date.now(),budget=limits.entries){
  const parentId='v3:provider:cloudflare';
  const options=presentation({...settings,style:'nested',nested:'level'});
  const plan=levelProjection(config,profiles,options,inventory,parentId,now,Math.max(0,budget-1));
  return {...plan,entries:[{id:parentId,parentId:root,title:'Cloudflare',contexts},...plan.entries]};
}
export function resolveDepth(id,config,profiles,settings,inventory,now=Date.now(),existingPlan=null){
  try{
    const plan=existingPlan||projectDepth(config,profiles,settings,inventory,'redown',now);
    const item=plan.entries.find(n=>n.id===id);
    if(!item||plan.entries.some(n=>n.parentId===id)||item.type==='separator')return null;
    const node=[...(inventory?.nodes||[]),...roots(config,profiles)].find(n=>
      nodeId({...n,prefix:n.prefix||''})===id||nodeId({...n,prefix:n.prefix||''})+':send'===id);
    if(!node)return null;
    const profile=prepared(node,profiles);
    return profile?{profile,owner:profile,prefix:node.prefix||''}:null;
  }catch{return null;}
}
export {discover as discoverDepth,validateScopes as validateDepthScopes,
  inventoryKey as depthInventoryKey,emptyScopes as emptyDepthScopes,
  roots as depthRoots,levelProjection as depthProjection,
  rememberedNodes as rememberedDepthNodes,limits as depthLimits,
  nodeId as depthNodeId};
