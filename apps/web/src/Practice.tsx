import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {CONTRACT_VERSION,nextSessionQuestion,sessionConceptEvidence,sessionStatus,SESSION_MAX_QUESTIONS,type LearningSession,type SessionQuestion,type Attempt,type Result} from '@famille/core';
import {catalog} from './catalog';
import {NoteStaff} from './NoteStaff';
import {submit,type Learner,type Snapshot} from './store';

function attemptId(){const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const h=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
function shuffled<T,>(items:T[]){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function Practice({initial,learner,snapshot,onClose}:{initial:LearningSession;learner:Learner;snapshot:Snapshot;onClose:()=>void}){
 const [session,setSession]=useState(initial),[question,setQuestion]=useState<SessionQuestion|undefined>(()=>nextSessionQuestion(initial,catalog.modules,snapshot.results.filter(r=>r.learnerId===learner.id))),[feedback,setFeedback]=useState<Result>(),[error,setError]=useState(''),[busy,setBusy]=useState(false),[success,setSuccess]=useState(false),[answer,setAnswer]=useState(''),[revealed,setRevealed]=useState(false);
 const choices=(q:SessionQuestion|undefined)=>q?.exercise.staff?(q.exercise.options??[]):shuffled(q?.exercise.options??[]);
 const [options,setOptions]=useState(()=>choices(question));
 const started=useRef(Date.now()),pending=useRef<Attempt|undefined>(undefined),locked=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),title=useRef<HTMLHeadingElement>(null);
 const latest=useRef(snapshot);latest.current=snapshot;
 const results=()=>latest.current.results.filter(r=>r.learnerId===learner.id);
 useEffect(()=>{document.body.classList.add('in-practice');const root=document.getElementById('root');if(root)root.inert=true;return()=>{document.body.classList.remove('in-practice');if(root)root.inert=false;if(timer.current)clearTimeout(timer.current);window.speechSynthesis?.cancel();};},[]);
 useEffect(()=>{title.current?.focus();},[question]);
 function advance(nextSession=session){
  window.speechSynthesis?.cancel();
  const next=nextSessionQuestion(nextSession,catalog.modules,results());
  setQuestion(next);setOptions(choices(next));setFeedback(undefined);setSuccess(false);setAnswer('');setRevealed(false);setError('');started.current=Date.now();locked.current=false;
 }
 async function send(value:string,rating?:1|2|3|4){
  if(!question||locked.current)return;locked.current=true;setBusy(true);setError('');
  try{
   pending.current??={schemaVersion:CONTRACT_VERSION,id:attemptId(),learnerId:learner.id,moduleId:question.module.id,moduleVersion:question.module.version,catalogRevision:catalog.revision,exerciseId:question.exercise.id,answer:value,durationMs:Math.min(600000,Date.now()-started.current),...(rating?{selfRating:rating}:{})};
   const {result}=await submit(pending.current);pending.current=undefined;
   const updated={...session,answers:[...session.answers,result]};setSession(updated);
   if(question.exercise.staff){
    if(result.correct===true){setSuccess(true);timer.current=setTimeout(()=>advance(updated),1800);}
    else {setFeedback(result);locked.current=false;}
    if(question.exercise.staff.speech!==false&&'speechSynthesis' in window){
     window.speechSynthesis.cancel();
     const voice=new SpeechSynthesisUtterance(question.exercise.answer);voice.lang='fr-FR';voice.rate=.85;
     const french=window.speechSynthesis.getVoices().find(v=>v.lang==='fr-FR');if(french)voice.voice=french;
     voice.onend=()=>{if(result.correct===true){if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>advance(updated),350);}};
     window.speechSynthesis.speak(voice);
    }
   }
   else if(result.correct===true){setSuccess(true);timer.current=setTimeout(()=>advance(updated),650);}
   else {setFeedback(result);locked.current=false;}
  }catch(e){setError(e instanceof Error&&e.message.includes('CATALOG_MISMATCH')?'Une mise à jour est disponible. Recharge la page.':'Ta réponse attend son enregistrement. Réessaie quand la connexion revient.');locked.current=false;}
  finally{setBusy(false);}
 }
 const done=session.concepts.filter(c=>sessionConceptEvidence(session,catalog.modules,results(),c).ready).length;
 const status=sessionStatus(session,catalog.modules,results());
 const q=question?.exercise;
 const finish=(ask=false)=>{if(ask&&busy)return;if(ask&&session.answers.length&&status==='working'&&!confirm('Terminer cette séance ? Les réponses enregistrées et les notions à reprendre sont conservées.'))return;onClose();};
 return createPortal(<section className="practice-shell" role="dialog" aria-modal="true" aria-label="Séance d’apprentissage">
  <div className="session-toolbar"><button className="text-button" disabled={busy} onClick={()=>finish(true)}>← Terminer</button><span>{session.subject==='Toutes'?'Toutes les matières':session.subject}</span><span>{session.answers.length} / {SESSION_MAX_QUESTIONS} max.</span></div>
  <div className="session-progress"><progress aria-label="Étapes suffisamment travaillées dans la séance" max={session.concepts.length||1} value={done}/><span>{done} / {session.concepts.length} étapes travaillées</span></div>
  {q&&question?<div className={'exercise-stage '+(q.passage?'with-passage':'')}>
   <div className="question-label"><span>{question.module.subject}</span>{!q.staff&&<span>{question.concept.label}</span>}</div>
   <div className="question-layout">
    {q.passage&&<aside className="reading-passage"><p className="eyebrow">LE TEXTE</p><p>{q.passage}</p></aside>}
    {q.diagram==='town-map'&&<TownMap/>}
    <div className="question-main"><h2 ref={title} tabIndex={-1}>{q.prompt}</h2>{q.staff&&<NoteStaff note={q.staff}/>}
     {q.staff&&(feedback||success)?<div className="feedback music-feedback" aria-live="polite"><strong>{q.answer}</strong>{feedback&&<button className="primary" aria-label="Note suivante" onClick={()=>advance()}>→</button>}</div>:feedback?<div className="feedback" aria-live="polite"><h3>{feedback.correct===false?'Prenons le temps de comprendre.':'C’est enregistré.'}</h3><p>La réponse : <strong>{q.answer}</strong></p>{q.explanation&&<p>{q.explanation}</p>}<button className="primary" onClick={()=>advance()}>J’ai compris →</button></div>:<>
      {q.kind==='choice'&&<div className={q.staff?"choices music-choices":"choices"}>{options.map(option=><button key={option} disabled={busy||success||!!error} onClick={()=>void send(option)}>{option}</button>)}</div>}
      {(q.kind==='number'||q.kind==='text')&&<form onSubmit={e=>{e.preventDefault();void send(answer);}}><label>Ta réponse<input required value={answer} disabled={busy||success||!!error} onChange={e=>setAnswer(e.target.value)}/></label><button className="primary" disabled={busy||success||!!error}>Vérifier</button></form>}
      {q.kind==='flashcard'&&(revealed?<><p>{q.answer}</p><div className="choices">{['À revoir','Difficile','Bien','Facile'].map((label,i)=><button disabled={busy||!!error} key={label} onClick={()=>void send('',(i+1) as 1|2|3|4)}>{label}</button>)}</div></>:<button className="primary" onClick={()=>setRevealed(true)}>Voir la réponse</button>)}
     </>}
    </div>
   </div>
   <div className="session-message" aria-live="polite">{busy?'Enregistrement…':success?(q.staff?'':'✓ Bien joué !'):error?<><p role="alert">{error}</p><button onClick={()=>void send(pending.current?.answer??'',pending.current?.selfRating)}>Réessayer l’enregistrement</button></>:q.staff?'':feedback?(question.concept.exerciseId?'Ce repère reviendra bientôt.':'Cette notion sera vérifiée avec d’autres exemples.'):'Prends le temps de réfléchir.'}</div>
  </div>:<div className="session-summary card"><p className="eyebrow">{status==='empty'?'LE TRAVAIL DU JOUR EST TERMINÉ':'FIN DE SÉANCE'}</p><h2 ref={title} tabIndex={-1}>{status==='complete'?'Un beau pas pour aujourd’hui.':status==='empty'?'Tout est à jour.':'Assez travaillé pour cette fois.'}</h2><p>{status==='complete'?'Tu as travaillé les notions et les repères prévus. Ils reviendront dans les prochaines séances.':status==='empty'?'Les notions déjà travaillées reviendront au bon moment. Tu peux choisir une autre matière.':'Les notions qui demandent encore de la pratique reviendront. Pas besoin de tout faire aujourd’hui.'}</p><ul>{session.concepts.map(c=><li key={c.moduleId+(c.exerciseId??c.skillId)}><span>{c.exerciseId?catalog.modules.find(m=>m.id===c.moduleId)?.exercises.find(q=>q.id===c.exerciseId)?.prompt:c.label}</span><strong>{sessionConceptEvidence(session,catalog.modules,results(),c).ready?'✓ Travaillé':'↻ À reprendre'}</strong></li>)}</ul><button className="primary" onClick={()=>finish()}>Retour à mon parcours</button></div>}
  {success&&!q?.staff&&<div className="success-toast" role="status">✓ Bien joué !</div>}
 </section>,document.body);
}
function TownMap(){return <figure className="town-map"><svg viewBox="0 0 400 210" role="img" aria-labelledby="map-title"><title id="map-title">Plan : mairie au nord-ouest, école au nord-est, gare au sud-ouest et parc au sud-est. Le nord est en haut.</title><rect x="15" y="12" width="370" height="185" rx="18" fill="#edf2e8"/><path d="M200 25V185M40 105H350" stroke="#fff" strokeWidth="20"/><path d="M365 60V25l-6 10m6-10 6 10" fill="none" stroke="#203d35" strokeWidth="2"/><text x="365" y="78" textAnchor="middle">N</text>{[[100,60,'Mairie'],[275,60,'École'],[100,155,'Gare'],[275,155,'Parc']].map(([x,y,label])=><g key={label}><circle cx={x} cy={Number(y)-8} r="8" fill="#176655"/><text x={x} y={Number(y)+18} textAnchor="middle" fill="#203d35" fontSize="17">{label}</text></g>)}</svg><figcaption>Plan simplifié d’un quartier · nord en haut</figcaption></figure>;}
