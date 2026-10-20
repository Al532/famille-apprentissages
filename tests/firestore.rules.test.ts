import {after,before,beforeEach,test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,collection,getDocs,deleteDoc,serverTimestamp,Timestamp,writeBatch} from 'firebase/firestore';
import raw from '../packages/catalog/catalog.json';
let env:RulesTestEnvironment;
const attempt={schemaVersion:1,id:'eaad642b-bb94-4b26-aee0-510f0560056b',learnerId:'ondine',moduleId:'calcul-ce1',moduleVersion:'0.1.0',catalogRevision:raw.revision,exerciseId:'add-7-5',answer:'12',durationMs:2000};
const path=`families/test/learners/ondine/attempts/${attempt.id}`;
const event=()=>({attempt,senderUid:'c1',recordedAt:serverTimestamp()});
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-famille',firestore:{rules:await readFile('infra/firestore.rules','utf8')}});});
beforeEach(async()=>{await env.clearFirestore();await env.withSecurityRulesDisabled(async ctx=>{const db=ctx.firestore();for(const [uid,access] of Object.entries({p:{familyId:'test',role:'parent'},c1:{familyId:'test',role:'learner',learnerId:'ondine'},c2:{familyId:'test',role:'learner',learnerId:'maurice'},other:{familyId:'other',role:'parent'}}))await setDoc(doc(db,'access',uid),access);await setDoc(doc(db,'families/test/learners/ondine'),{name:'Ondine',level:'CE1',uid:'c1'});await setDoc(doc(db,'families/test/learners/maurice'),{name:'Maurice',level:'6e',uid:'c2'});});});
after(async()=>env?.cleanup());
test('le parent lit tous les profils, un enfant lit seulement le sien',async()=>{
 await assertSucceeds(getDocs(collection(env.authenticatedContext('p').firestore(),'families/test/learners')));
 const db=env.authenticatedContext('c1').firestore();await assertSucceeds(getDoc(doc(db,'families/test/learners/ondine')));await assertFails(getDoc(doc(db,'families/test/learners/maurice')));await assertFails(getDocs(collection(db,'families/test/learners')));
});
test('visiteur, autre famille et compte sans rattachement refusés',async()=>{for(const db of [env.unauthenticatedContext().firestore(),env.authenticatedContext('other').firestore(),env.authenticatedContext('new').firestore()])await assertFails(getDoc(doc(db,'families/test/learners/ondine')));});
test('seul le compte enfant lié peut créer une réponse brute avec une date serveur',async()=>{
 await assertSucceeds(setDoc(doc(env.authenticatedContext('c1').firestore(),path),event()));
 await assertSucceeds(getDocs(collection(env.authenticatedContext('p').firestore(),'families/test/learners/ondine/attempts')));
 await assertFails(getDoc(doc(env.authenticatedContext('c2').firestore(),path)));
});
test('parent, autre enfant et autre famille ne peuvent écrire à la place de cet enfant',async()=>{for(const uid of ['p','c2','other'])await assertFails(setDoc(doc(env.authenticatedContext(uid).firestore(),path),{...event(),senderUid:uid}));});
test('le choix d’un prénom ou des claims forgés ne donne pas de droits',async()=>{await assertFails(setDoc(doc(env.authenticatedContext('new',{familyId:'test',role:'learner',learnerId:'ondine'}).firestore(),path),{...event(),senderUid:'new'}));});
test('scores ajoutés, champs manquants, durée et date client sont refusés',async()=>{
 const db=env.authenticatedContext('c1').firestore();
 for(const data of [{...event(),correct:true},{...event(),attempt:{...attempt,correct:true}},{...event(),attempt:{...attempt,durationMs:-1}},{...event(),attempt:{...attempt,answer:'a'.repeat(501)}},{...event(),attempt:{...attempt,selfRating:5}},{...event(),recordedAt:Timestamp.fromDate(new Date('2099-01-01'))},{...event(),senderUid:'c2'}])await assertFails(setDoc(doc(db,path),data));
 const {answer,...missing}=attempt;await assertFails(setDoc(doc(db,path),{...event(),attempt:missing}));
});
test('un historique ne peut être ni réécrit ni supprimé, même par le parent',async()=>{
 await assertSucceeds(setDoc(doc(env.authenticatedContext('c1').firestore(),path),event()));
 for(const uid of ['p','c1']){const db=env.authenticatedContext(uid).firestore();await assertFails(setDoc(doc(db,path),event()));await assertFails(deleteDoc(doc(db,path)));}
});
test('aucun navigateur ne peut créer ou modifier des droits parent',async()=>{
 await assertFails(setDoc(doc(env.authenticatedContext('new').firestore(),'access/new'),{familyId:'test',role:'parent'}));
 await assertFails(setDoc(doc(env.authenticatedContext('p').firestore(),'access/new'),{familyId:'test',role:'parent'}));
 await assertFails(setDoc(doc(env.authenticatedContext('c1').firestore(),'access/c1'),{familyId:'test',role:'parent'}));
 await assertFails(deleteDoc(doc(env.authenticatedContext('p').firestore(),'access/p')));
});
test('le parent peut créer ensemble un profil et son rattachement enfant',async()=>{
 const db=env.authenticatedContext('p').firestore(),batch=writeBatch(db);batch.set(doc(db,'access/new'),{familyId:'test',role:'learner',learnerId:'new-child'});batch.set(doc(db,'families/test/learners/new-child'),{name:'Enfant test',level:'CE1',uid:'new'});await assertSucceeds(batch.commit());
 await assertSucceeds(getDoc(doc(env.authenticatedContext('new').firestore(),'families/test/learners/new-child')));
});
test('profil non lié, détournement d’un UID et rattachement isolé sont refusés',async()=>{
 const db=env.authenticatedContext('p').firestore();await assertFails(setDoc(doc(db,'access/new'),{familyId:'test',role:'learner',learnerId:'new-child'}));
 await assertFails(setDoc(doc(db,'families/test/learners/new-child'),{name:'Test',level:'CE1',uid:'c1'}));
 const batch=writeBatch(db);batch.set(doc(db,'access/other'),{familyId:'test',role:'learner',learnerId:'new-child'});batch.set(doc(db,'families/test/learners/new-child'),{name:'Test',level:'CE1',uid:'other'});await assertFails(batch.commit());
});
test('révocation enfant et absence d’accès aux anciens scores dérivés',async()=>{
 const db=env.authenticatedContext('p').firestore();await assertSucceeds(deleteDoc(doc(db,'access/c1')));await assertFails(getDoc(doc(env.authenticatedContext('c1').firestore(),'families/test/learners/ondine')));
 for(const suffix of ['progress/faux','reviews/faux','events/faux'])await assertFails(setDoc(doc(db,`families/test/learners/ondine/${suffix}`),{correct:100}));
});
