import musicTerms from "../../../content/music-terms.json";
/** User-picked speed relative to the score's printed beat, not playback's last section. */
export const SCORE_TEMPO_KEY='cookie:score-tempo-ratios-v1';
export function readTempoRatios(raw:string|null):Record<string,number>{
  try{
    const saved:unknown=JSON.parse(raw??'{}');
    if(!saved||typeof saved!=='object'||Array.isArray(saved))return {};
    return Object.fromEntries(Object.entries(saved).filter(([,ratio])=>typeof ratio==='number'&&Number.isFinite(ratio)&&ratio>0));
  }catch{return {}}
}
/** Every metronome's range, like a real one: very slow practice down to 10, up to 250. Breathing Lab keeps its own. */
export const TEMPO_MIN=10,TEMPO_MAX=250;
export function clampTempo(value:number){return Math.max(TEMPO_MIN,Math.min(TEMPO_MAX,Math.round(value)))}
export type TempoPoint={at:number;bpm:number};
/** The scheduler holds each note at its sampled ramp speed. Display that same speed. */
export function scheduledTempoAt(points:TempoPoint[],time:number):number|null{
  if(!points.length||time<points[0].at)return null;
  let lo=0,hi=points.length;
  while(lo<hi){const mid=(lo+hi)>>>1;if(points[mid].at<=time)lo=mid+1;else hi=mid}
  return Math.round(points[lo-1].bpm);
}

/**
 * While a tempo is still being typed it is applied after a short pause, so a running metronome follows without
 * waiting for the keyboard to close (the iPad number pad has no Enter key). Only from LIVE_TEMPO_MIN up: typing
 * 140 passes through 1 and 14, which must not set the click to 14. Lower values still apply when the field closes.
 */
export const LIVE_TEMPO_MIN=30,LIVE_TEMPO_DELAY=500;
export function liveTempo(draft:string):number|null{const value=Number(draft);return draft.trim()!==""&&Number.isFinite(value)&&value>=LIVE_TEMPO_MIN&&value<=TEMPO_MAX?Math.round(value):null}

/* ------------------------------------------------------------ tempo words (TEMPO-RULE.md) */

/**
 * A speed word's range in quarter notes per minute (x/4). The Italian words come from the glossary, so a tooltip and
 * playback quote the same numbers (it already has the French and German basics, and "très modéré" at 46 to 66); these are
 * the words it has no number for. "held" words mean restrained (moderato):
 * "very" holds them back further rather than speeding them up.
 */
type Side="slow"|"held"|"fast";
const VERY_HELD:[number,number]=[46,66];
const EXTRA_SPEEDS:Record<string,[number,number]>={larghissimo:[20,24],adagietto:[70,80],"molto moderato":VERY_HELD,"mäßig":[108,120],vite:[120,156],lebhaft:[156,176]};
const HELD=new Set(["moderato","modéré","modérément","mässig","mäßig","très modéré","molto moderato"]);
const SPEEDS:{parts:string[];range:[number,number]}[]=[
  ...Object.entries(musicTerms as Record<string,{bpm?:number[]}>).filter(([,term])=>term.bpm?.length===2).map(([phrase,term])=>({parts:phrase.split(" "),range:[term.bpm![0],term.bpm![1]] as [number,number]})),
  ...Object.entries(EXTRA_SPEEDS).map(([phrase,range])=>({parts:phrase.split(" "),range})),
].sort((a,b)=>b.parts.length-a.parts.length);
const middle=([low,high]:[number,number])=>(low+high)/2;
const sideOf=(phrase:string,range:[number,number]):Side=>HELD.has(phrase)?"held":middle(range)>=114?"fast":"slow";

const FASTER=new Set(["mosso","vivo","allegro","animato","animé","vite","presto","mouvementé","vivace","agitato"]);
const SLOWER=new Set(["lento","lent","moderato","modéré","tranquillo","tranquille","largo","adagio","calmo","sostenuto"]);
const INTENSIFIERS=new Set(["molto","assai","très","sehr"]);
const SOFTENERS=["non troppo","non tanto","pas trop","assez","poco","un poco","etwas","un peu"];

export type TempoWord=
  /** bpm in quarter notes for x/4, before converting to the bar's beat. */
  |{kind:"speed";label:string;key:string;bpm:number}
  |{kind:"relative";label:string;factor:number}
  |{kind:"primo";label:string}
  |{kind:"return";label:string};

