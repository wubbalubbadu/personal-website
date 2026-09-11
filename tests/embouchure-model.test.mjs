import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {Vector3} from 'three';
const sourceUrl = path => {
  const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  return ts.transpile(source, {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022});
};
const asModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const poses = asModule(sourceUrl('../app/flute-studio/embouchure/poses.ts'));
const source = sourceUrl('../app/flute-studio/embouchure/model.ts')
  .replace("'three'", JSON.stringify(import.meta.resolve('three')))
  .replace("'./poses'", JSON.stringify(poses));
const {createModel} = await import(asModule(source));

test('headjoint stays fixed through every note and intermediate pose', () => {
  const model = createModel();
  model.update(59,0,true);
  const instrument=model.root.getObjectByName('Headjoint');
  const initial=instrument.matrixWorld.toArray();
  for(let n=59;n<=98;n+=.25){
    model.update(n,(n-59)/60,true);
    assert.deepEqual(instrument.matrixWorld.toArray(),initial);
    model.root.traverse(o=>{if(o.geometry)assert.ok(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));});
  }
});

test('high lip covers approximately two thirds, with wider low-note jet',()=>{
  const model=createModel();model.update(59,0,true);
  const jet=model.root.getObjectByName('Lip jet').geometry.attributes.position;
  const width=()=>new Vector3().fromBufferAttribute(jet,0).distanceTo(new Vector3().fromBufferAttribute(jet,1));
  const lowWidth=width();model.update(98,1/60,true);assert.ok(lowWidth>width()*2.5);
  const lip=model.root.getObjectByName('Floor of mouth, chin and lower lip');
  let right=-Infinity;const v=new Vector3();
  for(let i=0;i<lip.geometry.attributes.position.count;i++){lip.getVertexPosition(i,v);right=Math.max(right,v.x);}
  const coverage=(right-.42)/(1.04-.42);
  assert.ok(coverage>=.60&&coverage<=.68,`coverage ${coverage}`);
});

test('speed transitions do not jump phase or briefly accelerate on descent',()=>{
  const model=createModel(),material=model.root.getObjectByName('Lip jet').material;
  let time=0;model.update(98,time,true);
  for(let i=0;i<240;i++)model.update(98,time+=1/60,true);
  let previous=material.uniforms.phase.value,lastDelta=Infinity;
  for(let i=0;i<120;i++){
    model.update(59,time+=1/60,true);
    const phase=material.uniforms.phase.value,delta=phase-previous;
    assert.ok(delta>0&&delta<=lastDelta+1e-8);
    assert.ok(delta<.04);
    previous=phase;lastDelta=delta;
  }
});

test('jet stays straight and becomes shallower toward high notes; lower teeth advance',()=>{
  const model=createModel();let previousAngle=Infinity;
  for(let n=59;n<=98;n++){
    model.update(n,(n-59)/60,true);
    const pos=model.root.getObjectByName('Lip jet').geometry.attributes.position;
    const midpoint=i=>new Vector3().fromBufferAttribute(pos,i*2).add(new Vector3().fromBufferAttribute(pos,i*2+1)).multiplyScalar(.5);
    const start=midpoint(0),end=midpoint(80),angle=Math.abs(Math.atan2(end.y-start.y,end.x-start.x));
    assert.ok(angle<=previousAngle+1e-6);previousAngle=angle;
    for(let i=1;i<80;i++)assert.ok(midpoint(i).distanceTo(start.clone().lerp(end,i/80))<1e-6);
  }
  assert.ok(previousAngle<.35);
  assert.ok(model.root.getObjectByName('Lower incisors').position.x>-.32);
});

test('unsplit flow enters bore at low notes and clears it at high notes',()=>{
  const model=createModel();
  assert.equal(model.root.getObjectByName('Airflow').children.length,2);
  const end=()=>{const p=model.root.getObjectByName('Lip jet').geometry.attributes.position;return new Vector3().fromBufferAttribute(p,160).add(new Vector3().fromBufferAttribute(p,161)).multiplyScalar(.5);};
  model.update(59,0,true);assert.ok(end().y<-.5);
  const teeth=model.root.getObjectByName('Lower incisors'),lowY=teeth.position.y;
  model.update(98,1/60,true);assert.ok(end().x>1.5&&end().y>0);assert.ok(teeth.position.y-lowY>=.29);
  const lip=model.root.getObjectByName('Floor of mouth, chin and lower lip'),v=new Vector3();
  for(let i=0;i<lip.geometry.attributes.position.count;i++){lip.getVertexPosition(i,v);if(v.x>.44)assert.ok(v.y>-.23);}
});
