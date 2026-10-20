import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {buildPwa,makeManifest,makeServiceWorker} from '../scripts/pwa';
const base='/famille-apprentissages/enfants/';
test('les deux installations ont des identités et périmètres distincts, avec icônes adaptées',()=>{
 const child=makeManifest(base,false),parent=makeManifest('/famille-apprentissages/parents/',true);
 assert.notEqual(child.id,parent.id);assert.equal(child.start_url,child.scope);assert.equal(child.display,'standalone');
 assert.ok(child.icons.some(i=>i.sizes==='192x192'));assert.ok(child.icons.some(i=>i.sizes==='512x512'&&i.purpose.includes('maskable')));
 assert.equal(makeManifest('/',false).start_url,'/');
});
function worker(){
 const handlers=new Map<string,(event:any)=>void>(),deleted:string[]=[],fetched:string[]=[],saved:string[][]=[];
 let skip=false,offline=false;
 const cache={addAll:async(files:string[])=>{saved.push(files);},match:async(key:any)=>new Response(typeof key==='string'&&key.endsWith('offline.html')?'hors connexion':'fichier statique')};
 const context={URL,Response,Set,fetch:async(request:any)=>{fetched.push(request.url);if(offline)throw Error('offline');return new Response('HTML actuel');},caches:{open:async()=>cache,keys:async()=>['petits-chemins:'+base+':old','petits-chemins:/famille-apprentissages/parents/:old','autre-application'],delete:async(key:string)=>{deleted.push(key);}},self:{location:{origin:'https://example.test'},clients:{claim:async()=>{}},skipWaiting:()=>{skip=true;},addEventListener:(name:string,fn:(event:any)=>void)=>handlers.set(name,fn)}};
 vm.runInNewContext(makeServiceWorker(base,'new',['offline.html','assets/app-abc.js']),context);
 return {handlers,deleted,fetched,saved,setOffline:()=>{offline=true;},skipped:()=>skip};
}
test('le service worker ignore les API, les authentifications, les écritures et l’espace parent',()=>{
 const w=worker();
 for(const [url,method] of [['https://firestore.googleapis.com/a','GET'],['https://accounts.google.com/','GET'],['https://example.test'+base+'attempts','POST'],['https://example.test/famille-apprentissages/parents/','GET'],['https://example.test'+base+'api/private','GET']]){
  let intercepted=false;w.handlers.get('fetch')!({request:{url,method,mode:'cors'},respondWith:()=>{intercepted=true;}});assert.equal(intercepted,false,url);
 }
 assert.equal(w.fetched.length,0);
});
test('la navigation prend le HTML courant en ligne et une page explicite hors connexion',async()=>{
 const w=worker();let response:Promise<Response>|undefined;
 const event={request:{url:'https://example.test'+base,method:'GET',mode:'navigate'},respondWith:(p:Promise<Response>)=>{response=p;}};
 w.handlers.get('fetch')!(event);assert.equal(await (await response!).text(),'HTML actuel');
 w.setOffline();w.handlers.get('fetch')!(event);assert.equal(await (await response!).text(),'hors connexion');
});
test('une mise à jour attend un choix explicite et ne supprime pas le cache parent',async()=>{
 const w=worker();let pending:Promise<unknown>|undefined;
 w.handlers.get('install')!({waitUntil:(p:Promise<unknown>)=>{pending=p;}});await pending;
 assert.equal(w.skipped(),false);assert.ok(!w.saved[0].some(url=>url.endsWith('index.html')));
 w.handlers.get('activate')!({waitUntil:(p:Promise<unknown>)=>{pending=p;}});await pending;
 assert.deepEqual(w.deleted,['petits-chemins:'+base+':old']);
 w.handlers.get('message')!({data:{type:'SKIP_WAITING'}});assert.equal(w.skipped(),true);
});
test('le cache est renouvelé quand un fichier change, même si son nom reste identique',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'petits-chemins-pwa-'));
 try{
  await mkdir(path.join(directory,'assets'));await mkdir(path.join(directory,'icons'));
  for(const file of ['icons/icon-192.png','icons/icon-512.png','icons/icon.svg','assets/app.js'])await writeFile(path.join(directory,file),'fixture');
  await buildPwa(directory,base,false);const first=await readFile(path.join(directory,'sw.js'),'utf8');
  await writeFile(path.join(directory,'icons/icon-512.png'),'nouvelle icône');await buildPwa(directory,base,false);
  assert.notEqual(await readFile(path.join(directory,'sw.js'),'utf8'),first);
  assert.equal(JSON.parse(await readFile(path.join(directory,'manifest.webmanifest'),'utf8')).scope,base);
 }finally{await rm(directory,{recursive:true,force:true});}
});
