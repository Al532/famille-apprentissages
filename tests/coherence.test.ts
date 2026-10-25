import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogSchema,conceptEvidence,exerciseContext,conceptTarget,projectConcepts,projectCurrentSkills,projectQuestionReviews,reviewModeFor,reviewIdFor,planSession,nextSessionQuestion,sessionStatus,evaluate,learningDay,type Module,type Exercise,type Result,type LearningSession} from '@famille/core';
import raw from '../packages/catalog/catalog.json';
import archived from '../packages/catalog/archive.json';
const catalog=catalogSchema.parse(raw),previous=catalogSchema.parse(archived.find(c=>c.revision==='0.5.0'));
const modules=catalog.modules.filter(m=>m.levels.includes('6e')),at=new Date('2026-10-25T10:00:00Z');let sequence=0;
const find=(id:string)=>modules.find(m=>m.id===id)!;
function row(m:Module,id:string,correct=true):Result {
 const q=m.exercises.find(q=>q.id===id)!;assert.ok(q,id);
 return {schemaVersion:1,id:`coherence-${++sequence}`,learnerId:'test',moduleId:m.id,moduleVersion:m.version,catalogRevision:catalog.revision,exerciseId:q.id,skillIds:q.skillIds,kind:q.kind,correct,rating:correct?3:1,durationMs:5000,recordedAt:new Date(at.getTime()+sequence*1000).toISOString()};
}
function session(m:Module,skillId:string):LearningSession {return {startedAt:at.toISOString(),subject:m.subject,concepts:[{moduleId:m.id,skillId,label:'test',subject:m.subject}],answers:[]};}

test('trois réponses à ne suffisent pas : le sélecteur vérifie aussi a et as',()=>{
 const m=modules[0],ids=['a-as-a-03','a-as-a-06','a-as-a-var-01'],s=session(m,'a-as-a');s.answers=ids.map(id=>row(m,id));
 const evidence=conceptEvidence(m,'a-as-a',s.answers);assert.equal(evidence.ready,false);assert.equal(evidence.missingVariants.length,2);
 const next=nextSessionQuestion(s,modules,[],()=>0)!;assert.ok(['a','as'].includes(next.exercise.answer));s.answers.push(row(m,next.exercise.id));
 const other=nextSessionQuestion(s,modules,[],()=>0)!;assert.notEqual(other.exercise.answer,next.exercise.answer);assert.ok(['a','as'].includes(other.exercise.answer));s.answers.push(row(m,other.exercise.id));
 assert.equal(conceptEvidence(m,'a-as-a',s.answers).ready,true);
});

test('réussir des accords du verbe ne valide ni le groupe nominal ni le participe passé',()=>{
 const m=find('francais-grammaire-accords-6e');
 const rows=['accords-reserve-03','accords-03','accords-reserve-09'].map(id=>row(m,id));
 assert.equal(conceptEvidence(m,'accord-sujet-verbe',rows).ready,true);
 assert.equal(conceptEvidence(m,'accord-groupe-nominal',rows).attempts,0);
 assert.equal(conceptEvidence(m,'accord-participe-etre',rows).ready,false);
 const adjectives=['classes-mots-01','classes-mots-reserve-05','classes-mots-reserve-11'].map(id=>row(m,id));
 assert.equal(conceptEvidence(m,'classes-principales',adjectives).ready,false);
 assert.deepEqual(conceptEvidence(m,'classes-principales',adjectives).missingVariants.sort(),['nom','verbe']);
});

test('un doublon et plusieurs questions sur le même texte ne deviennent pas des preuves indépendantes',()=>{
 const m=find('francais-grammaire-accords-6e'),qs=['fonctions-03','fonctions-reserve-03','fonctions-04'].map(id=>m.exercises.find(q=>q.id===id)!);
 assert.equal(exerciseContext(qs[0]),exerciseContext(qs[1]));assert.equal(conceptEvidence(m,'circonstances',qs.map(q=>row(m,q.id))).distinctCorrect,2);
 const reading=find('francais-lecture-6e');assert.equal(conceptEvidence(reading,'document',['document-01','document-02','document-03'].map(id=>row(reading,id))).distinctCorrect,1);
 const a=modules[0].exercises.find(q=>q.id==='a-as-a-06')!,b=modules[0].exercises.find(q=>q.id==='a-as-a-var-08')!;
 assert.equal(exerciseContext({...a,contextId:undefined}),exerciseContext({...b,contextId:undefined}),'même phrase malgré des consignes différentes');
});

test('les anciennes corrections sont conservées et réaffectées aux compétences précises sans validation inventée',()=>{
 const m=find('francais-grammaire-accords-6e'),old=previous.modules.find(p=>p.id===m.id)!;
 const rows=['accords-03','accords-04','accords-05'].map((id,i)=>evaluate(previous,{schemaVersion:1,id:`ead642bb-bb94-4b26-aee0-510f0560056${i}`,learnerId:'test',moduleId:m.id,moduleVersion:old.version,catalogRevision:previous.revision,exerciseId:id,answer:old.exercises.find(q=>q.id===id)!.answer,durationMs:4000},new Date(at.getTime()+i*1000)));
 const before=structuredClone(rows),progress=projectCurrentSkills(modules,rows),states=projectConcepts([m],rows);
 assert.ok(rows.every(r=>r.skillIds[0]==='accords'));assert.deepEqual(rows,before);
 assert.equal(progress.find(p=>p.skillId==='accord-sujet-verbe')!.assessed,2);
 assert.equal(progress.find(p=>p.skillId==='accord-participe-etre')!.assessed,1);
 assert.ok(states.filter(s=>s.card).every(s=>!s.evidence.ready&&learningDay(s.card!.due)==='2026-10-26'));
});

