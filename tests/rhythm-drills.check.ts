// Run: npx tsx tests/rhythm-drills.check.ts
import assert from "node:assert/strict";
import {barLength,makeRhythm,maxLength,rankOf,rng,shortestOf,tempoFor,TOP_RANK,type DrillPattern} from "../app/flute-studio/rhythm-drills/drills";
import {compileRhythm,gradeTaps} from "../app/flute-studio/theory/dots-and-ties/rhythmSequence";
import realBars from "../app/flute-studio/rhythm-drills/real-bars.json";

const ROOMS={phone:400,desktop:720};
const PER=300;

/** Shared checks for any drill rhythm, generated or real. */
function checkPattern(p:DrillPattern,label:string,room:number){
  const data=compileRhythm(p);
  const bars=(p.bars?.length??0)+1,bar=barLength(p.meter);
  assert(Math.abs(data.total-bar*bars)<1e-9,`${label}: ${data.total} quarters, expected ${bar*bars}`);
  // Every bar adds up to the meter.
  const starts=[0,...(p.bars??[])],ends=[...(p.bars??[]),p.items.length];
  starts.forEach((s,b)=>{const sum=compileRhythm({...p,items:p.items.slice(s,ends[b]).map(i=>({...i,tieNext:false}))}).total;assert(Math.abs(sum-bar)<1e-9,`${label} bar ${b}: ${sum}`)});
  assert(data.onsets.length>=2,`${label}: too few notes`);
  assert(bar*bars<=maxLength(room,shortestOf(p.items))+1e-6,`${label}: too crowded for ${room}`);
  p.beams?.forEach(g=>g.forEach(i=>assert(!p.items[i].rest&&p.items[i].written<1,`${label}: bad beam`)));
  p.tuplets?.forEach(g=>{for(let i=g.from;i<=g.to;i++)assert(p.items[i].ratio,`${label}: tuplet bracket over a plain note`)});
  // Taps a little early (as people tap) pass; leaving a note out fails.
  const spq=60/tempoFor(p.rank||1,p);
  assert(gradeTaps(data.onsets.map(o=>o-.025/spq),data.onsets,spq).perfect,`${label}: perfect taps not perfect`);
  assert(!gradeTaps(data.onsets.slice(1),data.onsets,spq).perfect,`${label}: a missing note passed`);
}

for(const [device,room] of Object.entries(ROOMS)){
  const random=rng(device.length*977);
  const variety:number[]=[];
  for(let level=1;level<=20;level++){
    const seen=new Set<string>();
    for(let k=0;k<PER;k++){
      const p=makeRhythm(level,random,room,`t-${level}-${k}`);
      const label=`${device} level ${level} #${k}`;
      assert(p.rank>0,`${label}: fell back`);
      if(level<TOP_RANK)assert.equal(p.rank,level,`${label}: rank ${p.rank}`);
      else assert(p.rank>=10,`${label}: rank ${p.rank} too easy`);
      assert.equal(rankOf(p.items,p.meter),p.rank);
      // Nothing crosses the middle of a 4/4 bar unless it starts on beat 1 (below the syncopation levels).
      let t=0;
      for(const item of p.items){
        const len=item.ratio?item.written*item.ratio[1]/item.ratio[0]:item.written,from=t%4;t+=len;
        if(p.meter.top===4&&p.meter.bottom===4&&from<2-1e-9&&from+len>2+1e-9&&level<10)assert(from<1e-9,`${label}: crosses the half bar`);
      }
      checkPattern(p,label,room);
      seen.add(JSON.stringify([p.meter,p.items]));
    }
    variety.push(seen.size);
  }
  console.log(`ok ${device}: levels 1 to 20 x ${PER}. distinct rhythms per level:`,variety.join(", "));
}

// Real bars from the library: each one is a valid drill on a wide screen, and rated on the same ladder.
const real=realBars as unknown as DrillPattern[];
assert(real.length>20,`only ${real.length} real bars`);
for(const p of real){
  const label=`${p.source?.title} bar ${p.source?.bar}`;
  assert.equal(rankOf(p.items,p.meter),p.rank,`${label}: stored rank`);
  checkPattern(p,label,ROOMS.desktop);
}
const byRank=new Map<number,number>();real.forEach(p=>byRank.set(p.rank,(byRank.get(p.rank)??0)+1));
console.log(`ok real bars: ${real.length} from ${new Set(real.map(p=>p.source?.piece)).size} pieces. by rank:`,[...byRank].sort((a,b)=>a[0]-b[0]).map(([r,c])=>`${r}:${c}`).join(" "));
