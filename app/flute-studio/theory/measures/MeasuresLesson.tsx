'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {useLanguage} from '../../i18n/LanguageContext';
import LessonFrame,{type LessonNext} from '../LessonFrame';
import {usePhoneNotation} from '../usePhoneNotation';
import EngravedRow,{layoutRow,phoneRowRight,type RowNote,type RowLayout,type Meter} from '../EngravedRow';
import {noteY,pitchAt} from '../model';
import {useRhythmAudio} from '../rhythm/useRhythmAudio';
import {useCourseProgress} from '../useCourseProgress';
import BarLineDrawing from './BarLineDrawing';
import CookieButton from '../CookieButton';
import {makeRhythm,makeBeatQuestions,measureTotals,beamGroups,type Rhythm,type BeatQuestion} from './rhythms';
import '../theory.css';
import '../lesson-shell.css';
import './measures.css';

/*
 * Lesson 3, rebuilt against storyboards/03-measures-and-time-signatures.md.
 * All notation is EngravedRow.
 */
const FLOW=['measures','counting','beats','top','bottom','bars','clap'] as const;
type StepId=typeof FLOW[number];

// Jingle Bells chorus (public domain): E E E | E E E | E G C D | E, in 4, starting on beat 1.
const JINGLE:RowNote[]=[{v:1,p:0},{v:1,p:0},{v:2,p:0},{v:1,p:0},{v:1,p:0},{v:2,p:0},{v:1,p:0},{v:1,p:2},{v:1,p:-2},{v:1,p:-1},{v:4,p:0}];
const JINGLE_MIDI=[64,64,64,64,64,64,64,67,60,62,64];
const JINGLE_BARS=[3,6,10];
// Frère Jacques (public domain), measures 1, 3 and 5: C D E C | E F G | G A G F E C.
// Measure 3 has eighth notes, so two notes share one count.
const JACQUES:RowNote[]=[{v:1,p:-2},{v:1,p:-1},{v:1,p:0},{v:1,p:-2},{v:1,p:0},{v:1,p:1},{v:2,p:2},{v:.5,p:2},{v:.5,p:3},{v:.5,p:2},{v:.5,p:1},{v:1,p:0},{v:1,p:-2}];
const JACQUES_MIDI=[60,62,64,60,64,65,67,67,69,67,65,64,60];
const JACQUES_BARS=[4,7];
// A short teaching melody: two complete measures of 3/4, starting on beat 1.
const TRIPLE_MELODY=[
  {v:1,p:-2},{v:1,p:0},{v:1,p:2},
  {v:1,p:1},{v:1,p:-1},{v:1,p:-2},
] satisfies RowNote[];
const TRIPLE_MELODY_MIDI=TRIPLE_MELODY.map(note=>pitchAt(note.p).midi);
const TRIPLE_MELODY_BARS=[3];
// Rhythm-only rows sit in the bottom space (F4), so they are played on F4 too.
const RHYTHM_MIDI=65;
const rhythmPitches=(notes:RowNote[])=>notes.map(()=>RHYTHM_MIDI);

const onsets=(notes:RowNote[])=>{const out:number[]=[];let t=0;notes.forEach(n=>{out.push(t);t+=n.v});return out};
const quarters=(count:number):RowNote[]=>Array.from({length:count},()=>({v:1}));

/**
 * The counts under a note: one for each beat that falls while it sounds. Its own count if it starts
 * on a beat, then held counts in gray. A note that starts between beats (a sixteenth) gets none.
 * `offset` shifts the count (a pickup before beat 1 in 3 starts on 3). Lit when sounding.
 */
function counts({notes,beatUnit=1,top,litBeat,offset=0,show,share=false}:{notes:RowNote[];beatUnit?:number;top:number;litBeat:number;offset?:number;show?:(note:number,beat:number)=>boolean;share?:boolean}){
  const starts=onsets(notes);
  return (i:number,x:number,layout:RowLayout)=>{
    const from=starts[i]/beatUnit,to=(starts[i]+notes[i].v)/beatUnit,beats:number[]=[];
    for(let b=Math.ceil(from-1e-6);b<to-1e-6;b++)if(!show||show(i,b))beats.push(b);
    return beats.map(beat=>{
      // `share`: notes shorter than the beat that fill it together get one count, centred under a bracket.
      let last=i;
      if(share&&notes[i].v<beatUnit)while(last+1<notes.length&&starts[last+1]/beatUnit<beat+1-1e-6)last++;
      const cx=last>i?(layout.xs[last]-x)/2:layout.beatX(beat*beatUnit)-x,y=noteY(-2)+44;
      return <g key={beat}>
        {last>i&&<path d={`M-10 ${y-34}v8H${layout.xs[last]-x+10}v-8`} className="count-bracket"/>}
        <text x={cx} y={y} className={`count ${beat>from+1e-6?'is-held':''} ${litBeat===beat?'is-lit':''}`}>{((beat+offset)%top)+1}</text>
      </g>;
    });
  };
}

