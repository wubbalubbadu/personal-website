import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../app/flute-studio/lib/annotationDocument.ts',import.meta.url),'utf8');
const module=ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const {AnnotationHistory,AnnotationContacts,emptyAnnotations,paperPoint,moveMark,hitsInk,penOutline}=await import(`data:text/javascript;base64,${Buffer.from(module).toString('base64')}`);
const stroke={id:'pen',kind:'pen',width:2.4,color:'red',points:[{x:10,y:20,p:.2},{x:110,y:20,p:.8}]};
const sticky={id:'sticky',kind:'sticky',x:50,y:60,text:'',color:'black'};

test('one history restores ink, text, sticky, movement, erasure and clear in reverse order',()=>{
  const legacy={src:'data:image/png;base64,test',width:900,height:1200};
  const initial={...emptyAnnotations(),legacy};
  const h=new AnnotationHistory(initial),states=[initial];
  const add=marks=>{const next={...h.current,marks};h.commit(next);states.push(next)};
  add([stroke]);add([stroke,{...sticky,kind:'text',id:'text',text:'Breathe'}]);add([...h.current.marks,sticky]);
  add(h.current.marks.map(m=>m.id==='sticky'?moveMark(m,40,30):m));
  add(h.current.marks.filter(m=>m.id!=='pen'));
  h.commit(emptyAnnotations());states.push(h.current);
  for(let i=states.length-2;i>=0;i--)assert.deepEqual(h.undo(),states[i]);
  assert.equal(h.canUndo,false);
  for(let i=1;i<states.length;i++)assert.deepEqual(h.redo(),states[i]);
  assert.equal(h.canRedo,false);
  assert.equal(initial.legacy,legacy);
  assert.equal(sticky.x,50);
});
test('typing bursts coalesce; a new edit after undo discards redo',()=>{
  const h=new AnnotationHistory();h.commit({...h.current,marks:[sticky]});
  const type=(text,at)=>h.commit({...h.current,marks:[{...sticky,text}]},'typing:sticky',at);
  type('H',1000);type('He',1100);type('Hello',1200);type('Hello world',2500);
  assert.equal(h.undo().marks[0].text,'Hello');assert.equal(h.undo().marks[0].text,'');
  h.commit({...h.current,marks:[stroke]});assert.equal(h.canRedo,false);
});
test('Pencil owns input and rejected palms cannot become a pinch after it lifts',()=>{
  const c=new AnnotationContacts();
  assert.equal(c.touchDown(1,20,20,8,8,1000),true);
  c.penDown(2,1020);assert.equal(c.touches.size,0);assert.equal(c.blocked.has(1),true);
  assert.equal(c.touchDown(3,50,50,10,10,1050),false);
  c.up(2,1200);assert.equal(c.blocked.has(1),true);assert.equal(c.blocked.has(3),true);
  assert.equal(c.touchDown(4,30,30,8,8,1300),false);
  c.up(1,1400);c.up(3,1400);c.up(4,1400);
  assert.equal(c.touchDown(5,30,30,8,8,1600),true);
  assert.equal(c.touchDown(6,60,60,8,8,1680),true);assert.equal(c.pinchAllowed,true);
});
test('large contacts and a late second contact never qualify as a deliberate pinch',()=>{
  const c=new AnnotationContacts();assert.equal(c.touchDown(1,0,0,40,10,1000),false);
  c.touchDown(2,0,0,8,8,1100);c.touchDown(3,50,50,8,8,1600);assert.equal(c.pinchAllowed,false);
});
test('pointer coordinates round-trip at zoom and scroll offsets without drift',()=>{
  for(const zoom of [.5,.8,1,1.75,3]){
    const box={left:70-120*zoom,top:90-230*zoom,width:900*zoom,height:2000*zoom};
    const p=paperPoint(box.left+321*zoom,box.top+456*zoom,box,900,2000);
    assert.ok(Math.abs(p.x-321)<1e-8);assert.ok(Math.abs(p.y-456)<1e-8);
  }
});
test('stroke erasing hits between samples and moving keeps pressure and source immutable',()=>{
  assert.equal(hitsInk(stroke,{x:50,y:22,p:.5}),true);
  assert.equal(hitsInk(stroke,{x:50,y:90,p:.5}),false);
  const moved=moveMark(stroke,20,30);assert.equal(moved.points[0].p,.2);assert.equal(stroke.points[0].x,10);
  assert.notEqual(penOutline(stroke),penOutline({...stroke,points:stroke.points.map(p=>({...p,p:1}))}));
});
