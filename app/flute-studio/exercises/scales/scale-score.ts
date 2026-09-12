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

export function scaleMusicXML(key:MajorKey,range:ScaleRange):string{
  const notes=scaleNotes(key,range),measures:string[]=[];
  // Invisible measures let the engraver wrap naturally on narrow tablets.
  for(let offset=0;offset<notes.length;offset+=8){
    const group=notes.slice(offset,offset+8);
    const attributes=offset===0?`<attributes><divisions>4</divisions><key><fifths>${key.fifths}</fifths><mode>major</mode></key><time print-object="no"><beats>2</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>`:"";
    const written=group.map((n,i)=>{
      const beamGroupLength=Math.min(4,group.length-Math.floor(i/4)*4);
      const beam=i%4===0?"begin":i%4===beamGroupLength-1?"end":"continue";
      return `<note><pitch><step>${n.step}</step><alter>${n.alter}</alter><octave>${n.octave}</octave></pitch><duration>1</duration><type>16th</type>${beamGroupLength>1?`<beam number="1">${beam}</beam><beam number="2">${beam}</beam>`:""}</note>`;
    }).join("");
    const end=offset+8>=notes.length;
    measures.push(`<measure number="${measures.length+1}" implicit="yes">${attributes}${written}<barline location="right"><bar-style>${end?"light-heavy":"none"}</bar-style>${end?'<repeat direction="backward"/>':""}</barline></measure>`);
  }
  return `<?xml version="1.0" encoding="utf-8"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list><part id="P1">${measures.join("")}</part></score-partwise>`;
}

/** A single score keeps the reader's playback, overlays and markup available. */
export function scaleBookMusicXML(keys:readonly MajorKey[],range:ScaleRange,newLines=false):string{
  let number=0;
  const measures=keys.map(key=>{
    const part=scaleMusicXML(key,range).match(/<part id="P1">([\s\S]*)<\/part>/)![1];
    const first=number===0;
    return part.replace(/<measure number="\d+" implicit="yes">/g,()=>`<measure number="${++number}" implicit="yes">`)
      .replace(/<clef>.*?<\/clef>/,first?"<clef><sign>G</sign><line>2</line></clef>":"")
      .replace(/(<measure[^>]*>)/,`$1${newLines?'<print new-system="yes"/>':""}<direction placement="above"><direction-type><words font-weight="bold">${key.label} major</words></direction-type></direction>`);
  }).join("");
  return `<?xml version="1.0" encoding="utf-8"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list><part id="P1">${measures}</part></score-partwise>`;
}