const noteName=(v:number,zh:boolean)=>zh?({4:'全音符',2:'二分音符',1:'四分音符',.5:'八分音符'} as Record<number,string>)[v]:({4:'whole note',2:'half note',1:'quarter note',.5:'eighth note'} as Record<number,string>)[v];
/** "Count from the bar line: the half note takes 1 and 2, so this one starts on 3." */
function beatHint(q:BeatQuestion,zh:boolean){
  const before=q.notes.slice(q.bars[0],q.target),parts:string[]=[];let t=0,i=0;
  const range=(n:number)=>Array.from({length:n},(_,k)=>t+k+1);
  while(i<before.length){
    const n=before[i];
    if(n.v>=1){const beats=range(n.v);parts.push(zh?`${noteName(n.v,zh)}占 ${beats.join(' 和 ')}`:`the ${noteName(n.v,zh)} takes ${beats.join(' and ')}`);t+=n.v;i++;continue}
    // A run of eighths: pairs share a beat.
    let j=i,len=0;while(j<before.length&&before[j].v<1){len+=before[j].v;j++}
    const beats=range(Math.round(len)),many=j-i,word=zh?['','','两','三','四'][many]??String(many):['','','two','three','four'][many]??String(many);
    parts.push(zh?`${word}个八分音符共用 ${beats.join(' 和 ')}`:`the ${word} eighth notes ${beats.length===1?'share':'take'} ${beats.join(' and ')}`);
    t+=Math.round(len);i=j;
  }
  if(!parts.length)return zh?'它就在小节线后面，是新小节的第一拍。':'It comes right after the bar line, so it starts a new measure.';
  return zh?`从小节线数起：${parts.join('，')}，所以它从第 ${q.answer} 拍开始。`:`Count from the bar line: ${parts.join(', ')}, so this one starts on ${q.answer}.`;
}
// Top numbers quiz: one unusual time signature (7/4), then two measures to count, quarter note = one beat.
type TopQuestion={notes:RowNote[];answer:number;choices:number[];given?:boolean};
function makeTopQuestions():TopQuestion[]{
  const pool=[[.5,.5,1,1],[2,.5,.5,1],[.5,.5,1],[1,.5,.5,2],[1,1,.5,.5],[.5,.5,2]].map(m=>({notes:m.map(v=>({v})),answer:m.reduce((a,b)=>a+b,0),choices:[2,3,4]}));
  const first=pool[Math.floor(Math.random()*pool.length)],rest=pool.filter(q=>q.answer!==first.answer),second=rest[Math.floor(Math.random()*rest.length)];
  return [{notes:[{v:2},{v:1},{v:1},{v:2},{v:1}],answer:7,choices:[4,7,11],given:true},first,second];
}
// Bottom number question: 9/16, one measure of sixteenths beamed in threes.
const NINE_SIXTEEN:RowNote[]=Array.from({length:9},()=>({v:.25}));
// Count and clap: 4/4 and 3/4 with eighths, then 6/8, where the eighth gets the beat (slower, so each eighth is clappable).
type ClapRound=Rhythm&{bottom:number;unit:number;spq:number;beams:number[][]};
const clapRound=(values:number[],bars:number[],top:number,bottom:number,spq:number):ClapRound=>{const notes=values.map(v=>({v})),unit=bottom===8?.5:1;return {notes,bars,top,bottom,unit,spq,beams:beamGroups(notes,bottom===8?1.5:1)}};
const CLAP_ROUNDS:ClapRound[]=[clapRound([1,.5,.5,2,1,1,2],[4],4,4,.65),clapRound([2,1,.5,.5,1,1],[2],3,4,.65),clapRound([1,.5,.5,.5,.5,.5,.5,.5,1,.5],[5],6,8,1)];
// Beats and notes: the worked example, then two busy measures to mark yourself.
const STICK_DEMO:RowNote[]=[{v:2},{v:.25},{v:.25},{v:.25},{v:.25},{v:.5},{v:.5}];
const STICK_TRIES=[[1,.25,.25,.25,.25,2,.5,.5,2,1],[2,.5,.5,1,.25,.25,.25,.25,1,2],[.5,.5,.25,.25,.25,.25,2,1,2,.5,.5]].map(values=>{
  const notes=values.map(v=>({v}));let t=0;const bar=values.findIndex(v=>(t+=v)>=4-1e-6)+1;
  return {notes,bars:[bar],beams:beamGroups(notes)};
});
/** The notes that start inside one beat, cut to that beat, so a single beat can be played on its own. */
function beatSlice(notes:RowNote[],beat:number){
  const starts=onsets(notes),values:number[]=[];
  notes.forEach((n,i)=>{if(starts[i]>=beat-1e-6&&starts[i]<beat+1-1e-6)values.push(Math.min(n.v,beat+1-starts[i]))});
  return values;
}

