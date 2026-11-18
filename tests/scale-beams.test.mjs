import test from 'node:test';
import assert from 'node:assert/strict';
import {tsModule} from './helpers/ts-module.mjs';

// How Scale Studio and the scale book beam each rhythm. Dotted pairs used to come out unbeamed (flagged single
// notes), because only beats whose notes all had one type were beamed.
const {majorKeys,scaleMusicXML}=await import(tsModule('app/flute-studio/exercises/scales/scale-score.ts'));
const C=majorKeys.find(k=>k.id==='C');
const notes=xml=>[...xml.matchAll(/<note>([\s\S]*?)<\/note>/g)].map(([,body])=>({
  type:body.match(/<type>(\w+)<\/type>/)[1],
  b1:body.match(/<beam number="1">([^<]+)<\/beam>/)?.[1]??null,
  b2:body.match(/<beam number="2">([^<]+)<\/beam>/)?.[1]??null,
}));

test('dotted long-short: each pair is beamed, the sixteenth hooks back', ()=>{
  const run=notes(scaleMusicXML(C,'one',undefined,'dottedLongShort'));
  const [long,short]=run;
  assert.deepEqual(long,{type:'eighth',b1:'begin',b2:null});
  assert.deepEqual(short,{type:'16th',b1:'end',b2:'backward hook'});
  assert.ok(run.every(n=>n.b1),'no note is left with a flag');
});

test('dotted short-long: the sixteenth comes first and hooks forward', ()=>{
  const [short,long]=notes(scaleMusicXML(C,'one',undefined,'dottedShortLong'));
  assert.deepEqual(short,{type:'16th',b1:'begin',b2:'forward hook'});
  assert.deepEqual(long,{type:'eighth',b1:'end',b2:null});
});

test('even sixteenths keep two full beams in groups of four', ()=>{
  const run=notes(scaleMusicXML(C,'one'));
  assert.deepEqual(run.slice(0,4).map(n=>[n.b1,n.b2]),[['begin','begin'],['continue','continue'],['continue','continue'],['end','end']]);
});

test('no eighth note ever gets a second beam (the engraver throws on it)', ()=>{
  for(const rhythm of ['even','dottedLongShort','dottedShortLong','triplet'])
    for(const range of ['one','two','full'])
      for(const n of notes(scaleMusicXML(C,range,undefined,rhythm)))
        if(n.type!=='16th')assert.equal(n.b2,null,`${rhythm} ${range}`);
});

test('triplets are beamed in threes with one beam', ()=>{
  const run=notes(scaleMusicXML(C,'one',undefined,'triplet'));
  assert.deepEqual(run.slice(0,3).map(n=>[n.type,n.b1,n.b2]),[['eighth','begin',null],['eighth','continue',null],['eighth','end',null]]);
});
