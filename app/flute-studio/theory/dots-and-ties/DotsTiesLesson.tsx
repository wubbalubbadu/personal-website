'use client';
import {useCallback,useState,type ReactNode,type KeyboardEvent} from 'react';
import {useRouter} from 'next/navigation';
import {useLanguage} from '../../i18n/LanguageContext';
import LessonFrame,{type LessonNext} from '../LessonFrame';
import EngravedRow,{type RowNote,type RowLayout} from '../EngravedRow';
import {useRhythmAudio} from '../rhythm/useRhythmAudio';
import {usePhoneNotation} from '../usePhoneNotation';
import {useCourseProgress} from '../useCourseProgress';
import RhythmNote from '../rhythm/RhythmNote';
import type {NoteValue} from '../rhythm/rhythmModel';
import RhythmPractice from './RhythmPractice';
import {ACROSS,ACROSS_APART,compileRhythm,DOTTED_HALF,DOTTED_QUARTER,DOTTED_EIGHTH,DRILLS,HALF_QUARTERS,HALF_TIED,QUARTER_EIGHTHS,TIED_QUARTER,type RhythmPattern} from './rhythmSequence';
import '../theory.css';
import '../measures/measures.css';
import './dots-and-ties.css';

// One frame for every step, so the staff never moves. Notes are spaced in proportion to time, so each sits on its count.
// Under the staff: counts, ticks only when a step is about parts of a beat, and one bracket for the note being taught.
const FRAME='20 64 830 300',COUNT_Y=248,LINE_Y=262,BRACKET_Y=286,NOTE_Y=188,SPEED=.7;
// Sums never break across lines ("2 + 1" then "= 3" on the next).
const keepSums=(text:string)=>text.replace(/(\S) ([+=]) (?=\S)/g,'$1\u00a0$2\u00a0');
const keyAct=(e:KeyboardEvent,fn:()=>void)=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat){e.preventDefault();fn()}};
type Choice={id:string;label:string;right?:boolean};
type Bracket={from:number;to:number;label?:string;done?:boolean};

