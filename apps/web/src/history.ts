import {evaluate,projectSkill,schedule,type Attempt,type Catalog,type Result,type SkillProgress,type ReviewState} from '@famille/core';
export type RecordedAttempt={attempt:Attempt;recordedAt:string};
/** Rebuilt from immutable answers on each device; never trust a stored client score. */
export function projectHistory(catalogs:Catalog[],records:RecordedAttempt[]){
 const results:Result[]=[],progress:SkillProgress[]=[],reviews:ReviewState[]=[];let ignored=0;
 const ids=new Set<string>();
 for(const record of [...records].sort((a,b)=>a.recordedAt.localeCompare(b.recordedAt)||a.attempt.id.localeCompare(b.attempt.id))){
  if(ids.has(record.attempt.id))continue;ids.add(record.attempt.id);
  try{
   const catalog=catalogs.find(c=>c.revision===record.attempt.catalogRevision);
   if(!catalog||!Number.isFinite(Date.parse(record.recordedAt)))throw new Error('UNKNOWN_HISTORY');
   const result=evaluate(catalog,record.attempt,new Date(record.recordedAt));results.push(result);
   for(const skillId of result.skillIds){const index=progress.findIndex(p=>p.moduleId===result.moduleId&&p.skillId===skillId);const next=projectSkill(progress[index],result,skillId);if(index<0)progress.push(next);else progress[index]=next;}
   const index=reviews.findIndex(r=>r.moduleId===result.moduleId&&r.exerciseId===result.exerciseId);
   const card=schedule(reviews[index]?.card,result.rating,new Date(result.recordedAt));
   const next={moduleId:result.moduleId,exerciseId:result.exerciseId,card};if(index<0)reviews.push(next);else reviews[index]=next;
  }catch{ignored++;}
 }
 return {results,progress,reviews,ignored};
}
