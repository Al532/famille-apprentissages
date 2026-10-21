import React from 'react';
import {trebleClef} from './music-glyph';
export type StaffNote={clef:'treble'|'bass';step:number};
/** French do3 = C4 (MIDI 60). Five diatonic notes in each requested range. */
export function staffLayout({clef,step}:StaffNote){
 const y=(clef==='treble'?128:64)-step*8;
 return {y,ledger:clef==='treble'&&step===0?128:clef==='bass'&&step===4?32:undefined,down:clef==='bass'};
}
export function NoteStaff({note}:{note:StaffNote}){
 const {y,ledger,down}=staffLayout(note);
 const label=`Une note à lire en clé de ${note.clef==='treble'?'sol':'fa'}`;
 return <figure className="music-staff"><svg viewBox="0 0 320 176" role="img" aria-label={label}>
  <title>{label}</title>
  <g stroke="currentColor" strokeWidth="1.3">{[48,64,80,96,112].map(y=><line key={y} x1="24" x2="296" y1={y} y2={y}/>)}</g>
  {note.clef==='treble'?<path d={trebleClef} transform="translate(44 96) scale(.064 -.064)" fill="currentColor"/>:<g fill="currentColor"><path d="M43 66 C41 48 68 43 75 60 C84 82 60 101 43 110 C60 94 70 78 67 62 C65 51 54 51 49 57 C62 54 63 72 52 73 C47 74 44 71 43 66Z"/><circle cx="85" cy="56" r="3.5"/><circle cx="85" cy="72" r="3.5"/></g>}
  {ledger!==undefined&&<line x1="185" x2="223" y1={ledger} y2={ledger} stroke="currentColor" strokeWidth="1.5"/>}
  <ellipse cx="204" cy={y} rx="11" ry="7.5" transform={`rotate(-18 204 ${y})`} fill="currentColor"/>
  <line x1={down?194:214} x2={down?194:214} y1={y} y2={y+(down?48:-48)} stroke="currentColor" strokeWidth="1.8"/>
 </svg><figcaption>Clé de {note.clef==='treble'?'sol':'fa'}</figcaption></figure>;
}
