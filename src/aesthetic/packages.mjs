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

const palette=(id,name,tokens)=>({id,name,tokens});
const colorOverlay=tokens=>Object.fromEntries(Object.entries(tokens).map(([name,[light,dark]])=>['color.'+name,color(light,dark)]));
export const bitOPolishPalettes=[
 palette('original-rose','Original Rose',Object.fromEntries(Object.entries(highPolish.tokens).filter(([name])=>name.startsWith('color.')))),
 palette('ocean-blue','Ocean Blue',colorOverlay({
  background:['#f1f6fb','#101722'],surface:['#ffffff','#182436'],raised:['#e6eef8','#21324a'],
  text:['#192a40','#ecf4ff'],muted:['#4d607b','#afc4e1'],border:['#c6d5e8','#3c506c'],
  accent:['#1458ba','#78b6ff'],selection:['#dceaff','#263e60'],focus:['#164d9b','#9bccff']
 })),
 palette('emerald-forest','Emerald Forest',colorOverlay({
  background:['#f2f8f5','#101c19'],surface:['#ffffff','#192a24'],raised:['#e2f0e9','#213a30'],
  text:['#1c332a','#eaf7f1'],muted:['#486457','#b4d3c5'],border:['#c0d8cb','#3c5c4e'],
  accent:['#166c56','#79e0bd'],selection:['#d9efe4','#254d3e'],focus:['#14614e','#8ff0ce']
 })),
 palette('amethyst','Amethyst',colorOverlay({
  background:['#f6f3fb','#181323'],surface:['#ffffff','#241d32'],raised:['#ece5f5','#322745'],
  text:['#312542','#f6efff'],muted:['#655372','#c6b6d9'],border:['#d7cbe6','#55446c'],
  accent:['#7542ad','#c4a1ff'],selection:['#ecdef9','#463261'],focus:['#653596','#dabdff']
 })),
 palette('sunset-amber','Sunset Amber',colorOverlay({
  background:['#fbf6f0','#211810'],surface:['#fffdf9','#2d2218'],raised:['#f4e9db','#3c2d20'],
  text:['#38271a','#f9efe2'],muted:['#70553e','#d8c1a7'],border:['#decab5','#604931'],
  accent:['#a35405','#ffc36a'],selection:['#f7e5cb','#563823'],focus:['#854806','#ffd398']
 }))
];
