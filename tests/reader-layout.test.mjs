import {test} from 'node:test';
import assert from 'node:assert/strict';
import {notationScale,pageOffsets,pageAt} from '../app/flute-studio/components/readerLayout.ts';
test('first page includes title and page breaks consider system bottoms',()=>{
  assert.deepEqual(pageOffsets([{top:120,bottom:240},{top:380,bottom:520},{top:650,bottom:780}],600,400),[0,400]);
});
test('last page is reachable when browser clamps scroll position',()=>{
  const offsets=pageOffsets([{top:80,bottom:300},{top:400,bottom:650},{top:800,bottom:1050}],500,550);
  assert.deepEqual(offsets,[0,376,550]);assert.equal(pageAt(offsets,550),2);
});
test('manual scrolling reports current page without forcing a new offset',()=>{
  assert.equal(pageAt([0,400,800],799),1);assert.equal(pageAt([0,400,800],1000),2);
});
test('notation sizing follows usable dimensions and respects size preference',()=>{
  assert.ok(notationScale(390,500)<notationScale(820,900));
  assert.ok(notationScale(700,350)<notationScale(700,900));
  assert.ok(notationScale(900,700,1.15)>notationScale(900,700));
});
