export const exportPreferenceKey = 'explorerExportOptions';
export const exportDefaults = Object.freeze({urls:true,tags:false,metadata:false,nest:false});
export function exportOptions(value) {
  return Object.fromEntries(Object.keys(exportDefaults).map(key => [key,typeof value?.[key] === 'boolean' ? value[key] : exportDefaults[key]]));
}
