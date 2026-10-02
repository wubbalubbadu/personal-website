import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const compile=source=>ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const source=fs.readFileSync(new URL('../app/flute-studio/components/practiceTechniques.ts',import.meta.url),'utf8');
const {dottedGroups,repeatedPairsGroups,slidingGroupsGroups,fermataPicks,splitPatterns,pitchSequence,notesToMusicXML,dotted}=await import(`data:text/javascript;base64,${Buffer.from(compile(source)).toString('base64')}`);

const PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const note=(name,i)=>{const m=name.match(/^([A-G])([♯♭]?)(\d)$/),alter=m[2]==='♯'?1:m[2]==='♭'?-1:0;return {step:m[1],alter,octave:+m[3],midi:(+m[3]+1)*12+PC[m[1]]+alter,beatIndex:i}};
const run=(...names)=>names.map(note);
const units=g=>g.map(x=>x.map(p=>p.units));

test('dotted rhythm pairs notes 3:1 or 1:3 and keeps spelling',()=>{
  const r=[run('B♭4','C5','D5','E♭5','F5')];
  assert.deepEqual(pitchSequence(dottedGroups(r,'longShort')),['B♭4','C5','D5','E♭5','F5']);
  assert.deepEqual(units(dottedGroups(r,'longShort')),[[3,1],[3,1],[4]]);
  assert.deepEqual(units(dottedGroups(r,'shortLong')),[[1,3],[1,3],[4]]);
});

test('pairs are repeated, and shifted pairs start one note later',()=>{
  const r=[run('A4','B4','C5','D5')];
  assert.deepEqual(pitchSequence(repeatedPairsGroups(r,false)),['A4','B4','A4','B4','C5','D5','C5','D5']);
  assert.deepEqual(pitchSequence(repeatedPairsGroups(r,true)),['B4','C5','B4','C5','C5','D5','C5','D5']);
});

test('sliding groups overlap by all but one note and skip short runs',()=>{
  assert.deepEqual(pitchSequence(slidingGroupsGroups([run('A4','B4','C5','D5','E5')],3)),['A4','B4','C5','B4','C5','D5','C5','D5','E5']);
  assert.deepEqual(slidingGroupsGroups([run('A4','B4','C5')],4),[]);
});

test('no technique crosses a rest: runs stay separate',()=>{
  const runs=[run('A4','B4'),run('C5','D5')];
  assert.deepEqual(pitchSequence(slidingGroupsGroups(runs,3)),[]);
  assert.deepEqual(pitchSequence(repeatedPairsGroups(runs,false)),['A4','B4','A4','B4','C5','D5','C5','D5']);
});

test('fermatas: about one in five, never adjacent, different per seed',()=>{
  const a=fermataPicks(20,1),b=fermataPicks(20,2);
  assert.equal(a.length,5);
  assert.ok(a.every((x,i)=>i===0||x-a[i-1]>=2));
  assert.notDeepEqual(a,b);
  assert.deepEqual(fermataPicks(3,5).length,1);
  assert.deepEqual(fermataPicks(0,1),[]);
});

test('tuplet split patterns',()=>{
  assert.deepEqual(splitPatterns(5),[[3,2],[2,3]]);
  assert.deepEqual(splitPatterns(9),[[5,4],[4,5],[3,3,3]]);
  assert.deepEqual(splitPatterns(3),[]);
});

test('XML writer: one bar per written bar, meter adds up the notes, spelling kept',()=>{
  const at=(name,i,measure)=>({...note(name,i),measure});
  const g=(n,units,m)=>({n,units});
  const groups=[[g(at('A4',0,5),3),g(at('B4',1,5),1)],[g(at('C5',2,5),3),g(at('D5',3,5),1)],[g(at('F♯5',4,6),3),g(at('G5',5,6),1)]];
  const xml=notesToMusicXML(groups);
  assert.equal((xml.match(/<measure /g)||[]).length,2);
  assert.match(xml,/<beats>2<\/beats><beat-type>4<\/beat-type>/);
  assert.match(xml,/<alter>1<\/alter>/);
  const odd=notesToMusicXML([[g(at('A4',0,1),1),g(at('B4',1,1),1),g(at('C5',2,1),1)]]);
  assert.match(odd,/<beats>3<\/beats><beat-type>16<\/beat-type>/);
  assert.match(dotted([run('F♯4','G4')],'longShort'),/<alter>1<\/alter>/);
});
