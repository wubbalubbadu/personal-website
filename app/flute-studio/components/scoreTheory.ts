/**
 * What the "Musical terms" layer says about a score, worked out from the
 * score itself.
 *
 * Scale Studio already did this for its key signatures ("three flats: B♭,
 * E♭ and A♭"); repertoire got the textbook definition, the same sentence
 * for every piece. Both readers go through ScoreViewer, so the facts come
 * from the one thing they share, the MusicXML, read measure by measure:
 * a scale book changes key every few lines and a piece can change meter,
 * and the answer has to be about the measure you tapped.
 */

export type MeasureFacts={fifths:number;mode:string|null;beats:number;beatType:number;symbol:string|null;
  /** Written pitches in this measure as letter+alter, e.g. "B0", "F1", "E-1". */
  pitches:string[];
  /** This measure writes its own <key>, even an unchanged one: where a scale book's next exercise begins. */
  keyWritten:boolean};
export type MetronomeFacts={measure:number;unit:string;dotted:boolean;perMinute:number;parentheses:boolean;
  /** Tempo words written in the same direction ("Allegro assai"), which is how the two find each other on the page. */
  words:string|null};
export type ScoreFacts={
  /** One entry per measure of the first part, attributes carried forward. Index 0 is measure 1. */
  measures:MeasureFacts[];
  metronomes:MetronomeFacts[];
  /** The last written pitch, e.g. "D" or "F♯". Evidence for the key, not proof. */
  lastPitch:string|null;
  /** Every metronome mark shares its direction with tempo words above the staff, so the two can go on one line. */
  tempoWordsWithMetronome:boolean;
};

const ALTER_SIGN:Record<string,string>={"-2":"𝄫","-1":"♭","0":"","1":"♯","2":"𝄪"};

export function readScoreFacts(xml:string):ScoreFacts{
  const doc=new DOMParser().parseFromString(xml,"application/xml");
  const part=doc.querySelector("part");
  const measures:MeasureFacts[]=[];
  const metronomes:MetronomeFacts[]=[];
  let current:MeasureFacts={fifths:0,mode:null,beats:4,beatType:4,symbol:null,pitches:[],keyWritten:false};
  let lastPitch:string|null=null;
  part?.querySelectorAll(":scope > measure").forEach(measure=>{
    const key=measure.querySelector("attributes key");
    const time=measure.querySelector("attributes time");
    current={...current,pitches:[],keyWritten:!!key};
    if(key){
      current.fifths=Number(key.querySelector("fifths")?.textContent??0)||0;
      current.mode=key.querySelector("mode")?.textContent?.trim().toLowerCase()||null;
    }
    if(time){
      current.beats=Number(time.querySelector("beats")?.textContent)||current.beats;
      current.beatType=Number(time.querySelector("beat-type")?.textContent)||current.beatType;
      current.symbol=time.getAttribute("symbol");
    }
    measures.push(current);
    measure.querySelectorAll("direction metronome").forEach(mark=>{
      const perMinute=Number(mark.querySelector("per-minute")?.textContent);
      if(!(perMinute>0))return;
      metronomes.push({measure:measures.length,unit:mark.querySelector("beat-unit")?.textContent?.trim()??"quarter",dotted:!!mark.querySelector("beat-unit-dot"),perMinute,parentheses:mark.getAttribute("parentheses")==="yes",
        words:[...(mark.closest("direction")?.querySelectorAll("words")??[])].map(node=>node.textContent?.trim()).filter(Boolean).join(" ")||null});
    });
    measure.querySelectorAll("note pitch").forEach(pitch=>{
      current.pitches.push(`${pitch.querySelector("step")?.textContent??""}${Number(pitch.querySelector("alter")?.textContent??0)||0}`);
      lastPitch=`${pitch.querySelector("step")?.textContent??""}${ALTER_SIGN[pitch.querySelector("alter")?.textContent?.trim()??"0"]??""}`;
    });
  });
  const marked=[...doc.querySelectorAll("direction")].filter(direction=>direction.querySelector("metronome"));
  const tempoWordsWithMetronome=marked.length>0&&marked.every(direction=>direction.querySelector("words")&&direction.getAttribute("placement")!=="below");
  return {measures,metronomes,lastPitch,tempoWordsWithMetronome};
}

/* ------------------------------------------------------------ keys */

