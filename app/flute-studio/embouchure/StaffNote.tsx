'use client';
import {useEffect,useRef} from 'react';
import {noteName} from './poses';

export default function StaffNote({midi}:{midi:number}) {
  const host=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    let cancelled=false;
    const container=host.current!;
    const detached=document.createElement('div');
    detached.style.width='220px';
    async function render(){
      try {
        const {OpenSheetMusicDisplay}=await import('opensheetmusicdisplay');
        if(cancelled)return;
        const step=['C','C','D','D','E','F','F','G','G','A','A','B'][midi%12];
        const alter=[1,3,6,8,10].includes(midi%12)?1:0;
        const octave=Math.floor(midi/12)-1;
        const score=new OpenSheetMusicDisplay(detached,{backend:'svg',autoResize:false,drawTitle:false,drawComposer:false,drawPartNames:false,drawMeasureNumbers:false,drawingParameters:'compacttight'});
        const staffStep=(octave-4)*7+['C','D','E','F','G','A','B'].indexOf(step)-2;
        const stemLength=Math.max(3.5,(staffStep-4)/2);
        score.EngravingRules.IdealStemLength=stemLength;
        score.EngravingRules.StemMinLength=stemLength;
        score.EngravingRules.StemMaxLength=Math.max(stemLength,score.EngravingRules.StemMaxLength);
        await score.load(`<?xml version="1.0"?><score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><clef><sign>G</sign><line>2</line></clef></attributes><note><pitch><step>${step}</step><alter>${alter}</alter><octave>${octave}</octave></pitch><duration>1</duration><type>quarter</type>${alter?'<accidental>sharp</accidental>':''}</note></measure></part></score-partwise>`);
        if(cancelled)return;
        // Mount only the current request, then engrave at the actual panel width.
        container.replaceChildren(detached);
        score.EngravingRules.StretchLastSystemLine=true;
        score.render();
      } catch {if(!cancelled)container.textContent='Notation unavailable';}
    }
    void render();
    return()=>{cancelled=true;};
  },[midi]);
  return <div ref={host} role="img" aria-label={`${noteName(midi)} on treble staff`} style={{width:220,maxWidth:'100%'}}/>;
}
