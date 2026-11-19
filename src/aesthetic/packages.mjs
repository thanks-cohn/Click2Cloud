// Declarative packages only. No package code, assets, CSS or capabilities.
export const standard={schemaVersion:1,id:'standard',name:'Remote V1',version:'1.0.0',compatibleApiVersion:'1.0',tokens:{}};
const color=(light,dark)=>({$type:'color',$value:{light,dark}}),dimension=value=>({$type:'dimension',$value:value});
export const highPolish={schemaVersion:1,id:'high-polish',name:"Bit o' Polish",version:'1.0.0',compatibleApiVersion:'1.0',tokens:{
 'color.background':color('#f4f5f7','#12151b'),'color.surface':color('#ffffff','#1b2028'),'color.raised':color('#eceff3','#252d38'),
 'color.text':color('#202734','#eef1f6'),'color.muted':color('#596576','#aab6c7'),'color.border':color('#d5dbe4','#364252'),
 'color.accent':color('#b7193e','#ff6687'),'color.selection':color('#fce8ed','#392936'),'color.focus':color('#a8173a','#ff8ca5'),
 'typography.family':{$type:'fontFamily',$value:'"Segoe UI", system-ui, sans-serif'},'typography.size':dimension('14px'),
 'spacing.unit':dimension('4px'),'spacing.page':dimension('28px'),'spacing.card':dimension('20px'),
 'geometry.control':dimension('7px'),'geometry.surface':dimension('12px'),'geometry.overlay':dimension('12px'),
 'elevation.overlay':{$type:'shadow',$value:'0 12px 36px #00000030'},'motion.feedback':{$type:'duration',$value:'120ms'},
 'state.disabled':{$type:'number',$value:0.5}
}};

export const minimal={schemaVersion:1,id:'minimal',name:'Minimal',version:'1.0.0',compatibleApiVersion:'1.1',
 tokens:{
  'color.background':color('#f8f8f7','#171818'),'color.surface':color('#ffffff','#202221'),'color.raised':color('#eeeeec','#292b2a'),
  'color.text':color('#212421','#f0f2f0'),'color.muted':color('#515851','#b2bab4'),'color.border':color('#d7dcd7','#424942'),
  'color.accent':color('#365347','#a9d1bb'),'color.selection':color('#e0ebe5','#30463b'),'color.focus':color('#365347','#add5bf'),
  'typography.size':dimension('14px'),'spacing.page':dimension('22px'),'spacing.card':dimension('12px'),
  'spacing.navGap':dimension('10px'),'spacing.navInline':dimension('12px'),'geometry.control':dimension('5px'),
  'geometry.surface':dimension('5px'),'geometry.overlay':dimension('7px'),'elevation.overlay':{$type:'shadow',$value:'0 8px 24px #00000022'}
 },
 visibility:Object.fromEntries([
  'explorer.debug-caption','remotes.intro-copy','remotes.connection-explanation','remotes.provider-description',
  'remotes.connected-caption','remotes.previous-result-detail','destinations.worker-explanation',
  'destinations.availability-hint','status.verbose-technical-detail','settings.help-copy'
 ].map(role=>[role,'hide']))
};
