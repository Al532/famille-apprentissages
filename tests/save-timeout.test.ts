import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withSaveTimeout} from '../apps/web/src/save-timeout';

test('un enregistrement sans réponse libère l’attente',async()=>{
 await assert.rejects(withSaveTimeout(new Promise<never>(()=>{}),10),/SAVE_TIMEOUT/);
});
test('une confirmation et une erreur immédiates sont transmises',async()=>{
 assert.equal(await withSaveTimeout(Promise.resolve('enregistré'),100),'enregistré');
 await assert.rejects(withSaveTimeout(Promise.reject(new Error('réseau')),100),/réseau/);
});
test('une confirmation tardive ne remplace pas le résultat de la nouvelle tentative',async()=>{
 let finish!:(value:string)=>void;
 const original=new Promise<string>(resolve=>{finish=resolve;});
 await assert.rejects(withSaveTimeout(original,10),/SAVE_TIMEOUT/);
 assert.equal(await withSaveTimeout(Promise.resolve('confirmation du même identifiant'),100),'confirmation du même identifiant');
 finish('ancienne confirmation');
 await original;
});
