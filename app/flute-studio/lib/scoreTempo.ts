/** User-picked speed relative to the score's printed beat, not playback's last section. */
export const SCORE_TEMPO_KEY='cookie:score-tempo-ratios-v1';
export function readTempoRatios(raw:string|null):Record<string,number>{
  try{
    const saved:unknown=JSON.parse(raw??'{}');
    if(!saved||typeof saved!=='object'||Array.isArray(saved))return {};
    return Object.fromEntries(Object.entries(saved).filter(([,ratio])=>typeof ratio==='number'&&Number.isFinite(ratio)&&ratio>0));
  }catch{return {}}
}
export function clampTempo(value:number){return Math.max(30,Math.min(220,Math.round(value)))}
export type TempoPoint={at:number;bpm:number};
/** The scheduler holds each note at its sampled ramp speed. Display that same speed. */
export function scheduledTempoAt(points:TempoPoint[],time:number):number|null{
  if(!points.length||time<points[0].at)return null;
  let lo=0,hi=points.length;
  while(lo<hi){const mid=(lo+hi)>>>1;if(points[mid].at<=time)lo=mid+1;else hi=mid}
  return Math.round(points[lo-1].bpm);
}