/** Major and relative-minor keys by number of sharps, then by number of flats. */
const SHARP_KEYS=[["C","A"],["G","E"],["D","B"],["A","F♯"],["E","C♯"],["B","G♯"],["F♯","D♯"],["C♯","A♯"]];
const FLAT_KEYS=[["C","A"],["F","D"],["B♭","G"],["E♭","C"],["A♭","F"],["D♭","B♭"],["G♭","E♭"],["C♭","A♭"]];
/** Key signatures add their accidentals in a fixed order. */
const SHARP_ORDER=["F♯","C♯","G♯","D♯","A♯","E♯","B♯"];
const FLAT_ORDER=["B♭","E♭","A♭","D♭","G♭","C♭","F♭"];
const LETTERS=["C","D","E","F","G","A","B"];

const listNotes=(notes:string[])=>notes.length===1?notes[0]:`${notes.slice(0,-1).join(", ")} and ${notes[notes.length-1]}`;

/**
 * The note a minor key raises with an accidental: its 7th, one step above
 * what the signature gives. B minor's A becomes A♯, C minor's B♭ becomes
 * B♮, G♯ minor's F♯ becomes F𝄪. The signature never shows it, which is
 * exactly why it is worth pointing out, but only where the music really
 * writes it: a natural minor scale never does.
 */
function raisedSeventh(tonic:string,signature:string[]){
  const letter=LETTERS[(LETTERS.indexOf(tonic[0])+6)%7];
  const inKey=signature.find(note=>note[0]===letter);
  const alter=inKey?.endsWith("♯")?2:inKey?.endsWith("♭")?0:1;
  return {spelled:`${letter}${ALTER_SIGN[String(alter)]||"♮"}`,written:`${letter}${alter}`};
}

/**
 * What a key signature says, from its fifths and (when the file has one)
 * its mode.
 *
 * The same sharps serve a major key and its relative minor, and most
 * MusicXML files do not say which one is meant. Naming one anyway would be
 * a confident guess, so without a mode the answer is both, plus what the
 * score itself offers as evidence: the note it ends on, which is usually
 * home. That is phrased as a pointer, not a verdict.
 */
export function keySignatureFromFifths(fifths:number,mode:string|null,lastPitch:string|null,upcoming:MeasureFacts[]=[]){
  const count=Math.min(7,Math.abs(fifths));
  const flats=fifths<0;
  const altered=(flats?FLAT_ORDER:SHARP_ORDER).slice(0,count);
  const [major,minor]=(flats?FLAT_KEYS:SHARP_KEYS)[count];
  const every=count?`Every ${listNotes(altered)} is ${flats?"flattened":"sharpened"} for the rest of the line, unless an accidental changes one.`
    :"No note is sharped or flatted unless an accidental says so.";
  if(mode==="major")return {title:`Key signature: ${major} major`,text:every};
  if(mode==="minor"){
    const seventh=raisedSeventh(minor,altered);
    const written=upcoming.some(measure=>measure.pitches.includes(seventh.written));
    return {title:`Key signature: ${minor} minor`,text:written?`${every} Watch for ${seventh.spelled}: minor keys raise the 7th note with an accidental, and the signature does not show it.`:every};
  }
  const hint=lastPitch===major?` The music ends on ${major}, which points to ${major} major.`
    :lastPitch===minor?` The music ends on ${minor}, which points to ${minor} minor.`:"";
  return {title:"Key signature",text:`${major} major or ${minor} minor: the signature is the same for both.${hint} ${every}`};
}

/**
 * The older path, for when all a host passes is the list of altered notes
 * (Scale Studio's per-note signatures). Only names a key when the list
 * really is the first n of the standard order: naming a key off a list
 * that is not a key signature would state a confident wrong fact.
 */
export function keySignatureFromNotes(raw:string[]){
  const altered=[...new Set(raw)];
  if(!altered.length)return "None, so C major or A minor. No note is sharped or flatted unless an accidental says so.";
  const flats=altered.some(note=>note.includes("♭"));
  const order=flats?FLAT_ORDER:SHARP_ORDER;
  const sorted=[...altered].sort((a,b)=>order.indexOf(a)-order.indexOf(b));
  const canonical=sorted.every((note,index)=>note===order[index]);
  if(!canonical)return `Every ${listNotes(sorted)} is ${flats?"flattened":"sharpened"} here, unless an accidental changes one.`;
  const pair=(flats?FLAT_KEYS:SHARP_KEYS)[sorted.length];
  return `${pair[0]} major or ${pair[1]} minor. Every ${listNotes(sorted)} is ${flats?"flattened":"sharpened"} for the rest of the line, unless an accidental changes one.`;
}

/* ------------------------------------------------------------ meter */

