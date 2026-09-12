import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source=fs.readFileSync(new URL('../app/flute-studio/exercises/scales/scale-score.ts',import.meta.url),'utf8');
const compiled=ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const {majorKeys,ranges,scaleNotes,scaleMusicXML,scaleBookMusicXML}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('line layout changes breaks without changing the notes or repeating clefs',()=>{
  const continuous=scaleBookMusicXML(majorKeys,'full');
  const separate=scaleBookMusicXML(majorKeys,'full',true);
  assert.equal((continuous.match(/new-system/g)||[]).length,0);
  assert.equal((separate.match(/new-system/g)||[]).length,12);
  assert.equal((separate.match(/<clef>/g)||[]).length,1);
  assert.deepEqual([...continuous.matchAll(/<note>[\s\S]*?<\/note>/g)].map(m=>m[0]),[...separate.matchAll(/<note>[\s\S]*?<\/note>/g)].map(m=>m[0]));
  assert.equal((separate.match(/<repeat direction="backward"/g)||[]).length,12);
});

test('all 48 scales stay in range and loop by step without doubling the tonic',()=>{
  for(const key of majorKeys)for(const range of ranges){
    const notes=scaleNotes(key,range.id),pitches=notes.map(n=>n.midi);
    const bottom=range.id==='full'?59:range.id==='standard'?60:60+key.pc;
    const top=range.id==='full'?98:range.id==='standard'?96:60+key.pc+(range.id==='one'?12:24);
    assert.equal(pitches[0],60+key.pc);
    assert.ok(pitches.every(n=>n>=bottom&&n<=top),`${key.id} ${range.id}`);
    const steps=pitches.map((n,i)=>Math.abs(n-pitches[(i+1)%pitches.length]));
    assert.ok(steps.every(n=>n===1||n===2),'repeat joins without a jump or repeated note');
    assert.ok(pitches.includes(top)||pitches.includes(top-1),'reaches highest scale note');
    assert.ok(pitches.includes(bottom)||pitches.includes(bottom+1),'reaches lowest scale note');
    if(range.id==='one')assert.equal(notes.length,14);
    if(range.id==='two')assert.equal(notes.length,28);
  }
});

test('flat and sharp keys use diatonic spelling, including C-flat',()=>{
  const gb=scaleNotes(majorKeys.find(k=>k.id==='Gb'),'one');
  assert.deepEqual(gb.slice(0,7).map(n=>`${n.step}:${n.alter}`),['G:-1','A:-1','B:-1','C:-1','D:-1','E:-1','F:0']);
  const b=scaleNotes(majorKeys.find(k=>k.id==='B'),'one');
  assert.deepEqual(b.slice(0,7).map(n=>`${n.step}:${n.alter}`),['B:0','C:1','D:1','E:0','F:1','G:1','A:1']);
});

test('notation is sixteenths with balanced beams, hidden internal bars and one ending repeat',()=>{
  for(const key of majorKeys)for(const range of ranges){
    const xml=scaleMusicXML(key,range.id);
    assert.equal((xml.match(/<note>/g)||[]).length,scaleNotes(key,range.id).length);
    assert.equal((xml.match(/<repeat direction="backward"/g)||[]).length,1);
    assert.equal((xml.match(/>begin<\/beam>/g)||[]).length,(xml.match(/>end<\/beam>/g)||[]).length);
    assert.ok(xml.includes('<time print-object="no">'));
    assert.ok(!xml.includes('<slur'));
    assert.ok(!xml.includes('<rest'));
    const barStyles=[...xml.matchAll(/<bar-style>(.*?)<\/bar-style>/g)].map(m=>m[1]);
    assert.ok(barStyles.slice(0,-1).every(s=>s==='none'));
    assert.equal(barStyles.at(-1),'light-heavy');
  }
});
