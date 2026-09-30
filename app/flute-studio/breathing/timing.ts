export const patterns=[
 {id:'even',name:'Even breathing',nameZh:'均匀呼吸',icon:'◯',detail:'An even breath in, an even breath out.'},
 {id:'refill',name:'Shorter inhale',nameZh:'缩短吸气',icon:'↗',detail:'Less time to refill. Keep the exhale even.'},
 {id:'sustain',name:'Longer exhale',nameZh:'延长呼气',icon:'≈',detail:'Keep the refill. Extend the outward breath.'},
 {id:'ratio',name:'Changing ratio',nameZh:'改变比例',icon:'⇄',detail:'Lengthen the exhale as the inhale shortens.'},
 {id:'expand',name:'Expand both',nameZh:'同时延长',icon:'↔',detail:'Give both halves of the breath more time.'},
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

// Spoken-style cues for each phase. Shared with the home page's Breathing Lab card.
export const cueBank={
 Inhale:['Make space. Let air in.','Relax the back of your throat.','Imagine sniffing a flower.','Release your belly.','Feel expansion around your lower ribs.','Imagine the breath filling low, around your rib cage.','Jaw releases. Throat opens.','Listen to your breath.'],
 Hold:['Stay easy.','Keep the throat relaxed.'],
 Exhale:['Keep the air even.','Stay open as you blow.','Manage your air to last through all the beats.','Feel support through your core.','Keep your body free of tension.','Support without bracing.','Keep the air moving.']
};

export const cueBankZh={
 Inhale:['放松，让空气进入。','放松喉咙深处。','想象轻轻闻一朵花。','放松腹部。','感受下部肋骨周围的扩张。','想象气息进入下部肋骨周围。','放松下颌，打开喉咙。','听听自己的呼吸。'],
 Hold:['保持轻松。','保持喉咙放松。'],
 Exhale:['保持气流均匀。','呼气时保持舒展。','分配气息，让它持续到最后一拍。','感受躯干的支撑。','保持身体放松。','保持支撑，不要绷紧。','让气流持续流动。']
};