const NOTE_VALUE:Record<number,string>={1:"whole",2:"half",4:"quarter",8:"eighth",16:"sixteenth",32:"32nd"};
const valueName=(beatType:number)=>NOTE_VALUE[beatType]??`1/${beatType}`;

/**
 * The time signature of the measure it sits on. 2/2 and 4/4 hold the same
 * notes per bar and differ only in where the beat is, which is the thing
 * a generic "top number, bottom number" sentence never gets to.
 */
export function timeSignatureText({beats,beatType,symbol}:MeasureFacts){
  const fraction=`${beats}/${beatType}`;
  if(symbol==="cut"||(beats===2&&beatType===2))return {title:symbol==="cut"?"Cut time (2/2)":"Time signature: 2/2",
    text:"Two beats in each measure, and the half note gets the beat. The bar holds the same notes as 4/4, but you count and feel it in 2: one beat per half note."};
  if(symbol==="common"||(beats===4&&beatType===4))return {title:symbol==="common"?"Common time (4/4)":"Time signature: 4/4",
    text:"Four beats in each measure, and the quarter note gets the beat."};
  // 6/8, 9/8, 12/8: the beat is three of the bottom value grouped together.
  if(beats%3===0&&beats>3&&beatType>=8){
    const felt=beats/3,dotted=valueName(beatType/2);
    return {title:`Time signature: ${fraction}`,text:`${beats} ${valueName(beatType)} notes in each measure, grouped in threes, so you feel ${felt} beats of a dotted ${dotted} each.`};
  }
  return {title:`Time signature: ${fraction}`,text:`${beats===1?"One beat":`${beats} beats`} in each measure, and the ${valueName(beatType)} note gets the beat.`};
}

/* ------------------------------------------------------------ tempo */

/** How many written beat units make one felt beat in this meter. */
function unitsPerFeltBeat(unit:string,dotted:boolean,{beats,beatType,symbol}:MeasureFacts){
  const unitLength=(1/({whole:1,half:2,quarter:4,eighth:8,"16th":16}[unit]??4))*(dotted?1.5:1);
  const compound=beats%3===0&&beats>3&&beatType>=8;
  const beatLength=compound?3/beatType:symbol==="cut"?1/2:1/beatType;
  return beatLength/unitLength;
}

export function metronomeText(mark:MetronomeFacts|undefined,meter:MeasureFacts|undefined,fallback:string){
  if(!mark)return {title:"Metronome mark",text:`${fallback.trim().replace(/^=\s*/,"")} beats per minute. Set the metronome to this number to hear the intended speed.`};
  const unit=`${mark.dotted?"dotted ":""}${mark.unit==="16th"?"sixteenth":mark.unit}`;
  let text=`${mark.perMinute} ${unit} notes per minute.`;
  if(meter){
    const ratio=unitsPerFeltBeat(mark.unit,mark.dotted,meter);
    // Only when it comes out whole: "72 beats" is useful, "48.67" is not.
    if(ratio>1&&Number.isInteger(mark.perMinute/ratio)){
      const feltBeat=meter.symbol==="cut"||(meter.beats===2&&meter.beatType===2)?"half note":`dotted ${valueName(meter.beatType/2)}`;
      text+=` In ${meter.symbol==="cut"?"cut time":`${meter.beats}/${meter.beatType}`} the ${feltBeat} is the beat, so you feel ${mark.perMinute/ratio} beats per minute.`;
    }
  }
  if(mark.parentheses)text+=" The parentheses mean it is a suggested speed, often added by an editor.";
  return {title:"Metronome mark",text};
}

type Term={meaning:string;bpm?:[number,number]};
/**
 * Common Italian (and a few French and German) performance words. BPM
 * ranges are the usual textbook ones: a starting point, since the same
 * word runs faster in one era and slower in another.
 * Multi-word entries come first so "con brio" wins over "con".
 */
