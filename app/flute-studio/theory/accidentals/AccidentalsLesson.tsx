'use client';
import {useState,type ReactNode} from 'react';
import {useLanguage} from '../../i18n/LanguageContext';
import LessonFrame,{type LessonNext} from '../LessonFrame';
import EngravedRow,{type RowLayout} from '../EngravedRow';
import PianoKeys,{type KeyLight} from '../PianoKeys';
import {noteY} from '../model';
import {useRhythmAudio} from '../rhythm/useRhythmAudio';
import {useCourseProgress} from '../useCourseProgress';
import {midiOf,soundingMidi,type Acc,type ReadNote} from './pitch';
import {ACCIDENTALS} from '../accidentalGlyphs';
import {makeRound,type Round} from './pairs';
import SignTracing from './SignTracing';
import MatchNotes from './MatchNotes';
import '../theory.css';
import '../lesson-shell.css';
import '../measures/measures.css';
import './accidentals.css';

/*
 * Lesson 4. Every interaction is the moment the learner takes in the idea: they draw the new sign,
 * or listen and notice. Notes and keys always connect exactly as in lesson 1: touch a note or a key and
 * both turn red (and stay red until something else is touched); a melody lights each note and key in turn. No step ever tests a key.
 * There is never a metronome click in a pitch example. Each step has stages; the narration changes
 * with each stage and fades in; instructions are Cookie's, teaching is the narration's.
 */
const FLOW=['between','sharpflat','natural','measure','same'] as const;
type StepId=typeof FLOW[number];

const n=(p:number,acc?:Acc):ReadNote=>acc?{v:1,p,acc}:{v:1,p};
const C=n(-2),D=n(-1),E=n(0),F=n(1);
// Step 3: one full measure of 3/4, F sharp A F. The sharp still holds for the last F.
const NATURAL_NOTES=[n(1,'sharp'),n(3),n(1)];
// Step 4: the three questions. `to` is where the light band ends: the measure's end, the bar line, or the natural.
const MEASURE_Q=[
  {notes:[n(1,'sharp'),n(2),n(1),n(3)],bars:[] as number[],circle:2,answer:0,to:'end' as const,from:0,until:4},
  {notes:[n(1,'sharp'),n(2),n(3),n(2),n(1),n(3),n(2),n(3)],bars:[4],circle:4,answer:1,to:'bar' as const,from:4,until:8},
  {notes:[n(4,'flat'),n(4,'natural'),n(3),n(4)],bars:[] as number[],circle:3,answer:1,to:'natural' as const,from:0,until:4},
];
type Arrow={from:number;to:number};
/**
 * Steps 1 and 2 share one row of five slots, C ? D ? E: one per key from C to E. A slot with no note yet holds a question mark; in step 2
 * each question mark turns into the note the learner writes a sign for (C sharp, then E flat). Both in-between slots keep room for the
 * widest sign from the start, so nothing on the staff ever moves.
 */
const slot=(p:number,acc?:Acc):ReadNote=>({v:1,p,room:'flat',...(acc?{acc}:{})});

/**
 * A half step arrow over the staff, drawn like the keyboard's (the same curve, head and colour), from one note to the next, with its name
 * under it, just above the top line. Shown together with the keyboard's arrow, so the two say the same thing.
 */
function StaffArrow({from,to,label}:{from:number;to:number;label:string}){
  // Every arrow is the same width, centred between its two notes, so no half step looks bigger than another.
  const dir=Math.sign(to-from),mx=(from+to)/2,a=mx-dir*24,b=mx+dir*24,base=72,top=44;
  // The head points along the curve's end (from the control point to the end point).
  const tx=b-mx,ty=base-top,len=Math.hypot(tx,ty),ux=tx/len,uy=ty/len,head=12;
  const hx=(t:number)=>b-head*(ux*Math.cos(t)-uy*Math.sin(t)),hy=(t:number)=>base-head*(uy*Math.cos(t)+ux*Math.sin(t));
  return <g className="acc-staff-arrow" aria-hidden="true">
    <path d={`M${a} ${base}Q${mx} ${top} ${b} ${base}M${hx(.5)} ${hy(.5)}L${b} ${base}L${hx(-.5)} ${hy(-.5)}`}/>
    <text x={mx} y={base+26} textAnchor="middle">{label}</text>
  </g>;
}