export default function MeasuresLesson(){
  const phone=usePhoneNotation();
  const {lang}=useLanguage(),zh=lang==='zh',tr=(en:string,cn:string)=>zh?cn:en;
  const [step,setStep]=useState(0),[done,setDone]=useState(false);
  const audio=useRhythmAudio(),course=useCourseProgress(),id:StepId=FLOW[step];
  // Page 1: bars appear as the count returns to 1; then the time signature writes in.
  const [p1,setP1]=useState<'even'|'playing'|'barred'|'signed'>('even'),[p1Bars,setP1Bars]=useState<number[]>([]),[p1Measure,setP1Measure]=useState<number|null>(null);
  // Page 4: top number.
  // Page 4 has three parts: switch the top number, hear music in 3, then two questions.
  const [top,setTop]=useState(4),[triedTops,setTriedTops]=useState<number[]>([4]),[topPhase,setTopPhase]=useState<'switch'|'melody'|'quiz'>('switch'),[heardMelody,setHeardMelody]=useState(false),[topQ,setTopQ]=useState(0),[topPick,setTopPick]=useState<number|null>(null),[topQs,setTopQs]=useState<TopQuestion[]>(makeTopQuestions);
  // Page 5: bottom number.
  const [bottomMeter,setBottomMeter]=useState<'4/4'|'2/2'|'6/8'>('4/4'),[triedBottoms,setTriedBottoms]=useState<string[]>(['4/4']),[symbol,setSymbol]=useState(false),[bottomQuiz,setBottomQuiz]=useState(false),[bottomPick,setBottomPick]=useState<number|null>(null),[bottomQ,setBottomQ]=useState(0);
  // Page 2: listen with counts, then four "which beat?" questions.
  const [p2Heard,setP2Heard]=useState(false),[p2Quiz,setP2Quiz]=useState(false),[p2Qs,setP2Qs]=useState<BeatQuestion[]>([]),[p2Q,setP2Q]=useState(0),[p2Pick,setP2Pick]=useState<number|null>(null);
  // Page 3: Cookie marks the beats of one measure, one at a time; then you mark two measures with a pencil stroke.
  const [p3Phase,setP3Phase]=useState<'demo'|'try'>('demo'),[p3Demo,setP3Demo]=useState(0),[p3Try,setP3Try]=useState(0),[p3Sticks,setP3Sticks]=useState<number[]>([]),[p3Miss,setP3Miss]=useState<number|null>(null),[p3Tapped,setP3Tapped]=useState(false),[p3Stroke,setP3Stroke]=useState<{x:number;y:number}[]>([]),[p3Whole,setP3Whole]=useState(false),[p3Misses,setP3Misses]=useState(0),[p3Hint,setP3Hint]=useState<number|null>(null),[p3Revealed,setP3Revealed]=useState(false);
  const p3Start=useRef<{x:number;y:number}|null>(null);
  // Page 6: draw bar lines, three rounds.
  const [p6Rounds,setP6Rounds]=useState<Rhythm[]>([]),[p6Round,setP6Round]=useState(0),[p6Bars,setP6Bars]=useState<number[]>([]);
  // Page 7: count and clap, three rounds.
  const [p7Round,setP7Round]=useState(0),[p7Taps,setP7Taps]=useState<{time:number;at:number}[]>([]),[p7Result,setP7Result]=useState<boolean|null>(null),[p7Mode,setP7Mode]=useState<'listen'|'clap'|null>(null),[p7Waiting,setP7Waiting]=useState(false);
  const [flash,setFlash]=useState<'top'|'bottom'|null>(null);
  const flashTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(flashTimer.current)clearTimeout(flashTimer.current)},[]);
  const blink=(part:'top'|'bottom')=>{setFlash(part);if(flashTimer.current)clearTimeout(flashTimer.current);flashTimer.current=setTimeout(()=>setFlash(null),900)};

  const names=[tr('Measures','小节'),tr('Counting','数拍'),tr('Beats and notes','拍与音符'),tr('Other top numbers','其他上方数字'),tr('The bottom number','下方数字'),tr('Draw bar lines','画小节线'),tr('Read and play','看谱打节奏'),];
  function navigate(n:number){
    audio.stop();if(p1!=='signed'){setP1('even');setP1Bars([])}setStep(n);setFlash(null);
    // Exercises get fresh random material every time you arrive.
    const target=FLOW[n];
    if(target==='counting'){setP2Quiz(false);setP2Qs(makeBeatQuestions().slice(0,3));setP2Q(0);setP2Pick(null)}
    if(target==='beats'){setP3Phase('demo');setP3Demo(0);setP3Try(Math.floor(Math.random()*STICK_TRIES.length));setP3Sticks([]);setP3Miss(null);setP3Tapped(false);setP3Misses(0);setP3Hint(null);setP3Revealed(false)}
    if(target==='bars'){setP6Rounds([makeRhythm(4,3,'mixed'),makeRhythm(4,3,'eighths'),makeRhythm(3,4,'eighths')]);setP6Round(0);setP6Bars([])}
    if(target==='top'){setTopPhase('switch');setTopQs(makeTopQuestions());setTopQ(0);setTopPick(null)}
    if(target==='bottom'){setBottomQuiz(false);setBottomPick(null);setBottomQ(0)}
    if(target==='clap'){setP7Round(0);setP7Taps([]);setP7Result(null);setP7Mode(null);setP7Waiting(false)}
  }
  // Timers for page 1's bar lines and page 7's pause before the count-in.
  const timers=useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers=()=>{timers.current.forEach(clearTimeout);timers.current=[]};
  // Leaving the page (or the lesson) cancels anything still scheduled.
  useEffect(()=>()=>{timers.current.forEach(clearTimeout);timers.current=[]},[step]);
  // Page 1: each bar line drops in on the beat where the count returns to 1, then the time signature writes in.
  function addBarLines(){
    clearTimers();setP1('playing');setP1Bars([]);setP1Measure(null);
    void audio.counted({values:JINGLE.map(n=>n.v),pitches:JINGLE_MIDI});
    const starts=onsets(JINGLE),beat=650,lead=80,total=JINGLE.reduce((a,n)=>a+n.v,0);
    JINGLE_BARS.forEach(b=>timers.current.push(setTimeout(()=>setP1Bars(prev=>[...prev,b]),lead+starts[b]*beat)));
    timers.current.push(setTimeout(()=>setP1('barred'),lead+total*beat+150));
    timers.current.push(setTimeout(()=>{setP1('signed');blink('top')},lead+total*beat+650));
    timers.current.push(setTimeout(()=>blink('bottom'),lead+total*beat+1900));
  }

  let narration:ReactNode='',message:ReactNode='',scene:ReactNode=null,tools:ReactNode=null,extra:ReactNode=null,tone:'correct'|'wrong'|null=null,ready=false;
  // A page can set its own Next (question rounds); otherwise the default below applies.
  let pageNext:LessonNext|undefined;

  if(id==='measures'){
    const signed=p1==='signed';
    narration=signed?tr('These two numbers are the time signature. The top 4 means 4 beats in every measure, and the bottom 4 means each beat is a quarter note.','这两个数字叫拍号。上面的 4 表示每小节 4 拍，下面的 4 表示以四分音符为一拍。')
      :tr('A long row of notes is hard to follow, so music is split into measures: small groups of beats with a bar line after each.','一长串音符很难跟读，所以音乐被分成小节：一小组一小组的拍子，每组后面画一条小节线。');
    message=p1==='even'?tr('Press Add bar lines and count along.','点“添加小节线”，跟着一起数。')
      :p1==='playing'?tr('Count along: every time we get back to 1, a new measure starts.','跟着数：每次数回到 1，新的小节就开始了。')
      :tr('Every measure holds 4 beats. Tap a measure if you want to hear it again.','每个小节都有 4 拍。想再听，可以点任意小节。');
    ready=p1==='signed';tone=ready?'correct':null;
    const litNote=audio.active;
    scene=<>
      <EngravedRow notes={JINGLE} even={p1==='even'||p1==='playing'} bars={p1==='even'?[]:p1Bars} meter={signed?{top:4,bottom:4}:null} active={litNote}
        className={`measures-row ${flash?`is-flash-${flash}`:''}`} label={tr('Jingle Bells chorus','《铃儿响叮当》副歌')}>
        {layout=>signed&&[0,...JINGLE_BARS].map((start,m)=>{
          const play=()=>{setP1Measure(m);void audio.counted({values:JINGLE.slice(start,end).map(n=>n.v),pitches:JINGLE_MIDI.slice(start,end),offset:start})};
          const x0=m===0?layout.startX:layout.barXs[m-1],x1=m<layout.barXs.length?layout.barXs[m]:layout.endX-10,end=m<JINGLE_BARS.length?JINGLE_BARS[m]:JINGLE.length;
          return <rect key={m} x={x0} y={noteY(8)} width={x1-x0} height={noteY(0)-noteY(8)} className={`measure-hit ${p1Measure===m?'is-playing':''}`} role="button" tabIndex={0}
            aria-label={tr(`Play measure ${m+1}`,`播放第 ${m+1} 小节`)}
            onClick={play} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();play()}}}/>;
        })}
      </EngravedRow>
      <div className="beat-counter" aria-hidden="true">{[1,2,3,4].map((n,i)=><span key={n} className={audio.beat>=0&&audio.beat%4===i?'is-lit':''}>{n}</span>)}</div>
    </>;
    tools=p1==='even'&&<button className="measures-primary" onClick={addBarLines}>{tr('Add bar lines','添加小节线')}</button>;
  }

  else if(id==='top'){
    if(topPhase==='switch'){
      const notes=[...quarters(top),...quarters(top)];
      narration={2:tr('The top number is how many beats are in each measure. 2/4 has two beats, so you count 1 2.','上方数字是每小节有几拍。2/4 有两拍，所以数 1 2。'),
        3:tr('The top number is how many beats are in each measure. 3/4 has three beats, so you count 1 2 3.','上方数字是每小节有几拍。3/4 有三拍，所以数 1 2 3。'),
        4:tr('The top number is how many beats are in each measure. 4/4 has four beats, so you count 1 2 3 4.','上方数字是每小节有几拍。4/4 有四拍，所以数 1 2 3 4。')}[top];
      const both=triedTops.includes(2)&&triedTops.includes(3);
      message=both?tr('Same beat, grouped differently. Now let’s hear a melody in 3.','同样的拍子，分组不同。现在听一段三拍子的旋律。'):tr('Try the 2/4, 3/4 and 4/4 buttons below and count along.','点下面的 2/4、3/4 和 4/4，跟着一起数。');
      if(both)pageNext={label:tr('Hear a melody in 3 →','听一段三拍子的旋律 →'),ready:true,onClick:()=>{audio.stop();setTopPhase('melody')}};
      scene=<EngravedRow key={`top-${top}`} clef={false} meter={{top,bottom:4}} notes={notes} bars={[top]} className={flash?`is-flash-${flash}`:''}
        below={counts({notes,top,litBeat:audio.beat})} label={`${top}/4`}/>;
      tools=<div className="measures-choices" role="group" aria-label={tr('Top number','上方数字')}>{[2,3,4].map(n=><button key={n} aria-pressed={top===n} className={top===n?'is-picked':''}
        onClick={()=>{setTop(n);setTriedTops(t=>t.includes(n)?t:[...t,n]);blink('top');void audio.counted({values:quarters(n*2).map(x=>x.v),pitches:rhythmPitches(quarters(n*2)),top:n})}}>{n}/4</button>)}</div>;
    }else if(topPhase==='melody'){
      narration=tr('This melody is in 3/4. Count 1, 2, 3 in each measure, then start again at 1 after the bar line.','这段旋律是 3/4 拍。每小节数 1、2、3，过了小节线再从 1 开始。');
      message=heardMelody?tr('Could you hear the 1 2 3? Ready for three quick questions?','听出 1 2 3 了吗？来做三道小题？'):tr('Press Listen and count 1 2 3 along with it.','点“听一听”，跟着数 1 2 3。');
      if(heardMelody)pageNext={label:tr('Three quick questions →','三道小题 →'),ready:true,onClick:()=>{audio.stop();setTopPhase('quiz')}};
      scene=<EngravedRow key="triple-melody" notes={TRIPLE_MELODY} bars={TRIPLE_MELODY_BARS} meter={{top:3,bottom:4}} active={audio.active}
        below={counts({notes:TRIPLE_MELODY,top:3,litBeat:audio.beat})} label={tr('Two measures in 3/4','两个 3/4 拍小节')}/>;
      tools=<button className="measures-primary" onClick={()=>{setHeardMelody(true);void audio.counted({values:TRIPLE_MELODY.map(n=>n.v),pitches:TRIPLE_MELODY_MIDI,top:3})}}>{tr('Listen','听一听')}</button>;
    }else{
      const q=topQs[topQ],solved=topPick===q.answer,lastQ=topQ===topQs.length-1;
      narration=q.given?tr('The top number can be any number of beats, not just 2, 3 or 4. Some music uses 5/4 or 7/4.','上方数字可以是任何拍数，不只是 2、3、4。有的音乐用 5/4 或 7/4。')
        :tr('In these, the quarter note gets one beat, and two eighth notes share one. Count the beats in the measure: that count is the top number.','这里四分音符算一拍，两个八分音符共用一拍。数一数这个小节有几拍，那就是上方数字。');
      message=topPick===null?(q.given?tr('This piece is in 7/4. How many beats are in each measure?','这首曲子是 7/4 拍。每个小节有几拍？')
          :topQ===1?tr('How many beats are in this measure? Pick the top number.','这个小节有几拍？选出上方数字。'):tr('Last one: how many beats, so which top number?','最后一题：几拍？上方数字是几？'))
        :solved?(q.given?tr('Yes: the top 7 means 7 beats in each measure. You count 1 to 7.','对：上面的 7 表示每小节 7 拍，从 1 数到 7。'):tr(`Yes: ${q.answer} beats, so ${q.answer} on top.`,`对：${q.answer} 拍，所以上面是 ${q.answer}。`))
        :q.given?tr('The top number is the beat count itself: 7/4 has 7 beats in every measure.','上方数字本身就是拍数：7/4 每小节 7 拍。')
        :tr('Not quite. A half note is 2 beats, a quarter note 1, and two eighth notes together make 1.','还不对。二分音符 2 拍，四分音符 1 拍，两个八分音符合起来 1 拍。');
      tone=topPick===null?null:solved?'correct':'wrong';
      ready=solved&&lastQ;
      // The answers sit in Cookie's bubble, next to the question they answer. (No spoken count past 6: there are only six clips.)
      extra=<div className="measures-choices" role="group" aria-label={tr('Top number','上方数字')}>{q.choices.map(n=><button key={n} className={topPick===n?(n===q.answer?'is-correct':'is-wrong'):''}
        onClick={()=>{setTopPick(n);if(n===q.answer)void audio.counted({values:q.notes.map(x=>x.v),pitches:rhythmPitches(q.notes),top:n,speak:n<=6})}}>{n}</button>)}</div>;
      if(solved&&!lastQ)pageNext={label:tr('Next question →','下一题 →'),ready:true,onClick:()=>{audio.stop();setTopQ(n=>n+1);setTopPick(null)}};
      scene=<EngravedRow key={`q-${topQ}`} clef={false} meter={q.given||solved?{top:q.answer,bottom:4}:null} notes={q.notes} beams={beamGroups(q.notes)} className={solved&&!q.given?'is-flash-top':''}
        below={solved?counts({notes:q.notes,top:q.answer,litBeat:audio.beat,share:true}):undefined}/>;
    }
  }

  else if(id==='bottom'){
  if(bottomQuiz){
    // Two short questions on a time signature they haven't seen: the top number, then the bottom number of 9/16.
    const Q=[{ask:tr('This one is 9/16. How many beats are in each measure?','这个是 9/16。每个小节有几拍？'),choices:[{label:'9',right:true},{label:'16',right:false}],
        yes:tr('Yes, the top number: 9 beats.','对，看上方数字：9 拍。'),no:tr('The top number is the beat count.','上方数字才是拍数。')},
      {ask:tr('And which note gets one beat?','那么哪种音符算一拍？'),choices:[{label:tr('Quarter','四分音符'),right:false},{label:tr('Eighth','八分音符'),right:false},{label:tr('Sixteenth','十六分音符'),right:true}],
        yes:tr('Yes! A 16 on the bottom means the sixteenth note gets one beat, so these 9 sixteenths fill the measure.','对！下方是 16，表示十六分音符算一拍，所以这 9 个十六分音符正好填满一个小节。'),
        no:tr('The bottom number names the note: 4 is the quarter note, 8 the eighth note, so 16 is…','下方数字表示音符：4 是四分音符，8 是八分音符，那 16 就是……')}][bottomQ];
    const picked=bottomPick===null?null:Q.choices[bottomPick],solved=!!picked?.right,lastQ=bottomQ===1;
    narration=tr('Now a time signature you haven’t seen. Read the top number, then the bottom number.','来看一个你没见过的拍号。先读上方数字，再读下方数字。');
    message=picked===null?Q.ask:solved?Q.yes:Q.no;
    tone=picked===null?null:solved?'correct':'wrong';
    ready=solved&&lastQ;
    if(solved&&!lastQ)pageNext={label:tr('Next question →','下一题 →'),ready:true,onClick:()=>{audio.stop();setBottomQ(1);setBottomPick(null)}};
    extra=<div className="measures-choices" role="group" aria-label="9/16">{Q.choices.map((c,k)=><button key={k} className={bottomPick===k?(c.right?'is-correct':'is-wrong'):''}
      onClick={()=>{setBottomPick(k);if(c.right)blink(lastQ?'bottom':'top');if(c.right&&lastQ)void audio.counted({values:NINE_SIXTEEN.map(n=>n.v),pitches:rhythmPitches(NINE_SIXTEEN),top:9,beatUnit:.25,secondsPerQuarter:1.6,speak:false})}}>{c.label}</button>)}</div>;
    scene=<EngravedRow key="nine-sixteen" clef={false} meter={{top:9,bottom:16}} notes={NINE_SIXTEEN} beams={beamGroups(NINE_SIXTEEN,.75)} active={audio.active}
      className={flash?`is-flash-${flash}`:''} below={solved&&lastQ?counts({notes:NINE_SIXTEEN,beatUnit:.25,top:9,litBeat:audio.beat}):undefined} label="9/16"/>;
  }else{
      // Each example is one measure of the note that gets the beat, so the bottom number is easy to see.
      const EXAMPLES={'4/4':{m:{top:4,bottom:4},unit:1,notes:quarters(4)},'2/2':{m:{top:2,bottom:2},unit:2,notes:[{v:2},{v:2}] as RowNote[]},'6/8':{m:{top:6,bottom:8},unit:.5,notes:Array.from({length:6},()=>({v:.5})) as RowNote[]}};
      const {m,unit,notes}=EXAMPLES[bottomMeter];
      narration=bottomMeter==='2/2'?tr('In 2/2 the bottom 2 means the half note gets one beat, so a measure holds two half notes: 1 2.','2/2 下面的 2 表示二分音符算一拍，所以每小节是两个二分音符：1 2。')
        :bottomMeter==='6/8'?tr('In 6/8 the eighth note gets one beat, six in a measure. 6/8 is often felt as two big beats; its own lesson in Extras covers that.','6/8 以八分音符为一拍，每小节六拍。6/8 常常感觉像两个大拍，额外课程里会讲。')
        :tr('The bottom number says which note gets one beat. A 4 means the quarter note, which is what you will see most.','下方数字说明哪种音符算一拍。4 表示四分音符，这是最常见的。');
      const both=triedBottoms.includes('2/2')&&triedBottoms.includes('6/8');
      const hasSymbol=bottomMeter!=='6/8',shownSymbol=hasSymbol&&symbol;
      const sig:Meter=shownSymbol?{...m,symbol:bottomMeter==='4/4'?'common':'cut'}:m;
      // Cookie guides the one hidden interaction (the time signature can be tapped), then moves on.
      message=bottomMeter==='4/4'?(shownSymbol?tr('Right! 4/4 is also written C, common time. Tap it again to switch back, or try 2/2 and 6/8.','对！4/4 也写作 C，叫四四拍的简写。再点一下可以换回来，或者试试 2/2 和 6/8。')
          :tr('Tap the 4/4 at the start of the staff to see another way it’s written.','点五线谱开头的 4/4，看看它的另一种写法。'))
        :bottomMeter==='2/2'?(shownSymbol?tr('That’s cut time: 2/2 is also written ¢.','这是二二拍的简写：2/2 也写作 ¢。')+(both?'':tr(' Now try 6/8.',' 再试试 6/8。'))
          :tr('2/2 has its own symbol too. Tap the time signature.','2/2 也有自己的符号。点一下拍号。'))
        :both?tr('The bottom number picks the note that gets one beat.','下方数字决定哪种音符算一拍。'):tr('Now try 2/2.','再试试 2/2。');
      tone=shownSymbol?'correct':null;
      if(both)pageNext={label:tr('One question →','一道小题 →'),ready:true,onClick:()=>{audio.stop();setBottomQuiz(true)}};
      const swap=hasSymbol?()=>{setSymbol(v=>!v);blink('top')}:undefined;
      scene=<EngravedRow key={`bottom-${bottomMeter}`} clef={false} meter={sig} notes={notes} beams={bottomMeter==='6/8'?[[0,1,2],[3,4,5]]:[]} className={flash?`is-flash-${flash}`:''}
        below={counts({notes,beatUnit:unit,top:m.top,litBeat:audio.beat})} label={bottomMeter}>
        {layout=>swap&&<rect x={layout.meterX-8} y={noteY(8)-6} width="50" height={noteY(0)-noteY(8)+12} className="sig-hit" role="button" tabIndex={0}
          aria-label={tr('Show the other way this time signature is written','显示这个拍号的另一种写法')} onClick={swap} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();swap()}}}/>}
      </EngravedRow>;
      tools=<div className="measures-choices" role="group" aria-label={tr('Time signature','拍号')}>{(['4/4','2/2','6/8'] as const).map(k=><button key={k} aria-pressed={bottomMeter===k} className={bottomMeter===k?'is-picked':''}
        onClick={()=>{setBottomMeter(k);setSymbol(false);setTriedBottoms(t=>t.includes(k)?t:[...t,k]);blink('bottom');
          const e=EXAMPLES[k];void audio.counted({values:e.notes.map(n=>n.v),pitches:rhythmPitches(e.notes),top:e.m.top,beatUnit:e.unit})}}>{k}</button>)}</div>;
    }
  }

  else if(id==='counting'){
    if(!p2Quiz){
      const playing=audio.beat>=0;
      narration=tr('Count the beats in every measure, and start again at 1 after each bar line. A quarter note gets one count, a half note two, and two eighth notes share one count.','每个小节都要数拍，过了小节线就从 1 重新数。四分音符一个数，二分音符两个数，两个八分音符共用一个数。');
      message=!p2Heard?tr('Press Play and count along out loud. Listen for the quick notes in measure 3.','点“播放”，跟着大声数。注意第 3 小节里的快音。')
        :tr('Hear it? In measure 3, two eighth notes go by on each count. Ready for three quick questions?','听出来了吗？第 3 小节里，每数一下就走过两个八分音符。来做三道小题？');
      if(p2Heard)pageNext={label:tr('Try 3 questions →','做三道题 →'),ready:true,onClick:()=>{audio.stop();setP2Quiz(true)}};
      // Counts write themselves in as the music reaches them; after that they stay.
      scene=<EngravedRow key="p2-jacques" notes={JACQUES} bars={JACQUES_BARS} meter={{top:4,bottom:4}} beams={[[7,8],[9,10]]} active={audio.active}
        below={p2Heard?counts({notes:JACQUES,top:4,litBeat:audio.beat,share:true,show:(_,b)=>!playing||b<=audio.beat}):undefined} label={tr('Frère Jacques','《两只老虎》')}/>;
      tools=<button className="measures-primary" onClick={()=>{setP2Heard(true);void audio.counted({values:JACQUES.map(n=>n.v),pitches:JACQUES_MIDI})}}>{tr('Play','播放')}</button>;
    }else{
      const q=p2Qs[p2Q],solved=p2Pick===q.answer,last=p2Q===p2Qs.length-1;
      narration=tr('To find which beat a note starts on, go back to the bar line and count the lengths before it.','要找音符从第几拍开始，就回到小节线，把前面的时值数一数。');
      message=p2Pick===null?[tr('Which beat does the circled note start on?','圈出的音符从第几拍开始？'),tr('Next one: which beat does this circled note start on?','下一题：这个圈出的音符从第几拍开始？'),tr('Last one: which beat does it start on?','最后一题：它从第几拍开始？')][p2Q]
        :solved?tr(`Yes, beat ${q.answer}!`,`对，第 ${q.answer} 拍！`):beatHint(q,zh);
      tone=p2Pick===null?null:solved?'correct':'wrong';
      ready=solved&&last;
      extra=<div className="measures-choices" role="group" aria-label={tr('Beat','拍')}>{[1,2,3,4].map(n=><button key={n} className={p2Pick===n?(n===q.answer?'is-correct':'is-wrong'):''}
        onClick={()=>{setP2Pick(n);if(n===q.answer){const b=q.bars[0];void audio.counted({values:q.notes.slice(b).map(x=>x.v),pitches:rhythmPitches(q.notes.slice(b)),offset:b})}}}>{n}</button>)}</div>;
      if(solved&&!last)pageNext={label:tr('Next question →','下一题 →'),ready:true,onClick:()=>{audio.stop();setP2Q(k=>k+1);setP2Pick(null)}};
      const start=q.bars[0],starts=onsets(q.notes);
      scene=<EngravedRow key={`p2-q${p2Q}`} clef={false} notes={q.notes} bars={q.bars} meter={{top:4,bottom:4}} beams={beamGroups(q.notes)} active={audio.active}
        below={p2Pick!==null?counts({notes:q.notes,top:4,share:true,litBeat:audio.beat>=0?audio.beat+starts[start]:-1,show:i=>i>=start&&(solved||i<q.target)}):undefined}>
        {layout=><circle cx={layout.xs[q.target]} cy={noteY(1)} r="24" className="measure-circle"/>}
      </EngravedRow>;
    }
  }

  else if(id==='beats'){
    narration=tr('Beats and notes are different things. To see where the beats fall, draw a line where each beat starts. A long note can hold several beats, and several short notes can share one.','拍子和音符不是一回事。要看清拍子在哪里，就在每一拍开始的地方画一条线。一个长音可以占好几拍，几个短音也可以共用一拍。');
    const stick=(b:number,x:number)=><line key={b} x1={x} x2={x} y1={58} y2={noteY(8)-4} className="beat-stick"/>;
    if(p3Phase==='demo'){
      const beams=[[1,2,3,4],[5,6]],marked=p3Demo;
      message=[tr('Watch how I find the beats. I’ll draw a line where each one starts.','看我怎么找拍子：每一拍开始的地方，我画一条线。'),
        tr('Beat 1 is where the half note starts.','第 1 拍就是二分音符开始的地方。'),
        tr('Beat 2 has no new note. The half note is still sounding, so the line goes in the middle of it.','第 2 拍没有新音符。二分音符还在响，所以线画在它的中间。'),
        tr('Beat 3: four sixteenth notes squeeze into this one beat.','第 3 拍：四个十六分音符挤在这一拍里。'),
        tr('Beat 4: two eighth notes share it. Four beats, four lines. Now you try!','第 4 拍：两个八分音符共用它。四拍，四条线。现在轮到你了！')][marked];
      const mark=()=>{const b=p3Demo,values=beatSlice(STICK_DEMO,b);setP3Demo(b+1);setP3Whole(false);
        void audio.counted({values:values.length?values:[1],notes:values.length>0,pitches:values.map(()=>RHYTHM_MIDI),top:4,countOffset:b})};
      pageNext=marked<4?{label:marked===0?tr('Show me →','演示给我看 →'):tr(`Mark beat ${marked+1} →`,`标出第 ${marked+1} 拍 →`),ready:true,onClick:mark}
        :{label:tr('Your turn →','轮到你 →'),ready:true,onClick:()=>{audio.stop();setP3Phase('try');setP3Sticks([])}};
      scene=<EngravedRow key="p3-demo" clef={false} notes={STICK_DEMO} beams={beams} meter={{top:4,bottom:4}} viewBox="20 40 870 244"
        below={counts({notes:STICK_DEMO,top:4,litBeat:audio.beat<0?-1:p3Whole?audio.beat:marked-1,share:true,show:(_,b)=>b<marked})} label={tr('Marking the beats','标出拍子')}>
        {layout=><>{Array.from({length:marked},(_,b)=>stick(b,layout.beatX(b)))}</>}
      </EngravedRow>;
      tools=marked===4&&<button className="measures-secondary" onClick={()=>{setP3Whole(true);void audio.counted({values:STICK_DEMO.map(n=>n.v),pitches:rhythmPitches(STICK_DEMO),top:4})}}>{tr('Play','播放')}</button>;
    }else{
      const r=STICK_TRIES[p3Try],total=8,done=p3Sticks.length===total,starts=onsets(r.notes);
      // The same layout the row draws with, so misses and hints can talk about the note they're near.
      const layout=layoutRow(r.notes,{bars:r.bars,clef:false,meter:{top:4,bottom:4},right:phone?phoneRowRight(r.notes,false,{top:4,bottom:4}):860}),beatXs=[...Array(total).keys()].map(b=>layout.beatX(b));
      const onsetAt=(b:number)=>starts.findIndex(t=>Math.abs(t-b)<1e-6);
      const holder=(b:number)=>{let k=0;starts.forEach((t,i)=>{if(t<b)k=i});return r.notes[k]};
      /** Why beat b is where it is: on a note, or inside a long one. */
      const explain=(b:number)=>{const n=onsetAt(b),name=noteName((n>=0?r.notes[n]:holder(b)).v,zh)??(zh?'十六分音符':'sixteenth note'),label=b%4+1;
        const first=n>=0&&r.notes[n].v<1;
        return n>=0?tr(`Beat ${label} of measure ${Math.floor(b/4)+1} starts with the ${first?'first ':''}${name}.`,`第 ${Math.floor(b/4)+1} 小节的第 ${label} 拍从${first?'第一个':''}${name}开始。`)
          :tr(`Beat ${label} of measure ${Math.floor(b/4)+1} is inside the ${name}, halfway to the next note. No new note starts there, but the beat still does.`,`第 ${Math.floor(b/4)+1} 小节的第 ${label} 拍在${name}里面，大约在它和下一个音符的中间。那里没有新音符，但拍子照样走。`)};
      const heldMissing=[...Array(total).keys()].some(b=>!p3Sticks.includes(b)&&onsetAt(b)<0);
      // A miss: say what's there. Nearest a held beat, or on a note that starts between beats.
      const missNote=()=>{
        if(p3Miss===null)return '';
        let near=0;beatXs.forEach((x,b)=>{if(Math.abs(x-p3Miss)<Math.abs(beatXs[near]-p3Miss))near=b});
        const offNote=layout.xs.findIndex((x,i)=>Math.abs(x-p3Miss)<14&&Math.abs(starts[i]-Math.round(starts[i]))>1e-6);
        if(offNote>=0)return tr('That note starts between beats: it shares its beat with the note before it.','这个音符从两拍之间开始：它和前一个音符共用一拍。');
        if(onsetAt(near)<0&&!p3Sticks.includes(near))return tr('Close! ','差一点！')+explain(near);
        return tr('That line isn’t on a beat. A beat starts on a note, or partway through a long note.','这条线不在拍子上。拍子从某个音符开始，或者落在长音的中间。');
      };
      message=done&&p3Revealed?tr('Here are all 8 beats. Notice the ones inside long notes, then press Play to hear them counted.','这就是全部 8 拍。留意长音里面的那几拍，然后点“播放”听它们被数出来。')
        :done?tr('All 8 beats! Beats keep going, whatever the notes are doing. Press Play to hear them counted.','8 拍都找到了！不管音符怎么变，拍子一直向前。点“播放”听它们被数出来。')
        :p3Miss!==null?missNote()
        :p3Hint!==null?explain(p3Hint)+tr(' Draw a line on the dashed mark.',' 在虚线的位置画一条线。')
        :p3Sticks.length===0?(p3Tapped?tr('Draw it like a pencil mark: a short line down, above the note where a beat starts.','像用铅笔一样画：在拍子开始的音符上方，往下画一小条线。')
          :tr('Your turn: two measures, 8 beats. Draw a short line above the staff wherever a beat starts.','轮到你了：两个小节，8 拍。在五线谱上方、每拍开始的地方画一小条线。'))
        :p3Sticks.length>=4&&heldMissing?tr('Don’t forget the beats inside long notes.','别忘了长音里面的拍子。')
        :tr(`${p3Sticks.length} ${p3Sticks.length===1?'beat':'beats'} marked, ${total-p3Sticks.length} to go.`,`已标出 ${p3Sticks.length} 拍，还有 ${total-p3Sticks.length} 拍。`);
      tone=done?'correct':p3Miss!==null?'wrong':null;
      ready=done;
      const placeAt=(b:number)=>{if(p3Sticks.includes(b))return;setP3Sticks(t=>[...t,b].sort((x,y)=>x-y));setP3Miss(null);if(p3Hint===b)setP3Hint(null);
        const values=beatSlice(r.notes,b);void audio.counted({values:values.length?values:[1],notes:values.length>0,pitches:values.map(()=>RHYTHM_MIDI),top:4,countOffset:b%4})};
      scene=<EngravedRow key={`p3-try-${p3Try}`} clef={false} notes={r.notes} bars={r.bars} beams={r.beams} meter={{top:4,bottom:4}} viewBox="20 40 870 244"
        below={done?counts({notes:r.notes,top:4,litBeat:audio.beat,share:true}):undefined} label={tr('Mark each beat','标出每一拍')}>
        {()=>{
          const local=(e:React.PointerEvent<SVGRectElement>)=>new DOMPoint(e.clientX,e.clientY).matrixTransform(e.currentTarget.ownerSVGElement!.getScreenCTM()!.inverse());
          const up=(e:React.PointerEvent<SVGRectElement>)=>{
            const s=p3Start.current;p3Start.current=null;setP3Stroke([]);if(!s)return;
            const p=local(e);
            // A tap isn't a mark; Cookie explains the stroke instead.
            if(Math.abs(p.y-s.y)<16){setP3Tapped(true);return}
            const x=(s.x+p.x)/2;let best=0;beatXs.forEach((bx,b)=>{if(Math.abs(bx-x)<Math.abs(beatXs[best]-x))best=b});
            // Close enough if it's under halfway to the neighbouring beat on that side (the ends allow a note's width).
            const side=x<beatXs[best]?beatXs[best-1]:beatXs[best+1],room=side===undefined?40:Math.abs(side-beatXs[best])*.45;
            if(Math.abs(beatXs[best]-x)<room)placeAt(best);else{setP3Miss(x);setP3Misses(k=>k+1)}
          };
          return <>
            {!done&&<rect x={layout.startX-6} y={40} width={layout.endX-layout.startX} height={noteY(0)-40+10} className="barline-drawing__pad"
              onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);const p=local(e);p3Start.current={x:p.x,y:p.y};setP3Stroke([{x:p.x,y:p.y}])}}
              onPointerMove={e=>{if(!p3Start.current)return;const p=local(e);setP3Stroke(t=>[...t,{x:p.x,y:p.y}])}}
              onPointerUp={up} onPointerCancel={()=>{p3Start.current=null;setP3Stroke([])}}/>}
            {p3Sticks.map(b=>stick(b,beatXs[b]))}
            {p3Miss!==null&&<line x1={p3Miss} x2={p3Miss} y1={58} y2={noteY(8)-4} className="beat-stick is-miss"/>}
            {p3Hint!==null&&<line x1={beatXs[p3Hint]} x2={beatXs[p3Hint]} y1={58} y2={noteY(8)-4} className="beat-hint"/>}
            {p3Stroke.length>1&&<polyline points={p3Stroke.map(p=>`${p.x},${p.y}`).join(' ')} className="barline-drawing__pencil"/>}
            {!done&&beatXs.map((bx,b)=>!p3Sticks.includes(b)&&<rect key={b} x={bx-10} y={50} width="20" height="50" className="stick-key" tabIndex={0} role="button"
              aria-label={tr(`Mark beat ${b%4+1} of measure ${Math.floor(b/4)+1}`,`标出第 ${Math.floor(b/4)+1} 小节第 ${b%4+1} 拍`)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();placeAt(b)}}}/>)}
          </>;
        }}
      </EngravedRow>;
      const hint=()=>{const b=[...Array(total).keys()].find(k=>!p3Sticks.includes(k));if(b!==undefined){setP3Hint(b);setP3Miss(null)}};
      const reveal=()=>{setP3Revealed(true);setP3Sticks([...Array(total).keys()]);setP3Hint(null);setP3Miss(null);void audio.counted({values:r.notes.map(n=>n.v),pitches:rhythmPitches(r.notes),top:4})};
      tools=done?<button className="measures-secondary" onClick={()=>void audio.counted({values:r.notes.map(n=>n.v),pitches:rhythmPitches(r.notes),top:4})}>{tr('Play','播放')}</button>
        :<>
          <button className="measures-secondary" onClick={hint}>{tr('Hint','提示')}</button>
          {(p3Misses>=2||p3Hint!==null)&&<button className="measures-secondary" onClick={reveal}>{tr('Show answer','显示答案')}</button>}
        </>;
    }
  }

  else if(id==='bars'){
    const r=p6Rounds[p6Round];
    if(r){
      const {totals}=measureTotals(r.notes,p6Bars),placed=[...p6Bars].sort((a,b)=>a-b);
      const right=placed.join()===r.bars.join(),over=totals.slice(0,-1).findIndex(t=>t>r.top),short=totals.slice(0,-1).findIndex(t=>t<r.top);
      narration=tr('Now you draw them. Count the beats, and draw a bar line down the staff wherever a measure is full.','现在由你来画。数一数拍子，每当一个小节满了，就在五线谱上从上往下画一条小节线。');
      const erase=tr(' Tap a bar line to erase it.',' 点小节线可以擦掉它。');
      const intro=[tr('Draw a line down the staff wherever a measure is full. Start with this one in 4/4.','小节满了，就在五线谱上往下画一条线。先从这个 4/4 的开始。'),
        tr('Now one with eighth notes. Remember, two of them make one beat.','现在来一个有八分音符的。记住，两个八分音符是一拍。'),
        tr('Last one, in 3/4: three beats in each measure.','最后一个是 3/4：每小节三拍。')][p6Round];
      message=right?tr(`Every measure holds exactly ${r.top}!`,`每个小节都正好 ${r.top} 拍！`)
        :over>=0?tr(`That measure has ${totals[over]} beats, but ${r.top}/4 holds ${r.top}.`,`那个小节有 ${totals[over]} 拍，${r.top}/4 只能放 ${r.top} 拍。`)+erase
        :short>=0?tr(`That one only has ${totals[short]} beats. Keep counting.`,`那个小节只有 ${totals[short]} 拍，继续数。`)+erase
        :intro;
      tone=right?'correct':over>=0||short>=0?'wrong':null;
      ready=right&&p6Round===2;
      if(right&&p6Round<2)pageNext={label:tr('Next rhythm →','下一个节奏 →'),ready:true,onClick:()=>{audio.stop();setP6Round(k=>k+1);setP6Bars([])}};
      scene=<BarLineDrawing key={`p6-${p6Round}`} notes={r.notes} meter={{top:r.top,bottom:4}} bars={p6Bars} locked={right} zh={zh}
        onToggle={b=>setP6Bars(t=>t.includes(b)?t.filter(x=>x!==b):[...t,b])}/>;
      tools=<button className="measures-secondary" onClick={()=>void audio.counted({values:r.notes.map(n=>n.v),pitches:rhythmPitches(r.notes),top:r.top})}>{tr('Listen','听一听')}</button>;
    }
  }

  else if(id==='clap'){
    const r=CLAP_ROUNDS[p7Round],values=r.notes.map(n=>n.v),lastRound=p7Round===CLAP_ROUNDS.length-1;
    // The count-in is one whole measure: r.top beats of r.unit each.
    // `elapsed` is 0 or more from the moment the count is scheduled (beat stays -1 for its first few ms).
    const running=p7Mode==='clap'&&!p7Waiting&&audio.elapsed>=0,countIn=running&&audio.beat<r.top,tapping=running&&audio.beat>=r.top;
    // The count finished but not every note was tapped.
    const ranOut=p7Mode==='clap'&&!p7Waiting&&audio.elapsed<0&&p7Result===null;
    const countWords=zh?['一','二','三','四','五','六']:['One','two','three','four','five','six'];
    narration=tr('Here’s why we count: it lets you play a rhythm you’ve never heard, straight from the page.','这就是数拍的用处：没听过的节奏，你也能直接照着谱子准时演奏出来。');
    const intro=[tr('In lesson 2 you copied rhythms you heard. This time nobody plays it first: read it. Press Start and I’ll give you 4 counts to get ready, then tap the cookie on each note.','第 2 课里你是听了再模仿。这次没人先弹给你听：自己读。点“开始”，我先数 4 下让你准备，然后每个音符点一下饼干。'),
      tr('This one is in 3/4, so you get 3 counts to get ready. Watch the eighth notes: two taps in one beat.','这个是 3/4，所以准备时我数 3 下。注意八分音符：一拍里点两下。'),
      tr('Now 6/8. The bottom 8 means the eighth note gets the beat, so you get 6 counts to get ready, and each count is one eighth note.','现在是 6/8。下面的 8 表示八分音符算一拍，所以准备时我数 6 下，每数一下就是一个八分音符。')][p7Round];
    message=p7Result===true?(lastRound?tr('Right in time, even in 6/8! That’s reading rhythm: count, then play.','连 6/8 都很准！这就是读节奏：先数，再演奏。'):tr('Right in time! Here’s the next one.','很准！来看下一个。'))
      :p7Result===false?tr('Close! The orange marks were early or late. Press Listen to hear how it goes, then Start again.','差一点！橙色的点早了或晚了。点“听一听”听听它是什么样，再点“开始”。')
      :p7Waiting?tr(`Here come ${r.top} counts to get ready…`,`准备好，我要数 ${r.top} 下了……`)
      :countIn?tr(`Get ready: ${countWords.slice(0,Math.max(1,audio.beat+1)).join(' ')}…`,`准备：${countWords.slice(0,Math.max(1,audio.beat+1)).join(' ')}……`)
      :tapping?tr('Now tap the cookie on each note!','现在，每个音符点一下饼干！')
      :ranOut?tr('The rhythm ended before every note got a tap. Press Start to try again.','节奏结束了，还有音符没点到。点“开始”再试一次。'):intro;
    tone=p7Result===true?'correct':p7Result===false?'wrong':null;
    // The last rhythm ends the lesson: there's no separate review page.
    if(p7Result===true&&lastRound)pageNext=done?{label:tr('Back to theory lessons','回到乐理课'),ready:true,href:'/flute-studio/theory'}
      :{label:tr('Finish lesson','完成课程'),ready:true,onClick:()=>{course.finish('measures');setDone(true)}};
    if(p7Result===true&&!lastRound)pageNext={label:tr('Next rhythm →','下一个节奏 →'),ready:true,onClick:()=>{audio.stop();setP7Round(k=>k+1);setP7Taps([]);setP7Result(null);setP7Mode(null)}};
    // While tapping, the counts under the notes run a measure behind the count-in.
    const litBeat=p7Mode==='clap'?audio.beat-r.top:audio.beat;
    // The red note follows the clock (where you should be), not your taps. The count-in is the first r.top events.
    const clockNote=audio.active>=r.top?audio.active-r.top:-1,starts=onsets(r.notes);
    // Each tap leaves a mark where it landed in time. Once all are in, each is green if it was close to its note, orange if early or late.
    // One rule for the marks and for passing: every tap within this many quarter notes of its own note (at least 150 ms).
    const closeEnough=Math.max(.22,.15/r.spq),onTime=(t:{at:number},i:number)=>i<starts.length&&Math.abs(t.at-starts[i])<=closeEnough;
    scene=<EngravedRow key={`p7-${p7Round}`} clef={false} notes={r.notes} bars={r.bars} beams={r.beams} meter={{top:r.top,bottom:r.bottom}}
      active={p7Mode==='clap'?clockNote:audio.active} below={counts({notes:r.notes,beatUnit:r.unit,top:r.top,litBeat})} label={tr('Rhythm to tap','要点的节奏')}>
      {layout=><>{p7Taps.map((t,i)=>{
        const judged=p7Taps.length===values.length,on=onTime(t,i);
        const total=starts[starts.length-1]+values[values.length-1],x=layout.beatX(Math.max(0,Math.min(total,t.at)))-(t.at<0?16:0);
        return <circle key={i} cx={x} cy={noteY(8)-22} r="7" className={`tap-mark ${judged?(on?'is-on':'is-off'):''}`}/>;
      })}</>}
    </EngravedRow>;
    const tap=(time:number)=>{
      // Only while the count runs: read the audio clock at the tap itself.
      const heard=audio.position();
      if(p7Mode!=='clap'||p7Waiting||p7Result!==null||heard<0)return;void audio.clap();
      // Where in the rhythm (in quarter notes) this tap landed, after the count-in. Taps during the count-in land before 0: early.
      const at=heard/r.spq-r.top*r.unit;
      const taps=[...p7Taps,{time,at}];setP7Taps(taps);
      if(taps.length===values.length)setP7Result(taps.every(onTime));
    };
    const play={top:r.top,beatUnit:r.unit,secondsPerQuarter:r.spq};
    tools=<>
      {p7Result!==null&&<button className="measures-secondary" onClick={()=>{setP7Mode('listen');setP7Result(null);setP7Taps([]);void audio.counted({values,pitches:rhythmPitches(r.notes),...play})}}>{tr('Listen','听一听')}</button>}
      <button className="measures-primary" disabled={p7Waiting} onClick={()=>{
        // A short breath before the count-in, while Cookie says it's coming.
        audio.stop();setP7Mode('clap');setP7Result(null);setP7Taps([]);setP7Waiting(true);
        // "Waiting" ends only once the count is actually scheduled, so no other message flashes in between.
        timers.current.push(setTimeout(()=>{void audio.counted({values:[...Array(r.top).fill(r.unit),...values],notes:false,...play}).finally(()=>setP7Waiting(false))},1200))}}>{tr('Start','开始')}</button>
      <CookieButton aria-label={tr('Tap on each note','每个音符点一下')} disabled={p7Mode!=='clap'} onPointerDown={e=>{e.preventDefault();tap(e.timeStamp)}}
        onKeyDown={e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();tap(e.timeStamp)}}}/>
    </>;
  }

  const last=step===FLOW.length-1;
  // On the last page, Skip leaves the lesson unfinished and goes back to the lesson list.
  const next:LessonNext=pageNext??(last?{label:tr('Back to theory lessons','回到乐理课'),ready:false,onClick:()=>window.location.assign('/flute-studio/theory')}
    :{label:tr(`Next: ${names[step+1]} →`,`下一步：${names[step+1]} →`),ready,onClick:()=>navigate(step+1)});

  return <LessonFrame className="measures-lesson" title={tr('Measures and time signatures','小节与拍号')} zh={zh} steps={names} current={step} onJump={navigate}
    heading={names[step]} narration={narration} message={message} tone={tone} next={next} extra={extra}
    status={audio.error?tr('Sound could not start. Tap again to retry.','声音未能启动，请再试一次。'):''}>
    <div className="measures-scene">{scene}</div>
    <div className="lesson-tools measures-tools">{tools}</div>
  </LessonFrame>;
}
