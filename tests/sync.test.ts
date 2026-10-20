import {after,before,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {doc,setDoc,collection,getDocs,onSnapshot,type Firestore} from 'firebase/firestore';
import {catalogSchema,type Attempt} from '@famille/core';
import raw from '../packages/catalog/catalog.json';
import {recordAttempt} from '../apps/web/src/cloud-record';
import {projectHistory,type RecordedAttempt} from '../apps/web/src/history';
let env:RulesTestEnvironment;
const catalog=catalogSchema.parse(raw),attempt:Attempt={schemaVersion:1,id:'eaad642b-bb94-4b26-aee0-510f0560056b',learnerId:'child',moduleId:'calcul-ce1',moduleVersion:'0.1.0',catalogRevision:catalog.revision,exerciseId:'add-7-5',answer:'12',durationMs:2000};
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-famille',firestore:{rules:await readFile('infra/firestore.rules','utf8')}});await env.clearFirestore();await env.withSecurityRulesDisabled(async c=>{const db=c.firestore();await setDoc(doc(db,'access/parent'),{familyId:'test',role:'parent'});await setDoc(doc(db,'access/child'),{familyId:'test',role:'learner',learnerId:'child'});await setDoc(doc(db,'families/test/learners/child'),{name:'Enfant test',level:'CE1',uid:'child'});});});
after(async()=>env?.cleanup());
test('deux appareils réessaient la même réponse : une seule écriture et suivi parent en temps réel',async()=>{
 const phone=env.authenticatedContext('child').firestore(),tablet=env.authenticatedContext('child').firestore(),parent=env.authenticatedContext('parent').firestore();
 let stop=()=>{};
 const seen=new Promise<RecordedAttempt[]>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Synchronisation parent non reçue')),10000);stop=onSnapshot(collection(parent,'families/test/learners/child/attempts'),s=>{if(s.docs.length){clearTimeout(timer);resolve(s.docs.map(d=>({attempt:d.data().attempt,recordedAt:d.data().recordedAt.toDate().toISOString()})));}},reject);});
 try{
  const first=await recordAttempt(phone as unknown as Firestore,'child','test',attempt),retry=await recordAttempt(tablet as unknown as Firestore,'child','test',attempt);
  assert.deepEqual(retry,first);const received=await seen;
  assert.equal((await getDocs(collection(parent,'families/test/learners/child/attempts'))).size,1);
  assert.deepEqual(projectHistory([catalog],received),projectHistory([catalog],[first]));
  await assert.rejects(()=>recordAttempt(tablet as unknown as Firestore,'child','test',{...attempt,answer:'11'}),/autre réponse/);
 }finally{stop();}
});
