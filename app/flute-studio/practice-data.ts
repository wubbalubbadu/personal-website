export type PracticeSession={id:string;itemId:string;itemType:"repertoire"|"exercise"|"etude"|"method"|"warm-up"|"focus";title:string;startedAt:string;endedAt:string;durationSeconds:number;reflection:string};
export const sessionsKey="cookie:practice-sessions:v1";
export function readSessions(){try{return JSON.parse(localStorage.getItem(sessionsKey)??"[]") as PracticeSession[]}catch{return []}}
export function formatDuration(seconds:number){const minutes=Math.floor(seconds/60),remainder=seconds%60;return minutes?`${minutes}:${String(remainder).padStart(2,"0")}`:`0:${String(remainder).padStart(2,"0")}`}

export type RoutineItem={id:string;text:string;doneOn?:string;ref?:string};
/** Completion belongs to the local practice day, not a UTC date. */
export function practiceDay(time:number|string=Date.now()){const day=new Date(time);return `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,"0")}-${String(day.getDate()).padStart(2,"0")}`}
export function migrateRoutine(items:(RoutineItem&{done?:boolean})[],today:string):RoutineItem[]{return items.map(({done,...item})=>({...item,...(!item.doneOn&&done?{doneOn:today}:{})}))}
/** Only saved sessions count, so a discarded clock stretch never completes an item. */
export function routineForDay(items:RoutineItem[],sessions:PracticeSession[],today:string):RoutineItem[]{
  // Each session today ticks one step for its piece or exercise, so two steps with the same name need two sessions.
  const left=new Map<string,number>();
  for(const session of sessions)if(practiceDay(session.endedAt)===today)left.set(session.itemId,(left.get(session.itemId)??0)+1);
  const routine=migrateRoutine(items,today);
  for(const item of routine)if(item.ref&&item.doneOn===today&&left.get(item.ref))left.set(item.ref,left.get(item.ref)!-1);
  return routine.map(item=>{
    if(!item.ref||item.doneOn===today||!left.get(item.ref))return item;
    left.set(item.ref,left.get(item.ref)!-1);
    return {...item,doneOn:today};
  });
}
