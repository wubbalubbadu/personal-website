'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {useLanguage} from '../../i18n/LanguageContext';
import LessonFrame,{type LessonNext} from '../LessonFrame';
import EngravedRow,{type RowLayout} from '../EngravedRow';
import PianoKeys,{type KeyLight} from '../PianoKeys';
import {ACCIDENTALS} from '../accidentalGlyphs';
import {noteY} from '../model';
import {useRhythmAudio} from '../rhythm/useRhythmAudio';
import {useCourseProgress} from '../useCourseProgress';
import {letterMidi,midiOf,soundingMidi,type Acc,type ReadNote} from './pitch';
import {makeRound,WHITE,type Round} from './pairs';
import SignTracing from './SignTracing';
import MatchNotes from './MatchNotes';
import '../theory.css';
import '../lesson-shell.css';
import '../measures/measures.css';
import './accidentals.css';

/*
 * Lesson 4. The learner always acts on the notation (watch, draw, draw, choose, answer, match);
 * the keyboard below only shows where a written note lives: it lights up and is never tapped.
 */
const FLOW=['half','sharp','flat','natural','measure','same'] as const;
type StepId=typeof FLOW[number];

const n=(p:number,acc?:Acc,v=1):ReadNote=>acc?{v,p,acc}:{v,p};
// Step 1: C D E F G A B C.
const SCALE:ReadNote[]=Array.from({length:8},(_,i)=>n(i-2));
const LETTERS=['C','D','E','F','G','A','B','C'];
// Step 4: F sharp, then B flat, each to be made plain.
const NATURAL_Q=[{p:1,sign:'sharp' as const,letter:'F'},{p:4,sign:'flat' as const,letter:'B'}];
// Step 5: the three questions.
const MEASURE_Q=[
  {notes:[n(1,'sharp'),n(2),n(1),n(3),n(1),n(2),n(3),n(2)],bars:[4],circle:2,answer:0,to:'bar' as const},
  {notes:[n(4,'flat'),n(4),n(4,'natural'),n(4)],bars:[] as number[],circle:1,answer:0,to:'natural' as const},
  {notes:[n(4,'flat'),n(4),n(4,'natural'),n(4)],bars:[] as number[],circle:3,answer:1,to:'natural' as const},
];

/** The engraved sign as a button face (drawn from the glyphs, never typed characters). */
function Glyph({sign}:{sign:Acc}){
  return <svg className="acc-glyph" viewBox="-40 -650 380 1300" aria-hidden="true"><path transform="scale(1 -1)" d={ACCIDENTALS[sign]}/></svg>;
}

