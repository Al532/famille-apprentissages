import {attemptSchema,type Attempt} from '@famille/core';
import type {RecordedAttempt} from './history';
export type PendingAttempt=RecordedAttempt&{uid:string;familyId:string};
type StorageLike=Pick<Storage,'length'|'key'|'getItem'|'setItem'|'removeItem'>;
const prefix='famille-outbox-v1:';
const key=(uid:string,id:string)=>prefix+encodeURIComponent(uid)+':'+id;
/** One key per immutable answer: tabs cannot overwrite one another's queue. */
export function pendingAttempts(storage:StorageLike,uid:string,familyId:string):PendingAttempt[]{
 const entries:PendingAttempt[]=[];
 for(let i=0;i<storage.length;i++){
  const name=storage.key(i);if(!name?.startsWith(prefix+encodeURIComponent(uid)+':'))continue;
  const value=storage.getItem(name);if(!value)continue;
  const entry=JSON.parse(value) as PendingAttempt;
  if(entry.uid!==uid||entry.familyId!==familyId)continue;
  entry.attempt=attemptSchema.parse(entry.attempt);
  if(!Number.isFinite(Date.parse(entry.recordedAt)))throw new Error('LOCAL_SAVE_FAILED');
  entries.push(entry);
 }
 return entries.sort((a,b)=>a.recordedAt.localeCompare(b.recordedAt)||a.attempt.id.localeCompare(b.attempt.id));
}
export function queueAttempt(storage:StorageLike,entry:PendingAttempt):PendingAttempt{
 const attempt=attemptSchema.parse(entry.attempt),name=key(entry.uid,attempt.id),previous=storage.getItem(name);
 if(previous){
  const saved=JSON.parse(previous) as PendingAttempt;
  if(saved.familyId!==entry.familyId||JSON.stringify(saved.attempt)!==JSON.stringify(attempt))throw new Error('LOCAL_SAVE_FAILED');
  return saved;
 }
 storage.setItem(name,JSON.stringify({...entry,attempt}));return {...entry,attempt};
}
export function confirmAttempt(storage:StorageLike,uid:string,id:string){storage.removeItem(key(uid,id));}
/** Server-confirmed records take precedence over their provisional local copy. */
export function mergeAttempts(remote:RecordedAttempt[],pending:RecordedAttempt[]):RecordedAttempt[]{
 const ids=new Set(remote.map(r=>r.attempt.id));
 return [...remote,...pending.filter(r=>!ids.has(r.attempt.id))];
}
