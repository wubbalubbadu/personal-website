/**
 * Moving the studio between devices without an account or a server.
 *
 * Everything the studio remembers lives in this browser's localStorage under
 * keys starting with "cookie". A transfer code is those keys as JSON, gzipped
 * and written in URL-safe base64 behind a short version tag:
 *
 *   CFS1.<base64url(gzip(JSON))>
 *
 * The same text can travel as a copied code (Notes, Messages, email, WeChat)
 * or as a small .txt file. Reading it back merges into what the receiving
 * device already has (see `merge`). Conflict rules preserve separate records,
 * and a code made without the pencil drawings never touches the
 * drawings already there.
 */

const TAG="CFS1.";

/** Keys that describe this screen rather than you: they stay on each device. */
const DEVICE_ONLY=[/^cookie:private-music-code$/,/^cookie:rail-open$/,/^cookie:pet-position$/,/^cookie:reader-view:/];
const isStudioKey=(key:string)=>key.startsWith("cookie")&&!DEVICE_ONLY.some(rule=>rule.test(key));
/** Pencil ink is stored as drawn strokes and is by far the biggest thing kept. */
export const isDrawing=(key:string)=>key.endsWith(":ink")||/:annotations:v2$/.test(key);

export type Snapshot={at:string;data:Record<string,string>};

export function collect(withDrawings:boolean):Snapshot{
  const data:Record<string,string>={};
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    if(!key||!isStudioKey(key)||(!withDrawings&&isDrawing(key)))continue;
    const value=localStorage.getItem(key);
    if(value!==null)data[key]=value;
  }
  return {at:new Date().toISOString(),data};
}

/** Bytes the drawings on this device take, so the page can say what leaving them out saves. */
export function drawingSize(){
  let size=0;
  for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key&&isDrawing(key))size+=localStorage.getItem(key)?.length??0}
  return size;
}

