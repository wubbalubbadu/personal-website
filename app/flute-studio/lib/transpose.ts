/**
 * Transposing a piece: the MusicXML is rewritten before OSMD reads it, so everything downstream (the engraving,
 * playback, the drone, fingerings on tap, pitch targets, close-up, the PDF) reads the transposed notes without
 * knowing a transposition happened.
 *
 * Why not OSMD's own TransposeCalculator: it shifts OSMD's in-memory notes only. The reader also reads the raw XML
 * (score facts, close-up's guide, the accompaniment), so a transposition there would leave those in the old key.
 *
 * Spelling: a transposition is a key-to-key move (C major to E♭ major), so every note keeps its letter relationship
 * and the new key signature is the one a musician would write. The target key is the spelling with fewer sharps or
 * flats (D♭ major, not C♯ major). A double sharp or double flat that the move produces is rewritten as the simpler
 * note (F𝄪 becomes G); E♯, B♯, C♭ and F♭ stay when the key calls for them.
 */

export type KeySig={fifths:number;mode:"major"|"minor"};
/** One transposition, as a move along the circle of fifths (spelling) plus semitones (sound). */
export type TransposePlan={fifths:number;steps:number;semitones:number};
/** Saved per piece: semitones from the written key (-6 to 6) and an octave shift (-1, 0, 1). */
export type Transposition={semitones:number;octave:number};

const LETTERS=["C","D","E","F","G","A","B"];
const NATURAL=[0,2,4,5,7,9,11];
const mod=(n:number,m:number)=>((n%m)+m)%m;

/** The written key: the first key signature in the piece (C major when there is none). */
export function readKey(xml:string):KeySig{
  const key=xml.match(/<key\b[^>]*>([\s\S]*?)<\/key>/)?.[1]??"";
  const fifths=Number(key.match(/<fifths>\s*(-?\d+)\s*<\/fifths>/)?.[1]??0);
  return {fifths,mode:/<mode>\s*minor\s*<\/mode>/.test(key)?"minor":"major"};
}

/** The key `semitones` away, spelled with the fewest sharps or flats (a tie keeps the written key's side). */
export function targetFifths(from:number,semitones:number){
  let best=from,score=Infinity;
  for(let f=-7;f<=7;f++){
    if(mod(7*(f-from),12)!==mod(semitones,12))continue;
    const s=Math.abs(f)+(Math.sign(f)!==0&&Math.sign(f)!==Math.sign(from||1)?.5:0);
    if(s<score){score=s;best=f}
  }
  return best;
}

/** Letter steps that go with a fifths move, nearest to the size of the move in semitones. */
function stepsFor(fifths:number,semitones:number){
  const want=semitones*7/12,base=mod(4*fifths,7);
  let best=base,gap=Infinity;
  for(let d=base-14;d<=base+14;d+=7)if(Math.abs(d-want)<gap){gap=Math.abs(d-want);best=d}
  return best;
}

export function planFor(written:KeySig,move:Transposition):TransposePlan{
  const fifths=targetFifths(written.fifths,move.semitones)-written.fifths;
  return {fifths,steps:stepsFor(fifths,move.semitones)+7*move.octave,semitones:move.semitones+12*move.octave};
}

const MAJOR=["C♭","G♭","D♭","A♭","E♭","B♭","F","C","G","D","A","E","B","F♯","C♯"];
const MINOR=["A♭","E♭","B♭","F","C","G","D","A","E","B","F♯","C♯","G♯","D♯","A♯"];
function oneKey(fifths:number,mode:"major"|"minor",zh:boolean){
  const tonic=(mode==="minor"?MINOR:MAJOR)[fifths+7]??"C";
  if(zh)return mode==="minor"?`${tonic.toLowerCase()}小调`:`${tonic}大调`;
  return `${tonic} ${mode}`;
}
/**
 * The key a signature stands for, with its relative ("D♭ major / B♭ minor"): MusicXML's <mode> is often left as
 * major on minor pieces, so the signature alone is what can be trusted. The written mode goes first.
 */
export function keyName(key:KeySig,zh=false){
  const other=key.mode==="minor"?"major":"minor";
  return `${oneKey(key.fifths,key.mode,zh)} / ${oneKey(key.fifths,other,zh)}`;
}
export function transposedKey(written:KeySig,move:Transposition):KeySig{
  return {fifths:targetFifths(written.fifths,move.semitones),mode:written.mode};
}

