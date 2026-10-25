import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogSchema,evaluate,conceptEvidence,exerciseContext,projectConcepts,projectCurrentSkills,projectQuestionReviews,reviewIdFor,reviewModeFor,planSession,learningDay,type Exercise,type Result} from '@famille/core';
import raw from '../packages/catalog/catalog.json';
import archive from '../packages/catalog/archive.json';
const catalog=catalogSchema.parse(raw),module=catalog.modules.find(m=>m.id==='francais-conjugaison-6e')!;
const previous=catalogSchema.parse(archive.find(c=>c.revision==='0.6.0')),old=previous.modules.find(m=>m.id===module.id)!;
const at=new Date('2026-10-25T10:00:00Z');let sequence=0;
const question=(id:string)=>{const q=module.exercises.find(q=>q.id===id);assert.ok(q,id);return q;};
function result(q:Exercise,correct=true):Result {
 return {schemaVersion:1,id:`conjugaison-${++sequence}`,learnerId:'test',moduleId:module.id,moduleVersion:module.version,catalogRevision:catalog.revision,exerciseId:q.id,skillIds:q.skillIds,kind:q.kind,correct,rating:correct?3:1,durationMs:5000,recordedAt:new Date(at.getTime()+sequence*1000).toISOString()};
}

test('les règles régulières ont un calendrier distinct par groupe et par temps',()=>{
 for(const tense of ['present','imparfait','futur','passe-compose','passe-simple','plus-que-parfait']){
  for(const group of [1,2])assert.ok(module.skills.some(s=>s.id===`regle-${tense}-g${group}`));
  assert.ok(!projectConcepts([module],[]).some(s=>s.skillId===`temps-${tense}`));
 }
 const skill='regle-present-g1',bank=module.exercises.filter(q=>q.skillIds.includes(skill));
 const rows=module.skills.find(s=>s.id===skill)!.variants!.map(v=>result(bank.find(q=>q.variantId===v.id)!));
 assert.equal(conceptEvidence(module,skill,rows).ready,true);
 assert.equal(conceptEvidence(module,'regle-present-g2',rows).attempts,0);
 assert.equal(conceptEvidence(module,'regle-imparfait-g1',rows).attempts,0);
});

test('trois personnes du singulier ne valident pas à elles seules le présent régulier',()=>{
 const skill='regle-present-g2',bank=module.exercises.filter(q=>q.skillIds.includes(skill));
 const rows=['1s','2s','3s'].map(v=>result(bank.find(q=>q.variantId===v)!));
 const state=conceptEvidence(module,skill,rows);assert.equal(state.ready,false);assert.deepEqual(state.missingVariants,['1p','2p','3p']);
});

test('les formes irrégulières sont espacées par verbe, temps et personne',()=>{
 const faites=question('temps-present-01'),fais=question('temps-present-reserve-04'),dites=question('temps-present-reserve-05');
 for(const q of [faites,fais,dites])assert.equal(reviewModeFor(module,q),'question');
 const rows=[result(faites)],states=projectQuestionReviews([module],rows);assert.equal(states.length,1);
 const planned=planSession([module],rows,module.subject,at);
 assert.ok(!planned.concepts.some(c=>c.exerciseId===reviewIdFor(faites)));
 const isolated={...module,skills:module.skills.filter(s=>s.id==='formes-present'),exercises:[faites,fais,dites]};
 const remaining=planSession([isolated],rows,module.subject,at);assert.ok(remaining.concepts.some(c=>c.exerciseId===reviewIdFor(fais)));assert.ok(remaining.concepts.some(c=>c.exerciseId===reviewIdFor(dites)));
 assert.ok(projectConcepts([module],rows).every(c=>!c.card),'réussir vous faites ne valide aucune règle régulière');
 const tomorrow=projectQuestionReviews([module],[result(fais,false)])[0];assert.equal(learningDay(tomorrow.card.due),'2026-10-26');
});

test('deux formulations de prirent partagent une carte, sans fusionner les autres personnes ou temps',()=>{
 const a=question('temps-passe-simple-02'),b=question('temps-passe-simple-reserve-10');
 assert.equal(reviewIdFor(a),reviewIdFor(b));
 const rows=[result(a),result(b)],cards=projectQuestionReviews([module],rows);assert.equal(cards.length,1);assert.equal(cards[0].card.reps,1);
 const other=question('temps-present-03');assert.notEqual(reviewIdFor(other),reviewIdFor(a));
});

