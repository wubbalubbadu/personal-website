/**
 * The pitch tendency test, minus the UI: which notes to play and in what
 * order, how to read a note from the mic, which notes need another go, and
 * what the results mean.
 *
 * One pass is the chromatic scale up and back down, so every note is heard
 * twice, once approached from below and once from above. A note whose two
 * readings disagree by more than DISAGREE_CENTS, or that never settled, is
 * asked for again at the end.
 *
 * Results are read relative to the player's own tuning: most flutes and
 * players sit a little sharp or flat overall, so the median of every note is
 * taken as "your tuning" and each note is shown against that. The raw values
 * against A = 440 are kept too.
 */

const SHARPS=["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"];
const FLATS=["C","D♭","D","E♭","E","F","G♭","G","A♭","A","B♭","B"];

/** Low B (B3) to high D (D7), the range the picker allows. */
export const LOWEST=59,HIGHEST=98;
/** Low C to high C: every flute has it, so it is the default. */
export const DEFAULT_RANGE:[number,number]=[60,96];

/** A note's name, sharps going up and flats coming down, as a chromatic scale is written. */
export function spell(midi:number,rising=true){
  return `${(rising?SHARPS:FLATS)[((midi%12)+12)%12]}${Math.floor(midi/12)-1}`;
}

/** Up the range and back down again, without repeating the top note. */
export function passSequence(low:number,high:number){
  const up=Array.from({length:high-low+1},(_,i)=>low+i);
  return [...up.map(midi=>({midi,rising:true})),...up.slice(0,-1).reverse().map(midi=>({midi,rising:false}))];
}

/**
 * 1.5 s a note in all. The first half second is the attack, while the pitch
 * is still finding its place, so it is not measured; the reading is the
 * settled second after it.
 */
export const SETTLE_MS=500;
export const HOLD_MS=1000;
/** Give up on a note after this long and ask for it again at the end. */
export const GIVE_UP_MS=9000;
/** Two readings of one note further apart than this ask for a third. */
export const DISAGREE_CENTS=15;

export const centsFrom=(hz:number,midi:number)=>1200*Math.log2(hz/(440*2**((midi-69)/12)));
export function median(values:number[]){
  if(!values.length)return 0;
  const sorted=[...values].sort((a,b)=>a-b),mid=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;
}

/** Readings per note (cents against A = 440). */
export type Readings=Record<number,number[]>;

/** Notes with fewer than two readings, or two that disagree. */
export function needsAnotherGo(readings:Readings,low:number,high:number){
  const out:number[]=[];
  for(let midi=low;midi<=high;midi++){
    const r=readings[midi]??[];
    if(r.length<2||(r.length===2&&Math.abs(r[0]-r[1])>DISAGREE_CENTS))out.push(midi);
  }
  return out;
}

export type TestResult={
  id:string;date:string;low:number;high:number;
  /** Median cents of each note, against A = 440. */
  raw:Record<number,number>;
  /** Your tuning: the median of every note. */
  offset:number;
};

export function buildResult(readings:Readings,low:number,high:number):TestResult{
  const raw:Record<number,number>={};
  for(let midi=low;midi<=high;midi++){const r=readings[midi];if(r?.length)raw[midi]=Math.round(median(r))}
  const offset=Math.round(median(Object.values(raw)));
  return {id:String(Date.now()),date:new Date().toISOString(),low,high,raw,offset};
}

/** The heat map's column names. */
export const MAP_NAMES=["C","C♯","D","E♭","E","F","F♯","G","A♭","A","B♭","B"];

/** A note counts as off, relative to your tuning, past this many cents. */
export const OFF_CENTS=8;

/** The plain summary under the map: overall tuning, then the notes that stand out. */
export function summary(result:TestResult,zh:boolean){
  const lines:string[]=[];
  const o=result.offset;
  if(Math.abs(o)>=5)lines.push(zh
    ?`整体偏${o>0?"高":"低"} ${Math.abs(o)} 音分。把头管${o>0?"往外拉":"往里推"}一点。`
    :`Overall you're ${Math.abs(o)}¢ ${o>0?"sharp":"flat"}. ${o>0?"Pull the headjoint out":"Push the headjoint in"} a little.`);
  else lines.push(zh?"整体音准很好。":"Your overall tuning is right on.");
  const rel=Object.entries(result.raw).map(([m,c])=>({midi:Number(m),rel:c-o}));
  // Named the way the heat map's columns are (C♯, E♭, F♯, A♭, B♭), so the
  // summary and the map agree.
  const pick=(side:number)=>rel.filter(n=>side*n.rel>=OFF_CENTS).sort((a,b)=>side*(b.rel-a.rel)).slice(0,4).map(n=>`${MAP_NAMES[n.midi%12]}${Math.floor(n.midi/12)-1} ${n.rel>0?"+":"−"}${Math.abs(n.rel)}`);
  const sharp=pick(1),flat=pick(-1);
  if(sharp.length)lines.push(zh?`相对你的调音，偏高：${sharp.join("、")}。`:`Relative to your tuning, sharp: ${sharp.join(", ")}.`);
  if(flat.length)lines.push(zh?`相对你的调音，偏低：${flat.join("、")}。`:`Relative to your tuning, flat: ${flat.join(", ")}.`);
  if(!sharp.length&&!flat.length)lines.push(zh?"每个音都和你的调音很接近。":"Every note sits close to your tuning.");
  return lines;
}

const KEY="cookie:tendency-tests:v1";
export const TESTS_UPDATED="cookie:tendency-tests";
export function readTests():TestResult[]{
  try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?v:[]}catch{return []}
}
export function saveTest(result:TestResult){
  const tests=[result,...readTests()].slice(0,20);
  try{localStorage.setItem(KEY,JSON.stringify(tests))}catch{/* storage may be disabled */}
  window.dispatchEvent(new Event(TESTS_UPDATED));
}