async function gzip(text:string,direction:"compress"|"decompress"){
  const stream=direction==="compress"?new CompressionStream("gzip"):new DecompressionStream("gzip");
  const source=direction==="compress"?new Blob([text]).stream():new Blob([fromBase64(text) as BlobPart]).stream();
  return new Response(source.pipeThrough(stream));
}
function toBase64(bytes:Uint8Array){
  let binary="";
  // In slices: spreading 100 KB into one fromCharCode call overflows the stack.
  for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
  return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function fromBase64(text:string){
  const binary=atob(text.replace(/-/g,"+").replace(/_/g,"/"));
  return Uint8Array.from(binary,char=>char.charCodeAt(0));
}

export async function encode(snapshot:Snapshot){
  const packed=await (await gzip(JSON.stringify(snapshot),"compress")).arrayBuffer();
  return TAG+toBase64(new Uint8Array(packed));
}

/** Why a pasted code can't be read, in words for the page. */
export type DecodeError="not-a-code"|"damaged";

export async function decode(input:string):Promise<Snapshot|DecodeError>{
  // Messages and Notes like to wrap long text, so whitespace is ignored.
  const code=input.replace(/\s+/g,"");
  if(!code.startsWith(TAG))return "not-a-code";
  try{
    const parsed=JSON.parse(await (await gzip(code.slice(TAG.length),"decompress")).text());
    if(typeof parsed?.at!=="string"||typeof parsed.data!=="object"||!parsed.data)return "damaged";
    // Only studio keys, and only strings, are ever written back.
    const data:Record<string,string>={};
    for(const [key,value] of Object.entries(parsed.data))if(isStudioKey(key)&&typeof value==="string")data[key]=value;
    return {at:parsed.at,data};
  }catch{return "damaged"}
}

export function apply(snapshot:Snapshot){
  for(const [key,value] of Object.entries(snapshot.data))localStorage.setItem(key,merge(localStorage.getItem(key),value,key));
}

/**
 * One stored value, from this device (`here`) and from the code (`arriving`).
 *
 * - Lists of records or ids (practice sessions, pitch history, saved music,
 *   saved scale sets) are combined, so practice done on either device is
 *   kept. The same record on both sides keeps the newer copy. Legacy lists
 *   do not carry deletion history.
 * - Objects (book progress and tempos) merge field by field.
 * - Tricky-bit tempos combine; goals and steps take the code value. Tallies
 *   keep the higher count, avoiding inflation on repeated imports.
 * - Current annotations merge by mark ID and edit/deletion timestamp.
 * - A music list status (Want to learn, Working on, Learned) keeps whichever
 *   was set last, on either device, including a timestamped removal.
 * - Preferences (Scale Studio and Long tones setups) take the code's value
 *   whole: they hold lists of choices, and combining two setups would make
 *   one nobody picked.
 * - Anything else, a setting, takes the code's value.
 */
export function merge(here:string|null,arriving:string,key=""){
  if(here===null||here===arriving)return arriving;
  if(WHOLE.some(rule=>rule.test(key)))return arriving;
  try{
    const old=JSON.parse(here),next=JSON.parse(arriving);
    if(/:annotations:v2$/.test(key)&&isObject(old)&&isObject(next)&&Array.isArray(old.marks)&&Array.isArray(next.marks)){
      const marks=new Map<string,unknown>(),sync:Record<string,unknown>={};
      for(const doc of [old,next]){
        const revisions=isObject(doc.sync)?doc.sync:{};
        const candidates=new Map<string,Record<string,unknown>>();
        for(const mark of doc.marks as unknown[])if(isObject(mark)&&typeof mark.id==="string")candidates.set(mark.id,mark);
        for(const id of new Set([...candidates.keys(),...Object.keys(revisions)])){
          const revision=isObject(revisions[id])?revisions[id]:{at:0};
          const existing=isObject(sync[id])?sync[id]:null;
          if(existing&&Number(existing.at)>Number(revision.at))continue;
          sync[id]=revision;
          if(revision.deleted)marks.delete(id);
          else if(candidates.has(id))marks.set(id,candidates.get(id));
        }
      }
      return JSON.stringify({...old,...next,marks:[...marks.values()],sync});
    }
    if(key==="cookie:tricky-bits:v1"&&Array.isArray(old)&&Array.isArray(next)){
      const bits=new Map<string,Record<string,unknown>>();
      for(const bit of [...old,...next])if(isObject(bit)&&typeof bit.id==="string"){
        const previous=bits.get(bit.id);
        bits.set(bit.id,{...previous,...bit,tempos:[...new Set([...(Array.isArray(previous?.tempos)?previous.tempos:[]),...(Array.isArray(bit.tempos)?bit.tempos:[])])].sort((a,b)=>Number(a)-Number(b))});
      }
      return JSON.stringify([...bits.values()]);
    }
    if(key==="cookie:tricky-bits:tallies:v1"&&isObject(old)&&isObject(next)){
      const tallies={...old};
      for(const [id,count] of Object.entries(next))tallies[id]=Math.max(Number(old[id])||0,Number(count)||0);
      return JSON.stringify(tallies);
    }
    return JSON.stringify(STATUS.test(key)?newest(old,next):combine(old,next));
  }catch{return arriving}
}

/** Stored whole: the code's copy replaces this device's. */
const WHOLE=[/:preferences:/];
/** `{id:{status,at}}`: per piece, the later change wins. */
const STATUS=/^cookie:music-status:v1$/;
function newest(here:unknown,arriving:unknown){
  if(!isObject(here)||!isObject(arriving))return arriving;
  const out:Record<string,unknown>={...here};
  for(const [id,entry] of Object.entries(arriving)){
    const mine=out[id];
    const mineAt=isObject(mine)&&typeof mine.at==="number"?mine.at:-Infinity,theirsAt=isObject(entry)&&typeof entry.at==="number"?entry.at:-Infinity;
    if(!(id in out)||theirsAt>=mineAt)out[id]=entry;
  }
  return out;
}

const isObject=(value:unknown):value is Record<string,unknown>=>typeof value==="object"&&value!==null&&!Array.isArray(value);
/** Lists worth combining hold records or ids (names, or numbers like a book's pieces); a list of true/false is positional (ticks on a checklist). */
const isCollection=(list:unknown[])=>list.every(item=>typeof item==="string"||typeof item==="number"||isObject(item));
const identity=(item:unknown)=>isObject(item)&&typeof item.id==="string"?`id:${item.id}`:JSON.stringify(item);
const TIME_FIELDS=["at","startedAt","date","savedAt"];
const timeOf=(item:unknown)=>{
  if(!isObject(item))return null;
  const field=TIME_FIELDS.find(name=>name in item);
  const time=field?new Date(item[field] as string|number).getTime():NaN;
  return Number.isNaN(time)?null:time;
};

function combine(here:unknown,arriving:unknown):unknown{
  if(Array.isArray(here)&&Array.isArray(arriving)&&isCollection(here)&&isCollection(arriving)){
    // The code's copy of a record wins over this device's copy of the same
    // one, unless this device's copy is the newer.
    const byIdentity=new Map<string,unknown>();
    for(const item of [...here,...arriving]){
      const key=identity(item),existing=byIdentity.get(key),existingAt=timeOf(existing),at=timeOf(item);
      if(existing!==undefined&&existingAt!==null&&at!==null&&existingAt>at)continue;
      byIdentity.set(key,item);
    }
    const merged=[...byIdentity.values()];
    // Records with a time keep time order, in whichever direction the list
    // ran on this device (the order the studio writes it in).
    if(merged.length>1&&merged.every(item=>timeOf(item)!==null)){
      const sample=here.length>1?here:arriving;
      const newestFirst=sample.length>1&&timeOf(sample[0])!>timeOf(sample[sample.length-1])!;
      merged.sort((a,b)=>newestFirst?timeOf(b)!-timeOf(a)!:timeOf(a)!-timeOf(b)!);
    }
    return merged;
  }
  if(isObject(here)&&isObject(arriving)){
    const out:Record<string,unknown>={...here};
    for(const [key,value] of Object.entries(arriving))out[key]=key in here?combine(here[key],value):value;
    return out;
  }
  return arriving;
}

/**
 * What a snapshot holds, in the words the rest of the studio uses. Each key
 * lands in the first group whose rule matches; anything unmatched is a setting.
 */
const GROUPS:{id:string;en:string;zh:string;match:RegExp}[]=[
  {id:"saved",en:"Your lists and saved sets",zh:"你的列表和保存的组合",match:/-favorites$|^cookie:music-status|^cookie:scale-book:sets/},
  {id:"scales",en:"Scale Studio setup and tempos",zh:"音阶练习设置和速度",match:/^cookie:scale-book:(preferences|tempos)|^cookie:long-tones|^cookie:reichert:tempos|^cookie:score-tempo/},
  {id:"practice",en:"Practice history, routine and timer",zh:"练习记录、日程和计时",match:/^cookie:practice-|^cookie:pomodoro|^cookie:tricky-bits/},
  {id:"pitch",en:"Pitch history and pitch tests",zh:"音准记录和音准测试",match:/^cookie:pitch-history|^cookie:tendency-tests/},
  {id:"progress",en:"Lessons, books and roadmap",zh:"课程、练习曲集和路线图进度",match:/theory|^cookie:book-progress|^cookie:roadmap/},
  {id:"drawings",en:"Pencil drawings",zh:"铅笔标注",match:/:ink$|:annotations:v2$/},
  {id:"marks",en:"Notes and marks on scores",zh:"谱子上的笔记和记号",match:/:annotations|:notes$/},
  {id:"recent",en:"Recently opened",zh:"最近打开",match:/-recents$/},
];

export function describe(snapshot:Snapshot,zh:boolean){
  const counts=new Map<string,number>();
  for(const key of Object.keys(snapshot.data)){
    const id=GROUPS.find(group=>group.match.test(key))?.id??"settings";
    counts.set(id,(counts.get(id)??0)+1);
  }
  return [...GROUPS,{id:"settings",en:"Settings",zh:"设置"}]
    .filter(group=>counts.has(group.id))
    .map(group=>zh?group.zh:group.en);
}
