import React from 'react';
import {trebleClef} from './music-glyph';
export type StaffNote={clef:'treble'|'bass';step:number};
/** French do3 = C4 (MIDI 60). Bass steps extend down to French do1 = C2 (MIDI 36). */
export function staffLayout({clef,step}:StaffNote){
 const y=(clef==='treble'?128:64)-step*8;
 const ledgers:number[]=[];
 for(let line=32;line>=y;line-=16)ledgers.push(line);
 for(let line=128;line<=y;line+=16)ledgers.push(line);
 return {y,ledger:ledgers[0],ledgers,down:clef==='bass'&&y<=80};
}
export function NoteStaff({note,piano=false}:{note:StaffNote;piano?:boolean}){
 const layout=staffLayout(note);
 // Six staff spaces between the staves keep middle C distinct for each hand.
 const offset=piano&&note.clef==='bass'?160:0;
 const y=layout.y+offset,ledgers=layout.ledgers.map(line=>line+offset),down=layout.down;
 const label=piano?'Une note à lire sur les deux portées de piano, clé de sol en haut et clé de fa en bas':'Une note à lire sur la portée';
 const clefs:StaffNote['clef'][]=piano?['treble','bass']:[note.clef];
 return <figure className="music-staff"><svg viewBox={piano?'0 0 320 320':'0 0 320 176'} role="img" aria-label={label}>
  <title>{label}</title>
  {piano&&<g fill="currentColor"><path d="M20 48 C9 58 12 82 13 104 C15 131 12 149 6 160 C12 171 15 189 13 216 C12 238 9 262 20 272 C4 265 6 238 8 216 C10 188 7 170 1 160 C7 150 10 132 8 104 C6 82 4 55 20 48Z"/><path d="M24 48V272" fill="none" stroke="currentColor" strokeWidth="1.3"/></g>}
  {clefs.map(clef=><g key={clef} transform={piano&&clef==='bass'?'translate(0 160)':undefined}>
   <g stroke="currentColor" strokeWidth="1.3">{[48,64,80,96,112].map(y=><line key={y} x1="24" x2="296" y1={y} y2={y}/>)}</g>
   {clef==='treble'?<path d={trebleClef} transform="translate(44 96) scale(.064 -.064)" fill="currentColor"/>:<g fill="currentColor"><path d="M43 66 C41 48 68 43 75 60 C84 82 60 101 43 110 C60 94 70 78 67 62 C65 51 54 51 49 57 C62 54 63 72 52 73 C47 74 44 71 43 66Z"/><circle cx="85" cy="56" r="3.5"/><circle cx="85" cy="72" r="3.5"/></g>}
  </g>)}
  {ledgers.map(ledger=><line key={ledger} x1="185" x2="223" y1={ledger} y2={ledger} stroke="currentColor" strokeWidth="1.5"/>)}
  <ellipse cx="204" cy={y} rx="11" ry="7.5" transform={`rotate(-18 204 ${y})`} fill="currentColor"/>
  <line x1={down?194:214} x2={down?194:214} y1={y} y2={y+(down?48:-48)} stroke="currentColor" strokeWidth="1.8"/>
 </svg></figure>;
}
