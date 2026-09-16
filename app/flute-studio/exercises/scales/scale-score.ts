import {type ArticulationSelection,type RhythmChoice,defaultArticulationSelection,divisionsPerQuarter,resolveArticulation,resolveArticulationPattern,resolveRhythm} from "../../components/notePatterns";

export const majorKeys = [
  {id:"C",label:"C",pc:0,fifths:0,step:0},
  {id:"Db",label:"D♭",pc:1,fifths:-5,step:1},
  {id:"D",label:"D",pc:2,fifths:2,step:1},
  {id:"Eb",label:"E♭",pc:3,fifths:-3,step:2},
  {id:"E",label:"E",pc:4,fifths:4,step:2},
  {id:"F",label:"F",pc:5,fifths:-1,step:3},
  {id:"Gb",label:"G♭",pc:6,fifths:-6,step:4},
  {id:"G",label:"G",pc:7,fifths:1,step:4},
  {id:"Ab",label:"A♭",pc:8,fifths:-4,step:5},
  {id:"A",label:"A",pc:9,fifths:3,step:5},
  {id:"Bb",label:"B♭",pc:10,fifths:-2,step:6},
  {id:"B",label:"B",pc:11,fifths:5,step:6},
] as const;
export type MajorKey=typeof majorKeys[number];
export const ranges=[
  {id:"one",label:"One octave",zh:"一个八度"},
  {id:"two",label:"Two octaves",zh:"两个八度"},
  {id:"standard",label:"Low C to high C",zh:"低音 C 至高音 C",notes:"C4–C7"},
  {id:"full",label:"Low B to high D",zh:"低音 B 至高音 D",notes:"B3–D7"},
] as const;
export type ScaleRange=typeof ranges[number]["id"];
export type ScaleNote={step:string;alter:number;octave:number;midi:number};
const letters="CDEFGAB",naturals=[0,2,4,5,7,9,11];

/**
 * A scale type is a set of semitone offsets from the tonic, plus the
 * letter-name each of those degrees is spelled with.
 *
 * `letters` is what keeps the model honest once scales stop having seven
 * notes. A diatonic scale's Nth degree is always the Nth letter, so the
 * two used to be the same number; a chromatic scale has twelve degrees
 * across seven letters (C C♯ D D♯ E F …), so the mapping has to be stated.
 * Whole-tone, diminished and augmented scales are the same story with
 * different counts. Everything downstream — range in octaves, arpeggios,
 * the interval forms — is derived from `intervals.length` rather than a
 * hardcoded 7.
 *
 * `descending` carries a second spelling used only on the way down:
 * melodic minor genuinely changes pitch there, while a chromatic scale
 * keeps the same pitches and just re-spells them (sharps up, flats down),
 * which is why intervals and letters are overridable independently.
 *
 * `chord` names the degrees an arpeggio takes; `reach` says how many
 * degrees away the interval forms look. Both are in degrees, so on a
 * seven-note scale `thirds: 2` really is a third, and on the twelve-note
 * chromatic `thirds: 3` is a minor third.
 */
const diatonicLetters=[0,1,2,3,4,5,6] as const;
/**
 * How far the interval forms reach, in degrees of the type's own set.
 *
 * On a seven-note scale a "third" is two degrees away, so these are just
 * 1..6. On the twelve-note chromatic a degree is a semitone, so the sizes
 * are named outright — and they are chosen to be closed under inversion
 * (2+10, 3+9, 5+7 all make 12), which means the sixths exercise is the
 * thirds exercise turned upside down and the sevenths is the seconds.
 * That is what keeps the whole family feeling like one set of exercises
 * rather than seven unrelated ones.
 *
 * The octave is deliberately absent: it is always one full octave of
 * whatever the type is, which is `intervals.length` degrees, so deriving
 * it beats restating it per type and getting it wrong on the six- and
 * eight-note scales.
 */
