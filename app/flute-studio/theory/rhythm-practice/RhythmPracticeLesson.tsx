'use client';
import {useCallback,useState} from 'react';
import {useRouter} from 'next/navigation';
import LessonFrame from '../LessonFrame';
import EngravedRow from '../EngravedRow';
import {useLanguage} from '../../i18n/LanguageContext';
import {useCourseProgress} from '../useCourseProgress';
import {usePhoneNotation} from '../usePhoneNotation';
import {useRhythmAudio} from '../rhythm/useRhythmAudio';
import RhythmPractice from '../dots-and-ties/RhythmPractice';
import {compileRhythm} from '../dots-and-ties/rhythmSequence';
import {splitBeat,TRIPLET_PRACTICE,MIXED_PRACTICE} from './patterns';
import '../theory.css';
import '../measures/measures.css';
import '../dots-and-ties/dots-and-ties.css';

export default function RhythmPracticeLesson(){
 const {lang}=useLanguage(),zh=lang==='zh',tr=(a:string,b:string)=>zh?b:a;
 const router=useRouter(),course=useCourseProgress(),audio=useRhythmAudio(),phone=usePhoneNotation();
 const [step,setStep]=useState(0),[count,setCount]=useState<2|3|5>(2),[seen,setSeen]=useState<number[]>([2]);
 const [answer,setAnswer]=useState<number|null>(null),[round,setRound]=useState(0),[attempt,setAttempt]=useState(false);
 const [feedback,setFeedback]=useState(''),[tone,setTone]=useState<'correct'|'wrong'|null>(null);
 const [spot,setSpot]=useState<HTMLElement|null>(null),[pulse,setPulse]=useState(0);
 const tapped=useCallback(()=>setPulse(p=>p+1),[]);
 const right=phone?520:820,frame=`20 45 ${right+10} 310`;
 const names=[tr('Two or three','二等分与三等分'),tr('One beat','一拍'),tr('Try triplets','试试三连音'),tr('Other tuplets','其他连音'),tr('Rhythm practice','节奏练习')];
 function jump(n:number){audio.stop();setStep(n);setAnswer(null);setFeedback('');setTone(null);setAttempt(false);setRound(0);setCount(n===3?5:n===1?3:2)}
 const practice=step===2||step===4;
 const pattern=step===2?TRIPLET_PRACTICE:step===4?MIXED_PRACTICE[round]:splitBeat(step===1?3:count);
 const data=compileRhythm(pattern);
 const narration=[
 tr('A beat can hold two equal eighth notes, or three equal triplet eighth notes. The beat stays the same length.','一拍可以分成两个八分音符，也可以分成三个均匀的八分三连音。拍子的长度不变。'),
 tr('The 3 says: play these three eighth notes in the time normally taken by two. Together, they fill one quarter-note beat.','数字 3 表示：用通常两个八分音符的时间演奏三个。它们一共占一拍。'),
 tr('Keep the beat steady while three notes fit inside it. Tap each note start, not the spaces between them.','保持拍子稳定，把三个音均匀放进一拍。每个音开始时点一下。'),
 tr('A tuplet fits equal notes into a stated span. The 5 says: five sixteenth notes in the time normally taken by fewer.','连音把均匀的音放进指定时值。数字 5 表示：用通常更少几个音的时间演奏五个十六分音符。'),
 tr('Read the whole rhythm: keep counting through rests, and do not tap a tied continuation.','读完整个节奏：休止时继续数拍，延音线后的持续音不再点一次。')
 ][step];
 const question=step===1?tr('How many beats does the group marked 3 fill?','标着 3 的这一组一共占几拍？'):step===3?tr('Normally, how many sixteenth notes fill one beat?','平常一拍里有几个十六分音符？'):tr('Switch between two and three. Notice that beat 2 stays in the same place.','切换二等分和三等分，注意第 2 拍的位置不变。');
 const correct=step===1?1:4;
 function choose(n:number){setAnswer(n);setTone(n===correct?'correct':'wrong');setFeedback(n===correct?(step===3?tr('Four. The 5 fits five into the time of four, so the beat keeps its length.','四个。数字 5 把五个音放进四个音的时间，所以一拍的长度不变。'):tr('One beat. The number of notes changes, but the beat keeps its length.','一拍。音符数量改变了，拍子的长度没有变。')):step===3?tr('Two eighth notes fill one beat, and each eighth splits into two sixteenths.','两个八分音符占一拍，每个八分音符又分成两个十六分音符。'):tr('Look at the counts: the whole group ends when beat 2 begins.','看拍数：整组在第 2 拍开始时结束。'))}
 const ready=practice?attempt:step===0?seen.includes(3):answer===correct;
 function next(){audio.stop();if(step===4&&round<2){setRound(r=>r+1);setAttempt(false);setFeedback('');setTone(null);return}if(step===4){course.finish('tuplets');router.push('/flute-studio/theory');return}jump(step+1)}
 function hear(){if(audio.elapsed>=0){audio.stop();return}void audio.counted({values:data.notes.map(n=>n.v),timeline:data.timeline,top:2,speak:false,secondsPerQuarter:.85})}
 return <LessonFrame title={tr('Triplets','三连音')} zh={zh} className="dt-lesson" steps={names} current={step} onJump={jump} heading={names[step]} narration={narration} fadeNarration
 status={audio.error?tr('Sound could not start. Tap Hear to retry.','声音没能启动，请再点一次播放。'):undefined} message={feedback||(practice?tr('Tap Count me in, then tap Cookie or press Space on each new note.','点“数拍开始”，然后在每个新音开始时点 Cookie 或按空格。'):question)} tone={tone}
 cookieAway={practice?{slot:spot,pulse}:null} progress={step===4?{done:round,total:3}:undefined}
 next={{label:step===4?(round===2?tr('Finish lesson','完成课程'):tr('Next rhythm →','下一个节奏 →')):tr(`Next: ${names[step+1]} →`,`下一步：${names[step+1]} →`),ready,onClick:next}}
 extra={!practice&&step>0?<div className="measures-choices" role="group" aria-label={question}>{(step===1?[1,2,3]:[3,4,5]).map(n=><button key={n} disabled={answer===correct} className={answer===n?(n===correct?'is-correct':'is-wrong'):''} onClick={()=>choose(n)}>{n}</button>)}</div>:undefined}>
 {practice?<RhythmPractice key={pattern.id} pattern={pattern} zh={zh} right={right} frame={frame} onAttempt={()=>setAttempt(true)} onFeedback={(s,t)=>{setFeedback(s);setTone(t??null)}} onSpot={setSpot} onTapped={tapped}/>:
 <div className="dt-scene-content"><EngravedRow proportional clef={false} notes={data.notes} beams={pattern.beams} tuplets={pattern.tuplets} meter={{top:2,bottom:4}} right={right} viewBox={frame} active={audio.active}>
 {l=><>{[0,1].map(b=><text key={b} className="dt-count" x={l.beatX(b)} y={248}>{b+1}</text>)}{(step===0||answer===correct)&&<g className="dt-duration-join"><path d={`M${l.beatX(0)} 275 v10 H${l.beatX(1)} v-10`}/><text x={(l.beatX(0)+l.beatX(1))/2} y={312}>{tr('1 beat','1 拍')}</text></g>}</>}
 </EngravedRow><div className="lesson-tools rhythm-demo-tools">
 {step===0&&([2,3] as const).map(n=><button key={n} aria-pressed={count===n} onPointerUp={e=>e.currentTarget.blur()} onClick={()=>{audio.stop();setCount(n);setSeen(v=>v.includes(n)?v:[...v,n])}}>{n===2?tr('Two','二等分'):tr('Three','三等分')}</button>)}
 <button className="lesson-playback-button" onPointerUp={e=>e.currentTarget.blur()} onClick={hear}><span aria-hidden={audio.elapsed>=0} style={{visibility:audio.elapsed>=0?'hidden':'visible'}}>{tr('Hear the beat stay steady','听稳定的拍子')}</span><span aria-hidden={audio.elapsed<0} style={{visibility:audio.elapsed<0?'hidden':'visible'}}>{tr('Stop','停止')}</span></button>
 </div></div>}
 </LessonFrame>
}
