'use client';
import {useState,type ReactNode,type KeyboardEvent} from 'react';
import {useLanguage} from '../../i18n/LanguageContext';
import LessonFrame from '../LessonFrame';
import EngravedRow,{type RowNote,type RowLayout} from '../EngravedRow';
import {useRhythmAudio} from '../rhythm/useRhythmAudio';
import {useCourseProgress} from '../useCourseProgress';
import TieGesture from './TieGesture';
import RhythmPractice from './RhythmPractice';
import {compileRhythm,dividedBeat,DRILLS,SYNCOPATED,type RhythmPattern} from './rhythmSequence';
import '../theory.css';
import './dots-and-ties.css';

const FRAME='20 64 830 300',RIGHT=820;
const action=(e:KeyboardEvent,fn:()=>void)=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat){e.preventDefault();fn()}};
const ACROSS:RhythmPattern={id:'across',items:[{written:2,rest:true},{written:1,rest:true},{written:1,tieNext:true},{written:1},{written:2,rest:true},{written:1,rest:true}],bars:[3]};

export default function DotsTiesLesson(){
  const {lang}=useLanguage(),zh=lang==='zh',tr=(en:string,cn:string)=>zh?cn:en;
  const audio=useRhythmAudio(),course=useCourseProgress();
  const [step,setStep]=useState(0),[stage,setStage]=useState(0),[feedback,setFeedback]=useState('');
  const [ready,setReady]=useState(false),[tone,setTone]=useState<'correct'|'wrong'|null>(null);
  const [joined,setJoined]=useState(false),[wrong,setWrong]=useState<number|null>(null);
  const [round,setRound]=useState(0),[attempts,setAttempts]=useState<number[]>([]),[complete,setComplete]=useState(false),[challenge,setChallenge]=useState(false);
  const names=[tr('Add a dot','加一个附点'),tr('Between beats','两拍之间'),tr('A dotted quarter','附点四分音符'),tr('Across a bar line','跨过小节线'),tr('Across a beat','跨过正拍'),tr('Three in a beat','一拍分三份'),tr('Rhythm practice','节奏练习')];
  function navigate(i:number){audio.stop();setStep(i);setStage(0);setFeedback('');setReady(false);setTone(null);setJoined(false);setWrong(null)}
  function changed(text:string){setFeedback(text);setTone('correct');setReady(true)}
  function hear(pattern:RhythmPattern){
    if(audio.elapsed>=0){audio.stop();return}
    const d=compileRhythm(pattern);
    void audio.counted({values:d.notes.map(n=>n.v),timeline:d.timeline,ties:d.ties,speak:false,secondsPerQuarter:.8});
  }
  const playback=(pattern:RhythmPattern,label:string)=><div className="lesson-tools"><button onClick={()=>hear(pattern)}>{audio.elapsed>=0?tr('Stop','停止'):label}</button></div>;
  const hit=(x:number,y:number,label:string,fn:()=>void,w=52,h=52)=><rect className="dt-hit" x={x-w/2} y={y-h/2} width={w} height={h} role="button" tabIndex={0} aria-label={label} onClick={fn} onKeyDown={e=>action(e,fn)}/>;
  const row=(notes:RowNote[],children:(l:RowLayout)=>ReactNode,options:{ties?:number[];bars?:number[];hidden?:number[];beams?:number[][];appear?:number[]}={})=><EngravedRow notes={notes} clef={false} meter={{top:4,bottom:4}} right={RIGHT} viewBox={FRAME} interactive active={audio.active} label={names[step]} {...options}>{children}</EngravedRow>;
  const counts=(l:RowLayout,total=4,halves=false)=><g>{Array.from({length:total*(halves?2:1)},(_,i)=>{const t=i/(halves?2:1);return <text key={i} className={`dt-count ${audio.beat===Math.floor(t)?'is-sounding':''}`} x={l.beatX(t)} y="260">{Number.isInteger(t)?t%4+1:'&'}</text>})}</g>;
  let narration='',message=feedback,scene:ReactNode=null,tools:ReactNode=null;

  if(step===0){
    narration=stage?tr('A dot adds half of the note’s original length. Half of two beats is one more beat.','附点增加原来时值的一半。两拍的一半是一拍，所以一共三拍。'):tr('This half note lasts two beats. We need one more beat of sound before the rest.','这个二分音符有两拍，休止前还需要多响一拍。');
    const add=()=>{setStage(1);changed(tr('Two plus one makes three. The dot lets this note last three beats.','二加一等于三。这个附点让音符持续三拍。'))};
    const notes:RowNote[]=[{v:3,written:stage?3:2},{v:1,rest:true}];
    scene=row(notes,l=><>
      {counts(l)}
      {!stage&&<><circle className="dt-dot-target" cx={l.xs[0]+24} cy="188" r="6"/>{hit(l.xs[0]+24,188,tr('Add a dot','加上附点'),add)}</>}
      {hit(l.xs[0]-(stage?0:15),188,tr('Hear the note','听这个音'),()=>void audio.play([stage?3:2],[67],0,false),stage?52:20)}
      <path className="dt-span" d={`M${l.beatX(0)} 291 v8 H${l.beatX(2)} v-8`}/>
      <text className="dt-label" x={(l.beatX(0)+l.beatX(2))/2} y="328">{tr('2 beats','2 拍')}</text>
      <g className={stage?'dt-extension is-added':'dt-extension'}><path d={`M${l.beatX(2)} 291 v8 H${l.beatX(3)} v-8`}/><text className="dt-label" x={(l.beatX(2)+l.beatX(3))/2} y="328">{stage?tr('+ 1 beat','+ 1 拍'):tr('1 beat to fill','还差 1 拍')}</text></g>
    </>);
    message ||=tr('Tap the faint dot beside the note to make it longer.','点音符旁边的浅色圆点，把它延长。');
    tools=playback({id:'dot-demo',items:stage?[{written:3},{written:1,rest:true}]:[{written:2},{written:1,rest:true},{written:1,rest:true}]},tr('Hear the held note','听持续的音'));
  }else if(step===1){
    narration=tr('Half of a quarter note is half a beat. Count “and” halfway between the numbers.','四分音符的一半是半拍。在数字中间数“和”。');
    const reveal=()=>{setStage(1);changed(tr('1 and 2 and 3 and 4 and. The numbers keep the same steady beat.','1 和 2 和 3 和 4 和。数字仍然是稳定的拍子。'))};
    scene=row(Array.from({length:8},()=>({v:.5,written:stage?.5:1})),l=><>
      {counts(l,4,!!stage)}
      <path className="dt-span" d={`M${l.beatX(0)} 294 H${l.beatX(4)}`}/>
      {[0,.5,1,1.5,2,2.5,3,3.5].map(t=><g key={t}><circle className={t%1?'dt-midpoint':'dt-guide'} cx={l.beatX(t)} cy="294" r={t%1?6:4}/>{hit(l.beatX(t),294,tr(t%1?'Reveal the halfway count':'Hear a beat',t%1?'显示半拍':'听一拍'),()=>{if(!stage&&t%1)reveal();else if(stage)void audio.clap()},48,66)}</g>)}
    </>,{hidden:stage?[]:[1,3,5,7],beams:stage?[[0,1],[2,3],[4,5],[6,7]]:[]});
    message ||=tr('Tap halfway between 1 and 2 to divide each beat into two.','点 1 和 2 中间的位置，把每拍分成两份。');
    tools=playback({id:'halves',items:Array.from({length:stage?8:4},()=>({written:stage?.5:1})),beams:[]},stage?tr('Hear two notes per beat','听每拍两个音'):tr('Hear the steady beat','听稳定的拍子'));
  }else if(step===2){
    narration=tr('A dotted quarter lasts one and a half beats: 1 + ½.','附点四分音符持续一拍半：1 + ½。');
    const choose=(t:number)=>{if(t===1.5){setStage(1);setWrong(null);changed(tr('The eighth note starts on the “and” after 2. Together they fill two beats.','八分音符从第 2 拍后的“和”开始，两者合起来是两拍。'))}else{setWrong(t);setTone('wrong');setFeedback(t<1.5?tr('That starts before the dotted note finishes. Try the “and” after 2.','这里附点音符还没结束。试试第 2 拍后的“和”。'):tr('That leaves a gap. The dotted note finishes on the “and” after 2.','这里留下了空隙，附点音符在第 2 拍后的“和”结束。'))}};
    scene=row([{v:1.5},{v:.5},{v:2,rest:true}],l=><>
      {counts(l,4,true)}
      <path className="dt-span" d={`M${l.beatX(0)} 285 v10 H${l.beatX(1.5)} v-10`}/>
      <text className="dt-label" x={(l.beatX(0)+l.beatX(1.5))/2} y="326">{tr('1½ beats','1½ 拍')}</text>
      {[0,.5,1,1.5,2,2.5,3,3.5].map(t=><g key={t}><circle className={wrong===t?'dt-wrong':'dt-midpoint'} cx={l.beatX(t)} cy="350" r="5"/>{hit(l.beatX(t),340,tr(`Place the eighth at ${Number.isInteger(t)?t+1:`the and after ${Math.floor(t)+1}`}`,`把八分音符放在${Math.floor(t)+1}${t%1?'拍后半拍':'拍'}`),()=>choose(t),48,62)}</g>)}
      {stage===1&&<path className="dt-extension is-added" d={`M${l.beatX(1.5)} 285 v10 H${l.beatX(2)} v-10`}/>}
    </>,{hidden:stage?[]:[1],appear:stage?[1]:[]});
    message ||=tr('Where should the missing eighth note start? Tap its place below the counts.','缺少的八分音符应该从哪里开始？点数拍下方的位置。');
    tools=playback({id:'quarter-demo',items:[{written:1.5},{written:.5,rest:!stage},{written:2,rest:true}]},tr('Hear where the note ends','听音符在哪里结束'));
  }else if(step===3){
    narration=stage===0?tr('A note starts on beat 4 and lasts two beats. It reaches past the bar line.','一个音从第 4 拍开始，持续两拍，会跨过小节线。'):joined?tr('A tie joins notes of the same pitch into one sound. Add their lengths.','延音线把同音高的音符连成一个声音，时值相加。'):tr('Write one quarter on each side of the bar line. A tie keeps the sound going.','小节线两边各写一个四分音符，用延音线让声音继续。');
    const d=compileRhythm(ACROSS),notes=d.notes.map((n,i)=>i===2&&stage===0?{...n,written:2}:n);
    const join=(value:boolean)=>{setJoined(value);setReady(value);setTone(value?'correct':null);setFeedback(value?tr('Keep the air going. Don’t tongue the second note. Tap the tie to remove it and compare.','气息保持连贯，第二个音不用再吐音。点延音线可移除并比较。'):'')};
    scene=row(notes,l=><>
      {counts(l,8)}
      {!stage&&<><path className="dt-overflow" d={`M${l.xs[2]} 296 H${l.beatX(5)}`}/><path className="dt-bar-cue" d={`M${l.barXs[0]} 104 V211`}/>{hit(l.barXs[0],160,tr('Split the note at the bar line','在小节线处分开音符'),()=>{setStage(1);setFeedback('')},56,170)}<text className="dt-label" x={(l.xs[2]+l.beatX(5))/2} y="331">{tr('2 beats of sound','持续 2 拍')}</text></>}
      {stage>0&&<TieGesture from={l.xs[2]} to={l.xs[3]} y={188} joined={joined} onJoin={join} zh={zh}/>}
    </>,{bars:[3],hidden:stage?[]:[3],appear:stage?[3]:[],ties:joined?[2]:[]});
    message ||=stage?tr('Draw from the first notehead to the second, or tap both in order.','从第一个音符头画到第二个，或依次点两个端点。'):tr('Tap the red bar line to divide the note where the measure ends.','点红色小节线，在小节结束的位置拆开音符。');
    tools=stage?playback({...ACROSS,items:ACROSS.items.map((n,i)=>({...n,tieNext:i===2&&(joined||stage===0)}))},joined?tr('Hear one continuous sound','听一个连贯的音'):tr('Hear the two beats','听这两拍')):null;
  }else if(step===4){
    narration=joined?tr('This note starts between beats and holds across beat 2. That shift in emphasis is one kind of syncopation.','这个音从两拍之间开始，延续到第 2 拍。这种重音的错位是切分节奏的一种。'):tr('A tie can cross a beat inside a measure, too. The pulse underneath stays steady.','延音线也可以在小节内跨过一拍，下面的拍子仍然稳定。');
    const d=compileRhythm(SYNCOPATED);
    scene=row(d.notes,l=><>
      {counts(l,4,true)}
      <TieGesture from={l.xs[1]} to={l.xs[2]} y={188} joined={joined} onJoin={value=>{setJoined(value);setReady(value);setTone(value?'correct':null);setFeedback(value?tr('Start on the “and” after 1. Hold through 2 without starting again.','在第 1 拍后的“和”开始，到第 2 拍继续保持，不重新起音。'):'')}} zh={zh}/>
      {joined&&<path className="dt-span" d={`M${l.beatX(.5)} 295 v8 H${l.beatX(1.5)} v-8`}/>}
    </>,{ties:joined?[1]:[],beams:SYNCOPATED.beams});
    message ||=tr('Connect the eighth notes on the “and” after 1 and on beat 2.','把第 1 拍后的“和”与第 2 拍的八分音符连起来。');
    tools=playback({...SYNCOPATED,items:SYNCOPATED.items.map(n=>({...n,tieNext:n.tieNext&&joined}))},joined?tr('Hear the held offbeat','听跨过正拍的音'):tr('Hear separate starts','听分开的起音'));
  }else if(step===5){
    narration=stage?tr('A triplet fits three equal notes into the time of two. These three eighths share one beat.','三连音把三个均匀的音放进原来两个音的时间里。这三个八分音符共用一拍。'):tr('Two eighth notes share one beat. What if we divide that same beat into three equal parts?','两个八分音符共用一拍。如果把这一拍平均分成三份呢？');
    if(stage){scene=<RhythmPractice key="triplet-explore" pattern={dividedBeat(3)} zh={zh} onAttempt={()=>setReady(true)} onFeedback={setFeedback}/>;message ||=tr('Tap “Count me in”, then try three evenly spaced taps on beat 1 and one on 2, 3 and 4.','点“数拍开始”，第 1 拍均匀点三下，第 2、3、4 拍各点一下。');}
    else{
      const d=compileRhythm(dividedBeat(3));
      scene=row(d.notes,l=><>{counts(l)}<path className="dt-span" d={`M${l.beatX(0)} 291 v8 H${l.beatX(1)} v-8`}/><text className="dt-label" x={(l.beatX(0)+l.beatX(1))/2} y="331">{tr('1 beat · divide into 3','1 拍 · 分成 3 份')}</text>{hit((l.beatX(0)+l.beatX(1))/2,303,tr('Divide the first beat into three','把第一拍分成三份'),()=>setStage(1),l.beatX(1)-l.beatX(0)+30,85)}</>,{beams:[[0,2]],hidden:[1]});
      message=tr('Tap the span under the first beat. Its length stays the same.','点第一拍下方的时值线，它的长度保持不变。');
    }
  }else{
    narration=challenge?tr('Five sixteenth notes can share one quarter-note beat: five in the time of four.','五个十六分音符可以共用一拍：五个音放进原来四个音的时间里。'):complete?tr('Dots extend notes. Ties join their lengths. Tuplets divide a span into equal parts.','附点延长音符，延音线连接时值，连音把一段时间平均分开。'):tr('Tap each new note’s start. Keep counting through held notes; don’t tap a tied continuation.','每次新音开始时点一下。长音时继续数拍，延音线后的音不用再点。');
    scene=<RhythmPractice key={challenge?'five':`drill-${round}`} pattern={challenge?dividedBeat(5):DRILLS[round]} zh={zh} onAttempt={()=>{if(!attempts.includes(round))setAttempts(a=>[...a,round]);setReady(true)}} onFeedback={setFeedback}/>;
    message ||=challenge?tr('Hear the rhythm first: five equal notes inside beat 1. Then try it at your own pace.','先听节奏：第 1 拍内有五个均匀的音，再慢慢试着点。'):complete?tr('Lesson complete. You can revisit any step or try five notes in a beat.','本课完成。可以回看任意步骤，也可以试试一拍五个音。'):tr(`Pattern ${round+1} of 4. Tap “Count me in”, then tap Cookie or press Space. We check starts, not how long you hold.`,`第 ${round+1} 个节奏，共 4 个。点“数拍开始”，再点 Cookie 或按空格。这里只练起音，不检查按住多久。`);
  }
  const next=step<6?{label:tr(`Next: ${names[step+1]}`,`下一步：${names[step+1]}`),ready,onClick:()=>navigate(step+1)}:complete?{label:tr('Theory lessons','乐理课'),ready:true,href:'/flute-studio/theory'}:{label:round<3?tr('Next rhythm','下一个节奏'):tr('Finish lesson','完成本课'),ready:attempts.includes(round),onClick:()=>{if(round<3){setRound(r=>r+1);setReady(false);setFeedback('')}else if(attempts.length===4){setComplete(true);course.finish('dots');setFeedback('')}else{setRound([0,1,2,3].find(r=>!attempts.includes(r))??0);setFeedback('')}},onSkip:()=>{if(round<3){setRound(r=>r+1);setFeedback('')}else{setFeedback(tr('Try each of the four rhythms once to finish. Your timing does not need to be perfect.','四个节奏各试一次即可完成，不要求拍子完全准确。'));setRound([0,1,2,3].find(r=>!attempts.includes(r))??0)}}};
  return <LessonFrame title={tr('Dots, ties and rhythm practice','附点、延音线与节奏练习')} className="dt-lesson" zh={zh} steps={names} current={step} onJump={navigate} heading={names[step]} narration={narration} fadeNarration message={message} tone={tone} next={next} progress={step===6?{done:attempts.length,total:4}:undefined} status={audio.error?tr('Audio could not start. Tap the sound control to retry.','声音未能启动，请再点播放。'):undefined} extra={step===6&&complete?<button className="lesson-secondary" onClick={()=>{setChallenge(c=>!c);setFeedback('')}}>{challenge?tr('Back to practice','回到练习'):tr('Try quintuplets','试试五连音')}</button>:null}>
    <div key={step} className="dt-scene-content">{scene}{tools&&<div className="dt-scene-controls">{tools}</div>}</div>
  </LessonFrame>;
}
