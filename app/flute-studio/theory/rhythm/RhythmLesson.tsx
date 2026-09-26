'use client';
import {useEffect, useRef, useState, type PointerEvent, type ReactNode} from 'react';
import {useLanguage} from '../../i18n/LanguageContext';
import TrebleClef from '../TrebleClef';
import {pitchAt, readSaved, SAVE_KEY, noteY, positionAt, ledgerLines} from '../model';
import RhythmNote, {STEM_HEIGHT, STEM_X} from './RhythmNote';
import DurationTree from './DurationTree';
import NoteBuilder from './NoteBuilder';
import {assessHold, assessTaps, VALUES, type NoteValue} from './rhythmModel';
import {useRhythmAudio} from './useRhythmAudio';
import LessonFrame, {type LessonNext} from '../LessonFrame';
import {useCourseProgress} from '../useCourseProgress';
import '../theory.css';
import './rhythm.css';

const BEAT=650;
const HOLD_VALUES:NoteValue[] = [1, 2, 4];
const INTRO_RHYTHMS:NoteValue[][] = [[1,1,1,1],[.5,.5,2,1],[2,1,.5,.5],[.5,2,.5,1],[1,.5,2,.5]];
// Four-beat rhythms to clap back, easiest tier first; each round picks one from the next tier.
// Only onsets are checked, so the last note's length is free.
const TAP_TIERS:NoteValue[][][] = [
  [[1,1,1,1],[1,1,2],[2,1,1]],
  [[.5,.5,1,2],[1,.5,.5,2],[2,.5,.5,1]],
  [[.5,.5,.5,.5,1,1],[1,.5,.5,.5,.5,1],[.5,.5,1,.5,.5,1]],
];
// The lesson in order. Reordering is moving an id here; each step's content is keyed by id below.
const FLOW=['rhythm','shapes','build','values','beams','hold','tap','melody'] as const;
type StepId=typeof FLOW[number];
function svgPoint(event:PointerEvent<SVGElement>) {
  const svg=event.currentTarget.ownerSVGElement!; const point=svg.createSVGPoint(); point.x=event.clientX; point.y=event.clientY;
  return point.matrixTransform(svg.getScreenCTM()!.inverse());
}
const pickTaps=()=>TAP_TIERS.map(tier=>tier[Math.floor(Math.random()*tier.length)]);
// Enough of one value to fill a beat, so a short note is heard against the click the way it is counted.
const fillBeat=(value:NoteValue)=>Array<NoteValue>(value<1?1/value:1).fill(value);

