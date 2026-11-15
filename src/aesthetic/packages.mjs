// Declarative packages only. No package code, assets, CSS or capabilities.
export const standard={schemaVersion:1,id:'standard',name:'Standard',version:'1.0.0',compatibleApiVersion:'1.0',tokens:{}};
const color=(light,dark)=>({$type:'color',$value:{light,dark}}),dimension=value=>({$type:'dimension',$value:value});
export const highPolish={schemaVersion:1,id:'high-polish',name:'High Polish',version:'1.0.0',compatibleApiVersion:'1.0',tokens:{
 'color.background':color('#f4f5f7','#12151b'),'color.surface':color('#ffffff','#1b2028'),'color.raised':color('#eceff3','#252d38'),
 'color.text':color('#202734','#eef1f6'),'color.muted':color('#596576','#aab6c7'),'color.border':color('#d5dbe4','#364252'),
 'color.accent':color('#b7193e','#ff6687'),'color.selection':color('#fce8ed','#392936'),'color.focus':color('#a8173a','#ff8ca5'),
 'typography.family':{$type:'fontFamily',$value:'"Segoe UI", system-ui, sans-serif'},'typography.size':dimension('14px'),
 'spacing.unit':dimension('4px'),'spacing.page':dimension('28px'),'spacing.card':dimension('20px'),
 'geometry.control':dimension('7px'),'geometry.surface':dimension('12px'),'geometry.overlay':dimension('12px'),
 'elevation.overlay':{$type:'shadow',$value:'0 12px 36px #00000030'},'motion.feedback':{$type:'duration',$value:'120ms'},
 'state.disabled':{$type:'number',$value:0.5}
}};
