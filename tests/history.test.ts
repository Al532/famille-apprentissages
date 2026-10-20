import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogSchema,type Attempt} from '@famille/core';
import raw from '../packages/catalog/catalog.json';
import archive from '../packages/catalog/archive.json';
import {projectHistory} from '../apps/web/src/history';
const catalog=catalogSchema.parse(raw),base:Attempt={schemaVersion:1,id:'eaad642b-bb94-4b26-aee0-510f0560056b',learnerId:'ondine',moduleId:'calcul-ce1',moduleVersion:catalog.modules.find(m=>m.id==='calcul-ce1')!.version,catalogRevision:catalog.revision,exerciseId:'add-7-5',answer:'12',durationMs:2000};
const first={attempt:base,recordedAt:'2026-10-20T09:00:00.000Z'};
test('parent et enfant recalculent le même suivi, indépendamment de l’ordre des documents',()=>{
 const second={attempt:{...base,id:'eaad642b-bb94-4b26-aee0-510f0560056c',answer:'11'},recordedAt:'2026-10-20T10:00:00.000Z'};
 const parent=projectHistory([catalog],[second,first]),child=projectHistory([catalog],[first,second]);
 assert.deepEqual(parent,child);assert.equal(parent.results.length,2);assert.equal(parent.progress[0].assessed,2);assert.equal(parent.progress[0].correct,1);assert.equal(parent.reviews[0].card.reps,2);
});
test('un doublon ne change ni le compte des réponses ni le calendrier',()=>assert.deepEqual(projectHistory([catalog],[first,first]),projectHistory([catalog],[first])));
test('les tentatives ne contiennent pas de score, et un score ajouté est refusé',()=>{
 const forged={...first,attempt:{...base,correct:true}};const result=projectHistory([catalog],[forged]);assert.equal(result.results.length,0);assert.equal(result.ignored,1);
});
test('une ancienne révision reste corrigée avec son catalogue archivé',()=>{
 const current={...catalog,revision:'99.0.0'},h=projectHistory([current,catalog],[first]);assert.equal(h.ignored,0);assert.equal(h.progress[0].correct,1);
});
test('une version inconnue ou une date invalide donne un suivi explicitement partiel',()=>{
 assert.equal(projectHistory([catalog],[{...first,attempt:{...base,catalogRevision:'0.0.0'}}]).ignored,1);
 assert.equal(projectHistory([catalog],[{...first,recordedAt:'invalide'}]).ignored,1);
});
test('les cartes autoévaluées gardent un compte distinct du taux de réussite',()=>{
 const record={...first,attempt:{...base,moduleId:'fractions-6e',moduleVersion:catalog.modules.find(m=>m.id==='fractions-6e')!.version,exerciseId:'definition',answer:'',selfRating:3 as const}};
 const h=projectHistory([catalog],[record]);assert.equal(h.progress[0].assessed,0);assert.equal(h.progress[0].selfReviews,1);
});

test('une ancienne saisie et le nouveau QCM gardent le même suivi et calendrier de révision',()=>{
 const old=catalogSchema.parse(archive.find(c=>c.revision==='0.2.0'));
 const oldModule=old.modules.find(m=>m.id==='francais-homophones-bases-6e')!;
 const currentModule=catalog.modules.find(m=>m.id===oldModule.id)!;
 const oldQuestion=oldModule.exercises.find(q=>q.kind==='text')!;
 const currentQuestion=currentModule.exercises.find(q=>q.id===oldQuestion.id)!;
 assert.equal(currentQuestion.kind,'choice');assert.equal(currentQuestion.answer,oldQuestion.answer);
 const previous={attempt:{...base,moduleId:oldModule.id,moduleVersion:oldModule.version,catalogRevision:old.revision,exerciseId:oldQuestion.id,answer:oldQuestion.answer},recordedAt:'2026-10-20T09:00:00.000Z'};
 const recent={attempt:{...previous.attempt,id:'c673e63a-17b8-42d5-9b2d-a406b9c2fa46',moduleVersion:currentModule.version,catalogRevision:catalog.revision},recordedAt:'2026-10-20T11:00:00.000Z'};
 const result=projectHistory([catalog,old],[previous,recent]);
 assert.equal(result.ignored,0);assert.deepEqual(result.results.map(r=>r.kind),['text','choice']);
 assert.equal(result.progress[0].assessed,2);assert.equal(result.progress[0].correct,2);
 assert.equal(result.reviews.length,1);assert.equal(result.reviews[0].card.reps,2);
});
