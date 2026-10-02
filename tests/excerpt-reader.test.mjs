import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const root=new URL('../',import.meta.url);
const moduleUrl=file=>'data:text/javascript;base64,'+Buffer.from(ts.transpile(fs.readFileSync(new URL(file,root),'utf8'),{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022})).toString('base64');
const source=fs.readFileSync(new URL('app/flute-studio/lib/annotationAnchors.ts',root),'utf8').replace("'./annotationDocument'",JSON.stringify(moduleUrl('app/flute-studio/lib/annotationDocument.ts')));
const {annotationLayout,attachMark,placeMark}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022})).toString('base64'));
function pageLayout(width,zoom=1){
  const rect={left:10,top:20,width:width*zoom,height:width*1.2*zoom};
  const page={matches:()=>true,getAttribute:()=> '0',getBoundingClientRect:()=>rect,querySelectorAll:()=>[]};
  return annotationLayout(page,{clientWidth:width,clientHeight:width*1.2,getBoundingClientRect:()=>rect});
}
test('printed-page ink remains attached across fit sizes and pinch magnification',()=>{
  const ink={id:'breath',kind:'pen',color:'red',width:2,points:[{x:100,y:200,p:.5},{x:200,y:220,p:.5}]};
  const saved=attachMark(ink,pageLayout(1000));
  const placed=placeMark(saved,pageLayout(500,2));
  assert.deepEqual(placed.points,[{x:50,y:100,p:.5},{x:100,y:110,p:.5}]);
  assert.equal(placed.width,1);
  assert.deepEqual(placeMark(saved,pageLayout(1000,3)).points,ink.points);
});
test('page text survives reload and follows the page origin when refitted',()=>{
  const note=attachMark({id:'text',kind:'text',x:400,y:600,text:'Breathe',color:'red'},pageLayout(1000));
  const restored=placeMark(JSON.parse(JSON.stringify(note)),pageLayout(750));
  assert.equal(restored.x,300);assert.equal(restored.y,450);assert.equal(restored.text,'Breathe');
});
test('Daphnis has a reachable original score, PDF, attribution and recording',()=>{
  const catalog=JSON.parse(fs.readFileSync(new URL('content/music-catalog.json',root),'utf8'));
  const item=catalog.find(i=>i.id==='ravel-daphnis-et-chloe-176');
  assert.equal(item.status,'published');assert.equal(item.viewerPath,'/flute-studio/music/'+item.id);
  assert.ok(item.scorePath.endsWith('.musicxml'));assert.ok(fs.existsSync(new URL('public'+item.scorePath,root)));assert.ok(item.tags.includes('Excerpt'));
  assert.ok(fs.existsSync(new URL('public'+item.pdfPath,root)));
  for(const page of item.excerpt.pages){assert.ok(page.width>0&&page.height>0);assert.ok(fs.existsSync(new URL('public'+page.src,root)))}
  assert.equal(item.excerpt.sourceUrl,undefined);
  assert.match(item.recordings[0].youtubeId,/^[a-zA-Z0-9_-]{11}$/);
});
test('Mendelssohn excerpt keeps the printed scan and the corrected continuing articulation',()=>{
  const catalog=JSON.parse(fs.readFileSync(new URL('content/music-catalog.json',root),'utf8'));
  const item=catalog.find(i=>i.id==='felix-mendelssohn-midsummer-scherzo');
  assert.equal(item.status,'published');
  assert.ok(item.tags.includes('Excerpt'));
  assert.equal(item.excerpt.pages.length,1);
  for(const path of [item.scorePath,item.pdfPath,item.excerpt.pages[0].src])assert.ok(fs.existsSync(new URL('public'+path,root)));
  assert.equal(item.sempreStaccatoFromMeasure,1);
  assert.equal(item.pulsePerMeasure,true);
  assert.equal(item.defaultTempo,84);
  const terms=JSON.parse(fs.readFileSync(new URL('content/music-terms.json',root),'utf8'));
  assert.match(terms['sempre stacc'].meaning,/every note short and detached/);
  const xml=fs.readFileSync(new URL('public'+item.scorePath,root),'utf8');
  assert.match(xml,/<measure number="15">[\s\S]*?<words>sempre stacc\.<\/words>/);
  assert.doesNotMatch(xml,/sempre marc\./);
  const fifteenth=xml.match(/<measure number="15">([\s\S]*?)<\/measure>/)?.[1];
  assert.ok(fifteenth);
  assert.doesNotMatch(fifteenth,/<staccato\/>/);
});
