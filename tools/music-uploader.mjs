import {readAccompaniment} from "../app/flute-studio/components/accompaniment.ts";
import {privateStore} from "./private-music.mjs";
import http from "node:http";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {mkdtemp,readFile,writeFile,mkdir,rm,access,rename} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {splitBook} from "./book-split.mjs";
import {suggestedTempo,sameWord} from "./tempo.mjs";

const run=promisify(execFile);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const privateMusic=privateStore(root);
const catalogPath=path.join(root,"content/music-catalog.json");
const termsPath=path.join(root,"content/music-terms.json");
const composersPath=path.join(root,"content/composers.json");
const booksPath=path.join(root,"content/music-books.json");
const museScore=process.env.MUSESCORE_PATH||"/Applications/MuseScore 4.app/Contents/MacOS/mscore";
const port=Number(process.env.MUSIC_UPLOADER_PORT||4317);

function json(res,status,value){res.writeHead(status,{"content-type":"application/json; charset=utf-8"});res.end(JSON.stringify(value))}
async function body(req){const chunks=[];for await(const chunk of req)chunks.push(chunk);return Buffer.concat(chunks)}
function slug(value){return value.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
function textBetween(xml,patterns){for(const pattern of patterns){const match=xml.match(pattern);if(match?.[1])return match[1].replace(/<[^>]+>/g,"").trim()}return ""}
function inferred(xml,filename){
  const embeddedTitle=textBetween(xml,[/<work-title>([\s\S]*?)<\/work-title>/i,/<movement-title>([\s\S]*?)<\/movement-title>/i,/<credit-words[^>]*>([\s\S]*?)<\/credit-words>/i]);
  const composer=textBetween(xml,[/<creator[^>]*type=["']composer["'][^>]*>([\s\S]*?)<\/creator>/i]);
  const title=/^(www\.|https?:\/\/)/i.test(embeddedTitle)?"":embeddedTitle;
  return {title:title||filename.replace(/\.(mscz|mscx)$/i,""),composer,tempo:markedTempo(xml)};
}
// The first <sound tempo="…"> is what the reader's metronome uses when no tempo is set.
function markedTempo(xml){const value=Number(xml.match(/<sound[^>]*\btempo=["']([\d.]+)["']/i)?.[1]);return value>0?Math.round(value):null}
// Blank means "use the score's marking, else the reader default"; anything else must be a sane BPM.
function tempoField(value){if(value===null||value===undefined||String(value).trim()==="")return undefined;const bpm=Math.round(Number(value));if(!(bpm>=20&&bpm<=300))throw new Error("Tempo should be a number between 20 and 300.");return bpm}
// Free-text tags, trimmed and de-duplicated ignoring case ("pop" and "Pop" are one tag).
function tagList(value){const seen=new Set();return (Array.isArray(value)?value:[]).map(tag=>String(tag).trim().replace(/\s+/g," ")).filter(tag=>tag&&tag.length<=30&&!seen.has(tag.toLowerCase())&&seen.add(tag.toLowerCase()))}
/**
 * A loose "good first piece" suggestion, read from the reading part's notes.
 * Only shown once when a file is converted; the checkbox is what gets saved,
 * so a piece that passes (or fails) on paper can still be decided by ear.
 */
const STEPS={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function noteName(midi){return ["C","C♯","D","E♭","E","F","F♯","G","A♭","A","B♭","B"][midi%12]+(Math.floor(midi/12)-1)}
function beginnerCheck(xml){
  const notes=[...xml.matchAll(/<note\b[^>]*>([\s\S]*?)<\/note>/gi)].map(match=>match[1]).filter(note=>!/<rest\b|<grace\b/i.test(note));
  const pitches=notes.map(note=>{const step=note.match(/<step>([A-G])<\/step>/)?.[1],octave=Number(note.match(/<octave>(-?\d+)<\/octave>/)?.[1]),alter=Number(note.match(/<alter>(-?[\d.]+)<\/alter>/)?.[1]||0);return step&&Number.isFinite(octave)?(octave+1)*12+STEPS[step]+alter:null}).filter(value=>value!==null);
  if(!pitches.length)return {beginner:false,reasons:["No notes were found in the reading part."]};
  const low=Math.min(...pitches),high=Math.max(...pitches),signed=[...xml.matchAll(/<fifths>(-?\d+)<\/fifths>/g)].map(match=>Number(match[1])).sort((x,y)=>Math.abs(y)-Math.abs(x))[0]||0,fifths=Math.abs(signed);
  const types=notes.map(note=>note.match(/<type>([^<]+)<\/type>/)?.[1]||""),tiny=types.filter(type=>/^(32nd|64th|128th)$/.test(type)).length,sixteenths=types.filter(type=>type==="16th").length;
  const accidentals=notes.filter(note=>/<accidental\b/i.test(note)).length;
  const range=`range ${noteName(low)} to ${noteName(high)}`,key=fifths?`${fifths} ${signed>0?"sharp":"flat"}${fifths===1?"":"s"}`:"no sharps or flats";
  const problems=[];
  if(high>91)problems.push(`goes up to ${noteName(high)}`);
  if(high-low>24)problems.push("spans more than two octaves");
  if(fifths>3)problems.push(`key has ${key}`);
  if(tiny)problems.push("has 32nd notes or faster");
  else if(sixteenths>notes.length*.2)problems.push("is mostly 16th notes");
  // Minor keys raise a note all the time (G♯ in A minor), so allow some accidentals.
  if(accidentals>notes.length*.15)problems.push(`has ${accidentals} accidentals`);
  // Speed of the running notes: MusicXML tempo is always quarters per minute,
  // so a piece that is mostly eighths moves at twice the marking. The Minuet
  // (eighths at 120, 240 a minute) is over; Danny Boy (eighths at 72) is not.
  const beat=markedTempo(xml),share=type=>types.filter(value=>value===type).length/notes.length;
  const running=beat?(share("16th")>=.25?beat*4:share("eighth")>=.25?beat*2:beat):0;
  if(running>200)problems.push(`runs about ${Math.round(running)} notes a minute`);
  return problems.length?{beginner:false,reasons:[`Not suggested: ${problems.join(", ")}.`]}:{beginner:true,reasons:[`Suggested: ${range}, ${key}, few accidentals.`]};
}
/**
 * Markings the reader's glossary (content/music-terms.json) cannot explain.
 * Words are split exactly the way the reader splits them (scoreTheory.ts
 * performanceTermText): lowercase, brackets and commas dropped, split on spaces, longest
 * known phrase first. Unknown words next to each other stay together, so
 * "en dehors" is offered as one phrase rather than "en" and "dehors".
 */
function unknownTerms(xml,terms){
  const phrases=Object.keys(terms).sort((a,b)=>b.split(" ").length-a.split(" ").length);
  const markings=[...[...xml.matchAll(/<words[^>]*>([^<]*)<\/words>/g)].map(match=>match[1]),...[...xml.matchAll(/<dynamics[^>]*>([\s\S]*?)<\/dynamics>/g)].flatMap(match=>[...match[1].matchAll(/<(?:other-dynamics>([^<]*)<\/other-dynamics|([a-z]+)\s*\/>)/g)].map(tag=>tag[1]??tag[2]))];
  const found=new Map();
  for(const raw of markings){
    const text=raw.replace(/&amp;/g,"&").trim(),words=text.toLowerCase().replace(/[(),;:]/g," ").split(/\s+/).filter(Boolean);
    let run=[];const flush=()=>{if(run.length){const term=run.join(" ");if(!found.has(term))found.set(term,text)}run=[]};
    for(let i=0;i<words.length;){
      const phrase=phrases.find(candidate=>candidate.split(" ").every((part,k)=>words[i+k]!==undefined&&sameWord(words[i+k],part)));
      if(phrase){flush();i+=phrase.split(" ").length;continue}
      // Numbers and symbols ("♩ = 84") are not words to explain.
      if(/\p{L}/u.test(words[i]))run.push(words[i]);else flush();
      i++;
    }
    flush();
  }
  return [...found].map(([term,context])=>({term,context}));
}
async function readTerms(){return JSON.parse(await readFile(termsPath,"utf8"))}
/** Adds new glossary entries (never overwrites one) and keeps the one-term-per-line layout. */
async function addTerms(value){
  if(!value||typeof value!=="object")return [];
  const terms=await readTerms(),added=[];
  for(const [rawTerm,rawMeaning] of Object.entries(value)){
    const term=String(rawTerm).trim().toLowerCase().replace(/\s+/g," "),meaning=String(rawMeaning??"").trim().replace(/\s+/g," ").replace(/\.$/,"");
    if(!term||term.length>40||!meaning||meaning.length>200||terms[term])continue;
    terms[term]={meaning};added.push(term);
  }
  if(added.length)await writeTerms(terms);
  return added;
}
/** One term per line, so the file stays easy to read and diff by hand. */
async function writeTerms(terms){await writeFile(termsPath,"{\n"+Object.entries(terms).map(([key,entry])=>`  ${JSON.stringify(key)}: ${JSON.stringify(entry)}`).join(",\n")+"\n}\n","utf8")}
/** The reading score of a piece already in the library, unzipping .mxl. */
async function storedScore(item){
  if(item.private){const entry=(await privateMusic.read()).find(entry=>entry.item.id===item.id);const file=entry?.files[item.scorePath];if(!file)throw new Error("Private score file missing.");return Buffer.from(file.data,"base64").toString("utf8")}
  const file=path.join(root,"public",item.scorePath.replace(/^\//,""));
  if(!file.toLowerCase().endsWith(".mxl"))return readFile(file,"utf8");
  const {stdout:list}=await run("unzip",["-Z1",file]),inner=list.split("\n").find(name=>/\.(xml|musicxml)$/i.test(name)&&!name.startsWith("META-INF"));
  if(!inner)throw new Error("No score inside "+item.scorePath);
  return (await run("unzip",["-p",file,inner],{maxBuffer:1024*1024*16})).stdout;
}
// Year written: a whole year, blank to leave it out. About: a sentence or two.
function yearField(value){if(value===null||value===undefined||String(value).trim()==="")return undefined;const year=Number(value);if(!Number.isInteger(year)||year<800||year>2100)throw new Error("Year written should be a year like 1887.");return year}
function withDetails(item,{tags,beginner,tempo,year,about},sourceXml){const next={...item,tags};if(sourceXml){const accompaniment=readAccompaniment(sourceXml,item.readingPartId||"P1");if(accompaniment.notes.length)next.accompanimentKind=accompaniment.kind;else delete next.accompanimentKind}if(next.accompanimentKind&&!next.tags.includes("Accompaniment"))next.tags=[...next.tags,"Accompaniment"];if(year===undefined)delete next.year;else next.year=year;if(about)next.about=about;else delete next.about;delete next.category;if(beginner)next.beginner=true;else delete next.beginner;if(tempo===undefined)delete next.defaultTempo;else next.defaultTempo=tempo;return next}
function scoreParts(xml){
  return [...xml.matchAll(/<score-part\s+id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/score-part>/gi)].map((match,index)=>{
    const id=match[1],body=match[2],part=xml.match(new RegExp(`<part\\s+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/part>`,"i"))?.[1]||"";
    const declared=Number(part.match(/<staves>(\d+)<\/staves>/i)?.[1]||0),used=[...part.matchAll(/<staff>(\d+)<\/staff>/gi)].map(value=>Number(value[1]));
    const staves=Math.max(1,declared,...used),name=textBetween(body,[/<part-name[^>]*>([\s\S]*?)<\/part-name>/i]),sound=textBetween(body,[/<instrument-sound[^>]*>([\s\S]*?)<\/instrument-sound>/i]);
    return {id,index,name:name&&!/^Voice\d+$/i.test(name)?name:"",sound,staves};
  });
}
function onePart(xml,id){
  const scorePart=[...xml.matchAll(/<score-part\s+id=["']([^"']+)["'][^>]*>[\s\S]*?<\/score-part>/gi)].find(match=>match[1]===id)?.[0];
  const part=[...xml.matchAll(/<part\s+id=["']([^"']+)["'][^>]*>[\s\S]*?<\/part>/gi)].find(match=>match[1]===id)?.[0];
  if(!scorePart||!part)throw new Error("The selected reading part could not be extracted.");
  return xml.replace(/<part-list>[\s\S]*?<\/part-list>/i,`<part-list>\n${scorePart}\n</part-list>`).replace(/<part\s+id=["'][^"']+["'][^>]*>[\s\S]*?<\/part>/gi,match=>match===part?match:"");
}
async function writeConvertedScore(scorePath,xml){
  const destination=path.join(root,"public",scorePath.replace(/^\//,""));
  await mkdir(path.dirname(destination),{recursive:true});
  if(!scorePath.toLowerCase().endsWith(".mxl")){await writeFile(destination,xml,"utf8");return}
  const dir=await mkdtemp(path.join(tmpdir(),"cookie-replace-")),input=path.join(dir,"score.musicxml"),output=path.join(dir,"score.mxl");
  try{await writeFile(input,xml,"utf8");await run(museScore,["-o",output,input],{timeout:60000,maxBuffer:1024*1024*4});await writeFile(destination,await readFile(output))}finally{await rm(dir,{recursive:true,force:true})}
}
/**
 * Adds a book: one short score per piece (split at MuseScore's section
 * breaks, see book-split.mjs), each an ordinary catalog item carrying its
 * book and number, plus one entry in music-books.json for the book's own
 * Library row and page. Never overwrites an existing book.
 */
async function publishBook({xml,title,composer,tags,year,about,addedTerms}){
  const terms=await readTerms(),pieces=splitBook(xml).map(piece=>({...piece,tempo:suggestedTempo(piece.xml,terms)}));
  if(pieces.length<2)throw Object.assign(new Error("No section breaks were found, so this is one piece. Untick “Add as a book” to add it on its own."),{status:400});
  const id=slug(`${composer}-${title}`);if(!id)throw Object.assign(new Error("Could not generate a URL from this title and composer."),{status:400});
  const catalog=JSON.parse(await readFile(catalogPath,"utf8")),books=JSON.parse(await readFile(booksPath,"utf8"));
  if(books.some(book=>book.id===id)||catalog.some(item=>item.id===id||item.book?.id===id))throw Object.assign(new Error(`${id} is already in the library. Nothing was overwritten.`),{status:409});
  const folder=path.join(root,"public/music",id);
  try{await access(folder);throw Object.assign(new Error(`${id} already exists. Nothing was overwritten.`),{status:409})}catch(error){if(error.status)throw error}
  await mkdir(folder,{recursive:false});
  try{
    for(const piece of pieces){
      const n=String(piece.number).padStart(2,"0"),file=`no-${n}.musicxml`,pieceId=`${id}-no-${n}`;
      await writeFile(path.join(folder,file),piece.xml,"utf8");
      catalog.push(withDetails({id:pieceId,title:`No. ${piece.number}`,composer,status:"published",scorePath:`/music/${id}/${file}`,viewerPath:`/flute-studio/music/${pieceId}`,
        book:{id,number:piece.number,...(piece.opening?{opening:piece.opening}:{}),bars:piece.bars,...(piece.time?{time:piece.time}:{})}},{tags,beginner:false,tempo:piece.tempo,year,about:""}));
    }
    books.push({id,title,composer,tags,...(year!==undefined?{year}:{}),...(about?{about}:{})});
    catalog.sort((a,b)=>a.title.localeCompare(b.title));books.sort((a,b)=>a.title.localeCompare(b.title));
    await writeFile(catalogPath,JSON.stringify(catalog,null,2)+"\n","utf8");
    await writeFile(booksPath,JSON.stringify(books,null,2)+"\n","utf8");
    return {id,title,viewerPath:`/flute-studio/music/books/${id}`,book:true,count:pieces.length,addedTerms};
  }catch(error){await rm(folder,{recursive:true,force:true});throw error}
}
async function publishPrivate({data,title,composer,tags,beginner,tempo,year,about,xml,replaceId,readingPartId,addedTerms}){
  if(data.asBook)throw Object.assign(new Error("Private uploads currently support individual pieces. Untick Add as a book."),{status:400});
  const catalog=JSON.parse(await readFile(catalogPath,"utf8")),entries=await privateMusic.read();
  const prior=entries.find(entry=>entry.item.id===replaceId),publicItem=catalog.find(item=>item.id===replaceId);
  if(replaceId&&!prior&&!publicItem)throw Object.assign(new Error("That piece is no longer in the library."),{status:404});
  const id=replaceId||slug(`${composer}-${title}`);
  if(!id||(!replaceId&&(catalog.some(item=>item.id===id)||entries.some(entry=>entry.item.id===id))))throw Object.assign(new Error("That piece already exists, or the title cannot make a URL."),{status:409});
  const files={...(prior?.files??{})};
  if(publicItem){
    if(publicItem.excerpt||publicItem.book)throw Object.assign(new Error("Move individual MusicXML pieces only; book and scan privacy needs a separate workflow."),{status:400});
    for(const key of ['scorePath','fullScorePath','pdfPath'])if(publicItem[key]){
      const bytes=key==='scorePath'?Buffer.from(await storedScore(publicItem)):await readFile(path.join(root,'public',publicItem[key].replace(/^\//,'')));
      files[publicItem[key]]={data:bytes.toString('base64'),type:key==='pdfPath'?'application/pdf':'application/xml'};
    }
  }
  let item=withDetails({...publicItem,...prior?.item,readingPartId:readingPartId||prior?.item.readingPartId||publicItem?.readingPartId,id,title,composer,private:true,status:'published',viewerPath:`/flute-studio/music/${id}`},{tags,beginner,tempo,year,about},xml);
  if(xml){
    const reading=readingPartId?onePart(xml,readingPartId):xml;
    item={...item,scorePath:`/music/${id}/score.musicxml`,fullScorePath:`/music/${id}/full-score.musicxml`,readingPartId:readingPartId||undefined};
    files[item.scorePath]={data:Buffer.from(reading).toString('base64'),type:'application/xml'};
    files[item.fullScorePath]={data:Buffer.from(xml).toString('base64'),type:'application/xml'};
  }
  if(!item.scorePath||!files[item.scorePath])throw Object.assign(new Error("Convert a score before saving."),{status:400});
  await privateMusic.save([...entries.filter(entry=>entry.item.id!==id),{item,files}]);
  // Archive the exact public directory before removing the catalog row. No original is discarded.
  if(publicItem){
    const directory=path.join(root,'public/music',id),backup=path.join(root,'.private-music/originals',id+'-'+Date.now());
    await mkdir(path.dirname(backup),{recursive:true});
    await rename(directory,backup);
    await writeFile(catalogPath,JSON.stringify(catalog.filter(entry=>entry.id!==id),null,2)+'\n');
  }
  return {...item,detailsOnly:!xml,replaced:!!replaceId,addedTerms};
}
async function formData(req){
  const raw=await body(req);
  const request=new Request("http://127.0.0.1/upload",{method:"POST",headers:{"content-type":req.headers["content-type"]||""},body:raw});
  return request.formData();
}

const html=String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Add music · Cookie Flute Studio</title>
<style>
[hidden]{display:none!important}:root{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,sans-serif;color:#292a33;background:#f6f5f2}*{box-sizing:border-box}body{margin:0}.shell{width:min(1040px,calc(100% - 32px));margin:0 auto;padding:54px 0 80px}.eyebrow{margin:0 0 8px;color:#777970;font-size:12px;font-weight:750;letter-spacing:.1em;text-transform:uppercase}h1{margin:0;font-size:42px;letter-spacing:-.04em}.intro{margin:12px 0 30px;color:#6d6f76}.grid{display:grid;grid-template-columns:360px minmax(0,1fr);gap:24px;align-items:start}.panel{background:#fff;border:1px solid #e3e2df;border-radius:22px;box-shadow:0 10px 35px #292a330d}.form{padding:22px}.drop{min-height:150px;border:1.5px dashed #b9bac0;border-radius:17px;display:grid;place-items:center;text-align:center;padding:22px;cursor:pointer;transition:.16s}.drop:hover,.drop.over{background:#f2f2f4;border-color:#666870}.drop input{position:absolute;opacity:0;pointer-events:none}.drop strong,.drop small{display:block}.drop small{margin-top:7px;color:#85868e}.fields{display:grid;gap:15px;margin-top:22px}label>span{display:block;margin:0 0 7px;font-size:12px;font-weight:700;color:#666870}textarea{width:100%;border:1px solid #dadbe0;border-radius:11px;background:#fff;padding:10px 12px;color:#292a33;font:inherit;resize:vertical}input,select{width:100%;height:45px;border:1px solid #dadbe0;border-radius:11px;background:#fff;padding:0 12px;color:#292a33;font:inherit}input:focus,select:focus{outline:3px solid #292a3320;border-color:#999ba2}.actions{display:flex;gap:9px;margin-top:20px}button{height:44px;border:0;border-radius:12px;padding:0 16px;font:700 14px/1 inherit;cursor:pointer}.convert{background:#ececef;color:#292a33}.publish{margin-left:auto;background:#292a33;color:#fff}.publish:disabled,.convert:disabled{opacity:.4;cursor:default}.status{min-height:20px;margin:15px 0 0;color:#696b72;font-size:13px;line-height:1.45}.preview{min-height:600px;padding:24px;overflow:auto}.preview.empty{display:grid;place-items:center;color:#9a9ba1}.preview svg{max-width:100%}.success{padding:16px;border-radius:13px;background:#edf5ea;color:#385232}.success a{color:inherit;font-weight:750}.field .label{display:block;margin:0 0 7px;font-size:12px;font-weight:700;color:#666870}.tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}.tag{height:30px;padding:0 11px;border:1px solid #dadbe0;border-radius:999px;background:#fff;color:#55575e;font:600 13px/1 inherit}.tag.on{background:#292a33;border-color:#292a33;color:#fff}.glossary{margin-top:24px;padding:22px}.composer-row{display:grid;grid-template-columns:200px 90px 90px 1fr 1fr;gap:8px;padding:12px 0;border-top:1px solid #eeeeec;align-items:start}.composer-row b{font-size:14px;padding-top:11px}.composer-row textarea{grid-column:2/-1}.composer-row .row-actions{grid-column:2/-1;display:flex;gap:8px}.composer-row input{height:38px}@media(max-width:800px){.composer-row{grid-template-columns:1fr}.composer-row textarea,.composer-row .row-actions{grid-column:auto}}.glossary h2{margin:0;font-size:20px;letter-spacing:-.02em}.glossary-head{display:flex;gap:16px;align-items:end;justify-content:space-between}.glossary-head p{margin:6px 0 0;color:#6d6f76;font-size:13px}.glossary-head input{max-width:260px}.glossary-add{display:grid;grid-template-columns:220px 1fr auto;gap:8px;margin-top:16px}.glossary-row{display:grid;grid-template-columns:220px 1fr auto auto;gap:8px;align-items:center;padding:7px 0;border-top:1px solid #eeeeec}.glossary-row b{font-size:14px;overflow-wrap:anywhere}.glossary-row small{display:block;color:#85868e;font-size:11px;font-weight:500}.glossary-row input{height:38px}.glossary-row button{height:38px}.glossary-row .remove{background:none;color:#9a4b3f;padding:0 8px}.glossary-row .save:disabled{opacity:.35}@media(max-width:800px){.glossary-head,.glossary-add,.glossary-row{grid-template-columns:1fr;display:grid}}.terms{display:grid;gap:10px;margin-top:10px}.term b{display:block;font-size:14px}.term small{display:block;margin:2px 0 6px;color:#85868e;font-size:12px}.check{display:flex;align-items:center;gap:9px;font-size:14px;font-weight:650}.check input{width:18px;height:18px;margin:0}.hint{display:block;margin-top:6px;color:#85868e;font-size:12px;line-height:1.4}@media(max-width:800px){.grid{grid-template-columns:1fr}.preview{min-height:420px}h1{font-size:36px}}
</style></head><body><main class="shell"><p class="eyebrow">Local music uploader</p><h1>Add or replace music</h1><p class="intro">Convert a MuseScore file, inspect the notation, then add it to the library.</p><div class="grid"><section class="panel form"><label class="drop" id="drop"><input id="file" type="file" accept=".mscz,.mscx"><span><strong id="fileName">Drop a MuseScore file</strong><small>.mscz or .mscx</small></span></label><div class="fields"><label><span>Save as</span><select id="replace"><option value="">New piece</option></select></label><label><span>Visibility</span><select id="visibility"><option value="public">Public library</option><option value="private">Private practice, access code required</option></select></label><div id="privateHint" class="hint" hidden>Private scores are encrypted. Use your private-library code in Cookie Settings. <button type="button" class="convert" id="showPrivateCode">Show access code</button><output id="privateCode"></output></div><label><span>Title</span><input id="title" autocomplete="off"></label><label><span>Composer</span><input id="composer" autocomplete="off" placeholder="Full name, like Gabriel Fauré"><small class="hint" id="composerHint"></small></label><label><span>Year written (optional)</span><input id="year" type="number" min="800" max="2100" inputmode="numeric" placeholder="Like 1887"></label><label><span>About this piece (optional)</span><textarea id="about" rows="3" placeholder="Where it comes from, like: the main theme of the last movement of Beethoven's Ninth Symphony."></textarea></label><div class="field"><span class="label">Tags</span><div class="tags" id="tags"></div><input id="tagInput" autocomplete="off" placeholder="Add a tag, like J-pop, then press Enter"></div><div class="field"><label class="check"><input type="checkbox" id="beginner"><span>Good first piece</span></label><small class="hint" id="beginnerHint">Shows the piece on the Good first pieces shelf. Convert a file to get a suggestion.</small></div><div class="field" id="termsWrap" hidden><span class="label">Musical terms</span><small class="hint" id="termsHint"></small><div class="terms" id="terms"></div></div><label><span>Metronome tempo (optional)</span><input id="tempo" type="number" min="20" max="300" inputmode="numeric" placeholder="Beats per minute"><small class="hint" id="tempoHint">Leave empty to set it from the score: its metronome mark, else its tempo word (Allegro, Moderato…), else 60.</small></label><label id="partWrap" hidden><span>Reading part</span><select id="part"></select></label></div><div class="field" id="bookWrap" hidden><label class="check"><input type="checkbox" id="asBook" checked><span>Add as a book</span></label><small class="hint" id="bookHint"></small></div><div class="actions"><button class="convert" id="convert" disabled>Convert and preview</button><button class="publish" id="publish" disabled>Add to library</button></div><p class="status" id="status"></p></section><section class="panel preview empty" id="preview">The converted score will appear here.</section></div><section class="panel glossary"><div class="glossary-head"><div><h2>Composers</h2><p>The card that opens when you tap a composer's name in the reader. Only composers with a bio get one; Traditional and pop artists can stay without.</p></div></div><p class="status" id="composerStatus"></p><div id="composers"></div></section><section class="panel glossary"><div class="glossary-head"><div><h2>Glossary</h2><p>What the reader shows when you tap a marking with Musical terms on. Fix a meaning and press Save, or add a term the uploader has not seen.</p></div><input id="glossarySearch" type="search" placeholder="Search terms" autocomplete="off"></div><div class="glossary-add"><input id="newTerm" placeholder="New term, like sans rigueur" autocomplete="off"><input id="newMeaning" placeholder="What it means" autocomplete="off"><button type="button" class="convert" id="addTerm">Add</button></div><p class="status" id="glossaryStatus"></p><div id="glossary"></div></section></main><script src="/osmd.js"></script><script type="module">
import {installGhostNoteFix} from "/ghost-note-fix.js";
let sections=[];const bookWrap=document.querySelector('#bookWrap'),asBook=document.querySelector('#asBook'),bookHint=document.querySelector('#bookHint');
function showBook(){bookWrap.hidden=!sections.length||!!replace.value;bookHint.textContent=sections.length?sections.length+' pieces, split at the section breaks. The title above names the book; each piece is saved as No. 1, No. 2 and so on. '+sections.map(s=>'No. '+s.number+(s.opening?' '+s.opening:'')+' ('+s.bars+' bars'+(s.tempo?', metronome '+s.tempo:'')+')').join(' · '):''}
const visibility=document.querySelector('#visibility'),privateHint=document.querySelector('#privateHint');
visibility.onchange=()=>{privateHint.hidden=visibility.value!=='private'};
document.querySelector('#showPrivateCode').onclick=async()=>{const result=await (await fetch('/private-code')).json();document.querySelector('#privateCode').textContent=result.code};
const file=document.querySelector('#file'),drop=document.querySelector('#drop'),fileName=document.querySelector('#fileName'),convert=document.querySelector('#convert'),publish=document.querySelector('#publish'),status=document.querySelector('#status'),preview=document.querySelector('#preview'),title=document.querySelector('#title'),composer=document.querySelector('#composer'),tagsBox=document.querySelector('#tags'),tagInput=document.querySelector('#tagInput'),beginner=document.querySelector('#beginner'),beginnerHint=document.querySelector('#beginnerHint'),termsWrap=document.querySelector('#termsWrap'),termsHint=document.querySelector('#termsHint'),termsBox=document.querySelector('#terms'),replace=document.querySelector('#replace'),part=document.querySelector('#part'),partWrap=document.querySelector('#partWrap'),tempo=document.querySelector('#tempo'),year=document.querySelector('#year'),about=document.querySelector('#about'),composerHint=document.querySelector('#composerHint'),tempoHint=document.querySelector('#tempoHint');let xml='',catalog=[],partScores={},partChecks={},partTerms={},termList=null,chosenTags=[];
// Markings the reader's glossary can't explain yet. A meaning typed here is
// added to content/music-terms.json when the piece is saved; blank ones are skipped.
function showTerms(){const list=termList;termsWrap.hidden=!list;if(!list)return;termsHint.textContent=list.length?'These markings have no explanation yet. Write what each one means and it will be added to the glossary when you save. Leave a box empty to skip it.':'Every marking in this score already has an explanation.';termsBox.replaceChildren(...list.map(({term,context})=>{const row=document.createElement('label');row.className='term';const name=document.createElement('b'),where=document.createElement('small'),input=document.createElement('input');name.textContent=term;where.textContent=context.toLowerCase()===term?'Written on its own in the score':'In the score as “'+context+'”';input.dataset.term=term;input.placeholder='What it means, like: calmly (French)';input.autocomplete='off';row.append(name,where,input);return row}))}
// Picking a piece that is already in the library (no new file) checks its
// stored score, so markings skipped at upload can be explained now.
async function scanExisting(){if(xml)return;termList=null;showTerms();if(!replace.value)return;try{const response=await fetch('/scan?id='+encodeURIComponent(replace.value)),result=await response.json();if(response.ok&&!xml)termList=result.terms;showTerms()}catch{}}
function typedTerms(){return Object.fromEntries([...termsBox.querySelectorAll('input[data-term]')].map(input=>[input.dataset.term,input.value.trim()]).filter(([,meaning])=>meaning))}
const sameTag=(a,b)=>a.trim().toLowerCase()===b.trim().toLowerCase();
function renderTags(){const known=[];for(const tag of [...catalog.flatMap(item=>item.tags||[]),...chosenTags])if(!known.some(value=>sameTag(value,tag)))known.push(tag);tagsBox.replaceChildren(...known.map(tag=>{const button=document.createElement('button');button.type='button';button.className='tag'+(chosenTags.some(value=>sameTag(value,tag))?' on':'');button.textContent=tag;button.onclick=()=>{chosenTags=chosenTags.some(value=>sameTag(value,tag))?chosenTags.filter(value=>!sameTag(value,tag)):[...chosenTags,tag];renderTags()};return button}))}
tagInput.addEventListener('keydown',event=>{if(event.key!=='Enter'&&event.key!==',')return;event.preventDefault();const tag=tagInput.value.trim().replace(/,$/,'');if(tag&&!chosenTags.some(value=>sameTag(value,tag)))chosenTags.push(tag);tagInput.value='';renderTags()});
// The suggestion only pre-ticks the box for a new piece; replacing a score keeps what was decided before.
function showCheck(apply){const check=partChecks[part.value];if(!check)return;beginnerHint.textContent=check.reasons.join(' ');if(apply)beginner.checked=check.beginner}
function showMarked(bpm){tempoHint.textContent=bpm?'Leave empty to use the score\u2019s marking: '+bpm+' BPM.':'This score has no tempo marking. Leave empty to use 60.'}
function syncPublish(){publish.disabled=!xml&&!replace.value;publish.textContent=replace.value?(xml?'Replace score':'Save details'):'Add to library'}
function choose(f){if(!f)return;if(!/\.(mscz|mscx)$/i.test(f.name)){status.textContent='Choose a .mscz or .mscx file.';return}fileName.textContent=f.name;sections=[];showBook();convert.disabled=false;xml='';partTerms={};termList=null;showTerms();syncPublish();preview.className='panel preview empty';preview.textContent='Ready to convert.'}
file.addEventListener('change',()=>choose(file.files[0]));drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('over')});drop.addEventListener('dragleave',()=>drop.classList.remove('over'));drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('over');const f=e.dataTransfer.files[0];const dt=new DataTransfer();dt.items.add(f);file.files=dt.files;choose(f)});
async function renderScore(value){installGhostNoteFix(opensheetmusicdisplay.VexFlowConverter);preview.className='panel preview';preview.replaceChildren();const osmd=new opensheetmusicdisplay.OpenSheetMusicDisplay(preview,{backend:'svg',autoResize:true,drawTitle:false,drawComposer:false,drawingParameters:'compacttight'});osmd.EngravingRules.RenderChordSymbols=false;await osmd.load(value);osmd.render()}
convert.addEventListener('click',async()=>{convert.disabled=true;publish.disabled=true;status.textContent='MuseScore is converting the file…';try{const data=new FormData();data.append('score',file.files[0]);const response=await fetch('/convert',{method:'POST',body:data}),result=await response.json();if(!response.ok)throw new Error(result.error);xml=result.xml;partScores=result.partScores;sections=result.sections||[];showBook();if(!title.value||title.value==='www.flutetunes.com')title.value=result.inferred.title;if(!composer.value)composer.value=result.inferred.composer;showMarked(result.inferred.tempo);part.replaceChildren();for(const item of result.parts){const option=document.createElement('option');option.value=item.id;option.textContent=(item.name||'Part '+(item.index+1))+' · '+item.staves+(item.staves===1?' staff':' staves');part.append(option)}part.value=result.suggestedPartId;partWrap.hidden=!result.needsPartChoice;partChecks=result.partChecks||{};partTerms=result.partTerms||{};termList=partTerms[part.value]??null;showCheck(!replace.value);showTerms();await renderScore(partScores[part.value]||xml);status.textContent=result.needsPartChoice?'Several one-staff parts were found. Choose the part the student should read.':'Conversion complete. The reading score and any accompaniment were separated automatically.';syncPublish()}catch(error){publish.disabled=true;console.error('Music preview failed',error);status.textContent=error.message||'Conversion failed.'}finally{convert.disabled=false}});
part.addEventListener('change',async()=>{publish.disabled=true;showCheck(!replace.value);termList=partTerms[part.value]??null;showTerms();try{await renderScore(partScores[part.value]||xml);syncPublish()}catch(error){status.textContent=error.message||'Preview failed.'}});
replace.addEventListener('change',showBook);replace.addEventListener('change',()=>{const item=catalog.find(entry=>entry.id===replace.value);if(item){visibility.value=item.private?'private':'public';visibility.onchange();title.value=item.title;composer.value=item.composer;chosenTags=[...(item.tags||[])];beginner.checked=!!item.beginner;year.value=item.year??'';about.value=item.about??'';tempo.value=item.defaultTempo??'';showMarked(item.markedTempo)}else{tempo.value='';year.value='';about.value='';chosenTags=[];beginner.checked=false}checkComposer();renderTags();syncPublish();scanExisting()});
fetch('/catalog').then(response=>response.json()).then(items=>{catalog=items;for(const item of items){const option=document.createElement('option');option.value=item.id;option.textContent=(item.private?'[Private] ':'')+item.title+' · '+item.composer;replace.append(option)}renderTags();loadComposers()});
publish.addEventListener('click',async()=>{if(!title.value.trim()||!composer.value.trim()){status.textContent='Add both a title and composer before publishing.';return}publish.disabled=true;status.textContent=replace.value?(xml?'Replacing the existing score…':'Saving the details…'):'Adding the score to the library…';try{const response=await fetch('/publish',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({private:visibility.value==='private',xml,title:title.value.trim(),composer:composer.value.trim(),tags:chosenTags,beginner:beginner.checked,terms:typedTerms(),year:year.value,about:about.value,replaceId:replace.value||null,readingPartId:part.value||null,tempo:tempo.value,asBook:!bookWrap.hidden&&asBook.checked})}),result=await response.json();if(!response.ok)throw new Error(result.error);status.innerHTML='<span class="success">'+(result.detailsOnly?'Saved':result.replaced?'Replaced':result.book?'Added a book of '+result.count+' pieces':'Added')+'. <a href="http://localhost:3000'+result.viewerPath+'" target="_blank">Open '+result.title+' in Cookie Flute Studio</a>'+(result.addedTerms?.length?' Added to the glossary: '+result.addedTerms.map(term=>term.replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';')).join(', ')+'.':'')+'</span>';if(result.addedTerms?.length){for(const [id,list] of Object.entries(partTerms))partTerms[id]=list.filter(item=>!result.addedTerms.includes(item.term));termList=termList?.filter(item=>!result.addedTerms.includes(item.term))??null;showTerms();loadGlossary()}const index=catalog.findIndex(entry=>entry.id===result.id);if(index>=0)catalog[index]={...catalog[index],...result};if(result.detailsOnly)publish.disabled=false}catch(error){status.textContent=error.message||'Could not save the score.';publish.disabled=false}});

const glossaryBox=document.querySelector('#glossary'),glossarySearch=document.querySelector('#glossarySearch'),glossaryStatus=document.querySelector('#glossaryStatus'),newTerm=document.querySelector('#newTerm'),newMeaning=document.querySelector('#newMeaning');let glossary={};
async function loadGlossary(){glossary=await (await fetch('/terms')).json();renderGlossary()}
async function saveTerm(term,body){const response=await fetch('/terms',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({term,...body})}),result=await response.json();if(!response.ok)throw new Error(result.error);return result}
// Shows matches only (the whole glossary is 100+ rows); an empty search lists the most recently added.
function renderGlossary(){const query=glossarySearch.value.trim().toLowerCase(),entries=Object.entries(glossary),shown=(query?entries.filter(([term,entry])=>term.includes(query)||entry.meaning.toLowerCase().includes(query)):entries.slice(-12).reverse()).slice(0,40);
  glossaryBox.replaceChildren(...shown.map(([term,entry])=>{const row=document.createElement('div');row.className='glossary-row';const name=document.createElement('b');name.textContent=term;if(entry.bpm){const range=document.createElement('small');range.textContent='usually '+entry.bpm[0]+' to '+entry.bpm[1]+' BPM';name.append(range)}const input=document.createElement('input');input.value=entry.meaning;const save=document.createElement('button');save.type='button';save.className='convert save';save.textContent='Save';save.disabled=true;const remove=document.createElement('button');remove.type='button';remove.className='remove';remove.textContent='Remove';input.oninput=()=>{save.disabled=!input.value.trim()||input.value.trim()===entry.meaning};
    save.onclick=async()=>{try{await saveTerm(term,{meaning:input.value});glossaryStatus.textContent='Saved “'+term+'”.';await loadGlossary()}catch(error){glossaryStatus.textContent=error.message}};
    remove.onclick=async()=>{if(!confirm('Remove “'+term+'” from the glossary? The reader will stop explaining it.'))return;try{await saveTerm(term,{remove:true});glossaryStatus.textContent='Removed “'+term+'”.';await loadGlossary()}catch(error){glossaryStatus.textContent=error.message}};
    row.append(name,input,save,remove);return row}));
  if(!shown.length)glossaryBox.textContent=query?'No term matches “'+glossarySearch.value.trim()+'”. Add it above.':'';}
glossarySearch.addEventListener('input',renderGlossary);
document.querySelector('#addTerm').addEventListener('click',async()=>{const term=newTerm.value.trim().toLowerCase();if(!term||!newMeaning.value.trim()){glossaryStatus.textContent='Write both the term and what it means.';return}if(glossary[term]&&!confirm('“'+term+'” is already in the glossary. Replace its meaning?'))return;try{await saveTerm(term,{meaning:newMeaning.value});glossaryStatus.textContent='Added “'+term+'”.';newTerm.value='';newMeaning.value='';glossarySearch.value=term;await loadGlossary()}catch(error){glossaryStatus.textContent=error.message}});
loadGlossary();
// Composers: one row per composer in the library or with a bio already.
const composersBox=document.querySelector('#composers'),composerStatus=document.querySelector('#composerStatus');let composers={};
function checkComposer(){const name=composer.value.trim();composerHint.textContent=name&&!composers[name]&&!/^traditional$/i.test(name)?'No bio for '+name+' yet. You can add one under Composers below.':''}
composer.addEventListener('input',checkComposer);
async function loadComposers(){composers=await (await fetch('/composers')).json();renderComposers();checkComposer()}
function renderComposers(){const names=[...new Set([...Object.keys(composers),...catalog.map(item=>item.composer)])].filter(name=>name&&!/^traditional$/i.test(name)).sort((a,b)=>(!!composers[b])-(!!composers[a])||a.localeCompare(b));
  composersBox.replaceChildren(...names.map(name=>{const entry=composers[name]||{},row=document.createElement('div');row.className='composer-row';const title=document.createElement('b');title.textContent=name;
    const field=(key,placeholder,type='text')=>{const input=document.createElement('input');input.type=type;input.placeholder=placeholder;input.value=entry[key]??'';input.dataset.key=key;return input};
    const bio=document.createElement('textarea');bio.rows=2;bio.placeholder='A short bio: who they were and what they are known for';bio.value=entry.bio??'';bio.dataset.key='bio';
    const actions=document.createElement('div');actions.className='row-actions';const save=document.createElement('button');save.type='button';save.className='convert';save.textContent=composers[name]?'Save':'Add bio';actions.append(save);
    if(composers[name]){const remove=document.createElement('button');remove.type='button';remove.className='remove';remove.style.cssText='background:none;color:#9a4b3f';remove.textContent='Remove';remove.onclick=async()=>{if(!confirm('Remove the bio for '+name+'?'))return;await postComposer({name,remove:true});composerStatus.textContent='Removed the bio for '+name+'.';loadComposers()};actions.append(remove)}
    save.onclick=async()=>{const data={name};row.querySelectorAll('[data-key]').forEach(input=>data[input.dataset.key]=input.value);try{await postComposer(data);composerStatus.textContent='Saved '+name+'.';loadComposers()}catch(error){composerStatus.textContent=error.message}};
    row.append(title,field('born','Born','number'),field('died','Died','number'),field('nationality','Nationality'),field('era','Era, like Baroque'),bio,actions);return row}))}
async function postComposer(data){const response=await fetch('/composers',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)}),result=await response.json();if(!response.ok)throw new Error(result.error);return result}
</script></body></html>`;

const server=http.createServer(async(req,res)=>{
  try{
    const allowedHosts=new Set([`127.0.0.1:${port}`,`localhost:${port}`]);
    if(!allowedHosts.has(req.headers.host)||req.headers.origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin))return json(res,403,{error:'Use the local uploader directly.'});
    if(req.method==="GET"&&req.url==="/"){res.writeHead(200,{"content-type":"text/html; charset=utf-8"});return res.end(html)}
    if(req.method==="GET"&&req.url==="/ghost-note-fix.js"){res.writeHead(200,{"content-type":"text/javascript"});return res.end(await readFile(path.join(root,"app/flute-studio/lib/ghostNoteFix.js")))}
    if(req.method==="GET"&&req.url==="/osmd.js"){const js=await readFile(path.join(root,"node_modules/opensheetmusicdisplay/build/opensheetmusicdisplay.min.js"));res.writeHead(200,{"content-type":"text/javascript; charset=utf-8"});return res.end(js)}
    if(req.method==="GET"&&req.url==="/composers")return json(res,200,JSON.parse(await readFile(composersPath,"utf8")));
    if(req.method==="POST"&&req.url==="/composers"){
      // Composer bios, keyed by the name exactly as the catalog spells it, shown when the name is tapped in the reader.
      const data=JSON.parse((await body(req)).toString("utf8")),composers=JSON.parse(await readFile(composersPath,"utf8")),name=String(data.name||"").trim().replace(/\s+/g," ");
      if(!name||name.length>80)return json(res,400,{error:"Give the composer's name."});
      if(data.remove)delete composers[name];
      else{
        const bio=String(data.bio||"").trim().replace(/\s+/g," ");
        if(!bio||bio.length>600)return json(res,400,{error:"Write a short bio, up to 600 characters."});
        let born,died;try{born=yearField(data.born);died=yearField(data.died)}catch{return json(res,400,{error:"Born and died should be years, like 1845."})}
        const entry={};if(born)entry.born=born;if(died)entry.died=died;
        for(const key of ["nationality","era"]){const value=String(data[key]||"").trim();if(value)entry[key]=value.slice(0,60)}
        entry.bio=bio;composers[name]=entry;
      }
      await writeFile(composersPath,"{\n"+Object.entries(composers).map(([key,entry])=>`  ${JSON.stringify(key)}: ${JSON.stringify(entry)}`).join(",\n")+"\n}\n","utf8");
      return json(res,200,{name,entry:composers[name]??null});
    }
    if(req.method==="GET"&&req.url==="/private-code")return json(res,200,{code:await privateMusic.code()});
    if(req.method==="GET"&&req.url==="/terms")return json(res,200,await readTerms());
    if(req.method==="POST"&&req.url==="/terms"){
      // Glossary editor: change a meaning, add a term, or remove one. Unlike
      // saving a piece, this may overwrite: it is how a wrong explanation gets fixed.
      const data=JSON.parse((await body(req)).toString("utf8")),terms=await readTerms(),term=String(data.term||"").trim().toLowerCase().replace(/\s+/g," ");
      if(!term||term.length>40)return json(res,400,{error:"Give the term, up to 40 characters."});
      if(data.remove){delete terms[term];await writeTerms(terms);return json(res,200,{removed:term})}
      const meaning=String(data.meaning||"").trim().replace(/\s+/g," ").replace(/\.$/,"");
      if(!meaning||meaning.length>200)return json(res,400,{error:"Write a meaning, up to 200 characters."});
      terms[term]={...terms[term],meaning};await writeTerms(terms);return json(res,200,{term,entry:terms[term]});
    }
    if(req.method==="GET"&&req.url.startsWith("/scan?")){
      // Unknown markings in a piece that is already in the library, so terms
      // skipped at upload can still be filled in with Save details.
      const id=new URL(req.url,"http://127.0.0.1").searchParams.get("id"),item=[...JSON.parse(await readFile(catalogPath,"utf8")),...(await privateMusic.read()).map(entry=>entry.item)].find(entry=>entry.id===id);
      if(!item?.scorePath)return json(res,404,{error:"That piece has no score file."});
      return json(res,200,{terms:unknownTerms(await storedScore(item),await readTerms())});
    }
    if(req.method==="GET"&&req.url==="/catalog"){
      const catalog=[...JSON.parse(await readFile(catalogPath,"utf8")),...(await privateMusic.read()).map(entry=>entry.item)];
      // .mxl is zipped, so only plain MusicXML scores report their marking here.
      const withMarks=await Promise.all(catalog.map(async item=>{if(!item.scorePath?.endsWith(".musicxml"))return item;try{return {...item,markedTempo:markedTempo(await readFile(path.join(root,"public",item.scorePath),"utf8"))}}catch{return item}}));
      return json(res,200,withMarks);
    }
    if(req.method==="POST"&&req.url==="/convert"){
      const data=await formData(req),file=data.get("score");
      if(!(file instanceof File)||!/\.(mscz|mscx)$/i.test(file.name))return json(res,400,{error:"Choose a MuseScore .mscz or .mscx file."});
      await access(museScore);
      const dir=await mkdtemp(path.join(tmpdir(),"cookie-music-")),input=path.join(dir,file.name),output=path.join(dir,"score.musicxml");
      try{await writeFile(input,Buffer.from(await file.arrayBuffer()));await run(museScore,["-o",output,input],{timeout:60000,maxBuffer:1024*1024*4});const xml=await readFile(output,"utf8"),parts=scoreParts(xml),singleStaff=parts.filter(item=>item.staves===1),suggested=singleStaff.length===1?singleStaff[0]:parts[0],needsPartChoice=singleStaff.length>1;const partScores=Object.fromEntries(parts.map(item=>[item.id,onePart(xml,item.id)])),partChecks=Object.fromEntries(parts.map(item=>[item.id,beginnerCheck(partScores[item.id])])),terms=await readTerms(),partTerms=Object.fromEntries(parts.map(item=>[item.id,unknownTerms(partScores[item.id],terms)]));let sections=[];try{const pieces=parts.length===1?splitBook(xml):[];if(pieces.length>1)sections=pieces.map(({number,bars,opening,time,xml:pieceXml})=>({number,bars,opening,time,tempo:suggestedTempo(pieceXml,terms)}))}catch{/* not a book */}return json(res,200,{xml,parts,partScores,partChecks,partTerms,suggestedPartId:suggested?.id??"",needsPartChoice,inferred:inferred(xml,file.name),sections})}finally{await rm(dir,{recursive:true,force:true})}
    }
    if(req.method==="POST"&&req.url==="/publish"){
      const data=JSON.parse((await body(req)).toString("utf8")),title=String(data.title||"").trim(),composer=String(data.composer||"").trim(),tags=tagList(data.tags),beginner=data.beginner===true,xml=String(data.xml||""),replaceId=String(data.replaceId||""),readingPartId=String(data.readingPartId||"");
      let tempo,year;try{tempo=tempoField(data.tempo);year=yearField(data.year)}catch(error){return json(res,400,{error:error.message})}
      const about=String(data.about||"").trim().replace(/\s+/g," ").slice(0,500);
      const addedTerms=title&&composer?await addTerms(data.terms):[];
      const priorPrivate=(await privateMusic.read()).some(entry=>entry.item.id===replaceId);
      if(data.private===true){
        if(!title||!composer)return json(res,400,{error:"Add a title and composer."});
        return json(res,200,await publishPrivate({data,title,composer,tags,beginner,tempo,year,about,xml,replaceId,readingPartId,addedTerms}));
      }
      if(priorPrivate)return json(res,400,{error:"This piece is private. Keep Private practice selected. Public release requires an explicit export."});
      if(replaceId&&!xml){
        // Details only: rename, retag or set the tempo without touching the score files.
        if(!title||!composer)return json(res,400,{error:"The title or composer is missing."});
        const catalog=JSON.parse(await readFile(catalogPath,"utf8")),index=catalog.findIndex(item=>item.id===replaceId);
        if(index<0)return json(res,404,{error:"That piece is no longer in the catalog."});
        catalog[index]=withDetails({...catalog[index],title,composer},{tags,beginner,tempo,year,about});catalog.sort((a,b)=>a.title.localeCompare(b.title));await writeFile(catalogPath,JSON.stringify(catalog,null,2)+"\n","utf8");
        return json(res,200,{...catalog.find(item=>item.id===replaceId),detailsOnly:true,addedTerms});
      }
      if(!title||!composer||!xml.includes("<score-partwise"))return json(res,400,{error:"The title, composer, or converted score is missing."});
      if(data.asBook===true&&!replaceId)return json(res,200,await publishBook({xml:readingPartId?onePart(xml,readingPartId):xml,title,composer,tags,year,about,addedTerms}));
      const parts=scoreParts(xml),readingXml=readingPartId?onePart(xml,readingPartId):xml;
      // No tempo typed: start the metronome from the score's own marking.
      if(tempo===undefined)tempo=suggestedTempo(readingXml,await readTerms());
      const catalog=JSON.parse(await readFile(catalogPath,"utf8"));
      if(replaceId){
        const index=catalog.findIndex(item=>item.id===replaceId);if(index<0)return json(res,404,{error:"The score selected for replacement is no longer in the catalog."});
        const current=catalog[index];if(!current.scorePath)return json(res,400,{error:"This catalog entry has no score file to replace."});
        await writeConvertedScore(current.scorePath,readingXml);
        const fullScorePath=`/music/${current.id}/full-score.musicxml`;await writeConvertedScore(fullScorePath,xml);
        catalog[index]=withDetails({...current,title,composer,fullScorePath,readingPartId:readingPartId||undefined,partCount:parts.length},{tags,beginner,tempo,year,about},xml);catalog.sort((a,b)=>a.title.localeCompare(b.title));await writeFile(catalogPath,JSON.stringify(catalog,null,2)+"\n","utf8");
        return json(res,200,{...catalog.find(item=>item.id===replaceId),replaced:true,addedTerms});
      }
      const id=slug(`${composer}-${title}`);if(!id)return json(res,400,{error:"Could not generate a URL from this title and composer."});
      const folder=path.join(root,"public/music",id);try{await access(folder);return json(res,409,{error:`${id} already exists. Nothing was overwritten.`})}catch{/* the folder does not exist yet: good */}
      if(catalog.some(item=>item.id===id))return json(res,409,{error:`${id} is already in the library.`});
      await mkdir(folder,{recursive:false});
      try{
        await writeFile(path.join(folder,"score.musicxml"),readingXml,"utf8");
        await writeFile(path.join(folder,"full-score.musicxml"),xml,"utf8");
        const item=withDetails({id,title,composer,status:"published",scorePath:`/music/${id}/score.musicxml`,fullScorePath:`/music/${id}/full-score.musicxml`,readingPartId:readingPartId||undefined,partCount:parts.length,viewerPath:`/flute-studio/music/${id}`},{tags,beginner,tempo,year,about},xml);
        catalog.push(item);catalog.sort((a,b)=>a.title.localeCompare(b.title));await writeFile(catalogPath,JSON.stringify(catalog,null,2)+"\n","utf8");
        return json(res,200,{...item,addedTerms});
      }catch(error){await rm(folder,{recursive:true,force:true});throw error}
    }
    res.writeHead(404);res.end("Not found");
  }catch(error){if(!error?.status)console.error(error);json(res,error?.status||500,{error:error?.message||"Uploader failed."})}
});

server.listen(port,"127.0.0.1",()=>{
  console.log(`\nCookie Flute Studio music uploader\nhttp://127.0.0.1:${port}\n`);
  console.log("Keep this terminal open while uploading music. Press Control-C to stop.\n");
});