export default function RhythmLesson() {
  const {lang}=useLanguage(), zh=lang==='zh', tr=(en:string,cn:string)=>zh?cn:en;
  const [step,setStep]=useState(0),[variant,setVariant]=useState(0),[shape,setShape]=useState<number|null>(null);
  const [depth,setDepth]=useState(0),[treeRow,setTreeRow]=useState(0),[built,setBuilt]=useState(0),[drawn,setDrawn]=useState(false);
  const [beams,setBeams]=useState(0),[beamRound,setBeamRound]=useState(0),[drawing,setDrawing]=useState<number|null>(null);
  const [round,setRound]=useState(0),[holding,setHolding]=useState(false),[heldMs,setHeldMs]=useState(0),[feedback,setFeedback]=useState(''),[correct,setCorrect]=useState(false);
  const [tapRhythms,setTapRhythms]=useState<NoteValue[][]>(()=>TAP_TIERS.map(tier=>tier[0])),[taps,setTaps]=useState<number[]>([]);
  const [selected,setSelected]=useState(0),[melody,setMelody]=useState<NoteValue[]>([1,1,1,1]),[positions,setPositions]=useState([2,3,4,2]),[done,setDone]=useState(false);
  const holdStart=useRef<number|null>(null),holdTimeout=useRef<ReturnType<typeof setTimeout>|null>(null),beamEnd=useRef<number|null>(null),dragged=useRef<number|null>(null);
  const audio=useRhythmAudio(),course=useCourseProgress();
  const id:StepId=FLOW[step];
  const beamValue:NoteValue=beamRound===0?.5:.25,requiredBeams=beamRound===0?1:2,joined=beams===requiredBeams;
  const names=[tr('Rhythm','节奏'),tr('Note shapes','音符形状'),tr('Build a note','画音符'),tr('Note values','时值关系'),tr('Beams','符杠'),tr('Hold the note','保持时值'),tr('Clap the rhythm','拍出节奏'),tr('Your melody','你的旋律')];
  const labels=[tr('whole note','全音符'),tr('half note','二分音符'),tr('quarter note','四分音符'),tr('eighth note','八分音符'),tr('sixteenth note','十六分音符')];
  const nameOf=(value:NoteValue)=>labels[VALUES.indexOf(value)];
  const beats=(n:number)=>zh?`${n} 拍`:`${n} ${n===1?'beat':'beats'}`;
  useEffect(()=>()=>{if(holdTimeout.current)clearTimeout(holdTimeout.current)},[]);
  useEffect(()=>{if(!holding)return;let frame=0;const tick=(time:number)=>{if(holdStart.current===null)return;setHeldMs(Math.max(0,time-holdStart.current));frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)},[holding]);

  const target=HOLD_VALUES[round],tapPattern=tapRhythms[round]??tapRhythms[0];
  let notes:NoteValue[]=[1,1,1,1];
  if(id==='rhythm')notes=INTRO_RHYTHMS[variant];
  if(id==='shapes')notes=[...VALUES];
  if(id==='values')notes=Array(2**treeRow).fill(VALUES[treeRow]);
  if(id==='build')notes=[...fillBeat(VALUES[built]),...(drawn?fillBeat(VALUES[built+1]):[])];
  if(id==='beams')notes=[beamValue,beamValue];
  if(id==='hold')notes=[target];
  if(id==='tap')notes=tapPattern;
  if(id==='melody')notes=melody;
  const xs=notes.map((_,i)=>notes.length===1?390:id==='beams'?330+i*120:id==='shapes'?115+i*135:205+i*420/(notes.length-1));
  const ys=notes.map((_,i)=>id==='rhythm'||id==='melody'?noteY(positions[i]):id==='shapes'?190:176);
  const pitches=id==='rhythm'||id==='melody'?positions.map(p=>pitchAt(p).midi):notes.map(()=>67);

  function cancelHold(){holdStart.current=null;if(holdTimeout.current)clearTimeout(holdTimeout.current);setHolding(false);audio.stop()}
  function navigate(next:number){
    cancelHold();setStep(next);setFeedback('');setCorrect(false);setDrawing(null);beamEnd.current=null;dragged.current=null;setDone(false);
    setRound(0);setBeams(0);setBeamRound(0);setBuilt(0);setDrawn(false);setTaps([]);setShape(null);
    if(FLOW[next]==='tap')setTapRhythms(pickTaps());
    if(FLOW[next]==='melody'){try{const saved=readSaved(localStorage.getItem(SAVE_KEY));if(saved.phrase.every(p=>p!==null))setPositions(saved.phrase as number[])}catch{/* Optional saved phrase. */}}
  }
  const nextRound=()=>{cancelHold();setRound(r=>r+1);setCorrect(false);setFeedback('');setTaps([])};
  function joinBeam(){const next=Math.min(requiredBeams,beams+1);setBeams(next);setCorrect(next===requiredBeams);setFeedback(next===requiredBeams?tr('Connected! Listen: it sounds exactly the same as with flags.','连好了！听一听，和用符尾时一模一样。'):tr('One beam in place. Add the second one just under it.','第一条连好了。在它下面再加一条。'))}
  function hear(){if(audio.active>=0)audio.stop();else void audio.play(notes,pitches,0,id!=='rhythm')}
  function startHold(time:number){if(holdStart.current!==null)return;setFeedback('');setCorrect(false);holdStart.current=time;setHeldMs(0);setHolding(true);void audio.play([16],[67]);holdTimeout.current=setTimeout(()=>{cancelHold();setFeedback(tr('Much too long. Let go when the last dot fills.','太长了。最后一个点亮起时就松开。'))},BEAT*10)}
  function endHold(time:number){const start=holdStart.current;if(start===null)return;const elapsed=time-start;cancelHold();const match=assessHold(elapsed,target);setCorrect(match);const ratio=elapsed/(target*BEAT);setFeedback(match?tr(`Yes! That’s a full ${nameOf(target)}.`,`对！这就是一个完整的${nameOf(target)}。`)
    :ratio<.6?tr(target===1?'Much too short. Keep holding until the whole beat has gone by.':`Much too short. Keep holding until all ${beats(target)} have gone by.`,`太短了。要一直按住，直到 ${beats(target)}都过去。`)
    :ratio<1?tr('A little short. Let go just as the last dot fills.','短了一点。最后一个点亮起后再松开。')
    :ratio<1.4?tr('A little long. Let go as soon as the last dot fills.','长了一点。最后一个点亮起就松开。')
    :tr('Much too long. Let go when the last dot fills.','太长了。最后一个点亮起时就松开。'))}
  // Each tap is a note onset. After the last note's tap, the gaps are compared with the written lengths.
  function tap(time:number){
    void audio.clap();
    const fresh=correct||taps.length>=tapPattern.length||(taps.length>0&&time-taps[taps.length-1]>BEAT*4.5);
    const next=fresh?[time]:[...taps,time];
    setTaps(next);if(fresh){setCorrect(false);setFeedback('')}
    if(next.length===tapPattern.length){const ok=assessTaps(next,tapPattern,BEAT);setCorrect(ok);setFeedback(ok?tr('That’s the rhythm!','就是这个节奏！'):tr('Close, but the gaps were uneven. Listen once more, then clap again.','差一点，间隔不太均匀。再听一次，然后重新拍。'))}
  }
  const beat=audio.elapsed<0?-1:Math.floor(audio.elapsed/(BEAT/1000))%4;
  // Beat dots under the staff. On the hold step there is one dot per beat of the note, filling as you hold.
  const dots=id==='hold'?Array.from({length:target},(_,i)=>holding?heldMs>=(i+1)*BEAT:correct):[0,1,2,3].map(i=>beat===i);

  // narration explains the idea above the music; message is Cookie: what to try, then how it went.
  let narration:ReactNode='',message:ReactNode='',tools:ReactNode=null,clicks=true;
  // Build a note: `built` is the note on the left; each change halves it into the next value.
  const lengthOf=[tr('4 beats','4 拍'),tr('2 beats','2 拍'),tr('1 beat','1 拍'),tr('half a beat','半拍'),tr('a quarter of a beat','四分之一拍')];
  const buildLabels=VALUES.map((_,i)=>`${[tr('Whole','全音符'),tr('Half','二分音符'),tr('Quarter','四分音符'),tr('Eighth','八分音符'),tr('Sixteenth','十六分音符')][i]} · ${lengthOf[i]}`);
  const buildCopy=[
    tr('A whole note lasts 4 beats. Add a stem and it becomes a half note: half as long.','全音符持续 4 拍。加上符干，它就变成二分音符：时值减半。'),
    tr('A half note lasts 2 beats. Fill in the head and it becomes a quarter note: half as long again.','二分音符持续 2 拍。把符头涂满，它就变成四分音符：时值再减半。'),
    tr('A quarter note lasts 1 beat. Add a flag and it becomes an eighth note: half a beat, so two fit in one beat.','四分音符持续 1 拍。加一条符尾，它就变成八分音符：半拍，一拍能放两个。'),
    tr('An eighth note lasts half a beat. Add a second flag and it becomes a sixteenth note: four fit in one beat.','八分音符持续半拍。再加一条符尾，它就变成十六分音符：一拍能放四个。'),
  ];
  switch(id){
    case 'rhythm':
      clicks=false;
      narration=tr('Rhythm is the pattern of long and short sounds. The bars under the notes show how long each one lasts.','节奏是长短声音的排列。音符下面的条形表示每个声音持续多久。');
      message=tr('Tap Another rhythm and listen. The pitches stay the same; only the lengths move.','点“换一种节奏”听一听。音高不变，只有长短在变。');
      tools=<button onClick={()=>{const next=(variant+1)%INTRO_RHYTHMS.length;setVariant(next);void audio.play(INTRO_RHYTHMS[next],pitches,0,false)}}>{tr('Another rhythm','换一种节奏')}</button>;
      break;
    case 'shapes':
      clicks=false;
      narration=shape===null?tr('Notes come in different shapes, and the shape tells you how long to hold the note.','音符有不同的形状，形状告诉你这个音要持续多久。')
        :[tr('A whole note has an open head and no stem.','全音符是空心符头，没有符干。'),tr('A half note is an open head with a stem.','二分音符是空心符头加符干。'),tr('A quarter note has a filled head and a stem.','四分音符是实心符头加符干。'),tr('An eighth note adds one flag to the stem.','八分音符在符干上加一条符尾。'),tr('A sixteenth note has two flags.','十六分音符有两条符尾。')][shape];
      message=shape===null?tr('Tap any note to see its parts and hear how long it lasts.','点一个音符，看看它有哪些部分，听听它有多长。'):tr(`That’s a ${labels[shape]}. Try the others.`,`这是${labels[shape]}。再试试其他的。`);
      break;
    case 'build':
      narration=buildCopy[built];
      message=drawn?tr(`That’s a ${labels[built+1]}: ${lengthOf[built+1]}.`,`这是${labels[built+1]}：${lengthOf[built+1]}。`)
        :[tr('Draw a stem up from the right side of the note on the right.','在右边的音符上，从符头右侧往上画一条符干。'),tr('Tap or scribble on the head of the note on the right to fill it in.','点一下或涂一涂右边音符的符头，把它涂满。'),tr('Draw a flag down from the top of the stem on the right.','在右边音符的符干顶端往下画一条符尾。'),tr('Add one more flag, just under the first.','在第一条下面再画一条符尾。')][built];
      break;
    case 'values':
      narration=[tr('A whole note lasts as long as two half notes. Split it to see.','一个全音符的时值等于两个二分音符。拆开看看。'),tr('Two half notes fill the same time as one whole note.','两个二分音符和一个全音符一样长。'),tr('Four quarter notes fill it too. Each split halves the length.','四个四分音符也一样长。每拆一次，时值减半。'),tr('Each quarter note splits into two eighth notes.','每个四分音符可以拆成两个八分音符。'),tr('Sixteen sixteenths fill one whole note. Every row takes the same time to play.','十六个十六分音符等于一个全音符。每一层播放的时间都一样。')][depth];
      message=depth===4?tr('Tap different rows and compare how they fill the same four beats.','点不同的层，比较它们怎样填满同样的四拍。'):tr('Tap a row to hear it with the clicks, or split again.','点一层，跟着点击声听听，或者继续拆分。');
      tools=<><button disabled={depth===0} onClick={()=>{audio.stop();setDepth(d=>d-1);setTreeRow(r=>Math.min(r,depth-1))}}>{tr('Fold a row','收起一层')}</button><button disabled={depth===4} onClick={()=>{audio.stop();setDepth(d=>d+1);setTreeRow(depth+1)}}>{tr('Split in two','一分为二')}</button></>;
      break;
    case 'beams':
      narration=beamRound===0?tr('When eighth notes sit side by side, their flags are often joined into one line called a beam. It groups them so you can see the beat. The length doesn’t change.','八分音符挨在一起时，符尾常常连成一条线，叫符杠。它把音符分组，让你看清拍子，时值不变。')
        :tr('Sixteenth notes have two flags, so they get two beams.','十六分音符有两条符尾，所以要两条符杠。');
      message=feedback||(beamRound===0?tr('Draw a line from the top of the left stem to the top of the right stem.','从左边符干顶端画到右边符干顶端。'):tr('Draw each beam between the stems.','在两条符干之间画出每一条符杠。'));
      break;
    case 'hold':
      narration=tr(`This is a ${nameOf(target)}. It lasts ${beats(target)}. When you play, you hold each note for its full length.`,`这是一个${nameOf(target)}，持续 ${beats(target)}。演奏时，每个音都要保持完整的时值。`);
      message=feedback||(holding?tr('Keep holding… let go when the last dot fills.','继续按住……最后一个点亮起时松开。'):tr(`Press and hold the cat for the whole ${nameOf(target)}: ${beats(target)}.`,`按住小猫，保持整个${nameOf(target)}：${beats(target)}。`));
      break;
    case 'tap':
      narration=tr('Now read a rhythm and clap it. Clap once for each note. A long note leaves a longer gap before the next clap.','现在读一个节奏，把它拍出来。每个音拍一下手。长音符后面，要等久一点再拍下一下。');
      message=feedback||(taps.length?tr(`${taps.length} of ${tapPattern.length}…`,`${taps.length} / ${tapPattern.length}……`):tr('Listen, then press Count me in. After four clicks, clap the rhythm along with the beat.','先听一听，再点“数拍开始”。四声点击之后，跟着拍子拍出这个节奏。'));
      break;
    case 'melody':
      narration=tr('Put it together: choose pitches and lengths to make your own phrase.','把学到的放在一起：选择音高和时值，写出你自己的旋律。');
      message=tr('Drag a note up or down. Pick a length below for the selected note.','上下拖动音符。在下面为选中的音符选一个时值。');
      tools=<div className="rhythm-values" role="group" aria-label={tr(`Length of note ${selected+1}`,`第 ${selected+1} 个音的时值`)}>{VALUES.map(value=><button key={value} aria-pressed={melody[selected]===value} aria-label={nameOf(value)} onClick={()=>{audio.stop();setMelody(old=>old.map((v,i)=>i===selected?value:v))}}><svg viewBox="-27 -100 75 140" aria-hidden="true"><RhythmNote value={value}/></svg></button>)}</div>;
      break;
  }

  let next:LessonNext;
  const onward={label:tr(`Next: ${names[step+1]} →`,`下一步：${names[step+1]} →`),onClick:()=>navigate(step+1)};
  if(id==='beams'&&joined&&beamRound===0)next={label:tr('Now sixteenths →','再试十六分音符 →'),ready:true,onClick:()=>{audio.stop();setBeamRound(1);setBeams(0);setCorrect(false);setFeedback('')},onSkip:()=>navigate(step+1)};
  else if(id==='hold'&&correct&&round<HOLD_VALUES.length-1)next={label:tr('Next note →','下一个音符 →'),ready:true,onClick:nextRound,onSkip:()=>navigate(step+1)};
  else if(id==='tap'&&correct&&round<2)next={label:tr('Next rhythm →','下一个节奏 →'),ready:true,onClick:nextRound,onSkip:()=>navigate(step+1)};
  else if(id==='melody')next=done?{label:tr('Back to theory lessons','回到乐理课'),ready:true,href:'/flute-studio/theory'}:{label:tr('Finish lesson','完成课程'),ready:true,onClick:()=>{cancelHold();course.finish('rhythm');setDone(true)}};
  else if(id==='build'&&drawn&&built<3)next={label:tr('Next change →','下一步变化 →'),ready:true,onClick:()=>{audio.stop();setBuilt(b=>b+1);setDrawn(false)},onSkip:()=>navigate(step+1)};
  else next={...onward,ready:id==='build'?drawn&&built===3:id==='beams'?joined:id==='hold'||id==='tap'?correct:true};
  if(id==='melody'&&done)message=tr('You’ve explored note lengths! Next comes grouping beats into measures.','你已经认识了音符时值！接下来，我们学习怎样把拍子组成小节。');

  const tone=correct||done||(id==='build'&&drawn)?'correct':(id==='hold'||id==='tap')&&feedback&&!correct?'wrong':null;
  const visual=id==='values'?<DurationTree depth={depth} selected={treeRow} active={audio.active} onSelect={row=>{setTreeRow(row);void audio.play(Array(2**row).fill(VALUES[row]))}} zh={zh}/>
    :id==='build'?<NoteBuilder stage={built} drawn={drawn} labels={buildLabels} zh={zh} onDrawn={()=>setDrawn(true)}/>
    :<svg className={`rhythm-score ${id==='shapes'?'rhythm-shapes':''}`} viewBox={id==='shapes'?'0 0 760 310':'0 40 760 245'} preserveAspectRatio="xMidYMid meet" aria-label={notes.map(nameOf).join(', ')}>
      {id!=='shapes'&&<>{[0,1,2,3,4].map(i=><line key={i} x1="55" x2="705" y1={104+i*24} y2={104+i*24} stroke="#555" strokeWidth="1"/>)}<TrebleClef/></>}
      {notes.map((value,i)=><g key={`${step}-${i}`} transform={`translate(${xs[i]} ${ys[i]})`} className={`rhythm-note ${audio.active===i||(id==='tap'&&i<taps.length&&!correct)?'is-playing':''} ${id==='melody'?'is-draggable':''}`}>
        {id==='melody'&&selected===i&&<circle cx="0" cy="0" r="24" fill="#dbac65" fillOpacity=".16"/>}
        {(id==='rhythm'||id==='melody')&&ledgerLines(positions[i]).map(p=><line key={p} x1="-23" x2="23" y1={noteY(p)-ys[i]} y2={noteY(p)-ys[i]} stroke="currentColor" strokeWidth="1.5"/>)}
        <RhythmNote value={value} down={id!=='shapes'&&ys[i]<=152} beamed={id==='beams'&&beams>0} focus={id==='shapes'&&shape===i?(i>=3?'flag':i===1?'stem':'head'):''}/>
        <g role="button" tabIndex={0} aria-label={`${nameOf(value)} ${i+1}${id==='melody'?`, ${pitchAt(positions[i]).name}${pitchAt(positions[i]).octave}`:''}`} aria-pressed={id==='melody'?selected===i:undefined}
          onPointerDown={e=>{if(id!=='melody')return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);setSelected(i);dragged.current=i;audio.stop()}}
          onPointerMove={e=>{if(id!=='melody'||dragged.current!==i)return;const p=positionAt(svgPoint(e).y);setPositions(old=>old.map((v,n)=>n===i?p:v))}}
          onPointerUp={()=>{if(id==='melody'&&dragged.current!==null){dragged.current=null;void audio.play([melody[i]],[pitchAt(positions[i]).midi],i,false)}}} onPointerCancel={()=>{dragged.current=null}}
          onClick={()=>{if(id==='shapes'){setShape(i);void audio.play([value],[67],i)}else if(id!=='melody')void audio.play([value],[pitches[i]],i,id!=='rhythm')}}
          onKeyDown={e=>{if(id==='melody'&&(e.key==='ArrowUp'||e.key==='ArrowDown')){e.preventDefault();setSelected(i);const nextP=positionAt(noteY(positions[i]+(e.key==='ArrowUp'?1:-1)));setPositions(old=>old.map((p,n)=>n===i?nextP:p));void audio.play([melody[i]],[pitchAt(nextP).midi],i,false)}else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(id==='melody')setSelected(i);else if(id==='shapes'){setShape(i);void audio.play([value],[67],i)}else void audio.play([value],[pitches[i]],i,id!=='rhythm')}}}>
          <rect x="-30" y={ys[i]<=152&&id!=='shapes'?-24:-96} width="70" height="125" fill="transparent"/>
        </g>
        {id==='shapes'&&<text x="0" y="60" textAnchor="middle">{labels[i]}</text>}
      </g>)}
      {id==='rhythm'&&notes.map((value,i)=>{const start=notes.slice(0,i).reduce((a,b)=>a+b,0)*BEAT/1000;const amount=Math.max(0,Math.min(1,(audio.elapsed-start)/(value*BEAT/1000)));return <g key={`duration-${i}`} aria-hidden="true"><rect x={xs[i]-16} y="254" width={value*40} height="9" rx="3" fill="#ded7ca"/>{audio.active===i&&<rect x={xs[i]-16} y="254" width={value*40*amount} height="9" rx="3" fill="#b9362e"/>}</g>})}
      {id==='beams'&&Array.from({length:beams},(_,b)=><path key={b} d={`M${xs[0]+STEM_X} ${176-STEM_HEIGHT+b*13}H${xs[1]+STEM_X}`} stroke="currentColor" strokeWidth="7"/>)}
      {id==='beams'&&!joined&&<g><path d={`M${xs[0]+STEM_X} ${176-STEM_HEIGHT+beams*13}H${xs[1]+STEM_X}`} stroke="#bd837e" strokeDasharray="4 8"/>{drawing!==null&&<path d={`M${xs[0]+STEM_X} ${176-STEM_HEIGHT+beams*13}H${drawing}`} stroke="#b9362e" strokeWidth="6"/>}<rect role="button" tabIndex={0} aria-label={tr('Draw the beam (or press Enter)','画出符杠（或按回车）')} x={xs[0]-15} y={176-STEM_HEIGHT+beams*13-20} width={xs[1]-xs[0]+50} height="48" fill="transparent" className="rhythm-draw" onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();joinBeam()}}} onPointerDown={e=>{const x=svgPoint(e).x;if(Math.abs(x-xs[0]-STEM_X)<45){e.currentTarget.setPointerCapture(e.pointerId);beamEnd.current=x;setDrawing(x)}}} onPointerMove={e=>{if(beamEnd.current===null)return;beamEnd.current=Math.min(xs[1]+STEM_X,svgPoint(e).x);setDrawing(beamEnd.current)}} onPointerUp={()=>{if(beamEnd.current!==null&&beamEnd.current>=xs[1]-20)joinBeam();beamEnd.current=null;setDrawing(null)}} onPointerCancel={()=>{beamEnd.current=null;setDrawing(null)}}/></g>}
    </svg>;

  return <LessonFrame className="rhythm-lesson" title={tr('Rhythm: note lengths','节奏：音符的时值')} zh={zh} steps={names} current={step} onJump={navigate}
    heading={names[step]} narration={narration} message={message} tone={tone} next={next}
    status={audio.error?tr('Sound could not start. Tap Listen to retry.','声音未能启动，请点“听一听”重试。'):''}>
    <div className="rhythm-visual">{visual}</div>
    {clicks&&id!=='build'&&<div className={`rhythm-pulse ${id==='hold'?'is-hold':''}`} aria-label={tr('Beats','拍子')}>{dots.map((on,i)=><i key={i} className={on?'is-on':''}/>)}</div>}
    {id==='values'&&<p className="rhythm-pulse-caption">{tr('One click = one beat = one quarter note.','一声点击 = 一拍 = 一个四分音符。')}</p>}
    <div className="rhythm-controls">
      {tools}
      {id==='hold'&&<div className="rhythm-hold">
        <button className={`rhythm-cat ${holding?'is-held':''}`} aria-label={tr('Hold the cat for the note length','按住小猫保持音符时值')} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);startHold(e.timeStamp)}} onPointerUp={e=>endHold(e.timeStamp)} onPointerCancel={cancelHold} onLostPointerCapture={()=>{if(holdStart.current!==null)cancelHold()}} onKeyDown={e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();startHold(e.timeStamp)}}} onKeyUp={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();endHold(e.timeStamp)}}} onBlur={()=>{if(holdStart.current!==null)cancelHold()}}><svg viewBox="0 0 100 85" aria-hidden="true"><path d="M20 35L19 8L39 22Q50 18 61 22L81 8L80 35Q91 71 50 73Q9 71 20 35Z" fill="#e3c89e" stroke="#7c6245" strokeWidth="2"/><path d="M34 42v6m32-6v6M46 54l4 3 4-3M50 57v5" stroke="#493b2b" strokeWidth="3" fill="none"/><ellipse className="cat-paw" cx="28" cy="75" rx="13" ry="7" fill="#bc9361"/><ellipse className="cat-paw" cx="72" cy="75" rx="13" ry="7" fill="#bc9361"/></svg></button>
      </div>}
      {id==='tap'&&<button className="rhythm-count-in" onClick={()=>{setTaps([]);setCorrect(false);setFeedback('');void audio.clicks(8)}}>{tr('Count me in','数拍开始')}</button>}
      {id==='tap'&&<button className="rhythm-clap" aria-label={tr('Clap','拍手')} onPointerDown={e=>{e.preventDefault();tap(e.timeStamp)}} onKeyDown={e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();tap(e.timeStamp)}}}><span aria-hidden="true">👏</span></button>}
      {id!=='hold'&&id!=='shapes'&&id!=='build'&&<button className="rhythm-listen" onClick={hear}>{audio.active>=0?tr('Stop','停止'):tr('Listen','听一听')}</button>}
    </div>
  </LessonFrame>;
}
