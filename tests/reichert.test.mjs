import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {filterKeySections,keyDroneChanges} from '../app/flute-studio/lib/keySections.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../content/music-catalog.json',import.meta.url)));
const pieces=catalog.filter(p=>p.book?.id==='reichert-op-5');
test('Reichert is seven book entries with 24 keys in book order',()=>{
 assert.equal(pieces.length,7);
 for(const piece of pieces){assert.equal(piece.keySections.length,24);assert.equal(piece.keySections[0].label,'C major');assert.equal(piece.keySections[1].label,'a minor');assert.equal(piece.keySections.at(-2).label,'G major');assert.equal(piece.keySections.at(-1).label,'e minor')}
});
test('Every key keeps the pattern note count and filtering renumbers bars',()=>{
 for(const piece of pieces){
  const xml=fs.readFileSync(new URL('../public'+piece.scorePath,import.meta.url),'utf8');
  const count=mode=>piece.keySections.filter(s=>s.id.endsWith(mode)).map(s=>(filterKeySections(xml,[s.id]).match(/<note\b/g)||[]).length);
  for(const mode of ['major','minor'])assert.equal(new Set(count(mode)).size,1);
  const selected=filterKeySections(xml,['-1-major','0-minor']);
  assert.ok(selected.indexOf('a minor')<selected.indexOf('F major'));
  const numbers=[...selected.matchAll(/<measure\b[^>]*number="(\d+)"/g)].map(m=>Number(m[1]));
  assert.deepEqual(numbers,numbers.map((_,i)=>i+1));
  assert.ok(!selected.includes('G major'));
 }
});
test('key boundaries keep one clef and meter, with optional new lines',()=>{
 const piece=pieces[1],xml=fs.readFileSync(new URL('../public'+piece.scorePath,import.meta.url),'utf8');
 const selected=['0-major','0-minor','-1-major'];
 const continuous=filterKeySections(xml,selected),lines=filterKeySections(xml,selected,true);
 for(const result of [continuous,lines]){assert.equal((result.match(/<clef>/g)||[]).length,1);assert.equal((result.match(/<time>/g)||[]).length,1);assert.equal((result.match(/<bar-style>light-light<\/bar-style>/g)||[]).length,3)}
 assert.equal((continuous.match(/<print new-system/g)||[]).length,0);assert.equal((lines.match(/<print new-system/g)||[]).length,2);
 assert.equal((continuous.match(/<note>/g)||[]).length,(lines.match(/<note>/g)||[]).length);
});

test('tonic drones follow filtered keys and fermatas precede new pickups',()=>{
 const xml=fs.readFileSync(new URL('../public'+pieces[1].scorePath,import.meta.url),'utf8');
 const selected=filterKeySections(xml,['0-minor','-1-major']);
 assert.deepEqual(keyDroneChanges(selected).map(c=>c.pitch),['A3','F3']);
 assert.equal(keyDroneChanges(selected)[0].measure,1);
 assert.equal((selected.match(/<fermata>/g)||[]).length,2);
});
