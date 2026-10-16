import type {RhythmPattern,RhythmItem} from '../dots-and-ties/rhythmSequence';
export const triplet=():RhythmItem[]=>Array.from({length:3},()=>({written:.5,ratio:[3,2] as const}));
export const splitBeat=(count:2|3|5):RhythmPattern=>({
 id:'split-'+count,top:2,
 items:[...(count===2?[{written:.5},{written:.5}]:count===3?triplet():Array.from({length:5},()=>({written:.25,ratio:[5,4] as const}))),{written:1}],
 beams:[Array.from({length:count},(_,i)=>i)],
 tuplets:count===2?[]:[{from:0,to:count-1,count}]
});
export const TRIPLET_PRACTICE:RhythmPattern={id:'first-triplets',top:2,items:[...triplet(),{written:1}],beams:[[0,1,2]],tuplets:[{from:0,to:2,count:3}]};
export const MIXED_PRACTICE:RhythmPattern[]=[
 {id:'two-three',top:2,items:[{written:.5},{written:.5},...triplet()],beams:[[0,1],[2,3,4]],tuplets:[{from:2,to:4,count:3}]},
 {id:'rest-three',top:3,items:[{written:1,rest:true},...triplet(),{written:1}],beams:[[1,2,3]],tuplets:[{from:1,to:3,count:3}]},
 {id:'dot-tie-three',top:4,items:[{written:1.5},{written:.5,tieNext:true},{written:1},...triplet()],beams:[[3,4,5]],tuplets:[{from:3,to:5,count:3}]}
];
