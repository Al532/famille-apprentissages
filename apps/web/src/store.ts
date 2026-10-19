import {initializeApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,GoogleAuthProvider,signInWithPopup,signInWithEmailAndPassword,signOut,onAuthStateChanged,type User} from 'firebase/auth';
import {getFirestore,connectFirestoreEmulator,collection,onSnapshot,doc} from 'firebase/firestore';
import {getFunctions,connectFunctionsEmulator,httpsCallable} from 'firebase/functions';
import {evaluate,projectSkill,schedule,moduleKey,type Attempt,type Result,type SkillProgress,type ReviewState} from '@famille/core';
import {catalog} from './catalog';
export type Learner={id:string;name:string;level:string};
export type Snapshot={learners:Learner[];results:Result[];progress:Record<string,SkillProgress[]>;reviews:Record<string,ReviewState[]>};
export const empty:Snapshot={learners:[],results:[],progress:{},reviews:{}};
const env=import.meta.env;
const required=[env.VITE_FIREBASE_API_KEY,env.VITE_FIREBASE_AUTH_DOMAIN,env.VITE_FIREBASE_PROJECT_ID,env.VITE_FIREBASE_APP_ID];
export const cloud=required.every(Boolean);
export const partialConfig=required.some(Boolean)&&!cloud;
const app=cloud?initializeApp({apiKey:env.VITE_FIREBASE_API_KEY,authDomain:env.VITE_FIREBASE_AUTH_DOMAIN,projectId:env.VITE_FIREBASE_PROJECT_ID,appId:env.VITE_FIREBASE_APP_ID}):undefined;
export const auth=app?getAuth(app):undefined;
const db=app?getFirestore(app):undefined;
const functions=app?getFunctions(app,env.VITE_FIREBASE_REGION||'europe-west1'):undefined;
if(app&&env.VITE_USE_EMULATORS==='true'){
 connectAuthEmulator(auth!,'http://127.0.0.1:9099');connectFirestoreEmulator(db!,'127.0.0.1',8080);connectFunctionsEmulator(functions!,'127.0.0.1',5001);
}
const key='famille-demo-v1';
const initial=():Snapshot=>({...structuredClone(empty),learners:[{id:'maurice',name:'Maurice',level:'6e'},{id:'ondine',name:'Ondine',level:'CE1'}]});
export function readDemo():Snapshot {try {const v=localStorage.getItem(key);return v?JSON.parse(v):initial();}catch{return initial();}}
export function resetDemo(){localStorage.removeItem(key);window.dispatchEvent(new Event('family-demo-change'));}
export function listenDemo(cb:(s:Snapshot)=>void){const run=()=>cb(readDemo());run();window.addEventListener('storage',run);window.addEventListener('family-demo-change',run);return()=>{window.removeEventListener('storage',run);window.removeEventListener('family-demo-change',run);};}
export async function submit(attempt:Attempt):Promise<{result:Result;card:ReviewState['card']}> {
 if(functions){const call=httpsCallable<Attempt,{result:Result;card:ReviewState['card']}>(functions,'submitAttempt');return(await call(attempt)).data;}
 const data=readDemo(),duplicate=data.results.find(r=>r.id===attempt.id);
 if(duplicate)return {result:duplicate,card:data.reviews[attempt.learnerId].find(r=>r.moduleId===attempt.moduleId&&r.exerciseId===attempt.exerciseId)!.card};
 const result=evaluate(catalog,attempt),rs=data.reviews[attempt.learnerId]??[],previous=rs.find(r=>r.moduleId===attempt.moduleId&&r.exerciseId===attempt.exerciseId);
 const card=schedule(previous?.card,result.rating,new Date(result.recordedAt));
 data.reviews[attempt.learnerId]=[...rs.filter(r=>r!==previous),{moduleId:result.moduleId,exerciseId:result.exerciseId,card}];
 let progress=data.progress[attempt.learnerId]??[];
 for(const skillId of result.skillIds){const prev=progress.find(s=>s.moduleId===result.moduleId&&s.skillId===skillId);progress=[...progress.filter(s=>s!==prev),projectSkill(prev,result,skillId)];}
 data.progress[attempt.learnerId]=progress;data.results.push(result);localStorage.setItem(key,JSON.stringify(data));window.dispatchEvent(new Event('family-demo-change'));return {result,card};
}
export async function loginParent(){if(auth)await signInWithPopup(auth,new GoogleAuthProvider());}
export async function loginLearner(email:string,password:string){if(auth)await signInWithEmailAndPassword(auth,email,password);}
export async function logout(){if(auth)await signOut(auth);}
export function listenAuth(cb:(u:User|null)=>void){return auth?onAuthStateChanged(auth,cb):()=>{};}
export async function watchCloud(user:User,cb:(s:Snapshot)=>void,onError:(e:Error)=>void):Promise<()=>void>{
 const token=await user.getIdTokenResult(true),familyId=token.claims.familyId,role=token.claims.role,learnerId=token.claims.learnerId;
 if(typeof familyId!=='string'||!['parent','learner'].includes(String(role)))throw new Error('Compte non rattaché à une famille.');
 if(__APP__==='parents'&&role!=='parent')throw new Error('Cet espace est réservé aux parents.');
 let state=structuredClone(empty);const unsubscribers:(()=>void)[]=[];let stopped=false;
 const publish=()=>{if(!stopped)cb({...state,progress:{...state.progress},reviews:{...state.reviews}});};
 const watchLearner=(id:string)=>{
  unsubscribers.push(onSnapshot(collection(db!,`families/${familyId}/learners/${id}/progress`),s=>{state.progress[id]=s.docs.map(d=>d.data() as SkillProgress);publish();},onError));
  unsubscribers.push(onSnapshot(collection(db!,`families/${familyId}/learners/${id}/reviews`),s=>{state.reviews[id]=s.docs.map(d=>d.data() as ReviewState);publish();},onError));
 };
 if(role==='parent'){
  const seen=new Set<string>();
  unsubscribers.push(onSnapshot(collection(db!,`families/${familyId}/learners`),s=>{state.learners=s.docs.map(d=>({id:d.id,...d.data()} as Learner));for(const l of state.learners)if(!seen.has(l.id)){seen.add(l.id);watchLearner(l.id);}publish();},onError));
 }else if(typeof learnerId==='string'){
  unsubscribers.push(onSnapshot(doc(db!,`families/${familyId}/learners/${learnerId}`),s=>{state.learners=s.exists()?[{id:s.id,...s.data()} as Learner]:[];publish();},onError));watchLearner(learnerId);
 }else throw new Error('Profil enfant absent.');
 return()=>{stopped=true;unsubscribers.forEach(u=>u());};
}