const diatonicReach={seconds:1,thirds:2,fourths:3,fifths:4,sixths:5,sevenths:6} as const;
const chromaticReach={seconds:2,thirds:3,fourths:5,fifths:7,sixths:9,sevenths:10} as const;
export const scaleTypes=[
  {id:"major",label:"Major",zh:"大调",intervals:[0,2,4,5,7,9,11],letters:diatonicLetters,descending:null,mode:"major",chord:[0,2,4],reach:diatonicReach,openSignature:false},
  {id:"natural",label:"Natural minor",zh:"自然小调",intervals:[0,2,3,5,7,8,10],letters:diatonicLetters,descending:null,mode:"minor",chord:[0,2,4],reach:diatonicReach,openSignature:false},
  {id:"harmonic",label:"Harmonic minor",zh:"和声小调",intervals:[0,2,3,5,7,8,11],letters:diatonicLetters,descending:null,mode:"minor",chord:[0,2,4],reach:diatonicReach,openSignature:false},
  {id:"melodic",label:"Melodic minor",zh:"旋律小调",intervals:[0,2,3,5,7,9,11],letters:diatonicLetters,descending:{intervals:[0,2,3,5,7,8,10],letters:diatonicLetters},mode:"minor",chord:[0,2,4],reach:diatonicReach,openSignature:false},
  // Chromatic: sharps going up, flats coming down — the standard spelling,
  // and the reason `descending` can override letters without touching
  // pitch. No key signature: every accidental is written out, which is how
  // a chromatic scale is engraved whatever key it starts on.
  // A degree here is a semitone, so chromaticReach spells real intervals:
  // C–D, C–E♭, C–F, C–G, C–A, C–B♭, C–C.
  {id:"chromatic",label:"Chromatic",zh:"半音阶",intervals:[0,1,2,3,4,5,6,7,8,9,10,11],letters:[0,0,1,1,2,3,3,4,4,5,5,6],descending:{intervals:null,letters:[0,1,1,2,2,3,4,4,5,5,6,6]},mode:"major",chord:[0,4,7],reach:chromaticReach,openSignature:true},
  {id:"wholeTone",label:"Whole tone",zh:"全音阶",intervals:[0,2,4,6,8,10],letters:[0,1,2,3,4,5],descending:null,mode:"major",chord:[0,2,4],reach:diatonicReach,openSignature:true},
  // Whole-half diminished, and the arpeggio that belongs to it is the
  // diminished seventh — four notes, not three.
  {id:"diminished",label:"Diminished",zh:"减音阶",intervals:[0,2,3,5,6,8,9,11],letters:[0,1,2,3,4,5,5,6],descending:null,mode:"major",chord:[0,2,4,6],reach:diatonicReach,openSignature:true},
  {id:"augmented",label:"Augmented",zh:"增音阶",intervals:[0,3,4,7,8,11],letters:[0,2,2,4,5,6],descending:null,mode:"major",chord:[0,2,4],reach:diatonicReach,openSignature:true},
] as const;
export type ScaleType=typeof scaleTypes[number];
export type ScaleTypeId=ScaleType["id"];

/** The shape a scale is practised in — same notes, different path. */
export const scaleForms=[
  {id:"scale",label:"Scale",zh:"音阶"},
  {id:"arpeggio",label:"Arpeggio",zh:"琶音"},
  {id:"seconds",label:"Seconds",zh:"二度"},
  {id:"thirds",label:"Thirds",zh:"三度"},
  {id:"fourths",label:"Fourths",zh:"四度"},
  {id:"fifths",label:"Fifths",zh:"五度"},
  {id:"sixths",label:"Sixths",zh:"六度"},
  {id:"sevenths",label:"Sevenths",zh:"七度"},
  {id:"octaves",label:"Octaves",zh:"八度"},
] as const;
export type ScaleFormId=typeof scaleForms[number]["id"];
/** The forms that pair each degree with one a fixed distance above it. */
const intervalForms=["seconds","thirds","fourths","fifths","sixths","sevenths"] as const;
type IntervalFormId=typeof intervalForms[number];
const isIntervalForm=(form:ScaleFormId):form is IntervalFormId=>(intervalForms as readonly string[]).includes(form);
/** "hold" parks a whole note with a fermata on the tonic at the end. */
export type ScaleEnding="none"|"hold";

/**
 * A minor key is spelled from its own signature, not its parallel major's:
 * the tonic a semitone above C is C♯ minor (4 sharps), never D♭ minor
 * (8 flats, unwritable). Indexed by pitch class.
 */
