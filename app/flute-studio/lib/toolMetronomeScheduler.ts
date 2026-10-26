import {barOf,meterOf,nextPulse,noteIn,retimeBar,startPulse,type Bar,type BarEvent,type MetronomeSetup} from "./metronomeSetup";

export type ToolConfig={setup:MetronomeSetup;beats:number;accent:boolean;bpm:number};
export type ToolBar={start:number;bar:Bar};
type ScheduledSound={stop:(at?:number)=>void;addEventListener:(type:"ended",listener:()=>void,options?:{once:boolean})=>void};
const shapeOf=({setup,beats}:ToolConfig)=>{const meter=meterOf(setup,beats);return `${meter.id}|${noteIn(setup,meter)}|${JSON.stringify(setup.pulse)}`};

/** Audio-clock scheduler for the tools panel only. Score-following playback keeps its own grid. */
export function createToolMetronomeScheduler(audio:{currentTime:number},read:()=>ToolConfig,
  book:(event:BarEvent,time:number,beatSeconds:number)=>ScheduledSound){
  const bars:ToolBar[]=[],booked=new Map<ScheduledSound,number>();
  let entry:ToolBar|null=null,index=0,shape=shapeOf(read());
  const fresh=(previous?:Bar)=>{
    const c=read(),pulse=c.setup.pulse.mode==="off"?undefined:previous?.pulse?nextPulse(c.setup.pulse,previous.pulse):startPulse(c.setup.pulse);
    return barOf(c.setup,c.beats,c.accent,c.bpm,pulse);
  };
  const begin=(start:number,bar:Bar)=>{
    entry={start,bar};index=0;bars.push(entry);
    // Keep the audible bar even when many very short bars fit inside the lookahead.
    while(bars.length>1&&bars[0].start+bars[0].bar.length<audio.currentTime-.1)bars.shift();
  };
  const cancelFrom=(time:number)=>booked.forEach((at,node)=>{if(at>=time){try{node.stop(audio.currentTime)}catch{/* Ended. */}booked.delete(node)}});
  const schedule=()=>{
    if(!entry)return;
    const now=audio.currentTime;
    for(;;){
      if(index>=entry.bar.events.length){
        const next=entry.start+entry.bar.length;if(next>=now+1.6)break;
        begin(next,fresh(entry.bar));continue;
      }
      const event=entry.bar.events[index],time=entry.start+event.at;
      if(time>=now+1.6)break;
      if(time>=now-.03){
        const duration=(entry.bar.clickAt[event.click+1]??entry.bar.length)-entry.bar.clickAt[event.click];
        const at=Math.max(time,now+.005),node=book(event,at,duration);
        booked.set(node,at);node.addEventListener("ended",()=>booked.delete(node),{once:true});
      }
      index++;
    }
  };
  const replace=(start:number,bar:Bar,cutoff:number)=>{
    cancelFrom(cutoff);
    bars.length=0;begin(start,bar);
    // Sounds already heard, and ones too close to cancel, must not be replayed.
    while(index<bar.events.length&&start+bar.events[index].at<cutoff)index++;
    schedule();
  };
  return {
    bars,schedule,
    start(){shape=shapeOf(read());begin(audio.currentTime+.06,fresh());schedule()},
    reconfigure(){
      if(!entry)return;
      const now=audio.currentTime,cutoff=now+.02,c=read(),nextShape=shapeOf(c);
      const active=bars.findLast(b=>b.start<=cutoff)??bars[0];
      if(nextShape!==shape){
        shape=nextShape;
        // A different meter/counting unit or pulse routine starts a new bar now, not after the old loop.
        replace(now+.04,fresh(),cutoff);
      }else{
        // Accent, mute, subdivision and sound edits keep the current pulse and affect all unsounded events.
        replace(active.start,barOf(c.setup,c.beats,c.accent,c.bpm,active.bar.pulse),cutoff);
      }
    },
    retime(){
      if(!entry)return;
      const now=audio.currentTime,cutoff=now+.02;
      const active=bars.findLast(b=>b.start<=cutoff)??bars[0],bar=retimeBar(active.bar,read().bpm);
      let beat=0;
      active.bar.clickAt.forEach((at,i)=>{if(active.start+at<=cutoff)beat=i});
      // Use the clock's beat even if it was muted or belongs to a silent training bar.
      const start=active.start>cutoff?active.start:active.start+active.bar.clickAt[beat]-bar.clickAt[beat];
      replace(start,bar,cutoff);
    },
    dispose(){cancelFrom(-Infinity);bars.length=0;entry=null},
  };
}
