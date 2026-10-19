import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {createHash} from 'node:crypto';
import {attemptSchema,catalogSchema,evaluate,projectSkill,schedule,moduleKey,type Result,type ReviewState,type SkillProgress} from '../../packages/core/src/index';
import rawCatalog from '../../packages/catalog/catalog.json';
initializeApp();
const db=getFirestore(),catalog=catalogSchema.parse(rawCatalog);
export const submitAttempt=onCall({region:'europe-west1',maxInstances:5},async request=>{
 if(!request.auth)throw new HttpsError('unauthenticated','Connexion nécessaire.');
 const parsed=attemptSchema.safeParse(request.data);
 if(!parsed.success)throw new HttpsError('invalid-argument','Réponse non conforme au contrat.');
 const attempt=parsed.data,{familyId,role,learnerId}=request.auth.token;
 if(typeof familyId!=='string'||!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(familyId)||!['parent','learner'].includes(String(role))||(role==='learner'&&learnerId!==attempt.learnerId))throw new HttpsError('permission-denied','Profil non autorisé.');
 const now=new Date();
 const base=db.doc(`families/${familyId}/learners/${attempt.learnerId}`),eventRef=base.collection('events').doc(attempt.id),reviewRef=base.collection('reviews').doc(moduleKey(attempt.moduleId,attempt.exerciseId));
 const hash=createHash('sha256').update(JSON.stringify(attempt)).digest('hex');
 return db.runTransaction(async tx=>{
  const [learner,event,review]=await Promise.all([tx.get(base),tx.get(eventRef),tx.get(reviewRef)]);
  if(!learner.exists)throw new HttpsError('not-found','Profil absent.');
  if(event.exists){const stored=event.data()!;if(stored.requestHash!==hash)throw new HttpsError('already-exists','Identifiant de réponse déjà utilisé.');return {result:stored.result as Result,card:stored.card as ReviewState['card']};}
  let result:Result;
  try{result=evaluate(catalog,attempt,now);}catch{throw new HttpsError('failed-precondition','CATALOG_MISMATCH : rechargez le catalogue.');}
  const skillRefs=result.skillIds.map(s=>base.collection('progress').doc(moduleKey(result.moduleId,s)));
  const skills=await Promise.all(skillRefs.map(ref=>tx.get(ref)));
  const card=schedule(review.data()?.card as ReviewState['card']|undefined,result.rating,new Date(result.recordedAt));
  tx.create(eventRef,{result,card,requestHash:hash});
  tx.set(reviewRef,{moduleId:result.moduleId,exerciseId:result.exerciseId,card});
  for(let i=0;i<skillRefs.length;i++)tx.set(skillRefs[i],projectSkill(skills[i].data() as SkillProgress|undefined,result,result.skillIds[i]));
  return {result,card};
 });
});