export default function DotsTiesLesson(){
  const {lang}=useLanguage(),zh=lang==='zh',tr=(en:string,cn:string)=>zh?cn:en;
  const router=useRouter();
  const audio=useRhythmAudio(),course=useCourseProgress(),phone=usePhoneNotation();
  const RIGHT=phone?520:820;
  const [step,setStep]=useState(0),[stage,setStage]=useState(0),[picked,setPicked]=useState<string|null>(null),[tied,setTied]=useState(true);
  // What is playing, for lighting counts and half-beat ticks: the time it started at and the pulse length (1 or 0.5 beat).
  const [playing,setPlaying]=useState<{from:number;unit:number}|null>(null),[feedback,setFeedback]=useState(''),[practiceTone,setPracticeTone]=useState<'correct'|'wrong'|null>(null);
  const [round,setRound]=useState(0),[attempts,setAttempts]=useState<number[]>([]);
  const [spot,setSpot]=useState<HTMLElement|null>(null),[pulse,setPulse]=useState(0);
  const tapped=useCallback(()=>setPulse(p=>p+1),[]);
  const names=[tr('Tie two notes','用延音线连起来'),tr('The dot','附点'),tr('One and a half beats','一拍半'),tr('Across the bar line','跨过小节线'),tr('Rhythm practice','节奏练习')];
  function reset(){audio.stop();setPlaying(null);setPicked(null);setFeedback('');setPracticeTone(null)}
  function navigate(i:number){reset();setStep(i);setStage(0);setTied(true);setRound(0)}
  function toStage(i:number){reset();setStage(i)}

  // Play the pattern (or one note and anything tied to it) with a click on every pulse: beats, or half beats (beats louder).
  function hear(pattern:RhythmPattern,unit:number,from?:number,top=pattern.top??4){
    const d=compileRhythm(pattern),i=from??0;
    let end=from===undefined?d.notes.length-1:i;if(from!==undefined)while(d.ties.includes(end))end++;
    const timeline=d.timeline.slice(i,end+1).map(e=>({...e,at:e.at-d.timeline[i].at}));
    setPlaying({from:d.timeline[i].at,unit});
    void audio.counted({values:timeline.map(e=>e.length),timeline,ties:d.ties.filter(n=>n>=i&&n<end).map(n=>n-i),offset:i,speak:false,secondsPerQuarter:SPEED,beatUnit:unit,top:unit<1?Math.round(1/unit):top,onEnd:()=>setPlaying(null),onError:()=>setPlaying(null)});
  }
  const pulseAt=playing&&audio.beat>=0?playing.from+audio.beat*playing.unit:-1;

  // `map` turns a played note's index into the drawn note's index, for rows that keep a hidden slot so nothing slides.
  const row=(notes:RowNote[],children:(l:RowLayout)=>ReactNode,o:{bars?:number[];ties?:number[];beams?:number[][];hidden?:number[];appear?:number[];top?:number;map?:number[]}={})=>
    <EngravedRow notes={notes} clef={false} meter={{top:o.top??4,bottom:4}} right={RIGHT} viewBox={FRAME} interactive active={audio.active<0?-1:o.map?o.map[audio.active]??-1:audio.active} label={names[step]} proportional bars={o.bars} ties={o.ties} beams={o.beams} hidden={o.hidden} appear={o.appear}>{children}</EngravedRow>;
  // Invisible targets on the music itself: no hover box, a focus ring only for the keyboard.
  const hit=(key:string,x:number,y:number,w:number,h:number,label:string,fn:()=>void)=><rect key={key} className="dt-hit" x={x-w/2} y={y-h/2} width={w} height={h} role="button" tabIndex={0} aria-label={label} onClick={fn} onKeyDown={e=>keyAct(e,fn)}/>;
  const noteHits=(l:RowLayout,pattern:RhythmPattern,unit:number,map?:number[],top=4)=>{const d=compileRhythm(pattern);return d.notes.map((_,i)=>!d.ties.includes(i-1)&&hit(`n${i}`,l.xs[map?map[i]:i]-4,150,40,124,tr(`Hear note ${i+1}`,`听第 ${i+1} 个音`),()=>hear(pattern,unit,i,top)))};
  // Counts, and one bracket for the note being taught. Ticks only when the step is about parts of a beat (`div` per beat,
  // up to `fineTo`), so there are no extra lines otherwise.
  function timeLine(l:RowLayout,beats:number,div:number,bracket:Bracket|null,{top=4,fineTo=beats}:{top?:number;fineTo?:number}={}){
    const x=(t:number)=>l.beatX(t),lit=(t:number)=>pulseAt>=0&&Math.abs(pulseAt-t)<.01;
    const ticks:number[]=[];if(div>1)for(let t=0;t<=beats+1e-9;t+=t<fineTo-1e-9?1/div:1)ticks.push(Math.round(t*100)/100);
    const y=BRACKET_Y;
    return <g className="dt-timeline">
      {Array.from({length:beats},(_,b)=><text key={`c${b}`} className={`dt-count${pulseAt>=0&&Math.floor(pulseAt+.001)===b?' is-lit':''}`} x={x(b)} y={COUNT_Y}>{b%top+1}</text>)}
      {div>1&&<path className="dt-line" d={`M${x(0)} ${LINE_Y} H${x(beats)}`}/>}
      {ticks.map(t=>{const beat=Number.isInteger(t);return <path key={`t${t}`} className={`dt-tick${beat?' is-beat':''}${lit(t)?' is-lit':''}`} d={`M${x(t)} ${LINE_Y-(beat?7:4)} V${LINE_Y+(beat?7:4)}`}/>})}
      {bracket&&(()=>{const a=x(bracket.from)+3,e=x(bracket.to)-3;return <g key={`${bracket.from}-${bracket.to}-${bracket.label}`} className={`dt-bracket${bracket.done?' is-done':''}`}><path d={`M${a} ${y-8} V${y} H${e} V${y-8}`}/>{bracket.label&&<text x={(a+e)/2} y={y+24}>{bracket.label}</text>}</g>})()}
    </g>;
  }
  function durationJoin(l:RowLayout,start:number,middle:number,end:number,joined:boolean){
    const a=l.beatX(start)+3,b=l.beatX(middle),c=l.beatX(end)-3,y=BRACKET_Y;
    return <g className={`dt-duration-join${joined?' is-joined':''}`}>
      <path d={`M${a} ${y-8} V${y} H${b-5} M${b+5} ${y} H${c} V${y-8}`}/>
      <path className="dt-span-seam" d={`M${b-5} ${y} v-8 M${b+5} ${y} v-8`}/>
      <path className="dt-span-bridge" d={`M${b-5} ${y} H${b+5}`}/>
      <text visibility={joined?"hidden":"visible"} x={(a+b)/2} y={y+24}>{tr(`${middle-start} ${middle-start===1?'beat':'beats'}`,`${middle-start} 拍`)}</text>
      <text visibility={joined?"hidden":"visible"} x={(b+c)/2} y={y+24}>{tr(`${end-middle} ${end-middle===1?'beat':'beats'}`,`${end-middle} 拍`)}</text>
      {joined&&<text className="dt-span-sum" x={(a+c)/2} y={y+24}>{middle-start} + {end-middle} = {tr(`${end-start} beats`,`${end-start} 拍`)}</text>}
    </g>;
  }
  const choices=(list:Choice[],onRight:()=>void,miss:(id:string)=>string,right:string,wide=false)=><div className={`measures-choices lesson-tools${wide?' dt-wide-choices':''}`} role="group" aria-label={tr('Choose an answer','选一个答案')}>
    {list.map(c=>{const done=list.some(x=>x.right&&x.id===picked);return <button key={c.id} disabled={done} className={picked===c.id?(c.right?'is-correct':'is-wrong'):''} onClick={()=>{setPicked(c.id);if(c.right){setFeedback(right);onRight()}else setFeedback(miss(c.id))}}>{c.label}</button>})}
  </div>;
  const answered=(list:Choice[])=>list.some(c=>c.right&&c.id===picked);
  const tone=(list:Choice[]):'correct'|'wrong'|null=>picked===null?null:answered(list)?'correct':'wrong';
  const beats=(n:string)=>tr(`${n} beats`,`${n} 拍`);

  let narration='',message:ReactNode='',scene:ReactNode=null,extra:ReactNode=null,bubbleTone:'correct'|'wrong'|null=null,progress:{done:number;total:number}|undefined;
  let next:LessonNext={label:tr(`Next: ${names[step+1]}`,`下一步：${names[step+1]}`),ready:false,onClick:()=>navigate(step+1)};
  const ask=(label:string)=>{next={label,ready:true,onClick:()=>toStage(2)}};

  if(step===0){
    const join=stage===1,pattern=join?HALF_TIED:HALF_QUARTERS,d=compileRhythm(pattern);
    narration=join?tr('A tie joins two notes of the same pitch into one sound. Their lengths add up: 2 + 1 = 3 beats.','延音线把两个同样音高的音连成一个声音，时值相加：2 + 1 = 3 拍。')
      :tr('A half note lasts 2 beats. What if the first sound should last 3 beats?','二分音符有 2 拍。如果第一个声音要响 3 拍呢？');
    message=join?tr('One sound, 3 beats. Next, a shorter way to write it.','一个声音，3 拍。接下来看一种更简单的写法。'):tr('Tap between the half note and the next quarter note to tie them.','点二分音符和后面四分音符的中间，用延音线把它们连起来。');
    bubbleTone=join?'correct':null;
    scene=row(d.notes,l=><>
      {timeLine(l,4,1,null)}{durationJoin(l,0,2,3,join)}
      {join?noteHits(l,HALF_TIED,1):hit('tie',(l.xs[0]+l.xs[1])/2,NOTE_Y+10,l.xs[1]-l.xs[0]-30,70,tr('Tie the half note to the quarter note','把二分音符和四分音符连起来'),()=>{setStage(1)})}
    </>,{ties:d.ties});
    next.ready=join;
  }else if(step===1){
    if(stage<2){
      // The dotted half keeps the tied quarter's slot (hidden), so the notes around it do not move: only the tie and dot change.
      const dot=stage===1&&!tied,map=[0,2];
      narration=dot?tr('A dot adds half of the note’s value. Half of 2 is 1, so a dotted half lasts 2 + 1 = 3 beats: the same sound as the tie.','附点加上音符一半的时值。2 的一半是 1，所以附点二分音符有 2 + 1 = 3 拍，和延音线的声音一样。')
        :tr('A tie like this is a little awkward to read, so it is usually written with a dot instead.','这样的延音线读起来有点麻烦，所以通常改用附点来写。');
      message=stage===0?tr('Tap the half note to add a dot.','点一下二分音符，加上附点。'):dot?tr('Same sound, easier to read. Tap the dot to see the tie again.','声音一样，读起来更简单。点附点可以再看延音线的写法。'):tr('Tap the half note to write it with a dot again.','点二分音符，再换成附点的写法。');
      bubbleTone=stage===1?'correct':null;
      scene=row([{v:2,written:dot?3:2},{v:1},{v:1}],l=><>
        {timeLine(l,4,1,{from:0,to:3,label:dot?beats('3'):tr('2 + 1 = 3 beats','2 + 1 = 3 拍')})}
        {stage>0&&(dot?noteHits(l,DOTTED_HALF,1,map):noteHits(l,HALF_TIED,1))}
        {dot?hit('dot',l.xs[0]+26,NOTE_Y,44,56,tr('Show the tie again','再看延音线的写法'),()=>{setTied(true)})
          :hit('add',l.xs[0]+6,150,64,124,tr('Add a dot to the half note','给二分音符加附点'),()=>{setStage(1);setTied(false)})}
      </>,{ties:dot?[]:[0],hidden:dot?[1]:[],map:dot?map:undefined});
      if(stage>0)ask(tr('Dots on other notes','其他音符的附点'));
    }else if(stage===2){
      narration=tr('A dot always adds half the original length. Here, a quarter note is one beat.','附点总是加上原时值的一半。这里以四分音符为一拍。');
      message=tr('The same rule works on every note shape. Compare the original length and the part the dot adds.','每种音符都用同一个规则：比较原时值和附点增加的部分。');
      const examples=[{v:4,name:tr('Whole','全音符')},{v:2,name:tr('Half','二分音符')},{v:1,name:tr('Quarter','四分音符')},{v:.5,name:tr('Eighth','八分音符')},{v:.25,name:tr('Sixteenth','十六分音符')}];
      scene=<div className="dt-dot-reference">{examples.map(({v,name})=><div key={v}>
        <svg viewBox="-35 -100 100 140" aria-hidden="true"><RhythmNote value={v as NoteValue}/><circle className="dt-added-dot" cx={v===4?33:27} cy="-4" r="3.5"/></svg>
        <span>{name}</span><strong>{v} + {v/2} = {v*1.5}</strong><small>{tr('beats','拍')}</small>
      </div>)}</div>;
      next={label:tr('Try a question','试一题'),ready:true,onClick:()=>toStage(3)};
    }else{
      // A new case: 3/4, where a dotted half is a whole measure.
      const list:Choice[]=[{id:'half',label:tr('Half note','二分音符')},{id:'dotted',label:tr('Dotted half','附点二分音符'),right:true},{id:'whole',label:tr('Whole note','全音符')}],done=answered(list);
      narration=tr('In 3/4 there are three beats in a measure.','3/4 拍每小节有三拍。');
      message=feedback||tr('Which single note fills a whole measure of 3/4?','哪一个音符能单独填满一小节 3/4 拍？');
      bubbleTone=tone(list);
      scene=<div className="dt-note-question" role="group" aria-label={tr('Choose the note that fills 3/4','选择填满 3/4 小节的音符')}>
        {list.map((c,i)=><button key={c.id} disabled={done} className={picked===c.id?(c.right?'is-correct':'is-wrong'):''} onClick={()=>{
          setPicked(c.id);
          if(c.right){setFeedback(tr('Yes: 2 + 1 = 3 beats. One dotted half fills this measure.','对：2 + 1 = 3 拍。一个附点二分音符填满这个小节。'))}
          else setFeedback(i===0?tr('Two beats leaves one beat empty.','两拍，还差一拍。'):tr('Four beats is one beat too long.','四拍，多了一拍。'));
        }}><svg viewBox="-35 -100 100 140" aria-hidden="true"><RhythmNote value={[2,2,4][i] as NoteValue}/>{i===1&&<circle cx="26" cy="-4" r="3.5" fill="currentColor"/>}</svg><span>{c.label}</span>
          <small>{picked===c.id?(i===0?tr('2 beats','2 拍'):i===1?tr('2 + 1 = 3 beats','2 + 1 = 3 拍'):tr('4 beats','4 拍')):'\u00a0'}</small></button>)}
      </div>;
      next.ready=done;
    }
  }else if(step===2){
    if(stage<3){
      // The dotted quarter keeps the tied eighth's slot (hidden), so the eighth and half note after it do not move.
      const dot=stage===2&&!tied,map=[0,2,3],pattern=stage===0?QUARTER_EIGHTHS:TIED_QUARTER;
      narration=stage===0?tr('The same works with shorter notes. A quarter note is 1 beat and an eighth note is 0.5 beat.','短一些的音符也一样。四分音符是 1 拍，八分音符是 0.5 拍。')
        :dot?tr('Half of 1 beat is 0.5, so a dotted quarter lasts 1 + 0.5 = 1.5 beats: three half beats.','1 拍的一半是 0.5，所以附点四分音符有 1 + 0.5 = 1.5 拍，也就是三个半拍。')
        :tr('Tied, they make one sound of 1 + 0.5 = 1.5 beats.','连起来以后，是一个 1 + 0.5 = 1.5 拍的声音。');
      message=stage===0?tr('Tap between the first two notes to tie them.','点前两个音的中间，用延音线把它们连起来。'):stage===1?tr('Now tap the quarter note to write it with a dot.','现在点四分音符，换成附点的写法。'):dot?tr('Tap a note to hear its length, or the dot to compare the tied writing.','点音符听时值，或点附点比较延音线的写法。'):tr('Tap the quarter note to write it with a dot again.','点四分音符，再换成附点的写法。');
      bubbleTone=stage>0?'correct':null;
      scene=<>{row([{v:1,written:dot?1.5:1},{v:.5},{v:.5},{v:2}],l=><>
        {timeLine(l,4,2,null)}{durationJoin(l,0,1,1.5,stage>0)}
        {stage>0&&(dot?noteHits(l,DOTTED_QUARTER,.5,map):noteHits(l,pattern,.5))}
        {stage===0?hit('tie',(l.xs[0]+l.xs[1])/2,NOTE_Y+10,l.xs[1]-l.xs[0]-20,70,tr('Tie the first two notes','把前两个音连起来'),()=>{setStage(1)})
          :dot?hit('dot',l.xs[0]+26,NOTE_Y,44,56,tr('Show the tie again','再看延音线的写法'),()=>{setTied(true)})
          :hit('add',l.xs[0]+6,150,64,124,tr('Add a dot to the quarter note','给四分音符加附点'),()=>{setStage(2);setTied(false)})}
      </>,{ties:stage>0&&!dot?[0]:[],beams:dot?[]:[[1,2]],hidden:dot?[1]:[],map:dot?map:undefined})}
        {dot&&<svg className="dt-equation" viewBox="0 0 380 130" role="img" aria-label={tr('Quarter note plus eighth note equals dotted quarter: 1 + 0.5 = 1.5 beats','四分音符加八分音符等于附点四分音符：1 + 0.5 = 1.5 拍')}>
          <g transform="translate(65 90) scale(.7)"><RhythmNote value={1}/></g>
          <text x="125" y="78">+</text>
          <g transform="translate(185 90) scale(.7)"><RhythmNote value={.5}/></g>
          <text x="245" y="78">=</text>
          <g transform="translate(305 90) scale(.7)"><RhythmNote value={1}/><circle cx="26" cy="-4" r="3.5"/></g>
        </svg>}
      </>;
      if(stage===2)next={label:tr('Try a question','试一题'),ready:true,onClick:()=>toStage(3)};
    }else{
      // A new case: a dot on an eighth note, in the dotted eighth + sixteenth pair that fills one beat.
      const list:Choice[]=[{id:'2',label:'2'},{id:'3',label:'3',right:true},{id:'4',label:'4'}],done=answered(list);
      narration=done?tr('A dotted eighth and a sixteenth: 3 + 1 = 4 sixteenths, one beat. This pair is very common.','附点八分音符加一个十六分音符：3 + 1 = 4 个十六分音符，正好一拍。这个组合很常见。')
        :tr('A sixteenth note is a quarter of a beat. The dot works the same way on an eighth note.','十六分音符是四分之一拍。附点加在八分音符上也是同样的道理。');
      message=feedback||tr('A dotted eighth lasts as long as how many sixteenth notes?','附点八分音符和几个十六分音符一样长？');
      bubbleTone=tone(list);
      scene=row(compileRhythm(DOTTED_EIGHTH).notes,l=><>
        {timeLine(l,2,4,{from:0,to:.75,label:done?tr('3 sixteenths','3 个十六分音符'):'?',done},{fineTo:1,top:2})}
        {done&&noteHits(l,DOTTED_EIGHTH,.25)}
      </>,{beams:DOTTED_EIGHTH.beams,top:2});
      extra=choices(list,()=>{},()=>tr('An eighth is 2 sixteenths. The dot adds half of that: 1 more.','八分音符等于 2 个十六分音符，附点再加一半，也就是再加 1 个。'),tr('Right: 2 + 1 = 3 sixteenths. Tap a note to hear its length.','对：2 + 1 = 3 个十六分音符。点音符听听它的时值。'));
      next.ready=done;
    }
  }else if(step===3){
    const join=stage===1,pattern=join?ACROSS:ACROSS_APART,d=compileRhythm(pattern);
    narration=join?tr('One 2-beat sound now, carried over the bar line. A dot can’t do this, because each measure must add up to its own 4 beats.','现在是一个 2 拍的声音，跨过了小节线。附点做不到，因为每个小节都要自己凑满 4 拍。')
      :tr('Ties can also cross a bar line. Here beat 4 and the next beat 1 are two separate notes.','延音线还能跨过小节线。这里第 4 拍和下一小节的第 1 拍是两个分开的音。');
    message=join?tr('On a wind instrument, keep the air going and don’t tongue the tied note. Tap a note to hear it.','吹管乐器时，气息保持不断，连起来的那个音不要再吐音。点音符可以听。'):tr('Tap between the two notes to tie them across the bar line.','点两个音中间，用延音线把它们跨小节连起来。');
    bubbleTone=join?'correct':null;
    scene=row(d.notes,l=><>
      {timeLine(l,8,1,null)}{durationJoin(l,3,4,5,join)}
      {join?noteHits(l,ACROSS,1):hit('tie',(l.xs[2]+l.xs[3])/2,NOTE_Y+10,l.xs[3]-l.xs[2]-20,70,tr('Tie the notes across the bar line','用延音线把两个音跨小节连起来'),()=>{setStage(1)})}
    </>,{bars:pattern.bars,ties:d.ties});
    next.ready=join;
  }else{
    const last=DRILLS.length-1;
    narration=round===1?tr('Now 3/4, three beats in a measure, and short then long: the eighth note comes first.','现在是 3/4 拍，每小节三拍，而且是先短后长：八分音符在前。')
      :round===2?tr('Let the rest pass silently, then hold through the tie. Tap only new sounds.','休止符不点，延音线连着的音也不重新点，只点新声音。')
      :round===3?tr('Finish with a quick dotted-eighth pair: long, short, then a full beat.','最后试试附点八分音符组合：长、短，再一整拍。')
      :tr('Tap once when each new note starts. Keep counting while a note holds.','每个新音开始时点一下。音在延续时，心里继续数拍。');
    message=feedback||((DRILLS[round].top??4)===4?tr('4/4. Tap Count me in: four clicks, then tap me on each new note.','4/4 拍。点“数拍开始”：先听四下，然后每个新音点一下我。'):tr(`${DRILLS[round].top}/4, so the count-in is ${DRILLS[round].top} clicks. Tap Count me in, then tap me on each new note.`,`${DRILLS[round].top}/4 拍，所以准备时只有 ${DRILLS[round].top} 下。点“数拍开始”，然后每个新音点一下我。`));
    bubbleTone=feedback?practiceTone:null;
    scene=<RhythmPractice key={round} pattern={DRILLS[round]} zh={zh} right={RIGHT} frame={FRAME} onSpot={setSpot} onTapped={tapped} onAttempt={()=>setAttempts(a=>a.includes(round)?a:[...a,round])} onFeedback={(text,t)=>{setFeedback(text);setPracticeTone(t??null)}}/>;
    progress={done:attempts.length,total:DRILLS.length};
    const tried=attempts.includes(round),missing=DRILLS.map((_,r)=>r).find(r=>!attempts.includes(r));
    const go=(r:number,text='')=>{setRound(r);setFeedback(text);setPracticeTone(null)};
    if(round<last)next={label:tr('Next rhythm','下一个节奏'),ready:tried,onClick:()=>go(round+1),onSkip:()=>go(round+1)};
    else next={label:tr('Finish lesson','完成本课'),ready:tried&&missing===undefined,onClick:()=>{audio.stop();course.finish('dots');router.push('/flute-studio/theory')},onSkip:()=>{if(missing!==undefined)go(missing,tr('Try each rhythm once to finish. Your timing does not need to be perfect.','每个节奏都试一次就能完成，不要求完全准确。'))}};
  }

  return <LessonFrame title={tr('Dots and ties','附点与延音线')} className="dt-lesson" zh={zh} steps={names} current={step} onJump={navigate} heading={names[step]} narration={keepSums(narration)} fadeNarration message={message} tone={bubbleTone} next={next} extra={extra} progress={progress} cookieAway={step===4?{slot:spot,pulse}:null} status={audio.error?tr('Sound could not start. Tap a note to try again.','声音没能启动，点一个音符再试。'):undefined}>
    <div key={`${step}-${step===1&&stage===2?"reference":(step===1&&stage>=3)||(step===2&&stage>=3)?"question":"demo"}`} className={`dt-scene-content${stage>0?" dt-transformed":""}`}>{scene}</div>
  </LessonFrame>;
}
