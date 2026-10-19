import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {selectNext,CONTRACT_VERSION,type Module,type Exercise,type Attempt,type Result} from '@famille/core';
import type {User} from 'firebase/auth';
import {catalog} from './catalog';
import {cloud,partialConfig,empty,listenDemo,listenAuth,watchCloud,submit,loginParent,loginLearner,logout,resetDemo,type Snapshot,type Learner} from './store';
import './style.css';
function newId(){const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=Array.from(b,v=>v.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
const demoView=new URLSearchParams(location.search).get('espace');
const parent=cloud?__APP__==='parents':demoView?demoView==='parents':__APP__==='parents';
function App(){
 const [snapshot,setSnapshot]=useState<Snapshot>(empty),[user,setUser]=useState<User|null>(null),[ready,setReady]=useState(!cloud),[error,setError]=useState(''),[selected,setSelected]=useState('');
 useEffect(()=>{if(!cloud)return listenDemo(setSnapshot);return listenAuth(u=>{setUser(u);setReady(true);setSnapshot(empty);setSelected('');});},[]);
 useEffect(()=>{if(!user)return;let stop:(()=>void)|undefined,cancelled=false;watchCloud(user,setSnapshot,e=>setError(e.message)).then(s=>{if(cancelled)s();else stop=s;}).catch(e=>setError(e.message));return()=>{cancelled=true;stop?.();};},[user]);
 const learner=snapshot.learners.find(l=>l.id===selected)??snapshot.learners[0];
 return <><header><a className="brand" href="/" aria-label="Accueil"><span className="brand-mark">✳</span> Les petits chemins<span className="brand-small">APPRENDRE EN FAMILLE</span></a><div className="top-right"><span className="pill">{parent?'Espace parents':'Espace enfants'}</span>{!cloud&&<a className="text-button" href={'?espace='+(parent?'enfants':'parents')}>{parent?'Voir les ateliers':'Voir le suivi parent'}</a>}{user&&<button className="text-button" onClick={()=>logout().catch(e=>setError(e.message))}>Déconnexion</button>}</div></header>
 <main><div className="notice">{cloud?'☁ Les résultats sont synchronisés avec votre famille.':'◌ Démonstration · résultats conservés sur ce navigateur uniquement.'}</div>
 {partialConfig&&<p role="alert" className="error">La configuration Firebase est incomplète. La synchronisation est désactivée.</p>}
 {error&&<p role="alert" className="error">{error}<button onClick={()=>setError('')}>Fermer</button></p>}
 {!ready?<p>Chargement…</p>:cloud&&!user?<Login onError={setError}/>:<>
 <div className="intro"><div><p className="eyebrow">{parent?'OBSERVER, COMPRENDRE, ACCOMPAGNER':'UN PETIT PAS CHAQUE JOUR'}</p><h1>{parent?'Leurs progrès, à leur rythme.':'Qu’allons-nous découvrir ?'}</h1><p className="muted">{parent?'Des repères pour choisir la prochaine étape, dans toutes les matières.':'Un peu de curiosité, un peu de pratique. Et le plaisir de comprendre.'}</p></div><span className="intro-art" aria-hidden="true">{parent?'◷':'✺'}</span></div>
 <div className="profiles" role="group" aria-label="Choisir un enfant">{snapshot.learners.map(l=><button key={l.id} className={'profile '+(learner?.id===l.id?'active':'')} onClick={()=>setSelected(l.id)}><span className={'avatar '+(l.level==='CE1'?'yellow':'green')}>{l.name.slice(0,1)}</span><span><strong>{l.name}</strong><small>{l.level}</small></span></button>)}</div>
 {learner?(parent?<Dashboard learner={learner} snapshot={snapshot}/>:<Hub key={learner.id} learner={learner} snapshot={snapshot}/>):<div className="card">Aucun profil associé. Le parent doit terminer la configuration de la famille.</div>}
 {parent&&!cloud&&<details className="settings"><summary>Outils de démonstration</summary><p>Le suivi local utilise le même format de résultats que la future base partagée. Les exemples ne constituent pas un bilan scolaire.</p><button onClick={()=>{if(confirm('Effacer les résultats de démonstration sur ce navigateur ?'))resetDemo();}}>Effacer la démonstration</button></details>}
 </>}
 <footer>Les petits chemins <span>Un espace pour grandir, sans course au score.</span></footer></main></>;
}
function Login({onError}:{onError:(e:string)=>void}){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false);
 async function login(action:()=>Promise<void>){setBusy(true);try{await action();}catch(e){onError(e instanceof Error?e.message:'Connexion impossible.');}finally{setBusy(false);}}
 return <section className="card login"><p className="eyebrow">BIENVENUE</p><h1>{parent?'Le coin des parents':'Mon espace personnel'}</h1><p className="muted">{parent?'Connectez-vous avec le compte parent rattaché à votre famille.':'Utilise le compte que ton parent a préparé pour toi.'}</p>{parent?<button disabled={busy} className="primary" onClick={()=>login(loginParent)}>Se connecter avec Google</button>:<form onSubmit={e=>{e.preventDefault();void login(()=>loginLearner(email,password));}}><label>Compte enfant<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Mot de passe<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="primary" disabled={busy}>Entrer</button></form>}</section>;
}
function Hub({learner,snapshot}:{learner:Learner;snapshot:Snapshot}){
 const [module,setModule]=useState<Module>();
 const modules=catalog.modules.filter(m=>m.levels.includes(learner.level));
 const reviews=snapshot.reviews[learner.id]??[];
 if(module)return <Practice module={module} learner={learner} snapshot={snapshot} onClose={()=>setModule(undefined)}/>;
 return <><div className="section-heading"><h2>Le parcours de {learner.name}</h2><span>{modules.length} ateliers pour commencer</span></div><div className="module-grid">{modules.map((m,i)=>{const due=m.exercises.filter(q=>{const r=reviews.find(r=>r.moduleId===m.id&&r.exerciseId===q.id);return r&&Date.parse(r.card.due)<=Date.now();}).length;return <article className="module-card" key={m.id}><div className={'subject-icon '+(i%2?'yellow':'green')}>{m.subject==='Mathématiques'?'＋':'Aa'}</div><div className="module-meta">{m.subject} · {learner.level}</div><h3>{m.title}</h3><p>{m.description}</p><div className="module-bottom"><small>{due?`${due} à revoir`:m.exercises.length+' découvertes'}</small><button className="primary" onClick={()=>setModule(m)}>Explorer <span aria-hidden="true">↗</span></button></div></article>;})}<article className="module-card future"><span aria-hidden="true">✧</span><h3>La suite s’invente ici</h3><p>Lecture, musique, dictées… De nouveaux ateliers pourront rejoindre ton parcours.</p><small>À venir</small></article></div></>;
}
function Practice({module,learner,snapshot,onClose}:{module:Module;learner:Learner;snapshot:Snapshot;onClose:()=>void}){
 const next=(lastId?:string)=>selectNext(module.exercises,snapshot.reviews[learner.id]??[],module.id,new Date(),lastId);
 const [question,setQuestion]=useState<Exercise|undefined>(()=>next()),[answer,setAnswer]=useState(''),[revealed,setRevealed]=useState(false),[feedback,setFeedback]=useState<Result>(),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const started=useRef(Date.now()),pending=useRef<Attempt|undefined>(undefined),locked=useRef(false);
 async function send(value:string,rating?:number){
  if(!question||locked.current)return;locked.current=true;setBusy(true);setError('');
  try{pending.current??={schemaVersion:CONTRACT_VERSION,id:newId(),learnerId:learner.id,moduleId:module.id,moduleVersion:module.version,catalogRevision:catalog.revision,exerciseId:question.id,answer:value,durationMs:Math.min(600000,Date.now()-started.current),...(rating?{selfRating:rating as 1|2|3|4}:{})};
  const r=await submit(pending.current);setFeedback(r.result);pending.current=undefined;}
  catch(e){setError(e instanceof Error&&e.message.includes('CATALOG_MISMATCH')?'Une mise à jour est disponible. Recharge la page.':'L’enregistrement a échoué. Réessaie avec le même bouton ; ta réponse sera conservée.');}
  finally{locked.current=false;setBusy(false);}
 }
 function advance(){setQuestion(next(question?.id));setFeedback(undefined);setAnswer('');setRevealed(false);setError('');started.current=Date.now();}
 return <section className="practice"><button className="text-button" onClick={onClose}>← Mes ateliers</button><div className="card exercise"><p className="eyebrow">{module.title}</p>{question?<><h2>{question.prompt}</h2>{feedback?<div aria-live="polite" className="feedback"><span className="feedback-icon">{feedback.correct===false?'↻':'✦'}</span><h3>{feedback.correct===null?'C’est noté !':feedback.correct?'Bien joué !':'On continue à apprendre.'}</h3>{feedback.correct===false&&<p>La réponse est : <strong>{question.answer}</strong></p>}{question.explanation&&<p>{question.explanation}</p>}<p className="muted">Cette question reviendra au bon moment.</p><button className="primary" onClick={advance}>Continuer →</button></div>:<>
 {question.kind==='choice'&&<div className="choices">{question.options?.map(option=><button key={option} disabled={busy} onClick={()=>send(option)}>{option}</button>)}</div>}
 {question.kind==='number'&&<form onSubmit={e=>{e.preventDefault();void send(answer);}}><label>Ta réponse<input autoFocus inputMode="decimal" value={answer} onChange={e=>setAnswer(e.target.value)} required maxLength={30}/></label><button className="primary" disabled={busy||!answer.trim()}>Vérifier</button></form>}
 {question.kind==='flashcard'&&(revealed?<><p className="reveal">{question.answer}</p><p>Comment t’en es-tu souvenu ?</p><div className="choices ratings">{['À revoir','Difficile','Bien','Facile'].map((label,i)=><button disabled={busy} key={label} onClick={()=>send('',i+1)}>{label}</button>)}</div></>:<button className="primary" onClick={()=>setRevealed(true)}>Voir la réponse</button>)}
 {busy&&<p role="status">Enregistrement…</p>}{error&&<p role="alert" className="error">{error}</p>}
 </>}</>:<><span className="feedback-icon">✺</span><h2>Un beau pas pour aujourd’hui.</h2><p>Tu as découvert les questions disponibles. Reviens pour tes prochaines révisions.</p><button className="primary" onClick={onClose}>Revenir aux ateliers</button></>}</div></section>;
}
function Dashboard({learner,snapshot}:{learner:Learner;snapshot:Snapshot}){
 const progress=snapshot.progress[learner.id]??[],reviews=snapshot.reviews[learner.id]??[];
 // A multi-skill answer contributes once to each skill. Cards give a unique activity count.
 const total=reviews.reduce((s,r)=>s+r.card.reps,0),due=reviews.filter(r=>Date.parse(r.card.due)<=Date.now()).length;
 const weak=progress.filter(p=>p.assessed>=3).sort((a,b)=>a.correct/a.assessed-b.correct/b.assessed)[0];
 const skillLabel=(moduleId:string,id:string)=>catalog.modules.find(m=>m.id===moduleId)?.skills.find(s=>s.id===id)?.label??id;
 return <><div className="stats"><div className="stat"><span>Réponses enregistrées</span><strong>{total}</strong><small>tous ateliers confondus</small></div><div className="stat"><span>Questions à revoir</span><strong>{due}</strong><small>selon le calendrier de révision</small></div><div className="stat"><span>Compétences explorées</span><strong>{progress.length}</strong><small>sans estimation globale de maîtrise</small></div></div><section className="card recommendation"><span className="subject-icon yellow" aria-hidden="true">↗</span><div><p className="eyebrow">LA PROCHAINE PETITE ÉTAPE</p><h3>{weak?`Reprendre « ${skillLabel(weak.moduleId,weak.skillId)} »`:'Commencer par une courte séance'}</h3><p>{weak?'C’est la compétence au taux de réussite le plus bas parmi celles évaluées au moins trois fois.':'Quelques réponses permettront d’identifier des pistes. Les exercices actuels sont des exemples, pas un diagnostic scolaire.'}</p></div></section><div className="section-heading"><h2>Le détail des apprentissages</h2><span>Mise à jour à chaque réponse</span></div><div className="table-wrap"><table><thead><tr><th>Atelier / compétence</th><th>Réussite observée</th><th>Réponses évaluées</th><th>Autoévaluations</th><th>Dernière activité</th></tr></thead><tbody>{progress.map(s=><tr key={s.moduleId+s.skillId}><td><strong>{skillLabel(s.moduleId,s.skillId)}</strong><small>{catalog.modules.find(m=>m.id===s.moduleId)?.title??s.moduleId}</small></td><td>{s.assessed?<><div className="bar"><i style={{width:`${100*s.correct/s.assessed}%`}}/></div>{Math.round(100*s.correct/s.assessed)} %</>:'—'}</td><td>{s.correct} / {s.assessed}</td><td>{s.selfReviews}</td><td>{new Date(s.lastSeenAt).toLocaleDateString('fr-FR')}</td></tr>)}</tbody></table>{!progress.length&&<p className="empty">Les premières réponses apparaîtront ici.</p>}</div><p className="footnote">Une réussite à un exercice et une autoévaluation de carte mémoire sont suivies séparément. Une réponse peut travailler plusieurs compétences.</p></>;
}
createRoot(document.getElementById('root')!).render(<App/>);