export default function AccidentalsLesson(){
  const {lang}=useLanguage(),zh=lang==='zh',tr=(en:string,cn:string)=>zh?cn:en;
  const [step,setStep]=useState(0),[done,setDone]=useState(false);
  const audio=useRhythmAudio(),course=useCourseProgress(),id:StepId=FLOW[step];
  // The last thing touched, a note or a key: it and its partner stay red until something else is touched (lesson 1's behaviour).
  const [sel,setSel]=useState<{midi:number;index:number|null}|null>(null),[playMidis,setPlayMidis]=useState<number[]>([]);
  // The stage within a step; whether its action is done (a sign drawn, a key found); the tracing key.
  const [stage,setStage]=useState(1),[drawn,setDrawn]=useState(false),[trace,setTrace]=useState(0);
  // Staff arrows that appear one at a time as their keys sound.
  const [walk,setWalk]=useState<(Arrow|null)[]|null>(null);
  // Step 1: the gaps found so far (slot 1 between C and D, slot 3 between D and E), and the one found last (its arrows show).
  const [gaps,setGaps]=useState<number[]>([]),[lastGap,setLastGap]=useState<number|null>(null);
  // Step 2: the sharp row and flat row matched so far (white notes start joined); a wrong key tried for E sharp.
  const [rowLines,setRowLines]=useState<number[]>([0,2,4]),[miss,setMiss]=useState<number|null>(null);
  // Step 4: question number and the answer picked.
  const [q,setQ]=useState(0),[pick,setPick]=useState<number|null>(null);
  // Step 5: the round, the top notes matched so far (the first pair is joined already), the top note picked, and feedback.
  const [round,setRound]=useState<Round>(()=>makeRound()),[lines,setLines]=useState<number[]>([0]),[selected,setSelected]=useState<number|null>(null),[hintOn,setHintOn]=useState(false);
  const [misses,setMisses]=useState<Record<number,number>>({}),[attempt,setAttempt]=useState<{top:number;bottom:number}|null>(null),[shownFor,setShownFor]=useState<number|null>(null),[note,setNote]=useState<'start'|'wrong'|'right'>('start');

  const names=[tr('Between the notes','音与音之间'),tr('Sharp and flat','升号与降号'),tr('Naturals','还原号'),tr('Through the measure','一整个小节'),tr('Same key, two names','同一个键，两个名字')];
  // No metronome in any pitch example: a sequence and a single tap sound alike.
  const hear=(midis:number[])=>{setPlayMidis([]);setWalk(null);void audio.play(midis.map(()=>1),midis,0,false)};
  let staffMidis:number[]=[];
  /** A step that asks for a key (or reveals something when a key is touched) answers here; true means it handled the touch. */
  let keyTap:((midi:number)=>boolean)|null=null;
  /** Touching a note plays it as it sounds and selects its key; touching a key plays it and selects the note that sounds like it. */
  const tapNote=(i:number)=>{const midi=staffMidis[i];if(midi===undefined)return;hear([midi]);setSel({midi,index:i})};
  const tapKey=(midi:number)=>{if(keyTap?.(midi))return;hear([midi]);const index=staffMidis.indexOf(midi);setSel({midi,index:index>=0?index:null})};
  /** Play notes `from` to `to` of a written melody; the keys and staff light by position in the whole. */
  const playMelody=(notes:ReadNote[],bars:number[],from=0,to=notes.length)=>{
    const midis=soundingMidi(notes,bars);setPlayMidis(midis);setWalk(null);
    return audio.play(notes.slice(from,to).map(x=>x.v),midis.slice(from,to),from,false);
  };
  /** Play these exact pitches in turn (for sounds with no note of their own on the staff). */
  const playKeys=(midis:number[],value=1)=>{setPlayMidis(midis);setWalk(null);return audio.play(midis.map(()=>value),midis,0,false)};
  /** Play a melody with one half-step arrow at a time: from the key just heard to the key sounding now (`steps[i]` is the arrow for note i). */
  const playWalk=(play:()=>Promise<void>,steps:(Arrow|null)[])=>{const started=play();setWalk(steps);return started};
  const goStage=(next:number)=>{audio.stop();setPlayMidis([]);setDrawn(false);setSel(null);setWalk(null);setSelected(null);setMiss(null);setStage(next)};

  function navigate(next:number){
    audio.stop();
    setStep(next);setSel(null);setPlayMidis([]);setStage(1);setDrawn(false);setWalk(null);setTrace(t=>t+1);setGaps([]);setLastGap(null);setRowLines([0,2,4]);setSelected(null);setMiss(null);
    // Each step starts fresh when you arrive.
    const target=FLOW[next];
    if(target==='measure'){setQ(0);setPick(null)}
    if(target==='same'){setRound(makeRound());setLines([0]);setSelected(null);setHintOn(false);setMisses({});setAttempt(null);setShownFor(null);setNote('start')}
  }

  let narration:ReactNode='',message:ReactNode='',tone:'correct'|'wrong'|null=null,ready=false,pageNext:LessonNext|undefined,progress:{done:number;total:number}|undefined,tools:ReactNode=null;
  let notes:ReadNote[]=[],bars:number[]=[],meter:{top:number;bottom:number}|undefined,active:number|number[]=-1;
  let lit:KeyLight[]=[],scene:ReactNode=null,keysHidden=false;
  // The keyboard's range: the whole octave, or zoomed in on C to E so every half step is easy to see.
  let zoom=false;
  // Playing from the moment the sound is scheduled (elapsed counts from 0) until its last note ends.
  const playing=(audio.active>=0||audio.elapsed>=0)&&playMidis.length>0;
  /** The staff note touched last, lit red like the key, while no melody plays. */
  const touched=!playing&&sel?.index!=null?sel.index:-1;
  /** The key of the note playing now in a melody, if one is. */
  const sounding=():KeyLight[]=>playing&&playMidis[audio.active]!==undefined?[{midi:playMidis[audio.active],tone:'red'}]:[];
  const button=(label:string,onClick:()=>void)=><button className="measures-secondary" onClick={onClick}>{label}</button>;
  const clear=button(tr('Clear','清除'),()=>{audio.stop();setDrawn(false);setTrace(t=>t+1)});
  const listen=(onClick:()=>void)=>button(tr('Listen','听一听'),onClick);

  if(id==='between'||(id==='sharpflat'&&stage<=2)){
    // Step 1 and the first two stages of step 2 are rows of five slots, one per key: C ? D ? E (and going down, E ? D ? C). A slot with no
    // note yet is empty until found (step 1: tap the space between two notes), then holds a question mark; in step 2 the question marks
    // become written notes. The in-between slots keep room for a sign from the start, so nothing on the staff moves.
    zoom=true;
    const between=id==='between',down=!between&&stage===2;
    const sign:Acc=down?'flat':'sharp';
    // Which slots are notes. Step 2: the learner writes the first new note; the second follows by itself.
    const written=between?[]:drawn?[1,3]:[1];
    notes=down?[E,slot(0,drawn?'flat':undefined),D,slot(-1,drawn?'flat':undefined),C]
      :[C,slot(-2,!between&&drawn?'sharp':undefined),D,slot(-1,!between&&drawn?'sharp':undefined),E];
    const hidden=[1,3].filter(k=>!written.includes(k));
    // The keys under each slot, left to right.
    const slotKeys=down?[64,63,62,61,60]:[60,61,62,63,64];
    // Where a slot's picture is centred: a note with its sign in front is centred a little left of the note itself, and a question mark
    // stands there, so it turns into the note and sign without moving.
    const mid=(layout:RowLayout,k:number)=>layout.xs[k]-(k%2===1?16:0);
    // The question marks standing, and the ones giving way to a note right now.
    const marks=between?gaps:hidden,leaving=between?[]:drawn?[3]:[1];
    if(between){
      const both=gaps.length===2;
      narration=tr('On the keyboard, black keys sit between some of the white keys.','在键盘上，有些白键之间还夹着黑键。');
      message=gaps.length===0?tr('We can write the white keys C, D and E. Is there a sound between C and D? Tap the space between them.','白键 C、D、E 我们会写了。C 和 D 之间还有音吗？点一下它们中间的空位。')
        :!both?tr('That’s the black key between them: a half step from each side. Is there one between the other two notes too?','这就是它们之间的黑键：离两边各一个半音。另外两个音之间也有吗？')
        :tr('Each black key is a half step from its neighbours, so C to D is two half steps. But a black key has no line or space of its own. How do we write it?','每个黑键离两边都是一个半音，所以从 C 到 D 是两个半音。可是黑键在五线谱上没有自己的线或间。那要怎么写呢？');
      ready=both;
      // Finding a gap: the space between two notes, or its black key on the keyboard.
      const find=(k:number)=>{setGaps(g=>g.includes(k)?g:[...g,k]);setLastGap(k);hear([slotKeys[k]]);setSel({midi:slotKeys[k],index:null})};
      keyTap=midi=>{const k=slotKeys.indexOf(midi);if(k===1||k===3){find(k);return true}return false};
      staffMidis=soundingMidi(notes,bars).map((m,i)=>hidden.includes(i)?-1:m);
      active=playing?audio.active:touched;
      const at=(layout:RowLayout)=><>
        {[1,3].map(k=><rect key={`gap-${k}`} className="acc-hit acc-gap-hit" x={mid(layout,k)-34} y={noteY(8)-10} width="68" height={noteY(-4)-noteY(8)} role="button" tabIndex={0}
          aria-label={k===1?tr('Between C and D','C 和 D 之间'):tr('Between D and E','D 和 E 之间')} onClick={()=>find(k)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();find(k)}}}/>)}
        {lastGap!==null&&!playing&&<>
          <StaffArrow from={mid(layout,lastGap-1)} to={mid(layout,lastGap)} label={tr('half step','半音')}/>
          <StaffArrow from={mid(layout,lastGap)} to={mid(layout,lastGap+1)} label={tr('half step','半音')}/>
        </>}
      </>;
      scene=<SignTracing key="chromatic" attempt={trace} right={620} notes={notes} hidden={hidden} target={null} sign={null} active={active}
        extra={layout=><>{at(layout)}{questions(layout)}</>} onTapNote={tapNote}
        label={tr('C, D and E, with space between each','C、D、E，每两个之间有空位')} onComplete={()=>{}}/>;
      tools=listen(()=>{setSel(null);setLastGap(null);void playKeys(slotKeys)});
    }else{
      narration=down?tr('A flat lowers a note to the very next key down: one half step.','降号把一个音降到紧挨着的下一个键：降低一个半音。')
        :tr('A sharp raises a note to the very next key up: one half step.','升号把一个音升到紧挨着的上一个键：升高一个半音。');
      message=down?(drawn?tr('E flat: one half step down from E. And the other one is D flat, one half step down from D.','降 E：比 E 低一个半音。另一个就是降 D，比 D 低一个半音。'):tr('Going down this time. The question mark is just below E: draw a flat in front of it to make it E flat.','这次往下走。这个问号就在 E 的下面：在它前面画一个降号，把它写成降 E。'))
        :drawn?tr('C sharp: one half step up from C. And the other one is D sharp, one half step up from D.','升 C：比 C 高一个半音。另一个就是升 D，比 D 高一个半音。')
        :tr('The question mark is just above C. Draw a sharp in front of it to make it C sharp.','这个问号就在 C 的上面。在它前面画一个升号，把它写成升 C。');
      tone=drawn?'correct':null;
      staffMidis=soundingMidi(notes,bars);
      active=playing?audio.active:touched;
      // Once written: the whole row plays, a half step arrow over each step as it sounds.
      const steps:(Arrow|null)[]=[null,...slotKeys.slice(1).map((to,i)=>({from:slotKeys[i],to}))];
      const playRow=(row:ReadNote[])=>playWalk(()=>playMelody(row,bars),steps);
      const staffArrow=(layout:RowLayout)=>walk&&playing&&audio.active>=1&&<StaffArrow from={mid(layout,audio.active-1)} to={mid(layout,audio.active)} label={tr('half step','半音')}/>;
      const target=drawn?null:1;
      scene=<SignTracing key={down?'down':'chromatic'} attempt={trace} right={620} notes={notes} hidden={hidden} appear={drawn?[3]:[1]} target={target} sign={target===null?null:sign} active={active}
        extra={layout=><>{questions(layout)}{staffArrow(layout)}</>} onTapNote={tapNote}
        label={down?tr('E, E flat, D, D flat, C','E、降 E、D、降 D、C'):tr('C, C sharp, D, D sharp, E','C、升 C、D、升 D、E')}
        onComplete={()=>{setDrawn(true);setSel(null);void playRow(notes.map((x,i)=>i===1||i===3?{...x,acc:sign}:x))}}/>;
      tools=!drawn?clear:listen(()=>{setSel(null);void playRow(notes)});
      pageNext=!drawn?undefined:down?{label:tr('Match them up →','把它们配起来 →'),ready:true,onClick:()=>goStage(3)}
        :{label:tr('Now going down →','现在往下走 →'),ready:true,onClick:()=>goStage(2)};
    }
    // The question marks: one in each empty slot (red while its black key sounds or was touched), and any fading into a written note.
    function questions(layout:RowLayout){
      const y=(k:number)=>(noteY(notes[k-1].p)+noteY(notes[k+1].p))/2,now=playing?audio.active:-1;
      return <>
        {marks.map(k=><g key={`q-${k}`} className={`acc-question${now===k||(!playing&&sel?.midi===slotKeys[k])?' is-hot':''}`} aria-hidden="true"><text x={mid(layout,k)} y={y(k)+10} textAnchor="middle">?</text></g>)}
        {leaving.map(k=><g key={`leave-${stage}-${k}`} className="acc-question is-leaving" aria-hidden="true"><text x={mid(layout,k)} y={y(k)+10} textAnchor="middle">?</text></g>)}
      </>;
    }
  }

  else if(id==='sharpflat'&&stage===3){
    // The sharp row over the flat row: join each written black key to the one with the same key. The white notes start joined.
    zoom=true;
    const top=[C,n(-2,'sharp'),D,n(-1,'sharp'),E],bottom=[E,n(0,'flat'),D,n(-1,'flat'),C];
    const pairRound:Round={left:top,right:bottom,partner:[4,3,2,1,0]};
    const both=rowLines.length===5;
    narration=tr('Every black key has two names: a sharp and a flat.','每个黑键都有两个名字：一个带升号，一个带降号。');
    message=both?tr('C sharp is D flat, and D sharp is E flat: one sound, two names.','升 C 就是降 D，升 D 就是降 E：一个音，两个名字。')
      :miss!==null?tr('Those are different keys. Look at which key each one is.','这两个不是同一个键。看看它们各是哪个键。')
      :tr('Connect each sharp on top to the flat below that is the same key. Tap one, then the other.','把上面每个升号音，连到下面和它是同一个键的降号音。先点一个，再点另一个。');
    tone=both?'correct':miss!==null?'wrong':null;
    if(selected!==null)lit=[{midi:midiOf(top[selected].p,top[selected].acc),tone:'red'}];
    scene=<MatchNotes round={pairRound} matched={rowLines} quiet={[0,2,4]} selected={selected} hint={null} label={tr('Match the sharps to the flats','把升号音和降号音配对')}
      onSelect={i=>{setSelected(i);setMiss(null);if(i!==null)hear([midiOf(top[i].p,top[i].acc)])}}
      onDrop={(l,r)=>{
        const m=midiOf(top[l].p,top[l].acc);
        if(pairRound.partner[l]===r){setRowLines(x=>x.includes(l)?x:[...x,l]);setMiss(null);hear([m,m]);setSel({midi:m,index:null});return true}
        setMiss(r);hear([midiOf(bottom[r].p,bottom[r].acc)]);return false;
      }}/>;
    pageNext={label:tr('What about E and F? →','那 E 和 F 呢？ →'),ready:both,onClick:()=>goStage(4)};
  }

  else if(id==='sharpflat'){
    // E sharp: a half step up from E. There is no black key between E and F, so it lands on F's key. The learner finds that key.
    notes=[E,n(0,'sharp'),F];
    narration=tr('A sharp always means the very next key up, black or white.','升号永远是往上紧挨着的那个键，不管是黑键还是白键。');
    const found=drawn;
    message=found?tr('E sharp is F’s key: there’s no black key between E and F. The same happens between B and C.','升 E 就是 F 的键：E 和 F 之间没有黑键。B 和 C 之间也一样。')
      :miss!==null?tr('Not that one. Start from E and go to the very next key up. Is there a black key between E and F?','不是这个。从 E 开始，往上走到紧挨着的那个键。E 和 F 之间有黑键吗？')
      :tr('E sharp is one half step up from E. Which key is that? Tap it.','升 E 比 E 高一个半音。是哪个键？点一下。');
    ready=found;tone=found?'correct':miss!==null?'wrong':null;
    keyTap=midi=>{if(found)return false;if(midi===65){setDrawn(true);setMiss(null);setSel(null);hear([64,65]);return true}setMiss(midi);return false};
    if(found&&!playing)lit=[{midi:65,tone:'green'}];
    staffMidis=soundingMidi(notes,bars);active=playing?audio.active:touched;
    const equals=(layout:RowLayout)=>found&&<g className="acc-equals" aria-hidden="true">
      <text x={(layout.xs[1]+layout.xs[2])/2} y={(noteY(notes[1].p)+noteY(notes[2].p))/2+12} textAnchor="middle">=</text>
      <text className="acc-equals__label" x={(layout.xs[1]+layout.xs[2])/2} y={noteY(8)-22} textAnchor="middle">{tr('same key','同一个键')}</text>
    </g>;
    scene=<SignTracing key="e-sharp" right={620} notes={notes} target={null} sign={null} active={active} extra={equals} onTapNote={tapNote}
      label={tr('E, E sharp and F','E、升 E 和 F')} onComplete={()=>{}}/>;
  }

  else if(id==='natural'){
    // F sharp, A, F sharp in 3/4. Stage 1: both sharps are written; the second isn't needed, since a sharp lasts the whole measure, so the
    // learner takes it away (tap it). Stage 2: a natural cancels the sharp; the learner draws it.
    narration=stage===1?tr('A sharp lasts until the end of the measure, for every note on the same line or space.','升号一直管到这一小节结束，管着同一条线或同一个间上的每个音。')
      :tr('A natural cancels the sharp. The note goes back to the white key.','还原号取消升号，这个音回到白键上。');
    message=stage===1?(drawn?tr('Still F sharp: the first sharp covers the whole measure, so it sounds the same.','还是升 F：第一个升号管着整个小节，所以听起来一样。'):tr('Both Fs are sharp. They’re in the same measure, so the second sharp isn’t needed. Tap it to take it away.','两个 F 都是升 F。它们在同一小节里，所以第二个升号不用写。点它，把它去掉。'))
      :drawn?tr('Back to plain F. That’s what a natural is for.','回到了原来的 F。这就是还原号的用处。'):tr('What if the music wants plain F at the end? Draw a natural in front of the last F. It’s two little 7s, one upside down.','如果音乐在最后要的是原来的 F 呢？在最后一个 F 前面画一个还原号。它是两个小 7，一个倒过来。');
    ready=stage===2&&drawn;tone=drawn?'correct':null;
    meter={top:3,bottom:4};
    // The last note keeps the same room whichever sign it has (the written sharp, none, or the natural), so nothing moves.
    const lastAcc:Acc|undefined=stage===1?(drawn?undefined:'sharp'):drawn?'natural':undefined;
    notes=[NATURAL_NOTES[0],NATURAL_NOTES[1],{...NATURAL_NOTES[2],room:'natural',...(lastAcc?{acc:lastAcc}:{})}];
    staffMidis=soundingMidi(notes,[]);
    active=playing?audio.active:touched;
    const canDraw=stage===2&&!drawn;
    // Stage 1: the second sharp can be tapped away; it fades out where it stood, and the measure plays: the last F still sounds sharp.
    const erase=()=>{setDrawn(true);setSel(null);void playMelody(NATURAL_NOTES,[])};
    const sharpTap=(layout:RowLayout)=>stage===1&&(drawn
      ?<path key="erasing" className="acc-erasing" d={ACCIDENTALS.sharp} transform={`translate(${layout.xs[2]-35} ${noteY(1)}) scale(.064 -.064)`}/>
      :<rect className="acc-hit acc-sign-hit" x={layout.xs[2]-44} y={noteY(1)-40} width="34" height="80" role="button" tabIndex={0} aria-label={tr('The second sharp','第二个升号')}
        onClick={erase} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();erase()}}}/>);
    scene=<SignTracing key={`nat-${stage}-${trace}`} right={620} notes={notes} meter={meter} target={canDraw?2:null} sign={canDraw?'natural':null} active={active} extra={sharpTap}
      onTapNote={tapNote} label={tr('F sharp, A and F sharp in 3/4','3/4 拍的升 F、A 和升 F')}
      onComplete={()=>{setDrawn(true);setSel(null);playMelody([...NATURAL_NOTES.slice(0,2),n(1,'natural')],[])}}/>;
    tools=canDraw?clear:stage===1&&!drawn?null:listen(()=>playMelody(notes,[]));
    if(stage===1&&drawn)pageNext={label:tr('Cancel the sharp →','取消升号 →'),ready:true,onClick:()=>goStage(2)};
  }

  else if(id==='measure'){
    const Q=MEASURE_Q[q],solved=pick===Q.answer,lastQ=q===MEASURE_Q.length-1;
    narration=tr('A sharp or flat keeps going for the same note, in the same spot on the staff, until a natural or the bar line.','升号或降号会一直管着五线谱上同一个位置的同一个音，直到遇到还原号或小节线。');
    const ask=q===2?tr('Is the circled note flat, or plain?','圈出的音是降音，还是原来的音？'):tr('Is the circled note sharp, or plain?','圈出的音是升音，还是原来的音？');
    const right=[tr('Sharp. The sign earlier in the measure still counts.','升 F。小节前面的记号还管着它。'),tr('Plain. The bar line ended the sharp.','原来的 F。小节线让升号结束了。'),tr('Plain. The natural cancelled the flat.','原来的 B。还原号把降号取消了。')][q];
    message=pick===null?ask:solved?right:tr('Look earlier in this measure for a sign on the same note.','看看这个小节前面，同一个音有没有记号。');
    tone=pick===null?null:solved?'correct':'wrong';
    ready=solved&&lastQ;progress={done:q+(solved?1:0),total:MEASURE_Q.length};
    const choices=q===2?[tr('Flat','降音'),tr('Plain','原音')]:[tr('Sharp','升音'),tr('Plain','原音')];
    // Once right, the buttons are gone (the row keeps its height) and only the measure holding the circled note plays.
    tools=solved
      ?listen(()=>playMelody(Q.notes,Q.bars,Q.from,Q.until))
      :<div className="measures-choices" role="group" aria-label={ask}>{choices.map((label,k)=><button key={k} className={pick===k?'is-wrong':''}
        onClick={()=>{setPick(k);if(k===Q.answer)playMelody(Q.notes,Q.bars,Q.from,Q.until)}}>{label}</button>)}</div>;
    if(solved&&!lastQ)pageNext={label:tr('Next question →','下一题 →'),ready:true,onClick:()=>{audio.stop();setPlayMidis([]);setQ(x=>x+1);setPick(null);setSel(null)}};
    notes=Q.notes;bars=Q.bars;meter={top:4,bottom:4};staffMidis=soundingMidi(notes,bars);
    active=playing?audio.active:touched;lit=playing?sounding():[];
    scene=<EngravedRow key={`measure-${q}`} className="acc-wide" notes={notes} bars={bars} meter={meter} active={active} label={names[step]}>{(layout:RowLayout)=><>
      {solved&&<rect className="acc-reach" x={layout.xs[0]-40} y={noteY(Q.notes[0].p)-14} height="28" width={Math.max(0,(Q.to==='bar'?layout.barXs[0]:Q.to==='natural'?layout.xs[1]-40:layout.endX-14)-(layout.xs[0]-40))}/>}
      <circle className="measure-circle" cx={layout.xs[Q.circle]} cy={noteY(Q.notes[Q.circle].p)} r="24"/>
      {Q.notes.map((x,i)=><rect key={i} className="acc-hit acc-note-hit" x={layout.xs[i]-18} y={noteY(x.p)-18} width="36" height="36" role="button" tabIndex={0} aria-label={`${i+1}`}
        onClick={()=>tapNote(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tapNote(i)}}}/>)}
    </>}</EngravedRow>;
  }

  else{
    const complete=lines.length===round.left.length;
    narration=tr('One key can have two names. Which name you see depends on the music.','一个键可以有两个名字。你看到哪个名字，要看是什么音乐。');
    const keyOf=(side:'left'|'right',i:number)=>{const x=round[side][i];return midiOf(x.p,x.acc)};
    const current=selected??round.left.findIndex((_,i)=>!lines.includes(i));
    const wrongHere=attempt!==null&&attempt.top===current;
    // The hint says exactly what it shows: the current top note's key, and after a wrong try, both keys tried.
    message=complete?tr('Writing a sharp in front of every F gets tiring. Next lesson: how music says “always”.','每个 F 前面都写升号挺累的。下一课：音乐怎么说“一直这样”。')
      :hintOn?(wrongHere?tr('Here are both keys. They’re different, so try another partner.','这是两个音各自的键。它们不一样，换一个试试。'):tr('Here’s the key for your top note.','这是你上面那个音的键。'))
      :note==='wrong'?tr('Those are different keys. Press Hint to see where each one is.','这两个不是同一个键。点“提示”看看它们各在哪里。')
      :note==='right'?tr('Same key, two names.','同一个键，两个名字。')
      :tr('You found this pair in step 2. Connect each top note to its partner below.','这一对你在第 2 步已经找到了。把上面的每个音连到下面和它同一个键的音。');
    tone=complete||(!hintOn&&note==='right')?'correct':!hintOn&&note==='wrong'?'wrong':null;
    ready=complete;progress={done:lines.length-1,total:round.left.length-1};
    // The keyboard's room is reserved from the start, so the staffs never move; Hint only shows it.
    keysHidden=!hintOn;
    lit=hintOn&&current>=0?[{midi:keyOf('left',current),tone:'red'},...(wrongHere?[{midi:keyOf('right',attempt.bottom),tone:'red' as const}]:[])]:[];
    const outlined=attempt!==null&&shownFor===attempt.top&&!lines.includes(attempt.top)?round.partner[attempt.top]:null;
    scene=<MatchNotes round={round} matched={lines} selected={selected} hint={outlined} label={tr('Match the notes that are the same key','把同一个键的音连起来')}
      onSelect={setSelected}
      onDrop={(l,r)=>{
        if(round.partner[l]===r){
          const m=keyOf('left',l);setLines(x=>[...x,l]);setAttempt(null);setShownFor(null);setHintOn(false);setNote('right');hear([m,m]);return true;
        }
        setMisses(x=>({...x,[l]:(x[l]??0)+1}));setAttempt({top:l,bottom:r});setNote('wrong');hear([keyOf('right',r)]);return false;
      }}/>;
    tools=complete?null:<>
      {button(hintOn?tr('Hide hint','收起提示'):tr('Hint','提示'),()=>setHintOn(h=>!h))}
      {attempt!==null&&(misses[attempt.top]??0)>=2&&shownFor!==attempt.top&&!lines.includes(attempt.top)&&button(tr('Show answer','显示答案'),()=>setShownFor(attempt.top))}
    </>;
    if(complete)pageNext=done?{label:tr('Back to theory lessons','回到乐理课'),ready:true,href:'/flute-studio/theory'}
      :{label:tr('Finish lesson','完成课程'),ready:true,onClick:()=>{course.finish('accidentals');setDone(true)}};
  }

  const last=step===FLOW.length-1;
  const next:LessonNext=pageNext??(last?{label:tr('Back to theory lessons','回到乐理课'),ready:false,onClick:()=>window.location.assign('/flute-studio/theory')}
    :{label:tr(`Next: ${names[step+1]} →`,`下一步：${names[step+1]} →`),ready,onClick:()=>navigate(step+1)});
  // What was touched last stays red on its key (and its note), as in lesson 1, until a melody plays or something else is touched.
  if(!playing&&sel&&id!=='same')lit=[...lit.filter(l=>l.midi!==sel.midi),{midi:sel.midi,tone:'red'}];
  // Whatever sounds is red on the keyboard.
  if(playing)lit=sounding();

  return <LessonFrame className="accidentals-lesson" title={tr('Sharps, flats and naturals','升号、降号与还原号')} zh={zh} steps={names} current={step} onJump={navigate}
    heading={names[step]} narration={narration} fadeNarration message={message} tone={tone} next={next} progress={progress}
    status={audio.error?tr('Sound could not start. Tap again to retry.','声音未能启动，请再试一次。'):''}>
    <div className="acc-scene">
      {scene}
      <div className={`sequence-keyboard is-visible acc-keys${id==='same'||(id==='sharpflat'&&stage===3)?' is-hint':''}${zoom?' is-zoom':''}`} style={keysHidden?{visibility:'hidden'}:undefined} aria-hidden={keysHidden||undefined}>
        <PianoKeys low={60} high={zoom?64:74} labels blackPlayable lit={lit} onKey={tapKey} zh={zh}/>
      </div>
    </div>
    <div className="lesson-tools measures-tools">{tools}</div>
  </LessonFrame>;
}
