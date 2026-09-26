'use client';
import {useState,type ReactNode} from 'react';
import Staff from './Staff';
import LedgerExplorer from './LedgerExplorer';
import LessonDiagram from './LessonDiagram';
import ClefTracing from './ClefTracing';
import ClefCompare,{CLEFS,type ClefName} from './ClefCompare';
import NotePractice from './NotePractice';
import LessonFrame,{type LessonNext} from './LessonFrame';
import {sceneNotes,notationPitch} from './sequence';
import {pitchAt,clampPosition,matchesMelody,SOLFEGE} from './model';
import {makePractice,makeCheck,countFrom,type Question} from './questions';
import {useLessonAudio} from './useLessonAudio';
import {useLessonSave} from './useLessonSave';
import {useCourseProgress} from './useCourseProgress';
import {useLanguage} from '../i18n/LanguageContext';
import './theory.css';

const TWINKLE=[-2,-2,2,2,3,3,2];
const FREE_START=[0,2,4,2];
// The notes each finding method shows, bottom to top (must match LessonDiagram's memory rows).
const METHOD_NOTES=[[1,3,5,7],[0,2,4,6,8],[2,3,4]];
// The order of the lesson. Reordering is moving an id here; each step's content is keyed by id below.
export const FLOW=['staff','spaces','notes','clef','clefs','names','find','practice','ledger','twinkle','check','free'] as const;
type StepId=typeof FLOW[number];
type Quiz={questions:Question[];round:number;correct:boolean|null;missed:boolean;firstTry:number;hint:string};
const emptyQuiz=(questions:Question[]=[]):Quiz=>({questions,round:0,correct:null,missed:false,firstTry:0,hint:''});
const midiOf=(position:number)=>notationPitch(position).midi;

