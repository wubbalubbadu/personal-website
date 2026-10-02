import {majorKeys,scaleTypes,type ScaleTypeId} from "../exercises/scales/scale-score";

export type PassageEvent={p:string|null;d:number;tied?:boolean};
export type ScaleSuggestion={key:string;type:ScaleTypeId;label:string;matched:number;total:number};
export type PassageAnalysis={notes:number;rests:number;ties:number;differentDurations:number;tuplets:number;subdivision:3|6|null;evenRun:number;motion:"steps"|"leaps"|"mixed"|"unclear";scale:ScaleSuggestion|null;pitchClasses:number};

const semitones:Record<string,number>={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
export function pitchClass(pitch:string):number|null{
  const match=/^([A-G])([♯♭]?)(\d+)$/.exec(pitch);
  if(!match)return null;
  return (semitones[match[1]]+(match[2]==="♯"?1:match[2]==="♭"?-1:0)+12)%12;
}
function midi(pitch:string):number|null{
  const match=/^([A-G])([♯♭]?)(\d+)$/.exec(pitch);
  const pc=pitchClass(pitch);
  return match&&pc!==null?(Number(match[3])+1)*12+semitones[match[1]]+(match[2]==="♯"?1:match[2]==="♭"?-1:0):null;
}

/** Compare the actual notes, never just the key signature. Sparse or ambiguous passages get no scale label. */
export function suggestScale(pitches:string[]):ScaleSuggestion|null{
  const pcs=pitches.map(pitchClass).filter((pc):pc is number=>pc!==null);
  const distinct=[...new Set(pcs)];
  if(pcs.length<6||distinct.length<5)return null;
  const first=pcs[0],last=pcs.at(-1);
  const candidates=majorKeys.flatMap(key=>scaleTypes.filter(type=>type.id!=="chromatic"&&type.id!=="wholeTone"&&type.id!=="diminished"&&type.id!=="augmented").map(type=>{
    const tones=new Set(type.intervals.map(interval=>(key.pc+interval)%12));
    const matched=pcs.filter(pc=>tones.has(pc)).length;
    const distinctMatched=distinct.filter(pc=>tones.has(pc)).length;
    // A tonic boundary is useful evidence, while one accidental by itself is not.
    const boundary=(first===key.pc?2:0)+(last===key.pc?1:0);
    return {key:key.id,type:type.id,label:`${key.label} ${type.label.toLowerCase()}`,matched,total:pcs.length,distinctMatched,score:distinctMatched*3+boundary-(tones.size-distinctMatched)*.25};
  })).filter(candidate=>candidate.matched===pcs.length&&candidate.distinctMatched>=5).sort((a,b)=>b.score-a.score);
  if(!candidates.length||candidates[0].score-(candidates[1]?.score??-Infinity)<1)return null;
  const {key,type,label,matched,total}=candidates[0];
  return {key,type,label,matched,total};
}

export function analyzePassage(events:PassageEvent[],unitsPerBeat:number):PassageAnalysis{
  const pitches=events.flatMap(event=>event.p&&!event.tied?[event.p]:[]);
  const values=pitches.map(midi).filter((value):value is number=>value!==null);
  const intervals=values.slice(1).map((value,index)=>Math.abs(value-values[index]));
  const stepCount=intervals.filter(interval=>interval<=2).length,leapCount=intervals.filter(interval=>interval>=3).length;
  const motion=intervals.length<4?"unclear":stepCount/intervals.length>.7?"steps":leapCount/intervals.length>.7?"leaps":"mixed";
  const subdivisions=events.map(event=>event.d>0?unitsPerBeat/event.d:0);
  const threes=subdivisions.filter(n=>n===3).length,sixes=subdivisions.filter(n=>n===6).length;
  let run=0,evenRun=0,lastDuration=0;
  for(const event of events){
    if(!event.p||event.tied||event.d<=0){run=0;continue}
    run=event.d===lastDuration?run+1:1;lastDuration=event.d;
    evenRun=Math.max(evenRun,run);
  }
  return {
    notes:pitches.length,
    rests:events.filter(event=>!event.p).length,
    ties:events.filter(event=>event.tied).length,
    differentDurations:new Set(events.filter(event=>event.d>0).map(event=>event.d)).size,
    // One beat divided into 3, 6, 9, etc. equal units signals a tuplet subdivision.
    tuplets:threes+sixes,
    subdivision:sixes>=3&&sixes>=threes?6:threes>=3?3:null,
    evenRun,
    motion,
    scale:suggestScale(pitches),
    pitchClasses:new Set(pitches.map(pitchClass).filter(pc=>pc!==null)).size,
  };
}
