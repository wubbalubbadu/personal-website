"use client";
import {useEffect,useRef,useState} from 'react';
import {deriveScoreEvents} from './deriveScoreEvents';
import {usePracticeAudio,pitchFrequency} from '../PracticeAudio';
import {installGhostNoteFix} from '../lib/ghostNoteFix';
import {PracticeIcon} from './PracticeIcon';

export function PracticeNotation({xml,label,quarterBpm,playing,onPlay,onStop,loop=false,clicks=false,sempreStaccato=false}:{xml:string;label:string;quarterBpm:number;playing:boolean;onPlay:()=>void;onStop:()=>void;loop?:boolean;clicks?:boolean;sempreStaccato?:boolean}){
  const root=useRef<HTMLDivElement>(null),sequence=useRef<ReturnType<typeof deriveScoreEvents>|null>(null);
  const {getAudio}=usePracticeAudio();
  const [ready,setReady]=useState(false),[error,setError]=useState(''),[active,setActive]=useState<number|null>(null);
  const stopRef=useRef(onStop);stopRef.current=onStop;
  useEffect(()=>{
    let disposed=false,resize:ResizeObserver|undefined;setReady(false);setError('');
    const host=root.current!;host.replaceChildren();
    (async()=>{try{
      const {OpenSheetMusicDisplay,VexFlowConverter}=await import('opensheetmusicdisplay');installGhostNoteFix(VexFlowConverter);if(disposed)return;
      const score=new OpenSheetMusicDisplay(host,{backend:'svg',autoResize:false,drawingParameters:'compacttight',drawTitle:false,drawComposer:false,drawPartNames:false});
      score.setOptions({pageFormat:'Endless',drawMeasureNumbers:true,newSystemFromXML:false,autoBeam:label==='even rhythm'});
      score.EngravingRules.MinNoteDistance=1.4;score.EngravingRules.SlurNoteHeadYOffset=.9;
      score.EngravingRules.RenderMultipleRestMeasures=false;score.EngravingRules.AutoGenerateMultipleRestMeasuresFromRestMeasures=false;
      await score.load(xml);if(disposed)return;score.Zoom=label==='original'?1.3:1.05;score.render();sequence.current=deriveScoreEvents(score,sempreStaccato?1:undefined);setReady(true);
      let width=host.clientWidth;
      resize=new ResizeObserver(()=>{if(!disposed&&Math.abs(width-host.clientWidth)>2){width=host.clientWidth;score.render()}});resize.observe(host);
    }catch(e){if(!disposed)setError(e instanceof Error?e.message:'Could not draw this exercise.')}})();
    return()=>{disposed=true;resize?.disconnect();sequence.current=null};
  },[xml,sempreStaccato]);
  useEffect(()=>{
    if(!playing||!ready||!sequence.current){setActive(null);return}
    const context=getAudio(),seq=sequence.current,seconds=60/quarterBpm/seq.unitsPerBeat;
    let cancelled=false;const timers=new Set<number>(),nodes:OscillatorNode[]=[];
    const later=(callback:()=>void,delay:number)=>{const timer=window.setTimeout(()=>{timers.delete(timer);callback()},delay);timers.add(timer)};
    const schedule=(nextStart?:number)=>{
      if(cancelled)return;
      const start=nextStart??context.currentTime+.12;let elapsed=0;
      seq.events.forEach((event,index)=>{
        const at=start+elapsed*seconds;
        later(()=>setActive(index),Math.max(0,(at-context.currentTime)*1000));
        if(event.p&&(!event.tied||index===0)){
          let units=event.d;for(let j=index+1;j<seq.events.length&&seq.events[j].tied;j++)units+=seq.events[j].d;
          const match=event.p.match(/^([A-G][♯♭]?)(\d)$/);
          if(match){const osc=context.createOscillator(),gain=context.createGain(),slur=event.articulation==='slur';
            const duration=Math.max(.04,units*seconds*(event.articulation==='staccato'?.48:slur?1.04:.9));
            const volume=Math.min(.16,.055*(event.level??1));osc.frequency.value=pitchFrequency(match[1],Number(match[2]));
            gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+(slur?.012:.004));gain.gain.setValueAtTime(Math.max(.0002,volume*.85),at+Math.max(.015,duration-.025));gain.gain.exponentialRampToValueAtTime(.0001,at+duration+.015);
            osc.connect(gain).connect(context.destination);osc.start(at);osc.stop(at+duration+.02);nodes.push(osc);osc.onended=()=>{const i=nodes.indexOf(osc);if(i>=0)nodes.splice(i,1);gain.disconnect()};
          }
        }
        elapsed+=event.d;
      });
      const duration=elapsed*seconds;
      if(clicks)for(let beat=0;beat*60/quarterBpm<duration-.001;beat++){const at=start+beat*60/quarterBpm,osc=context.createOscillator(),gain=context.createGain();osc.frequency.value=1000;gain.gain.setValueAtTime(.05,at);gain.gain.exponentialRampToValueAtTime(.0001,at+.035);osc.connect(gain).connect(context.destination);osc.start(at);osc.stop(at+.04);nodes.push(osc);osc.onended=()=>{const i=nodes.indexOf(osc);if(i>=0)nodes.splice(i,1);gain.disconnect()}}
      if(duration>0)later(()=>{if(loop)schedule(start+duration);else stopRef.current()},Math.max(0,(start+duration-context.currentTime-(loop?.05:0))*1000));
    };
    schedule();return()=>{cancelled=true;timers.forEach(clearTimeout);nodes.forEach(n=>{try{n.stop()}catch{}});setActive(null)};
  },[playing,ready,quarterBpm,loop,clicks,xml]);
  useEffect(()=>{
    const host=root.current;if(!host)return;host.querySelector('.practice-position')?.remove();if(active===null)return;
    const note=host.querySelectorAll('.vf-stavenote')[active],svg=note?.closest('svg');if(!note||!svg)return;
    const box=note.getBoundingClientRect(),matrix=svg.getScreenCTM()?.inverse();if(!matrix)return;
    const top=new DOMPoint(box.left,box.top-5).matrixTransform(matrix),bottom=new DOMPoint(box.left,box.bottom+5).matrixTransform(matrix);
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('class','practice-position');line.setAttribute('x1',String(top.x));line.setAttribute('x2',String(top.x));line.setAttribute('y1',String(top.y));line.setAttribute('y2',String(bottom.y));svg.append(line);
  },[active]);
  return <div className="practice-notation"><div className="practice-notation__music" ref={root} aria-label={`${label} notation`}/>{error?<p role="alert">{error}</p>:!ready?<p role="status">Preparing notation…</p>:null}<button type="button" className="practice-listen" aria-label={`${playing?'Stop':'Listen to'} ${label}`} disabled={!ready||!!error} onClick={playing?onStop:onPlay}><PracticeIcon name={playing?'pause':'play'}/>{playing?'Stop':'Listen'}</button></div>;
}
