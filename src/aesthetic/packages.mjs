// The legacy theme keeps its existing preference ID. Theme structure lives in app.css.
export const standard={id:'standard',name:'Remote V1',version:'1.0.0'};
export const minimal={id:'minimal',name:'Minimal',version:'1.0.0'};
export const goldenAge={id:'golden-age',name:'Golden Age',version:'1.0.0',stylesheet:'golden-age'};
export const oceania={id:'oceania',name:'Oceania',version:'1.0.0',stylesheet:'oceania'};
export const nostalgia={
 id:'nostalgia',name:'Nostalgia',version:'1.0.0',
 styles:[
  {id:'kawaii',name:'Kawaii (Neon Pink)',stylesheet:'kawaii'},
  {id:'dungeon-master',name:'Dungeon Master',stylesheet:'dungeon-master'},
  {id:'heroine',name:'Heroine',stylesheet:'heroine'}
 ]
};
export const frames={id:'frames',name:'Frames',version:'1.0.0',stylesheet:'frames'};
export const chrome={id:'chrome',name:'Chrome',version:'1.0.0',stylesheet:'chrome'};
export const themePackages=[goldenAge,oceania,nostalgia,frames,chrome];
export const busyCursorPackages=Object.freeze([
 {id:'system',name:'System Default'},
 {id:'hourglass',name:'Classic Hourglass'},
 {id:'ring',name:'Spinning Ring'},
 {id:'arrow-busy',name:'Arrow + Busy'},
 {id:'redown-pulse',name:'REDOWN Pulse'}
]);

const palette=(id,name,colors,fonts)=>({id,name,colors,fonts});
export const palettes=[
 palette('original-rose','Original Rose',{
  background:['#f4f5f7','#12151b'],surface:['#ffffff','#1b2028'],raised:['#eceff3','#252d38'],
  text:['#202734','#eef1f6'],muted:['#596576','#aab6c7'],border:['#d5dbe4','#364252'],
  accent:['#b7193e','#ff6687'],selection:['#fce8ed','#392936'],focus:['#a8173a','#ff8ca5']
 },{heading:['Georgia, Cambria, "Liberation Serif", serif',700],
  body:['"Segoe UI", system-ui, sans-serif',400],control:['"Trebuchet MS", "Liberation Sans", sans-serif',550]}),
 palette('ocean-blue','Ocean Blue',{
  background:['#f1f6fb','#101722'],surface:['#ffffff','#182436'],raised:['#e6eef8','#21324a'],
  text:['#192a40','#ecf4ff'],muted:['#4d607b','#afc4e1'],border:['#c6d5e8','#3c506c'],
  accent:['#1458ba','#78b6ff'],selection:['#dceaff','#263e60'],focus:['#164d9b','#9bccff']
 }, {heading:['"Segoe UI Semibold", "DejaVu Sans", system-ui, sans-serif',650],
  body:['"Helvetica Neue", Arial, sans-serif',400],control:['Arial, "Liberation Sans", sans-serif',550]
 }),
 palette('emerald-forest','Emerald Forest',{
  background:['#f2f8f5','#101c19'],surface:['#ffffff','#192a24'],raised:['#e2f0e9','#213a30'],
  text:['#1c332a','#eaf7f1'],muted:['#486457','#b4d3c5'],border:['#c0d8cb','#3c5c4e'],
  accent:['#166c56','#79e0bd'],selection:['#d9efe4','#254d3e'],focus:['#14614e','#8ff0ce']
 }, {heading:['Cambria, "Liberation Serif", Georgia, serif',700],
  body:['"Trebuchet MS", "DejaVu Sans", sans-serif',400],control:['Verdana, "DejaVu Sans", sans-serif',550]
 }),
 palette('amethyst','Amethyst',{
  background:['#f6f3fb','#181323'],surface:['#ffffff','#241d32'],raised:['#ece5f5','#322745'],
  text:['#312542','#f6efff'],muted:['#655372','#c6b6d9'],border:['#d7cbe6','#55446c'],
  accent:['#7542ad','#c4a1ff'],selection:['#ecdef9','#463261'],focus:['#653596','#dabdff']
 }, {heading:['"Palatino Linotype", "Book Antiqua", "DejaVu Serif", serif',700],
  body:['"Gill Sans", "Liberation Sans", sans-serif',400],control:['"Segoe UI", Tahoma, system-ui, sans-serif',600]
 }),
 palette('sunset-amber','Sunset Amber',{
  background:['#fbf6f0','#211810'],surface:['#fffdf9','#2d2218'],raised:['#f4e9db','#3c2d20'],
  text:['#38271a','#f9efe2'],muted:['#70553e','#d8c1a7'],border:['#decab5','#604931'],
  accent:['#a35405','#ffc36a'],selection:['#f7e5cb','#563823'],focus:['#854806','#ffd398']
 }, {heading:['"Franklin Gothic Medium", "Liberation Sans", system-ui, sans-serif',650],
  body:['Verdana, "DejaVu Sans", sans-serif',400],control:['Tahoma, "Liberation Sans", sans-serif',550]
 })
];