const minorSpelling=[
  {label:"C",fifths:-3,step:0},{label:"C♯",fifths:4,step:0},{label:"D",fifths:-1,step:1},{label:"E♭",fifths:-6,step:2},
  {label:"E",fifths:1,step:2},{label:"F",fifths:-4,step:3},{label:"F♯",fifths:3,step:3},{label:"G",fifths:-2,step:4},
  {label:"G♯",fifths:5,step:4},{label:"A",fifths:0,step:5},{label:"B♭",fifths:-5,step:6},{label:"B",fifths:2,step:6},
] as const;
export type SpelledKey={pc:number;label:string;fifths:number;step:number};
export function keyForType(key:MajorKey,type:ScaleType):SpelledKey{
  // Chromatic, whole-tone, diminished and augmented scales are written
  // without a key signature — every accidental spelled out — so they take
  // the tonic's letter but none of its sharps or flats.
  if(type.mode==="major")return {pc:key.pc,label:key.label,fifths:type.openSignature?0:key.fifths,step:key.step};
  const minor=minorSpelling[key.pc];
  return {pc:key.pc,label:minor.label.toLowerCase(),fifths:minor.fifths,step:minor.step};
}
/** How many degrees make one octave of this type — 7 diatonic, 12 chromatic. */
export const degreesPerOctave=(type:ScaleType)=>type.intervals.length;
export const typeById=(id:ScaleTypeId)=>scaleTypes.find(t=>t.id===id)!;

/**
 * Keep spelling separate from sounding pitch (C-flat in G-flat, and D♯
 * ascending vs E♭ descending in a chromatic scale).
 *
 * A degree indexes the type's own set, which may be six, seven, eight or
 * twelve notes long; the letter it lands on comes from the type's
 * `letters` map rather than from the degree number, and the octave from
 * that letter, so a twelve-degree chromatic octave still advances exactly
 * seven letters.
 */
function noteAt(key:SpelledKey,degree:number,type:ScaleType,descending=false):ScaleNote{
  const alt=descending?type.descending:null;
  const offsets=(alt?.intervals??type.intervals) as readonly number[];
  const letterSteps=(alt?.letters??type.letters) as readonly number[];
  const card=offsets.length;
  const index=((degree%card)+card)%card;
  const octaveShift=Math.floor(degree/card);
  const midi=60+key.pc+12*octaveShift+offsets[index];
  const letterIndex=key.step+letterSteps[index]+7*octaveShift;
  const stepIndex=((letterIndex%7)+7)%7;
  const octave=4+Math.floor(letterIndex/7);
  return {step:letters[stepIndex],alter:midi-(12*(octave+1)+naturals[stepIndex]),octave,midi};
}

/**
 * The ascending half of a form, as scale degrees. "scale" walks every
 * degree; the others revisit degrees in a fixed shape — an arpeggio takes
 * only its type's chord tones, and the interval forms (seconds through
 * octaves) pair each degree with the one `reach` degrees above it.
 *
 * Both the chord tones and the reach come from the type, which is what
 * makes the same three lines produce broken thirds on a major scale
 * (reach 2 of 7) and the chromatic pattern C–E♭, C♯–E, D–F … (reach 3 of
 * 12) without a special case for either.
 */
function ascendingDegrees(form:ScaleFormId,low:number,high:number,ceiling:number,type:ScaleType):number[]{
  const out:number[]=[];
  const card=degreesPerOctave(type);
  if(form==="arpeggio"){
    const chord=type.chord as readonly number[];
    for(let d=low;d<=high;d++){const i=((d%card)+card)%card;if(chord.includes(i))out.push(d)}
    if(out.at(-1)!==high&&((high%card)+card)%card===0)out.push(high);
    return out;
  }
  // The octave is one full turn of whatever set this type is, so it comes
  // from the cardinality rather than the reach table.
  if(form==="octaves"||isIntervalForm(form)){
    const reach=form==="octaves"?card:type.reach[form];
    // The range says where the pattern *starts*, not where its upper note
    // may land: "thirds, one octave" means a third on every degree of the
    // octave, the last of which reaches above it. Clamping the upper note
    // instead is what used to cut sixths down to four pairs and octaves
    // down to one. `ceiling` is Infinity for the octave-count ranges and a
    // real limit only for the instrument ranges, where a note above the
    // flute's top is unplayable rather than merely out of span. The last
    // starting degree is high-1, since starting on the closing tonic would
    // just restate the opening pair an octave up.
    for(let d=low;d<high&&d+reach<=ceiling;d++)out.push(d,d+reach);
    return out;
  }
  for(let d=low;d<=high;d++)out.push(d);
  return out;
}

