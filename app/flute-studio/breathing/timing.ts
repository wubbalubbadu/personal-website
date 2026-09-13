export const patterns=[
 {id:'even',name:'Even breathing',icon:'◯',detail:'An even breath in, an even breath out.'},
 {id:'refill',name:'Shorter inhale',icon:'↗',detail:'Less time to refill. Keep the exhale even.'},
 {id:'sustain',name:'Longer exhale',icon:'≈',detail:'Keep the refill. Extend the outward breath.'},
 {id:'ratio',name:'Changing ratio',icon:'⇄',detail:'Lengthen the exhale as the inhale shortens.'},
 {id:'expand',name:'Expand both',icon:'↔',detail:'Give both halves of the breath more time.'},
] as const;
export type Pattern=typeof patterns[number]['id'];
export type Settings={pattern:Pattern;inhale:number;exhale:number;hold:number};
export function counts(s:Settings,round:number){
 const step=round%8;
 return {inhale:s.pattern==='refill'||s.pattern==='ratio'?Math.max(.5,s.inhale-step):s.pattern==='expand'?Math.min(20,s.inhale+step):s.inhale,
 exhale:s.pattern==='sustain'||s.pattern==='expand'?Math.min(20,s.exhale+step):s.pattern==='ratio'?s.exhale+Math.min(step,s.inhale-.5):s.exhale,hold:s.hold};
}
export function breathAt(beats:number,s:Settings){
 let round=0,remaining=Math.max(0,beats);
 // The eight steps repeat, so seeking stays bounded.
 const period=Array.from({length:8},(_,i)=>{const c=counts(s,i);return c.inhale+c.exhale+c.hold}).reduce((a,b)=>a+b,0);
 round=Math.floor(remaining/period)*8;remaining%=period;
 let c=counts(s,round);
 while(remaining>=c.inhale+c.hold+c.exhale){remaining-=c.inhale+c.hold+c.exhale;round++;c=counts(s,round)}
 const phase=remaining<c.inhale?'Inhale':remaining<c.inhale+c.hold?'Hold':'Exhale';
 const duration=phase==='Inhale'?c.inhale:phase==='Hold'?c.hold:c.exhale;
 const elapsed=phase==='Inhale'?remaining:phase==='Hold'?remaining-c.inhale:remaining-c.inhale-c.hold;
 const progress=elapsed/duration;
 return {...c,round,phase,progress,beat:Math.min(duration,Math.floor(elapsed)+1),cycle:remaining/(c.inhale+c.hold+c.exhale),fullness:phase==='Inhale'?progress:phase==='Hold'?1:1-progress};
}
