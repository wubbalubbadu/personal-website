'use client';
import {useState,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import LessonFrame,{type LessonNext} from '../LessonFrame';
import EngravedRow,{type RowNote} from '../EngravedRow';
import {useLanguage} from '../../i18n/LanguageContext';
import {useCourseProgress} from '../useCourseProgress';
import {useRhythmAudio} from '../rhythm/useRhythmAudio';
import {usePhoneNotation} from '../usePhoneNotation';
import {pitchAt} from '../model';
import type {ArticulationEvent} from './articulationAudio';
import '../theory.css';
import '../measures/measures.css';
import '../dots-and-ties/dots-and-ties.css';
import './articulation.css';

type Mark={index:number;kind:'staccato'|'accent'|'tenuto'|'breath'};
type Slur={from:number;to:number};
// Every stem points up (F G A F), so slurs sit cleanly under the noteheads instead of dodging a down stem.
const ROW:RowNote[]=[{v:1,p:1},{v:1,p:2},{v:1,p:3},{v:1,p:1}];
// Step 2: the dot beside a note (dotted quarter) and the staccato dot over one, in one row.
const DOTS:RowNote[]=[{v:1.5,p:1},{v:.5,p:2},{v:1,p:3},{v:1,p:1}];
// Step 1: the two groupings the learner hears one of.
const GROUPINGS:Slur[][]=[[{from:0,to:1},{from:2,to:3}],[{from:0,to:2}]];
// Step 3: the marks the learner chooses between; the row carries an accent and a tenuto.
const SIGNS=['accent','tenuto','staccato'] as const;

/** A mark as a small picture, drawn like EngravedRow draws it, for answer buttons. */
const MarkIcon=({kind}:{kind:typeof SIGNS[number]})=><svg className="art-mark-icon" viewBox="-16 -12 32 24" aria-hidden="true">
  {kind==='staccato'?<circle r="3.5"/>:kind==='tenuto'?<path d="M-10 0h20"/>:<path fill="none" d="M-10 -7l21 7 -21 7"/>}
</svg>;

/*
 * Lesson 9. Steps alternate what the learner does: mark where to tongue (tap notes), hear which slurring was played
 * (choose A or B), find the detached note (tap), choose the mark that means emphasis or full length (choose a sign),
 * then read a whole phrase (tap). Hint lights the markings to read, never the answer itself.
 */
export default function ArticulationLesson(){
 const {lang}=useLanguage(),zh=lang==='zh',tr=(a:string,b:string)=>zh?b:a;
 const router=useRouter(),course=useCourseProgress(),audio=useRhythmAudio(),phone=usePhoneNotation();
 const [step,setStep]=useState(0),[stage,setStage]=useState(0),[selected,setSelected]=useState<number[]>([]),[done,setDone]=useState(false),[feedback,setFeedback]=useState(''),[wrong,setWrong]=useState(false);
 const [hint,setHint]=useState(false),[heard,setHeard]=useState(0),[pick,setPick]=useState<number|null>(null);
 const names=[tr('Tie or slur','延音线与连奏线'),tr('Hear the groups','听出分组'),tr('Two dots','两种点'),tr('Accent and tenuto','重音与保持音'),tr('Read a phrase','读一段旋律')];
 const right=phone?520:820;
 function reset(){audio.stop();setSelected([]);setDone(false);setFeedback('');setWrong(false);setHint(false);setPick(null)}
 function jump(n:number){reset();setStep(n);setStage(0);if(n===1)setHeard(Math.random()<.5?0:1)}
 const tieDemo=step===0&&stage===0;
 const notes:RowNote[]=tieDemo?[{v:1,p:5},{v:1,p:5}]:step===2?DOTS:ROW;
 const slurs:Slur[]=step===0&&!tieDemo?[{from:0,to:2}]:step===1?[]:step===4?[{from:0,to:1}]:[];
 const marks:Mark[]=step===2?[{index:2,kind:'staccato'}]:step===3?[{index:1,kind:'accent'},{index:3,kind:'tenuto'}]:step===4?[{index:1,kind:'breath'},{index:2,kind:'staccato'},{index:3,kind:'accent'}]:[];
 // Tap steps: the notes to pick.
 const targets=step===0?(tieDemo?[0]:[0,3]):step===2?[2]:stage===0?[0,2,3]:[2];
 const tapStep=step===0||step===2||step===4;
 // Choice steps: step 1 answers which grouping was heard (0 = A), step 3 which sign (accent, then tenuto).
 const answer=step===1?heard:stage===0?0:1;
 const narration=tieDemo?tr('A tie continues the same pitch. Tongue once and keep the air going.','延音线把同一个音延长。只吐音一次，气息继续。'):
 step===0?tr('A slur connects different notes smoothly. Tongue the first note, then change pitch without tonguing again.','连奏线让不同的音连贯。第一个音吐音，之后换音时不再吐音。'):
 step===1?tr('Each slur is one group: the sound restarts only where a new group begins.','每条连奏线是一组：只有新的一组开始时，声音才重新起头。'):
 step===2?tr('A dot beside a note adds time. A staccato dot above or below makes it short and detached, without moving the next beat.','音符旁的附点增加时值。上方或下方的断奏点让声音短而分开，但下一拍不变。'):
 step===3?tr('An accent gives a note extra emphasis. A tenuto holds it for its full value. Neither adds a beat.','重音记号让音更突出，保持音记号要求奏足时值。两者都不增加拍子。'):
 tr('Slur the connected notes, detach the dotted note, and emphasise the accented note. The comma is a place to breathe.','连奏线内的音连贯，断奏点的音短，重音突出。逗号形记号表示换气处。');
 const prompt=step===1?tr('Hear it, then choose: which version was played?','先听，再选：播放的是哪一个？')
  :step===3?(stage===0?tr('Which mark asks for extra emphasis?','哪个记号要求更突出？'):tr('Which mark asks you to hold the note for its full value?','哪个记号要求奏足时值？'))
  :step===2?tr('Tap the note that should sound detached, then Check.','点应该断奏的音，然后检查。')
  :step===4&&stage===1?tr('Now tap the detached note, then Check.','现在点断奏的音，然后检查。')
  :tr('Tap every note where you start with your tongue, then Check.','点出每个需要吐音的音，然后检查。');
 // Hints point at what to read (the curves, the marks), in words that teach; the answer stays the learner's.
 const hintText=tieDemo?tr('A tie joins two notes of the same pitch into one sound.','延音线把两个同音高的音连成一个声音。')
  :step===2?tr('The detaching dot sits above or below the notehead, not beside it.','断奏点在符头的上方或下方，不在旁边。')
  :step===4&&stage===1?tr('Look for the dot above or below a note.','找符头上方或下方的点。')
  :tr('Each curve is one group: tongue where a group starts, and on any note outside a curve.','每条弧线是一组：一组开始的音要吐音，弧线外的音也要吐音。');
 function pickNote(i:number){if(done)return;setWrong(false);setFeedback('');setSelected(v=>v.includes(i)?v.filter(n=>n!==i):[...v,i])}
 function check(){const ok=targets.length===selected.length&&targets.every(i=>selected.includes(i));setDone(ok);setWrong(!ok);setFeedback(ok?tr('That matches the markings.','和记号一致。'):hintText)}
 function choose(k:number){
  setPick(k);const ok=k===answer;setDone(ok);setWrong(!ok);
  if(step===1)setFeedback(ok?tr(`Right: ${'AB'[heard]}. Listen to where the sound restarts.`,`对：${'AB'[heard]}。听听声音在哪里重新起头。`):tr('Listen for where the sound stops and starts again: each restart begins a new slur.','听声音在哪里停下又重新开始：每次重新开始就是新的一组连奏。'));
  else setFeedback(ok?(stage===0?tr('Right. The accented note starts harder and louder.','对。重音的音起音更有力、更响。'):tr('Right. The tenuto note lasts right up to the next one.','对。保持音一直持续到下一个音。')):(stage===0?tr('Hear the marked notes: which one starts louder? Its mark is the answer.','听听带记号的音：哪个起音更响？它的记号就是答案。'):tr('Hear the marked notes: which one lasts right up to the next note? Its mark is the answer.','听听带记号的音：哪个一直持续到下一个音？它的记号就是答案。')));
  if(ok&&step===3)hear(stage===0?1:3);
 }
 function next(){reset();if((step===0||step===3||step===4)&&stage===0){setStage(1);return}if(step===4){course.finish('articulation');router.push('/flute-studio/theory');return}jump(step+1)}
 /** Play the row (or, from a selected note, that note with the one before it, so its marking has something to compare with). */
 function hear(from?:number,playSlurs=slurs){
  if(audio.elapsed>=0&&from===undefined){audio.stop();return}
  const events:ArticulationEvent[]=notes.map((n,i)=>({midi:pitchAt(n.p??1).midi,beats:n.v,slurNext:playSlurs.some(s=>i>=s.from&&i<s.to)||(tieDemo&&i===0),mark:marks.find(m=>m.index===i&&m.kind!=='breath')?.kind as ArticulationEvent['mark']}));
  const start=from===undefined?0:Math.max(0,from-1),playing=events.slice(start,from===undefined?events.length:from+1);
  void audio.counted({values:playing.map(e=>e.beats),pitches:playing.map(e=>e.midi),articulation:playing,offset:start,click:false,speak:false,secondsPerQuarter:.65});
 }
 const stages=step===0||step===3||step===4;
 const label=step===4&&stage===1?tr('Finish lesson','完成课程'):stages&&stage===0?tr(['Now a slur →','','','Now the tenuto →','Now the dots →'][step],['接下来：连奏线 →','','','接下来：保持音 →','接下来：断奏点 →'][step]):tr(`Next: ${names[step+1]} →`,`下一步：${names[step+1]} →`);
 const nextButton:LessonNext={label,ready:done,onClick:next};

 let extra:ReactNode;
 if(tapStep)extra=<>
  <button className="measures-secondary" disabled={done||selected.length===0} onClick={check}>{tr('Check','检查')}</button>
  <button className="measures-secondary" aria-pressed={hint} disabled={done} onClick={()=>setHint(h=>!h)}>{hint?tr('Hide hint','收起提示'):tr('Hint','提示')}</button>
 </>;
 else extra=<div className="measures-choices" role="group" aria-label={prompt}>
  {(step===1?[0,1]:[0,1,2]).map(k=><button key={k} disabled={done} className={pick===k?(k===answer?'is-correct':'is-wrong'):''} aria-label={step===3?tr(['Accent','Tenuto','Staccato'][k],['重音','保持音','断奏'][k]):undefined}
   onClick={()=>choose(k)}>{step===1?'AB'[k]:<MarkIcon kind={SIGNS[k]}/>}</button>)}
 </div>;
 const progress=step===1?{done:done?1:0,total:1}:stages?{done:stage+(done?1:0),total:2}:{done:done?1:0,total:1};

 // Step 1 shows both groupings, A and B; the one the learner heard is the answer. Once right, the heard one plays again.
 const row=(rowSlurs:Slur[],extraClass='')=><EngravedRow notes={notes} slurs={rowSlurs} marks={marks} ties={tieDemo?[0]:[]} clef right={step===1?(phone?400:470):right}
  viewBox={`20 35 ${(step===1?(phone?400:470):right)+10} 310`} active={audio.active} interactive className={extraClass}
  label={tapStep?tr('Select notes on the staff','选择谱上的音符'):names[step]}>
  {l=><>{tapStep&&notes.map((_,i)=><g key={i}>{selected.includes(i)&&<circle cx={l.xs[i]} cy={200-(notes[i].p??1)*12} r={25} fill="none" stroke={done?'#678956':'#85868e'} strokeWidth={2}/>}<rect className="dt-hit" x={l.xs[i]-25} y={90} width={50} height={155} role="button" tabIndex={0} aria-label={tr(`Select note ${i+1}`,`选择第 ${i+1} 个音`)} aria-pressed={selected.includes(i)} onClick={()=>pickNote(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pickNote(i)}}}/></g>)}</>}
 </EngravedRow>;
 return <LessonFrame title={tr('Slurs and articulation','连奏与发音')} zh={zh} className="dt-lesson art-lesson" steps={names} current={step} onJump={jump} heading={names[step]} narration={narration} fadeNarration
 status={audio.error?tr('Sound could not start. Tap Hear to retry.','声音没能启动，请再点一次播放。'):undefined} message={feedback||(hint&&tapStep?hintText:prompt)} tone={done?'correct':wrong?'wrong':null}
 next={nextButton} extra={extra} progress={progress}>
 <div className={`dt-scene-content dt-transformed${hint?' is-hint':''}`} key={`${step}-${stage}`}>
  {step===1?<div className="art-pair">{GROUPINGS.map((g,k)=><figure key={k} className={done&&k===heard?'is-heard':''}><figcaption>{'AB'[k]}</figcaption>{row(g)}</figure>)}</div>:row(slurs)}
  <div className="lesson-tools">
   <button className="lesson-playback-button" onPointerUp={e=>e.currentTarget.blur()} onClick={()=>step===1?hear(undefined,GROUPINGS[heard]):hear()}>
    <span aria-hidden={audio.elapsed>=0} style={{visibility:audio.elapsed>=0?'hidden':'visible'}}>{step===1?tr('Hear it','听一听'):step===2?tr('Hear the detached note','听断奏的音'):step===3?tr('Hear the marked notes','听有记号的音'):tr('Hear how the notes connect','听音符如何连接')}</span>
    <span aria-hidden={audio.elapsed<0} style={{visibility:audio.elapsed<0?'hidden':'visible'}}>{tr('Stop','停止')}</span>
   </button>
   {tapStep&&<button disabled={selected.length!==1} onClick={()=>hear(selected[0])}>{tr('Hear selected note','听选中的音')}</button>}
  </div>
 </div>
 </LessonFrame>;
}