/** Repeat supplies the final tonic, avoiding a doubled note at the join. */
export function scaleNotes(key:MajorKey,range:ScaleRange,typeId:ScaleTypeId="major",form:ScaleFormId="scale",ending:ScaleEnding="none"):ScaleNote[]{
  const type=typeById(typeId),spelled=keyForType(key,type);
  const card=degreesPerOctave(type);
  let low=0,high=range==="one"?card:card*2;
  // "One octave"/"Two octaves" bound the span the exercise walks; the
  // instrument ranges bound what the flute can physically play, so only
  // those cap how high an interval's upper note may reach.
  let ceiling=Infinity;
  if(range==="standard"||range==="full"){
    const min=range==="full"?59:60,max=range==="full"?98:96;
    while(noteAt(spelled,low-1,type).midi>=min)low--;
    high=0;
    while(noteAt(spelled,high+1,type).midi<=max)high++;
    ceiling=high;
  }
  // `up` marks which interval set a note is spelled from — only melodic
  // minor differs between the two, but the flag has to travel per note
  // because one exercise contains both directions.
  const path:{degree:number;up:boolean}[]=[];
  if(form==="scale"){
    // Tonic → top → bottom → tonic, the shape the full-range exercises
    // have always had; the other forms mirror around their own span.
    for(let i=0;i<=high;i++)path.push({degree:i,up:true});
    for(let i=high-1;i>=low;i--)path.push({degree:i,up:false});
    for(let i=low+1;i<0;i++)path.push({degree:i,up:true});
    if(path.at(-1)?.degree===0)path.pop();
  }else{
    const up=ascendingDegrees(form,low,high,ceiling,type);
    up.forEach(degree=>path.push({degree,up:true}));
    for(let i=up.length-2;i>=0;i--)path.push({degree:up[i],up:false});
  }
  const notes=path.map(({degree,up})=>noteAt(spelled,degree,type,!up));
  // The held tonic is part of the note list, not an extra appended at
  // render time — the practice overlays (names, solfège, syllables) index
  // straight into this array, so anything the engraver draws has to exist
  // here or every label after it shifts by one.
  if(ending==="hold")notes.push(noteAt(spelled,0,type));
  return notes;
}

/**
 * Notes are grouped into beat-sized chunks first (for beaming/tuplet
 * brackets), then two beat-chunks make one invisible measure — for the
 * default "even" rhythm a beat is 4 sixteenths, so this reproduces the
 * old fixed offset-by-8/beam-by-4 grouping exactly. A dotted or triplet
 * rhythm's beat-chunks are shaped differently (a long+short pair, or a
 * triplet) but the same two-chunks-per-measure rule still applies.
 */
function beatChunks(count:number,perQuarter:number,durations:{divisions:number}[]):number[][]{
  const chunks:number[][]=[];
  let current:number[]=[],total=0;
  for(let i=0;i<count;i++){
    current.push(i);
    total+=durations[i].divisions;
    if(total>=perQuarter){chunks.push(current);current=[];total=0;}
  }
  if(current.length)chunks.push(current);
  return chunks;
}

