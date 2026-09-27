export type PracticeSession={id:string;itemId:string;itemType:"repertoire"|"exercise"|"etude"|"method"|"warm-up"|"focus";title:string;startedAt:string;endedAt:string;durationSeconds:number;reflection:string};
export const sessionsKey="cookie:practice-sessions:v1";
export function readSessions(){try{return JSON.parse(localStorage.getItem(sessionsKey)??"[]") as PracticeSession[]}catch{return []}}
export function formatDuration(seconds:number){const minutes=Math.floor(seconds/60),remainder=seconds%60;return minutes?`${minutes}:${String(remainder).padStart(2,"0")}`:`0:${String(remainder).padStart(2,"0")}`}
