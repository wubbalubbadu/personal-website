export type AccompanimentNote={pitch:string;at:number;duration:number;level:number};
const text=(xml:string,tag:string)=>xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`))?.[1]??'';
const number=(xml:string,tag:string,fallback=0)=>Number(text(xml,tag)||fallback);
const pitches=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const pitch=(midi:number)=>pitches[(midi%12+12)%12]+(Math.floor(midi/12)-1);
const pc=(step:string,alter=0)=>({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[step]??0)+alter;
/** Written score order, matching the reader. Backup, forward, chords and ties retain their timing. */
export function readAccompaniment(xml:string,readingPartId='P1'){
 const parts=[...xml.matchAll(/<part\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/part>/g)];
 const lead=parts.find(p=>p[1]===readingPartId)??parts[0];if(!lead)return {notes:[] as AccompanimentNote[],kind:'piano' as const};
 const barLengths:number[]=[];let div=1;
 for(const [,bar] of lead[2].matchAll(/<measure\b[^>]*>([\s\S]*?)<\/measure>/g)){
  div=number(bar,'divisions',div);let cursor=0,last=0,end=0;
  for(const [token] of bar.matchAll(/<note\b[^>]*>[\s\S]*?<\/note>|<backup>[\s\S]*?<\/backup>|<forward>[\s\S]*?<\/forward>/g)){
   const d=number(token,'duration')/div;if(token.startsWith('<backup'))cursor-=d;else if(token.startsWith('<forward'))cursor+=d;else{const at=token.includes('<chord')?last:cursor;end=Math.max(end,at+d);if(!token.includes('<chord')){last=cursor;cursor+=d}}
  }barLengths.push(end);
 }
 const starts=barLengths.reduce<number[]>((a,n)=>[...a,a[a.length-1]+n],[0]);
 const piano=parts.filter(p=>p[1]!==lead[1]&&/<staves>2<\/staves>/.test(p[2]));
 const notes:AccompanimentNote[]=[];
 if(piano.length){
  for(const part of piano){let divisions=1,level=.7;const ties=new Map<string,AccompanimentNote>();let barIndex=0;
   for(const [,bar] of part[2].matchAll(/<measure\b[^>]*>([\s\S]*?)<\/measure>/g)){
    divisions=number(bar,'divisions',divisions);let cursor=0,last=0;
    for(const [token] of bar.matchAll(/<note\b[^>]*>[\s\S]*?<\/note>|<backup>[\s\S]*?<\/backup>|<forward>[\s\S]*?<\/forward>|<direction\b[^>]*>[\s\S]*?<\/direction>/g)){
     const duration=number(token,'duration')/divisions;
     if(token.startsWith('<backup')){cursor-=duration;continue}if(token.startsWith('<forward')){cursor+=duration;continue}
     if(token.startsWith('<direction')){const dynamic=token.match(/<dynamics\b[^>]*>\s*<(ppp|pp|p|mp|mf|ff|f)\b/);if(dynamic)level=({ppp:.25,pp:.35,p:.45,mp:.6,mf:.7,f:.85,ff:1})[dynamic[1] as 'p'];continue}
     const at=token.includes('<chord')?last:cursor;if(!token.includes('<chord')){last=cursor;cursor+=duration}
     const raw=text(token,'pitch');if(!raw||duration<=0)continue;
     const name=pitch((number(raw,'octave')+1)*12+pc(text(raw,'step'),number(raw,'alter'))),key=name+':'+text(token,'voice'),time=(starts[barIndex]??0)+at;
     const prior=ties.get(key),stop=/<tie\b[^>]*type="stop"/.test(token),start=/<tie\b[^>]*type="start"/.test(token);
     const note=stop&&prior?prior:{pitch:name,at:time,duration:0,level};note.duration+=duration;if(note!==prior)notes.push(note);if(start)ties.set(key,note);else ties.delete(key);
    }barIndex++;
   }
  }return {notes,kind:'piano' as const};
 }
 // Chord symbols produce a simple sustained piano voicing, not an invented scored part.
 const chords:{at:number;midi:number[]}[]=[];let divisions=1,barIndex=0;
 for(const [,bar] of lead[2].matchAll(/<measure\b[^>]*>([\s\S]*?)<\/measure>/g)){
  divisions=number(bar,'divisions',divisions);let cursor=0;
  for(const [token] of bar.matchAll(/<harmony\b[^>]*>[\s\S]*?<\/harmony>|<note\b[^>]*>[\s\S]*?<\/note>|<backup>[\s\S]*?<\/backup>|<forward>[\s\S]*?<\/forward>/g)){
   if(token.startsWith('<harmony')){const kind=text(token,'kind');const intervals:Record<string,number[]>={major:[0,4,7],minor:[0,3,7],dominant:[0,4,7,10],'major-seventh':[0,4,7,11],'minor-seventh':[0,3,7,10],diminished:[0,3,6],'diminished-seventh':[0,3,6,9],'half-diminished':[0,3,6,10],augmented:[0,4,8],'suspended-fourth':[0,5,7],'suspended-second':[0,2,7]};const root=text(token,'root-step');if(!root||!intervals[kind])continue;const base=48+pc(root,number(token,'root-alter'));const bass=text(token,'bass-step');chords.push({at:starts[barIndex]+cursor+number(token,'offset')/divisions,midi:[bass?36+pc(bass,number(token,'bass-alter')):base-12,...intervals[kind].map(n=>base+n)]});
   }else if(token.startsWith('<backup'))cursor-=number(token,'duration')/divisions;else if(!token.includes('<chord'))cursor+=number(token,'duration')/divisions;
  }barIndex++;
 }
 chords.sort((a,b)=>a.at-b.at);chords.forEach((chord,i)=>{const duration=(chords[i+1]?.at??starts.at(-1)!)-chord.at;if(duration>0)for(const midi of chord.midi)notes.push({pitch:pitch(midi),at:chord.at,duration,level:.55})});return {notes,kind:'chords' as const};
}
