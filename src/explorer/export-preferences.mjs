export const exportPreferenceKey = 'explorerExportOptions';
export const exportDefaults = Object.freeze({urls:false,tags:false,metadata:false,nest:false});
export function exportOptions(value) {
  return Object.fromEntries(Object.keys(exportDefaults).map(key => [key,value?.[key]===true]));
}
