export const screenshotShortcutSetupKey='screenshotShortcutSetupOfferV1';

export async function chromeCommandBindings(chrome){
 const commands=await chrome.commands?.getAll?.()??[];
 return new Map(commands.map(({name,shortcut})=>[name,shortcut||null]));
}
export const openChromeShortcuts=chrome=>chrome.tabs.create({url:'chrome://extensions/shortcuts'});
