/** Bound the UI wait; retries must reuse the same immutable attempt ID. */
export async function withSaveTimeout<T>(operation:Promise<T>,delayMs=15000):Promise<T>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  return await Promise.race([operation,new Promise<never>((_,reject)=>{
   timer=setTimeout(()=>reject(new Error('SAVE_TIMEOUT')),delayMs);
  })]);
 }finally{if(timer!==undefined)clearTimeout(timer);}
}
