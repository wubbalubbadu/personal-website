import {groupsApply,ranges,type ScaleBlock,type ScaleRange,type ScaleSpan,type ScaleGroupSize} from './scale-score';

export const SCALE_TEMPO_KEY='cookie:scale-book:tempos:v1';
export function scaleTrackingId(block:Pick<ScaleBlock,'type'|'form'|'key'>,range:ScaleRange,span:ScaleSpan,groups:ScaleGroupSize){
  const rangeId=range==='custom'?`custom-${Math.min(span.low,span.high)}-${Math.max(span.low,span.high)}`:range;
  return `scale-book:${block.type}:${block.form}${groups>1&&groupsApply(block.form)?`-in${groups}`:''}:${block.key.id}:${rangeId}`;
}
/** Use the same range fallback as Scale Studio: wider ranges can lend a tempo to narrower ones. */
export function scaleTrackedTempo(block:Pick<ScaleBlock,'type'|'form'|'key'>,range:ScaleRange,span:ScaleSpan,groups:ScaleGroupSize,store:Record<string,number>){
  const order=ranges.map(r=>r.id);
  for(let i=order.indexOf(range);i<order.length;i++){
    const value=store[scaleTrackingId(block,order[i],span,groups)];
    if(value)return value;
  }
  return 60;
}
