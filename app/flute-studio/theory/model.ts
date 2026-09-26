export const SAVE_KEY = 'cookie-theory-v1';
// Step names in lesson order; FirstNotes' FLOW holds the matching ids.
export const STEPS = ['Staff', 'Spaces', 'Notes', 'Clef', 'Other clefs', 'Note names', 'Finding notes', 'Practice', 'Ledger lines', 'Twinkle', 'Read new notes', 'Free play'] as const;
// Diatonic positions counted upward from the bottom staff line, E4.
export const PITCHES = [
  {name:'C', octave:4, midi:60}, {name:'D', octave:4, midi:62},
  {name:'E', octave:4, midi:64}, {name:'F', octave:4, midi:65},
  {name:'G', octave:4, midi:67}, {name:'A', octave:4, midi:69},
  {name:'B', octave:4, midi:71}, {name:'C', octave:5, midi:72},
  {name:'D', octave:5, midi:74}, {name:'E', octave:5, midi:76},
  {name:'F', octave:5, midi:77}, {name:'G', octave:5, midi:79},
  {name:'A', octave:5, midi:81},
];
export function clampPosition(position:number){return Math.max(-2,Math.min(10,Math.round(position)))}
export function pitchAt(position:number){return PITCHES[clampPosition(position)+2]}
export function noteY(position:number){return 200-position*12}
export function positionAt(y:number){return clampPosition((200-y)/12)}
export function ledgerLines(position:number){const lines:number[]=[];if(position<0){for(let p=-2;p>=position;p-=2)lines.push(p)}else{for(let p=10;p<=position;p+=2)lines.push(p)}return lines}
export function matchesMelody(actual:(number|null)[],target:number[]){if(actual.length!==target.length||actual.some(p=>p===null))return false;const shift=(actual[0] as number)-target[0];return shift%7===0&&actual.every((p,i)=>p===target[i]+shift)}
export type SavedLesson={version:1;step:number;phrase:(number|null)[];completed:boolean};
export function readSaved(raw:string|null):SavedLesson{
  const fallback:SavedLesson={version:1,step:0,phrase:[null,null,null,null],completed:false};
  try{
    const data=JSON.parse(raw??'null');
    if(data?.version!==1||!Array.isArray(data.phrase)||data.phrase.length!==4)return fallback;
    return {version:1,step:Number.isInteger(data.step)?Math.max(0,Math.min(STEPS.length-1,data.step)):0,
      phrase:data.phrase.map((p:unknown)=>typeof p==='number'&&Number.isInteger(p)&&p>=-2&&p<=10?p:null),completed:data.completed===true};
  }catch{return fallback}
}

export const SOLFEGE:Record<string,string>={C:'do',D:'re',E:'mi',F:'fa',G:'sol',A:'la',B:'si'};
export function pitchLabel(position:number,solfege=true){const p=pitchAt(position);return solfege?`${p.name} · ${SOLFEGE[p.name]}`:p.name}