const INTERVALS=["","a half step","a whole step","a minor third","a major third","a perfect fourth","a tritone"];
const INTERVALS_ZH=["","小二度","大二度","小三度","大三度","纯四度","三全音"];
/** "Up a minor third", "Down a whole step, an octave higher" */
export function moveName(move:Transposition,zh=false){
  const parts:string[]=[],size=Math.abs(move.semitones);
  if(size)parts.push(zh?`${move.semitones>0?"升高":"降低"}${INTERVALS_ZH[size]}`:`${move.semitones>0?"Up":"Down"} ${INTERVALS[size]}`);
  if(move.octave)parts.push(zh?(move.octave>0?"高八度":"低八度"):(move.octave>0?"an octave higher":"an octave lower"));
  if(!parts.length)return zh?"原调":"Original key";
  const text=parts.join(zh?"，":", ");
  return zh?text:text[0].toUpperCase()+text.slice(1);
}

type Spelled={step:string;alter:number;octave:number};
const midiOf=(p:Spelled)=>(p.octave+1)*12+NATURAL[LETTERS.indexOf(p.step)]+p.alter;

/**
 * One note moved by the plan. A double sharp or flat comes back as the plainer neighbour, and so does an E♯, B♯,
 * C♭ or F♭ the key signature doesn't call for (`keyFifths`): a student reads C more easily than an accidental B♯.
 */
export function movePitch(p:Spelled,plan:TransposePlan,keyFifths?:number):Spelled{
  const index=LETTERS.indexOf(p.step)+7*p.octave+plan.steps,midi=midiOf(p)+plan.semitones;
  const spell=(i:number):Spelled=>{const step=LETTERS[mod(i,7)],octave=Math.floor(i/7);return {step,octave,alter:0};};
  const at=(i:number)=>{const s=spell(i);s.alter=midi-midiOf(s);return s};
  const moved=at(index);
  const awkward=Math.abs(moved.alter)>=2||(keyFifths!==undefined&&keyAlter(keyFifths,moved.step)!==moved.alter&&(moved.alter===1&&"EB".includes(moved.step)||moved.alter===-1&&"CF".includes(moved.step)));
  if(!awkward)return moved;
  const other=at(index+Math.sign(moved.alter));
  return Math.abs(other.alter)<Math.abs(moved.alter)||Math.abs(moved.alter)===1&&other.alter===0?other:moved;
}

const ACCIDENTAL:Record<number,string>={"-2":"flat-flat","-1":"flat",0:"natural",1:"sharp",2:"double-sharp"};
const SYMBOL:Record<number,string>={"-2":"𝄫","-1":"♭",0:"",1:"♯",2:"𝄪"};
/** The alteration a key signature gives a letter. */
function keyAlter(fifths:number,step:string){
  const sharps="FCGDAEB",flats="BEADGCF";
  if(fifths>0)return sharps.indexOf(step)<fifths?1:0;
  if(fifths<0)return flats.indexOf(step)< -fifths?-1:0;
  return 0;
}

