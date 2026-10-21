import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {availableToday,planSession,projectConcepts,projectQuestionReviews,type LearningSession} from '@famille/core';
import type {User} from 'firebase/auth';
import {catalog,catalogs} from './catalog';
import {Practice} from './Practice';
import {cloud,partialConfig,empty,listenDemo,listenAuth,watchCloud,loginParent,loginLearner,logout,resetDemo,addLearner,type Snapshot,type Learner} from './store';
import {InstallApp} from './pwa';
import {globalProfile,profileModules,profiles} from './profiles';
import './style.css';
const demoView=new URLSearchParams(location.search).get('espace');
const parent=cloud?__APP__==='parents':demoView?demoView==='parents':__APP__==='parents';
function App(){
 const [snapshot,setSnapshot]=useState<Snapshot>(empty),[user,setUser]=useState<User|null>(null),[ready,setReady]=useState(!cloud),[error,setError]=useState(''),[selected,setSelected]=useState('');
 useEffect(()=>{if(!cloud)return listenDemo(setSnapshot);return listenAuth(u=>{setUser(u);setReady(true);setSnapshot(empty);setSelected('');setError('');});},[]);
 useEffect(()=>{if(!user)return;let stop:(()=>void)|undefined,cancelled=false;watchCloud(user,s=>{if(!cancelled)setSnapshot(s);},e=>{if(!cancelled)setError(e.message);}).then(s=>{if(cancelled)s();else stop=s;}).catch(e=>setError(e.message));return()=>{cancelled=true;stop?.();};},[user]);
 const [online,setOnline]=useState(navigator.onLine);
 useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
 const learner=snapshot.learners.find(l=>l.id===selected)??snapshot.learners[0];
 return <><header><a className="brand" href={import.meta.env.BASE_URL} aria-label="Accueil"><span className="brand-mark">✳</span> Les petits chemins<span className="brand-small">APPRENDRE EN FAMILLE</span></a><div className="top-right"><span className="pill">{parent?'Espace parents':'Espace enfants'}</span>{!cloud&&<a className="text-button" href={'?espace='+(parent?'enfants':'parents')}>{parent?'Voir les ateliers':'Voir le suivi parent'}</a>}{user&&<button className="text-button" onClick={()=>logout().catch(e=>setError(e.message))}>Déconnexion</button>}</div></header>
 <main><div className="notice">{cloud?(!user?'Connectez-vous pour retrouver les résultats de votre famille.':!online?'Hors connexion · les nouvelles réponses attendent une connexion pour être enregistrées.':snapshot.sync==='synced'?'☁ Synchronisation active avec votre famille.':snapshot.sync==='offline'?'Connexion à la base en cours · les données affichées peuvent être anciennes.':'Synchronisation en cours…'):'◌ Démonstration · résultats conservés sur ce navigateur uniquement.'}</div>
 <InstallApp/>
 {partialConfig&&<p role="alert" className="error">La configuration Firebase est incomplète. La synchronisation est désactivée.</p>}
 {error&&<p role="alert" className="error">{error}<button onClick={()=>setError('')}>Fermer</button></p>}
 {!ready?<p>Chargement…</p>:cloud&&!user?<Login onError={setError}/>:<>
 <div className="intro"><div><p className="eyebrow">{parent?'OBSERVER, COMPRENDRE, ACCOMPAGNER':'UN PETIT PAS CHAQUE JOUR'}</p><h1>{parent?'Leurs progrès, à leur rythme.':'Qu’allons-nous découvrir ?'}</h1><p className="muted">{parent?'Des repères pour choisir la prochaine étape, dans toutes les matières.':'Un peu de curiosité, un peu de pratique. Et le plaisir de comprendre.'}</p></div><span className="intro-art" aria-hidden="true">{parent?'◷':'✺'}</span></div>
 <div className="profiles" role="group" aria-label="Choisir un enfant">{snapshot.learners.map(l=><button key={l.id} className={'profile '+(learner?.id===l.id?'active':'')} onClick={()=>setSelected(l.id)}><span className={'avatar '+(globalProfile(l.level)==='Ondine'?'yellow':'green')}>{l.name.slice(0,1)}</span><span><strong>{l.name}</strong><small>Profil global</small></span></button>)}</div>
 {cloud&&user&&snapshot.role!=='parent'&&parent&&<section className="card"><h2>Activer mon accès parent</h2><p>Le premier accès parent doit être confirmé dans la console Firebase. Aucun compte ne peut devenir parent automatiquement.</p><p>Identifiant du compte : <code>{user.uid}</code></p><button onClick={()=>location.reload()}>Actualiser mes droits</button></section>}
 {cloud&&parent&&snapshot.role==='parent'&&snapshot.familyId&&<FamilySettings familyId={snapshot.familyId} onError={setError}/>}
 {!!snapshot.ignoredAttempts&&<p role="alert" className="error">{snapshot.ignoredAttempts} réponse(s) conservée(s) mais non interprétée(s) avec le contenu disponible. Le suivi affiché est partiel.</p>}
 {cloud&&!parent&&snapshot.role==='parent'?<section className="card"><p>Vous êtes connecté comme parent. Déconnectez-vous pour ouvrir le compte d’un enfant.</p><a href="../parents/">Ouvrir le suivi parent</a></section>:learner?(parent?<Dashboard learner={learner} snapshot={snapshot}/>:<Hub key={learner.id} learner={learner} snapshot={snapshot}/>):<div className="card">Aucun profil associé. Le parent doit terminer la configuration de la famille.</div>}
 {parent&&!cloud&&<details className="settings"><summary>Outils de démonstration</summary><p>Le suivi local utilise le même format de résultats que la future base partagée. Les exemples ne constituent pas un bilan scolaire.</p><button onClick={()=>{if(confirm('Effacer les résultats de démonstration sur ce navigateur ?'))resetDemo();}}>Effacer la démonstration</button></details>}
 </>}
 <footer>Les petits chemins <span>Un espace pour grandir, sans course au score.</span></footer></main></>;
}
function Login({onError}:{onError:(e:string)=>void}){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false);
 async function login(action:()=>Promise<void>){setBusy(true);try{await action();}catch(e){onError(e instanceof Error?e.message:'Connexion impossible.');}finally{setBusy(false);}}
 return <section className="card login"><p className="eyebrow">BIENVENUE</p><h1>{parent?'Le coin des parents':'Mon espace personnel'}</h1><p className="muted">{parent?'Connectez-vous avec le compte parent rattaché à votre famille.':'Utilise le compte que ton parent a préparé pour toi.'}</p>{parent?<button disabled={busy} className="primary" onClick={()=>login(loginParent)}>Se connecter avec Google</button>:<form onSubmit={e=>{e.preventDefault();void login(()=>loginLearner(email,password));}}><label>Compte enfant<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Mot de passe<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="primary" disabled={busy}>Entrer</button></form>}</section>;
}
function FamilySettings({familyId,onError}:{familyId:string;onError:(e:string)=>void}){
 const [name,setName]=useState(''),[level,setLevel]=useState('Ondine'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function create(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage('');try{await addLearner(familyId,{name,level,email,password});setName('');setEmail('');setPassword('');setMessage('Le compte enfant est prêt. Il peut se connecter dans son espace.');}catch(error){onError(error instanceof Error?error.message:'Création impossible.');}finally{setBusy(false);}}
 return <details className="settings"><summary>Ajouter un enfant à ma famille</summary><form className="card login" onSubmit={create}><p>Créez ici son compte personnel. Une adresse technique peut servir d’identifiant, sans boîte mail personnelle. Conservez le mot de passe dans votre gestionnaire.</p><label>Prénom<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><label>Profil global<select value={level} onChange={e=>setLevel(e.target.value)}>{profiles.map(profile=><option key={profile}>{profile}</option>)}</select></label><label>Identifiant enfant (format e-mail)<input type="email" autoComplete="off" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Créer son mot de passe<input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="primary" disabled={busy}>{busy?'Création…':'Créer son compte'}</button>{message&&<p role="status">{message}</p>}</form></details>;
}
function Hub({learner,snapshot}:{learner:Learner;snapshot:Snapshot}){
 const [session,setSession]=useState<LearningSession>(),[subject,setSubject]=useState('Toutes');
 const modules=profileModules(catalog.modules,learner.level);
 const subjects=['Toutes',...new Set(modules.map(m=>m.subject))];
 const results=snapshot.results.filter(r=>r.learnerId===learner.id);
 const visible=modules.filter(m=>subject==='Toutes'||m.subject===subject);
 const planned=planSession(modules,results,subject),available=planned.concepts;
 if(session)return <Practice initial={session} learner={learner} snapshot={snapshot} onClose={()=>setSession(undefined)}/>;
 return <><div className="section-heading"><h2>Le parcours de {learner.name}</h2><span>{modules.reduce((n,m)=>n+m.skills.length,0)} notions à explorer</span></div>
 <div className="subject-filters" role="group" aria-label="Choisir la matière de la séance">{subjects.map(s=><button key={s} aria-pressed={subject===s} className={subject===s?'primary':''} onClick={()=>setSubject(s)}>{s==='Toutes'?'Toutes les matières':s}</button>)}</div>
 <section className="card session-start"><div><p className="eyebrow">MA SÉANCE DU JOUR</p><h2>Quelques notions, des questions variées.</h2><p>Une séance d’environ 5 à 10 minutes. On reprend ce qui en a besoin et on découvre de nouveaux exemples.</p><small>{available.length?`${available.filter(c=>!c.exerciseId).length} notions et ${available.filter(c=>c.exerciseId).length} repères · jusqu’à 24 questions`:'Les notions de cette matière sont déjà travaillées pour aujourd’hui.'}</small></div><button className="primary" disabled={!available.length} onClick={()=>setSession(planSession(modules,results,subject))}>{available.length?'Commencer ma séance ↗':'À bientôt pour la suite'}</button></section>
 <details className="content-list"><summary>Ce que je peux travailler</summary><div className="module-grid">{visible.map(m=><article className="module-card" key={m.id}><div className="module-meta">{m.subject}</div><h3>{m.title}</h3><p>{m.description}</p><small>{m.skills.length} notions · {m.exercises.length} questions en réserve</small><ul>{m.skills.map(s=><li key={s.id}>{s.label}</li>)}</ul></article>)}</div></details></>;
}
function Dashboard({learner,snapshot}:{learner:Learner;snapshot:Snapshot}){
 const [subject,setSubject]=useState('Toutes');
 useEffect(()=>setSubject('Toutes'),[learner.id]);
 const modules=profileModules(catalog.modules,learner.level),results=snapshot.results.filter(r=>r.learnerId===learner.id);
 const concepts=projectConcepts(modules,results),visited=concepts.filter(c=>c.card),cards=projectQuestionReviews(modules,results);
 const due=visited.filter(c=>availableToday(c)).length+cards.filter(c=>Date.parse(c.card.due)<=Date.now()).length;
 const visible=modules.filter(m=>subject==='Toutes'||m.subject===subject).flatMap(m=>m.skills.map(s=>{
  const concept=concepts.find(c=>c.moduleId===m.id&&c.skillId===s.id),bank=m.exercises.filter(q=>q.skillIds.includes(s.id));
  const facts=cards.filter(c=>c.moduleId===m.id&&bank.some(q=>q.id===c.exerciseId)),dates=[...(concept?.card?[concept.card.due]:[]),...facts.map(f=>f.card.due)].sort();
  return {moduleId:m.id,skillId:s.id,label:s.label,subject:m.subject,concept,facts,due:!!concept?.card&&availableToday(concept)||facts.some(f=>Date.parse(f.card.due)<=Date.now()),next:dates[0],seen:new Set(results.filter(r=>r.moduleId===m.id&&r.skillIds.includes(s.id)).map(r=>r.exerciseId)).size,bankSize:bank.length};
 }));
 const progress=snapshot.progress[learner.id]??[];
 const old=progress.filter(p=>!modules.some(m=>m.id===p.moduleId));
 const label=(moduleId:string,skillId:string)=>catalogs.flatMap(c=>c.modules).find(m=>m.id===moduleId)?.skills.find(s=>s.id===skillId)?.label??skillId;
 return <><div className="stats"><div className="stat"><span>Réponses enregistrées</span><strong>{results.length}</strong><small>historique conservé</small></div><div className="stat"><span>Révisions à reprendre</span><strong>{due}</strong><small>notions et repères factuels</small></div><div className="stat"><span>Notions abordées</span><strong>{visited.length}</strong><small>{cards.length} repères factuels vus en complément</small></div></div>
 <section className="card recommendation"><span className="subject-icon yellow" aria-hidden="true">↗</span><div><p className="eyebrow">LA PROCHAINE ÉTAPE</p><h3>{due?'Reprendre les notions et repères prévus aujourd’hui':'Découvrir ou laisser reposer les notions'}</h3><p>Le français et les raisonnements utilisent un calendrier par notion, vérifiée avec plusieurs exemples. Les dates, lieux et autres repères factuels ont un calendrier par carte. Les séances alternent ces deux formes de travail.</p></div></section>
 <div className="section-heading"><h2>Le détail par notion</h2><span>Mise à jour à chaque réponse</span></div>
 <div className="subject-filters" role="group" aria-label="Filtrer le suivi par matière">{['Toutes',...new Set(modules.map(m=>m.subject))].map(s=><button key={s} aria-pressed={subject===s} className={subject===s?'primary':''} onClick={()=>setSubject(s)}>{s}</button>)}</div>
 <div className="table-wrap"><table><thead><tr><th>Notion</th><th>Travail récent</th><th>Exemples rencontrés</th><th>Réussite observée</th><th>Prochaine révision</th></tr></thead><tbody>{visible.map(c=>{const p=progress.find(p=>p.moduleId===c.moduleId&&p.skillId===c.skillId);return <tr key={c.moduleId+c.skillId}><td><strong>{c.label}</strong><small>{c.subject}</small></td><td>{c.concept?.card?(c.concept.evidence.ready?'Exemples variés réussis':'Notion à consolider'):c.concept?'Notion à découvrir':'Repères factuels'}<small>{c.facts.length?`${c.facts.length} repère(s) avec calendrier individuel`:''}</small></td><td>{c.seen} / {c.bankSize}<small>pas d’objectif de tout voir</small></td><td>{p?.assessed?`${p.correct} / ${p.assessed}`:'—'}</td><td>{c.due?'Aujourd’hui':c.concept&&!c.concept.card?'Notion à découvrir':c.next?new Date(c.next).toLocaleDateString('fr-FR'):'À découvrir'}</td></tr>;})}</tbody></table></div>
 {old.length>0&&<details className="settings"><summary>Historique des anciens ateliers</summary><ul>{old.map(p=><li key={p.moduleId+p.skillId}>{label(p.moduleId,p.skillId)} : {p.correct} / {p.assessed} réponses évaluées, {p.selfReviews} autoévaluations.</li>)}</ul></details>}
 <p className="footnote">« Exemples variés réussis » décrit le travail d’une journée, pas une maîtrise scolaire acquise. Les QCM ne mesurent pas la rédaction ni la production autonome. Les corrections et le calendrier sont recalculés à partir des réponses brutes synchronisées.</p></>;
}
createRoot(document.getElementById('root')!).render(<App/>);
