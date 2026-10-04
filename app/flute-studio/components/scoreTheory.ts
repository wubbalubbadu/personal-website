import musicTerms from "../../../content/music-terms.json";
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
  /**
   * Where the playback speed changes, from the file's <sound tempo>: quarter
   * notes per minute, whatever the printed mark counts in (a "♩. = 120" in
   * 6/8 is 180 here). `beat` is the printed mark's beat in quarter notes
   * (1.5 for that dotted quarter), so quarter/beat is the number on the page
   * and the reader's tempo can show it. Playback converts back.
   */
  tempos:{measure:number;quarter:number;beat:number}[];
  /** Gradual tempo changes (accel., rit., rall.), where they run and toward what. */
  ramps:TempoRamp[];
};
/**
 * An accelerando or ritardando. It starts at `measure` + `at` (a fraction of
 * that bar) and reaches its end speed where bar `until` begins. `target` is
 * the next tempo mark's speed when the ramp leads into one (Arnold: accel.
 * in bar 16 into B's Vivace), otherwise null: about a quarter faster or
 * slower, held until `release` (an "a tempo") if there is one.
 */
export type TempoRamp={measure:number;at:number;kind:"accel"|"rit";until:number;target:number|null;release:number|null};

const RAMP_WORD=/(^|\s)(accel|accelerando|string|stringendo|stretto|rit|ritard|ritardando|riten|ritenuto|rall|rallentando|allarg|allargando)\.?(\s|$)/i;
const SLOWER=/(^|\s)(rit|ritard|ritardando|riten|ritenuto|rall|rallentando|allarg|allargando)\.?(\s|$)/i;
const RETURN_WORD=/\b(a tempo|tempo i|tempo primo|tempo 1)\b/i;

/** Where each accel./rit. runs, by the rules in TempoRamp and the numbered steps below. */
function readRamps(doc:Document,tempos:{measure:number;quarter:number}[]):TempoRamp[]{
  const part=doc.querySelector("part");if(!part)return [];
  const bars=[...part.querySelectorAll(":scope > measure")];
  const wordsIn=(bar:Element)=>[...bar.querySelectorAll("direction words")].map(node=>node.textContent?.trim()??"");
  const ramps:TempoRamp[]=[];
  let divisions=1,beats=4,beatType=4;
  bars.forEach((bar,i)=>{
    const measure=i+1;
    divisions=Number(bar.querySelector("attributes divisions")?.textContent)||divisions;
    beats=Number(bar.querySelector("attributes time beats")?.textContent)||beats;
    beatType=Number(bar.querySelector("attributes time beat-type")?.textContent)||beatType;
    const length=beats*(4/beatType)*divisions;
    // Walk the bar in order to know how far in each direction sits.
    let position=0;
    for(const child of [...bar.children]){
      if(child.tagName==="note"){if(!child.querySelector("chord")&&!child.querySelector("grace"))position+=Number(child.querySelector("duration")?.textContent)||0;continue}
      if(child.tagName==="backup"){position-=Number(child.querySelector("duration")?.textContent)||0;continue}
      if(child.tagName==="forward"){position+=Number(child.querySelector("duration")?.textContent)||0;continue}
      if(child.tagName!=="direction")continue;
      const text=[...child.querySelectorAll("words")].map(node=>node.textContent??"").join(" ");
      if(!RAMP_WORD.test(text))continue;
      const kind=SLOWER.test(text)?"rit":"accel",cap=kind==="accel"?8:4;
      let until:number|null=null,target:number|null=null;
      // 1. A dashed line after the word ends where the dashes stop.
      if(child.querySelector('dashes[type="start"]'))for(let k=i;k<bars.length&&until===null;k++)if(bars[k].querySelector('direction dashes[type="stop"]'))until=k+2;
      // 2. A tempo mark soon after: end there, aiming at its speed when it lies the right way.
      const nextMark=tempos.find(tempo=>tempo.measure>measure);
      const current=[...tempos].reverse().find(tempo=>tempo.measure<=measure);
      if(until===null&&nextMark&&nextMark.measure-measure<=cap){
        until=nextMark.measure;
        if(current&&(kind==="accel"?nextMark.quarter>current.quarter:nextMark.quarter<current.quarter))target=nextMark.quarter;
      }
      // 3. Otherwise "a tempo", a rehearsal mark or a double barline.
      if(until===null)for(let k=i+1;k<bars.length&&k-i<=cap;k++){
        const next=bars[k];
        if(wordsIn(next).some(word=>RETURN_WORD.test(word))||next.querySelector("direction rehearsal")){until=k+1;break}
        if(bars[k-1].querySelector('barline bar-style')?.textContent?.match(/light-light|light-heavy/)){until=k+1;break}
      }
      // 4. Otherwise a short default.
      if(until===null)until=Math.min(bars.length+1,measure+(kind==="accel"?4:2));
      let release:number|null=null;
      if(target===null)for(let k=until-1;k<bars.length;k++){if(wordsIn(bars[k]).some(word=>RETURN_WORD.test(word))){release=k+1;break}if(tempos.some(tempo=>tempo.measure===k+1&&k+1>measure))break}
      ramps.push({measure,at:length?Math.min(.99,Math.max(0,position/length)):0,kind,until,target,release});
    }
  });
  return ramps;
}