/** A pitch name the reader uses elsewhere ("E♭5", "C♯6") moved by the plan. */
export function movePitchName(name:string,plan:TransposePlan){
  const m=name.match(/^([A-G])(𝄪|𝄫|♯|♭|#|b)?(-?\d+)$/);if(!m)return name;
  const alter={"𝄪":2,"𝄫":-2,"♯":1,"#":1,"♭":-1,"b":-1}[m[2]??""]??0;
  const p=movePitch({step:m[1],alter,octave:Number(m[3])},plan);
  return `${p.step}${SYMBOL[p.alter]??""}${p.octave}`;
}

const text=(parent:Element,tag:string)=>parent.getElementsByTagName(tag)[0]?.textContent?.trim()??"";
function setChild(doc:Document,parent:Element,tag:string,value:string|null,before?:Element|null){
  let child=parent.getElementsByTagName(tag)[0]??null;
  if(value===null){child?.remove();return}
  if(!child){child=doc.createElement(tag);parent.insertBefore(child,before??null)}
  child.textContent=value;
}

/**
 * The whole score moved by the plan, plus its lowest and highest sounding pitch (MIDI) for the range check.
 * Key signatures shift with it; a later key change that would need more than seven sharps or flats is written
 * enharmonically (G♯ major as A♭ major) and its notes are spelled to match.
 */
export function transposeXml(xml:string,plan:TransposePlan){
  const doc=new DOMParser().parseFromString(xml,"application/xml");
  if(doc.getElementsByTagName("parsererror").length)return {xml,low:null as number|null,high:null as number|null,lowName:"",highName:""};
  let low:number|null=null,high:null|number=null,lowName="",highName="";
  for(const part of Array.from(doc.getElementsByTagName("part"))){
    let local=plan,fifths=0,written=0;
    for(const node of Array.from(part.getElementsByTagName("*"))){
      if(node.tagName==="key"){
        const f=node.getElementsByTagName("fifths")[0];if(!f)continue;
        const from=Number(f.textContent);let to=from+plan.fifths;
        // Past seven sharps or flats: the enharmonic key, with the notes spelled a letter over to match.
        if(to>7)to-=12;else if(to< -7)to+=12;
        const shift=to-from-plan.fifths;
        local={...plan,fifths:plan.fifths+shift,steps:plan.steps+(shift?(shift>0?-1:1):0)};
        f.textContent=String(to);fifths=to;written=from;
        continue;
      }
      if(node.tagName!=="note")continue;
      const pitch=node.getElementsByTagName("pitch")[0];if(!pitch)continue;
      const before:Spelled={step:text(pitch,"step"),alter:Number(text(pitch,"alter")||0),octave:Number(text(pitch,"octave"))};
      if(!LETTERS.includes(before.step)||!Number.isFinite(before.octave))continue;
      const after=movePitch(before,local,fifths);
      setChild(doc,pitch,"step",after.step,pitch.getElementsByTagName("alter")[0]??pitch.getElementsByTagName("octave")[0]);
      setChild(doc,pitch,"alter",after.alter?String(after.alter):null,pitch.getElementsByTagName("octave")[0]);
      setChild(doc,pitch,"octave",String(after.octave));
      const midi=midiOf(after),name=`${after.step}${SYMBOL[after.alter]??""}${after.octave}`;
      if(low===null||midi<low){low=midi;lowName=name}
      if(high===null||midi>high){high=midi;highName=name}
      // A printed accidental shows the new alteration. A note respelled away from its letter gets one when the
      // key does not already give it.
      const printed=node.getElementsByTagName("accidental")[0];
      const respelled=mod(LETTERS.indexOf(after.step)-LETTERS.indexOf(before.step)-local.steps,7)!==0;
      if(printed)printed.textContent=ACCIDENTAL[after.alter]??printed.textContent;
      else if(respelled&&after.alter!==keyAlter(fifths,after.step)){
        const mark=doc.createElement("accidental");mark.textContent=ACCIDENTAL[after.alter]??"natural";
        const anchor=["time-modification","stem","notehead","staff","beam","notations","lyric","play"].map(tag=>node.getElementsByTagName(tag)[0]).find(Boolean)??null;
        node.insertBefore(mark,anchor);
      }
      // A trill's upper note is the next letter up, altered by its printed accidental or else by the key: move it
      // too, and print the accidental whenever the new key would not give it.
      const trill=node.getElementsByTagName("trill-mark")[0];
      if(trill){
        const ornaments=trill.parentElement!,mark=ornaments.getElementsByTagName("accidental-mark")[0]??null;
        const upperStep=LETTERS[mod(LETTERS.indexOf(before.step)+1,7)];
        const upperAlter=mark?({"sharp":1,"flat":-1,"natural":0,"double-sharp":2,"sharp-sharp":2,"flat-flat":-2} as Record<string,number>)[mark.textContent?.trim()??""]??0:keyAlter(written,upperStep);
        const upper=movePitch({step:upperStep,alter:upperAlter,octave:before.octave+(upperStep==="C"?1:0)},local);
        if(mark)mark.textContent=ACCIDENTAL[upper.alter]??"natural";
        else if(upper.alter!==keyAlter(fifths,upper.step)){const added=doc.createElement("accidental-mark");added.textContent=ACCIDENTAL[upper.alter]??"natural";ornaments.insertBefore(added,trill.nextSibling)}
      }
    }
  }
  return {xml:new XMLSerializer().serializeToString(doc),low,high,lowName,highName};
}

/** The flute's written range: C4 to D7, B3 with a B foot. */
export const FLUTE_LOW=60,FLUTE_HIGH=98,B_FOOT_LOW=59;