test('les anciennes questions ton/t’ont partagent le calendrier existant, sans conserver le groupe chevauchant',()=>{
 const m=find('francais-homophones-determinants-6e'),old=previous.modules.find(p=>p.id===m.id)!;
 const r=row(m,'mon-mont-ton-tont-03');r.skillIds=old.exercises.find(q=>q.id===r.exerciseId)!.skillIds;
 const rows=[r,row(m,'ton-tont-02')],state=projectConcepts([m],rows);
 assert.ok(!state.some(c=>c.skillId==='mon-mont-ton-tont'));
 assert.equal(state.find(c=>c.skillId==='ton-tont')!.evidence.attempts,2);
 assert.equal(state.find(c=>c.skillId==='ton-tont')!.card!.reps,1);
 assert.equal(projectCurrentSkills([m],rows).find(p=>p.skillId==='ton-tont')!.assessed,2);
});

test('le vocabulaire s’espace mot par mot et deux formulations du même mot partagent une carte',()=>{
 const m=find('francais-vocabulaire-6e'),immense=m.exercises.filter(q=>q.answer==='gigantesque');assert.equal(immense.length,2);
 const rows=immense.map(q=>row(m,q.id));
 const cards=projectQuestionReviews([m],rows);assert.equal(cards.length,1);assert.equal(cards[0].card.reps,1);
 assert.ok(!projectConcepts([m],rows).some(c=>c.skillId==='synonymes'));
 const planned=planSession([m],rows,m.subject,at);assert.ok(!planned.concepts.some(c=>c.exerciseId===cards[0].exerciseId));
 const joyful=m.exercises.find(q=>q.answer==='heureux')!;assert.ok(planned.concepts.some(c=>c.exerciseId===joyful.id),'un autre mot reste disponible');
 const error=[row(m,immense[0].id,false),row(m,immense[1].id)];assert.equal(learningDay(projectQuestionReviews([m],error)[0].card.due),'2026-10-26');
});

test('la coopération européenne est une notion et une date reste une carte indépendante, y compris depuis l’historique',()=>{
 const m=find('histoire-cm2'),q=m.exercises.find(q=>q.id==='union-europeenne-reserve-06')!,date=m.exercises.find(q=>q.id==='union-europeenne-reserve-10')!;
 assert.equal(reviewModeFor(m,q),'concept');assert.equal(reviewModeFor(m,date),'question');
 const rows=[row(m,q.id),row(m,date.id)];assert.equal(projectConcepts([m],rows).find(c=>c.skillId==='union-europeenne')!.evidence.attempts,1);assert.equal(projectQuestionReviews([m],rows).length,1);
});

test('chaque notion peut être terminée avec des exemples diversifiés et les variantes disposent de plusieurs contextes',()=>{
 for(const m of modules)for(const skill of m.skills){
  const bank=m.exercises.filter(q=>q.skillIds.includes(skill.id)&&reviewModeFor(m,q)==='concept');if(!bank.length)continue;
  assert.ok(bank.length>=12,`${m.id}/${skill.id}`);
  for(const variant of skill.variants??[])assert.ok(new Set(bank.filter(q=>q.variantId===variant.id).map(exerciseContext)).size>=2,`${m.id}/${skill.id}/${variant.id}`);
  for(const random of [()=>0,()=>.999]){
   const s=session(m,skill.id);
   while(sessionStatus(s,[m],[])==='working'){
    const next=nextSessionQuestion(s,[m],[],random);assert.ok(next,`${m.id}/${skill.id}: aucune question`);s.answers.push(row(m,next.exercise.id));
   }
   assert.equal(sessionStatus(s,[m],[]),'complete',`${m.id}/${skill.id}`);assert.equal(s.answers.length,conceptTarget(m,skill.id),`${m.id}/${skill.id}: pas de répétitions superflues`);
  }
 }
});

test('une variante oubliée ou une carte partagée invalide est refusée par le contrat de catalogue',()=>{
 const missing=structuredClone(raw);delete (missing.modules[0].exercises[0] as Exercise).variantId;assert.equal(catalogSchema.safeParse(missing).success,false);
 const invalid=structuredClone(raw),vocab=invalid.modules.find(m=>m.id==='francais-vocabulaire-6e')!;
 (vocab.exercises[0] as Exercise).reviewId='inconnue';assert.equal(catalogSchema.safeParse(invalid).success,false);
});

test('les questions publiées conservent leur sens, leurs réponses et leur version de correction archivée',()=>{
 for(const old of previous.modules){const m=catalog.modules.find(m=>m.id===old.id)!;
  for(const q of old.exercises){const current=m.exercises.find(other=>other.id===q.id)!;assert.ok(current,q.id);
   for(const field of ['prompt','answer','options','passage','kind'] as const)assert.deepEqual(current[field],q[field],`${old.id}/${q.id}/${field}`);
  }
 }
 for(const m of modules)for(const q of m.exercises.filter(q=>reviewModeFor(m,q)==='question'))assert.ok(m.exercises.some(c=>c.id===reviewIdFor(q)),q.id);
});
