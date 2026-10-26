// Pulls tappable rhythms out of the music library's scores for the Rhythm drills page.
// Run: npx tsx tools/extract-rhythm-bars.ts   (writes app/flute-studio/rhythm-drills/real-bars.json)
//
// For each published piece it reads the reading part (or the first part), keeps bars a beginner can tap from the
// notation alone, strips the pitches, and rates each bar on the drills' difficulty ladder (rankOf). Bars are skipped
// when they have grace notes, more than one voice, chords only partly in time, tuplets other than triplets, notes
// shorter than a sixteenth, a sound tied in from the bar before, an incomplete length (pickups), a meter the drills do
// not count (only 2/4, 3/4, 4/4, 5/4, 6/8), or fewer than three note starts. The same rhythm is kept once per piece.
import {readFileSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {unzipSync,strFromU8} from "fflate";
import {barLength,maxLength,rankOf,shortestOf,type DrillPattern,type Meter} from "../app/flute-studio/rhythm-drills/drills";
import type {RhythmItem} from "../app/flute-studio/theory/dots-and-ties/rhythmSequence";

const ROOT=join(import.meta.dirname,"..");
const catalog=JSON.parse(readFileSync(join(ROOT,"content/music-catalog.json"),"utf8")) as {id:string;title:string;zhTitle?:string;composer:string;scorePath?:string|null;status:string;readingPartId?:string;tags:string[];book?:{id:string;number:number}}[];
const books=JSON.parse(readFileSync(join(ROOT,"content/music-books.json"),"utf8")) as {id:string;title:string}[];
const METERS=new Set(["2/4","3/4","4/4","5/4","6/8"]);
const TYPES:Record<string,number>={whole:4,half:2,quarter:1,eighth:.5,"16th":.25};
/** A wide screen's staff (the drills only show real bars that also fit the screen they are on). */
const WIDE=720;
const PER_PIECE=14;

function readScore(path:string){
  const file=readFileSync(join(ROOT,"public",path));
  if(!path.endsWith(".mxl"))return file.toString("utf8");
  const zip=unzipSync(new Uint8Array(file));
  const container=strFromU8(zip["META-INF/container.xml"]);
  const root=/full-path="([^"]+)"/.exec(container)?.[1];
  if(!root||!zip[root])throw new Error(`no root file in ${path}`);
  return strFromU8(zip[root]);
}
const tag=(xml:string,name:string)=>new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`).exec(xml)?.[1];
const has=(xml:string,name:string)=>new RegExp(`<${name}\\b`).test(xml);

function barsOf(xml:string,partId:string|undefined){
  const parts=[...xml.matchAll(/<part\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/part>/g)];
  const part=parts.find(p=>p[1]===partId)??parts[0];
  if(!part)return [];
  let divisions=1,meter:Meter|null=null;
  const out:{bar:string;meter:Meter;items:RhythmItem[];beams:number[][];tuplets:{from:number;to:number;count:number}[]}[]=[];
  for(const m of part[2].matchAll(/<measure\b([^>]*)>([\s\S]*?)<\/measure>/g)){
    const attrs=m[1],body=m[2],number=/number="([^"]+)"/.exec(attrs)?.[1]??"?";
    const div=tag(body,"divisions");if(div)divisions=Number(div);
    const beats=tag(body,"beats"),type=tag(body,"beat-type");
    if(beats&&type)meter=/^\d+$/.test(beats)?{top:Number(beats),bottom:Number(type)}:null;
    if(!meter||!METERS.has(`${meter.top}/${meter.bottom}`)||/implicit="yes"/.test(attrs))continue;
    if(has(body,"backup")||has(body,"forward"))continue;
    const notes=[...body.matchAll(/<note\b[^>]*>([\s\S]*?)<\/note>/g)].map(n=>n[1]).filter(n=>!has(n,"chord"));
    if(!notes.length||notes.some(n=>has(n,"grace")||has(n,"cue")||/<rest\s+measure="yes"/.test(n)))continue;
    if(notes.some(n=>(tag(n,"voice")??"1")!==(tag(notes[0],"voice")??"1")))continue;
    const items:RhythmItem[]=[],beams:number[][]=[],tuplets:{from:number;to:number;count:number}[]=[];
    let ok=true,beam:number[]=[],tupletFrom=-1,actual=0;
    notes.forEach((n,i)=>{
      if(!ok)return;
      const base=TYPES[tag(n,"type")??""],dots=(n.match(/<dot\s*\/>/g)??[]).length,rest=has(n,"rest");
      if(!base||dots>1){ok=false;return}
      const written=base*(dots?1.5:1);
      if(!Number.isInteger(written*4)){ok=false;return}
      const mod=tag(n,"time-modification");
      let ratio:[number,number]|undefined;
      if(mod){if(tag(mod,"actual-notes")!=="3"||tag(mod,"normal-notes")!=="2"){ok=false;return}ratio=[3,2]}
      const length=ratio?written*2/3:written;
      // The written value must agree with the sounding duration, or the file's rhythm is not what is printed.
      if(Math.abs(Number(tag(n,"duration"))/divisions-length)>1e-6){ok=false;return}
      actual+=length;
      const tieStart=/<tie\s+type="start"/.test(n),tieStop=/<tie\s+type="stop"/.test(n);
      if(i===0&&tieStop&&!rest){ok=false;return}
      items.push({written,...(ratio?{ratio}:{}),...(rest?{rest:true}:{}),...(tieStart&&!rest?{tieNext:true}:{})});
      const b=/<beam\s+number="1">(\w+)<\/beam>/.exec(n)?.[1];
      if(b==="begin")beam=[i];else if(b==="continue")beam.push(i);else if(b==="end"){beam.push(i);if(beam.length>1)beams.push(beam);beam=[]}
      if(/<tuplet\b[^>]*type="start"/.test(n))tupletFrom=i;
      if(/<tuplet\b[^>]*type="stop"/.test(n)&&tupletFrom>=0){tuplets.push({from:tupletFrom,to:i,count:3});tupletFrom=-1}
    });
    if(!ok||Math.abs(actual-barLength(meter))>1e-6)continue;
    // A tie only counts inside the bar: one into the next bar does not change where the notes start.
    const last=items.at(-1)!;delete last.tieNext;
    if(items.some((it,i)=>it.tieNext&&items[i+1]?.rest))continue;
    // Every triplet note must sit in a bracket, or the engraving would be wrong.
    const bracketed=new Set(tuplets.flatMap(t=>Array.from({length:t.to-t.from+1},(_,k)=>t.from+k)));
    if(items.some((it,i)=>it.ratio&&!bracketed.has(i))||tuplets.some(t=>t.to-t.from!==2))continue;
    if(items.filter((it,i)=>!it.rest&&!items[i-1]?.tieNext).length<3)continue;
    out.push({bar:number,meter,items,beams:beams.filter(g=>g.every(i=>!items[i].rest)),tuplets});
  }
  return out;
}

const result:DrillPattern[]=[];
for(const piece of catalog){
  if(piece.status!=="published"||!piece.scorePath||piece.tags.includes("Exercise"))continue;
  let xml:string;
  try{xml=readScore(piece.scorePath)}catch(e){console.warn(`skip ${piece.id}: ${(e as Error).message}`);continue}
  const book=piece.book?books.find(b=>b.id===piece.book!.id):null;
  const title=book?`${book.title}, ${piece.title}`:piece.title;
  const seen=new Set<string>(),kept:DrillPattern[]=[];
  for(const b of barsOf(xml,piece.readingPartId)){
    const key=JSON.stringify([b.meter,b.items]);
    if(seen.has(key))continue;seen.add(key);
    if(barLength(b.meter)>maxLength(WIDE,shortestOf(b.items)))continue;
    const rank=rankOf(b.items,b.meter);
    kept.push({id:`${piece.id}-${b.bar}`,items:b.items,beams:b.beams,tuplets:b.tuplets,meter:b.meter,beat:b.meter.bottom===8?1.5:1,top:b.meter.bottom===8?b.meter.top/3:b.meter.top,rank,
      source:{piece:piece.id,title,...(piece.zhTitle?{zhTitle:piece.zhTitle}:{}),composer:piece.composer,bar:b.bar}});
  }
  // Keep a spread of difficulties from each piece rather than its first bars.
  kept.sort((a,b)=>b.rank-a.rank||Number(a.source!.bar)-Number(b.source!.bar));
  const byRank=new Map<number,DrillPattern[]>();kept.forEach(k=>byRank.set(k.rank,[...(byRank.get(k.rank)??[]),k]));
  const picked:DrillPattern[]=[];
  while(picked.length<PER_PIECE&&[...byRank.values()].some(l=>l.length))for(const l of byRank.values()){const k=l.shift();if(k&&picked.length<PER_PIECE)picked.push(k)}
  result.push(...picked);
  console.log(`${piece.title}: ${picked.length} of ${kept.length} bars`);
}
writeFileSync(join(ROOT,"app/flute-studio/rhythm-drills/real-bars.json"),JSON.stringify(result)+"\n");
console.log(`wrote ${result.length} bars`);
