import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogSchema,projectConcepts,projectQuestionReviews,reviewModeFor,conceptEvidence,planSession,nextSessionQuestion,sessionStatus,SESSION_MAX_QUESTIONS,learningDay,type Result,type Module,type LearningSession} from '@famille/core';
import raw from '../packages/catalog/catalog.json';
const catalog=catalogSchema.parse(raw),modules=catalog.modules.filter(m=>m.levels.includes('6e'));
const module=modules[0],skill=module.skills[0].id,questions=module.exercises.filter(q=>q.skillIds.includes(skill));
const start=new Date('2026-10-21T09:00:00Z');let counter=0;
function result(m:Module,q=m.exercises[0],correct=true,at=start):Result {return {schemaVersion:1,id:`answer-${++counter}`,learnerId:'test',moduleId:m.id,moduleVersion:m.version,catalogRevision:catalog.revision,exerciseId:q.id,skillIds:q.skillIds,kind:q.kind,correct,rating:correct?3:1,durationMs:5000,recordedAt:new Date(at.getTime()+counter*1000).toISOString()};}
function oneConcept():LearningSession{return {startedAt:start.toISOString(),subject:'Français',concepts:[{moduleId:module.id,skillId:skill,label:'test',subject:'Français'}],answers:[]};}
test('les séances portent sur une seule matière ou équilibrent toutes les matières',()=>{
 const french=planSession(modules,[],'Français',start);assert.equal(french.concepts.length,4);assert.ok(french.concepts.every(c=>c.subject==='Français'));
 const mixed=planSession(modules,[],'Toutes',start);assert.ok(mixed.concepts.some(c=>c.subject==='Français'));assert.ok(mixed.concepts.some(c=>c.subject==='Histoire-géographie'));assert.equal(mixed.concepts.filter(c=>c.exerciseId).length,3);
});
test('une question réussie est écartée tant que des exemples nouveaux existent, même un autre jour',()=>{
 const session=oneConcept(),past=result(module,questions[0],true,new Date('2026-10-18T09:00:00Z'));
 assert.notEqual(nextSessionQuestion(session,modules,[past],()=>0)?.exercise.id,questions[0].id);
 session.answers.push(result(module,questions[1]));assert.notEqual(nextSessionQuestion(session,modules,[past],()=>0)?.exercise.id,questions[1].id);
});
test('répéter une correction ne suffit pas à valider une notion',()=>{
 const rows=[result(module,questions[0],false),result(module,questions[0],true)];
 const evidence=conceptEvidence(module,skill,rows);assert.equal(evidence.ready,false);assert.equal(evidence.distinctCorrect,0);assert.deepEqual(evidence.pending,[]);
 rows.push(result(module,questions[1]),result(module,questions[2]));assert.equal(conceptEvidence(module,skill,rows).ready,false);
 rows.push(result(module,questions[3]));assert.equal(conceptEvidence(module,skill,rows).ready,true);
});
test('une erreur après des réussites exige encore deux nouveaux contextes après la dernière erreur',()=>{
 const rows=[result(module,questions[0]),result(module,questions[1]),result(module,questions[2]),result(module,questions[3],false),result(module,questions[3],true)];
 assert.equal(conceptEvidence(module,skill,rows).ready,false);
 rows.push(result(module,questions[4]));assert.equal(conceptEvidence(module,skill,rows).ready,false);
 rows.push(result(module,questions[5]));assert.equal(conceptEvidence(module,skill,rows).ready,true);
});
test('une erreur revient après trois autres réponses et ne disparaît pas à la fin d’une séance',()=>{
 const session=oneConcept();session.answers.push(result(module,questions[0],false));
 for(let i=1;i<=3;i++){const next=nextSessionQuestion(session,modules,[],()=>0)!;assert.notEqual(next.exercise.id,questions[0].id);session.answers.push(result(module,next.exercise));}
 const retry=nextSessionQuestion(session,modules,[],()=>0)!;assert.equal(retry.exercise.id,questions[0].id);assert.equal(retry.retry,true);
 const tomorrow=new Date('2026-10-22T09:00:00Z'),resumed=planSession([module],session.answers,'Français',tomorrow);
 assert.ok(resumed.concepts.some(c=>c.skillId===skill));
});
test('FSRS est revu une fois par notion et par jour, pas une fois par carte',()=>{
 const day1=questions.slice(0,3).map(q=>result(module,q));
 const once=projectConcepts([module],day1).find(c=>c.skillId===skill)!;
 assert.equal(once.card?.reps,1);assert.equal(once.evidence.ready,true);assert.ok(Date.parse(once.card!.due)>Date.parse(day1.at(-1)!.recordedAt));
 const day2=new Date('2026-10-24T09:00:00Z'),rows=[...day1,...questions.slice(3,6).map(q=>result(module,q,true,day2))];
 assert.equal(projectConcepts([module],rows).find(c=>c.skillId===skill)!.card?.reps,2);
 assert.deepEqual(projectConcepts([module],rows),projectConcepts([module],[...rows].reverse()));
});
test('les réponses d’un autre concept ne sont pas comptées et les doublons sont ignorés',()=>{
 const row=result(module,questions[0]);const state=projectConcepts([module],[row,row]);assert.equal(state.find(c=>c.skillId===skill)!.evidence.attempts,1);assert.equal(state.find(c=>c.skillId!==skill)!.evidence.attempts,0);
});
test('trois exemples différents suffisent : pas de revue exhaustive, ni de séance infinie',()=>{
 const session=planSession(modules,[],'Toutes',start);let steps=0;
 while(sessionStatus(session,modules,[])==='working'&&steps++<50){const next=nextSessionQuestion(session,modules,[],()=>0);assert.ok(next);session.answers.push(result(next.module,next.exercise));}
 assert.equal(sessionStatus(session,modules,[]),'complete');assert.equal(session.answers.length,12);
 const failing=planSession(modules,[],'Français',start);steps=0;
 while(sessionStatus(failing,modules,[])==='working'&&steps++<50){const next=nextSessionQuestion(failing,modules,[],()=>0);assert.ok(next);failing.answers.push(result(next.module,next.exercise,false));}
 assert.equal(sessionStatus(failing,modules,[]),'limit');assert.equal(failing.answers.length,SESSION_MAX_QUESTIONS);
});
test('une séance terminée ne réintroduit pas les mêmes notions le même jour',()=>{
 const session=planSession(modules,[],'Français',start);
 while(sessionStatus(session,modules,[])==='working'){const next=nextSessionQuestion(session,modules,[],()=>0)!;session.answers.push(result(next.module,next.exercise));}
 const again=planSession(modules,session.answers,'Français',start);
 for(const c of again.concepts)assert.ok(!session.concepts.some(done=>c.moduleId===done.moduleId&&c.skillId===done.skillId));
});
test('une séance est bornée aussi par le temps actif et ne compte pas trois questions sur le même contexte comme trois preuves',()=>{
 const session=oneConcept();session.answers=[{...result(module,questions[0]),durationMs:600000},{...result(module,questions[1]),durationMs:200000}];assert.equal(sessionStatus(session,modules,[]),'limit');
 const copied=structuredClone(module);copied.exercises.slice(0,3).forEach(q=>q.contextId='same');const rows=copied.exercises.slice(0,3).map(q=>result(copied,q));assert.ok(conceptEvidence(copied,skill,rows).distinctCorrect<=1);
});
test('une seule réponse juste n’établit pas un intervalle de plusieurs jours ; journée française en été et en hiver',()=>{
 const state=projectConcepts([module],[result(module,questions[0])]).find(c=>c.skillId===skill)!;assert.equal(state.evidence.ready,false);assert.equal(learningDay(state.card!.due),'2026-10-22');
 assert.equal(learningDay('2026-10-21T22:30:00Z'),'2026-10-22');assert.equal(learningDay('2026-12-21T23:30:00Z'),'2026-12-22');
});
test('chaque notion de Maurice a une réserve d’au moins douze questions corrigées et l’exemple de maths est retiré',()=>{
 assert.ok(!modules.some(m=>m.subject==='Mathématiques'));
 for(const m of modules)for(const skill of m.skills){const qs=m.exercises.filter(q=>q.skillIds.includes(skill.id));assert.ok(qs.length>=12,`${m.id}/${skill.id}: ${qs.length}`);assert.ok(qs.every(q=>q.kind==='choice'&&q.explanation));}
 assert.ok(modules.some(m=>m.id==='histoire-reperes'));assert.ok(modules.some(m=>m.id==='geographie-reperes'));
});
test('les découvertes tournent entre ateliers au lieu de finir tous les homophones avant la lecture',()=>{
 const accumulated:Result[]=[];const discovered=new Set<string>();
 for(let i=0;i<2;i++){const session=planSession(modules,accumulated,'Français',start);session.concepts.forEach(c=>discovered.add(c.moduleId));while(sessionStatus(session,modules,accumulated)==='working'){const next=nextSessionQuestion(session,modules,accumulated,()=>0)!;session.answers.push(result(next.module,next.exercise));}accumulated.push(...session.answers);}
 assert.ok(discovered.has('francais-conjugaison-6e'));assert.ok(discovered.has('francais-vocabulaire-6e'));assert.ok(discovered.has('francais-lecture-6e'));
});
test('les repères factuels ont un calendrier indépendant sans déclarer leur thème compris',()=>{
 const m=modules.find(m=>m.id==='histoire-cm2')!,qs=m.exercises.filter(q=>q.skillIds.includes('republique')&&reviewModeFor(m,q)==='question');
 const rows=qs.slice(0,3).map(q=>result(m,q));const cards=projectQuestionReviews([m],rows);
 assert.equal(cards.length,3);assert.ok(cards.every(c=>c.card.reps===1));
 assert.equal(projectConcepts([m],rows).find(c=>c.skillId==='republique')!.evidence.ready,false);
 const session=planSession([m],rows,'Histoire-géographie',start);assert.ok(!session.concepts.some(c=>qs.slice(0,3).some(q=>c.exerciseId===q.id)));
});
test('les erreurs factuelles sont corrigées après trois autres questions puis revues le lendemain',()=>{
 const m=modules.find(m=>m.id==='histoire-cm2')!,q=m.exercises.find(q=>reviewModeFor(m,q)==='question')!;
 const session:LearningSession={startedAt:start.toISOString(),subject:m.subject,concepts:[{moduleId:m.id,skillId:q.skillIds[0],exerciseId:q.id,label:'repère',subject:m.subject}],answers:[result(m,q,false)]};
 for(let i=0;i<3;i++){const next=nextSessionQuestion(session,modules,[],()=>0)!;assert.ok(next);assert.notEqual(next.exercise.id,q.id);session.answers.push(result(next.module,next.exercise));}
 const retry=nextSessionQuestion(session,modules,[],()=>0)!;assert.equal(retry.exercise.id,q.id);session.answers.push(result(m,q));
 assert.equal(sessionStatus(session,modules,[]),'complete');const review=projectQuestionReviews([m],session.answers).find(r=>r.exerciseId===q.id)!;assert.equal(review.needsRepair,false);assert.equal(review.card.reps,1);assert.equal(learningDay(review.card.due),'2026-10-22');
});
test('un oubli de date n’empêche pas de vérifier séparément la compréhension du régime politique',()=>{
 const m=modules.find(m=>m.id==='histoire-cm2')!,date=m.exercises.find(q=>q.skillIds.includes('republique')&&reviewModeFor(m,q)==='question')!;
 const reasoning=m.exercises.filter(q=>q.skillIds.includes('republique')&&reviewModeFor(m,q)==='concept');
 const rows=[result(m,date,false),...reasoning.slice(0,3).map(q=>result(m,q))];
 assert.equal(projectConcepts([m],rows).find(c=>c.skillId==='republique')!.evidence.ready,true);assert.equal(projectQuestionReviews([m],rows)[0].needsRepair,true);
 const session:LearningSession={startedAt:start.toISOString(),subject:m.subject,concepts:[{moduleId:m.id,skillId:'republique',label:'République',subject:m.subject}],answers:[]};assert.equal(sessionStatus(session,[m],rows),'complete');
});
