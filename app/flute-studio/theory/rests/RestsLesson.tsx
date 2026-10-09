'use client';
import {useRef,useState,type ReactNode,type PointerEvent,type CSSProperties} from 'react';
import {useLanguage} from '../../i18n/LanguageContext';
import LessonFrame,{type LessonNext} from '../LessonFrame';
import EngravedRow,{type RowNote,type RowLayout} from '../EngravedRow';
import CookieButton from '../CookieButton';
import RestGlyph,{restY} from '../rhythm/RestGlyph';
import {useRhythmAudio} from '../rhythm/useRhythmAudio';
import {useCourseProgress} from '../useCourseProgress';
import RestMatch,{matchingValue} from './RestMatch';
import {assessRestTaps,GAPS,restPitches,SILENCE,type TapResult} from './restsModel';
import type {NoteValue} from '../rhythm/rhythmModel';
import '../theory.css';
import '../measures/measures.css';
import './rests.css';

const FRAME='20 30 680 430',RIGHT=660,UNIT=.65;
const CHOICES:NoteValue[]=[1,2,.5];
const keyAction=(e:React.KeyboardEvent,act:()=>void)=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat){e.preventDefault();act()}};

export default function RestsLesson(){
  const {lang}=useLanguage(),zh=lang==='zh',tr=(en:string,cn:string)=>zh?cn:en;
  const audio=useRhythmAudio(),course=useCourseProgress();
  const [step,setStep]=useState(0),[stage,setStage]=useState(0),[hint,setHint]=useState(false);
  const [feedback,setFeedback]=useState(''),[tone,setTone]=useState<'correct'|'wrong'|null>(null);
  const [passed,setPassed]=useState(false),[done,setDone]=useState(false);
  const [matched,setMatched]=useState<number[]>([]),[round,setRound]=useState(0);
  const [choice,setChoice]=useState<NoteValue|null>(null),[wrong,setWrong]=useState<NoteValue|null>(null);
  const [tapping,setTapping]=useState(false),[tapResult,setTapResult]=useState<TapResult|null>(null);
  const taps=useRef<number[]>([]),[tapMarks,setTapMarks]=useState<number[]>([]);
  const [playing,setPlaying]=useState(false);
  const [draw,setDraw]=useState<{x:number;y:number;value:NoteValue}|null>(null);
  const drag=useRef<{value:NoteValue;x:number;y:number;moved:boolean}|null>(null);
  const gapSvg=useRef<SVGSVGElement|null>(null);
  const names=[tr('Silence','安静的一拍'),tr('Rest lengths','休止符时值'),tr('Shorter rests','更短的休止符'),tr('A whole measure','整小节休止'),tr('Fill the gap','填入休止符')];

  function resetFeedback(){setFeedback('');setTone(null);setHint(false);setPassed(false)}
  function navigate(i:number){audio.stop();setPlaying(false);setTapping(false);setStep(i);setStage(0);resetFeedback();setMatched([]);setRound(0);setChoice(null);setWrong(null);setDraw(null);drag.current=null;setTapResult(null);setTapMarks([]);taps.current=[]}
  function stageTo(i:number){audio.stop();setPlaying(false);setStage(i);resetFeedback()}
  function respond(ok:boolean,good:string,bad:string){setPassed(ok);setTone(ok?'correct':'wrong');setFeedback(ok?good:bad)}
  function replay(notes:RowNote[]){if(playing&&audio.elapsed>=0){audio.stop();setPlaying(false);return}setPlaying(true);void audio.play(notes.map(n=>n.v),restPitches(notes))}
  const running=audio.elapsed>=0;
  // Completion comes from the audio scheduler after the entire measure, not from the tap count.
  function startTap(){
    audio.stop();setPlaying(false);setFeedback('');setTone(null);setPassed(false);setTapResult(null);setTapMarks([]);taps.current=[];setTapping(true);
    void audio.counted({values:Array(8).fill(1),notes:false,speak:false,click:true,secondsPerQuarter:UNIT,
      onEnd:()=>{const result=assessRestTaps(taps.current);setTapResult(result);setTapping(false);setPassed(result==='correct');setTone(result==='correct'?'correct':'wrong')},
      onError:()=>setTapping(false)});
  }
  function tap(){if(!tapping)return;const at=audio.position()/UNIT-4;if(at<-.15||at>=4)return;void audio.clap();taps.current.push(at);setTapMarks([...taps.current])}
  const playButton=(notes:RowNote[])=><button className="measures-secondary" onClick={()=>replay(notes)} disabled={tapping}>{playing&&running?tr('Stop','停止'):tr('Replay','再听一次')}</button>;
  const hintButton=<button className="lesson-secondary" onClick={()=>setHint(true)}>{tr('Hint','提示')}</button>;
  const labelFor=(v:number)=>({4:tr('Whole rest','全休止符'),2:tr('Half rest','二分休止符'),1:tr('Quarter rest','四分休止符'),.5:tr('Eighth rest','八分休止符'),.25:tr('Sixteenth rest','十六分休止符')}[v]??'');
  const noteTap=(notes:RowNote[],layout:RowLayout)=>notes.map((n,i)=>!n.rest&&<rect key={i} className="rests-hit" x={layout.xs[i]-25} y="152" width="50" height="65" rx="10" role="button" tabIndex={0} aria-label={tr(`Play note ${i+1}`,`弹第 ${i+1} 个音`)} onClick={()=>void audio.play([n.v],[67],i,false)} onKeyDown={e=>keyAction(e,()=>void audio.play([n.v],[67],i,false))}/>);
  const row=(notes:RowNote[],children?:(l:RowLayout)=>ReactNode,top=4,appear:number[]=[])=>
    <EngravedRow notes={notes} clef={false} meter={{top,bottom:4}} right={RIGHT} viewBox={FRAME} interactive active={tapping?(audio.active>=4?audio.active-4:-1):audio.active} appear={appear} label={names[step]}>{children}</EngravedRow>;
  const answerNumbers=(answer:number,success:string,failure:string)=><div className="measures-choices" role="group" aria-label={tr('Choose a number','选一个数字')}>{[2,3,4].map(n=><button key={n} disabled={passed} className={passed&&n===answer?'is-correct':''} onClick={()=>{respond(n===answer,success,failure);if(n!==answer)setHint(true)}}>{n}</button>)}</div>;

  let narration:ReactNode='',message:ReactNode=feedback,scene:ReactNode=null,extra:ReactNode=null,tools:ReactNode=null;
  let progress:{done:number;total:number}|undefined,next:LessonNext|undefined;
  if(step===0){
    const notes=stage===0?SILENCE.map(n=>({...n,rest:false})):SILENCE;
    const beat=tapping?Math.floor(audio.elapsed/UNIT)-4:Math.floor(audio.elapsed/UNIT);
    narration=stage===0?tr('A beat can pass without a note.','一拍里也可以没有声音。'):tr('A rest marks silence. Keep counting while you are not playing.','休止符表示这里不出声，但拍子还要继续数。');
    const resultText=tapResult==='correct'?tr('You kept the beat through the silence.','休止的时候，你也保持住了拍子。'):tapResult==='rest'?tr('Beat 2 is silent. Keep counting, then tap again on 3.','第 2 拍不点。继续数，到第 3 拍再点。'):tapResult==='missing'?tr('A note missed its tap. Try beats 1, 3 and 4.','有一个音没点到。试试第 1、3、4 拍。'):tapResult==='timing'?tr('Follow the steady counts. Tap once on 1, 3 and 4.','跟着稳定的拍子，在 1、3、4 各点一下。'):'';
    message=stage===0?tr('Tap the second note to make beat 2 silent.','点第二个音符，让第 2 拍安静下来。'):resultText|| (tapping?(beat<0?tr('Four counts to get ready…','先数四拍，准备……'):tr('Tap on the notes. Let beat 2 pass quietly.','有音符就点，第 2 拍安静地数过去。')):tr('Tap Cookie on beats 1, 3 and 4. Keep counting silently on beat 2.','在第 1、3、4 拍点饼干。第 2 拍不点，心里继续数。'));
    const replace=()=>{setStage(1);replay(SILENCE)};
    scene=row(notes,l=><>
      {[0,1,2,3].map((b)=><g key={b}>
        <text x={l.xs[b]} y="250" className="rests-count">{b+1}</text>
        {running&&beat===b&&<circle key={`beat-${audio.beat}-${b}`} className="rests-pulse" cx={l.xs[b]} cy="275" r="7"/>}
      </g>)}
      {stage===0?<rect className="rests-hit is-inviting" x={l.xs[1]-32} y="92" width="64" height="125" rx="12" role="button" tabIndex={0} aria-label={tr('Make beat 2 silent','让第 2 拍安静')} onClick={replace} onKeyDown={e=>keyAction(e,replace)}/>:<text className="rests-caption" x={l.xs[1]} y="314">{labelFor(1)}</text>}
      {tapMarks.map((at,i)=><circle key={i} cx={l.beatX(Math.max(0,Math.min(4,at)))} cy="85" r="6" className={`rests-tap${tapResult==='correct'?' is-right':''}`}/>)}
      {tapping&&beat<0&&<text className="rests-caption" x="355" y="370">{tr('Get ready','准备')} {Math.max(1,beat+5)}</text>}
    </>,4,stage===1?[1]:[]);
    if(stage>0){tools=<>{playButton(SILENCE)}<button className="measures-primary" onClick={startTap} disabled={tapping}>{tr('Count me in','数拍开始')}</button></>;extra=<CookieButton disabled={!tapping} aria-label={tr('Tap with the notes','跟着音符点')} onPointerDown={e=>{e.preventDefault();tap()}} onKeyDown={e=>keyAction(e,tap)}/>;progress={done:passed?1:0,total:1}}
  }else if(step===1){
    const practice=stage===1;
    narration=tr('The whole rest hangs from the fourth line. The half rest sits on the middle line.','全休止符挂在第四线下面，二分休止符坐在第三线上。');
    message=feedback||(practice?tr('Draw a line from each note to the rest with the same length. Or tap a note, then its rest.','把时值相同的音符和休止符连起来。也可以先点音符，再点休止符。'):tr('In 4/4, these pairs last 4, 2 and 1 beats. The notes sound; the rests are silent.','在 4/4 拍里，这三组分别是 4、2、1 拍。音符有声音，休止符没有声音。'));
    scene=<RestMatch practice={practice} hint={hint} matched={matched} zh={zh} onMatch={(a,b)=>{
      if(matched.includes(a))return;
      const ok=matchingValue(a,b),all=ok?[...matched,a]:matched;setMatched(all);setPassed(all.length===3);setTone(ok?'correct':'wrong');setFeedback(ok?(all.length===3?tr('All three pairs last the same length.','三组都找对了，时值相同。'):tr('Same length. Find another pair.','时值相同。再找一组。')):tr('Compare their lengths. Hint brings the beat counts back.','这两个时值不同。点提示，可以再看拍数。'));
    }}/>;
    if(!practice)next={label:tr('Match the lengths','连接时值'),ready:true,onClick:()=>stageTo(1)};
    else {extra=hintButton;progress={done:matched.length,total:3}}
  }else if(step===2){
    const question=stage===3,showTree=!question||hint;
    narration=stage===0?tr('A shorter silence needs a shorter rest.','更短的停顿，要用更短的休止符。'):stage===1?tr('Two eighth rests last as long as one quarter rest.','两个八分休止符的时值等于一个四分休止符。'):tr('Two sixteenth rests last as long as one eighth rest.','两个十六分休止符的时值等于一个八分休止符。');
    message=feedback||(question?tr('How many sixteenth rests last as long as one quarter rest?','几个十六分休止符的时值等于一个四分休止符？'):stage===0?tr('Tap the span to split this quarter rest in half.','点时值条，把这个四分休止符分成两半。'):stage===1?tr('Tap either eighth-rest span to split each half again.','点任意一个八分休止符的时值条，再把每一半分开。'):tr('Each smaller rest takes half as much time.','每分一次，休止符的时值就减半。'));
    scene=<svg className="engraved-row rests-canvas" viewBox={FRAME} role="group" aria-label={names[step]}>
      <g transform="translate(355 90)"><RestGlyph value={1}/></g>
      <text className="rests-caption" x="355" y="139">{labelFor(1)}</text>
      {showTree&&<>
        <g className="rests-split-target" role={stage===0?'button':undefined} tabIndex={stage===0?0:undefined} aria-label={tr('Split the quarter rest','分开四分休止符')} onClick={()=>{if(stage===0)setStage(1)}} onKeyDown={e=>keyAction(e,()=>{if(stage===0)setStage(1)})}>
          <rect className="rests-span-hit" x="155" y="147" width="400" height="46"/><path className="rests-span" d="M155 165 v12 h400 v-12"/>
        </g>
        {stage>=1&&[0,1].map(i=><g key={i} className="rests-split-in">
          <g transform={`translate(${255+i*200} 228)`}><RestGlyph value={.5}/></g>
          <g className="rests-split-target" role={stage===1?'button':undefined} tabIndex={stage===1?0:undefined} aria-label={tr('Split the eighth rests','分开八分休止符')} onClick={()=>{if(stage===1)setStage(2)}} onKeyDown={e=>keyAction(e,()=>{if(stage===1)setStage(2)})}>
            <rect className="rests-span-hit" x={155+i*200} y="250" width="200" height="46"/><path className="rests-span" d={`M${155+i*200} 265 v12 h200 v-12`}/>
          </g>
        </g>)}
        {stage>=2&&[0,1,2,3].map(i=><g key={i} className="rests-split-in"><g transform={`translate(${205+i*100} 328)`}><RestGlyph value={.25}/></g><path className="rests-span" d={`M${155+i*100} 377 v12 h100 v-12`}/></g>)}
      </>}
      {question&&!hint&&<g transform="translate(355 310)"><RestGlyph value={.25}/><text className="rests-caption" y="87">{labelFor(.25)}</text></g>}
    </svg>;
    if(stage===2)next={label:tr('Try a question','试一试'),ready:true,onClick:()=>stageTo(3)};
    else if(stage<2)next={label:'',ready:false,onClick:()=>navigate(3)};
    else {extra=<>{answerNumbers(4,tr('Four short rests fill the same time.','四个短休止符刚好填满同样的时间。'),tr('Split the quarter into two eighths, then split both again.','先分成两个八分休止符，再把它们各分成两半。'))}{!passed&&hintButton}</>;progress={done:passed?1:0,total:1}}
  }else if(step===3){
    const top=stage===0?4:stage===1?3:2,notes:RowNote[]=[{v:top,rest:true,measureRest:true}];
    narration=tr('This symbol also means a whole measure of silence. Count the beats in the time signature.','这个记号也表示整小节休止。要数几拍，看拍号。');
    message=feedback||(stage<2?(stage===0?tr('Four beats of silence in 4/4. Change the time signature to see what happens.','4/4 拍里休止四拍。换一个拍号看看。'):tr('The same symbol now fills three beats.','同一个记号，现在表示休止三拍。')):tr('How many beats of silence fill this 2/4 measure?','这个 2/4 小节要休止几拍？'));
    scene=row(notes,l=><>{(stage<2||hint||passed)&&Array.from({length:top},(_,i)=><g key={i} className="rests-count-in"><text className="rests-count" x={l.startX+(i+.5)*(l.endX-l.startX)/top} y="272">{i+1}</text>{running&&Math.floor(audio.elapsed/UNIT)===i&&<circle className="rests-pulse" cx={l.startX+(i+.5)*(l.endX-l.startX)/top} cy="300" r="7"/>}</g>)}<path className="rests-span" d={`M${l.startX} 232 v10 h${l.endX-l.startX} v-10`}/></>,top);
    if(stage===0)next={label:tr('Change to 3/4','换成 3/4'),ready:true,onClick:()=>stageTo(1)};
    else if(stage===1)next={label:tr('Try another measure','再试一个小节'),ready:true,onClick:()=>stageTo(2)};
    else {extra=answerNumbers(2,tr('Two beats. The rest fills this whole measure.','两拍。这个休止符填满整个小节。'),tr('The top 2 means two quarter-note beats in this measure.','上面的 2 表示这个小节有两个四分音符拍。'));progress={done:passed?1:0,total:1}}
    tools=playButton(notes);
  }else{
    const r=GAPS[round],notes=r.notes;
    narration=tr('Notes and rests together fill the measure.','音符和休止符一起填满一个小节。');
    message=feedback||tr('Drag the rest that fills this gap. Or tap a rest, then the gap.','把合适的休止符拖进空缺。也可以先点休止符，再点空缺。');
    function submit(v:NoteValue){if(passed)return;setChoice(null);setDraw(null);const ok=v===r.answer;setWrong(ok?null:v);respond(ok,tr('That fills the silence exactly.','刚好填满这段休止。'),v>r.answer?tr('This rest is too long for the gap.','这个休止符比空缺长。'):tr('This rest leaves part of the gap empty.','这个休止符还填不满空缺。'))}
    const localPoint=(e:PointerEvent<SVGElement>)=>{const m=gapSvg.current?.getScreenCTM();return m?new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse()):null};
    scene=<div className="rests-gap-wrap" ref={el=>{gapSvg.current=el?.querySelector('svg')??null}}
      onPointerMove={e=>{const d=drag.current;if(!d)return;const p=localPoint(e as unknown as PointerEvent<SVGElement>);if(p&&Math.hypot(p.x-d.x,p.y-d.y)>6){d.moved=true;setDraw({...p,x:p.x,y:p.y,value:d.value})}}}
      onPointerUp={e=>{const d=drag.current;drag.current=null;setDraw(null);if(!d?.moved)return;const p=localPoint(e as unknown as PointerEvent<SVGElement>);const box=gapSvg.current?.querySelector('.rests-gap');const cx=box?Number(box.getAttribute('x'))+35:NaN;if(p&&Math.abs(p.x-cx)<55&&p.y>90&&p.y<220)submit(d.value)}}
      onPointerCancel={()=>{drag.current=null;setDraw(null)}}>
      <EngravedRow clef={false} notes={notes} meter={{top:4,bottom:4}} hidden={passed?[]:[r.gap]} right={RIGHT} viewBox={FRAME} interactive active={audio.active} appear={passed?[r.gap]:[]} label={names[step]}>{l=>{
        const x=l.xs[r.gap];
        return <>
          {!passed&&<rect className={`rests-hit rests-gap${choice!==null?' is-selected':''}`} x={x-35} y="95" width="70" height="119" rx="12" role="button" tabIndex={0} aria-label={tr('Place the selected rest in the gap','把选中的休止符放进空缺')} onClick={()=>{if(choice!==null)submit(choice)}} onKeyDown={e=>keyAction(e,()=>{if(choice!==null)submit(choice)})}/>}
          {hint&&notes.map((n,i)=><text key={i} className="rests-caption" x={l.xs[i]} y="243">{n.v} {tr('beat','拍')}</text>)}
          {wrong!==null&&<g>
            <g transform={`translate(${x} ${restY(wrong)})`}><g className="rests-return" style={{'--return-x':`${235+CHOICES.indexOf(wrong)*115-x}px`,'--return-y':`${343-restY(wrong)}px`} as CSSProperties}><RestGlyph value={wrong}/></g></g>
            <text className="rests-caption" x={x-58} y="260">{tr('Gap','空缺')}</text><text className="rests-caption" x={x-58} y="282">{tr('Rest','休止')}</text><path className="rests-span" d={`M${x-30} 257 h60`}/><path className="rests-span is-wrong" d={`M${x-30} 274 h${60*wrong/r.answer}`}/></g>}
          {CHOICES.map((v,i)=><g key={v} transform={`translate(${235+i*115} 343)`}>
            <RestGlyph value={v} staffLine/>
            <rect className={`rests-hit${choice===v?' is-selected':''}`} x="-40" y="-48" width="80" height="96" rx="12" role="button" tabIndex={passed?-1:0} aria-label={labelFor(v)} aria-pressed={choice===v}
              onPointerDown={e=>{if(passed)return;e.preventDefault();setChoice(v);setWrong(null);const p=localPoint(e);if(p){drag.current={value:v,x:p.x,y:p.y,moved:false};e.currentTarget.setPointerCapture(e.pointerId)}}} onKeyDown={e=>keyAction(e,()=>{setChoice(v);setWrong(null)})}/>
          </g>)}
          {draw&&<g className="rests-drag-ghost" transform={`translate(${draw.x} ${draw.y})`}><RestGlyph value={draw.value}/></g>}
          {noteTap(notes,l)}
        </>;
      }}</EngravedRow>
    </div>;
    progress={done:round+(passed?1:0),total:2};extra=!passed?hintButton:null;tools=passed?playButton(notes):null;
    if(passed&&round===0)next={label:tr('Next gap','下一个空缺'),ready:true,onClick:()=>{audio.stop();setPlaying(false);setRound(1);resetFeedback();setChoice(null);setWrong(null)}};
    else if(passed)next=done?{label:tr('Back to theory lessons','回到乐理课'),ready:true,href:'/flute-studio/theory'}:{label:tr('Finish lesson','完成课程'),ready:true,onClick:()=>{audio.stop();course.finish('rests');setDone(true);setFeedback(tr('Next, dots and ties let us write more note lengths.','下一课，用附点和连音线写出更多时值。'))}};
  }
  if(!next)next=step===4?{label:tr('Back to theory lessons','回到乐理课'),ready:false,onClick:()=>{audio.stop();window.location.assign('/flute-studio/theory')}}:{label:tr(`Next: ${names[step+1]}`,`下一步：${names[step+1]}`),ready:passed,onClick:()=>navigate(step+1)};
  return <LessonFrame className="rests-lesson" title={tr('Rests','休止符')} zh={zh} steps={names} current={step} onJump={navigate} heading={names[step]} narration={narration} fadeNarration message={message} tone={tone} next={next} extra={extra} progress={progress} status={audio.error?tr('Sound could not start. Tap Replay or Start to try again.','声音没能启动。点重播或开始再试一次。'):undefined}>
    <div className="rests-scene">{scene}<div className="measures-tools">{tools}</div></div>
  </LessonFrame>;
}