export default function FirstNotes(){
  const {data,setData,ready,saving}=useLessonSave(true),course=useCourseProgress(),audio=useLessonAudio();
  const {lang}=useLanguage(),zh=lang==='zh',tr=(en:string,cn:string)=>zh?cn:en;
  const step=Math.min(data.step,FLOW.length-1),id:StepId=FLOW[step];
  const [result,setResult]=useState<boolean|null>(null),[highlight,setHighlight]=useState<number|null>(null);
  const [method,setMethod]=useState<number|null>(null),[sceneRun,setSceneRun]=useState(0);
  const [edits,setEdits]=useState<Record<string,number>>({}),[keyboardPitch,setKeyboardPitch]=useState<number|null>(null);
  const [melody,setMelody]=useState<(number|null)[]>(Array(TWINKLE.length).fill(null)),[selected,setSelected]=useState(0);
  const [quiz,setQuiz]=useState<Quiz>(emptyQuiz()),[passed,setPassed]=useState(false);
  const [notePos,setNotePos]=useState(3),[clef,setClef]=useState<ClefName>('treble'),[seenOtherClef,setSeenOtherClef]=useState(false);
  const note=(p:number)=>`${notationPitch(p).name} (${SOLFEGE[notationPitch(p).name]})`;
  const dots=[tr('Staff','五线谱'),tr('Spaces','间'),tr('Notes','音符'),tr('Clef','谱号'),tr('Other clefs','其他谱号'),tr('Note names','音名'),tr('Finding notes','找音'),tr('Practice','练习'),tr('Ledger lines','加线'),tr('Twinkle','小星星'),tr('Read new notes','认新音'),tr('Free play','自由写')];

  function go(next:number){
    audio.stop();setData(old=>({...old,step:next}));
    setResult(null);setHighlight(null);setMethod(null);setSceneRun(v=>v+1);setEdits({});setKeyboardPitch(null);setSelected(0);setPassed(false);
    setNotePos(3);setClef('treble');setSeenOtherClef(false);
    const target=FLOW[next];
    setQuiz(emptyQuiz(target==='practice'?makePractice():target==='check'?makeCheck():[]));
    if(target==='twinkle')setMelody(Array(TWINKLE.length).fill(null));
    if(target==='names')void audio.play([0,1,2,3,4,5,6,7],.55);
  }
  const hear=(p:number,duration=.6)=>void audio.play([midiOf(p)],duration,0,true);

  // Practice and the final check share one answer handler. A miss leaves the round open with a hint.
  function answer(correct:boolean){
    const q=quiz.questions[quiz.round];
    let hint='';
    if(!correct){
      hint=q.position===2?tr('Remember the clef’s curl? G is the line it wraps around, the second one.','还记得谱号的内圈吗？G 就是它绕着的那条线，第二线。')
        :q.position===-2?tr('Not quite. Middle C sits on the first ledger line below the staff.','还不对。中央 C 在五线谱下面第一条加线上。')
        :q.position<-2?tr(`Not quite. Count down from middle C on the first ledger line: ${countFrom(-2,q.position)}.`,`还不对。从第一条加线上的中央 C 往下数：${countFrom(-2,q.position)}。`)
        :q.position>8?tr(`Not quite. Count up from F on the top line: ${countFrom(8,q.position)}.`,`还不对。从最上面一线的 F 往上数：${countFrom(8,q.position)}。`)
        :tr(`Not quite. Count from G on the second line: ${countFrom(2,q.position)}.`,`还不对。从第二线的 G 开始数：${countFrom(2,q.position)}。`);
    }
    const firstTry=quiz.firstTry+(correct&&!quiz.missed?1:0);
    setQuiz(old=>({...old,correct,missed:old.missed||!correct,firstTry,hint}));
    const last=quiz.round===quiz.questions.length-1;
    if(correct&&last&&id==='check'&&firstTry>=3){setPassed(true);course.finish('staff');setData(old=>({...old,completed:true}))}
  }
  const nextRound=()=>{audio.stop();setQuiz(old=>({...old,round:old.round+1,correct:null,missed:false,hint:''}))};

  function movePhrase(value:number,slot=selected){
    const next=clampPosition(value);
    if(id==='twinkle')setMelody(old=>old.map((p,i)=>i===slot?next:p));
    else setData(old=>({...old,phrase:old.phrase.map((p,i)=>i===slot?next:p??FREE_START[i])}));
    void audio.play([next],.42,slot);
  }

  const toNext=():LessonNext=>({label:tr(`Next: ${dots[step+1]}`,`下一步：${dots[step+1]}`)+' →',ready:false,onClick:()=>go(step+1)});
  const q=quiz.questions[quiz.round],last=quiz.round===quiz.questions.length-1;
  // narration explains the idea above the music; message is Cookie: what to try, then how it went.
  let narration:ReactNode='',message:ReactNode='',tone:'correct'|'wrong'|null=null,next:LessonNext|null=toNext(),scene:ReactNode=null;
  const markDone=()=>{next={...next!,ready:true}};

  switch(id){
    case 'staff':
      narration=tr('Music is written on a staff: five lines, counted from the bottom up. Each line stands for a different pitch.','音乐写在五线谱上：五条线，从下往上数。每条线代表一个不同的音高。');
      message=result?tr('Yes, that’s line 2! Tap the others too. Can you hear the higher lines sound higher?','对，这就是第二线！再点点其他线。听出来了吗？越高的线，声音越高。'):tr('Can you tap the second line?','你能点一下第二线吗？');
      if(result){tone='correct';markDone()}
      scene=<Staff step={0} position={2} phrase={[]} selected={0} playing={-1} highlight={highlight} labels={false} solfege zh={zh} onPosition={()=>{}} onSelect={()=>{}}
        onHighlight={p=>{setHighlight(p);hear(p);if(p===2)setResult(true)}}/>;
      break;
    case 'spaces':
      narration=tr('Between the five lines are four spaces. We count them from the bottom too.','五条线之间有四个间，也是从下往上数。');
      message=result?tr('That’s space 2! Tap the other spaces and listen.','这是第二间！点点其他的间，听一听。'):tr('Can you find the second space?','你能找到第二间吗？');
      if(result){tone='correct';markDone()}
      scene=<Staff step={1} position={2} phrase={[]} selected={0} playing={-1} highlight={highlight} labels={false} solfege zh={zh} onPosition={()=>{}} onSelect={()=>{}}
        onHighlight={p=>{setHighlight(p);hear(p);if(p===3)setResult(true)}}/>;
      break;
    case 'notes':
      narration=tr('A note can sit on a line or in a space. Each step up, line then space then line, is a slightly higher pitch. None are skipped.','音符可以在线上，也可以在间里。每往上一格，线、间、线，音就高一点，一个都不跳过。');
      message=tr('Here’s a note in space 2. Drag it up and down and listen.','这是一个在第二间的音符。上下拖动它，听一听。');
      markDone();
      scene=<Staff step={3} clef={false} caption position={notePos} phrase={[]} selected={0} playing={-1} highlight={null} labels={false} solfege zh={zh}
        onPosition={p=>{setNotePos(p);hear(p)}} onHighlight={()=>{}} onSelect={()=>{}}/>;
      break;
    case 'clef':
      narration=tr('Every staff starts with a clef. It tells you which note each line stands for.','每行谱的开头都有一个谱号。它告诉你每条线代表哪个音。');
      message=result?tr('You drew it! See how the curl wraps around the second line? That line is G (sol), so this is also called the G clef.','画好了！看到内圈绕着第二线了吗？那条线是 G（sol），所以它也叫 G 谱号。')
        :result===false?tr('Almost! Keep following the dots a little further.','差一点！沿着虚线再画长一点。'):tr('Let’s draw the treble clef. Start at the little inner curl and follow the dots.','我们来画高音谱号。从里面的小圈开始，沿着虚线画。');
      tone=result?'correct':result===false?'wrong':null;
      if(result)markDone();
      scene=<ClefTracing key={sceneRun} zh={zh} onReset={()=>setResult(null)} onIncomplete={()=>setResult(false)} onComplete={()=>{setResult(true);hear(2,.85)}}/>;
      break;
    case 'clefs':{
      narration=({
        treble:tr('The treble clef is also called the G clef: its curl wraps around the G line. Flute, violin, oboe, clarinet, saxophone and trumpet all read it.','高音谱号也叫 G 谱号：它的内圈绕着 G 线。长笛、小提琴、双簧管、单簧管、萨克斯和小号都用它。'),
        bass:tr('The bass clef is the F clef: its two dots sit on either side of the F line. Cello, bassoon, trombone, tuba and the piano’s left hand read it.','低音谱号是 F 谱号：两个点夹着 F 线。大提琴、大管、长号、大号和钢琴的左手用它。'),
        alto:tr('The alto clef is a C clef: its middle points at middle C. The viola reads it.','中音谱号是 C 谱号：它的中间指着中央 C。中提琴用它。'),
      })[clef];
      const {letter}=CLEFS[clef];
      message=clef!=='treble'?tr(`This clef marks ${letter}, so every line and space means something different. That’s why you check the clef first.`,`这个谱号标出的是 ${letter}，所以每条线、每个间的意思都变了。读谱要先看谱号。`)
        :seenOtherClef?tr('Back to G. In these lessons we’ll stay in treble clef, the one flute, clarinet and sax read.','回到 G 了。这门课我们只用高音谱号，长笛、单簧管和萨克斯读的就是它。')
        :tr('The treble clef isn’t the only one. Tap Bass or Alto to see which note each one marks.','高音谱号不是唯一的谱号。点“低音谱号”或“中音谱号”，看看它们各自标出哪个音。');
      markDone();
      scene=<ClefCompare clef={clef} zh={zh} onClef={name=>{setClef(name);if(name!=='treble')setSeenOtherClef(true)}} onHear={midi=>void audio.play([midi],.7,0,true)}/>;
      break;
    }
    case 'names':{
      narration=tr('Notes are named with seven letters, A to G, and then they start over. Listen to the two Es here: the top one sounds like the bottom one, only higher. That distance is called an octave.','音名只用七个字母，A 到 G，然后重新开始。听听这里的两个 E：上面的和下面的很像，只是更高。这个距离叫八度。');
      const heard=keyboardPitch===null?null:[0,1,2,3,4,5,6,7].map(notationPitch).find(p=>p.midi===keyboardPitch);
      message=heard?tr(`That’s ${heard.name} (${SOLFEGE[heard.name]}). ${heard.name==='E'?'Now try the other E!':'Try a few more.'}`,`这是 ${heard.name}（${SOLFEGE[heard.name]}）。${heard.name==='E'?'再试试另一个 E！':'多试几个。'}`)
        :tr('Tap a key or a note to hear it.','点琴键或音符听一听。');
      markDone();
      const demo=sceneNotes(6);
      scene=<LessonDiagram key={`names-${sceneRun}`} step={6} keyboard edits={edits} zh={zh} active={keyboardPitch===null?audio.playing:-1}
        keyboardPitch={audio.playing<0?null:keyboardPitch??(demo[audio.playing]?pitchAt(edits[demo[audio.playing].id]??demo[audio.playing].position).midi:null)}
        onMove={(key,p)=>setEdits(old=>({...old,[key]:p}))} onHear={(p,index)=>{setKeyboardPitch(pitchAt(p).midi);void audio.play([p],.45,index)}} onKey={midi=>{setKeyboardPitch(midi);void audio.play([midi],.5,0,true)}}/>;
      break;
    }
    case 'find':{
      const methods=[
        {title:tr('Space notes','间里的音'),short:'F A C E',more:tr('The four spaces spell F A C E, bottom to top. Easy to remember: it spells FACE.','四个间从下往上是 F A C E，拼起来就是英文单词 FACE。')},
        {title:tr('Line notes','线上的音'),short:'E G B D F',more:tr('The five lines are E G B D F. Many people remember them as Every Good Boy Does Fine.','五条线是 E G B D F。英文里常用 Every Good Boy Does Fine 来记。')},
        {title:tr('Count from G','从 G 数'),short:'G, A, B',more:tr('Start from a note you know, like the clef’s G line, and step up or down: line, space, line. G, A, B.','从熟悉的音出发，比如谱号的 G 线，往上或往下一格一格数：线、间、线，G、A、B。')},
      ];
      narration=method===null?tr('Counting from the bottom every time is slow. Readers use a few shortcuts instead.','每次都从最下面数太慢了。识谱时大家会用几个小方法。'):methods[method].more;
      message=method===null?tr('Pick one to see and hear it on the staff.','选一个，看看、听听它在谱上的样子。'):tr('Tap a note to hear it again. Try the others too, and keep whichever sticks.','点音符可以再听一次。也试试别的，留下你最记得住的。');
      if(method!==null)markDone();
      scene=<>
        <LessonDiagram key={`find-${sceneRun}`} step={6} draggable={false} memory={method??-1} edits={{}} active={audio.playing} keyboardPitch={null} zh={zh} onMove={()=>{}} onHear={(p,index)=>void audio.play([p],.5,index)} onKey={()=>{}}/>
        <div className="theory-memory-methods">{methods.map((m,i)=><button key={i} aria-pressed={method===i} onClick={()=>{setMethod(i);setSceneRun(v=>v+1);void audio.play(METHOD_NOTES[i],.5)}}><strong>{m.title}</strong><span>{m.short}</span></button>)}</div>
      </>;
      break;
    }
    case 'practice':
    case 'check':{
      const isCheck=id==='check';
      narration=isCheck?tr('Last one: notes on ledger lines, above and below the staff. Get 3 of 4 on the first try to finish the lesson.','最后一关：五线谱上下加线上的音。第一次就答对 4 题中的 3 题，就完成课程。')
        :tr('Time to use those shortcuts. Find each note from the G line, or with FACE and E G B D F.','来用刚才的方法吧。从 G 线出发，或者用 FACE 和 E G B D F 来找音。');
      if(!q)break;
      const ask=q.kind==='place'?tr(`Put ${note(q.position)} on the staff. Tap or drag.`,`把 ${note(q.position)} 放到谱上。点或拖动。`)
        :isCheck&&quiz.round>0&&!quiz.hint?tr('And this one?','那这个呢？'):tr('What’s this note?','这个音叫什么？');
      message=quiz.correct?(last?(isCheck?(passed?tr('You did it! You can read treble clef notes now, even on ledger lines.','你做到了！现在你会读高音谱号的音了，连加线上的音也会。')
          :tr(`You got ${quiz.firstTry} of 4 on the first try. Want a new set? Aim for 3.`,`第一次答对了 ${quiz.firstTry} 题，共 4 题。再来一组吧？争取答对 3 题。`))
          :tr('All six done, nice work!','六题都做完了，真棒！')):tr('That’s right!','答对了！')):quiz.hint?`${quiz.hint} ${ask}`:ask;
      tone=quiz.correct?(isCheck&&last&&!passed?null:'correct'):quiz.correct===false?'wrong':null;
      if(quiz.correct&&!last)next={label:tr('Next question →','下一题 →'),ready:true,onClick:nextRound,onSkip:()=>go(step+1)};
      else if(quiz.correct&&isCheck&&!passed)next={label:tr('New set →','再来一组 →'),ready:true,onClick:()=>setQuiz(emptyQuiz(makeCheck()))};
      else if(quiz.correct)markDone();
      scene=<>
        <NotePractice key={`${quiz.questions.length}-${quiz.round}-${q.position}`} question={q} locked={quiz.correct===true} zh={zh} onAnswer={answer} onHear={p=>hear(p)}/>
        <p className="lesson-count">{tr(`${isCheck?'Note':'Question'} ${quiz.round+1} of ${quiz.questions.length}`,`第 ${quiz.round+1} ${isCheck?'个':'题'}，共 ${quiz.questions.length} ${isCheck?'个':'题'}`)}</p>
      </>;
      break;
    }
    case 'ledger':
      narration=tr('Notes can go higher or lower than the staff. For those we add short extra lines called ledger lines. Middle C sits on one ledger line below. Clarinet and sax often read down there; flute often reads several ledger lines up.','音可以比五线谱更高或更低，这时我们加上短短的线，叫加线。中央 C 就在下面第一条加线上。单簧管和萨克斯常读下面的加线，长笛常读上面好几条加线。');
      message=tr('Slide lower or higher, and tap a note to hear it.','滑动看看更低或更高的音，点音符听一听。');
      markDone();
      scene=<LedgerExplorer key={sceneRun} zh={zh} onHear={midi=>void audio.play([midi],.65,0,true)}/>;
      break;
    case 'twinkle':{
      narration=tr('Time to write a real tune! Twinkle, Twinkle starts C C G G A A G. The names under the staff show which note goes in each spot.','来写一首真正的曲子！《小星星》开头是 C C G G A A G。谱下面的音名告诉你每个位置放哪个音。');
      const full=melody.every(p=>p!==null),match=full&&matchesMelody(melody,TWINKLE);
      message=match?tr('That’s Twinkle, Twinkle! Press Listen to hear what you wrote.','这就是《小星星》！点“听一听”，听听你写的旋律。')
        :full?tr('Close! Move the notes that don’t match their name.','差一点！把和音名对不上的音挪一挪。'):tr('Drag each note into place.','把每个音拖到对的位置。');
      tone=match?'correct':full?'wrong':null;
      if(match)markDone();
      scene=<>
        <Staff key={`twinkle-${sceneRun}`} step={5} targets={TWINKLE} position={2} phrase={melody} selected={selected} playing={audio.playing} highlight={null} labels solfege zh={zh} onPosition={movePhrase} onHighlight={()=>{}} onSelect={setSelected}/>
        <div className="lesson-tools"><button disabled={!full} onClick={()=>audio.playing>=0?audio.stop():void audio.play(melody as number[])}>{audio.playing>=0?tr('Stop','停止'):tr('Listen','听一听')}</button></div>
      </>;
      break;
    }
    case 'free':{
      const phrase=data.phrase.map((p,i)=>p??FREE_START[i]);
      narration=tr('This part is just for fun. There’s no right or wrong.','这里随便玩，没有对错。');
      message=tr('Drag the four notes anywhere and listen.','把四个音拖到任何位置，听一听。');
      next={label:tr('Back to theory lessons','回到乐理课'),ready:true,href:'/flute-studio/theory'};
      scene=<>
        <Staff key={`free-${sceneRun}`} step={5} position={2} phrase={phrase} selected={selected} playing={audio.playing} highlight={null} labels solfege zh={zh} onPosition={movePhrase} onHighlight={()=>{}} onSelect={setSelected}/>
        <div className="lesson-tools"><button onClick={()=>audio.playing>=0?audio.stop():void audio.play(phrase)}>{audio.playing>=0?tr('Stop','停止'):tr('Listen','听一听')}</button></div>
      </>;
      break;
    }
  }

  if(!ready)return <main className="theory-shell"><p>{tr('Loading…','加载中…')}</p></main>;
  return <LessonFrame title={tr('The staff and notes','五线谱与音符')} zh={zh} steps={dots} current={step} onJump={go}
    heading={dots[step]} narration={narration} message={message} tone={tone} next={next}
    status={audio.error?tr('Sound could not start. Tap a note to try again.','声音未能启动，请点一个音再试。'):!saving?tr('Progress cannot be saved in this browser.','此浏览器无法保存进度。'):''}>
    {scene}
  </LessonFrame>;
}