const TERMS:Record<string,Term>={
  "ma non troppo":{meaning:"but not too much"},
  "non troppo":{meaning:"not too much"},
  "poco a poco":{meaning:"little by little"},
  "con brio":{meaning:"with spirit and fire"},
  "con moto":{meaning:"with motion, keep it moving"},
  "a tempo":{meaning:"back to the main speed"},
  "tempo primo":{meaning:"back to the opening speed"},
  "tempo i":{meaning:"back to the opening speed"},
  "sotto voce":{meaning:"in an undertone, very quietly"},
  "da capo":{meaning:"go back to the beginning"},
  "dal segno":{meaning:"go back to the sign 𝄋"},
  "al fine":{meaning:"and play until Fine"},
  "al coda":{meaning:"and then jump to the Coda"},
  grave:{meaning:"very slow and solemn",bpm:[25,45]},
  largo:{meaning:"broad and slow",bpm:[40,60]},
  lento:{meaning:"slow",bpm:[45,60]},
  larghetto:{meaning:"rather broad, a little faster than largo",bpm:[60,66]},
  adagio:{meaning:"slow and at ease",bpm:[66,76]},
  andante:{meaning:"at a walking pace",bpm:[76,108]},
  andantino:{meaning:"a little quicker than andante",bpm:[80,108]},
  moderato:{meaning:"at a moderate speed",bpm:[108,120]},
  allegretto:{meaning:"moderately fast, lighter than allegro",bpm:[100,128]},
  allegro:{meaning:"fast and bright",bpm:[120,156]},
  vivace:{meaning:"lively and fast",bpm:[156,176]},
  vivo:{meaning:"lively",bpm:[156,176]},
  presto:{meaning:"very fast",bpm:[168,200]},
  prestissimo:{meaning:"as fast as possible",bpm:[200,240]},
  assai:{meaning:"very"},
  molto:{meaning:"very, much"},
  poco:{meaning:"a little"},
  più:{meaning:"more"},
  meno:{meaning:"less"},
  sempre:{meaning:"always, keep doing it"},
  subito:{meaning:"suddenly"},
  simile:{meaning:"keep going in the same way"},
  cantabile:{meaning:"in a singing style"},
  dolce:{meaning:"sweetly, softly"},
  dolcissimo:{meaning:"very sweetly"},
  espressivo:{meaning:"with expression"},
  "espr.":{meaning:"with expression"},
  legato:{meaning:"smoothly connected"},
  staccato:{meaning:"short and detached"},
  tenuto:{meaning:"held for its full value"},
  marcato:{meaning:"marked, accented"},
  leggiero:{meaning:"lightly"},
  pesante:{meaning:"heavily"},
  maestoso:{meaning:"majestic"},
  grazioso:{meaning:"gracefully"},
  tranquillo:{meaning:"calm"},
  animato:{meaning:"animated, with life"},
  sostenuto:{meaning:"sustained, a little held back"},
  rubato:{meaning:"flexible time: stretch and push the beat for expression"},
  ritardando:{meaning:"gradually slow down"},
  "rit.":{meaning:"gradually slow down"},
  "ritard.":{meaning:"gradually slow down"},
  rallentando:{meaning:"gradually slow down"},
  "rall.":{meaning:"gradually slow down"},
  accelerando:{meaning:"gradually speed up"},
  "accel.":{meaning:"gradually speed up"},
  crescendo:{meaning:"gradually get louder"},
  "cresc.":{meaning:"gradually get louder"},
  diminuendo:{meaning:"gradually get softer"},
  "dim.":{meaning:"gradually get softer"},
  decrescendo:{meaning:"gradually get softer"},
  "decresc.":{meaning:"gradually get softer"},
  "d.c.":{meaning:"da capo: go back to the beginning"},
  "d.s.":{meaning:"dal segno: go back to the sign 𝄋"},
  fine:{meaning:"the end, after a D.C. or D.S."},
  coda:{meaning:"the closing section"},
  con:{meaning:"with"},
  ma:{meaning:"but"},
  e:{meaning:"and"},
  // French and German, as they turn up in flute repertoire.
  lent:{meaning:"slow (French)",bpm:[45,60]},
  modéré:{meaning:"moderate (French)",bpm:[108,120]},
  vif:{meaning:"lively (French)",bpm:[156,176]},
  langsam:{meaning:"slow (German)",bpm:[45,60]},
  mässig:{meaning:"moderate (German)",bpm:[108,120]},
  schnell:{meaning:"fast (German)",bpm:[156,176]},
};
const PHRASES=Object.keys(TERMS).sort((a,b)=>b.split(" ").length-a.split(" ").length);
/** Words that only modify another term; a line made of nothing but these is not worth a tooltip. */
const CONNECTIVES=new Set(["con","ma","e","poco","molto","assai","più","meno","sempre"]);

const capitalize=(text:string)=>text[0].toUpperCase()+text.slice(1);

/**
 * A plain-English reading of a performance direction, or null when none of
 * its words are known. Each recognised word gets its meaning, and a tempo
 * word gets its usual speed, nudged by assai/molto/poco the way a player
 * would read them.
 */
