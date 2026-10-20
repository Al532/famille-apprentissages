import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,GoogleAuthProvider,signInWithPopup,signInWithEmailAndPassword,createUserWithEmailAndPassword,deleteUser,signOut,onAuthStateChanged,type User} from 'firebase/auth';
import {getFirestore,connectFirestoreEmulator,collection,onSnapshot,doc,getDoc,Timestamp,writeBatch} from 'firebase/firestore';
import {attemptSchema,evaluate,projectSkill,schedule,type Attempt,type Result,type SkillProgress,type ReviewState} from '@famille/core';
import {catalog,catalogs} from './catalog';
import {projectHistory,type RecordedAttempt} from './history';
import {recordAttempt} from './cloud-record';
export type Learner={id:string;name:string;level:string;uid?:string};
export type Snapshot={learners:Learner[];results:Result[];progress:Record<string,SkillProgress[]>;reviews:Record<string,ReviewState[]>;familyId?:string;role?:'parent'|'learner';sync?:'loading'|'synced'|'offline';ignoredAttempts?:number};
export const empty:Snapshot={learners:[],results:[],progress:{},reviews:{}};
const env=import.meta.env;
const required=[env.VITE_FIREBASE_API_KEY,env.VITE_FIREBASE_AUTH_DOMAIN,env.VITE_FIREBASE_PROJECT_ID,env.VITE_FIREBASE_APP_ID];
export const cloud=required.every(Boolean);
export const partialConfig=required.some(Boolean)&&!cloud;
const config={apiKey:env.VITE_FIREBASE_API_KEY,authDomain:env.VITE_FIREBASE_AUTH_DOMAIN,projectId:env.VITE_FIREBASE_PROJECT_ID,appId:env.VITE_FIREBASE_APP_ID};
const app=cloud?initializeApp(config):undefined;
export const auth=app?getAuth(app):undefined;
const db=app?getFirestore(app):undefined;
if(app&&env.VITE_USE_EMULATORS==='true'){
 connectAuthEmulator(auth!,'http://127.0.0.1:9099');connectFirestoreEmulator(db!,'127.0.0.1',8080);
}
const key='famille-demo-v1';
const initial=():Snapshot=>({...structuredClone(empty),learners:[{id:'maurice',name:'Maurice',level:'6e'},{id:'ondine',name:'Ondine',level:'CE1'}]});
export function readDemo():Snapshot {try {const v=localStorage.getItem(key);return v?JSON.parse(v):initial();}catch{return initial();}}
export function resetDemo(){localStorage.removeItem(key);window.dispatchEvent(new Event('family-demo-change'));}
export function listenDemo(cb:(s:Snapshot)=>void){const run=()=>cb(readDemo());run();window.addEventListener('storage',run);window.addEventListener('family-demo-change',run);return()=>{window.removeEventListener('storage',run);window.removeEventListener('family-demo-change',run);};}
export async function submit(raw:Attempt):Promise<{result:Result}> {
 const attempt=attemptSchema.parse(raw);
 if(db){
  const user=auth!.currentUser;if(!user)throw new Error('Connexion nécessaire.');
  const access=await getDoc(doc(db,'access',user.uid)),membership=access.data();
  if(!membership||membership.role!=='learner'||membership.learnerId!==attempt.learnerId)throw new Error('Ce compte ne peut pas enregistrer les réponses de cet enfant.');
  evaluate(catalog,attempt); // Check catalog compatibility before committing the raw answer.
  const saved=await recordAttempt(db,user.uid,membership.familyId,attempt);
  return {result:evaluate(catalog,saved.attempt,new Date(saved.recordedAt))};
 }
 const data=readDemo(),duplicate=data.results.find(r=>r.id===attempt.id);
 if(duplicate)return {result:duplicate};
 const result=evaluate(catalog,attempt),rs=data.reviews[attempt.learnerId]??[],previous=rs.find(r=>r.moduleId===attempt.moduleId&&r.exerciseId===attempt.exerciseId);
 const card=schedule(previous?.card,result.rating,new Date(result.recordedAt));
 data.reviews[attempt.learnerId]=[...rs.filter(r=>r!==previous),{moduleId:result.moduleId,exerciseId:result.exerciseId,card}];
 let progress=data.progress[attempt.learnerId]??[];
 for(const skillId of result.skillIds){const prev=progress.find(s=>s.moduleId===result.moduleId&&s.skillId===skillId);progress=[...progress.filter(s=>s!==prev),projectSkill(prev,result,skillId)];}
 data.progress[attempt.learnerId]=progress;data.results.push(result);localStorage.setItem(key,JSON.stringify(data));window.dispatchEvent(new Event('family-demo-change'));return {result};
}
export async function loginParent(){if(auth)await signInWithPopup(auth,new GoogleAuthProvider());}
export async function loginLearner(email:string,password:string){if(auth)await signInWithEmailAndPassword(auth,email,password);}
export async function logout(){if(auth)await signOut(auth);}
export function listenAuth(cb:(u:User|null)=>void){return auth?onAuthStateChanged(auth,cb):()=>{};}
/** The parent enters the new password themselves. Secondary Auth preserves the parent session. */
export async function addLearner(familyId:string,input:{name:string;level:string;email:string;password:string}){
 if(!db||!auth?.currentUser)throw new Error('Connexion nécessaire.');
 const name=input.name.trim();if(!name||name.length>80||!input.level.trim()||input.level.length>20)throw new Error('Profil invalide.');
 const secondary=initializeApp(config,'child-creation-'+crypto.randomUUID()),childAuth=getAuth(secondary);
 if(env.VITE_USE_EMULATORS==='true')connectAuthEmulator(childAuth,'http://127.0.0.1:9099');
 let created:User|undefined;
 try{
  created=(await createUserWithEmailAndPassword(childAuth,input.email,input.password)).user;
  const id=crypto.randomUUID(),batch=writeBatch(db);
  batch.set(doc(db,'access',created.uid),{familyId,role:'learner',learnerId:id});
  batch.set(doc(db,`families/${familyId}/learners/${id}`),{name,level:input.level,uid:created.uid});
  await batch.commit();
 }catch(error){
  if(created){try{await deleteUser(created);}catch{throw new Error('Le compte a été créé mais le profil n’a pas été associé. Notez son identifiant dans Authentication pour terminer la configuration.');}}
  throw error;
 }finally{await signOut(childAuth);await deleteApp(secondary);}
}
export async function watchCloud(user:User,cb:(s:Snapshot)=>void,onError:(e:Error)=>void):Promise<()=>void>{
 let state=structuredClone(empty),stopped=false,started=false;
 const unsubscribers:(()=>void)[]=[],learnerStops=new Map<string,()=>void>(),histories=new Map<string,ReturnType<typeof projectHistory>>(),fresh=new Map<string,boolean>();
 const publish=()=>{if(stopped)return;state.results=[...histories.values()].flatMap(h=>h.results);state.ignoredAttempts=[...histories.values()].reduce((sum,h)=>sum+h.ignored,0);state.sync=[...fresh.values()].every(Boolean)?'synced':'offline';cb({...state,progress:{...state.progress},reviews:{...state.reviews}});};
 const fail=(e:Error)=>{if(stopped)return;stopped=true;unsubscribers.forEach(u=>u());learnerStops.forEach(u=>u());cb(empty);onError(e);};
 const watchLearner=(id:string)=>{
  if(learnerStops.has(id))return;fresh.set(id,false);
  learnerStops.set(id,onSnapshot(collection(db!,`families/${state.familyId}/learners/${id}/attempts`),{includeMetadataChanges:true},snapshot=>{
   const records:RecordedAttempt[]=snapshot.docs.filter(d=>!d.metadata.hasPendingWrites).flatMap(d=>{const data=d.data();return data.recordedAt instanceof Timestamp?[{attempt:data.attempt as Attempt,recordedAt:data.recordedAt.toDate().toISOString()}]:[];});
   const history=projectHistory(catalogs,records);histories.set(id,history);state.progress[id]=history.progress;state.reviews[id]=history.reviews;fresh.set(id,!snapshot.metadata.fromCache);publish();
  },fail));
 };
 unsubscribers.push(onSnapshot(doc(db!,'access',user.uid),snapshot=>{
  const access=snapshot.data();
  if(!access||typeof access.familyId!=='string'||!['parent','learner'].includes(access.role))return fail(new Error('Compte à configurer : communiquez votre identifiant au responsable de la famille.'));
  if(__APP__==='parents'&&access.role!=='parent')return fail(new Error('Cet espace est réservé aux parents.'));
  if(started){if(access.familyId!==state.familyId||access.role!==state.role)return fail(new Error('Vos droits ont changé. Reconnectez-vous.'));return;}
  started=true;state.familyId=access.familyId;state.role=access.role;fresh.set('profiles',false);cb({...state,sync:'loading'});
  if(access.role==='parent'){
   unsubscribers.push(onSnapshot(collection(db!,`families/${access.familyId}/learners`),{includeMetadataChanges:true},snapshot=>{
    state.learners=snapshot.docs.map(d=>({id:d.id,...d.data()} as Learner));
    const ids=new Set(state.learners.map(l=>l.id));for(const [id,stop] of learnerStops)if(!ids.has(id)){stop();learnerStops.delete(id);histories.delete(id);fresh.delete(id);delete state.progress[id];delete state.reviews[id];}
    state.learners.forEach(l=>watchLearner(l.id));fresh.set('profiles',!snapshot.metadata.fromCache);publish();
   },fail));
  }else if(typeof access.learnerId==='string'){
   const id=access.learnerId;
   unsubscribers.push(onSnapshot(doc(db!,`families/${access.familyId}/learners/${id}`),{includeMetadataChanges:true},snapshot=>{state.learners=snapshot.exists()?[{id,...snapshot.data()} as Learner]:[];fresh.set('profiles',!snapshot.metadata.fromCache);publish();},fail));watchLearner(id);
  }else fail(new Error('Profil enfant absent.'));
 },fail));
 return()=>{stopped=true;unsubscribers.forEach(u=>u());learnerStops.forEach(u=>u());};
}
