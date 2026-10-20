import {doc,runTransaction,serverTimestamp,getDoc,Timestamp,type Firestore} from 'firebase/firestore';
import {attemptSchema,type Attempt} from '@famille/core';
import type {RecordedAttempt} from './history';
/** UUID + transaction: a retry never counts the same answer twice. */
export async function recordAttempt(db:Firestore,uid:string,familyId:string,raw:Attempt):Promise<RecordedAttempt>{
 const attempt=attemptSchema.parse(raw),ref=doc(db,`families/${familyId}/learners/${attempt.learnerId}/attempts/${attempt.id}`);
 await runTransaction(db,async tx=>{
  const existing=await tx.get(ref);
  if(existing.exists()){
   const stored=attemptSchema.parse(existing.data().attempt);
   if(JSON.stringify(stored)!==JSON.stringify(attempt))throw new Error('Identifiant déjà utilisé pour une autre réponse.');
   return;
  }
  tx.set(ref,{attempt,senderUid:uid,recordedAt:serverTimestamp()});
 });
 const saved=await getDoc(ref),time=saved.data()?.recordedAt;
 if(!(time instanceof Timestamp))throw new Error('Confirmation d’enregistrement indisponible. Réessayez avec la même réponse.');
 return {attempt,recordedAt:time.toDate().toISOString()};
}
