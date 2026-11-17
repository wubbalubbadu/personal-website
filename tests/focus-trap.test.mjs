import test from 'node:test';
import assert from 'node:assert/strict';
import {tsModule} from './helpers/ts-module.mjs';

const {nextFocusIndex,isTabbable,FOCUSABLE_SELECTOR}=await import(tsModule('app/flute-studio/lib/focusTrap.ts'));

test('Tab on the last stop wraps to the first',()=>{
  assert.equal(nextFocusIndex(4,3,false),0);
});

test('Shift+Tab on the first stop wraps to the last',()=>{
  assert.equal(nextFocusIndex(4,0,true),3);
});

test('a move between two stops inside the dialog is left to the browser',()=>{
  assert.equal(nextFocusIndex(4,0,false),null);
  assert.equal(nextFocusIndex(4,2,false),null);
  assert.equal(nextFocusIndex(4,3,true),null);
  assert.equal(nextFocusIndex(4,1,true),null);
});

test('focus outside the stops enters at the first, or at the last going backwards',()=>{
  assert.equal(nextFocusIndex(4,-1,false),0);
  assert.equal(nextFocusIndex(4,-1,true),3);
  // An index past the end (the list shrank since it was read) is treated the same way.
  assert.equal(nextFocusIndex(2,5,false),0);
  assert.equal(nextFocusIndex(2,5,true),1);
});

test('a single stop keeps focus on itself in both directions',()=>{
  assert.equal(nextFocusIndex(1,0,false),0);
  assert.equal(nextFocusIndex(1,0,true),0);
});

test('no stops at all: focus stays on the dialog itself',()=>{
  assert.equal(nextFocusIndex(0,-1,false),-1);
  assert.equal(nextFocusIndex(0,-1,true),-1);
});

test('isTabbable skips disabled, tabindex=-1 and hidden elements',()=>{
  assert.equal(isTabbable({tabIndex:0,visible:true}),true);
  assert.equal(isTabbable({tabIndex:3,visible:true,disabled:false}),true);
  assert.equal(isTabbable({tabIndex:0,visible:true,disabled:true}),false);
  assert.equal(isTabbable({tabIndex:-1,visible:true}),false);
  assert.equal(isTabbable({tabIndex:0,visible:false}),false);
});

test('the selector covers the usual controls',()=>{
  for(const part of ['a[href]','button','input','select','textarea','[tabindex]'])assert.ok(FOCUSABLE_SELECTOR.split(',').includes(part),part);
});