/** Words the way the reader reads them: lower case, trailing dots off, "piu" as "più", "mouvᵗ" and "mouv!" as "mouvement". */
function tempoTokens(text:string){
  const original=text.replace(/[(),;:!]/g," ").split(/\s+/).map(word=>word.replace(/\.+$/,"")).filter(Boolean);
  const words=original.map(word=>{const w=word.toLowerCase();return w==="piu"?"più":/^mouv(ᵗ|t|ement)?$/.test(w)?"mouvement":w});
  return {original,words};
}
const has=(words:string[],phrase:string)=>{const parts=phrase.split(" ");return words.some((_,i)=>parts.every((part,k)=>words[i+k]===part))};

/**
 * What a marking says about speed, by TEMPO-RULE.md: a relative change ("Più mosso"), a return to the opening ("Tempo I"),
 * a speed word with its qualifiers ("Allegro ma non troppo"), or a return after a change ("a tempo", "au mouvement").
 * Null for everything else, including rit./accel. (ramps) and "L'istesso tempo" (no change).
 */
export function wordTempo(text:string):TempoWord|null{
  const {original,words}=tempoTokens(text);
  if(!words.length||has(words,"istesso")||words.includes("l'istesso")||words.includes("l’istesso"))return null;
  const span=(from:number,to:number)=>original.slice(from,to+1).join(" ");
  // 1. Relative: più / plus / meno / moins and a direction, or a word that is itself a change.
  for(let i=0;i<words.length;i++){
    const word=words[i],next=words[i+1]??"";
    let up:boolean|null=null;
    if((word==="più"||word==="plus")&&(FASTER.has(next)||SLOWER.has(next)))up=FASTER.has(next);
    else if((word==="meno"||word==="moins")&&(FASTER.has(next)||next==="vite"))up=false;
    else if(word==="mouvementé"||word==="schneller"||word==="bewegter")up=true;
    else if(word==="langsamer"||word==="ruhiger")up=false;
    else if((word==="animé"||word==="animato")&&(words[i-1]==="peu"||words[i-1]==="poco"))up=true;
    if(up===null)continue;
    const step=has(words,"très peu")||words.includes("pochissimo")?1.05:has(words,"molto più")||has(words,"beaucoup plus")?1.25:words.includes("poco")||words.includes("peu")||words.includes("etwas")?1.08:1.15;
    const first=Math.max(0,["un","poco","peu","molto","beaucoup","etwas"].includes(words[i-1]??"")?i-(words[i-2]==="un"?2:1):i);
    const last=word==="più"||word==="plus"||word==="meno"||word==="moins"?i+1:i;
    return {kind:"relative",label:span(first,last),factor:up?step:1/step};
  }
  // 2. Back to the opening: Tempo I, Tempo primo, 1° tempo, 1er mouvement.
  const primo=words.findIndex((word,i)=>(word==="tempo"&&["i","primo","1","1°"].includes(words[i+1]??""))||(["1°","1er","primo"].includes(word)&&["tempo","mouvement"].includes(words[i+1]??"")));
  if(primo>=0)return {kind:"primo",label:span(primo,primo+1)};
  // 3. A speed word, placed in its range by what qualifies it.
  const found:{at:number;phrase:string;range:[number,number];length:number}[]=[];
  for(let i=0;i<words.length;){
    const speed=SPEEDS.find(({parts})=>parts.every((part,k)=>words[i+k]===part));
    if(speed){found.push({at:i,phrase:speed.parts.join(" "),range:speed.range,length:speed.parts.length});i+=speed.parts.length}else i++;
  }
  if(found.length){
    const head=found[0],own=new Set(found.flatMap(({at,length})=>Array.from({length},(_,k)=>at+k)));
    const side=sideOf(head.phrase,head.range);
    let range=head.range,position=.5,last=head.at+head.length-1;
    const second=found[1];
    if(second){position=middle(second.range)>middle(range)?1:middle(second.range)<middle(range)?0:.5;last=second.at+second.length-1}
    const qualifier=(index:number)=>{if(index>last)last=index};
    const moto=words.findIndex((word,i)=>(word==="moto"&&words[i-1]==="con")||word==="mosso"||word==="bewegt");
    if(moto>=0){position=.75;qualifier(moto)}
    const very=words.findIndex((word,i)=>INTENSIFIERS.has(word)&&!own.has(i));
    const soft=SOFTENERS.map(phrase=>{const parts=phrase.split(" ");const at=words.findIndex((_,i)=>parts.every((part,k)=>words[i+k]===part));return at<0?null:{at,end:at+parts.length-1}}).find(Boolean);
    if(very>=0){qualifier(very);if(side==="held"){range=VERY_HELD;position=.5}else position=side==="fast"?1:0}
    else if(soft){qualifier(soft.end);if(side!=="held")position=side==="fast"?0:1}
    const first=Math.min(head.at,very>=0?very:Infinity,soft&&soft.at<head.at?soft.at:Infinity);
    const key=side==="held"&&very>=0?"très modéré":found.map(({phrase})=>phrase).join(" ");
    return {kind:"speed",label:span(first,last),key,bpm:Math.round(range[0]+position*(range[1]-range[0]))};
  }
  // 4. A return after a change.
  const back=words.findIndex((word,i)=>(word==="a"&&words[i+1]==="tempo")||(word==="au"&&words[i+1]==="mouvement")||(word==="im"&&words[i+1]==="tempo"));
  if(back>=0)return {kind:"return",label:span(back,back+1)};
  return null;
}

