import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const compile=source=>ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const source=fs.readFileSync(new URL('../app/flute-studio/lib/transfer.ts',import.meta.url),'utf8');

/** A localStorage for each simulated device; transfer.ts reads the global, so swap it per step. */
const makeStore=(initial={})=>{
  const map=new Map(Object.entries(initial));
  return {get length(){return map.size},key:i=>[...map.keys()][i]??null,getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>{map.set(k,String(v))},removeItem:k=>{map.delete(k)},dump:()=>Object.fromEntries(map)};
};
globalThis.localStorage=makeStore();
const {merge,collect,encode,decode,apply,describe}=await import(`data:text/javascript;base64,${Buffer.from(compile(source)).toString('base64')}`);
const withStore=(store,run)=>{globalThis.localStorage=store;return run()};

test('Scale Studio preferences take the code whole instead of combining their lists',()=>{
  const here=JSON.stringify({types:['major'],keys:['C','D'],bySignature:false});
  const arriving=JSON.stringify({types:['natural'],keys:['G'],bySignature:true});
  assert.deepEqual(JSON.parse(merge(here,arriving,'cookie:scale-book:preferences:v3')),{types:['natural'],keys:['G'],bySignature:true});
  assert.deepEqual(JSON.parse(merge(here,arriving,'cookie:long-tones:preferences:v1')),{types:['natural'],keys:['G'],bySignature:true});
});

test('music list status keeps whichever change was made last, per piece',()=>{
  const here=JSON.stringify({a:{status:'learned',at:500},b:{status:'want',at:100},c:{status:'working',at:50}});
  const arriving=JSON.stringify({a:{status:'want',at:200},b:{status:'learned',at:900},d:{status:'want',at:10}});
  const merged=JSON.parse(merge(here,arriving,'cookie:music-status:v1'));
  assert.equal(merged.a.status,'learned');   // this device changed it later
  assert.equal(merged.b.status,'learned');   // the code changed it later
  assert.equal(merged.c.status,'working');   // only here
  assert.equal(merged.d.status,'want');      // only in the code
});

test('saved scale sets combine by id, the newer copy wins, and a set from either side survives',()=>{
  const set=(id,name,savedAt,bySignature)=>({id,name,savedAt,config:{keys:['C'],bySignature}});
  const here=JSON.stringify([set('1','Monday','2026-10-01T10:00:00Z',false),set('2','Thirds','2026-10-02T10:00:00Z',false)]);
  const arriving=JSON.stringify([set('1','Monday (edited)','2026-10-03T10:00:00Z',true),set('3','Relatives','2026-10-03T11:00:00Z',true),set('2','Old thirds','2026-09-01T10:00:00Z',false)]);
  const merged=JSON.parse(merge(here,arriving,'cookie:scale-book:sets:v1'));
  const byId=Object.fromEntries(merged.map(item=>[item.id,item]));
  assert.equal(merged.length,3);
  assert.equal(byId['1'].name,'Monday (edited)');
  assert.equal(byId['1'].config.bySignature,true);   // the newer set keeps its key-signature layout
  assert.equal(byId['2'].name,'Thirds');             // this device's copy is newer
  assert.ok(byId['3']);
});

test('practice sessions from both devices are kept, in time order',()=>{
  const s=(startedAt)=>({startedAt,durationSeconds:600});
  const merged=JSON.parse(merge(JSON.stringify([s('2026-10-02T09:00:00Z'),s('2026-10-01T09:00:00Z')]),JSON.stringify([s('2026-10-03T09:00:00Z'),s('2026-10-02T09:00:00Z')]),'cookie:practice-sessions:v1'));
  assert.equal(merged.length,3);
  assert.deepEqual(merged.map(x=>x.startedAt),['2026-10-03T09:00:00Z','2026-10-02T09:00:00Z','2026-10-01T09:00:00Z']);
});

test('book progress and a tick list behave as before',()=>{
  assert.deepEqual(JSON.parse(merge('{"kohler":[1,2]}','{"kohler":[2,3]}','cookie:book-progress:v1')).kohler.sort(),[1,2,3]);
  assert.deepEqual(JSON.parse(merge('[true,false,false]','[false,true,false]','cookie:practice-plan')),[false,true,false]);
});

test('what a code holds is listed in the words the studio uses, Scale Studio setup included',()=>{
  const snapshot={at:new Date().toISOString(),data:{'cookie:scale-book:preferences:v3':'{}','cookie:scale-book:tempos:v1':'{}','cookie:scale-book:sets:v1':'[]','cookie:music-status:v1':'{}','cookie:language':'"en"'}};
  const lines=describe(snapshot,false);
  assert.ok(lines.includes('Scale Studio setup and tempos'));
  assert.ok(lines.includes('Your lists and saved sets'));
  assert.ok(lines.includes('Settings'));
});

test('copy code on one device, combine on another: a full round trip',async()=>{
  const laptop=makeStore({
    'cookie:scale-book:sets:v1':JSON.stringify([{id:'a',name:'Relatives',savedAt:'2026-10-03T10:00:00Z',config:{bySignature:true,keys:['G']}}]),
    'cookie:scale-book:preferences:v3':JSON.stringify({bySignature:true,order:'fifths'}),
    'cookie:music-status:v1':JSON.stringify({kohler:{status:'working',at:2000}}),
    'cookie:reader-view:piece:v1':'{"noteDisplay":"names"}',          // stays on its own screen
    'cookie:rail-open':'true',
    'not-ours':'x',
  });
  const code=await withStore(laptop,()=>encode(collect(true)));
  assert.match(code,/^CFS1\./);
  const ipad=makeStore({
    'cookie:scale-book:sets:v1':JSON.stringify([{id:'b',name:'Thirds',savedAt:'2026-10-01T10:00:00Z',config:{keys:['C']}}]),
    'cookie:scale-book:preferences:v3':JSON.stringify({bySignature:false,order:'chromatic'}),
    'cookie:music-status:v1':JSON.stringify({kohler:{status:'learned',at:1000},flow:{status:'want',at:500}}),
    'cookie:reader-view:piece:v1':'{"noteDisplay":"off"}',
  });
  const snapshot=await decode(code);
  assert.equal(typeof snapshot,'object');
  withStore(ipad,()=>apply(snapshot));
  const result=ipad.dump();
  assert.equal(JSON.parse(result['cookie:scale-book:sets:v1']).length,2);
  assert.equal(JSON.parse(result['cookie:scale-book:preferences:v3']).bySignature,true);
  assert.equal(JSON.parse(result['cookie:music-status:v1']).kohler.status,'working');
  assert.equal(JSON.parse(result['cookie:music-status:v1']).flow.status,'want');
  assert.equal(result['cookie:reader-view:piece:v1'],'{"noteDisplay":"off"}');   // this device's view settings untouched
  assert.equal(result['cookie:rail-open'],undefined);
  assert.equal(result['not-ours'],undefined);
});

test('a pasted code with line breaks still reads, and a wrong one says so',async()=>{
  const code=await withStore(makeStore({'cookie:language':'"zh"'}),()=>encode(collect(false)));
  const wrapped=code.replace(/(.{20})/g,'$1\n');
  assert.equal(typeof await decode(wrapped),'object');
  assert.equal(await decode('hello'),'not-a-code');
  assert.equal(await decode(code.slice(0,code.length-30)),'damaged');
});