export function performanceTermText(raw:string,written?:MetronomeFacts){
  const words=raw.toLowerCase().replace(/[()]/g," ").split(/\s+/).filter(Boolean);
  const found:{phrase:string;term:Term}[]=[];
  for(let i=0;i<words.length;){
    const phrase=PHRASES.find(candidate=>{const parts=candidate.split(" ");return parts.every((part,k)=>words[i+k]===part)});
    if(phrase){found.push({phrase,term:TERMS[phrase]});i+=phrase.split(" ").length}
    else i++;
  }
  if(!found.length||found.every(({phrase})=>CONNECTIVES.has(phrase)))return null;
  const lines=found.map(({phrase,term})=>`${capitalize(phrase)}: ${term.meaning}.`);
  const tempo=found.find(({term})=>term.bpm);
  if(tempo){
    const [low,high]=tempo.term.bpm!;
    const faster=words.some(word=>word==="assai"||word==="molto"),gentler=words.includes("poco")||words.includes("troppo");
    const lean=faster?" Toward the faster end, since it says very.":gentler?" Toward the middle, since it asks for restraint.":"";
    lines.push(`${capitalize(tempo.phrase)} is usually about ${low} to ${high} beats per minute.${lean}`);
    if(written){
      const where=written.perMinute<low?", slower than usual":written.perMinute>high?", faster than usual":", inside that range";
      lines.push(`This score asks for ${written.perMinute} ${written.dotted?"dotted ":""}${written.unit==="16th"?"sixteenth":written.unit} notes per minute${where}.`);
    }
  }
  return {title:raw.trim(),text:lines.join(" ")};
}

/* ------------------------------------------------------------ layout */

/**
 * OSMD always puts a metronome mark on its own line under the tempo words
 * ("Allegro assai", then "♩ = 144" beneath it), and the words then have to
 * clear it, so an opening tempo costs two lines of height above the first
 * system. Engravers write it as one line: "Allegro assai ♩ = 144".
 *
 * The fix has two halves. Before rendering, METRONOME_TUCK_SHIFT drops the
 * mark down into the staff so it stops lifting the words (OSMD sizes the
 * space above the system from where the mark sits). After rendering, this
 * moves each mark up beside its words. Only applied when every mark has
 * words to sit beside (ScoreFacts.tempoWordsWithMetronome); a lone mark is
 * left exactly where OSMD put it.
 *
 * The move is an absolute transform computed from untransformed boxes, so
 * running it twice on the same render is harmless.
 */
/**
 * OSMD writes the mark as a note glyph plus the text " = 112", but SVG drops
 * the leading space, so the "=" touched the note. Nudge the text right by
 * about a space's width. Marked done per element so a second call on the
 * same render doesn't push it further.
 */
export function spaceMetronomeMarks(root:ParentNode){
  root.querySelectorAll<SVGTextElement>(".vf-stavetempo text:not([data-spaced])").forEach(text=>{
    const x=Number(text.getAttribute("x")),size=parseFloat(text.getAttribute("font-size")??"")||14;
    if(!Number.isFinite(x))return;
    text.setAttribute("x",String(x+size*.3));
    text.setAttribute("data-spaced","");
  });
}
export const METRONOME_TUCK_SHIFT=2.4;
export function tuckMetronomeMarks(root:ParentNode){
  const words=[...root.querySelectorAll<SVGTextElement>(".vf-text:not(.measure-number) text")];
  root.querySelectorAll<SVGGElement>(".vf-stavetempo").forEach(mark=>{
    const svg=mark.ownerSVGElement;
    const figure=mark.querySelector<SVGTextElement>("text");
    if(!svg||!figure)return;
    const box=mark.getBBox();
    // The words it belongs to: in the same SVG, above it, and starting at
    // or before it horizontally. The nearest one wins.
    const owner=words.filter(text=>text.ownerSVGElement===svg).map(text=>({text,box:text.getBBox()}))
      .filter(({box:w})=>w.y+w.height<=box.y+box.height/2&&w.x<=box.x+box.width&&box.y-(w.y+w.height)<box.height*4)
      .sort((a,b)=>(b.box.y+b.box.height)-(a.box.y+a.box.height))[0];
    if(!owner)return;
    const size=parseFloat(owner.text.getAttribute("font-size")??"")||owner.box.height;
    const dx=owner.box.x+owner.box.width+size*.4-box.x;
    const dy=Number(owner.text.getAttribute("y"))-Number(figure.getAttribute("y"));
    if(Number.isFinite(dx)&&Number.isFinite(dy))mark.setAttribute("transform",`translate(${dx} ${dy})`);
  });
}