/**
 * The table's quarter-note number in a bar's beat (quarter notes per beat): the same quarter speed for long beats
 * (♩. in 6/8 takes 2/3 of it, 𝅗𝅥 in 2/2 half), and for short ones "felt quicker, not twice as quick": half again
 * each time the beat halves (♪ in 3/8 is 1.5 times). The uploader (tools/tempo.mjs) converts the same way.
 */
export function wordBeatFactor(beat:number){return beat>=1?1/beat:1.5**Math.log2(1/beat)}

export type TempoSection={measure:number;quarter:number;beat:number;
  /** Set when the speed comes from a word alone (no number in that bar): the word, shown as the number's label. */
  word?:string};

/**
 * Tempo sections with words filled in where no number is printed (TEMPO-RULE.md). `numbered` are the bars with a
 * number (a metronome mark or a <sound tempo>), which always win. `bars` has one entry per measure: its tempo words
 * joined, its beat in quarter notes, and whether it carries a number. `openingTempo` is the catalog's suggestion
 * for the opening (in the opening beat): it replaces the table for a word in the first three bars.
 */
/** Gradual changes, English, Italian and French: an "a tempo" after one of these only ends it (the ramp's job). */
const RAMP=/(^|\s)(rit|ritard|ritardando|ritardan|riten|ritenuto|rall|rallentando|allarg|allargando|accel|accelerando|string|stringendo|stretto|retenu|retenez|cédez|retenant|pressez|animant|serrant)\.*(\s|$)/i;

export function withWordTempos(numbered:TempoSection[],bars:{words:string;beat:number;numbered:boolean}[],openingTempo?:number):TempoSection[]{
  const sections:TempoSection[]=[],byWord=new Map<string,number>();
  let current:TempoSection|null=null,beforeRelative:TempoSection|null=null,rampSince=false;
  bars.forEach((bar,i)=>{
    // Before the bar's own marking: "un poco rit. a tempo." ends its own rit., not the section.
    if(RAMP.test(bar.words))rampSince=true;
    const measure=i+1,printed=numbered.find(section=>section.measure===measure);
    if(printed){sections.push(printed);current=printed;beforeRelative=null;return}
    if(bar.numbered)return;
    const said=wordTempo(bar.words);if(!said)return;
    let quarter:number|null=null;
    if(said.kind==="speed"){
      const known=byWord.get(said.key);
      quarter=known??(!current&&measure<=3&&openingTempo&&openingTempo>0?openingTempo*bar.beat:clampTempo(said.bpm*wordBeatFactor(bar.beat))*bar.beat);
      byWord.set(said.key,quarter);beforeRelative=null;
    }else if(said.kind==="relative"&&current){
      const from:TempoSection=current;
      quarter=clampTempo(from.quarter/bar.beat*said.factor)*bar.beat;
      beforeRelative=beforeRelative??from;rampSince=false;
    }else if(said.kind==="primo"&&sections.length){quarter=sections[0].quarter;beforeRelative=null}
    else if(said.kind==="return"&&beforeRelative&&!rampSince){quarter=beforeRelative.quarter;beforeRelative=null}
    if(said.kind==="return")rampSince=false;
    if(quarter===null)return;
    const was:TempoSection|null=current;
    if(was&&Math.abs(was.quarter-quarter)<.5&&was.beat===bar.beat)return;
    const section={measure,quarter,beat:bar.beat,word:said.label};
    sections.push(section);current=section;
  });
  return sections;
}
