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
const letters="CDEFGAB",naturals=[0,2,4,5,7,9,11],intervals=[0,2,4,5,7,9,11];

/** Keep diatonic spelling separate from sounding pitch (C-flat in G-flat). */
function noteAt(key:MajorKey,degree:number):ScaleNote{
  const index=((degree%7)+7)%7;
  const midi=60+key.pc+12*Math.floor(degree/7)+intervals[index];
  const letterIndex=key.step+degree;
  const stepIndex=((letterIndex%7)+7)%7;
  const octave=4+Math.floor(letterIndex/7);
  return {step:letters[stepIndex],alter:midi-(12*(octave+1)+naturals[stepIndex]),octave,midi};
}

/** Repeat supplies the final tonic, avoiding a doubled note at the join. */
export function scaleNotes(key:MajorKey,range:ScaleRange):ScaleNote[]{
  let low=0,high=range==="one"?7:14;
  if(range==="standard"||range==="full"){
    const min=range==="full"?59:60,max=range==="full"?98:96;
    while(noteAt(key,low-1).midi>=min)low--;
    high=0;
    while(noteAt(key,high+1).midi<=max)high++;
  }
  const degrees:number[]=[];
  for(let i=0;i<=high;i++)degrees.push(i);
  for(let i=high-1;i>=low;i--)degrees.push(i);
  for(let i=low+1;i<0;i++)degrees.push(i);
  if(degrees.at(-1)===0)degrees.pop();
  return degrees.map(i=>noteAt(key,i));
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

export function scaleMusicXML(key:MajorKey,range:ScaleRange,articulationSelection:ArticulationSelection=defaultArticulationSelection,rhythm:RhythmChoice="even"):string{
  const notes=scaleNotes(key,range);
  const durations=resolveRhythm(notes.length,rhythm);
  const pattern=resolveArticulationPattern(articulationSelection,notes.length);
  const perQuarter=divisionsPerQuarter(rhythm);
  const beats=beatChunks(notes.length,perQuarter,durations);
  const measures:string[]=[];
  // Invisible measures let the engraver wrap naturally on narrow tablets.
  for(let m=0;m*2<beats.length;m++){
    const measureBeats=beats.slice(m*2,m*2+2);
    const attributes=m===0?`<attributes><divisions>${perQuarter}</divisions><key><fifths>${key.fifths}</fifths><mode>major</mode></key><time print-object="no"><beats>2</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>`:"";
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
    const end=m*2+2>=beats.length;
    measures.push(`<measure number="${measures.length+1}" implicit="yes">${attributes}${written}<barline location="right"><bar-style>${end?"light-heavy":"none"}</bar-style>${end?'<repeat direction="backward"/>':""}</barline></measure>`);
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
export function scaleBookMusicXML(keys:readonly MajorKey[],range:ScaleRange,newLines=false,articulations:ArticulationSelection[]=[defaultArticulationSelection],rhythm:RhythmChoice="even"):string{
  let number=0;
  const measures=keys.map((key,keyIndex)=>{
    const articulationSelection=articulations[keyIndex%articulations.length]??defaultArticulationSelection;
    const part=scaleMusicXML(key,range,articulationSelection,rhythm).match(/<part id="P1">([\s\S]*)<\/part>/)![1];
    const first=number===0;
    return part.replace(/<measure number="\d+" implicit="yes">/g,()=>`<measure number="${++number}" implicit="yes">`)
      .replace(/<clef>.*?<\/clef>/,first?"<clef><sign>G</sign><line>2</line></clef>":"")
      .replace(/(<measure[^>]*>)/,`$1${newLines?'<print new-system="yes"/>':""}<direction placement="above"><direction-type><words font-weight="bold">${key.label} major</words></direction-type></direction>`);
  }).join("");
  return `<?xml version="1.0" encoding="utf-8"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list><part id="P1">${measures}</part></score-partwise>`;
}
