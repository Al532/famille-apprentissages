import {z} from 'zod';
import {createEmptyCard,fsrs,type Grade,type Card} from 'ts-fsrs';
export const CONTRACT_VERSION=1 as const;
const id=z.string().regex(/^[a-z0-9][a-z0-9._-]{0,79}$/);
export const exerciseSchema=z.object({id,kind:z.enum(['choice','number','flashcard','text']),prompt:z.string().min(1).max(1000),passage:z.string().min(1).max(3000).optional(),answer:z.string().min(1).max(500),options:z.array(z.string()).min(2).max(8).optional(),skillIds:z.array(id).min(1),explanation:z.string().max(1000).optional(),contextId:id.optional(),variantId:id.optional(),reviewId:id.optional(),reviewMode:z.enum(['concept','question']).optional(),diagram:z.enum(['town-map']).optional(),staff:z.object({clef:z.enum(['treble','bass']),step:z.number().int().min(-10).max(4),speech:z.boolean().optional()}).strict().optional()}).strict().superRefine((q,ctx)=>{
 if(q.staff?.clef==='treble'&&q.staff.step<0)ctx.addIssue({code:'custom',message:'Étendue de clé de sol invalide.'});
 if(q.staff&&(q.kind!=='choice'||!q.options||q.options.join('|')!=='Do|Ré|Mi|Fa|Sol|La|Si'))ctx.addIssue({code:'custom',message:'La lecture de notes nécessite les sept touches blanches dans l’ordre.'});
 if(q.kind==='choice'&&(!q.options||!q.options.includes(q.answer)))ctx.addIssue({code:'custom',message:'Un QCM doit contenir la réponse dans ses choix.'});
 if(q.kind==='number'&&!Number.isFinite(Number(q.answer.replace(',','.'))))ctx.addIssue({code:'custom',message:'Réponse numérique invalide.'});
});
export const moduleSchema=z.object({id,version:z.string().regex(/^\d+\.\d+\.\d+$/),title:z.string().min(1),subject:z.string().min(1),levels:z.array(z.string()).min(1),description:z.string(),reviewMode:z.enum(['concept','question']).optional(),skills:z.array(z.object({id,label:z.string().min(1),variants:z.array(z.object({id,label:z.string().min(1)}).strict()).min(2).max(6).optional()}).strict()).min(1),exercises:z.array(exerciseSchema).min(1)}).strict().superRefine((m,ctx)=>{
 const ids=m.exercises.map(q=>q.id),skills=m.skills.map(s=>s.id);
 if(new Set(ids).size!==ids.length||new Set(skills).size!==skills.length)ctx.addIssue({code:'custom',message:'Identifiants dupliqués.'});
 if(m.exercises.some(q=>q.skillIds.some(s=>!skills.includes(s))))ctx.addIssue({code:'custom',message:'Compétence inconnue.'});
 for(const skill of m.skills){
  const variants=skill.variants?.map(v=>v.id)??[],bank=m.exercises.filter(q=>q.skillIds.includes(skill.id)&&(q.reviewMode??m.reviewMode??'concept')==='concept');
  if(new Set(variants).size!==variants.length)ctx.addIssue({code:'custom',message:'Variantes dupliquées.'});
  if(variants.length&&(bank.some(q=>!q.variantId||!variants.includes(q.variantId))||variants.some(v=>!bank.some(q=>q.variantId===v))))ctx.addIssue({code:'custom',message:'Chaque question de notion doit correspondre à une variante déclarée et chaque variante doit avoir des exemples.'});
 }
 if(m.exercises.some(q=>q.variantId&&!q.skillIds.some(s=>m.skills.find(skill=>skill.id===s)?.variants?.some(v=>v.id===q.variantId))))ctx.addIssue({code:'custom',message:'Variante inconnue.'});
 for(const q of m.exercises.filter(q=>q.reviewId)){
  const canonical=m.exercises.find(other=>other.id===q.reviewId);
  if((q.reviewMode??m.reviewMode??'concept')!=='question'||!canonical||(canonical.reviewMode??m.reviewMode??'concept')!=='question'||canonical.reviewId&&canonical.reviewId!==canonical.id||q.skillIds.join('|')!==canonical.skillIds.join('|'))ctx.addIssue({code:'custom',message:'Une carte partagée doit référencer une question factuelle canonique de la même compétence.'});
 }

});
export const catalogSchema=z.object({schemaVersion:z.literal(1),revision:z.string().regex(/^\d+\.\d+\.\d+$/),modules:z.array(moduleSchema).min(1)}).strict().superRefine((c,ctx)=>{if(new Set(c.modules.map(m=>m.id)).size!==c.modules.length)ctx.addIssue({code:'custom',message:'Modules dupliqués.'});});
export type Catalog=z.infer<typeof catalogSchema>;
export type Module=Catalog['modules'][number];
export type Exercise=Module['exercises'][number];
export const attemptSchema=z.object({schemaVersion:z.literal(1),id:z.uuid(),learnerId:id,moduleId:id,moduleVersion:z.string().max(30),catalogRevision:z.string().max(30),exerciseId:id,answer:z.string().max(500),durationMs:z.number().int().min(0).max(600000),selfRating:z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4)]).optional()}).strict();
export type Attempt=z.infer<typeof attemptSchema>;
export type StoredCard=Omit<Card,'due'|'last_review'> & {due:string;last_review?:string};
export type Result={schemaVersion:1;id:string;learnerId:string;moduleId:string;moduleVersion:string;catalogRevision:string;exerciseId:string;skillIds:string[];kind:Exercise['kind'];correct:boolean|null;rating:1|2|3|4;durationMs:number;recordedAt:string};
export type SkillProgress={schemaVersion:1;moduleId:string;skillId:string;attempts:number;assessed:number;correct:number;selfReviews:number;totalDurationMs:number;lastSeenAt:string};
export type ReviewState={moduleId:string;exerciseId:string;card:StoredCard};
export function serializeCard(card:Card):StoredCard {const {due,last_review,...rest}=card;return {...rest,due:due.toISOString(),...(last_review?{last_review:last_review.toISOString()}:{} )};}
const scheduler=fsrs({request_retention:0.9,enable_fuzz:false});
export function schedule(previous:StoredCard|undefined,rating:1|2|3|4,now=new Date()):StoredCard {
 const {due,last_review,...rest}=previous??{};
 const card:Card=previous?{...rest,due:new Date(due!),...(last_review?{last_review:new Date(last_review)}:{})} as Card:createEmptyCard(now);
 return serializeCard(scheduler.next(card,now,rating as Grade).card);
}
export function evaluate(catalog:Catalog,raw:unknown,now=new Date()):Result {
 const a=attemptSchema.parse(raw),m=catalog.modules.find(m=>m.id===a.moduleId),q=m?.exercises.find(q=>q.id===a.exerciseId);
 if(!m||!q||a.catalogRevision!==catalog.revision||a.moduleVersion!==m.version)throw new Error('CATALOG_MISMATCH');
 const norm=(s:string)=>s.trim().normalize('NFC').replace(/[’‘]/g,"'").replace(/\s+/g,' ').toLocaleLowerCase('fr');
 const correct=q.kind==='flashcard'?null:q.kind==='number'?norm(a.answer)!==''&&Number(a.answer.replace(',','.'))===Number(q.answer.replace(',','.')):norm(a.answer)===norm(q.answer);
 if(q.kind==='flashcard'&&a.selfRating===undefined)throw new Error('RATING_REQUIRED');
 return {schemaVersion:1,id:a.id,learnerId:a.learnerId,moduleId:m.id,moduleVersion:m.version,catalogRevision:catalog.revision,exerciseId:q.id,skillIds:q.skillIds,kind:q.kind,correct,rating:correct===null?a.selfRating!:correct?3:1,durationMs:a.durationMs,recordedAt:now.toISOString()};
}
export function projectSkill(previous:SkillProgress|undefined,result:Result,skillId:string):SkillProgress {
 if(!result.skillIds.includes(skillId))throw new Error('SKILL_MISMATCH');
 return {schemaVersion:1,moduleId:result.moduleId,skillId,attempts:(previous?.attempts??0)+1,assessed:(previous?.assessed??0)+(result.correct===null?0:1),correct:(previous?.correct??0)+(result.correct===true?1:0),selfReviews:(previous?.selfReviews??0)+(result.correct===null?1:0),totalDurationMs:(previous?.totalDurationMs??0)+result.durationMs,lastSeenAt:result.recordedAt};
}
/** Keep original corrections, but assign each stable question to its current, finer skills. */
export function projectCurrentSkills(modules:Module[],results:Result[]):SkillProgress[]{
 const progress=new Map<string,SkillProgress>();
 const sorted=[...new Map(results.map(r=>[r.id,r])).values()].sort((a,b)=>a.recordedAt.localeCompare(b.recordedAt)||a.id.localeCompare(b.id));
 for(const original of sorted){
  const question=modules.find(m=>m.id===original.moduleId)?.exercises.find(q=>q.id===original.exerciseId);
  const result=question?{...original,skillIds:question.skillIds}:original;
  for(const skillId of result.skillIds){const key=moduleKey(result.moduleId,skillId);progress.set(key,projectSkill(progress.get(key),result,skillId));}
 }
 return [...progress.values()];
}
export function selectNext(exercises:Exercise[],reviews:ReviewState[],moduleId:string,now=new Date(),lastId?:string):Exercise|undefined {
 const states=new Map(reviews.filter(r=>r.moduleId===moduleId).map(r=>[r.exerciseId,r.card]));
 const due=exercises.filter(q=>states.has(q.id)&&new Date(states.get(q.id)!.due)<=now).sort((a,b)=>Date.parse(states.get(a.id)!.due)-Date.parse(states.get(b.id)!.due));
 const unseen=exercises.filter(q=>!states.has(q.id));
 const available=[...due,...unseen];
 return available.find(q=>q.id!==lastId)??available[0];
}
export const moduleKey=(moduleId:string,itemId:string)=>`${moduleId}__${itemId}`;

export * from './concepts';
