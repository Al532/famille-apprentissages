import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogSchema,evaluate,projectSkill,schedule,selectNext,type Attempt} from '@famille/core';
import raw from '../packages/catalog/catalog.json';
import archive from '../packages/catalog/archive.json';
const previous=catalogSchema.parse(archive.find(c=>c.revision==='0.2.0'));
const legacy=catalogSchema.parse(archive.find(c=>c.revision==='0.3.0'));
const catalog=catalogSchema.parse(raw),base:Attempt={schemaVersion:1,id:'eaad642b-bb94-4b26-aee0-510f0560056b',learnerId:'ondine',moduleId:'calcul-ce1',moduleVersion:catalog.modules.find(m=>m.id==='calcul-ce1')!.version,catalogRevision:catalog.revision,exerciseId:'add-7-5',answer:'12',durationMs:2000};
test('le catalogue fourni respecte le contrat canonique',()=>{assert.equal(new Set(catalog.modules.map(m=>m.id)).size,catalog.modules.length);assert.ok(catalog.modules.some(m=>m.id==='calcul-ce1'));assert.ok(!catalog.modules.some(m=>m.id==='fractions-6e'));assert.ok(catalog.modules.some(m=>m.subject==='Histoire-géographie'));});
test('une réponse juste, fausse ou vide est évaluée sans score fourni par le navigateur',()=>{assert.equal(evaluate(catalog,base).correct,true);assert.equal(evaluate(catalog,{...base,answer:'11'}).rating,1);assert.equal(evaluate(catalog,{...base,answer:''}).correct,false);assert.throws(()=>evaluate(catalog,{...base,correct:true}));});
test('une ancienne version de contenu est refusée plutôt que mélangée aux nouveaux résultats',()=>assert.throws(()=>evaluate(catalog,{...base,catalogRevision:'0.0.1'}),/CATALOG_MISMATCH/));
test('les autoévaluations ne gonflent pas la réussite mesurée',()=>{const r=evaluate(legacy,{...base,catalogRevision:legacy.revision,moduleId:'fractions-6e',moduleVersion:legacy.modules.find(m=>m.id==='fractions-6e')!.version,exerciseId:'definition',answer:'',selfRating:3});const p=projectSkill(undefined,r,'sens-fraction');assert.equal(r.correct,null);assert.equal(p.selfReviews,1);assert.equal(p.assessed,0);assert.equal(p.correct,0);});
test('FSRS produit un calendrier sérialisable et révisable après stockage JSON',()=>{const now=new Date('2026-10-19T10:00:00Z');const first=schedule(undefined,3,now);const stored=JSON.parse(JSON.stringify(first));const second=schedule(stored,3,new Date(first.due));assert.equal(second.reps,2);assert.ok(Date.parse(second.due)>Date.parse(first.due));});
test('une révision due passe avant une nouvelle question et une question future attend',()=>{const qs=catalog.modules.find(m=>m.id==='calcul-ce1')!.exercises,now=new Date('2026-10-19T10:00:00Z'),card=schedule(undefined,3,now);const due={moduleId:'calcul-ce1',exerciseId:qs[1].id,card:{...card,due:'2026-10-18T10:00:00Z'}};assert.equal(selectNext(qs,[due],'calcul-ce1',now)?.id,qs[1].id);assert.equal(selectNext([qs[1]],[{...due,card:{...card,due:'2027-01-01T00:00:00Z'}}],'calcul-ce1',now),undefined);});
test('une compétence non déclarée ou un QCM incomplet est refusé',()=>{const copy=structuredClone(raw);copy.modules[0].exercises[0].skillIds=['inconnue'];assert.equal(catalogSchema.safeParse(copy).success,false);const qcm=structuredClone(raw);qcm.modules.find(m=>m.id==='calcul-ce1')!.exercises[1].options=['14','16'];assert.equal(catalogSchema.safeParse(qcm).success,false);});

test('les anciennes saisies acceptent les apostrophes du clavier et la casse, mais distingue les accents',()=>{
 const m=previous.modules.find(m=>m.id==='francais-homophones-bases-6e')!;
 const q=m.exercises.find(q=>q.kind==='text'&&q.answer==='à')!;
 const a={...base,catalogRevision:previous.revision,moduleId:m.id,moduleVersion:m.version,exerciseId:q.id};
 assert.equal(evaluate(previous,{...a,answer:' a '}).correct,false);
 assert.equal(evaluate(previous,{...a,answer:' À '}).correct,true);
 const other=previous.modules.find(m=>m.id==='francais-homophones-determinants-6e')!;
 const question=other.exercises.find(q=>q.kind==='text'&&q.answer==='s’est')!;
 assert.equal(evaluate(previous,{...a,moduleId:other.id,exerciseId:question.id,answer:" S'EST "}).correct,true);
 assert.equal(evaluate(previous,{...a,moduleId:other.id,exerciseId:question.id,answer:''}).correct,false);
});
test('les anciennes réponses saisies alimentent les mêmes compétences et le calendrier que les QCM',()=>{
 const m=previous.modules.find(m=>m.id==='francais-homophones-bases-6e')!;
 const q=m.exercises.find(q=>q.kind==='text')!;
 const r=evaluate(previous,{...base,catalogRevision:previous.revision,moduleId:m.id,moduleVersion:m.version,exerciseId:q.id,answer:'erreur'});
 const p=projectSkill(undefined,r,q.skillIds[0]);
 assert.equal(p.assessed,1);assert.equal(p.correct,0);assert.equal(p.selfReviews,0);
 assert.equal(schedule(undefined,r.rating).reps,1);
 assert.ok(m.exercises.some(other=>other.kind==='choice'&&other.skillIds.includes(q.skillIds[0])));
});
test('le parcours français fournit des corrections et des textes de lecture et une réponse attendue unique dans les choix',()=>{
 const modules=catalog.modules.filter(m=>m.subject==='Français');
 assert.ok(modules.length>=7);
 for(const m of modules)for(const q of m.exercises){
  assert.ok(q.explanation,`${m.id}/${q.id}`);
  if(q.kind==='choice')assert.equal(q.options!.filter(o=>o===q.answer).length,1);
  if(m.id==='francais-lecture-6e')assert.ok(q.passage);
 }
});

test('le catalogue actif ne demande plus de saisie et tous ses QCM ont des choix distincts',()=>{
 for(const m of catalog.modules)for(const q of m.exercises){
  assert.ok(q.kind!=='text'&&q.kind!=='number',`${m.id}/${q.id}`);
  if(q.kind==='choice'){
   assert.equal(q.options!.length,new Set(q.options).size);
   assert.equal(q.options!.filter(option=>option===q.answer).length,1);
  }
 }
});
