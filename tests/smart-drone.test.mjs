import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {droneEvents} from '../app/flute-studio/components/smartDrone.ts';
const xml=fs.readFileSync('public/music/ravel-daphnis-et-chloe-176/score.musicxml','utf8');
const catalog=JSON.parse(fs.readFileSync('content/music-catalog.json','utf8'));
const changes=catalog.find(i=>i.id==='ravel-daphnis-et-chloe-176').smartDrone;
const measures=[...xml.matchAll(/<measure\b[^>]*>([\s\S]*?)<\/measure>/g)].map(m=>m[1]);
const events=[],starts=[];let divisions=1;
for(const measure of measures){starts.push(events.length);divisions=Number(measure.match(/<divisions>(.*?)<\/divisions>/)?.[1]??divisions);for(const match of measure.matchAll(/<note\b[^>]*>([\s\S]*?)<\/note>/g)){const n=match[1];events.push({p:n.includes('<pitch>')?'note':null,d:Number(n.match(/<duration>(.*?)<\/duration>/)?.[1]??0)/divisions})}}
const pitches=droneEvents(changes,events,starts);
test('Daphnis changes at the corrected octaves and stops at measure 26',()=>{
  for(const [measure,pitch] of [[4,'G♯6'],[7,'C♯6'],[9,'C♯5'],[12,'B4'],[16,'B5'],[17,'D♯5'],[19,'A♯4'],[22,'D6'],[25,'A♭4'],[26,null],[27,null]])assert.equal(pitches[starts[measure-1]],pitch);
});
test('A sharp starts on the final note of 18, not its downbeat',()=>{assert.equal(pitches[starts[17]],'D♯5');assert.equal(pitches[starts[18]-2],'D♯5');assert.equal(pitches[starts[18]-1],'A♯4')});
test('at quarter note 33 every Daphnis bar lasts 3.64 seconds, including tuplets',()=>{for(let m=0;m<starts.length;m++){const bar=events.slice(starts[m],starts[m+1]??events.length);assert.ok(Math.abs(bar.reduce((sum,e)=>sum+e.d,0)*60/33-120/33)<1e-8,`measure ${m+1}`)}});