const ALTER_SIGN:Record<string,string>={"-2":"𝄫","-1":"♭","0":"","1":"♯","2":"𝄪"};

export function readScoreFacts(xml:string):ScoreFacts{
  const doc=new DOMParser().parseFromString(xml,"application/xml");
  const part=doc.querySelector("part");
  const measures:MeasureFacts[]=[];
  const metronomes:MetronomeFacts[]=[];
  const tempos:{measure:number;quarter:number;beat:number}[]=[];
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
    const sounded=Number(measure.querySelector("sound[tempo]")?.getAttribute("tempo"));
    if(sounded>0&&sounded!==tempos.at(-1)?.quarter)tempos.push({measure:measures.length,quarter:sounded,beat:1});
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
  // Each tempo counts in its printed mark's beat; with no mark, the meter's
  // felt beat (a dotted quarter in 6/8, 9/8, 12/8, a half in cut time).
  const QUARTERS:Record<string,number>={whole:4,half:2,quarter:1,eighth:.5,"16th":.25};
  tempos.forEach(tempo=>{
    const mark=metronomes.find(m=>m.measure===tempo.measure),meter=measures[tempo.measure-1];
    if(mark)tempo.beat=(QUARTERS[mark.unit]??1)*(mark.dotted?1.5:1);
    else if(meter&&meter.beats%3===0&&meter.beats>3&&meter.beatType===8)tempo.beat=1.5;
    else if(meter&&(meter.symbol==="cut"||(meter.beats===2&&meter.beatType===2)))tempo.beat=2;
  });
  return {measures,metronomes,lastPitch,tempoWordsWithMetronome,tempos,ramps:readRamps(doc,tempos)};
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

type Term={meaning:string;/** [low, high] beats per minute. */bpm?:number[]};
/**
 * Performance words (Italian, French, German, abbreviations, dynamics) live in
 * content/music-terms.json, so the music uploader can add the ones a new
 * score uses (it lists unknown markings on convert and writes the meanings
 * you give it). BPM ranges are the usual textbook ones: a starting point,
 * since the same word runs faster in one era and slower in another. Keys are
 * lowercase; multi-word phrases win over their single words (see PHRASES).
 */
const TERMS=musicTerms as Record<string,Term>;
const PHRASES=Object.keys(TERMS).sort((a,b)=>b.split(" ").length-a.split(" ").length);
/** Words that only modify another term; a line made of nothing but these is not worth a tooltip. Scores often leave the accent off ("piu", "tres"), so both spellings are here. */
const CONNECTIVES=new Set(["con","ma","e","poco","molto","assai","più","piu","meno","sempre","un peu","très","tres","peu","sans","avec","mais"]);
/** Dynamics keep their lowercase ("pp", not "Pp"): that is how they are printed. */
const DYNAMICS=new Set(["ppp","pp","p","mp","mf","f","ff","fff","sf","sfz","fp"]);

const capitalize=(text:string)=>text[0].toUpperCase()+text.slice(1);

/**
 * A plain-English reading of a performance direction, or null when none of
 * its words are known. Each recognised word gets its meaning, and a tempo
 * word gets its usual speed, nudged by assai/molto/poco the way a player
 * would read them.
 */
function findTerms(raw:string){
  const words=raw.toLowerCase().replace(/[(),;:!]/g," ").split(/\s+/).filter(Boolean);
  const found:{phrase:string;term:Term}[]=[];
  for(let i=0;i<words.length;){
    // Older editions end every marking with a full stop ("Allegro.", "a tempo."),
    // so a word also matches without it; abbreviations like "decresc." still
    // match as written.
    const phrase=PHRASES.find(candidate=>{const parts=candidate.split(" ");return parts.every((part,k)=>words[i+k]!==undefined&&(words[i+k]===part||words[i+k].replace(/\.+$/,"")===part))});
    if(phrase){found.push({phrase,term:TERMS[phrase]});i+=phrase.split(" ").length}
    else i++;
  }
  return {words,found};
}

/** Words that set a section's speed or character without a textbook BPM of their own. */
const TEMPO_HEADINGS=new Set(["rubato","mouvementé","a tempo","tempo primo","tempo i","au mouvement","au mouv","au mouvᵗ","mouvᵗ","più mosso","piu mosso"]);
/**
 * How a text marking is printed, by the engraving convention: words that set the tempo of a
 * section ("Très modéré", "Un peu mouvementé", "Rubato", "a tempo") in bold upright, and words that
 * change pace or expression along the way ("Retenu", "Cédez", "rit.", "cresc.", "dolce") in italic.
 * OSMD instead bolds only the tempo words on its own list and leaves the rest plain. Null when the
 * glossary knows none of the words (a title, a lyric, a rehearsal note), which are left alone.
 */
export function directionStyle(raw:string):"tempo"|"expression"|null{
  const known=findTerms(raw).found.filter(({phrase})=>!CONNECTIVES.has(phrase));
  if(!known.length||known.every(({phrase})=>DYNAMICS.has(phrase)))return null;
  return known.some(({phrase,term})=>term.bpm||TEMPO_HEADINGS.has(phrase))?"tempo":"expression";
}

/**
 * A marking that mixes kinds ("un poco rit. a tempo.") styled word by word:
 * the tempo part bold and upright, the rest italic, as an engraver would set
 * it. Words the glossary does not know take the style of the phrase before
 * them ("un poco" before "rit." leans on what follows instead). Null when
 * the marking is all one kind, which directionStyle already covers.
 */
export function directionRuns(raw:string):{text:string;style:"tempo"|"expression"}[]|null{
  const tokens=raw.trim().split(/\s+/),{words,found}=findTerms(raw);
  if(tokens.length!==words.length||found.length<2)return null;
  const styles:("tempo"|"expression"|null)[]=tokens.map(()=>null);
  for(let i=0,f=0;i<words.length&&f<found.length;){
    const {phrase,term}=found[f],size=phrase.split(" ").length;
    const matches=phrase.split(" ").every((part,k)=>words[i+k]!==undefined&&(words[i+k]===part||words[i+k].replace(/\.+$/,"")===part));
    if(!matches){i++;continue}
    const style=DYNAMICS.has(phrase)||CONNECTIVES.has(phrase)?null:term.bpm||TEMPO_HEADINGS.has(phrase)?"tempo":"expression";
    for(let k=0;k<size;k++)styles[i+k]=style;
    i+=size;f++;
  }
  // A tempo heading carries its own qualifiers: "Andante con moto",
  // "Allegro marziale", "Vivace e molto ritmico" are one bold heading, not a
  // bold word followed by italic ones. Only a word that changes the pace
  // along the way (rit., rall., accel.) after it goes back to italic.
  // Whole words only: "ritmico" is not "rit.".
  const PACE_CHANGE=/^(rit|ritard|ritardando|riten|ritenuto|rall|rallentando|accel|accelerando|allarg|allargando|string|stringendo|stretto|cédez|retenu)\.?$/;
  const headingEnds=tokens.findIndex((_,i)=>i>0&&(PACE_CHANGE.test(words[i]??"")||(words[i]==="a"&&words[i+1]?.replace(/\.$/,"")==="tempo")));
  if(styles.find(Boolean)==="tempo")for(let i=0;i<(headingEnds<0?tokens.length:headingEnds);i++)styles[i]="tempo";
  // Unknown words and connectives join the next known phrase, else the previous one.
  for(let i=tokens.length-1;i>=0;i--)if(!styles[i]&&styles[i+1])styles[i]=styles[i+1];
  for(let i=0;i<tokens.length;i++)if(!styles[i]&&styles[i-1])styles[i]=styles[i-1];
  if(styles.some(style=>!style)||new Set(styles).size<2)return null;
  const runs:{text:string;style:"tempo"|"expression"}[]=[];
  tokens.forEach((token,i)=>{const style=styles[i]!;if(runs.at(-1)?.style===style)runs.at(-1)!.text+=" "+token;else runs.push({text:token,style})});
  return runs;
}

export function performanceTermText(raw:string,written?:MetronomeFacts){
  const {words,found}=findTerms(raw);
  if(!found.length||found.every(({phrase})=>CONNECTIVES.has(phrase)))return null;
  const lines=found.map(({phrase,term})=>`${DYNAMICS.has(phrase)?phrase:capitalize(phrase)}: ${term.meaning}.`);
  const tempo=found.find(({term})=>term.bpm);
  if(tempo){
    const [low,high]=tempo.term.bpm!;
    // "Very" pushes a tempo word further in its own direction: molto allegro
    // is faster, molto adagio slower, and très modéré (very measured) calmer,
    // not quicker. A phrase with its own range ("très modéré") already
    // includes its modifier, so it is not nudged again.
    const own=tempo.phrase.split(" "),very=words.some(word=>["assai","molto","très","sehr"].includes(word)&&!own.includes(word)),gentler=words.includes("poco")||words.includes("troppo");
    const pace=low>=120?"fast":high<=80?"slow":"moderate";
    const lean=very?(pace==="fast"?" Toward the faster end, since it says very.":pace==="slow"?" Toward the slower end, since it says very.":" Very moderate means calmer, so toward the slower end."):gentler?" Toward the middle, since it asks for restraint.":"";
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
/**
 * A rehearsal box (A, B, F…) and the tempo words of the same bar are both
 * set at the bar's start, so "Allegro marziale" ran into the F box (Arnold,
 * bar 76). Engravers put the words just after the box: move any words that
 * overlap it, or sit closer than a small gap, to its right. Runs before
 * tuckMetronomeMarks, which then puts the ♩ = n mark after the moved words.
 * The box is an unclassed, roughly square rect OSMD draws in the bar (its
 * letter is a path; the other unclassed rects are 1px-wide barlines).
 */
export function clearRehearsalMarks(root:ParentNode){
  const words=[...root.querySelectorAll<SVGTextElement>(".vf-text:not(.measure-number) text")];
  root.querySelectorAll<SVGRectElement>(".vf-measure > rect:not([class])").forEach(rect=>{
    const box=rect.getBBox(),gap=6;
    if(box.width<6||box.height<6||Math.abs(box.width-box.height)>box.height)return;
    words.filter(text=>text.ownerSVGElement===rect.ownerSVGElement).forEach(text=>{
      const w=text.getBBox();
      const sameRow=w.y<box.y+box.height&&w.y+w.height>box.y;
      if(!sameRow||w.x+w.width<box.x||w.x>=box.x+box.width+gap)return;
      const x=Number(text.getAttribute("x"));
      if(Number.isFinite(x))text.setAttribute("x",String(x+box.x+box.width+gap-w.x));
    });
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
      // Above it (by midpoints: without the up-front shift the words can
      // overlap the mark's top by a pixel), starting at or before it.
      .filter(({box:w})=>w.y+w.height/2<=box.y+box.height/2&&w.x<=box.x+box.width&&box.y-(w.y+w.height)<box.height*4)
      .sort((a,b)=>(b.box.y+b.box.height)-(a.box.y+a.box.height))[0];
    if(!owner)return;
    const size=parseFloat(owner.text.getAttribute("font-size")??"")||owner.box.height;
    const dx=owner.box.x+owner.box.width+size*.4-box.x;
    const dy=Number(owner.text.getAttribute("y"))-Number(figure.getAttribute("y"));
    if(Number.isFinite(dx)&&Number.isFinite(dy))mark.setAttribute("transform",`translate(${dx} ${dy})`);
  });
}
