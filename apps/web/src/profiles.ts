import type {Module} from '@famille/core';
/** `level` is retained in stored profiles for backward compatibility. It now selects a global path. */
export const profiles=['Ondine','Maurice'] as const;
export function globalProfile(level:string):string {
 if(['CE1','CE2','Ondine'].includes(level))return 'Ondine';
 if(['6e','Maurice'].includes(level))return 'Maurice';
 return level;
}
export function isHistoryModule(moduleId:string):boolean {
 return moduleId.startsWith('histoire-');
}
export function profileModules(modules:Module[],level:string):Module[]{
 const profile=globalProfile(level);
 const levels=profile==='Ondine'?['Ondine','CE1','CE2']:profile==='Maurice'?['Maurice','6e']:[level];
 const matching=modules.filter(module=>module.levels.some(level=>levels.includes(level)));
 if(profile!=='Maurice')return matching;
 return matching
  .filter(module=>!isHistoryModule(module.id))
  .map(module=>module.subject==='Histoire-géographie'?{...module,subject:'Géographie'}:module);
}
