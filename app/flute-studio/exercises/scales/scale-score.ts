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
 * A type is a set of seven degree offsets from the tonic. Harmonic minor
 * raises the 7th outright; melodic minor carries a second set used only on
 * the way down, which is why direction has to be tracked per note rather
 * than per scale.
 */
export const scaleTypes=[
  {id:"major",label:"Major",zh:"大调",intervals:[0,2,4,5,7,9,11],descending:null,mode:"major"},
  {id:"natural",label:"Natural minor",zh:"自然小调",intervals:[0,2,3,5,7,8,10],descending:null,mode:"minor"},
  {id:"harmonic",label:"Harmonic minor",zh:"和声小调",intervals:[0,2,3,5,7,8,11],descending:null,mode:"minor"},
  {id:"melodic",label:"Melodic minor",zh:"旋律小调",intervals:[0,2,3,5,7,9,11],descending:[0,2,3,5,7,8,10],mode:"minor"},
] as const;
export type ScaleType=typeof scaleTypes[number];
export type ScaleTypeId=ScaleType["id"];

/** The shape a scale is practised in — same notes, different path. */
export const scaleForms=[
  {id:"scale",label:"Scale",zh:"音阶"},
  {id:"arpeggio",label:"Arpeggio",zh:"琶音"},
  {id:"thirds",label:"Thirds",zh:"三度"},
  {id:"fourths",label:"Fourths",zh:"四度"},
] as const;
export type ScaleFormId=typeof scaleForms[number]["id"];
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
  if(type.mode==="major")return {pc:key.pc,label:key.label,fifths:key.fifths,step:key.step};
  const minor=minorSpelling[key.pc];
  return {pc:key.pc,label:minor.label.toLowerCase(),fifths:minor.fifths,step:minor.step};
}
export const typeById=(id:ScaleTypeId)=>scaleTypes.find(t=>t.id===id)!;

/** Keep diatonic spelling separate from sounding pitch (C-flat in G-flat). */
function noteAt(key:SpelledKey,degree:number,type:ScaleType,descending=false):ScaleNote{
  const offsets=(descending&&type.descending?type.descending:type.intervals) as readonly number[];
  const index=((degree%7)+7)%7;
  const midi=60+key.pc+12*Math.floor(degree/7)+offsets[index];
  const letterIndex=key.step+degree;
  const stepIndex=((letterIndex%7)+7)%7;
  const octave=4+Math.floor(letterIndex/7);
  return {step:letters[stepIndex],alter:midi-(12*(octave+1)+naturals[stepIndex]),octave,midi};
}

/**
 * The ascending half of a form, as scale degrees. "scale" walks every
 * degree; the others revisit degrees in a fixed shape — an arpeggio takes
 * only the chord tones of each octave, thirds and fourths pair each degree
 * with the one two or three above it.
 */
function ascendingDegrees(form:ScaleFormId,low:number,high:number):number[]{
  const out:number[]=[];
  if(form==="arpeggio"){
    for(let d=low;d<=high;d++){const i=((d%7)+7)%7;if(i===0||i===2||i===4)out.push(d)}
    if(out.at(-1)!==high&&((high%7)+7)%7===0)out.push(high);
    return out;
  }
  if(form==="thirds"||form==="fourths"){
    const reach=form==="thirds"?2:3;
    for(let d=low;d+reach<=high;d++)out.push(d,d+reach);
    return out;
  }
  for(let d=low;d<=high;d++)out.push(d);
  return out;
}

/** Repeat supplies the final tonic, avoiding a doubled note at the join. */
export function scaleNotes(key:MajorKey,range:ScaleRange,typeId:ScaleTypeId="major",form:ScaleFormId="scale",ending:ScaleEnding="none"):ScaleNote[]{
  const type=typeById(typeId),spelled=keyForType(key,type);
  let low=0,high=range==="one"?7:14;
  if(range==="standard"||range==="full"){
    const min=range==="full"?59:60,max=range==="full"?98:96;
    while(noteAt(spelled,low-1,type).midi>=min)low--;
    high=0;
    while(noteAt(spelled,high+1,type).midi<=max)high++;
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
    const up=ascendingDegrees(form,low,high);
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