test('aller reste au troisième groupe ; les radicaux réguliers du futur et de l’imparfait sont distingués des exceptions',()=>{
 assert.deepEqual(question('temps-present-reserve-03').skillIds,['formes-present']);
 assert.deepEqual(question('temps-passe-simple-reserve-07').skillIds,['formes-passe-simple']);
 assert.deepEqual(question('temps-futur-reserve-06').skillIds,['regle-futur-g3'],'prendre : infinitif sans e final');
 assert.deepEqual(question('temps-futur-reserve-07').skillIds,['regle-futur-g3'],'dire : radical dir-');
 assert.deepEqual(question('temps-futur-reserve-05').skillIds,['formes-futur'],'venir : radical viendr- à mémoriser');
 assert.deepEqual(question('temps-imparfait-reserve-04').skillIds,['regle-imparfait-g3'],'faire : radical de nous faisons');
 assert.deepEqual(question('temps-imparfait-reserve-01').skillIds,['formes-imparfait'],'être : radical ét- exceptionnel');
 assert.deepEqual(question('temps-present-reserve-11').skillIds,['regle-present-g2']);
});

test('construire un temps composé avec le participe donné ne vaut pas mémoriser une forme irrégulière',()=>{
 const skill='regle-passe-compose-g3',bank=module.exercises.filter(q=>q.skillIds.includes(skill));assert.ok(bank.every(q=>q.prompt.includes('Participe passé fourni')));
 const rows=module.skills.find(s=>s.id===skill)!.variants!.map(v=>result(bank.find(q=>q.variantId===v.id)!));
 assert.equal(conceptEvidence(module,skill,rows).ready,true);assert.equal(projectQuestionReviews([module],rows).length,0);
 assert.equal(reviewModeFor(module,question('temps-passe-compose-reserve-04')),'question');
});

test('les cartes ne sont pas exclues par deux notions exigeant six variantes chacune',()=>{
 const ids=['regle-present-g1','regle-present-g2','formes-present'];
 const limited={...module,skills:module.skills.filter(s=>ids.includes(s.id)),exercises:module.exercises.filter(q=>q.skillIds.some(s=>ids.includes(s)))};
 const planned=planSession([limited],[],module.subject,at);
 assert.equal(planned.concepts.filter(c=>!c.exerciseId).length,1);
 assert.ok(planned.concepts.filter(c=>c.exerciseId).length>=3,'le budget réserve des rappels de formes');
});

test('les anciennes réponses sont corrigées avec leur catalogue puis réparties sans changer leur contenu',()=>{
 const ids=['temps-present-01','temps-present-reserve-11','temps-passe-simple-02','temps-passe-simple-reserve-10'];
 const rows=ids.map((id,i)=>evaluate(previous,{schemaVersion:1,id:`b17762ee-9f69-4d6a-8024-ec774312015${i}`,learnerId:'test',moduleId:old.id,moduleVersion:old.version,catalogRevision:previous.revision,exerciseId:id,answer:old.exercises.find(q=>q.id===id)!.answer,durationMs:5000},new Date(at.getTime()+i*1000)));
 const untouched=structuredClone(rows),progress=projectCurrentSkills([module],rows),cards=projectQuestionReviews([module],rows);
 assert.deepEqual(rows,untouched);assert.ok(rows.every(r=>r.correct));assert.equal(cards.length,2);
 assert.equal(progress.find(p=>p.skillId==='formes-present')!.assessed,1);
 assert.equal(progress.find(p=>p.skillId==='regle-present-g2')!.assessed,1);
 assert.equal(conceptEvidence(module,'regle-present-g2',rows).ready,false);
 for(const q of old.exercises){const current=question(q.id);for(const field of ['prompt','answer','options','kind'] as const)assert.deepEqual(current[field],q[field]);}
});

test('les mêmes formes régulières restent un seul contexte et les terminaisons proposées restent cohérentes',()=>{
 const q=question('temps-passe-simple-reserve-02'),alias=module.exercises.find(other=>other.id!==q.id&&other.skillIds[0]===q.skillIds[0]&&other.answer===q.answer&&other.prompt.includes('jouer'))!;
 assert.ok(alias);assert.equal(exerciseContext(q),exerciseContext(alias));
 const examples=[['regle-present-g2','obéir','obéissez'],['regle-imparfait-g1','jouer','jouait'],['regle-futur-g3','répondre','répondras'],['regle-passe-simple-g1','parler','parla'],['regle-passe-simple-g2','choisir','choisit'],['regle-passe-compose-g1','arriver','est arrivée'],['regle-plus-que-parfait-g3','partir','étaient parties']];
 for(const [skill,verb,answer] of examples)assert.ok(module.exercises.some(q=>q.skillIds.includes(skill)&&q.prompt.includes(`« ${verb} »`)&&q.answer===answer),`${skill}/${verb}/${answer}`);
});
