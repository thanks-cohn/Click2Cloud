// History-only visual ornament. No timers, storage, or transfer dependencies.
export function historyOrnamentPattern(key,previous=null){
 let seed=2166136261;
 for(const ch of String(key)){seed=Math.imul(seed^ch.charCodeAt(0),16777619)>>>0;}
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const shuffle=values=>{for(let i=values.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[values[i],values[j]]=[values[j],values[i]];}return values;};
 const bands=shuffle([0,1,2]),sizes=shuffle([0,1,2]);
 const lines=bands.map((band,i)=>({left:band*26+Math.floor(random()*13),width:9+sizes[i]*6+Math.floor(random()*5)}));
 if(previous&&lines.every((line,i)=>line.left===previous[i]?.left&&line.width===previous[i]?.width)){
  [lines[0].left,lines[1].left]=[lines[1].left,lines[0].left];
 }
 return lines;
}

export function createHistoryOrnament(document,lines){
 const ornament=document.createElement('div');
 ornament.className='history-card-ornament';
 ornament.setAttribute('aria-hidden','true');
 for(const line of lines){
  const stroke=document.createElement('span');
  stroke.style.setProperty('--ornament-left',line.left+'%');
  stroke.style.setProperty('--ornament-width',line.width+'%');
  ornament.append(stroke);
 }
 return ornament;
}