export function scaleMusicXML(key:MajorKey,range:ScaleRange,articulationSelection:ArticulationSelection=defaultArticulationSelection,rhythm:RhythmChoice="even",typeId:ScaleTypeId="major",form:ScaleFormId="scale",ending:ScaleEnding="none"):string{
  const type=typeById(typeId),spelled=keyForType(key,type);
  const notes=scaleNotes(key,range,typeId,form,ending);
  const held=ending==="hold"?notes[notes.length-1]:null;
  const runLength=held?notes.length-1:notes.length;
  const durations=resolveRhythm(runLength,rhythm);
  const pattern=resolveArticulationPattern(articulationSelection,runLength);
  const perQuarter=divisionsPerQuarter(rhythm);
  const beats=beatChunks(runLength,perQuarter,durations);
  const measures:string[]=[];
  // Invisible measures let the engraver wrap naturally on narrow tablets.
  for(let m=0;m*2<beats.length;m++){
    const measureBeats=beats.slice(m*2,m*2+2);
    const attributes=m===0?`<attributes><divisions>${perQuarter}</divisions><key><fifths>${spelled.fifths}</fifths><mode>${type.mode}</mode></key><time print-object="no"><beats>2</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>`:"";
    const written=measureBeats.map(beat=>{
      const uniformType=beat.every(index=>durations[index].type===durations[beat[0]].type);
      return beat.map((noteIndex,posInBeat)=>{
        const n=notes[noteIndex],d=durations[noteIndex];
        const beam=uniformType&&beat.length>1?(posInBeat===0?"begin":posInBeat===beat.length-1?"end":"continue"):"";
        const {mode,positionInGroup,groupSize}=resolveArticulation(pattern,noteIndex);
        const notations:string[]=[];
        if(mode==="slur"&&positionInGroup===0)notations.push('<slur type="start" number="1"/>');
        if(mode==="slur"&&positionInGroup===groupSize-1)notations.push('<slur type="stop" number="1"/>');
        if(d.tuplet)notations.push(`<tuplet type="${d.tuplet}" number="1"/>`);
        if(mode==="staccato"||mode==="tenuto")notations.push(`<articulations>${mode==="staccato"?"<staccato/>":"<tenuto/>"}</articulations>`);
        // Only notes actually grouped into a triplet get time-modification —
        // resolveRhythm renders any non-multiple-of-3 tail as plain 16ths
        // (type "16th"), not fractional triplet-eighths, so type is the
        // correct signal here rather than the rhythm choice alone.
        const timeMod=rhythm==="triplet"&&d.type==="eighth"?"<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>":"";
        // Beam level count matches the note's own subdivision (an eighth
        // has one beam; a 16th needs a second, secondary beam on top of
        // it) — emitting a bogus level-2 beam on an eighth note (as an
        // earlier version of this did, copying the old fixed 16th-only
        // code) is what made VexFlow throw "Invalid note initialization
        // object" on triplet/dotted rhythms.
        const beamLevels=d.type==="16th"?2:1;
        const beamXml=beam?Array.from({length:beamLevels},(_,level)=>`<beam number="${level+1}">${beam}</beam>`).join(""):"";
        return `<note><pitch><step>${n.step}</step><alter>${n.alter}</alter><octave>${n.octave}</octave></pitch><duration>${d.divisions}</duration>${"<dot/>".repeat(d.dots)}<type>${d.type}</type>${timeMod}${beamXml}${notations.length?`<notations>${notations.join("")}</notations>`:""}</note>`;
      }).join("");
    }).join("");
    const end=m*2+2>=beats.length&&!held;
    measures.push(`<measure number="${measures.length+1}" implicit="yes">${attributes}${written}<barline location="right"><bar-style>${end?"light-heavy":"none"}</bar-style>${end?'<repeat direction="backward"/>':""}</barline></measure>`);
  }
  if(held){
    // Its own 4/4 measure so the whole note is a genuine whole note; the
    // time signature is print-object="no" like the 2/4 above it, so the
    // change never appears on the page.
    measures.push(`<measure number="${measures.length+1}" implicit="yes"><attributes><time print-object="no"><beats>4</beats><beat-type>4</beat-type></time></attributes><note><pitch><step>${held.step}</step><alter>${held.alter}</alter><octave>${held.octave}</octave></pitch><duration>${perQuarter*4}</duration><type>whole</type><notations><fermata type="upright"/></notations></note><barline location="right"><bar-style>light-heavy</bar-style></barline></measure>`);
  }
  return `<?xml version="1.0" encoding="utf-8"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list><part id="P1">${measures.join("")}</part></score-partwise>`;
}

/**
 * A single score keeps the reader's playback, overlays and markup available.
 * `articulations` cycles by key index (key 3 gets articulations[2 %
 * length]) rather than one pattern for the whole book — lets a teacher
 * assign a rotation like "all staccato, all tongued, slur 2 tongue 2" across
 * consecutive keys instead of repeating the same articulation everywhere.
 */
export type ScaleBlock={key:MajorKey;type:ScaleTypeId;form:ScaleFormId;label:string};
export function scaleBookMusicXML(blocks:readonly ScaleBlock[],range:ScaleRange,newLines=false,articulations:ArticulationSelection[]=[defaultArticulationSelection],rhythm:RhythmChoice="even",ending:ScaleEnding="none"):string{
  let number=0;
  const measures=blocks.map((block,keyIndex)=>{
    const key=block.key;
    const articulationSelection=articulations[keyIndex%articulations.length]??defaultArticulationSelection;
    const part=scaleMusicXML(key,range,articulationSelection,rhythm,block.type,block.form,ending).match(/<part id="P1">([\s\S]*)<\/part>/)![1];
    const first=number===0;
    return part.replace(/<measure number="\d+" implicit="yes">/g,()=>`<measure number="${++number}" implicit="yes">`)
      .replace(/<clef>.*?<\/clef>/,first?"<clef><sign>G</sign><line>2</line></clef>":"")
      .replace(/(<measure[^>]*>)/,`$1${newLines?'<print new-system="yes"/>':""}<direction placement="above"><direction-type><words font-weight="bold">${block.label}</words></direction-type></direction>`);
  }).join("");
  return `<?xml version="1.0" encoding="utf-8"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list><part id="P1">${measures}</part></score-partwise>`;
}
