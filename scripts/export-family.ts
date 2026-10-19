import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {mkdir,writeFile} from 'node:fs/promises';
const familyId=process.argv[2];
if(!familyId||!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(familyId))throw new Error('Usage: npm run export:family -- famille');
initializeApp({projectId:process.env.GCLOUD_PROJECT});
const db=getFirestore(),learners=await db.collection(`families/${familyId}/learners`).get();
const output={schemaVersion:1,familyId,exportedAt:new Date().toISOString(),learners:[] as unknown[]};
for(const learner of learners.docs){const data:Record<string,unknown>={id:learner.id,...learner.data()};for(const collection of ['events','progress','reviews']){const docs=await learner.ref.collection(collection).get();data[collection]=docs.docs.map(d=>({id:d.id,...d.data()}));}output.learners.push(data);}
await mkdir('exports',{recursive:true});const path=`exports/${familyId}-${Date.now()}.json`;await writeFile(path,JSON.stringify(output,null,2));console.log(`Export créé : ${path}`);
