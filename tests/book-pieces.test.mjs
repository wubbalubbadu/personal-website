import {test} from 'node:test';
import assert from 'node:assert/strict';
import {orderedBookPieces} from '../content/book-pieces.js';
test('missing route IDs never send ordinary pieces into the book sorter',()=>{
 const items=[{id:'ordinary'},{book:{id:'reichert',number:2}},{book:{id:'reichert',number:1}},{book:{id:'reichert'}}];
 assert.deepEqual(orderedBookPieces(items,undefined),[]);
 assert.deepEqual(orderedBookPieces(items,''),[]);
 assert.deepEqual(orderedBookPieces(items,'reichert').map(i=>i.book.number),[1,2]);
});
