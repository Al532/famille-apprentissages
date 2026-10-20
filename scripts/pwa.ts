import {createHash} from 'node:crypto';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import type {Plugin,ResolvedConfig} from 'vite';

export function makeManifest(base:string,parent:boolean){
 return {id:base,name:parent?'Les petits chemins · Parents':'Les petits chemins',short_name:parent?'Parents':'Petits chemins',description:parent?'Le suivi des apprentissages de votre famille.':'Les ateliers et révisions de votre enfant.',lang:'fr',start_url:base,scope:base,display:'standalone',background_color:'#f7f8f2',theme_color:'#176655',prefer_related_applications:false,icons:[192,512].map(size=>({src:`icons/icon-${size}.png`,sizes:`${size}x${size}`,type:'image/png',purpose:'any maskable'}))};
}
export function makeServiceWorker(base:string,version:string,assets:string[]){
 return `const PREFIX=${JSON.stringify('petits-chemins:'+base+':')};
const CACHE=PREFIX+${JSON.stringify(version)};
const SCOPE=${JSON.stringify(base)};
const FILES=${JSON.stringify(assets.map(file=>base+file))};
const STATIC=new Set(FILES.map(file=>new URL(file,self.location.origin).href));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(SCOPE))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(async()=>
   (await caches.open(CACHE)).match(SCOPE+'offline.html').then(response=>response||Response.error())));
 }else if(STATIC.has(url.href)){
  event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(request))||fetch(request)));
 }
});
`;
}
const offline=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#176655"><title>Les petits chemins · Hors connexion</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f8f2;color:#203d35;font:18px/1.6 system-ui}main{max-width:460px;padding:30px}h1{line-height:1.2}a{display:inline-block;background:#176655;color:white;padding:12px 22px;border-radius:12px;text-decoration:none}</style></head><body><main><h1>Retrouvons la connexion.</h1><p>Une connexion Internet est nécessaire pour ouvrir les ateliers et synchroniser les réponses.</p><p>Tes réponses déjà enregistrées dans ton compte sont conservées.</p><a href="./">Réessayer</a></main></body></html>`;
export async function buildPwa(directory:string,base:string,parent:boolean){
 await writeFile(path.join(directory,'manifest.webmanifest'),JSON.stringify(makeManifest(base,parent),null,2)+'\n');
 await writeFile(path.join(directory,'offline.html'),offline);
 const assets=['manifest.webmanifest','offline.html','icons/icon-192.png','icons/icon-512.png','icons/icon.svg',...(await readdir(path.join(directory,'assets'))).filter(name=>/\.(js|css)$/.test(name)).map(name=>'assets/'+name)];
 const digest=createHash('sha256');
 for(const asset of assets)digest.update(asset).update(await readFile(path.join(directory,asset)));
 await writeFile(path.join(directory,'sw.js'),makeServiceWorker(base,digest.digest('hex').slice(0,16),assets));
}
export function pwaPlugin(parent:boolean):Plugin{
 let config:ResolvedConfig;
 return {name:'petits-chemins-pwa',apply:'build',configResolved(resolved){config=resolved;},transformIndexHtml(){return [
 {tag:'link',attrs:{rel:'manifest',href:config.base+'manifest.webmanifest'},injectTo:'head'},
 {tag:'link',attrs:{rel:'icon',type:'image/svg+xml',href:config.base+'icons/icon.svg'},injectTo:'head'},
 {tag:'link',attrs:{rel:'apple-touch-icon',href:config.base+'icons/icon-192.png'},injectTo:'head'},
 {tag:'meta',attrs:{name:'apple-mobile-web-app-capable',content:'yes'},injectTo:'head'},
 {tag:'meta',attrs:{name:'apple-mobile-web-app-title',content:parent?'Petits chemins Parents':'Petits chemins'},injectTo:'head'},
 ];},async closeBundle(){await buildPwa(config.build.outDir,config.base,parent);}};
}
