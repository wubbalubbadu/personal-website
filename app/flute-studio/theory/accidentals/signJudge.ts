import type {Acc} from './pitch';

/**
 * Judging a drawn sign. The learner draws it however they like (any number of strokes, any order,
 * a natural as two little 7s), and the whole drawing is judged, in the staff's own units:
 *
 * 1. every part of the sign is reached: each part (a sharp's 2 uprights and 2 bars, a flat's stem and
 *    bowl, a natural's 2 uprights and 2 bars) has at least half its length covered by ink;
 * 2. the whole is covered, and the ink is on it: at least 75% of the sign's total length is covered,
 *    and at least 60% of the ink is on the sign (which is what stops scribbling).
 *
 * "Covered" and "on the sign" both mean near a part AND running the way that part runs (within about
 * 40 degrees); a point of ink covers only the one part it is clearly nearest, so one stroke can't stand for two parallel parts. The tolerance can then stay generous for a finger without a pair of uprights passing as
 * a whole sharp, since vertical ink says nothing about the bars between them.
 */
export type Pt={x:number;y:number};
type Glyph=[number,number][];

/** Each part of each sign as a polyline in the engraved glyph's units (y up, origin on the note's line or space). */
export const SIGN_PARTS:Record<Acc,Glyph[]>={
  sharp:[[[98,-530],[98,498]],[[225,-495],[225,530]],[[0,-205],[323,-135]],[[0,130],[323,205]]],
  flat:[[[0,-225],[0,625]],[[10,150],[110,195],[210,160],[248,85],[225,-5],[150,-95],[70,-175],[5,-222]]],
  natural:[[[20,440],[20,-225]],[[218,225],[218,-440]],[[40,160],[220,204]],[[20,-180],[197,-136]]],
};
export const GLYPH_SCALE=.064;
/** How far ink may stray from the sign, in staff units: about 8px at 1180 x 820, generous for a finger. */
export const TRACE_TOLERANCE=8.5;

/** The parts of a sign in staff units, placed with the glyph's origin at `origin` (the engraved sign's own placement). */
export function guideParts(sign:Acc,origin:Pt):Pt[][]{
  return SIGN_PARTS[sign].map(part=>part.map(([gx,gy])=>({x:origin.x+gx*GLYPH_SCALE,y:origin.y-gy*GLYPH_SCALE})));
}

type Sample={x:number;y:number;dx:number;dy:number;part:number};
/** Points one staff unit apart along each part, with the way the part runs at each. */
function sampleParts(parts:Pt[][]):Sample[]{
  const out:Sample[]=[];
  parts.forEach((part,k)=>{
    for(let i=1;i<part.length;i++){
      const a=part[i-1],b=part[i],len=Math.hypot(b.x-a.x,b.y-a.y);if(!len)continue;
      const dx=(b.x-a.x)/len,dy=(b.y-a.y)/len,steps=Math.max(1,Math.round(len));
      for(let s=0;s<steps;s++){const t=(s+.5)/steps;out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,dx,dy,part:k})}
    }
  });
  return out;
}

const ALIGNED=Math.cos(40*Math.PI/180);
/** Ink credits a part only when it is at most this fraction of the distance to the next nearest part. */
const CLEARLY=.75;
/** Ink longer than this many times the sign is a scribble, however much of it is near the sign. */
const MOST_INK=2.5;

/** A stroke as points one unit apart, each with the way the stroke runs there, taken over a few units either side so a wobble does not turn it. */
function resample(stroke:Pt[]){
  const points:Pt[]=[];
  for(let i=1;i<stroke.length;i++){
    const a=stroke[i-1],b=stroke[i],len=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(len));
    for(let s=(i===1?0:1);s<=steps;s++)points.push({x:a.x+(b.x-a.x)*s/steps,y:a.y+(b.y-a.y)*s/steps});
  }
  return points.map((p,i)=>{
    const from=points[Math.max(0,i-3)],to=points[Math.min(points.length-1,i+3)],len=Math.hypot(to.x-from.x,to.y-from.y)||1;
    return {x:p.x,y:p.y,dx:(to.x-from.x)/len,dy:(to.y-from.y)/len};
  });
}

export type Verdict={pass:boolean;/** Every part has at least half covered. */reached:boolean;/** Fraction of the sign's length covered. */covered:number;/** Fraction of the ink that is on the sign. */onSign:number;/** Ink length as a multiple of the sign's length. */inkRatio:number;/** Fraction of each part covered. */parts:number[]};

export function judgeSign(parts:Pt[][],strokes:Pt[][],tolerance:number):Verdict{
  const samples=sampleParts(parts),hit=new Set<number>();
  let ink=0,onSign=0;
  for(const stroke of strokes){
    for(const q of resample(stroke)){
      // The nearest running-the-same-way distance to each part. Ink counts for one part only, and only when it is clearly nearer that
      // part than any other: a line drawn between a sharp's two uprights (8 units apart, inside the tolerance of both) counts for neither.
      const nearest=parts.map(()=>Infinity);
      samples.forEach(sample=>{
        if(Math.abs(sample.dx*q.dx+sample.dy*q.dy)<ALIGNED)return;
        const d=Math.hypot(sample.x-q.x,sample.y-q.y);
        if(d<nearest[sample.part])nearest[sample.part]=d;
      });
      let best=0;nearest.forEach((d,k)=>{if(d<nearest[best])best=k});
      const second=Math.min(...nearest.filter((_,k)=>k!==best));
      ink+=1;
      if(nearest[best]>tolerance)continue;
      onSign+=1;
      if(nearest[best]>CLEARLY*second)continue;
      samples.forEach((sample,k)=>{if(sample.part===best&&Math.hypot(sample.x-q.x,sample.y-q.y)<=tolerance)hit.add(k)});
    }
  }
  const per=parts.map((_,k)=>{
    const mine=samples.map((sample,i)=>({sample,i})).filter(({sample})=>sample.part===k);
    return mine.length?mine.filter(({i})=>hit.has(i)).length/mine.length:0;
  });
  const covered=samples.length?hit.size/samples.length:0,ratio=ink>0?onSign/ink:0,reached=per.every(f=>f>=.5),inkRatio=samples.length?ink/samples.length:0;
  return {pass:reached&&covered>=.75&&ratio>=.6&&inkRatio<=MOST_INK,reached,covered,onSign:ratio,inkRatio,parts:per};
}
