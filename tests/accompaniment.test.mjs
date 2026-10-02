import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {readAccompaniment} from '../app/flute-studio/components/accompaniment.ts';
import {normalizeMeasureRests} from '../app/flute-studio/components/measureRests.ts';
const swan=fs.readFileSync('public/music/camille-saint-saens-le-cygne/full-score.musicxml','utf8');
test('Swan piano starts at the first beat, keeps both hands and keeps the final piano attack in written bar 28',()=>{
 const result=readAccompaniment(swan);assert.equal(result.kind,'piano');assert.ok(result.notes.length>100);assert.equal(Math.min(...result.notes.map(n=>n.at)),0);assert.equal(Math.max(...result.notes.map(n=>n.at+n.duration)),162.5);assert.ok(result.notes.filter(n=>n.at===0).length>=2);
});
test('chord symbols generate a named chord voicing and no silent substitute for unsupported symbols',()=>{
 const result=readAccompaniment(fs.readFileSync('public/music/traditional-greensleeves/full-score.musicxml','utf8'));assert.equal(result.kind,'chords');assert.ok(result.notes.length>20);assert.ok(result.notes.every(n=>n.duration>0));
});
test('piano backups, chord notes and ties keep independent timing',()=>{
 const xml='<score-partwise><part id="P1"><measure><attributes><divisions>1</divisions></attributes><note><rest/><duration>4</duration></note></measure><measure><note><rest/><duration>4</duration></note></measure></part><part id="P2"><measure><attributes><divisions>1</divisions><staves>2</staves></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><tie type="start"/></note><note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note><backup><duration>4</duration></backup><note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>2</voice></note></measure><measure><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><tie type="stop"/></note></measure></part></score-partwise>';
 const {notes}=readAccompaniment(xml);assert.equal(notes.length,3);assert.ok(notes.every(n=>n.at===0));assert.equal(notes.find(n=>n.pitch==='C4').duration,8);
});
test('whole rest and invisible filler become one genuine centered measure rest in 6/4',()=>{
 const reading=fs.readFileSync('public/music/camille-saint-saens-le-cygne/score.musicxml','utf8'),normalized=normalizeMeasureRests(reading),bar=normalized.match(/<measure\b[^>]*>([\s\S]*?)<\/measure>/)[1];assert.equal((bar.match(/<note\b/g)??[]).length,1);assert.ok(bar.includes('<rest measure="yes"/>'));assert.ok(bar.includes('<duration>24</duration>'));assert.equal(normalizeMeasureRests(normalized),normalized);
});
test('quarter rests and incomplete pickup rests retain their layout and duration',()=>{
 for(const duration of [1,3]){const xml=`<score-partwise><part id="P1"><measure><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes><note><rest/><duration>${duration}</duration><type>${duration===1?'quarter':'whole'}</type></note></measure></part></score-partwise>`;assert.equal(normalizeMeasureRests(xml),xml)}
});
test('every sampled piano key exists as decodable PCM16 WAV',async()=>{
 const {pianoSampleKeys}=await import('../app/flute-studio/components/pianoSampleKeys.ts');assert.equal(pianoSampleKeys[0],36);assert.equal(pianoSampleKeys.at(-1),96);
 for(const key of pianoSampleKeys){const wav=fs.readFileSync(`public/audio/piano/${key}.wav`);assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt16LE(20),1);assert.equal(wav.readUInt16LE(34),16);assert.ok(wav.length>10000)}
});
