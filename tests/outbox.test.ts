import {test} from 'node:test';
import assert from 'node:assert/strict';
import {queueAttempt,pendingAttempts,confirmAttempt,mergeAttempts,type PendingAttempt} from '../apps/web/src/outbox';
import {projectHistory} from '../apps/web/src/history';
import {catalogSchema} from '@famille/core';
import raw from '../packages/catalog/catalog.json';
class MemoryStorage{
 data=new Map<string,string>();
 get length(){return this.data.size;}
 key(i:number){return [...this.data.keys()][i]??null;}
 getItem(k:string){return this.data.get(k)??null;}
 setItem(k:string,v:string){this.data.set(k,v);}
 removeItem(k:string){this.data.delete(k);}
}
const catalog=catalogSchema.parse(raw);
const entry:PendingAttempt={uid:'child',familyId:'family',recordedAt:'2026-11-01T12:00:00.000Z',attempt:{schemaVersion:1,id:'eaad642b-bb94-4b26-aee0-510f0560056b',learnerId:'ondine',moduleId:'calcul-ce1',moduleVersion:catalog.modules.find(m=>m.id==='calcul-ce1')!.version,catalogRevision:catalog.revision,exerciseId:'add-7-5',answer:'12',durationMs:2000}};
test('sauvegarde locale immédiate, restaurable sans réseau et sans score stocké',()=>{
 const storage=new MemoryStorage();
 queueAttempt(storage,entry);
 const restored=pendingAttempts(storage,'child','family');
 assert.deepEqual(restored,[entry]);
 assert.equal(projectHistory([catalog],restored).results[0].correct,true);
 assert.equal(JSON.stringify([...storage.data.values()]).includes('correct'),false);
});
test('une nouvelle tentative garde son identifiant et sa date locale',()=>{
 const storage=new MemoryStorage();
 queueAttempt(storage,entry);
 assert.deepEqual(queueAttempt(storage,{...entry,recordedAt:'2026-11-02T12:00:00.000Z'}),entry);
 assert.equal(storage.length,1);
 assert.throws(()=>queueAttempt(storage,{...entry,attempt:{...entry.attempt,answer:'13'}}));
});
test('la confirmation serveur remplace le provisoire sans doubler la progression',()=>{
 const storage=new MemoryStorage();queueAttempt(storage,entry);
 const remote={attempt:entry.attempt,recordedAt:'2026-11-01T12:05:00.000Z'};
 const merged=mergeAttempts([remote],pendingAttempts(storage,'child','family'));
 assert.deepEqual(merged,[remote]);
 assert.equal(projectHistory([catalog],merged).results.length,1);
 confirmAttempt(storage,'child',entry.attempt.id);
 assert.equal(storage.length,0);
 assert.deepEqual(mergeAttempts([remote],pendingAttempts(storage,'child','family')),[remote]);
});
test('les comptes et familles sont isolés et deux onglets ne remplacent pas leurs réponses',()=>{
 const storage=new MemoryStorage();
 queueAttempt(storage,entry);
 queueAttempt(storage,{...entry,attempt:{...entry.attempt,id:'eaad642b-bb94-4b26-aee0-510f0560056c'}});
 queueAttempt(storage,{...entry,uid:'other'});
 assert.equal(pendingAttempts(storage,'child','family').length,2);
 assert.equal(pendingAttempts(storage,'other','family').length,1);
 assert.equal(pendingAttempts(storage,'child','another-family').length,0);
 confirmAttempt(storage,'child',entry.attempt.id);
 assert.equal(pendingAttempts(storage,'child','family').length,1);
});
test('un stockage plein échoue explicitement avant toute confirmation à l’enfant',()=>{
 const storage=new MemoryStorage();storage.setItem=()=>{throw new Error('QuotaExceededError');};
 assert.throws(()=>queueAttempt(storage,entry),/QuotaExceededError/);
 assert.equal(storage.length,0);
});
