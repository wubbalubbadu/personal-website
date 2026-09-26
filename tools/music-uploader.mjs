import http from "node:http";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {mkdtemp,readFile,writeFile,mkdir,rm,access} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const run=promisify(execFile);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const catalogPath=path.join(root,"content/music-catalog.json");
const museScore=process.env.MUSESCORE_PATH||"/Applications/MuseScore 4.app/Contents/MacOS/mscore";
const port=Number(process.env.MUSIC_UPLOADER_PORT||4317);
const categories=new Set(["simple","pop","repertoire","etude","excerpt"]);

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
function withTempo(item,tempo){const next={...item};if(tempo===undefined)delete next.defaultTempo;else next.defaultTempo=tempo;return next}
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
async function formData(req){
  const raw=await body(req);
  const request=new Request("http://127.0.0.1/upload",{method:"POST",headers:{"content-type":req.headers["content-type"]||""},body:raw});
  return request.formData();
}

const html=String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Add music · Cookie Flute Studio</title>
<style>
:root{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,sans-serif;color:#292a33;background:#f6f5f2}*{box-sizing:border-box}body{margin:0}.shell{width:min(1040px,calc(100% - 32px));margin:0 auto;padding:54px 0 80px}.eyebrow{margin:0 0 8px;color:#777970;font-size:12px;font-weight:750;letter-spacing:.1em;text-transform:uppercase}h1{margin:0;font-size:42px;letter-spacing:-.04em}.intro{margin:12px 0 30px;color:#6d6f76}.grid{display:grid;grid-template-columns:360px minmax(0,1fr);gap:24px;align-items:start}.panel{background:#fff;border:1px solid #e3e2df;border-radius:22px;box-shadow:0 10px 35px #292a330d}.form{padding:22px}.drop{min-height:150px;border:1.5px dashed #b9bac0;border-radius:17px;display:grid;place-items:center;text-align:center;padding:22px;cursor:pointer;transition:.16s}.drop:hover,.drop.over{background:#f2f2f4;border-color:#666870}.drop input{position:absolute;opacity:0;pointer-events:none}.drop strong,.drop small{display:block}.drop small{margin-top:7px;color:#85868e}.fields{display:grid;gap:15px;margin-top:22px}label>span{display:block;margin:0 0 7px;font-size:12px;font-weight:700;color:#666870}input,select{width:100%;height:45px;border:1px solid #dadbe0;border-radius:11px;background:#fff;padding:0 12px;color:#292a33;font:inherit}input:focus,select:focus{outline:3px solid #292a3320;border-color:#999ba2}.actions{display:flex;gap:9px;margin-top:20px}button{height:44px;border:0;border-radius:12px;padding:0 16px;font:700 14px/1 inherit;cursor:pointer}.convert{background:#ececef;color:#292a33}.publish{margin-left:auto;background:#292a33;color:#fff}.publish:disabled,.convert:disabled{opacity:.4;cursor:default}.status{min-height:20px;margin:15px 0 0;color:#696b72;font-size:13px;line-height:1.45}.preview{min-height:600px;padding:24px;overflow:auto}.preview.empty{display:grid;place-items:center;color:#9a9ba1}.preview svg{max-width:100%}.success{padding:16px;border-radius:13px;background:#edf5ea;color:#385232}.success a{color:inherit;font-weight:750}.hint{display:block;margin-top:6px;color:#85868e;font-size:12px;line-height:1.4}@media(max-width:800px){.grid{grid-template-columns:1fr}.preview{min-height:420px}h1{font-size:36px}}
</style></head><body><main class="shell"><p class="eyebrow">Local music uploader</p><h1>Add or replace music</h1><p class="intro">Convert a MuseScore file, inspect the notation, then add it to the library.</p><div class="grid"><section class="panel form"><label class="drop" id="drop"><input id="file" type="file" accept=".mscz,.mscx"><span><strong id="fileName">Drop a MuseScore file</strong><small>.mscz or .mscx</small></span></label><div class="fields"><label><span>Save as</span><select id="replace"><option value="">New piece</option></select></label><label><span>Title</span><input id="title" autocomplete="off"></label><label><span>Composer</span><input id="composer" autocomplete="off"></label><label><span>Category</span><select id="category"><option value="simple">Simple tune</option><option value="pop">Pop tune</option><option value="repertoire">Classical repertoire</option><option value="etude">Etude</option><option value="excerpt">Orchestral excerpt</option></select></label><label><span>Metronome tempo (optional)</span><input id="tempo" type="number" min="20" max="300" inputmode="numeric" placeholder="Beats per minute"><small class="hint" id="tempoHint">Leave empty to use the tempo written in the score, or 76 if it has none.</small></label><label id="partWrap" hidden><span>Reading part</span><select id="part"></select></label></div><div class="actions"><button class="convert" id="convert" disabled>Convert and preview</button><button class="publish" id="publish" disabled>Add to library</button></div><p class="status" id="status"></p></section><section class="panel preview empty" id="preview">The converted score will appear here.</section></div></main><script src="/osmd.js"></script><script>
const file=document.querySelector('#file'),drop=document.querySelector('#drop'),fileName=document.querySelector('#fileName'),convert=document.querySelector('#convert'),publish=document.querySelector('#publish'),status=document.querySelector('#status'),preview=document.querySelector('#preview'),title=document.querySelector('#title'),composer=document.querySelector('#composer'),category=document.querySelector('#category'),replace=document.querySelector('#replace'),part=document.querySelector('#part'),partWrap=document.querySelector('#partWrap'),tempo=document.querySelector('#tempo'),tempoHint=document.querySelector('#tempoHint');let xml='',catalog=[],partScores={};
function showMarked(bpm){tempoHint.textContent=bpm?'Leave empty to use the score\u2019s marking: '+bpm+' BPM.':'This score has no tempo marking. Leave empty to use 76.'}
function syncPublish(){publish.disabled=!xml&&!replace.value;publish.textContent=replace.value?(xml?'Replace score':'Save details'):'Add to library'}
function choose(f){if(!f)return;if(!/\.(mscz|mscx)$/i.test(f.name)){status.textContent='Choose a .mscz or .mscx file.';return}fileName.textContent=f.name;convert.disabled=false;xml='';syncPublish();preview.className='panel preview empty';preview.textContent='Ready to convert.'}
file.addEventListener('change',()=>choose(file.files[0]));drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('over')});drop.addEventListener('dragleave',()=>drop.classList.remove('over'));drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('over');const f=e.dataTransfer.files[0];const dt=new DataTransfer();dt.items.add(f);file.files=dt.files;choose(f)});
async function renderScore(value){preview.className='panel preview';preview.replaceChildren();const osmd=new opensheetmusicdisplay.OpenSheetMusicDisplay(preview,{backend:'svg',autoResize:true,drawTitle:false,drawComposer:false,drawingParameters:'compacttight'});osmd.EngravingRules.RenderChordSymbols=false;await osmd.load(value);osmd.render()}
convert.addEventListener('click',async()=>{convert.disabled=true;publish.disabled=true;status.textContent='MuseScore is converting the file…';try{const data=new FormData();data.append('score',file.files[0]);const response=await fetch('/convert',{method:'POST',body:data}),result=await response.json();if(!response.ok)throw new Error(result.error);xml=result.xml;partScores=result.partScores;if(!title.value||title.value==='www.flutetunes.com')title.value=result.inferred.title;if(!composer.value)composer.value=result.inferred.composer;showMarked(result.inferred.tempo);part.replaceChildren();for(const item of result.parts){const option=document.createElement('option');option.value=item.id;option.textContent=(item.name||'Part '+(item.index+1))+' · '+item.staves+(item.staves===1?' staff':' staves');part.append(option)}part.value=result.suggestedPartId;partWrap.hidden=!result.needsPartChoice;await renderScore(partScores[part.value]||xml);status.textContent=result.needsPartChoice?'Several one-staff parts were found. Choose the part the student should read.':'Conversion complete. The reading score and any accompaniment were separated automatically.';syncPublish()}catch(error){status.textContent=error.message||'Conversion failed.'}finally{convert.disabled=false}});
part.addEventListener('change',()=>renderScore(partScores[part.value]||xml));
replace.addEventListener('change',()=>{const item=catalog.find(entry=>entry.id===replace.value);if(item){title.value=item.title;composer.value=item.composer;category.value=item.category;tempo.value=item.defaultTempo??'';showMarked(item.markedTempo)}else{tempo.value=''}syncPublish()});
fetch('/catalog').then(response=>response.json()).then(items=>{catalog=items;for(const item of items){const option=document.createElement('option');option.value=item.id;option.textContent=item.title+' · '+item.composer;replace.append(option)}});
publish.addEventListener('click',async()=>{if(!title.value.trim()||!composer.value.trim()){status.textContent='Add both a title and composer before publishing.';return}publish.disabled=true;status.textContent=replace.value?(xml?'Replacing the existing score…':'Saving the details…'):'Adding the score to the library…';try{const response=await fetch('/publish',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({xml,title:title.value.trim(),composer:composer.value.trim(),category:category.value,replaceId:replace.value||null,readingPartId:part.value||null,tempo:tempo.value})}),result=await response.json();if(!response.ok)throw new Error(result.error);status.innerHTML='<span class="success">'+(result.detailsOnly?'Saved':result.replaced?'Replaced':'Added')+'. <a href="http://localhost:3000'+result.viewerPath+'" target="_blank">Open '+result.title+' in Cookie Flute Studio</a></span>';const index=catalog.findIndex(entry=>entry.id===result.id);if(index>=0)catalog[index]={...catalog[index],...result};if(result.detailsOnly)publish.disabled=false}catch(error){status.textContent=error.message||'Could not save the score.';publish.disabled=false}});
</script></body></html>`;

const server=http.createServer(async(req,res)=>{
  try{
    if(req.method==="GET"&&req.url==="/"){res.writeHead(200,{"content-type":"text/html; charset=utf-8"});return res.end(html)}
    if(req.method==="GET"&&req.url==="/osmd.js"){const js=await readFile(path.join(root,"node_modules/opensheetmusicdisplay/build/opensheetmusicdisplay.min.js"));res.writeHead(200,{"content-type":"text/javascript; charset=utf-8"});return res.end(js)}
    if(req.method==="GET"&&req.url==="/catalog"){
      const catalog=JSON.parse(await readFile(catalogPath,"utf8"));
      // .mxl is zipped, so only plain MusicXML scores report their marking here.
      const withMarks=await Promise.all(catalog.map(async item=>{if(!item.scorePath?.endsWith(".musicxml"))return item;try{return {...item,markedTempo:markedTempo(await readFile(path.join(root,"public",item.scorePath),"utf8"))}}catch{return item}}));
      return json(res,200,withMarks);
    }
    if(req.method==="POST"&&req.url==="/convert"){
      const data=await formData(req),file=data.get("score");
      if(!(file instanceof File)||!/\.(mscz|mscx)$/i.test(file.name))return json(res,400,{error:"Choose a MuseScore .mscz or .mscx file."});
      await access(museScore);
      const dir=await mkdtemp(path.join(tmpdir(),"cookie-music-")),input=path.join(dir,file.name),output=path.join(dir,"score.musicxml");
      try{await writeFile(input,Buffer.from(await file.arrayBuffer()));await run(museScore,["-o",output,input],{timeout:60000,maxBuffer:1024*1024*4});const xml=await readFile(output,"utf8"),parts=scoreParts(xml),singleStaff=parts.filter(item=>item.staves===1),suggested=singleStaff.length===1?singleStaff[0]:parts[0],needsPartChoice=singleStaff.length>1;const partScores=Object.fromEntries(parts.map(item=>[item.id,onePart(xml,item.id)]));return json(res,200,{xml,parts,partScores,suggestedPartId:suggested?.id??"",needsPartChoice,inferred:inferred(xml,file.name)})}finally{await rm(dir,{recursive:true,force:true})}
    }
    if(req.method==="POST"&&req.url==="/publish"){
      const data=JSON.parse((await body(req)).toString("utf8")),title=String(data.title||"").trim(),composer=String(data.composer||"").trim(),category=String(data.category||""),xml=String(data.xml||""),replaceId=String(data.replaceId||""),readingPartId=String(data.readingPartId||"");
      let tempo;try{tempo=tempoField(data.tempo)}catch(error){return json(res,400,{error:error.message})}
      if(replaceId&&!xml){
        // Details only: rename, recategorise or set the tempo without touching the score files.
        if(!title||!composer||!categories.has(category))return json(res,400,{error:"The title, composer, or category is missing."});
        const catalog=JSON.parse(await readFile(catalogPath,"utf8")),index=catalog.findIndex(item=>item.id===replaceId);
        if(index<0)return json(res,404,{error:"That piece is no longer in the catalog."});
        catalog[index]=withTempo({...catalog[index],title,composer,category},tempo);catalog.sort((a,b)=>a.title.localeCompare(b.title));await writeFile(catalogPath,JSON.stringify(catalog,null,2)+"\n","utf8");
        return json(res,200,{...catalog.find(item=>item.id===replaceId),detailsOnly:true});
      }
      if(!title||!composer||!categories.has(category)||!xml.includes("<score-partwise"))return json(res,400,{error:"The title, composer, category, or converted score is missing."});
      const parts=scoreParts(xml),readingXml=readingPartId?onePart(xml,readingPartId):xml;
      const catalog=JSON.parse(await readFile(catalogPath,"utf8"));
      if(replaceId){
        const index=catalog.findIndex(item=>item.id===replaceId);if(index<0)return json(res,404,{error:"The score selected for replacement is no longer in the catalog."});
        const current=catalog[index];if(!current.scorePath)return json(res,400,{error:"This catalog entry has no score file to replace."});
        await writeConvertedScore(current.scorePath,readingXml);
        const fullScorePath=`/music/${current.id}/full-score.musicxml`;await writeConvertedScore(fullScorePath,xml);
        catalog[index]=withTempo({...current,title,composer,category,fullScorePath,readingPartId:readingPartId||undefined,partCount:parts.length},tempo);catalog.sort((a,b)=>a.title.localeCompare(b.title));await writeFile(catalogPath,JSON.stringify(catalog,null,2)+"\n","utf8");
        return json(res,200,{...catalog.find(item=>item.id===replaceId),replaced:true});
      }
      const id=slug(`${composer}-${title}`);if(!id)return json(res,400,{error:"Could not generate a URL from this title and composer."});
      const folder=path.join(root,"public/music",id);try{await access(folder);return json(res,409,{error:`${id} already exists. Nothing was overwritten.`})}catch{}
      if(catalog.some(item=>item.id===id))return json(res,409,{error:`${id} is already in the library.`});
      await mkdir(folder,{recursive:false});
      try{
        await writeFile(path.join(folder,"score.musicxml"),readingXml,"utf8");
        await writeFile(path.join(folder,"full-score.musicxml"),xml,"utf8");
        const item=withTempo({id,title,composer,category,status:"published",scorePath:`/music/${id}/score.musicxml`,fullScorePath:`/music/${id}/full-score.musicxml`,readingPartId:readingPartId||undefined,partCount:parts.length,viewerPath:`/flute-studio/music/${id}`},tempo);
        catalog.push(item);catalog.sort((a,b)=>a.title.localeCompare(b.title));await writeFile(catalogPath,JSON.stringify(catalog,null,2)+"\n","utf8");
        return json(res,200,item);
      }catch(error){await rm(folder,{recursive:true,force:true});throw error}
    }
    res.writeHead(404);res.end("Not found");
  }catch(error){console.error(error);json(res,500,{error:error?.message||"Uploader failed."})}
});

server.listen(port,"127.0.0.1",()=>{
  console.log(`\nCookie Flute Studio music uploader\nhttp://127.0.0.1:${port}\n`);
  console.log("Keep this terminal open while uploading music. Press Control-C to stop.\n");
});
