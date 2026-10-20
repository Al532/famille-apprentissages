/** Optional local administration via ADC, compatible with Spark. No password or credential in arguments. */
import {initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
const [familyId,parentUid,...children]=process.argv.slice(2);
if(!familyId||!parentUid||!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(familyId))throw new Error('Usage: npm run provision -- famille parentUid [childUid:childId:Prénom:Classe ...]');
const parsed=children.map(v=>{const [uid,id,name,level,...extra]=v.split(':');if(!uid||!id||!name||name.length>80||!level||level.length>20||extra.length||!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(id))throw new Error('Profil invalide.');return {uid,id,name,level};});
if(new Set([parentUid,...parsed.map(c=>c.uid)]).size!==parsed.length+1||new Set(parsed.map(c=>c.id)).size!==parsed.length)throw new Error('UID ou profils dupliqués.');
initializeApp({projectId:process.env.GCLOUD_PROJECT});
const auth=getAuth(),db=getFirestore();await Promise.all([parentUid,...parsed.map(c=>c.uid)].map(uid=>auth.getUser(uid)));
await db.runTransaction(async tx=>{
 const refs=[db.doc(`access/${parentUid}`),...parsed.map(c=>db.doc(`access/${c.uid}`))];
 const docs=await tx.getAll(...refs);
 const expected=[{familyId,role:'parent'},...parsed.map(c=>({familyId,role:'learner',learnerId:c.id}))];
 for(let i=0;i<docs.length;i++)if(docs[i].exists&&JSON.stringify(docs[i].data())!==JSON.stringify(expected[i])){
  const data=docs[i].data()!,want=expected[i];if(data.familyId!==want.familyId||data.role!==want.role||data.learnerId!==('learnerId' in want?want.learnerId:undefined))throw new Error('Compte déjà rattaché avec des droits différents.');
 }
 refs.forEach((ref,i)=>tx.set(ref,expected[i]));
 parsed.forEach(c=>tx.set(db.doc(`families/${familyId}/learners/${c.id}`),{uid:c.uid,name:c.name,level:c.level}));
});
console.log('Accès et profils configurés, sans Cloud Functions ni facturation.');
