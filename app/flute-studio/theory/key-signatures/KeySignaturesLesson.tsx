'use client';
import {useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {useLanguage} from '../../i18n/LanguageContext';
import LessonFrame,{type LessonNext} from '../LessonFrame';
import EngravedRow,{KEY_STRIDE,keySignP,type RowLayout} from '../EngravedRow';
import PianoKeys,{type KeyLight} from '../PianoKeys';
import {noteY,PITCHES} from '../model';
import {useRhythmAudio} from '../rhythm/useRhythmAudio';
import {useCourseProgress} from '../useCourseProgress';
import {keyLetters,soundingMidi,FLAT_ORDER,SHARP_ORDER,type Acc,type ReadNote} from '../accidentals/pitch';
import {ACCIDENTALS} from '../accidentalGlyphs';
import '../theory.css';
import '../lesson-shell.css';
import '../measures/measures.css';
import '../accidentals/accidentals.css';
import './key-signatures.css';

/*
 * Lesson 5 (storyboards/05-key-signatures.md). Three short steps: a key signature replaces the written sharps (say it once), which
 * letters a signature changes (signs added one at a time, always in order), and a natural that overrides it for one line or space
 * until the bar line. As in lesson 4: notes and keys always connect, no metronome in pitch examples, the keyboard is never tested,
 * and every listening instruction names something to notice.
 */
const FLOW=['once','letters','back'] as const;
type StepId=typeof FLOW[number];

const n=(p:number,acc?:Acc,room?:Acc):ReadNote=>({v:1,p,...(acc?{acc}:{}),...(room?{room}:{})});
const letterOf=(p:number)=>PITCHES[p+2].name;
const METER={top:4,bottom:4};

// Step 1: two measures in G. Each measure has one F with its sharp written: the top line, then the first space.
const ONCE=[n(6),n(8,'sharp'),n(7),n(6),n(4),n(3),n(1,'sharp'),n(2)],ONCE_BARS=[4],LOW_F=6;
// Step 2: a row with every letter, F in both octaves.
const LETTER_ROW=[1,2,3,4,5,6,7,8].map(p=>n(p));
// Step 3: F sharp signature. The natural goes on the first F; the questions ask about the next F on that line, the low F in the same
// measure, and the F after the bar line.
const BACK=[n(8,undefined,'natural'),n(3),n(8),n(1),n(2),n(8),n(7),n(6)],BACK_BARS=[4];
const BACK_Q=[{at:2,sharp:false},{at:3,sharp:true},{at:5,sharp:true}];

/** One sign as a small picture, for the sign buttons. */
// Shared scale, but center each outline rather than its staff-alignment origin.
const SIGN_CENTERS={sharp:[161.5,.5],flat:[115,-201.5],natural:[119.5,0]} as const;
const SignIcon=({acc}:{acc:Acc})=><svg className="ks-sign-icon" viewBox={`${SIGN_CENTERS[acc][0]-385} ${SIGN_CENTERS[acc][1]-700} 770 1400`} aria-hidden="true"><path d={ACCIDENTALS[acc]} transform="scale(1 -1)"/></svg>;

export default function KeySignaturesLesson(){
  const {lang}=useLanguage(),zh=lang==='zh',tr=(en:string,cn:string)=>zh?cn:en;
  const [step,setStep]=useState(0),[done,setDone]=useState(false);
  const audio=useRhythmAudio(),course=useCourseProgress(),id:StepId=FLOW[step];
  // The last thing touched, a note or a key: it and its partner stay lit until something else is touched.
  const [sel,setSel]=useState<{midi:number;index:number|null}|null>(null),[playMidis,setPlayMidis]=useState<number[]>([]);
  const [stage,setStage]=useState(1);
  // Step 1: the signature is placed; the answer picked for the low F.
  const [placed,setPlaced]=useState(false),[pick,setPick]=useState<number|null>(null);
  // Step 2: the demonstration's signature (sharps positive, flats negative) and how many signs were there before the last one was added.
  const [demo,setDemo]=useState(1),[demoFrom,setDemoFrom]=useState(Infinity),[flats,setFlats]=useState(false);
  // Step 2's check: the signatures asked, the question, the letters picked, and how the last check went.
  const [asks,setAsks]=useState<number[]>([2,-2,3]),[q,setQ]=useState(0),[letters,setLetters]=useState<string[]>([]),[checked,setChecked]=useState<'right'|'wrong'|null>(null);
  // Step 3: the sign the learner tried (and whether it was the natural), then the question and the answer picked.
  const [tried,setTried]=useState<Acc|null>(null);
  // Notes that ring once to show what just changed; `wave` restarts the rings.
  const [rings,setRings]=useState<number[]>([]),wave=useRef(0);

  const names=[tr('Say it once','只说一次'),tr('Which letters change?','哪些音要变？'),tr('Change one back','改回一个音')];
  const hear=(midis:number[])=>{setPlayMidis([]);void audio.play(midis.map(()=>1),midis,0,false)};
  const playMelody=(notes:ReadNote[],bars:number[],key:number,from=0,to=notes.length)=>{
    const midis=soundingMidi(notes,bars,key);setPlayMidis(midis);
    return audio.play(notes.slice(from,to).map(x=>x.v),midis.slice(from,to),from,false);
  };
  const ring=(indices:number[])=>{wave.current++;setRings(indices)};
  let staffMidis:number[]=[];
  const tapNote=(i:number)=>{const midi=staffMidis[i];if(midi===undefined)return;hear([midi]);setSel({midi,index:i})};
  const tapKey=(midi:number)=>{hear([midi]);const index=staffMidis.indexOf(midi);setSel({midi,index:index>=0?index:null})};

  function navigate(next:number){
    audio.stop();
    setStep(next);setStage(1);setSel(null);setPlayMidis([]);setRings([]);
    setPlaced(false);setPick(null);
    setDemo(1);setDemoFrom(Infinity);setFlats(false);
    setQ(0);setLetters([]);setChecked(null);setTried(null);
    // The third signature is three sharps or three flats, fresh each visit.
    if(FLOW[next]==='letters')setAsks([2,-2,Math.random()<.5?3:-3]);
  }
  const goStage=(s:number)=>{audio.stop();setPlayMidis([]);setSel(null);setRings([]);setStage(s)};

  let narration:ReactNode='',message:ReactNode='',tone:'correct'|'wrong'|null=null,ready=false,pageNext:LessonNext|undefined,progress:{done:number;total:number}|undefined,tools:ReactNode=null;
  let scene:ReactNode=null,lit:KeyLight[]=[];
  const playing=(audio.active>=0||audio.elapsed>=0)&&playMidis.length>0;
  const touched=!playing&&sel?.index!=null?sel.index:-1;
  const button=(label:ReactNode,onClick:()=>void,className='measures-secondary')=><button className={className} onClick={onClick}>{label}</button>;
  /** Tap targets over every note, so each one can be heard as it sounds. */
  const noteHits=(notes:ReadNote[],layout:RowLayout)=>notes.map((x,i)=><rect key={`hit-${i}`} className="acc-hit acc-note-hit" x={layout.xs[i]-20} y={noteY(x.p)-22} width="40" height="44" role="button" tabIndex={0}
    aria-label={`${letterOf(x.p)} ${i+1}`} onClick={()=>tapNote(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tapNote(i)}}}/>);
  /** Rings around notes that just changed, one after another. */
  const ringsAt=(notes:ReadNote[],layout:RowLayout,delay=0)=>rings.map((i,k)=><circle key={`ring-${wave.current}-${i}`} className="ks-ring" cx={layout.xs[i]} cy={noteY(notes[i].p)} r="22"
    style={{animationDelay:`${delay+k*.12}s`}}/>);
  const yesNo=(ask:string,onPick:(sharp:boolean)=>void,wrong:number|null)=><div className="measures-choices" role="group" aria-label={ask}>
    {[tr('Sharp','升音'),tr('Plain','原音')].map((label,k)=><button key={k} className={wrong===k?'is-wrong':''} onClick={()=>onPick(k===0)}>{label}</button>)}
  </div>;

  if(id==='once'){
    // Before: the written sharps. Tapping the dashed slot beside the clef sends each sharp flying into it; the one sign lands there and
    // every F rings. The notes never move (each F keeps the room its sharp had).
    const notes=placed?ONCE.map(x=>x.acc?{...x,acc:undefined,room:'sharp' as const}:x):ONCE;
    const key=placed?1:0;
    staffMidis=soundingMidi(notes,ONCE_BARS,key);
    const answered=pick===0;
    narration=!placed?tr('This phrase needs F sharp in every measure. We have to write the sharp again after the bar line.','这段旋律每个小节都要用升 F。过了小节线，就得再写一次升号。')
      :!answered?tr('Music can say it once, at the start: every F is sharp.','乐谱可以在开头只说一次：所有的 F 都升高。')
      :tr('That sign beside the clef is a key signature. It sits on the top line, but it changes every F, high or low.','谱号旁边的这个记号叫调号。它写在第五线上，但高低所有的 F 都要升。');
    message=!placed?tr('Listen for the two Fs: both play a black key. Then tap the dashed box beside the clef to say it once.','听听这两个 F：它们弹的都是黑键。然后点谱号旁边的虚线框，只说一次。')
      :answered?tr('Sharp. The sign is on the top line, but it changes this low F too.','升 F。记号写在第五线上，可这个低音 F 也一样要升。')
      :pick===1?tr('The signature changes every F, even this one.','调号会改变每个 F，这个也一样。')
      :tr('The low F has no sharp beside it now. Will it play sharp or plain?','低音 F 旁边已经没有升号了。它会弹升音还是原音？');
    tone=answered?'correct':pick===1?'wrong':null;
    ready=answered;
    progress=placed?{done:answered?1:0,total:1}:undefined;
    const place=()=>{audio.stop();setPlayMidis([]);setSel(null);setPlaced(true);ring(ONCE.flatMap((x,i)=>letterOf(x.p)==='F'?[i]:[]))};
    scene=<EngravedRow key="once" className="acc-wide ks-once" notes={notes} bars={ONCE_BARS} meter={METER} keySignature={key} keyRoom={1} keyNew={0}
      active={playing?audio.active:touched} label={names[0]}>{layout=><>
      {!placed&&<g className="ks-slot" role="button" tabIndex={0} aria-label={tr('The space beside the clef','谱号旁边的空位')} onClick={place}
        onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();place()}}}>
        <rect x={layout.keyX-9} y={noteY(9)-6} width={KEY_STRIDE+18} height={noteY(-1)-noteY(9)+12} rx="10"/>
      </g>}
      {/* The written sharps fly from their notes into the signature, then the signature's sign drops in where they meet. */}
      {placed&&ONCE.map((x,i)=>x.acc&&<g key={`fly-${i}`} className="ks-fly" style={{'--dx':`${layout.keyX-(layout.xs[i]-35)}px`,'--dy':`${noteY(8)-noteY(x.p)}px`,animationDelay:`${i*.02}s`} as CSSProperties}>
        <path d={ACCIDENTALS.sharp} transform={`translate(${layout.xs[i]-35} ${noteY(x.p)}) scale(.064 -.064)`}/>
      </g>)}
      
      {noteHits(notes,layout)}
    </>}</EngravedRow>;
    tools=!placed?button(tr('Listen','听一听'),()=>{setSel(null);void playMelody(ONCE,ONCE_BARS,0)})
      :answered?button(tr('Listen','听一听'),()=>{setSel(null);void playMelody(notes,ONCE_BARS,1)})
      :yesNo(tr('Sharp or plain?','升音还是原音？'),sharp=>{setPick(sharp?0:1);if(sharp){hear([staffMidis[LOW_F]]);setSel({midi:staffMidis[LOW_F],index:LOW_F})}},pick===1?1:null);
  }

  else if(id==='letters'&&stage===1){
    // A demonstration the learner steps through: the signature grows one sign at a time (F sharp, C sharp, G sharp; then B flat,
    // E flat, A flat). Each new sign drops in and every note with its letter rings.
    const notes=LETTER_ROW,count=Math.abs(demo);
    staffMidis=soundingMidi(notes,[],demo);
    const order=flats?FLAT_ORDER:SHARP_ORDER,latest=count>0?order[count-1]:null;
    const sharpName=(l:string)=>tr(`${l} sharp`,`升 ${l}`),flatName=(l:string)=>tr(`${l} flat`,`降 ${l}`),nameOf=flats?flatName:sharpName;
    narration=!flats?(count<2?tr('Each sign in a key signature names a letter to change, in every octave.','调号里的每个记号都指定一个要变的音名，高低八度都算。')
      :tr('Sharps always come in the same order, and each new one keeps the ones before it. Two sharps are always F and C.','升号总是按同样的顺序出现，新加的会保留前面的。两个升号一定是 F 和 C。'))
      :count<3?tr('Flats have their own order: B, then E, then A.','降号也有自己的顺序：先 B，再 E，再 A。')
      :tr('That’s the sharp order backwards: F C G D A E B, read from the end.','正好是升号顺序倒过来：F C G D A E B，从后往前读。');
    const allSharps=!flats&&count>=3,allFlats=flats&&count>=3;
    message=latest&&demoFrom!==Infinity
      ?tr(`${nameOf(latest)} joins. Every ${latest} in the row changes; ${count>1?'the signs before it stay.':'tap one to hear it.'}`,`${nameOf(latest)}加进来了。这一行里每个 ${latest} 都变了${count>1?'，前面的记号还在。':'。点一个听听。'}`)
      :flats?tr('A signature can be flats instead. Add a flat: which letter will it be?','调号也可以是降号。加一个降号：会是哪个音名？')
      :tr('This is step 1’s signature: F sharp. Add a sharp: which letter comes next?','这是第 1 步的调号：升 F。再加一个升号：下一个是哪个音名？');
    
    const add=()=>{
      audio.stop();setPlayMidis([]);setSel(null);
      if(count>=7)return;
      const next=count+1,letter=order[next-1];
      setDemoFrom(count);setDemo(flats?-next:next);
      ring(notes.flatMap((x,i)=>letterOf(x.p)===letter?[i]:[]));
    };
    const toFlats=()=>{audio.stop();setPlayMidis([]);setSel(null);setFlats(true);setDemo(0);setDemoFrom(Infinity);setRings([])};
    scene=<EngravedRow key={`letters-${flats}`} className="acc-wide" notes={notes} keySignature={demo} keyRoom={7} keyNew={demoFrom} active={playing?audio.active:touched} label={names[1]}>{layout=><>
      {ringsAt(notes,layout,.35)}
      {noteHits(notes,layout)}
    </>}</EngravedRow>;
    // The order, as a reference beside the control: letters already in the signature are solid, the newest pops.
    const strip=<span className="ks-order" aria-label={tr(`Order: ${order.join(' ')}`,`顺序：${order.join(' ')}`)}>{order.map((l,i)=><b key={`${flats}-${l}`} className={`${i<count?'is-in':''}${i===count-1&&demoFrom!==Infinity?' is-new':''}`}>{l}</b>)}</span>;
    tools=<>
      <button className="measures-secondary" disabled={count>=7} onClick={add}>{flats?tr('Add a flat','加一个降号'):tr('Add a sharp','加一个升号')}</button>
      {button(tr('Play these notes','播放这些音'),()=>{setSel(null);void playMelody(notes,[],demo)})}
      {allSharps&&button(tr('Try flats','试试降号'),toFlats)}
      {strip}
    </>;
    pageNext={label:tr('Try one →','试一试 →'),ready:allFlats,onClick:()=>goStage(2)};
  }

  else if(id==='letters'){
    // The check: a signature on its own. Which letters does it change? Pick any number of letters, then Check.
    const key=asks[q],answer=keyLetters(key),lastQ=q===asks.length-1,right=checked==='right';
    narration=tr('Read a signature from left to right. Each sign sits on the line or space of the letter it changes.','调号从左往右读。每个记号都写在它要改变的那个音名的线或间上。');
    message=right?(lastQ?tr(`Right: ${answer.map(l=>l+(key<0?'♭':'♯')).join(', ')}. You can read a signature now.`,`对：${answer.map(l=>l+(key<0?'♭':'♯')).join('、')}。你已经会读调号了。`):tr(`Right: ${answer.map(l=>l+(key<0?'♭':'♯')).join(', ')}.`,`对：${answer.map(l=>l+(key<0?'♭':'♯')).join('、')}。`))
      :checked==='wrong'?tr('Not quite. Read the signs left to right; each one sits on its letter’s line or space.','还不对。从左往右读；每个记号都写在它那个音名的线或间上。')
      :tr('Which letters does this signature change? Pick them, then Check.','这个调号改变了哪些音名？选好后点“检查”。');
    tone=right?'correct':checked==='wrong'?'wrong':null;
    ready=right&&lastQ;progress={done:q+(right?1:0),total:asks.length};
    scene=<EngravedRow key={`ask-${q}`} className="ks-ask" notes={[]} keySignature={key} keyRoom={3} keyNew={0} finalBar={false} right={330} label={tr('A key signature','一个调号')}>{layout=><>
      {/* Once right, each sign gets its letter under the staff. */}
      {right&&answer.map((l,i)=><text key={l} className="ks-sign-letter" x={layout.keyX+10+i*KEY_STRIDE} y={noteY(-3)} style={{animationDelay:`${i*.15}s`}}>{l}</text>)}
      {right&&answer.map((_,i)=><circle key={`r${i}`} className="ks-ring is-sign" cx={layout.keyX+10+i*KEY_STRIDE} cy={noteY(keySignP(key,i))} r="16" style={{animationDelay:`${i*.15}s`}}/>)}
    </>}</EngravedRow>;
    const toggle=(l:string)=>{if(right)return;setChecked(null);setLetters(x=>x.includes(l)?x.filter(y=>y!==l):[...x,l])};
    const check=()=>{const ok=letters.length===answer.length&&answer.every(l=>letters.includes(l));setChecked(ok?'right':'wrong')};
    tools=<>
      <div className="measures-choices ks-letters" role="group" aria-label={tr('Letters','音名')}>
        {['C','D','E','F','G','A','B'].map(l=><button key={l} aria-pressed={letters.includes(l)}
          className={letters.includes(l)?(right?'is-correct':checked==='wrong'&&!answer.includes(l)?'is-wrong':'is-picked'):''} disabled={right} onClick={()=>toggle(l)}>{l}{key<0?'♭':'♯'}</button>)}
      </div>
      {<button className="measures-secondary" disabled={right||letters.length===0} onClick={check}>{tr('Check','检查')}</button>}
    </>;
    if(right&&!lastQ)pageNext={label:tr('Next one →','下一个 →'),ready:true,onClick:()=>{setQ(x=>x+1);setLetters([]);setChecked(null)}};
  }

  else{
    // F sharp signature. First the learner picks the sign that makes the first F plain; then three questions about other Fs.
    const natural=tried==='natural';
    const notes=BACK.map((x,i)=>i===0&&natural?{...x,acc:'natural' as const}:x);
    staffMidis=soundingMidi(notes,BACK_BARS,1);
    const Q=BACK_Q[q],answered=natural&&pick!==null&&(pick===0)===Q.sharp,lastQ=q===BACK_Q.length-1;
    narration=tr('A natural cancels the signature only on its own line or space, and only until the bar line.','还原号只取消它所在那条线或那个间上的调号，而且只到小节线为止。');
    if(!natural){
      message=tried==='sharp'?tr('The signature already makes this F sharp. We want plain F.','调号已经让这个 F 升高了。我们要的是原来的 F。')
        :tried==='flat'?tr('A flat would make it lower than plain F. We want plain F.','降号会让它比原来的 F 还低。我们要的是原来的 F。')
        :tr('We want the circled F to sound plain. Which sign does it need?','我们想让圈出的 F 弹原来的音。它需要哪个记号？');
      tone=tried?'wrong':null;
    }else{
      const ask=tr('Is the circled F sharp, or plain?','圈出的 F 是升音，还是原音？');
      const why=[tr('Plain. The natural still holds on this line, until the bar line.','原音。还原号在这条线上还管着，直到小节线。'),
        tr('Sharp. The natural is on the top line; this F is in the first space, so the signature still counts.','升音。还原号在第五线上；这个 F 在第一间，所以调号还管着它。'),
        tr('Sharp. The bar line ended the natural, so the signature is back.','升音。小节线让还原号结束了，调号又回来了。')][q];
      message=pick===null?(q===0?tr('Plain F now. Does the natural reach other Fs? Is the circled F sharp, or plain?','现在是原来的 F 了。还原号管得到别的 F 吗？圈出的 F 是升音，还是原音？'):ask)
        :answered?(lastQ?<>{why} {tr('Next lesson: what fills a beat where you don’t play?','下一课：不吹的拍子用什么来填？')}</>:why)
        :tr('The natural only covers its own line or space, until the bar line.','还原号只管它自己那条线或那个间，到小节线为止。');
      tone=pick===null?null:answered?'correct':'wrong';
      tools=answered?button(tr('Listen','听一听'),()=>{setSel(null);void playMelody(notes,BACK_BARS,1)})
        :yesNo(ask,sharp=>{setPick(sharp?0:1);if(sharp===Q.sharp){const m=staffMidis[Q.at];hear([m]);setSel({midi:m,index:Q.at})}},pick!==null&&!answered?pick:null);
      if(answered&&!lastQ)pageNext={label:tr('Next question →','下一题 →'),ready:true,onClick:()=>{audio.stop();setPlayMidis([]);setSel(null);setQ(x=>x+1);setPick(null)}};
    }
    ready=answered&&lastQ;
    progress={done:(natural?1:0)+q+(answered?1:0),total:1+BACK_Q.length};
    if(!natural)tools=<div className="measures-choices ks-signs" role="group" aria-label={tr('Signs','记号')}>
      {(['sharp','flat','natural'] as const).map(acc=><button key={acc} className={tried===acc?'is-wrong':''} aria-label={acc==='sharp'?tr('Sharp','升号'):acc==='flat'?tr('Flat','降号'):tr('Natural','还原号')}
        onClick={()=>{setTried(acc);if(acc==='natural'){const m=soundingMidi(BACK.map((x,i)=>i===0?{...x,acc}:x),BACK_BARS,1)[0];hear([m]);setSel({midi:m,index:0})}}}><SignIcon acc={acc}/></button>)}
    </div>;
    const circled=natural?Q.at:0;
    scene=<EngravedRow key="back" className="acc-wide" notes={notes} bars={BACK_BARS} meter={METER} keySignature={1} active={playing?audio.active:touched} label={names[2]}>{layout=><>
      {/* Once answered, a light band shows how far the natural reaches: its line, to the bar line. */}
      {natural&&answered&&<rect className="acc-reach" x={layout.xs[0]-44} y={noteY(8)-14} height="28" width={layout.barXs[0]-(layout.xs[0]-44)}/>}
      <circle className="measure-circle" cx={layout.xs[circled]} cy={noteY(notes[circled].p)} r="24"/>
      {noteHits(notes,layout)}
    </>}</EngravedRow>;
    if(ready)pageNext=done?{label:tr('Back to theory lessons','回到乐理课'),ready:true,href:'/flute-studio/theory'}
      :{label:tr('Finish lesson','完成课程'),ready:true,onClick:()=>{course.finish('keys');setDone(true)}};
  }

  const last=step===FLOW.length-1;
  const next:LessonNext=pageNext??(last?{label:tr('Back to theory lessons','回到乐理课'),ready:false,onClick:()=>window.location.assign('/flute-studio/theory')}
    :{label:tr(`Next: ${names[step+1]} →`,`下一步：${names[step+1]} →`),ready,onClick:()=>navigate(step+1)});
  if(!playing&&sel)lit=[{midi:sel.midi,tone:'red'}];
  if(playing&&playMidis[audio.active]!==undefined)lit=[{midi:playMidis[audio.active],tone:'red'}];

  return <LessonFrame className="accidentals-lesson key-sig-lesson" title={tr('Key signatures','调号')} zh={zh} steps={names} current={step} onJump={navigate}
    heading={names[step]} narration={narration} fadeNarration message={message} tone={tone} next={next} progress={progress}
    status={audio.error?tr('Sound could not start. Tap again to retry.','声音未能启动，请再试一次。'):''}>
    <div className="acc-scene">
      {scene}
      <div className="sequence-keyboard is-visible acc-keys">
        <PianoKeys low={60} high={79} labels blackPlayable lit={lit} onKey={tapKey} zh={zh}/>
      </div>
    </div>
    <div className="lesson-tools measures-tools">{tools}</div>
  </LessonFrame>;
}