export default function AccidentalsLesson(){
  const {lang}=useLanguage(),zh=lang==='zh',tr=(en:string,cn:string)=>zh?cn:en;
  const [step,setStep]=useState(0),[done,setDone]=useState(false);
  const audio=useRhythmAudio(),course=useCourseProgress(),id:StepId=FLOW[step];
  // The key lit by the last note touched, and the melody now sounding (a single note never counts as one).
  const [pressed,setPressed]=useState<number|null>(null),[playMidis,setPlayMidis]=useState<number[]>([]);
  // Step 1: the demonstration stage (0 none, 1 E to F, 2 F to G).
  const [demo,setDemo]=useState(0);
  // Steps 2 and 3: the sign is drawn; `trace` restarts the drawing.
  const [drawn,setDrawn]=useState(false),[trace,setTrace]=useState(0);
  // Step 4: which question, and the sign chosen.
  const [nq,setNq]=useState(0),[npick,setNpick]=useState<Acc|null>(null);
  // Step 5: question number and the answer picked.
  const [q,setQ]=useState(0),[pick,setPick]=useState<number|null>(null);
  // Step 6: the round, the left notes matched so far (the first pair is shown), the left note being dragged, and feedback.
  const [round,setRound]=useState<Round>(()=>makeRound()),[lines,setLines]=useState<number[]>([0]),[dragging,setDragging]=useState<number|null>(null);
  const [misses,setMisses]=useState<Record<number,number>>({}),[lastWrong,setLastWrong]=useState<number|null>(null),[shownFor,setShownFor]=useState<number|null>(null),[flash,setFlash]=useState<number|null>(null),[note,setNote]=useState<'start'|'wrong'|'right'|'white'>('start');
  const flashTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(flashTimer.current)clearTimeout(flashTimer.current)},[]);

  const names=[tr('Half steps','半音'),tr('Draw a sharp','画升号'),tr('Draw a flat','画降号'),tr('Naturals','还原号'),tr('Through the measure','一整个小节'),tr('Same key, two names','同一个键，两个名字')];
  // One sounding note is never a melody: it must not light staff notes by position.
  const hear=(midis:number[],metronome=false)=>{setPlayMidis([]);void audio.play(midis.map(()=>1),midis,0,metronome)};
  /** Play notes `from` to `to` of a written melody; the keys and staff light by position in the whole. */
  const playMelody=(notes:ReadNote[],bars:number[],from=0,to=notes.length)=>{
    const midis=soundingMidi(notes,bars);setPlayMidis(midis);
    void audio.play(notes.slice(from,to).map(x=>x.v),midis.slice(from,to),from);
  };

  function navigate(next:number){
    audio.stop();if(flashTimer.current)clearTimeout(flashTimer.current);
    setStep(next);setPressed(null);setPlayMidis([]);setFlash(null);
    // Each step starts fresh when you arrive.
    const target=FLOW[next];
    if(target==='half')setDemo(0);
    if(target==='sharp'||target==='flat'){setDrawn(false);setTrace(t=>t+1)}
    if(target==='natural'){setNq(0);setNpick(null)}
    if(target==='measure'){setQ(0);setPick(null)}
    if(target==='same'){setRound(makeRound());setLines([0]);setDragging(null);setMisses({});setLastWrong(null);setShownFor(null);setNote('start')}
  }

  let narration:ReactNode='',message:ReactNode='',tone:'correct'|'wrong'|null=null,ready=false,pageNext:LessonNext|undefined,progress:{done:number;total:number}|undefined,tools:ReactNode=null;
  let notes:ReadNote[]=[],bars:number[]=[],reserveAcc=false,active:number|number[]=-1,arc:[number,number]|null=null;
  let lit:KeyLight[]=[],draw:((layout:RowLayout)=>ReactNode)|undefined,scene:ReactNode=null;
  /** The key of the note playing now in a melody, if one is. */
  const sounding=():KeyLight[]=>audio.active>=0&&playMidis[audio.active]!==undefined?[{midi:playMidis[audio.active],tone:'red'}]:[];
  const button=(label:string,onClick:()=>void)=><button className="measures-secondary" onClick={onClick}>{label}</button>;
  const clear=button(tr('Clear','清除'),()=>{audio.stop();setDrawn(false);setTrace(t=>t+1)});

  if(id==='half'){
    narration=tr('Every note you’ve read so far is a white key. From one key to the very next one, black or white, is a half step.','目前你读过的每个音都是一个白键。从一个键到紧挨着的下一个键，不管黑键还是白键，都是一个半音。');
    message=demo===1?tr('E and F have no key between them. They’re a half step apart.','E 和 F 之间没有别的键，它们相差一个半音。')
      :demo===2?tr('F to G skips a black key, so that’s two half steps. The black key has no line or space of its own. This lesson is about how to write it.','F 到 G 中间隔着一个黑键，所以是两个半音。这个黑键在五线谱上没有自己的位置。这节课就是讲怎么写它。')
      :tr('Press Listen, or tap a note to hear it and see its key.','点“听一听”，或者点一个音，听听它，看看它的键。');
    ready=demo===2;tone=demo>0?'correct':null;
    notes=SCALE;
    if(demo===1){active=[2,3];lit=[{midi:64,tone:'red'},{midi:65,tone:'red'}];arc=[64,65]}
    else if(demo===2){active=[3,4];lit=[{midi:65,tone:'red'},{midi:67,tone:'red'},{midi:66,tone:'outline',pulse:true}];arc=[65,67]}
    else if(playMidis.length&&audio.active>=0){active=audio.active;lit=sounding()}
    else if(pressed!==null){active=SCALE.findIndex(x=>letterMidi(x.p)===pressed);lit=[{midi:pressed,tone:'red'}]}
    // A tap on a note plays it and lights its key. Notes take no colour on hover.
    const tapNote=(midi:number)=>{setDemo(0);setPressed(midi);hear([midi])};
    draw=layout=><>{SCALE.map((x,i)=><rect key={i} className="acc-hit acc-note-hit" x={layout.xs[i]-18} y={noteY(x.p)-18} width="36" height="36" role="button" tabIndex={0} aria-label={LETTERS[i]}
      onClick={()=>tapNote(letterMidi(x.p))} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tapNote(letterMidi(x.p))}}}/>)}</>;
    tools=button(tr('Listen','听一听'),()=>{setDemo(0);setPressed(null);playMelody(SCALE,[])});
    // Next may step through a demonstration (it never does the learner's part).
    if(demo===0)pageNext={label:tr('Show me →','演示给我看 →'),ready:true,onClick:()=>{audio.stop();setPlayMidis([]);setDemo(1)}};
    if(demo===1)pageNext={label:tr('And F to G? →','那 F 到 G 呢？ →'),ready:true,onClick:()=>setDemo(2)};
  }

  else if(id==='sharp'||id==='flat'){
    const sharp=id==='sharp',p=sharp?1:4,plain=letterMidi(p),signed=midiOf(p,sharp?'sharp':'flat');
    narration=sharp?tr('A sharp raises a note by a half step. It’s written just in front of the note, on the same line or space.','升号把一个音升高半音。它写在音符的前面，和音符在同一条线或同一个间上。')
      :tr('A flat lowers a note by a half step. It’s written in front of the note too.','降号把一个音降低半音，也写在音符前面。');
    message=drawn?(sharp?tr('F sharp: one key up from F. Same space on the staff, one sign in front.','升 F：比 F 高一个键。还在五线谱的同一个间，只是前面多了一个记号。'):tr('B flat: one key down from B.','降 B：比 B 低一个键。'))
      :sharp?tr('Draw the sharp along the faint one. Use your finger, a pencil or the mouse.','沿着淡淡的升号画出来。用手指、笔或鼠标都可以。'):tr('Draw the flat along the faint one.','沿着淡淡的降号画出来。');
    ready=drawn;tone=drawn?'correct':null;
    lit=[{midi:drawn?signed:plain,tone:'red'}];
    scene=<SignTracing key={`${id}-${trace}`} sign={sharp?'sharp':'flat'} p={p} label={sharp?tr('Draw a sharp in front of F','在 F 前面画一个升号'):tr('Draw a flat in front of B','在 B 前面画一个降号')}
      onComplete={()=>{setDrawn(true);setPlayMidis([]);void audio.play([1,1],[plain,signed],0,false)}}/>;
    tools=clear;
  }

  else if(id==='natural'){
    const Q=NATURAL_Q[nq],solved=npick==='natural',plain=letterMidi(Q.p);
    narration=tr('A natural cancels a sharp or flat. The note goes back to its plain letter.','还原号取消升号或降号，让音回到原来的音名。');
    message=npick===null?(nq===0?tr('Listen: this should be a plain F. Which sign makes it one?','听：这里应该是原来的 F。哪个记号能做到？'):tr('Now the flat. This should be a plain B. Which sign makes it one?','再看降号。这里应该是原来的 B。哪个记号能做到？'))
      :solved?(nq===0?tr('Back to plain F. Now the flat on the B.','回到了 F。再试试 B 上的降号。'):tr('Sharp, flat and natural: you know all three signs.','升号、降号和还原号，三个记号你都认识了。'))
      :tr('That one moves the note. The natural is the sign that takes it back to plain.','这个记号会让音移动。能让它回到原来音名的，是还原号。');
    tone=npick===null?null:solved?'correct':'wrong';
    ready=solved&&nq===1;progress={done:nq+(solved?1:0),total:NATURAL_Q.length};
    notes=[n(Q.p,solved?'natural':Q.sign)];reserveAcc=true;
    lit=[{midi:solved?plain:midiOf(Q.p,Q.sign),tone:'red'}];
    if(solved&&nq===0)pageNext={label:tr('Next question →','下一题 →'),ready:true,onClick:()=>{audio.stop();setNq(1);setNpick(null)}};
    const choose=(sign:Acc)=>{setNpick(sign);hear([sign==='natural'?plain:midiOf(Q.p,sign)])};
    tools=<>
      {button(tr('Listen','听一听'),()=>hear([plain]))}
      {!solved&&<div className="measures-choices" role="group" aria-label={tr(`Which sign makes this a plain ${Q.letter}?`,`哪个记号能让它变回原来的 ${Q.letter}？`)}>
        {(['sharp','flat','natural'] as Acc[]).map(sign=><button key={sign} className={npick===sign?'is-wrong':''} aria-label={sign==='sharp'?tr('sharp','升号'):sign==='flat'?tr('flat','降号'):tr('natural','还原号')} onClick={()=>choose(sign)}><Glyph sign={sign}/></button>)}
      </div>}
    </>;
  }

  else if(id==='measure'){
    const Q=MEASURE_Q[q],solved=pick===Q.answer,lastQ=q===MEASURE_Q.length-1,end=Q.bars[0]??Q.notes.length;
    narration=tr('A sharp or flat keeps going for the same note, in the same spot on the staff, until a natural or the bar line. Bar lines from lesson 3 matter here.','升号或降号会一直管着五线谱上同一个位置的同一个音，直到遇到还原号或小节线。第 3 课的小节线在这里就有用了。');
    const ask=[tr('Is this F sharp too?','这个 F 也是升 F 吗？'),tr('Is this B flat, or plain?','这个 B 是降 B，还是原来的 B？'),tr('And this one?','那这个呢？')][q];
    const right=[tr('Yes. The sharp earlier in the measure still counts. After the bar line, the next F is plain again.','对。小节前面的升号还管着它。过了小节线，下一个 F 就又是原来的 F 了。'),
      tr('Yes: the flat earlier in this measure still counts.','对：这个小节前面的降号还管着它。'),tr('Right: the natural cancelled the flat for the rest of the measure.','对：还原号把降号取消了，一直到这个小节结束。')][q];
    message=pick===null?ask:solved?right:tr('Look earlier in this measure for a sign on the same note.','看看这个小节前面，同一个音有没有记号。');
    tone=pick===null?null:solved?'correct':'wrong';
    ready=solved&&lastQ;progress={done:q+(solved?1:0),total:MEASURE_Q.length};
    const choices=q===0?[tr('Yes','是'),tr('No','否')]:[tr('Flat','降音'),tr('Plain','原音')];
    // Answering question 1 plays measure 1 alone; measure 2 has its own Listen, to hear the bar line start over.
    tools=solved
      ?(q===0?button(tr('Listen to measure 2','听第 2 小节'),()=>playMelody(Q.notes,Q.bars,end)):button(tr('Listen','听一听'),()=>playMelody(Q.notes,Q.bars)))
      :<div className="measures-choices" role="group" aria-label={ask}>{choices.map((label,k)=><button key={k} className={pick===k?'is-wrong':''}
        onClick={()=>{setPick(k);if(k===Q.answer)playMelody(Q.notes,Q.bars,0,end)}}>{label}</button>)}</div>;
    if(solved&&!lastQ)pageNext={label:tr('Next question →','下一题 →'),ready:true,onClick:()=>{audio.stop();setPlayMidis([]);setQ(x=>x+1);setPick(null)}};
    notes=Q.notes;bars=Q.bars;reserveAcc=true;active=playMidis.length?audio.active:-1;lit=sounding();
    const p=Q.notes[0].p;
    draw=layout=><>
      {solved&&<rect className="acc-reach" x={layout.xs[0]-40} y={noteY(p)-14} height="28" width={Math.max(0,(Q.to==='bar'?layout.barXs[0]:layout.xs[2]-40)-(layout.xs[0]-40))}/>}
      <circle className="measure-circle" cx={layout.xs[Q.circle]} cy={noteY(Q.notes[Q.circle].p)} r="24"/>
    </>;
  }

  else{
    const complete=lines.length===round.left.length;
    narration=tr('One key can have two names. The black key between A and B is A sharp, and it’s also B flat. Which name you see depends on the music.','一个键可以有两个名字。A 和 B 之间的黑键，既是升 A，也是降 B。你看到哪个名字，要看是什么音乐。');
    message=complete?tr('Writing a sharp in front of every F gets tiring. Next lesson: how music says “always”.','每个 F 前面都写升号挺累的。下一课：音乐怎么说“一直这样”。')
      :note==='wrong'?tr('Those are different keys. Find where each one lands on the keyboard.','这两个不是同一个键。看看它们各自落在键盘的哪里。')
      :note==='white'?tr('A sharp doesn’t always land on a black key. E sharp is just F.','升号不一定落在黑键上。升 E 其实就是 F。')
      :note==='right'?tr('Same key, two names.','同一个键，两个名字。')
      :tr('These two are the same key. Draw a line from each note on the left to its partner on the right.','这两个是同一个键。从左边的每个音，画一条线到右边和它同一个键的音。');
    tone=complete||note==='right'||note==='white'?'correct':note==='wrong'?'wrong':null;
    ready=complete;progress={done:lines.length-1,total:round.left.length-1};
    const keyOf=(side:'left'|'right',i:number)=>{const x=round[side][i];return midiOf(x.p,x.acc)};
    if(dragging!==null)lit=[{midi:keyOf('left',dragging),tone:'red'}];
    else if(flash!==null)lit=[{midi:flash,tone:'red'}];
    else lit=[{midi:pressed??midiOf(3,'sharp'),tone:'red'}];
    // Show answer outlines the partner of the left note that was missed twice.
    const hint=lastWrong!==null&&shownFor===lastWrong&&!lines.includes(lastWrong)?round.partner[lastWrong]:null;
    scene=<MatchNotes round={round} matched={lines} hint={hint} label={tr('Match the notes that are the same key','把同一个键的音连起来')}
      onDrag={setDragging}
      onDrop={(l,r)=>{
        if(round.partner[l]===r){
          const m=keyOf('left',l);setPressed(m);setLines(x=>[...x,l]);setLastWrong(null);setShownFor(null);
          const white=round.left[l].p===WHITE[0].p&&round.left[l].acc===WHITE[0].acc;
          setNote(white?'white':'right');hear([m,m]);return true;
        }
        const wrong=keyOf('right',r);
        setFlash(wrong);if(flashTimer.current)clearTimeout(flashTimer.current);flashTimer.current=setTimeout(()=>setFlash(null),600);
        setMisses(x=>({...x,[l]:(x[l]??0)+1}));setLastWrong(l);setNote('wrong');hear([wrong]);return false;
      }}/>;
    tools=lastWrong!==null&&(misses[lastWrong]??0)>=2&&shownFor!==lastWrong&&!lines.includes(lastWrong)
      ?button(tr('Show answer','显示答案'),()=>setShownFor(lastWrong)):null;
    if(complete)pageNext=done?{label:tr('Back to theory lessons','回到乐理课'),ready:true,href:'/flute-studio/theory'}
      :{label:tr('Finish lesson','完成课程'),ready:true,onClick:()=>{course.finish('accidentals');setDone(true)}};
  }

  const last=step===FLOW.length-1;
  const next:LessonNext=pageNext??(last?{label:tr('Back to theory lessons','回到乐理课'),ready:false,onClick:()=>window.location.assign('/flute-studio/theory')}
    :{label:tr(`Next: ${names[step+1]} →`,`下一步：${names[step+1]} →`),ready,onClick:()=>navigate(step+1)});

  return <LessonFrame className="accidentals-lesson" title={tr('Sharps, flats and naturals','升号、降号与还原号')} zh={zh} steps={names} current={step} onJump={navigate}
    heading={names[step]} narration={narration} message={message} tone={tone} next={next} progress={progress}
    status={audio.error?tr('Sound could not start. Tap again to retry.','声音未能启动，请再试一次。'):''}>
    <div className="acc-scene">
      {scene??<EngravedRow key={id} notes={notes} bars={bars} reserveAcc={reserveAcc} active={active} label={names[step]}>{draw}</EngravedRow>}
      <div className="sequence-keyboard is-visible acc-keys">
        <PianoKeys low={60} high={74} labels blackPlayable={false} interactive={false} lit={lit} arc={arc} zh={zh}/>
      </div>
    </div>
    <div className="lesson-tools measures-tools">{tools}</div>
  </LessonFrame>;
}
