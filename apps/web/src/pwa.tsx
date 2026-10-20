import React,{useEffect,useState} from 'react';
type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
let prompt:InstallPrompt|undefined,waiting:ServiceWorker|undefined;
const subscribers=new Set<()=>void>();
const notify=()=>subscribers.forEach(fn=>fn());
let reloading=false,installedHere=false;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event as InstallPrompt;notify();});
window.addEventListener('appinstalled',()=>{installedHere=true;prompt=undefined;notify();});
if(import.meta.env.PROD&&'serviceWorker' in navigator){
 window.addEventListener('load',()=>{
  navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js',{scope:import.meta.env.BASE_URL,updateViaCache:'none'}).then(registration=>{
   const check=()=>{waiting=registration.waiting??undefined;notify();};check();
   registration.addEventListener('updatefound',()=>registration.installing?.addEventListener('statechange',check));
  }).catch(()=>{/* L’installation reste possible sans cache sur les navigateurs compatibles. */});
 });
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)location.reload();});
}
function standalone(){return installedHere||window.matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone);}
export function InstallApp(){
 const [,refresh]=useState(0),[help,setHelp]=useState(false),[installed,setInstalled]=useState(standalone),[busy,setBusy]=useState(false);
 useEffect(()=>{const update=()=>{refresh(n=>n+1);setInstalled(standalone());};subscribers.add(update);const media=matchMedia('(display-mode: standalone)');media.addEventListener('change',update);return()=>{subscribers.delete(update);media.removeEventListener('change',update);};},[]);
 async function install(){
  if(!prompt){setHelp(value=>!value);return;}
  const current=prompt;prompt=undefined;setBusy(true);
  try{await current.prompt();const choice=await current.userChoice;if(choice.outcome==='accepted'){installedHere=true;setInstalled(true);}}catch{setHelp(true);}finally{setBusy(false);notify();}
 }
 if(installed&&!waiting)return null;
 return <aside className="pwa-tools" aria-label="Installation de l’application">
 {!installed&&<button className="text-button" disabled={busy} onClick={()=>void install()}>↓ Installer l’app</button>}
 {waiting&&<button className="text-button" onClick={()=>{reloading=true;waiting?.postMessage({type:'SKIP_WAITING'});}}>↻ Mettre à jour l’app</button>}
 {help&&!installed&&<div className="install-help" role="status"><strong>Installer sur cet appareil</strong><p>{/iPad|iPhone|iPod/.test(navigator.userAgent)?'Sur iPhone ou iPad : ouvre cette page dans Safari, puis Partager → Ajouter à l’écran d’accueil → Ouvrir comme app.':'Sur Android : ouvre cette page dans Chrome, puis menu ⋮ → Installer l’application (ou Ajouter à l’écran d’accueil). Sur ordinateur, utilise l’icône d’installation dans la barre d’adresse.'}</p><p>L’app s’ouvre dans sa propre fenêtre. Une connexion Internet reste nécessaire pour les ateliers synchronisés.</p><button className="text-button" onClick={()=>setHelp(false)}>Fermer</button></div>}
 </aside>;
}
