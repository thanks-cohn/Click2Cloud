import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {toolRegistry,validate} from '../src/api/service.mjs';
import {listCommands} from '../src/api/shortcuts.mjs';
import {validateManifest} from '../src/manifest/schema.mjs';

const read = path => readFileSync(new URL(path,import.meta.url),'utf8');
const doc = read('../docs/api/API-COMMAND-REFERENCE.md');
const hash = schema => createHash('sha256').update(JSON.stringify(schema)).digest('hex');
const entries = [...doc.matchAll(/^### (\w+)\n\n<!-- method-contract (.+) -->\n([\s\S]*?)(?=^#{2,3} |\s*$)/gm)];
const contracts = [...doc.matchAll(/^<!-- method-contract (.+) -->$/gm)].map(([,line])=>JSON.parse(line));
const methods = toolRegistry.map(tool=>tool.name);
assert.equal(entries.length,toolRegistry.length,'Each host method needs its own entry');
assert.deepEqual(contracts.map(row=>row.name).sort(),[...methods].sort(),'Registry and reference method sets must match exactly');
assert.match(doc,new RegExp('\\*\\*'+methods.length+' callable methods\\*\\*'));
for (const [scope, tools] of Object.entries(Object.groupBy(toolRegistry,tool=>tool.scope))) {
  assert(doc.includes(`| ${scope} | ${tools.length} |`),'Incorrect method count for '+scope);
}
const types = read('../src/api/service.d.ts').split('export interface Methods {')[1].split('\n}')[0];
const descriptions = new Set();
for (const [index, [,heading,raw]] of entries.entries()) {
  const contract=JSON.parse(raw), tool=toolRegistry.find(item=>item.name===heading);
  assert(tool,heading);
  assert.equal(heading,contract.name);
  assert(new RegExp('\\b'+heading+':').test(types),'Missing TypeScript input for '+heading);
  assert.deepEqual(contract,{
    name:heading,scope:tool.scope,effectful:tool.effectful,status:contract.status,input:hash(tool.inputSchema),output:hash(tool.outputSchema)
  },'Stale contract for '+heading);
  assert(['implemented','experimental','provider-gated'].includes(contract.status));
  const start=entries[index].index, end=entries[index+1]?.index??doc.indexOf('\n## Shortcut and UI commands');
  const section=doc.slice(start,end);
  assert(section.includes(`**Access and status** · \`${tool.scope}\` · registry effectful \`${tool.effectful}\` · ${contract.status}.`),heading);
  const input=section.match(/^\*\*Input\*\* · (.+)$/m)?.[1];
  assert(input,heading+' input section');
  for(const name of Object.keys(tool.inputSchema.properties)){
    assert(input.includes('`'+name+(tool.inputSchema.required.includes(name)?'':'?')+'`'),heading+' input '+name);
  }
  const narrative=section.split('-->')[1].split('**Access and status**')[0].trim();
  assert(narrative.split(/[.!?](?:\s|$)/).filter(sentence=>sentence.trim().length>15).length>=3,heading+' needs method-specific behavior and result notes');
  assert(!descriptions.has(narrative),heading+' repeats another method description');
  descriptions.add(narrative);
  const example=section.match(/^await invoke\('(\w+)', (.+)\);$/m);
  assert.equal(example?.[1],heading,heading+' example');
  const params=JSON.parse(example[2]);
  validate(tool.inputSchema,params);
  if(heading==='previewMenuManifest')validateManifest(JSON.parse(params.json));
  assert(!/Bearer\s|[?&](?:token|signature|credential)=/i.test(example[2]),heading+' example contains credential-like data');
}
const appendix=doc.split('## Shortcut and UI commands')[1];
for (const command of listCommands(toolRegistry)) {
  assert(appendix.includes(`| \`${command.commandId}\` | ${command.kind} |`),command.commandId);
  if (command.kind==='ui') assert(!methods.includes(command.commandId));
  else assert(toolRegistry.find(tool=>tool.name===command.method)?.command?.shortcutEligible);
}
console.log(`Verified ${toolRegistry.length} API methods and ${listCommands(toolRegistry).length} shortcut commands.`);
