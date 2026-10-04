"use client";
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {deriveScoreEvents} from './deriveScoreEvents';
import {usePracticeAudio,pitchFrequency} from '../PracticeAudio';
import {installGhostNoteFix} from '../lib/ghostNoteFix';
import {PracticeIcon} from './PracticeIcon';
import {fermataAttackIndexes} from './practiceTechniques';
import {installReminderAccidentalFix,setReminderAccidentals,reminderAccidentalsOn} from '../lib/reminderAccidentalFix';
import {decorateRow,withReminders,noDisplay,type PracticeDisplay} from './practiceDisplay';

export function PracticeNotation({xml,label,quarterBpm,playing,onPlay,onStop,loop=false,clicks=false,sempreStaccato=false,autoBeam=false,zoom=.8,hideTime=false,display,marks,onNote}:{xml:string;label:string;quarterBpm:number;playing:boolean;onPlay:()=>void;onStop:()=>void;loop?:boolean;clicks?:boolean;sempreStaccato?:boolean;autoBeam?:boolean;zoom?:number;hideTime?:boolean;/** The reader's display options (note names, accidentals, rhythm). Left out, the row shows only the notes. */display?:PracticeDisplay;/** Marks drawn over the engraving (the Tone Lab's results). `version` changes whenever the notation is redrawn. */marks?:(context:{root:HTMLDivElement;version:number})=>ReactNode;/** A tap on a note, by its event index (set once display is on). */onNote?:(event:number)=>void}){
  const root=useRef<HTMLDivElement>(null),sequence=useRef<ReturnType<typeof deriveScoreEvents>|null>(null);
  const {getAudio}=usePracticeAudio();
  const [ready,setReady]=useState(false),[error,setError]=useState(''),[version,setVersion]=useState(0),[hostEl,setHostEl]=useState<HTMLDivElement|null>(null);
  const hostRef=useCallback((node:HTMLDivElement|null)=>{root.current=node;setHostEl(node)},[]);
  const cycle=useRef(0),stopRef=useRef(onStop);
  // Keep the latest callback for the playback timers, written after render rather than during it.
  useEffect(()=>{stopRef.current=onStop});
  useEffect(()=>{
    let disposed=false,resize:ResizeObserver|undefined;
    const host=root.current!;
    // Draw into a hidden sibling and swap it in when done, so replacing an exercise (Shuffle) never flashes blank.
    const next=document.createElement('div');next.style.cssText='position:absolute;left:0;top:0;width:100%;visibility:hidden';host.style.position='relative';host.append(next);
    (async()=>{try{
      const {OpenSheetMusicDisplay,VexFlowConverter,AccidentalCalculator,MusicSheetCalculator}=await import('opensheetmusicdisplay');installGhostNoteFix(VexFlowConverter);installReminderAccidentalFix(AccidentalCalculator,MusicSheetCalculator);if(disposed)return;setError('');
      // Reminder accidentals are the reader's rule, written into the notation before it is engraved.
      const shown=display??noDisplay,reminded=shown.accidentals?withReminders(xml):null,source=reminded?.xml??xml;
      const score=new OpenSheetMusicDisplay(next,{backend:'svg',autoResize:false,drawingParameters:'compacttight',drawTitle:false,drawComposer:false,drawPartNames:false});
      score.setOptions({pageFormat:'Endless',drawMeasureNumbers:true,newSystemFromXML:false,autoBeam});
      score.EngravingRules.MinNoteDistance=1.4;score.EngravingRules.RenderSingleHorizontalStaffline=true;score.EngravingRules.RenderTimeSignatures=!hideTime;score.EngravingRules.SlurNoteHeadYOffset=.9;
      score.EngravingRules.RenderMultipleRestMeasures=false;score.EngravingRules.AutoGenerateMultipleRestMeasuresFromRestMeasures=false;
      await score.load(source);if(disposed)return;score.Zoom=zoom;
      // The reminder flag is shared with the reader's own engraver: borrow it for this draw only.
      const draw=()=>{const before=reminderAccidentalsOn();setReminderAccidentals(shown.accidentals);try{score.render()}finally{setReminderAccidentals(before)}};
      draw();
      const derived=deriveScoreEvents(score,sempreStaccato?1:undefined),held=new Set(fermataAttackIndexes(xml));let attack=-1;
      // A fermata holds its note: twice as long, and never less than two beats (a held sixteenth must still be a hold).
      sequence.current=held.size?{...derived,events:derived.events.map(e=>{if(!(e.p&&!e.tied&&e.d>0))return e;attack++;return held.has(attack)?{...e,d:Math.max(e.d*2,derived.unitsPerBeat*2)}:e})}:derived;
      if(display)decorateRow(next,source,derived,shown,reminded?.reminders??[]);
      if(disposed)return;
      // Replacing a drawing (Shuffle, a display toggle): hold the row at least as tall as before, so nothing below
      // jumps, and fade the new music in rather than cutting to it.
      const replacing=host.children.length>1;
      if(replacing){host.style.minHeight=`${host.offsetHeight}px`;next.style.cssText='opacity:0;transition:opacity .16s ease'}else next.style.cssText='';
      Array.from(host.children).forEach(c=>{if(c!==next)c.remove()});
      if(replacing)requestAnimationFrame(()=>{next.style.opacity='1';window.setTimeout(()=>{if(!disposed){host.style.minHeight='';next.style.cssText=''}},220)});
      setReady(true);setVersion(v=>v+1);
      let width=host.clientWidth;
      let frame=0;resize=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(!disposed&&host.clientWidth>0&&Math.abs(width-host.clientWidth)>2){width=host.clientWidth;draw();if(display)decorateRow(next,source,derived,shown,reminded?.reminders??[]);setVersion(v=>v+1)}})});resize.observe(host);
    }catch(e){if(!disposed)setError(e instanceof Error?e.message:'Could not draw this exercise.')}})();
    return()=>{disposed=true;resize?.disconnect();next.remove()};
  },[xml,sempreStaccato,autoBeam,zoom,hideTime,display?.names,display?.accidentals,display?.rhythm]);
  useEffect(()=>{
    if(!playing||!ready||!sequence.current){return}
    const context=getAudio(),seq=sequence.current,seconds=60/quarterBpm/seq.unitsPerBeat;
    cycle.current=context.currentTime+.12;
    let cancelled=false;const timers=new Set<number>(),nodes:OscillatorNode[]=[];
    const later=(callback:()=>void,delay:number)=>{const timer=window.setTimeout(()=>{timers.delete(timer);callback()},delay);timers.add(timer)};
    const schedule=(nextStart?:number)=>{
      if(cancelled)return;
      const start=nextStart??context.currentTime+.12;let elapsed=0;cycle.current=start;
      seq.events.forEach((event,index)=>{
        const at=start+elapsed*seconds;
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
    schedule();return()=>{cancelled=true;timers.forEach(clearTimeout);nodes.forEach(n=>{try{n.stop()}catch{/* Already ended. */}})};
  },[playing,ready,quarterBpm,loop,clicks,xml]);
  // The position line glides between notes on the audio clock, like the main reader's cursor, instead of jumping on timers.
  useEffect(()=>{
    const host=root.current,seq=sequence.current;if(!playing||!ready||!host||!seq)return;
    const notes=Array.from(host.querySelectorAll<SVGGElement>('.vf-stavenote')),svg=notes[0]?.closest('svg');if(!svg)return;
    const matrix=svg.getScreenCTM()?.inverse();if(!matrix)return;
    const marks=notes.map(note=>{const b=note.getBoundingClientRect();return {x:new DOMPoint(b.left,b.top-5).matrixTransform(matrix),bottom:new DOMPoint(b.left,b.bottom+5).matrixTransform(matrix),right:new DOMPoint(b.right,b.top).matrixTransform(matrix).x}});
    const offsets:number[]=[];let total=0;seq.events.forEach(e=>{offsets.push(total);total+=e.d});
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('class','practice-position');svg.append(line);
    const context=getAudio(),seconds=60/quarterBpm/seq.unitsPerBeat,length=total*seconds;let frame=0;
    const draw=()=>{
      let t=context.currentTime-cycle.current;
      if(t>=0&&length>0){
        if(loop)t%=length;
        const u=t/seconds;const k=offsets.findIndex((o,i)=>u>=o&&(i===offsets.length-1||u<offsets[i+1]));
        if(k>=0&&marks[k]){
          const end=offsets[k]+seq.events[k].d,span=Math.max(1e-6,end-offsets[k]),f=Math.min(1,(u-offsets[k])/span);
          const nextX=marks[k+1]?marks[k+1].x.x:marks[k].right,x=marks[k].x.x+(nextX-marks[k].x.x)*f;
          line.setAttribute('x1',String(x));line.setAttribute('x2',String(x));line.setAttribute('y1',String(marks[k].x.y));line.setAttribute('y2',String(marks[k].bottom.y));line.style.opacity='';
          const box=line.getBoundingClientRect(),view=host.getBoundingClientRect();
          if(box.right>view.right-30||box.left<view.left)host.scrollTo({left:host.scrollLeft+box.left-view.left-60,behavior:'smooth'});
        }
      }else line.style.opacity='0';
      frame=requestAnimationFrame(draw);
    };
    frame=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(frame);line.remove()};
  },[playing,ready,quarterBpm,loop,xml]);
  // A tap on a note reports its event index (native listener: the notation is drawn outside React).
  useEffect(()=>{
    if(!hostEl||!onNote)return;
    const tap=(e:MouseEvent)=>{const node=(e.target as Element).closest<SVGGElement>('.vf-stavenote[data-event]');if(node)onNote(Number(node.dataset.event))};
    hostEl.addEventListener('click',tap);return()=>hostEl.removeEventListener('click',tap);
  },[hostEl,onNote]);
  return <div className="practice-notation"><div className="practice-notation__stage"><div className="practice-notation__music" ref={hostRef} data-pills={display&&display.names!=='off'?'on':undefined} data-marks={marks?'on':undefined} aria-label={`${label} notation`}/>{marks&&hostEl&&ready&&<div className="practice-notation__marks">{marks({root:hostEl,version})}</div>}</div>{error?<p role="alert">{error}</p>:!ready?<p role="status">Preparing notation…</p>:null}<button type="button" className="practice-listen" aria-label={`${playing?'Stop':'Listen to'} ${label}`} disabled={!ready||!!error} onClick={playing?onStop:onPlay}><PracticeIcon name={playing?'pause':'play'}/>{playing?'Stop':'Listen'}</button></div>;
}
