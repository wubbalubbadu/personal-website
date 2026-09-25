'use client';
import Link from 'next/link';
import {useEffect, useRef, useState, type PointerEvent} from 'react';
import {useLanguage} from '../../i18n/LanguageContext';
import TrebleClef from '../TrebleClef';
import {pitchAt, readSaved, SAVE_KEY, noteY, positionAt, ledgerLines} from '../model';
import RhythmNote, {STEM_HEIGHT, STEM_X} from './RhythmNote';
import DurationTree from './DurationTree';
import {assessHold, VALUES, type NoteValue} from './rhythmModel';
import {useRhythmAudio} from './useRhythmAudio';
import '../theory.css';
import './rhythm.css';
import '../lesson-frame.css';
import {useCourseProgress} from '../useCourseProgress';

const HOLD_VALUES:NoteValue[] = [1, 2, 4];
const INTRO_RHYTHMS:NoteValue[][] = [[1,1,1,1],[.5,.5,2,1],[2,1,.5,.5],[.5,2,.5,1],[1,.5,2,.5]];
function svgPoint(event:PointerEvent<SVGElement>) {
  const svg=event.currentTarget.ownerSVGElement!; const point=svg.createSVGPoint(); point.x=event.clientX; point.y=event.clientY;
  return point.matrixTransform(svg.getScreenCTM()!.inverse());
}
export default function RhythmLesson() {
  const {lang}=useLanguage(), zh=lang==='zh', tr=(en:string,cn:string)=>zh?cn:en;
  const [step,setStep]=useState(0),[variant,setVariant]=useState(0),[shape,setShape]=useState<number|null>(null);
  const [depth,setDepth]=useState(0),[treeRow,setTreeRow]=useState(0),[shortValue,setShortValue]=useState<NoteValue>(.5);
  const [beams,setBeams]=useState(0),[beamValue,setBeamValue]=useState<NoteValue>(.5),[drawing,setDrawing]=useState<number|null>(null);
  const [round,setRound]=useState(0),[holding,setHolding]=useState(false),[heldMs,setHeldMs]=useState(0),[feedback,setFeedback]=useState(''),[correct,setCorrect]=useState(false);
  const [selected,setSelected]=useState(0),[melody,setMelody]=useState<NoteValue[]>([1,1,1,1]),[positions,setPositions]=useState([2,3,4,2]),[done,setDone]=useState(false);
  const transcript=useRef<HTMLOListElement>(null),holdStart=useRef<number|null>(null),holdTimeout=useRef<ReturnType<typeof setTimeout>|null>(null),beamEnd=useRef<number|null>(null),dragged=useRef<number|null>(null);
  const audio=useRhythmAudio(),course=useCourseProgress();
  const requiredBeams=beamValue===.5?1:2,joined=beams===requiredBeams;
  const names=[tr('Rhythm','节奏'),tr('Note shapes','音符形状'),tr('Note values','时值关系'),tr('Flags','符尾'),tr('Beams','符杠'),tr('Hold the note','保持时值'),tr('Your melody','你的旋律')];
  const labels=[tr('Whole note','全音符'),tr('Half note','二分音符'),tr('Quarter note','四分音符'),tr('Eighth note','八分音符'),tr('Sixteenth note','十六分音符')];
  const nameOf=(value:NoteValue)=>labels[VALUES.indexOf(value)];
  const shapeCopy=[
    tr('A whole note has an open notehead and no stem.','全音符的符头是空心的，没有符干。'),
    tr('A half note adds a stem to an open notehead.','二分音符有空心符头和符干。'),
    tr('A quarter note has a filled notehead and a stem.','四分音符有实心符头和符干。'),
    tr('An eighth note adds one flag to the stem.','八分音符在符干上多了一条符尾。'),
    tr('A sixteenth note has two flags. Each extra flag halves the duration.','十六分音符有两条符尾。每多一条符尾，时值就减半。'),
  ];
  const descriptions=[
    tr('Rhythm is the pattern of long and short sounds. The bars show each sound’s duration.','节奏是长短声音的排列。下方的条形表示每个声音持续的时间。'),
    shape===null?tr('Noteheads, stems, and flags distinguish these five note lengths.','符头、符干和符尾，让我们区分这五种时值。'):shapeCopy[shape],
    [tr('A whole note lasts as long as two half notes. Reveal the next row to see the relationship.','一个全音符的时值等于两个二分音符。展开下一层，看看它们的关系。'),tr('Two half notes fill the whole note’s time. Listen to either row and compare.','两个二分音符的总时值等于一个全音符。点任意一层，听听比较。'),tr('Four quarter notes fill the whole note’s time. The same division continues into shorter notes.','四个四分音符的总时值等于一个全音符。更短的音符也遵循同样的二分关系。'),tr('Each quarter note divides into two eighth notes.','每个四分音符可以分成两个八分音符。'),tr('One whole note equals sixteen sixteenths. Every row still takes the same time to play.','一个全音符等于十六个十六分音符。每一层播放的总时值都相同。')][depth],
    shortValue===.5?tr('One flag makes an eighth note. Two eighth notes fit into one quarter-note pulse.','一条符尾表示八分音符。一个四分音符的脉冲里，可以放两个八分音符。'):tr('Two flags make a sixteenth note. Four fit into one quarter-note pulse.','两条符尾表示十六分音符。一个四分音符的脉冲里，可以放四个十六分音符。'),
    tr('A beam replaces flags when short notes are grouped. Their duration stays the same.','短音符连在一起时，符杠代替符尾，时值不变。'),
    tr('Count each pulse while you hold. Let the final pulse finish before releasing.','按住时，跟着脉冲数拍。最后一拍结束后再松开。'),
    tr('Choose the pitches and their lengths to make your own phrase.','选择音高和时值，写出你自己的旋律。'),
  ];
  const invitations=[
    tr('Try another pattern. The pitches stay the same; the long and short sounds move.','换一种排列试试。音高不变，长短声音的位置会改变。'),
    tr('Tap any note to see which parts it has.','点一个音符，看看它由哪些部分组成。'),
    depth===4?tr('Tap different rows and compare how they fill the same four pulses.','点不同的层，比较它们怎样填满同样的四个脉冲。'):tr('Tap a row to hear it with the clicks. Split again to reveal smaller values.','点一层音符，跟着点击声听听。继续拆分，看看更小的时值。'),
    shortValue===.5?tr('Listen for the sounds between clicks. Try two flags next.','听听两声点击之间的音。再试试两条符尾。'):tr('Switch back to one flag and compare what you hear.','换回一条符尾，比较听到的声音。'),
    joined?'👍 '+tr('Connected! The note lengths are unchanged.','连好了！音符的时值没有改变。'):tr(beamValue===.5?'Draw from the left stem’s top to the right stem’s top.':'Sixteenth notes need two beams. Trace each guide between the stems.',beamValue===.5?'从左边符干顶端画到右边符干顶端。':'十六分音符需要两条符杠。沿两条引导线连接符干。'),
    holding?tr('Keep holding. Release when the bar reaches the end.','继续按住。进度条到终点时松开。'):tr(`Press and hold the cat for ${HOLD_VALUES[round]} full ${HOLD_VALUES[round]===1?'pulse':'pulses'}, then release.`,`按住小猫，保持 ${HOLD_VALUES[round]} 个完整脉冲，再松开。`),
    tr('Drag a note higher or lower. Choose a note length below for the selected note.','上下拖动音符改变音高。在下方为选中的音符选择时值。'),
  ];
  const message=feedback||invitations[step];
  useEffect(()=>{const frame=requestAnimationFrame(()=>window.dispatchEvent(new CustomEvent('cookie:lesson',{detail:message})));return()=>{cancelAnimationFrame(frame);window.dispatchEvent(new CustomEvent('cookie:lesson',{detail:''}))}},[message]);
  useEffect(()=>{const frame=requestAnimationFrame(()=>{const list=transcript.current,row=list?.querySelector<HTMLElement>('[aria-current="step"]');if(list&&row)list.scrollTo({top:row.offsetTop-list.clientHeight/2+row.clientHeight/2,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})});return()=>cancelAnimationFrame(frame)},[step]);
  useEffect(()=>()=>{if(holdTimeout.current)clearTimeout(holdTimeout.current)},[]);
  useEffect(()=>{if(!holding)return;let frame=0;const tick=(time:number)=>{if(holdStart.current===null)return;setHeldMs(Math.max(0,time-holdStart.current));frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)},[holding]);
  const target=HOLD_VALUES[round];
  let notes:NoteValue[]=[1,1,1,1];
  if(step===0)notes=INTRO_RHYTHMS[variant];
  if(step===1)notes=[...VALUES];
  if(step===2)notes=Array(2**treeRow).fill(VALUES[treeRow]);
  if(step===3)notes=Array(shortValue===.5?2:4).fill(shortValue);
  if(step===4)notes=[beamValue,beamValue];
  if(step===5)notes=[target];
  if(step===6)notes=melody;
  const xs=notes.map((_,i)=>notes.length===1?390:step===4?330+i*120:step===3?390+(i-(notes.length-1)/2)*90:step===1?115+i*135:205+i*420/(notes.length-1));
  const ys=notes.map((_,i)=>step===0||step===6?noteY(positions[i]):step===1?190:176);
  const pitches=step===0||step===6?positions.map(p=>pitchAt(p).midi):notes.map(()=>67);
  function cancelHold(){holdStart.current=null;if(holdTimeout.current)clearTimeout(holdTimeout.current);setHolding(false);audio.stop()}
  function navigate(next:number){cancelHold();setStep(next);setFeedback('');setCorrect(false);setDrawing(null);beamEnd.current=null;dragged.current=null;setDone(false);if(next===6){try{const saved=readSaved(localStorage.getItem(SAVE_KEY));if(saved.phrase.every(p=>p!==null))setPositions(saved.phrase as number[])}catch{/* Optional saved phrase. */}}}
  function joinBeam(){const next=Math.min(requiredBeams,beams+1);setBeams(next);setCorrect(next===requiredBeams);setFeedback(next===requiredBeams?'👍 '+tr('Connected! The note lengths are unchanged.','连好了！音符的时值没有改变。'):tr('One beam is in place. Add the second one below it.','第一条连好了。在它下面加上第二条。'))}
  function hear(){if(audio.active>=0)audio.stop();else void audio.play(notes,pitches,0,step!==0)}
  function startHold(time:number){if(holdStart.current!==null)return;setFeedback('');setCorrect(false);holdStart.current=time;setHeldMs(0);setHolding(true);void audio.play([16],[67]);holdTimeout.current=setTimeout(()=>{cancelHold();setFeedback(tr('That was longer than this note. Try releasing when the bar reaches the end.','这次比目标时值长了。进度条到终点时，试着松开。'))},6500)}
  function endHold(time:number){const start=holdStart.current;if(start===null)return;const elapsed=time-start;cancelHold();const match=assessHold(elapsed,target);setCorrect(match);setFeedback(match?'👍 '+tr('That’s the full note length.','保持了完整的音符时值！'):elapsed<target*650?tr('A little short. Keep holding until the bar reaches the end.','短了一点。等进度条到终点再松开。'):tr('A little long. Try releasing as the bar reaches the end.','长了一点。试着在进度条到终点时松开。'))}
  const beat=audio.elapsed<0?-1:Math.floor(audio.elapsed/.65)%4;
  const nextLabels=[tr('Meet the note shapes','认识音符形状'),tr('Compare note values','比较音符时值'),tr('Explore the flags','认识符尾'),tr('Connect the notes','连接音符'),tr('Hold the note','保持音符时值'),tr('Make your own melody','写自己的旋律')];
  return <main className="theory-shell rhythm-lesson lesson-frame">
    <h1>{tr('Rhythm: note lengths','节奏：音符的时值')}</h1>
    <nav className="theory-timeline" aria-label={tr('Lesson progress','课程进度')}>{names.map((name,i)=><button key={i} onClick={()=>navigate(i)} aria-current={step===i?'step':undefined}>{name}</button>)}</nav>
    <section className="rhythm-stage" aria-label={names[step]}>
      <p className="rhythm-explanation" key={`${step}-${shape}-${depth}-${shortValue}`}>{descriptions[step]}</p>
      <div className="rhythm-visual">
        {step===2?<DurationTree depth={depth} selected={treeRow} active={audio.active} onSelect={row=>{setTreeRow(row);void audio.play(Array(2**row).fill(VALUES[row]))}} zh={zh}/>:<svg className={`rhythm-score ${step===1?'rhythm-shapes':''}`} viewBox={step===1?"0 0 760 310":"0 40 760 245"} preserveAspectRatio="xMidYMax meet" aria-label={notes.map(nameOf).join(', ')}>
          {step!==1&&<>{[0,1,2,3,4].map(i=><line key={i} x1="55" x2="705" y1={104+i*24} y2={104+i*24} stroke="#555" strokeWidth="1"/>)}<TrebleClef/></>}
          {notes.map((value,i)=><g key={`${step}-${i}`} transform={`translate(${xs[i]} ${ys[i]})`} className={`rhythm-note ${audio.active===i?'is-playing':''} ${step===6?'is-draggable':''}`}>
            {step===6&&selected===i&&<circle cx="0" cy="0" r="24" fill="#dbac65" fillOpacity=".16"/>}
            {(step===0||step===6)&&ledgerLines(positions[i]).map(p=><line key={p} x1="-23" x2="23" y1={noteY(p)-ys[i]} y2={noteY(p)-ys[i]} stroke="currentColor" strokeWidth="1.5"/>)}
            <RhythmNote value={value} down={step!==1&&ys[i]<=152} beamed={step===4&&beams>0} focus={step===1&&shape===i?(i>=3?'flag':i===1?'stem':'head'):''}/>
            <g role="button" tabIndex={0} aria-label={`${nameOf(value)} ${i+1}${step===6?`, ${pitchAt(positions[i]).name}${pitchAt(positions[i]).octave}`:''}`} aria-pressed={step===6?selected===i:undefined}
              onPointerDown={e=>{if(step!==6)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);setSelected(i);dragged.current=i;audio.stop()}}
              onPointerMove={e=>{if(step!==6||dragged.current!==i)return;const p=positionAt(svgPoint(e).y);setPositions(old=>old.map((v,n)=>n===i?p:v));setDone(false)}}
              onPointerUp={()=>{if(step===6&&dragged.current!==null){dragged.current=null;void audio.play([melody[i]],[pitchAt(positions[i]).midi],i,false)}}} onPointerCancel={()=>{dragged.current=null}}
              onClick={()=>{if(step===1){setShape(i);void audio.play([value],[67],i)}else if(step!==6)void audio.play([value],[pitches[i]],i,step!==0)}}
              onKeyDown={e=>{if(step===6&&(e.key==='ArrowUp'||e.key==='ArrowDown')){e.preventDefault();setSelected(i);const next=positionAt(noteY(positions[i]+(e.key==='ArrowUp'?1:-1)));setPositions(old=>old.map((p,n)=>n===i?next:p));void audio.play([melody[i]],[pitchAt(next).midi],i,false)}else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(step===6)setSelected(i);else if(step===1){setShape(i);void audio.play([value],[67],i)}else void audio.play([value],[pitches[i]],i,step!==0)}}}>
              <rect x="-30" y={ys[i]<=152&&step!==1?-24:-96} width="70" height="125" fill="transparent"/>
            </g>
            {step===1&&<text x="0" y="60" textAnchor="middle">{labels[i]}</text>}
          </g>)}
          {step===0&&notes.map((value,i)=>{const start=notes.slice(0,i).reduce((a,b)=>a+b,0)*.65;const amount=Math.max(0,Math.min(1,(audio.elapsed-start)/(value*.65)));return <g key={`duration-${i}`} aria-hidden="true"><rect x={xs[i]-16} y="254" width={value*40} height="9" rx="3" fill="#ded7ca"/>{audio.active===i&&<rect x={xs[i]-16} y="254" width={value*40*amount} height="9" rx="3" fill="#b9362e"/>}</g>})}
          {step===4&&Array.from({length:beams},(_,b)=><path key={b} d={`M${xs[0]+STEM_X} ${176-STEM_HEIGHT+b*13}H${xs[1]+STEM_X}`} stroke="currentColor" strokeWidth="7"/>)}
          {step===4&&!joined&&<g><path d={`M${xs[0]+STEM_X} ${176-STEM_HEIGHT+beams*13}H${xs[1]+STEM_X}`} stroke="#bd837e" strokeDasharray="4 8"/>{drawing!==null&&<path d={`M${xs[0]+STEM_X} ${176-STEM_HEIGHT+beams*13}H${drawing}`} stroke="#b9362e" strokeWidth="6"/>}<rect x={xs[0]-15} y={176-STEM_HEIGHT+beams*13-20} width={xs[1]-xs[0]+50} height="48" fill="transparent" className="rhythm-draw" onPointerDown={e=>{const x=svgPoint(e).x;if(Math.abs(x-xs[0]-STEM_X)<45){e.currentTarget.setPointerCapture(e.pointerId);beamEnd.current=x;setDrawing(x)}}} onPointerMove={e=>{if(beamEnd.current===null)return;beamEnd.current=Math.min(xs[1]+STEM_X,svgPoint(e).x);setDrawing(beamEnd.current)}} onPointerUp={()=>{if(beamEnd.current!==null&&beamEnd.current>=xs[1]-20)joinBeam();beamEnd.current=null;setDrawing(null)}} onPointerCancel={()=>{beamEnd.current=null;setDrawing(null)}}/></g>}
        </svg>}
      </div>
      <div className="rhythm-workbench">
        <div className="rhythm-tool-slot">
          {step===0&&<button onClick={()=>{const next=(variant+1)%INTRO_RHYTHMS.length;setVariant(next);void audio.play(INTRO_RHYTHMS[next],pitches,0,false)}}>{tr('Another rhythm','换一种节奏')}</button>}
          {step===1&&<span>{shape===null?'':nameOf(VALUES[shape])}</span>}
          {step===2&&<div className="rhythm-tree-controls"><button disabled={depth===0} onClick={()=>{audio.stop();setDepth(d=>d-1);setTreeRow(r=>Math.min(r,depth-1))}}>{tr('Fold a row','收起一层')}</button><button disabled={depth===4} onClick={()=>{audio.stop();setDepth(d=>d+1);setTreeRow(depth+1)}}>{tr('Split in two','一分为二')}</button></div>}
          {step===3&&<button onClick={()=>{audio.stop();setShortValue(v=>v===.5?.25:.5)}}>{shortValue===.5?tr('Add a second flag','再加一条符尾'):tr('Use one flag','只用一条符尾')}</button>}
          {step===4&&<div className="rhythm-tree-controls"><button onClick={()=>{if(joined){setBeams(0);setFeedback('');setCorrect(false)}else joinBeam()}}>{joined?tr('Show flags','显示符尾'):tr('Join beam','连接符杠')}</button><button onClick={()=>{audio.stop();setBeamValue(v=>v===.5?.25:.5);setBeams(0);setCorrect(false);setFeedback('')}}>{beamValue===.5?tr('Try sixteenths','试试十六分音符'):tr('Try eighths','试试八分音符')}</button></div>}
          {step===5&&<div className="rhythm-hold-nav"><span>{tr(`Note ${round+1} of 3`,`第 ${round+1} 个，共 3 个`)}</span><button className={`rhythm-next-pattern${correct&&round<2?' lesson-next-ready':''}`} disabled={!correct||round===2} onClick={()=>{cancelHold();setRound(r=>r+1);setCorrect(false);setFeedback('')}}>{round===2?tr('Last note','最后一个'):tr('Next note','下一个音符')}</button></div>}
          {step===6&&<div className="rhythm-values" role="group" aria-label={tr(`Length of note ${selected+1}`,`第 ${selected+1} 个音的时值`)}>{VALUES.map(value=><button key={value} aria-pressed={melody[selected]===value} aria-label={nameOf(value)} onClick={()=>{audio.stop();setMelody(old=>old.map((v,i)=>i===selected?value:v));setDone(false)}}><svg viewBox="-27 -100 75 140" aria-hidden="true"><RhythmNote value={value}/></svg><span>{nameOf(value)}</span></button>)}</div>}
        </div>
        <div className="rhythm-action-slot">
          {step===5?<div className="rhythm-hold"><button className={`rhythm-cat ${holding?'is-held':''}`} aria-label={tr('Hold the cat for the note length','按住小猫保持音符时值')} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);startHold(e.timeStamp)}} onPointerUp={e=>endHold(e.timeStamp)} onPointerCancel={cancelHold} onLostPointerCapture={()=>{if(holdStart.current!==null)cancelHold()}} onKeyDown={e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();startHold(e.timeStamp)}}} onKeyUp={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();endHold(e.timeStamp)}}} onBlur={()=>{if(holdStart.current!==null)cancelHold()}}><svg viewBox="0 0 100 85" aria-hidden="true"><path d="M20 35L19 8L39 22Q50 18 61 22L81 8L80 35Q91 71 50 73Q9 71 20 35Z" fill="#e3c89e" stroke="#7c6245" strokeWidth="2"/><path d="M34 42v6m32-6v6M46 54l4 3 4-3M50 57v5" stroke="#493b2b" strokeWidth="3" fill="none"/><ellipse className="cat-paw" cx="28" cy="75" rx="13" ry="7" fill="#bc9361"/><ellipse className="cat-paw" cx="72" cy="75" rx="13" ry="7" fill="#bc9361"/></svg><span className="rhythm-hold-count">{holding?(heldMs>=target*650?tr('Release','松开'):`${Math.min(target,Math.floor(heldMs/650)+1)} / ${target}`):`${target} ${tr(target===1?'count':'counts','拍')}`}</span></button><div className="rhythm-hold-track" role="progressbar" aria-label={tr('Held duration','保持的时值')} aria-valuemin={0} aria-valuemax={target} aria-valuenow={holding?Math.min(target,heldMs/650):correct?target:0}><span style={{width:`${holding?Math.min(100,heldMs/(650*target)*100):correct?100:0}%`}}/></div></div>:step===0?<span className="rhythm-pattern-count">{variant+1} / {INTRO_RHYTHMS.length}</span>:<div className="rhythm-pulse" aria-label={tr('Quarter-note pulse','四分音符脉冲')}>{[0,1,2,3].map(i=><i key={i} className={beat===i?'is-on':''}/>)}</div>}
        </div>
        <div className="rhythm-listen-slot"><button disabled={holding} onClick={hear}>{audio.active>=0?tr('Stop','停止'):tr('Listen','听一听')}</button></div>
      </div>
      <p className="rhythm-pulse-caption" role={audio.error?'alert':undefined}>{audio.error?tr('Sound could not start. Tap Listen to retry.','声音未能启动，请点“听一听”重试。'):step===0?'':tr('For these examples, one click = one quarter note.','本课示例中，一声点击 = 一个四分音符的时值。')}</p>
      <div id="lesson-companion" className={correct?'rhythm-success':''}/>
    </section>
    <footer className="rhythm-navigation"><button disabled={step===0} onClick={()=>navigate(step-1)}>{step?`← ${names[step-1]}`:tr('Previous','上一步')}</button><span>{step+1} / {names.length}</span>{step<6?<button className={(step===4&&joined)||(step===5&&correct&&round===2)?'lesson-next-ready':undefined} onClick={()=>navigate(step+1)}>{nextLabels[step]} →</button>:done?<Link href="/flute-studio/theory">{tr('Theory lessons','乐理课')} →</Link>:<button onClick={()=>{cancelHold();course.finish('rhythm');setDone(true);setFeedback(tr('You’ve explored note lengths. Next comes grouping the pulse into measures.','你已经认识了音符时值。接下来，我们学习怎样把脉冲组成小节。'))}}>{tr('Finish lesson','完成课程')} →</button>}</footer>
    <ol className="rhythm-transcript" ref={transcript} aria-label={tr('Lesson outline','课程提要')}>{names.map((name,i)=><li key={i}><button aria-current={step===i?'step':undefined} onClick={()=>navigate(i)}><span>{i+1}</span>{name}<small>{[tr('Rhythm arranges long and short sounds.','节奏是长短声音的排列。'),tr('Some notes have stems; shorter notes also have flags.','有些音符有符干，更短的音符还有符尾。'),tr('Each row divides the same total duration.','每一层平分相同的总时值。'),tr('One flag: eighth. Two flags: sixteenth.','一条符尾：八分。两条符尾：十六分。'),tr('Beams replace flags without changing duration.','符杠代替符尾，时值不变。'),tr('Sustain the sound until its full length has passed.','让声音持续到完整时值结束。'),tr('Combine pitch and duration in a phrase.','用音高和时值组成旋律。')][i]}</small></button></li>)}</ol>
  </main>;
}
