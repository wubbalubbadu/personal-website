'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import Staff from './Staff';
import LedgerExplorer from './LedgerExplorer';
import LessonDiagram from './LessonDiagram';
import {sceneNotes} from './sequence';
import ClefTracing from './ClefTracing';
import KeyboardComposer from './KeyboardComposer';
import NotePractice from './NotePractice';
import {pitchAt,clampPosition,matchesMelody,PITCHES,SOLFEGE} from './model';
import {useLessonAudio} from './useLessonAudio';
import {useLessonSave} from './useLessonSave';
import {useCourseProgress} from './useCourseProgress';
import {useLanguage} from '../i18n/LanguageContext';
import {LESSON_COPY} from './lessonCopy';
import './theory.css';
import './lesson-frame.css';

const TWINKLE=[-2,-2,2,2,3,3,2];
const ORDER=[0,1,2,3,9,5,4,7,6,8];
export default function FirstNotes(){
  const {data,setData,ready,saving}=useLessonSave(true),course=useCourseProgress();
  const {lang}=useLanguage(),zh=lang==='zh',tr=(en:string,cn:string)=>zh?cn:en;
  const {step,phrase}=data,copy=[...LESSON_COPY[lang],{name:tr('Your melody','你的旋律'),body:tr('Choose four pitches and listen to your own phrase.','选四个音，听听自己的旋律。')},{name:tr('Play the keyboard','弹弹键盘'),body:tr('Play four white keys and watch your melody appear on the staff.','弹四个白键，看看旋律怎样写在五线谱上。')}];
  const [position,setPosition]=useState(2),[highlight,setHighlight]=useState<number|null>(null),[selected,setSelected]=useState(0);
  const [edits,setEdits]=useState<Record<string,number>>({}),[keyboardPitch,setKeyboardPitch]=useState<number|null>(null);
  const [melody,setMelody]=useState<(number|null)[]>(Array(TWINKLE.length).fill(null));
  const [keyboardCount,setKeyboardCount]=useState(0),[method,setMethod]=useState<number|null>(null),[sceneRun,setSceneRun]=useState(0);
  const [round,setRound]=useState(0),[result,setResult]=useState<boolean|null>(null),[detail,setDetail]=useState(''),[finished,setFinished]=useState(false);
  const story=useRef<HTMLOListElement|null>(null),audio=useLessonAudio();
  const nextReady=step===7?round===4&&result===true:step===9?keyboardCount===4:step===4?method!==null:result===true;
  const free=step===8,composing=step===6||free,currentPhrase=free?phrase.map((p,i)=>p??[0,2,4,2][i]):melody;
  const question=[
    tr('Drag the note from its box onto G (sol), the second line.','把框里的音符拖到第二线的 G（sol）。'),
    tr('Drag the note onto C (do) inside the five staff lines.','把音符拖到五条谱线范围内的 C（do）。'),
    tr('What is the name of this note?','这个音符叫什么？'),
    tr('Which note does the treble clef’s curl mark?','高音谱号的内圈标记的是哪个音？'),
    tr('Which note sounds higher? Tap it.','哪个音更高？点一下。'),
  ][round];
  const heard=PITCHES.find(p=>p.midi===keyboardPitch);
  const summaries=[tr('F A C E, from bottom to top.','从下往上：F A C E。'),tr('E G B D F: skip a letter each time.','E G B D F：每次隔一个字母。'),tr('G → A → B: line, space, line.','G → A → B：线、间、线。')];
  const teaching=step===7?tr(`Question ${round+1} of 5`,`第 ${round+1} 题，共 5 题`):step===4?tr('Use a pattern or a familiar note to find the others.','记住排列规律，或从熟悉的音找其他音。'):step===1?result===true?tr('A line passes through a note’s center. A space holds it between two lines.','在线上的音符被线穿过中心，在间里的音符位于两条线之间。'):tr('There are four spaces between the five lines.','五条线之间有四个间。'):step===9?tr('Each key has a fixed pitch. Playing it writes that pitch on the staff.','每个琴键对应一个音高。弹下琴键，就把这个音高写在谱上。'):copy[step]?.body??'';
  let prompt=step===0?tr('Hi, I’m Cookie! I’ll guide you and give you little challenges. Try tapping the second line.','你好，我是 Cookie！我会陪你学习，也会出些小练习。试着点一下第二线。'):step===1?tr('Can you find the second space? Tap between the lines.','你能找到第二间吗？点一下两条线之间。'):step===2?tr('Let’s draw a treble clef. Start at the inner curl and follow the dotted shape.','我们来画高音谱号。从里面的小弯开始，沿着虚线画。'):step===3?(heard?tr(`That’s ${heard.name} (${SOLFEGE[heard.name]}). Try another key or drag a note.`,`这是 ${heard.name}（${SOLFEGE[heard.name]}）。试试另一个键，或拖动音符。`):tr('Tap a key to hear its note. In fixed-do, C is do and A is la.','点一个琴键听它的音。固定唱名中，C 是 do，A 是 la。')):step===9?(keyboardCount===4?tr('Four notes! Listen to your phrase, or play another key to change its last note.','四个音写好了！听听旋律，或再弹一个键改变最后一个音。'):tr('Play four white keys. Each key adds a note to your phrase.','弹四个白键。每弹一个键，就为旋律加上一个音。')):step===5?tr('Slide left for lower notes, right for higher notes. Tap a note to hear it.','向左滑看低音，向右滑看高音。点音符听一听。'):step===4?(method===null?tr('Choose a method to see it on the staff.','选一个方法，看看它在谱上的样子。'):summaries[method]):step===7?question:free?tr('Drag these four notes to make your own melody.','拖动这四个音符，写出自己的旋律。'):tr('Place these seven notes from left to right, then listen.','从左到右放入这七个音，再听一听。');
  if(result===true)prompt='👍 '+(step===1&&highlight!==3?tr('Try another line or space and compare the note’s position.','试试其他线或间，比较音符的位置。'):step===1?tr('That’s the second space. Now tap a line or space to move the note and compare.','找到了第二间！现在点其他线或间，移动音符，比较一下。'):step===2?tr('The curl wraps around the second line: G, or sol. That’s why it’s also called the G clef.','内圈围绕第二线的 G，也就是 sol，所以它也叫 G 谱号。'):step===7?tr('Correct!','答对了！'):tr('You found it!','你找到了！'));
  if(result===false)prompt=detail||(step===2?tr('Add a little more of the dotted shape.','沿着虚线再补上一些。'):step===6?tr('Compare the notes with the names underneath, then drag the ones you want to change.','对照下面的音名，拖动需要调整的音符。'):step===7?tr('Try again. Use the lines, spaces, or the G-clef anchor.','再试试。可以利用线、间的规律，或第二线的 G。'):tr('Try again. Count from the bottom.','再试试，从下往上数。'));
  if(finished)prompt=tr('👍 Lesson complete. You can return to explore any part again.','👍 课程完成！你可以随时回来复习。');
  useEffect(()=>{if(!ready)return;const frame=requestAnimationFrame(()=>window.dispatchEvent(new CustomEvent('cookie:lesson',{detail:prompt})));return()=>{cancelAnimationFrame(frame);window.dispatchEvent(new CustomEvent('cookie:lesson',{detail:''}))}},[prompt,ready]);
  useEffect(()=>{if(!ready)return;const frame=requestAnimationFrame(()=>{const list=story.current,row=list?.querySelector<HTMLElement>('[aria-current="step"]');if(list&&row)list.scrollTo({top:row.offsetTop-list.clientHeight/2+row.clientHeight/2,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})});return()=>cancelAnimationFrame(frame)},[ready,step]);
  function navigate(next:number){audio.stop();setData(old=>({...old,step:next}));setPosition(next===5?-2:2);setSceneRun(v=>v+1);setHighlight(null);setRound(0);setResult(null);setDetail('');setEdits({});setSelected(0);setKeyboardPitch(null);setKeyboardCount(0);setFinished(false);if(next===3)void audio.play([0,1,2,3,4,5,6,7],.55)}
  function changePosition(value:number,slot=selected){const next=clampPosition(value);setPosition(next);setResult(null);if(composing&&!free)setMelody(old=>old.map((p,i)=>i===slot?next:p));if(free)setData(old=>({...old,phrase:old.phrase.map((p,i)=>i===slot?next:p??[0,2,4,2][i])}));void audio.play([next],.42,composing?slot:0)}
  const current=ORDER.indexOf(step);
  if(!ready)return <main className="theory-shell"><p>{tr('Loading…','加载中…')}</p></main>;
  return <main className="theory-shell theory-lesson lesson-frame">
    <h1>{tr('The staff and notes','五线谱与音符')}</h1>
    <nav className="theory-timeline" aria-label={tr('Lesson topics','课程主题')}>{[0,2,3,9,5,4,7,6,8].map((n,i)=><button key={n} aria-current={step===n||(n===0&&step===1)?'step':undefined} onClick={()=>navigate(n)}>{[tr('Staff','五线谱'),tr('Clef','谱号'),tr('Note names','音名'),tr('Keyboard','键盘'),tr('Ledger lines','加线'),tr('Remember','记音'),tr('Practice','练习'),tr('Twinkle','小星星'),tr('Your melody','你的旋律')][i]}</button>)}</nav>
    <section className={`theory-paper first-stage${step===7?' is-practice':''}`} aria-label={tr('Interactive notation','交互曲谱')}>
      <p className="theory-scene-copy">{teaching}</p>
      <div className="first-visual">
        {step===2?<ClefTracing zh={zh} onReset={()=>setResult(null)} onIncomplete={()=>setResult(false)} onComplete={()=>{setResult(true);void audio.play([2],.85)}}/>:step===5?<LedgerExplorer zh={zh} onHear={midi=>void audio.play([midi],.65,0,true)}/>:step===9?<KeyboardComposer zh={zh} playing={audio.playing} onPlay={(notes,offset=0)=>void audio.play(notes,.65,offset)} onStop={audio.stop} onSave={notes=>{setKeyboardCount(notes.filter(p=>p!==null).length);setData(old=>({...old,phrase:notes}))}}/>:step===7?<NotePractice key={round} round={round} zh={zh} onAnswer={(correct,why)=>{setResult(correct);setDetail(why??'')}} onHear={p=>void audio.play([p])}/>:step===3||step===4?<LessonDiagram focusPitch={null} memory={step===4?method??-1:-1} key={`${step}-${sceneRun}`} step={6} keyboard={step===3} edits={edits} active={keyboardPitch===null?audio.playing:-1} keyboardPitch={audio.playing<0?null:keyboardPitch??(sceneNotes(6)[audio.playing]?pitchAt(edits[sceneNotes(6)[audio.playing].id]??sceneNotes(6)[audio.playing].position).midi:null)} zh={zh} onMove={(id,p)=>setEdits(old=>({...old,[id]:p}))} onHear={(p,index)=>{setKeyboardPitch(pitchAt(p).midi);void audio.play([p],.45,index)}} onKey={midi=>{setKeyboardPitch(midi);void audio.play([midi],.5,0,true)}}/>:<Staff showPlacement={step===1&&result===true} onCommit={(p,slot)=>{if(step===6){const notes=melody.map((value,i)=>i===slot?p:value);setResult(notes.every(value=>value!==null)?matchesMelody(notes,TWINKLE):null)}}} targets={step===6?TWINKLE:undefined} key={step} step={composing?5:step===1?1:0} position={position} phrase={currentPhrase} selected={selected} playing={audio.playing} highlight={highlight} labels={composing} solfege zh={zh} onPosition={changePosition} onHighlight={p=>{setHighlight(p);if(step===0)setResult(p===2);else if(step===1&&result!==true)setResult(p===3)}} onSelect={setSelected}/>}
      </div>
      <div className="first-controls">
        {step===4&&<div className="theory-memory-methods">{[tr('Space notes','记住间'),tr('Line notes','记住线'),tr('Find a neighbor','找相邻音')].map((title,i)=><button key={title} aria-pressed={method===i} onClick={()=>{setMethod(i);setSceneRun(v=>v+1)}}><strong>{title}</strong><span>{summaries[i]}</span></button>)}</div>}
        {composing&&<button disabled={!free&&melody.some(p=>p===null)} onClick={()=>audio.playing>=0?audio.stop():void audio.play(currentPhrase as number[])}>{audio.playing>=0?tr('Stop','停止'):tr('Listen','听一听')}</button>}
        {step===7&&<button className={result===true&&round<4?'lesson-next-ready':undefined} disabled={result!==true||round===4} onClick={()=>{audio.stop();setRound(r=>r+1);setResult(null);setDetail('')}}>{round===4&&result===true?tr('Five questions complete ✓','五题完成 ✓'):tr('Next question →','下一题 →')}</button>}
      </div>
      <div className="first-status" role="status">{audio.error||(!saving?tr('Progress cannot be saved in this browser.','此浏览器无法保存进度。'):'')}</div>
      <div id="lesson-companion" className={result===true?'lesson-success':''}/>
    </section>
    <footer className="lesson-navigation"><button disabled={current===0} onClick={()=>navigate(ORDER[current-1])}>{current?`← ${copy[ORDER[current-1]].name}`:tr('Previous','上一步')}</button><span>{current+1} / {ORDER.length}</span>{step!==8?<button className={nextReady?'lesson-next-ready':undefined} onClick={()=>navigate(ORDER[current+1])}>{({0:tr('Find the spaces','找找间'),1:tr('Meet the treble clef','认识高音谱号'),2:tr('Name the notes','认识音名'),3:tr('Play the keyboard','弹弹键盘'),9:tr('Extend the staff','延伸五线谱'),5:tr('Remember the notes','记住音的位置'),4:tr('Try five questions','试试五道练习'),7:tr('Build Twinkle, Twinkle','写出小星星'),6:tr('Make your own melody','写自己的旋律')} as Record<number,string>)[step]} →</button>:finished?<Link href="/flute-studio/theory">{tr('Theory lessons','乐理课')} →</Link>:<button onClick={()=>{audio.stop();course.finish('staff');setData(old=>({...old,completed:true}));setFinished(true)}}>{tr('Finish lesson','完成课程')} →</button>}</footer>
    <ol className="theory-story" ref={story} aria-label={tr('Lesson explanation','课程讲解')}>{ORDER.map(index=><li key={index}><button aria-current={step===index?'step':undefined} onClick={()=>navigate(index)}>{index===7?tr('Five questions: place, name, and compare notes.','五道练习：放置、认音名、比较高低。'):copy[index].body}</button></li>)}</ol>
  </main>;
}
