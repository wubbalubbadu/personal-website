/**
 * Melodies page of the local music uploader (served at /melodies by music-uploader.mjs).
 *
 * A melody is a short exercise written once, in one key, and shown in the studio moving up by half steps.
 * Upload a MuseScore or MusicXML file, see it in every key, untick the keys you don't want, save.
 *
 * Writes:
 *   public/melodies/<id>.musicxml   the melody as written
 *   content/melodies.json           one entry per melody, in book order (new ones go last)
 *
 * The key rule lives in app/flute-studio/lib/melodyKeys.ts so the studio and this page agree.
 */
import {readFile,writeFile,mkdir,mkdtemp,rm,access} from "node:fs/promises";
import {stripTypeScriptTypes} from "node:module";
import {tmpdir} from "node:os";
import path from "node:path";

export function melodyRoutes({root,run,museScore,json,body,formData,slug}){
  const listPath=path.join(root,"content/melodies.json"),folder=path.join(root,"public/melodies");
  const readList=async()=>{try{return JSON.parse(await readFile(listPath,"utf8"))}catch(error){if(error.code==="ENOENT")return [];throw error}};
  const writeList=list=>writeFile(listPath,JSON.stringify(list,null,2)+"\n","utf8");
  const fail=(status,message)=>Object.assign(new Error(message),{status});

  // The studio's TypeScript, served to this page as plain JS (imports pointed at the served copies).
  async function served(name){
    const source=await readFile(path.join(root,"app/flute-studio/lib",name+".ts"),"utf8");
    return stripTypeScriptTypes(source).replace(/from\s+["']\.\/([\w-]+)["']/g,'from "/lib/$1.js"');
  }

  function keyList(value){
    if(!Array.isArray(value))return [];
    const seen=new Set();
    return value.map(key=>({semitones:Math.round(Number(key?.semitones)),octave:Math.round(Number(key?.octave))}))
      .filter(key=>key.semitones>=0&&key.semitones<=11&&[-1,0,1].includes(key.octave)&&!seen.has(key.semitones)&&seen.add(key.semitones))
      .sort((a,b)=>a.semitones-b.semitones);
  }

  return async function handle(req,res){
    const url=new URL(req.url,"http://local");
    if(req.method==="GET"&&url.pathname==="/melodies"){res.writeHead(200,{"content-type":"text/html; charset=utf-8"});res.end(page);return true}
    if(req.method==="GET"&&/^\/lib\/(transpose|melodyKeys)\.js$/.test(url.pathname)){
      res.writeHead(200,{"content-type":"text/javascript; charset=utf-8"});res.end(await served(url.pathname.slice(5,-3)));return true;
    }
    if(req.method==="GET"&&url.pathname==="/melodies/list"){json(res,200,await readList());return true}
    if(req.method==="GET"&&url.pathname==="/melodies/score"){
      const item=(await readList()).find(entry=>entry.id===url.searchParams.get("id"));
      if(!item)throw fail(404,"That melody is no longer in the list.");
      res.writeHead(200,{"content-type":"application/xml; charset=utf-8"});res.end(await readFile(path.join(root,"public",item.scorePath),"utf8"));return true;
    }
    if(req.method==="POST"&&url.pathname==="/melodies/convert"){
      const file=(await formData(req)).get("score");
      if(!(file instanceof File)||!/\.(mscz|mscx|musicxml|xml)$/i.test(file.name))throw fail(400,"Choose a .mscz, .mscx or .musicxml file.");
      let xml;
      if(/\.(musicxml|xml)$/i.test(file.name))xml=Buffer.from(await file.arrayBuffer()).toString("utf8");
      else{
        await access(museScore);
        const dir=await mkdtemp(path.join(tmpdir(),"cookie-melody-")),input=path.join(dir,file.name),output=path.join(dir,"melody.musicxml");
        try{await writeFile(input,Buffer.from(await file.arrayBuffer()));await run(museScore,["-o",output,input],{timeout:60000,maxBuffer:1024*1024*4});xml=await readFile(output,"utf8")}
        finally{await rm(dir,{recursive:true,force:true})}
      }
      if(!xml.includes("<score-partwise"))throw fail(400,"This file has no readable notation.");
      const parts=(xml.match(/<score-part\s/gi)||[]).length;
      if(parts>1)throw fail(400,"This file has "+parts+" parts. A melody is one flute line: delete the other parts in MuseScore and try again.");
      const title=xml.match(/<work-title>([^<]*)<\/work-title>/)?.[1]?.trim()||xml.match(/<credit-words[^>]*>([^<]*)<\/credit-words>/)?.[1]?.trim()||file.name.replace(/\.[^.]+$/,"");
      json(res,200,{xml,title});return true;
    }
    if(req.method==="POST"&&url.pathname==="/melodies/save"){
      const data=JSON.parse((await body(req)).toString("utf8"));
      const title=String(data.title||"").trim().replace(/\s+/g," ").slice(0,80),source=String(data.source||"").trim().replace(/\s+/g," ").slice(0,80);
      const xml=String(data.xml||""),replaceId=String(data.replaceId||""),keys=keyList(data.keys);
      const marked=Number(xml.match(/<sound[^>]*\btempo=["']([\d.]+)["']/i)?.[1]);
      const tempo=String(data.tempo??"").trim()!==""?Math.round(Number(data.tempo)):marked>0?Math.round(marked):undefined;
      if(!title)throw fail(400,"Give the melody a title.");
      if(!keys.length)throw fail(400,"Keep at least one key.");
      if(tempo!==undefined&&!(tempo>=20&&tempo<=300))throw fail(400,"Tempo should be a number between 20 and 300.");
      if(xml&&!xml.includes("<score-partwise"))throw fail(400,"Convert a file before saving.");
      const list=await readList();
      const details=item=>{const next={...item,title,keys};if(source)next.source=source;else delete next.source;if(tempo===undefined)delete next.defaultTempo;else next.defaultTempo=tempo;return next};
      if(replaceId){
        const index=list.findIndex(entry=>entry.id===replaceId);if(index<0)throw fail(404,"That melody is no longer in the list.");
        if(xml)await writeFile(path.join(root,"public",list[index].scorePath),xml,"utf8");
        list[index]=details(list[index]);await writeList(list);
        json(res,200,{...list[index],replaced:!!xml,detailsOnly:!xml});return true;
      }
      if(!xml)throw fail(400,"Convert a file before saving.");
      const id=slug(title);if(!id)throw fail(400,"This title cannot make a file name. Use some letters or numbers.");
      if(list.some(entry=>entry.id===id))throw fail(409,"A melody called “"+title+"” already exists. Pick it under Save as to replace it, or use another title.");
      const scorePath=`/melodies/${id}.musicxml`,file=path.join(root,"public",scorePath);
      try{await access(file);throw fail(409,scorePath+" already exists. Nothing was overwritten.")}catch(error){if(error.status)throw error}
      await mkdir(folder,{recursive:true});await writeFile(file,xml,"utf8");
      const item=details({id,scorePath});
      try{list.push(item);await writeList(list)}catch(error){await rm(file,{force:true});throw error}
      json(res,200,{...item,number:list.length});return true;
    }
    return false;
  };
}

const page=String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Add melodies · Cookie Flute Studio</title>
<style>
[hidden]{display:none!important}:root{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,sans-serif;color:#292a33;background:#f6f5f2}*{box-sizing:border-box}body{margin:0}
.shell{width:min(1040px,calc(100% - 32px));margin:0 auto;padding:54px 0 80px}.nav{display:flex;gap:18px;margin:0 0 18px;font-size:13px;font-weight:650}.nav a{color:#46633d;text-decoration:none}.nav b{color:#292a33}
.eyebrow{margin:0 0 8px;color:#777970;font-size:12px;font-weight:750;letter-spacing:.1em;text-transform:uppercase}h1{margin:0;font-size:42px;letter-spacing:-.04em}.intro{margin:12px 0 30px;color:#6d6f76;max-width:640px;line-height:1.5}
.grid{display:grid;grid-template-columns:340px minmax(0,1fr);gap:24px;align-items:start}@media(max-width:820px){.grid{grid-template-columns:1fr}}
.panel{background:#fff;border:1px solid #e3e2df;border-radius:22px}.form{padding:22px}
.drop{min-height:120px;border:1.5px dashed #b9bac0;border-radius:17px;display:grid;place-items:center;text-align:center;padding:20px;cursor:pointer}.drop.over{border-color:#46633d;background:#f2f6ef}.drop input{display:none}.drop strong{display:block;font-size:15px}.drop small{display:block;margin-top:6px;color:#85878d}
.fields{display:grid;gap:15px;margin-top:20px}label span{display:block;margin:0 0 7px;font-size:12px;font-weight:700;color:#666870}
input,select{width:100%;height:44px;border:1px solid #dadbe0;border-radius:11px;background:#fff;padding:0 12px;color:#292a33;font:inherit}
.hint{margin:6px 0 0;color:#85878d;font-size:12px;line-height:1.4}
.actions{display:flex;gap:10px;margin-top:20px}button{height:42px;border:0;border-radius:12px;padding:0 16px;font:650 14px/1 inherit}button:disabled{opacity:.45}
.primary{background:#e4ecdf;color:#2f4628}.secondary{background:#f0efec;color:#3c3d44}
.status{min-height:20px;margin:15px 0 0;color:#696b72;font-size:13px;line-height:1.45}.status .ok{color:#46633d}.status a{color:#46633d;font-weight:650;text-decoration:none}
.right{display:grid;gap:16px}.keys{padding:18px 20px}.keys h2,.preview-head h2{margin:0;font-size:15px}.keys p{margin:4px 0 14px;color:#85878d;font-size:12.5px;line-height:1.45}
.key-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:8px}
.key{display:flex;align-items:center;gap:8px;min-height:44px;padding:6px 10px;border:1px solid #e3e2df;border-radius:12px;background:#fff;text-align:left;font:inherit;color:#292a33}
.key input{width:18px;height:18px;margin:0;accent-color:#6b5ca5;flex:none}.key div{min-width:0}.key b{display:block;font-size:13.5px;font-weight:650}.key small{display:block;font-size:11.5px;color:#85878d}
.key.viewing{border-color:#6b5ca5;background:#f4f2fa}.key.out b{color:#a3a4aa}
.preview-head{display:flex;justify-content:space-between;align-items:baseline;padding:18px 20px 0}.preview-head small{color:#85878d;font-size:12.5px}
.preview{min-height:260px;padding:8px 20px 20px;overflow:auto}.preview.empty{display:grid;place-items:center;color:#9a9ba1;font-size:14px}
</style></head><body><main class="shell">
<nav class="nav"><a href="/">Add music</a><b>Add melodies</b></nav>
<p class="eyebrow">Local melody uploader</p><h1>Add a melody</h1>
<p class="intro">A short exercise written once, in one key. The studio shows it moving up by half steps. Untick a key to leave it out; a key that would go past the flute's range is moved an octave, or left out when no octave fits.</p>
<div class="grid">
<section class="panel form">
<label class="drop" id="drop"><input id="file" type="file" accept=".mscz,.mscx,.musicxml,.xml"><span><strong id="fileName">Drop a melody file</strong><small>.mscz, .mscx or .musicxml, one flute line</small></span></label>
<div class="fields">
<label><span>Save as</span><select id="replace"><option value="">New melody</option></select></label>
<label><span>Title</span><input id="title" autocomplete="off" placeholder="Like: Soft high entrance"></label>
<label><span>Source (optional)</span><input id="source" autocomplete="off" placeholder="Like: Traditional, or Cookie"></label>
<label><span>Tempo (optional)</span><input id="tempo" inputmode="numeric" autocomplete="off" placeholder="BPM"><p class="hint">Leave empty to use the file's own marking, or 60 when it has none.</p></label>
</div>
<div class="actions"><button class="secondary" id="convert" disabled>Convert</button><button class="primary" id="save" disabled>Add melody</button></div>
<p class="status" id="status"></p>
</section>
<div class="right">
<section class="panel keys" id="keysPanel" hidden><h2>Keys</h2><p id="keysHint"></p><div class="key-grid" id="keyGrid"></div></section>
<section class="panel"><div class="preview-head"><h2 id="previewTitle">Preview</h2><small id="previewRange"></small></div><div class="preview empty" id="preview">Convert a file to see it here.</div></section>
</div>
</div></main>
<script src="/osmd.js"></script>
<script type="module">
import {installGhostNoteFix} from "/ghost-note-fix.js";
import {readKey,planFor,transposeXml,keyName,transposedKey} from "/lib/transpose.js";
import {melodyKeys} from "/lib/melodyKeys.js";
const $=id=>document.getElementById(id);
const file=$('file'),drop=$('drop'),replace=$('replace'),title=$('title'),source=$('source'),tempo=$('tempo'),convert=$('convert'),save=$('save'),status=$('status');
let list=[],xml='',fromServer=false,keys=[],chosen=new Set(),viewing=0;

const keyLabel=(written,move)=>keyName(transposedKey(written,move)).split(' / ')[0];
const moveText=k=>(k.semitones?k.semitones+(k.semitones===1?' half step up':' half steps up'):'As written')+(k.octave?(k.octave>0?', octave higher':', octave lower'):'');
const noteName=midi=>['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][midi%12]+(Math.floor(midi/12)-1);

async function loadList(){
  list=await (await fetch('/melodies/list')).json();
  const current=replace.value;replace.replaceChildren(new Option('New melody',''),...list.map((item,i)=>new Option('No. '+(i+1)+' · '+item.title,item.id)));replace.value=current;
}
function sync(){save.disabled=!xml||!chosen.size;save.textContent=replace.value?(fromServer?'Save details':'Replace melody'):'Add melody'}

function showKeys(){
  const written=readKey(xml),range=transposeXml(xml,planFor(written,{semitones:0,octave:0}));
  if(range.low===null){$('keysPanel').hidden=true;return}
  keys=melodyKeys(range.low,range.high);
  $('keysPanel').hidden=false;
  const out=keys.filter(k=>!k.fits).length;
  $('keysHint').textContent='Written range '+noteName(range.low)+' to '+noteName(range.high)+'. '+(out?out+(out===1?' key does':' keys do')+' not fit on the flute in any octave.':'Every key fits on the flute.')+' Tap a key name to preview it.';
  $('keyGrid').replaceChildren(...keys.map(k=>{
    const move={semitones:k.semitones,octave:k.octave},row=document.createElement('div');
    row.className='key'+(k.semitones===viewing?' viewing':'')+(k.fits?'':' out');
    const box=document.createElement('input');box.type='checkbox';box.checked=chosen.has(k.semitones);box.disabled=!k.fits;box.setAttribute('aria-label','Include '+keyLabel(written,move));
    box.onchange=()=>{box.checked?chosen.add(k.semitones):chosen.delete(k.semitones);sync()};
    const text=document.createElement('div'),name=document.createElement('b'),note=document.createElement('small');
    name.textContent=keyLabel(written,move);
    note.textContent=k.fits?moveText(k):'Out of range';
    text.append(name,note);text.onclick=()=>{viewing=k.semitones;showKeys();render()};
    row.append(box,text);return row;
  }));
}
async function render(){
  const preview=$('preview'),k=keys.find(k=>k.semitones===viewing)||{semitones:0,octave:0};
  const written=readKey(xml),move={semitones:k.semitones,octave:k.octave},moved=transposeXml(xml,planFor(written,move));
  $('previewTitle').textContent=keyLabel(written,move);
  $('previewRange').textContent=moved.low===null?'':moved.lowName+' to '+moved.highName+' · '+moveText(k);
  installGhostNoteFix(opensheetmusicdisplay.VexFlowConverter);
  preview.className='preview';preview.replaceChildren();
  const osmd=new opensheetmusicdisplay.OpenSheetMusicDisplay(preview,{backend:'svg',autoResize:true,drawTitle:false,drawComposer:false,drawingParameters:'compacttight'});
  osmd.EngravingRules.RenderChordSymbols=false;await osmd.load(moved.xml);osmd.render();
}
function useXml(value,keep){
  xml=value;viewing=0;showKeys();
  chosen=new Set(keep?keep.map(k=>k.semitones).filter(s=>keys.some(k=>k.semitones===s&&k.fits)):keys.filter(k=>k.fits).map(k=>k.semitones));
  showKeys();sync();return render();
}

function choose(f){
  if(!f)return;if(!/\.(mscz|mscx|musicxml|xml)$/i.test(f.name)){status.textContent='Choose a .mscz, .mscx or .musicxml file.';return}
  const dt=new DataTransfer();dt.items.add(f);file.files=dt.files;$('fileName').textContent=f.name;convert.disabled=false;status.textContent='Ready to convert.';
}
file.onchange=()=>choose(file.files[0]);
drop.ondragover=e=>{e.preventDefault();drop.classList.add('over')};drop.ondragleave=()=>drop.classList.remove('over');
drop.ondrop=e=>{e.preventDefault();drop.classList.remove('over');choose(e.dataTransfer.files[0])};

convert.onclick=async()=>{
  convert.disabled=true;status.textContent=/\.(musicxml|xml)$/i.test(file.files[0].name)?'Reading the file…':'MuseScore is converting the file…';
  try{
    const data=new FormData();data.append('score',file.files[0]);
    const response=await fetch('/melodies/convert',{method:'POST',body:data}),result=await response.json();if(!response.ok)throw new Error(result.error);
    if(!title.value)title.value=result.title;fromServer=false;
    const prior=list.find(item=>item.id===replace.value);
    await useXml(result.xml,prior?.keys);status.textContent='Converted. Check each key, then save.';
  }catch(error){status.textContent=error.message||'Conversion failed.'}finally{convert.disabled=false}
};
replace.onchange=async()=>{
  const item=list.find(entry=>entry.id===replace.value);
  if(!item){xml='';fromServer=false;title.value=source.value=tempo.value='';$('keysPanel').hidden=true;$('preview').className='preview empty';$('preview').textContent='Convert a file to see it here.';sync();return}
  title.value=item.title;source.value=item.source||'';tempo.value=item.defaultTempo??'';
  status.textContent='Loading '+item.title+'…';
  try{const response=await fetch('/melodies/score?id='+encodeURIComponent(item.id));if(!response.ok)throw new Error((await response.json()).error);fromServer=true;await useXml(await response.text(),item.keys);status.textContent='Change the details or keys and save, or drop a new file to replace the melody.'}
  catch(error){status.textContent=error.message||'Could not load that melody.'}
};
save.onclick=async()=>{
  if(!title.value.trim()){status.textContent='Give the melody a title.';return}
  save.disabled=true;status.textContent='Saving…';
  try{
    const picked=keys.filter(k=>chosen.has(k.semitones)).map(({semitones,octave})=>({semitones,octave}));
    const response=await fetch('/melodies/save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({replaceId:replace.value||null,xml:fromServer?'':xml,title:title.value,source:source.value,tempo:tempo.value,keys:picked})});
    const result=await response.json();if(!response.ok)throw new Error(result.error);
    await loadList();replace.value=result.id;fromServer=true;tempo.value=result.defaultTempo??'';
    status.innerHTML='';const ok=document.createElement('span');ok.className='ok';
    ok.textContent=(result.detailsOnly?'Saved ':result.replaced?'Replaced ':'Added as No. '+result.number+': ')+result.title+', in '+picked.length+(picked.length===1?' key.':' keys.');
    status.append(ok);
  }catch(error){status.textContent=error.message||'Could not save the melody.'}finally{sync()}
};
loadList();
</script></body></html>`;
