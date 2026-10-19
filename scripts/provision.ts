/** Administration uniquement, via Application Default Credentials. Aucun secret en argument. */
import {initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
const [familyId,parentUid,...children]=process.argv.slice(2);
if(!familyId||!parentUid||children.length===0)throw new Error('Usage: npm run provision -- famille parentUid childUid:childId:Prénom:Classe [...]');
if(!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(familyId))throw new Error('Identifiant famille invalide.');
const parsed=children.map(v=>{const [uid,id,name,level,...extra]=v.split(':');if(!uid||!id||!name||!level||extra.length||!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(id))throw new Error('Profil invalide.');return {uid,id,name,level};});
if(new Set([parentUid,...parsed.map(c=>c.uid)]).size!==parsed.length+1||new Set(parsed.map(c=>c.id)).size!==parsed.length)throw new Error('UID ou profils dupliqués.');
initializeApp({projectId:process.env.GCLOUD_PROJECT});
const auth=getAuth(),db=getFirestore();
// Tous les comptes doivent déjà exister ; ne jamais créer d’inscription parent libre.
const parent=await auth.getUser(parentUid),accounts=await Promise.all(parsed.map(c=>auth.getUser(c.uid)));
for(const account of [parent,...accounts])if(account.customClaims?.familyId&&account.customClaims.familyId!==familyId)throw new Error('Compte déjà rattaché à une autre famille.');
await auth.setCustomUserClaims(parentUid,{...parent.customClaims,familyId,role:'parent',learnerId:null});
await db.doc(`families/${familyId}`).set({schemaVersion:1},{merge:true});
for(let i=0;i<parsed.length;i++){
 const {uid,id,name,level}=parsed[i];
 await db.doc(`families/${familyId}/learners/${id}`).set({name,level},{merge:true});
 await auth.setCustomUserClaims(uid,{...accounts[i].customClaims,familyId,role:'learner',learnerId:id});
}
console.log('Famille configurée. Déconnecter puis reconnecter les comptes pour actualiser leurs droits.');
