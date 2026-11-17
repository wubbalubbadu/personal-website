/**
 * The breath line (Nov 16): one breath drawn as a curve, the way the Home Breathing Lab tile draws it. It rises
 * while you breathe in, stays level while you hold, and falls while you breathe out; a dot rides it. It replaced
 * the two-colour ring in Breathing Lab and on the Body & embouchure page.
 *
 * `fullness(c)` gives how full the lungs are (0 to 1) at cycle position c (0 to 1). `linePath` samples it into an
 * SVG path between two cycle positions, so each phase can be stroked in its own colour.
 */
export type LineBox={left:number;right:number;top:number;bottom:number};

export function linePoint(c:number,fullness:(c:number)=>number,box:LineBox){
  return {x:box.left+(box.right-box.left)*c,y:box.bottom-(box.bottom-box.top)*fullness(c)};
}

export function linePath(from:number,to:number,fullness:(c:number)=>number,box:LineBox){
  if(to<=from)return "";
  const steps=Math.max(2,Math.ceil((to-from)*96));
  let d="";
  for(let i=0;i<=steps;i++){const p=linePoint(from+(to-from)*i/steps,fullness,box);d+=`${i?"L":"M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`}
  return d;
}

/** Breathing Lab's breath: ease up over the inhale, level through the hold, ease down over the exhale. */
export function countedFullness(inhale:number,hold:number,exhale:number){
  const total=inhale+hold+exhale,a=inhale/total,b=(inhale+hold)/total;
  const ease=(u:number)=>(1-Math.cos(Math.PI*Math.max(0,Math.min(1,u))))/2;
  return (c:number)=>c<a?ease(c/a):c<b?1:1-ease((c-b)/(1-b));
}
