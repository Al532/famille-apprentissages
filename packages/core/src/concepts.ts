import {schedule,moduleKey,type Module,type Exercise,type Result,type StoredCard} from './index';

export const SESSION_MAX_QUESTIONS=24;
export const SESSION_MAX_DURATION_MS=12*60*1000;
export const CONCEPT_DAILY_LIMIT=8;
export const conceptKey=(moduleId:string,skillId:string)=>moduleKey(moduleId,skillId);
export const reviewModeFor=(module:Module,q:Exercise)=>q.reviewMode??module.reviewMode??'concept';
export const reviewIdFor=(q:Exercise)=>q.reviewId??q.id;
export const questionKey=(moduleId:string,exerciseId:string)=>moduleKey(moduleId,exerciseId);
const dateFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'});
export const learningDay=(date:Date|string)=>dateFormat.format(new Date(date));
function nextMorning(date:string,days=1){
 // 08:00 UTC stays in the following French school day, including DST changes.
 const d=new Date(`${date}T08:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d;
}
export type ConceptEvidence={attempts:number;distinctCorrect:number;transferAfterError:number;pending:string[];missingVariants:string[];ready:boolean};
export type ConceptState={moduleId:string;skillId:string;label:string;subject:string;card?:StoredCard;days:number;lastDay?:string;evidence:ConceptEvidence;distinctSeen:number;bankSize:number};
function ordered(results:Result[]){return [...new Map(results.map(r=>[r.id,r])).values()].sort((a,b)=>a.recordedAt.localeCompare(b.recordedAt)||a.id.localeCompare(b.id));}
/** A second wording of the same sentence or another question on the same text is not a transfer. */
export function exerciseContext(q:Exercise):string {
 const normalize=(s:string)=>s.normalize('NFC').toLocaleLowerCase('fr').replace(/[’‘]/g,"'").replace(/[\s\p{P}]+/gu,' ').trim();
 if(q.passage)return 'texte:'+normalize(q.passage);
 if(q.contextId)return q.contextId;
 const quotes=[...q.prompt.matchAll(/«([^»]+)»/g)].map(m=>m[1].trim());
 if(q.prompt.startsWith('Conjugue '))return normalize(quotes.join(' '));
 return normalize(quotes.find(s=>/\s/.test(s))??quotes[0]??[q.prompt,...[...q.options??[]].sort()].join(' '));
}
const conceptBank=(module:Module,skillId:string)=>module.exercises.filter(q=>q.skillIds.includes(skillId)&&reviewModeFor(module,q)==='concept');
const matchesConcept=(module:Module,skillId:string,r:Result)=>r.moduleId===module.id&&module.exercises.some(q=>q.id===r.exerciseId&&q.skillIds.includes(skillId)&&reviewModeFor(module,q)==='concept');
export function conceptTarget(module:Module,skillId:string):number {
 return Math.max(Math.min(3,new Set(conceptBank(module,skillId).map(exerciseContext)).size),module.skills.find(s=>s.id===skillId)?.variants?.length??0);
}
/** Evidence uses the first answer to a context, not memorisation of its correction. */
export function conceptEvidence(module:Module,skillId:string,results:Result[],pendingBefore:string[]=[]):ConceptEvidence {
 const bank=conceptBank(module,skillId),questions=new Map(bank.map(q=>[q.id,q]));
 const rows=ordered(results).filter(r=>r.moduleId===module.id&&r.correct!==null&&questions.has(r.exerciseId));
 const first=new Map<string,Result>(),pending=new Set(pendingBefore);let lastError=-1;
 const group=(r:Result)=>exerciseContext(questions.get(r.exerciseId)!);
 rows.forEach((r,i)=>{if(!first.has(group(r)))first.set(group(r),r);if(r.correct===false){pending.add(r.exerciseId);lastError=i;}else pending.delete(r.exerciseId);});
 const distinctCorrect=[...first.values()].filter(r=>r.correct===true).length;
 const transferAfterError=lastError<0?distinctCorrect:new Set(rows.slice(lastError+1).filter(r=>r.correct===true&&first.get(group(r))?.id===r.id).map(group)).size;
 const covered=new Set([...first.values()].filter(r=>r.correct===true).map(r=>questions.get(r.exerciseId)!.variantId));
 const missingVariants=(module.skills.find(s=>s.id===skillId)?.variants??[]).filter(v=>!covered.has(v.id)).map(v=>v.id);
 const target=conceptTarget(module,skillId);
 return {attempts:rows.length,distinctCorrect,transferAfterError,pending:[...pending],missingVariants,ready:target>0&&distinctCorrect>=target&&!missingVariants.length&&pending.size===0&&(lastError<0||transferAfterError>=2)};
}
/** One FSRS review per concept and French calendar day. Recomputed from immutable answers. */
export function projectConcepts(modules:Module[],results:Result[]):ConceptState[]{
 const sorted=ordered(results);
 return modules.flatMap(module=>module.skills.filter(skill=>module.exercises.some(q=>q.skillIds.includes(skill.id)&&reviewModeFor(module,q)==='concept')).map(skill=>{
  const rows=sorted.filter(r=>matchesConcept(module,skill.id,r));
  const groups=new Map<string,Result[]>();for(const r of rows){const day=learningDay(r.recordedAt);groups.set(day,[...(groups.get(day)??[]),r]);}
  let card:StoredCard|undefined,evidence:ConceptEvidence=conceptEvidence(module,skill.id,[]);
  for(const [day,dayRows] of groups){
   evidence=conceptEvidence(module,skill.id,dayRows,evidence.pending);
   const at=new Date(dayRows.at(-1)!.recordedAt),rating=evidence.ready?(dayRows.some(r=>r.correct===false)?2:3):1;
   card=schedule(card,rating,at);
   const earliest=nextMorning(day),latest=nextMorning(day,60);
   card.due=(!evidence.ready||rating===2?earliest:new Date(Math.min(latest.getTime(),Math.max(earliest.getTime(),Date.parse(card.due))))).toISOString();
  }
  return {moduleId:module.id,skillId:skill.id,label:skill.label,subject:module.subject,card,days:groups.size,lastDay:[...groups.keys()].at(-1),evidence,distinctSeen:new Set(rows.map(r=>r.exerciseId)).size,bankSize:module.exercises.filter(q=>q.skillIds.includes(skill.id)&&reviewModeFor(module,q)==='concept').length};
 }));
}
export function availableToday(c:ConceptState,now=new Date()){
 if(!c.card)return true;
 if(c.lastDay===learningDay(now))return !c.evidence.ready&&c.evidence.attempts<CONCEPT_DAILY_LIMIT;
 return Date.parse(c.card.due)<=now.getTime();
}
export type SessionConcept={moduleId:string;skillId:string;label:string;subject:string;exerciseId?:string};
export type LearningSession={startedAt:string;subject:string;concepts:SessionConcept[];answers:Result[]};
export type QuestionReview={moduleId:string;exerciseId:string;card:StoredCard;lastDay:string;needsRepair:boolean};
/** Factual cards have their own daily FSRS schedule, without a concept-wide mastery claim. */
export function projectQuestionReviews(modules:Module[],results:Result[]):QuestionReview[]{
 const rows=ordered(results);return modules.flatMap(module=>module.exercises.filter(q=>reviewModeFor(module,q)==='question'&&reviewIdFor(q)===q.id).flatMap(q=>{
  const aliases=new Set(module.exercises.filter(other=>reviewModeFor(module,other)==='question'&&reviewIdFor(other)===q.id).map(other=>other.id));
  const history=rows.filter(r=>r.moduleId===module.id&&aliases.has(r.exerciseId));if(!history.length)return [];
  const days=new Map<string,Result[]>();for(const r of history){const day=learningDay(r.recordedAt);days.set(day,[...(days.get(day)??[]),r]);}
  let card:StoredCard|undefined;for(const [day,answers] of days){const failed=answers.some(r=>r.correct===false),last=answers.at(-1)!;card=schedule(card,failed?1:3,new Date(last.recordedAt));card.due=(failed?nextMorning(day):new Date(Math.min(nextMorning(day,60).getTime(),Math.max(nextMorning(day).getTime(),Date.parse(card.due))))).toISOString();}
  return [{moduleId:module.id,exerciseId:q.id,card:card!,lastDay:learningDay(history.at(-1)!.recordedAt),needsRepair:history.at(-1)!.correct===false}];
 }));
}
/** Staff notes open in order after two consecutive correct answers per earlier note.
 * Unlocks are reconstructed from immutable history, and never lost after a later error. */
export const isStaffModule=(module:Module)=>module.exercises.every(q=>!!q.staff);
export function unlockedStaffExercises(module:Module,results:Result[]):Exercise[]{
 const bank=[...module.exercises].sort((a,b)=>{
  const x=a.staff!,y=b.staff!;
  return x.clef===y.clef?(x.clef==='treble'?x.step-y.step:y.step-x.step):x.clef==='treble'?-1:1;
 });
 const rows=ordered(results).filter(r=>r.moduleId===module.id);
 const learned=(q:Exercise)=>{let streak=0;for(const r of rows.filter(r=>r.exerciseId===q.id)){streak=r.correct===true?streak+1:0;if(streak>=2)return true;}return false;};
 let count=Math.min(3,bank.length);
 while(count<bank.length&&bank.slice(0,count).every(learned))count++;
 return bank.slice(0,count);
}
function staffEvidence(module:Module,session:LearningSession,results:Result[]):ConceptEvidence {
 const rows=ordered([...results,...session.answers]);
 const bank=unlockedStaffExercises(module,rows);
 const today=rows.filter(r=>r.moduleId===module.id&&learningDay(r.recordedAt)===learningDay(session.startedAt));
 const correct=bank.filter(q=>today.filter(r=>r.exerciseId===q.id).at(-1)?.correct===true);
 const pending=bank.filter(q=>today.filter(r=>r.exerciseId===q.id).at(-1)?.correct===false).map(q=>q.id);
 return {attempts:session.answers.filter(r=>r.moduleId===module.id).length,distinctCorrect:correct.length,transferAfterError:0,pending,missingVariants:[],ready:bank.length===module.exercises.length&&correct.length===bank.length};
}
const practiceLimit=(modules:Module[],c:SessionConcept)=>isStaffModule(modules.find(m=>m.id===c.moduleId)!)?SESSION_MAX_QUESTIONS:CONCEPT_DAILY_LIMIT;
/** Balance concept practice in French and individual retrieval of historical/geographic facts. */
export function planSession(modules:Module[],results:Result[],subject='Toutes',now=new Date()):LearningSession {
 const matching=modules.filter(m=>subject==='Toutes'||m.subject===subject);
 const staffModules=matching.filter(isStaffModule),eligibleModules=matching.filter(m=>!isStaffModule(m));
 const all=projectConcepts(eligibleModules,results);
 const states=all.filter(c=>availableToday(c,now));
 const priority=(c:ConceptState)=>c.evidence.pending.length?0:c.card?1:2;
 states.sort((a,b)=>priority(a)-priority(b)||(a.card&&b.card?Date.parse(a.card.due)-Date.parse(b.card.due):0));
 const introduced=(id:string)=>all.filter(c=>c.moduleId===id&&c.card).length;
 const moduleIds=[...new Set(states.map(c=>c.moduleId))].sort((a,b)=>introduced(a)-introduced(b)),orderedStates:ConceptState[]=[];
 for(let i=0;orderedStates.length<states.length;i++)for(const id of moduleIds){const c=states.filter(c=>c.moduleId===id)[i];if(c)orderedStates.push(c);}
 orderedStates.sort((a,b)=>priority(a)-priority(b)||(a.card&&b.card?Date.parse(a.card.due)-Date.parse(b.card.due):0));
 const reviews=projectQuestionReviews(eligibleModules,results),byId=new Map(reviews.map(r=>[questionKey(r.moduleId,r.exerciseId),r]));
 const facts=eligibleModules.flatMap(module=>module.exercises.filter(q=>reviewModeFor(module,q)==='question'&&reviewIdFor(q)===q.id).flatMap(q=>{
  const review=byId.get(questionKey(module.id,q.id));if(review&&Date.parse(review.card.due)>now.getTime())return [];
  return [{moduleId:module.id,skillId:q.skillIds[0],label:module.skills.find(s=>s.id===q.skillIds[0])!.label,subject:module.subject,exerciseId:q.id,review}];
 }));
 const due=facts.filter(f=>f.review).sort((a,b)=>Number(b.review!.needsRepair)-Number(a.review!.needsRepair)||Date.parse(a.review!.card.due)-Date.parse(b.review!.card.due));
 const seenFacts=(key:string)=>reviews.filter(r=>{const m=eligibleModules.find(m=>m.id===r.moduleId)!,q=m.exercises.find(q=>q.id===r.exerciseId)!;return conceptKey(m.id,q.skillIds[0])===key;}).length;
 const unseen=facts.filter(f=>!f.review),factGroups=[...new Set(unseen.map(f=>conceptKey(f.moduleId,f.skillId)))].sort((a,b)=>seenFacts(a)-seenFacts(b)),fresh:typeof facts=[];
 for(let i=0;fresh.length<unseen.length;i++)for(const key of factGroups){const f=unseen.filter(f=>conceptKey(f.moduleId,f.skillId)===key)[i];if(f)fresh.push(f);}
 const subjectNames=[...new Set(orderedStates.map(c=>c.subject))],banks=subjectNames.map(name=>orderedStates.filter(c=>c.subject===name));
 const conceptLimit=facts.length?3:4;
 const chosen:SessionConcept[]=[];
 const reservedCards=Math.min(3,facts.length);
 let budget=12-reservedCards;
 while(chosen.length<conceptLimit&&banks.some(b=>b.length))for(const bank of banks){
  const c=bank.shift();if(!c||chosen.length>=conceptLimit)continue;
  const cost=conceptTarget(eligibleModules.find(m=>m.id===c.moduleId)!,c.skillId);
  if(cost>budget)continue;
  chosen.push({moduleId:c.moduleId,skillId:c.skillId,label:c.label,subject:c.subject});budget-=cost;
 }
 chosen.push(...[...due,...fresh].slice(0,budget+reservedCards).map(({review,...f})=>f));
 for(const m of staffModules){
  const c={moduleId:m.id,skillId:m.skills[0].id,label:m.title,subject:m.subject};
  const reviews=projectQuestionReviews([m],results);
  const bank=unlockedStaffExercises(m,results);
  if(bank.length<m.exercises.length||bank.some(q=>!reviews.some(r=>r.exerciseId===q.id))||reviews.some(r=>Date.parse(r.card.due)<=now.getTime()||r.needsRepair))chosen.push(c);
 }
 return {startedAt:now.toISOString(),subject,concepts:chosen,answers:[]};
}
export type SessionQuestion={module:Module;exercise:Exercise;concept:SessionConcept;retry:boolean};
export function sessionConceptEvidence(session:LearningSession,modules:Module[],allResults:Result[],concept:SessionConcept){
 const staffModule=modules.find(m=>m.id===concept.moduleId)!;
 if(!concept.exerciseId&&isStaffModule(staffModule))return staffEvidence(staffModule,session,allResults);
 if(concept.exerciseId){
  const ids=new Set(staffModule.exercises.filter(q=>reviewIdFor(q)===concept.exerciseId&&reviewModeFor(staffModule,q)==='question').map(q=>q.id));
  const rows=ordered([...allResults,...session.answers]).filter(r=>r.moduleId===concept.moduleId&&ids.has(r.exerciseId)&&learningDay(r.recordedAt)===learningDay(session.startedAt));
  const ready=rows.at(-1)?.correct===true;
  return {attempts:rows.length,distinctCorrect:ready?1:0,transferAfterError:0,pending:rows.at(-1)?.correct===false?[concept.exerciseId]:[],missingVariants:[],ready};
 }
 const module=modules.find(m=>m.id===concept.moduleId)!;
 const rows=ordered([...allResults,...session.answers]).filter(r=>matchesConcept(module,concept.skillId,r));
 const today=learningDay(session.startedAt),past=rows.filter(r=>learningDay(r.recordedAt)<today),current=rows.filter(r=>learningDay(r.recordedAt)===today);
 const pending=new Set<string>();for(const r of past)if(r.correct===false)pending.add(r.exerciseId);else if(r.correct===true)pending.delete(r.exerciseId);
 return conceptEvidence(module,concept.skillId,current,[...pending]);
}
export function sessionStatus(session:LearningSession,modules:Module[],allResults:Result[]):'working'|'complete'|'limit'|'empty'{
 if(!session.concepts.length)return 'empty';
 if(session.concepts.every(c=>sessionConceptEvidence(session,modules,allResults,c).ready))return 'complete';
 if(session.answers.length>=SESSION_MAX_QUESTIONS||session.answers.reduce((n,r)=>n+r.durationMs,0)>=SESSION_MAX_DURATION_MS)return 'limit';
 if(session.concepts.every(c=>{const e=sessionConceptEvidence(session,modules,allResults,c);return e.ready||e.attempts>=practiceLimit(modules,c);}))return 'limit';
 return 'working';
}
export function nextSessionQuestion(session:LearningSession,modules:Module[],allResults:Result[],random:()=>number=Math.random):SessionQuestion|undefined {
 if(sessionStatus(session,modules,allResults)!=='working')return;
 const results=ordered([...allResults,...session.answers]);
 const last= session.answers.at(-1),lastKey=last?questionKey(last.moduleId,last.exerciseId):'';
 const candidates=session.concepts.filter(c=>{const e=sessionConceptEvidence(session,modules,results,c);return !e.ready&&e.attempts<practiceLimit(modules,c);});
 const lastIndex=(c:SessionConcept)=>session.answers.findLastIndex(r=>r.moduleId===c.moduleId&&(c.exerciseId?modules.find(m=>m.id===c.moduleId)!.exercises.some(q=>q.id===r.exerciseId&&reviewIdFor(q)===c.exerciseId):matchesConcept(modules.find(m=>m.id===c.moduleId)!,c.skillId,r)));
 candidates.sort((a,b)=>lastIndex(a)-lastIndex(b));
 for(const concept of candidates){
  const module=modules.find(m=>m.id===concept.moduleId)!;
  if(!concept.exerciseId&&isStaffModule(module)){
   const bank=unlockedStaffExercises(module,results);
   const index=(q:Exercise)=>session.answers.findLastIndex(r=>r.moduleId===module.id&&r.exerciseId===q.id);
   const latest=(q:Exercise)=>results.filter(r=>r.moduleId===module.id&&r.exerciseId===q.id).at(-1);
   const eligible=bank.filter(q=>questionKey(module.id,q.id)!==lastKey);
   const errors=eligible.filter(q=>latest(q)?.correct===false&&(index(q)<0||session.answers.length-index(q)>=3));
   const fresh=eligible.filter(q=>!results.some(r=>r.moduleId===module.id&&r.exerciseId===q.id));
   const pool=errors.length?errors:fresh.length?fresh:eligible;
   pool.sort((a,b)=>index(a)-index(b));
   // Maurice: mix unlocked bass notes instead of repeating the oldest-note cycle.
   const exercise=module.id==='musique-lecture-maurice'
    ?pool[Math.min(pool.length-1,Math.floor(random()*pool.length))]
    :pool[0];
   if(exercise)return {module,exercise,concept,retry:latest(exercise)?.correct===false};
   continue;
  }
  const bank=module.exercises.filter(q=>concept.exerciseId?reviewModeFor(module,q)==='question'&&reviewIdFor(q)===concept.exerciseId:q.skillIds.includes(concept.skillId)&&reviewModeFor(module,q)==='concept');
  if(concept.exerciseId){const lastError=session.answers.findLastIndex(r=>r.moduleId===module.id&&bank.some(q=>q.id===r.exerciseId)&&r.correct===false);if(lastError>=0&&session.answers.length-lastError<4)continue;}
  const evidence=sessionConceptEvidence(session,modules,results,concept);
  const history=new Map<string,Result[]>();for(const r of results.filter(r=>r.moduleId===module.id))history.set(r.exerciseId,[...(history.get(r.exerciseId)??[]),r]);
  const eligible=bank.filter(q=>questionKey(module.id,q.id)!==lastKey);
  const dueErrors=eligible.filter(q=>evidence.pending.includes(q.id)&&session.answers.findLastIndex(r=>r.moduleId===module.id&&r.exerciseId===q.id&&r.correct===false)<=session.answers.length-4);
  const todayContexts=new Set(results.filter(r=>r.moduleId===module.id&&learningDay(r.recordedAt)===learningDay(session.startedAt)).map(r=>module.exercises.find(q=>q.id===r.exerciseId)).filter((q):q is Exercise=>!!q).map(exerciseContext));
  const independent=eligible.filter(q=>!todayContexts.has(exerciseContext(q)));
  const missing=independent.filter(q=>q.variantId&&evidence.missingVariants.includes(q.variantId));
  const varied=missing.length?missing:independent.length?independent:eligible;
  const seenContexts=new Set(module.exercises.filter(q=>history.has(q.id)).map(exerciseContext));
  const unused=varied.filter(q=>!seenContexts.has(exerciseContext(q)));
  const notInSession=varied.filter(q=>!session.answers.some(r=>r.moduleId===module.id&&r.exerciseId===q.id));
  // Successful cards stay out while unused contexts exist. Oldest examples are a last resort.
  const pool=dueErrors.length?dueErrors:unused.length?unused:notInSession.length?notInSession:varied.filter(q=>!evidence.pending.includes(q.id));
  pool.sort((a,b)=>(history.get(a.id)?.at(-1)?.recordedAt??'').localeCompare(history.get(b.id)?.at(-1)?.recordedAt??''));
  const oldest=pool[0]?history.get(pool[0].id)?.at(-1)?.recordedAt:undefined;
  const tied=pool.filter(q=>(history.get(q.id)?.at(-1)?.recordedAt)===oldest);
  const exercise=tied[Math.min(tied.length-1,Math.floor(random()*tied.length))];
  if(exercise)return {module,exercise,concept,retry:evidence.pending.includes(exercise.id)};
 }
 // If the last failed factual card needs spacing, use new cards as intervening retrievals.
 const waiting=candidates.find(c=>c.exerciseId);
 if(waiting){
  const bank=modules.filter(module=>session.subject==='Toutes'||module.subject===session.subject).flatMap(module=>module.exercises.filter(q=>!isStaffModule(module)&&reviewModeFor(module,q)==='question'&&reviewIdFor(q)===q.id&&!session.concepts.some(c=>c.moduleId===module.id&&c.exerciseId===q.id)&&!session.answers.some(r=>r.moduleId===module.id&&module.exercises.some(other=>other.id===r.exerciseId&&reviewIdFor(other)===q.id))).map(exercise=>({module,exercise})));
  const unseen=bank.filter(({module,exercise})=>!results.some(r=>r.moduleId===module.id&&r.exerciseId===exercise.id));
  const pool=unseen.length?unseen:bank.sort((a,b)=>(results.findLast(r=>r.moduleId===a.module.id&&r.exerciseId===a.exercise.id)?.recordedAt??'').localeCompare(results.findLast(r=>r.moduleId===b.module.id&&r.exerciseId===b.exercise.id)?.recordedAt??''));
  const chosen=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
  if(chosen){const {module,exercise}=chosen;return {module,exercise,concept:{moduleId:module.id,skillId:exercise.skillIds[0],label:module.skills.find(s=>s.id===exercise.skillIds[0])!.label,subject:module.subject,exerciseId:exercise.id},retry:false};}
 }
}
