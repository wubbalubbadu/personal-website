export type VoicePoint={at:number;level:number;ramp:'set'|'linear'|'exponential'};
/** Connected pitches crossfade at constant level; tongued notes retain their attack. */
export function voiceEnvelope(duration:number,level:number,fromSlur=false,toSlur=false){
 const crossfade=.012,attack=fromSlur?crossfade:.004,sustain=Math.max(.0002,level*.85);
 const release=toSlur?duration:Math.max(attack+.001,duration-.045);
 const stop=Math.max(attack+.055,duration+(toSlur?crossfade:.025));
 const points:VoicePoint[]=[{at:0,level:.0001,ramp:'set'},{at:attack,level:fromSlur?sustain:level,ramp:fromSlur?'linear':'exponential'}];
 if(!fromSlur)points.push({at:Math.min(release,attack+.11),level:sustain,ramp:'exponential'});
 points.push({at:release,level:sustain,ramp:'set'},{at:stop,level:.0001,ramp:toSlur?'linear':'exponential'});
 return {points,stop};
}
