"use client";

import Link from "next/link";
import {useEffect,useRef,useState,useSyncExternalStore} from "react";
import {usePitchStream} from "../../lib/usePitchStream";
import {useLanguage} from "../../i18n/LanguageContext";
import ChromaticStaff,{type StaffNote} from "./ChromaticStaff";
import {DEFAULT_RANGE,LOWEST,HIGHEST,GIVE_UP_MS,HOLD_MS,OFF_CENTS,SETTLE_MS,TESTS_UPDATED,buildResult,centsFrom,median,needsAnotherGo,passSequence,readTests,saveTest,spell,summary,type Readings,type TestResult} from "../../lib/tendencyTest";

/**
 * The pitch tendency test: pick a range, tune your A, play the chromatic
 * scale up and back down, play any unclear notes once more, then see which
 * notes lean sharp or flat. One line of guidance at a time, in the middle;
 * the scale is shown in notation so no one has to know what "C5" means.
 */
type Step="range"|"tune"|"play"|"retry"|"results";
type Target={midi:number;rising:boolean};

// The last saved test, read after hydration (localStorage has no server side).
const subscribeTests=(onChange:()=>void)=>{window.addEventListener(TESTS_UPDATED,onChange);return()=>window.removeEventListener(TESTS_UPDATED,onChange)};
const lastTestId=()=>readTests()[0]?.id??"";

/** The smallest range: three notes, for a quick check of a few trouble spots. */
const MIN_SPAN=2;
/** Notes on the staff while playing. */
const SHOWN=5;

const PITCH_CLASSES=["C","C♯","D","E♭","E","F","F♯","G","A♭","A","B♭","B"];

export default function TendencyTest(){
  const {lang}=useLanguage(),zh=lang==="zh";
  const pitch=usePitchStream();
  const [step,setStep]=useState<Step>("range");
  const [[low,high],setRange]=useState<[number,number]>(DEFAULT_RANGE);
  const [targets,setTargets]=useState<Target[]>([]);
  const [index,setIndex]=useState(0);
  const [readings,setReadings]=useState<Readings>({});
  const [result,setResult]=useState<TestResult|null>(()=>null);
  const [relative,setRelative]=useState(true);
  const [now,setNow]=useState(0);
  const targetSince=useRef(0);
  const captured=useRef<number|null>(null);
  const lastId=useSyncExternalStore(subscribeTests,lastTestId,()=>"");
  const last=lastId?readTests().find(test=>test.id===lastId)??null:null;

  const target=targets[index];
  const live=pitch.live;

  // A clock for the hold bar and the give-up timer.
  useEffect(()=>{
    if(step!=="play"&&step!=="retry")return;
    const timer=setInterval(()=>setNow(performance.now()),120);
    return()=>clearInterval(timer);
  },[step]);

  const begin=(next:Target[],as:Step)=>{setTargets(next);setIndex(0);targetSince.current=performance.now();captured.current=null;setStep(as)};
  const finish=(all:Readings)=>{
    const res=buildResult(all,low,high);setResult(res);saveTest(res);pitch.stop();setStep("results");
  };
  const advance=(all:Readings)=>{
    if(index+1<targets.length){setIndex(index+1);targetSince.current=performance.now();return}
    if(step==="play"){const again=needsAnotherGo(all,low,high);if(again.length){begin(again.map(midi=>({midi,rising:true})),"retry");return}}
    finish(all);
  };

  // While tuning, each A keeps its latest settled reading.
  const [tuned,setTuned]=useState<Record<number,number>>({});
  useEffect(()=>{
    if(step!=="tune"||!live||(live.midi!==69&&live.midi!==81))return;
    const settled=live.frames.filter(frame=>frame.at-live.startedAt>=SETTLE_MS);
    if(settled.length<6)return;
    const cents=Math.round(median(settled.slice(-12).map(frame=>centsFrom(frame.hz,live.midi))));
    // Following the microphone (an external source) is what this effect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTuned(current=>current[live.midi]===cents?current:{...current,[live.midi]:cents});
  },[live,step]);

  // Hold the right note long enough and it counts; then on to the next.
  useEffect(()=>{
    if((step!=="play"&&step!=="retry")||!target||!live||live.midi!==target.midi)return;
    if(captured.current===live.startedAt)return;
    const settled=live.frames.filter(frame=>frame.at-live.startedAt>=SETTLE_MS);
    const held=(live.frames.at(-1)?.at??live.startedAt)-live.startedAt;
    if(held<SETTLE_MS+HOLD_MS||settled.length<6)return;
    captured.current=live.startedAt;
    const cents=median(settled.map(frame=>centsFrom(frame.hz,target.midi)));
    const next={...readings,[target.midi]:[...(readings[target.midi]??[]),cents]};
    // Reacting to the microphone stream (an external source) is what this
    // effect is for, so recording the reading here is intended.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReadings(next);advance(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[live,step,target]);

  // A note that never settles is asked for again at the end rather than holding everything up.
  useEffect(()=>{
    if((step==="play"||step==="retry")&&target&&now-targetSince.current>GIVE_UP_MS)advance(readings);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[now]);

  const startListening=async()=>{setStep("tune");await pitch.start()};
  const liveCents=live?.frames.length?Math.round(centsFrom(live.frames.at(-1)!.hz,live.midi)):null;
  const holdFraction=target&&live?.midi===target.midi?Math.min(1,((live.frames.at(-1)?.at??live.startedAt)-live.startedAt)/(SETTLE_MS+HOLD_MS)):0;
  // The staff shows five notes around the current one (two behind, two
  // ahead), sliding to stay five at the start and end of the run, so the
  // staff never changes length. A retry of fewer notes is centred in it.
  const from=Math.max(0,Math.min(index-2,targets.length-SHOWN));
  const window8:StaffNote[]=targets.slice(from,from+SHOWN).map((t,i)=>({...t,state:from+i<index?"done":from+i===index?"current":"next"}));
  const micProblem=pitch.status==="denied"?(zh?"需要麦克风权限才能测音准。":"The test needs your microphone. Allow it in the browser and try again."):pitch.status==="unavailable"?(zh?"这个浏览器无法使用麦克风。":"This browser can't use the microphone."):null;

  // Both A's, on the staff and on the tools panel's tuner meter: the one
  // you are playing lights up and moves the needle, and each keeps its
  // last reading so you can check both after moving the headjoint.
  const heard=live&&(live.midi===69||live.midi===81)?live.midi:null;
  const cents=heard!==null&&liveCents!==null?liveCents:null;
  const tone=cents===null?"idle":Math.abs(cents)<=5?"tuned":cents<0?"flat":"sharp";
  const reading=(midi:number)=>{const c=tuned[midi];return c===undefined?"—":`${c>0?"+":""}${c}¢`};
  return <main className="exercise-hub tendency">
    <div className="exercise-hub__content">
      <header className="exercise-hub__header"><div><h1>{zh?"音准倾向测试":"Pitch tendency test"}</h1></div></header>

      {step==="range"&&<section className="tendency__stage">
        <p className="tendency__guide">{zh?"选择要测试的音域":"Choose the range to test"}</p>
        {/* Drag either note up or down the staff, or use the steppers below for
            sharps; the staff keeps the height of the whole range so nothing
            below it moves. */}
        <ChromaticStaff notes={[{midi:low,rising:true,state:"current"},{midi:high,rising:true,state:"current"}]} label={`${spell(low)} to ${spell(high)}`}
          reach={[LOWEST,HIGHEST]} slots={2}
          onDrag={(which,midi)=>which===0?setRange([Math.max(LOWEST,Math.min(midi,high-MIN_SPAN)),high]):setRange([low,Math.min(HIGHEST,Math.max(midi,low+MIN_SPAN))])}/>
        <div className="tendency__range">
          <RangeStepper label={zh?"最低":"Lowest"} value={low} onChange={v=>setRange([Math.max(LOWEST,Math.min(v,high-MIN_SPAN)),high])}/>
          <RangeStepper label={zh?"最高":"Highest"} value={high} onChange={v=>setRange([low,Math.min(HIGHEST,Math.max(v,low+MIN_SPAN))])}/>
        </div>
        <button type="button" className="tendency__primary" onClick={()=>void startListening()}>{zh?"开始":"Start"}</button>
        {/* One way back to the usual range, and only once it has been changed. */}
        {(low!==DEFAULT_RANGE[0]||high!==DEFAULT_RANGE[1])&&<button type="button" className="tendency__link" onClick={()=>setRange(DEFAULT_RANGE)}>{zh?"恢复为低音 C 到高音 C":"Back to low C to high C"}</button>}
        {last&&<p className="tendency__note">{zh?"上次测试：":"Last test: "}{new Date(last.date).toLocaleDateString(zh?"zh-CN":undefined)} · <button type="button" className="tendency__link" onClick={()=>{setResult(last);setStep("results")}}>{zh?"查看结果 ›":"See the results ›"}</button></p>}
      </section>}

      {step==="tune"&&<section className="tendency__stage">
          <p className="tendency__guide">{zh?"先调音：吹中音 A 和高音 A，把头管调到接近中间":"Tune first: play the middle A and the high A, and move the headjoint until they're close"}</p>
          <ChromaticStaff notes={[{midi:69,rising:true,state:heard===69?"current":"next"},{midi:81,rising:true,state:heard===81?"current":"next"}]} slots={2} label="A4 and A5"/>
          <div className="tendency__tuned"><span className={heard===69?"is-on":""}>A4 {reading(69)}</span><span className={heard===81?"is-on":""}>A5 {reading(81)}</span></div>
          <div className={`tp-tuner tendency__meter is-${tone}`}>
            <div className="tp-meter" style={{"--cents-position":`${50+Math.max(-50,Math.min(50,cents??0))*0.92}%`} as React.CSSProperties}>
              <div className="tp-meter__track"><span className="tp-meter__band"/><i className="tp-meter__center"/><em className="tp-meter__needle"/></div>
              <span className="tp-meter__cents">{cents!==null?`${cents>0?"+":""}${cents}¢`:micProblem?"—":(zh?"吹一个 A":"Play an A")}</span>
            </div>
          </div>
          {micProblem&&<p className="tendency__hint">{micProblem}</p>}
          <div className="tendency__actions">
            <button type="button" className="tendency__primary" onClick={()=>{setReadings({});begin(passSequence(low,high),"play")}}>{zh?"调好了，继续":"Continue"}</button>
            <button type="button" className="tendency__secondary" onClick={()=>{setReadings({});begin(passSequence(low,high),"play")}}>{zh?"跳过":"Skip"}</button>
          </div>
        </section>}

      {(step==="play"||step==="retry")&&target&&<section className="tendency__stage">
        <p className="tendency__guide">{step==="retry"
          ?(zh?"这几个音再吹一次":"Once more for these notes")
          :(zh?"用舒服的中强（mf）吹每个音，稳稳地保持":"Hold each note at a comfortable mezzo-forte")}</p>
        <p className="tendency__progress">{step==="play"?(target.rising?(zh?"上行":"Going up"):(zh?"下行":"Coming down")):(zh?"补测":"Once more")} · {index+1} / {targets.length}</p>
        <ChromaticStaff notes={window8} slots={SHOWN} label={spell(target.midi,target.rising)}/>
        <div className="tendency__now">
          {/* No pitch readout while you play: seeing it, you would correct
              each note and the test would miss your real tendency. */}
          <b>{spell(target.midi,target.rising)}</b>
          <span className="tendency__hold"><i style={{width:`${Math.round(holdFraction*100)}%`}}/></span>
          <small>{live&&live.midi!==target.midi
            ?(Math.abs(live.midi-target.midi)===12?(live.midi>target.midi?(zh?"高了一个八度":"That's an octave higher"):(zh?"低了一个八度":"That's an octave lower")):(zh?`听到的是 ${spell(live.midi,target.rising)}`:`Hearing ${spell(live.midi,target.rising)}`))
            :live?(zh?"保持住…":"Hold it…"):(zh?"在听…":"Listening…")}</small>
        </div>
        <button type="button" className="tendency__link" onClick={()=>advance(readings)}>{zh?"跳过这个音":"Skip this note"}</button>
      </section>}

      {step==="results"&&result&&<section className="tendency__stage tendency__stage--results">
        <div className="tendency__summary">{summary(result,zh).map(line=><p key={line}>{line}</p>)}</div>
        <div className="tendency__switch" role="group">
          <button type="button" aria-pressed={relative} onClick={()=>setRelative(true)}>{zh?"相对你的调音":"Relative to your tuning"}</button>
          <button type="button" aria-pressed={!relative} onClick={()=>setRelative(false)}>{zh?"相对 A = 440":"Against A = 440"}</button>
        </div>
        <HeatMap result={result} relative={relative} zh={zh}/>
        <div className="tendency__actions">
          <button type="button" className="tendency__primary" onClick={()=>{setResult(null);setStep("range")}}>{zh?"再测一次":"Test again"}</button>
          <Link className="tendency__secondary" href="/flute-studio/tools">{zh?"完成":"Done"}</Link>
        </div>
      </section>}
    </div>
  </main>;
}

function RangeStepper({label,value,onChange}:{label:string;value:number;onChange:(v:number)=>void}){
  return <div className="tendency__stepper">
    <span>{label}</span>
    <div><button type="button" aria-label={`${label} lower`} onClick={()=>onChange(value-1)}>−</button><b>{spell(value)}</b><button type="button" aria-label={`${label} higher`} onClick={()=>onChange(value+1)}>+</button></div>
  </div>;
}

/** Octaves down the side, the twelve notes across, coloured by how far each leans. */
function HeatMap({result,relative,zh}:{result:TestResult;relative:boolean;zh:boolean}){
  const firstOctave=Math.floor(result.low/12),lastOctave=Math.floor(result.high/12);
  return <div className="pitch-map tendency__map" role="table" aria-label={zh?"每个音的音准":"Pitch of each note"}>
    <div className="pitch-map__row pitch-map__head" role="row"><span role="columnheader"/>{PITCH_CLASSES.map(n=><span key={n} role="columnheader">{n}</span>)}</div>
    {Array.from({length:lastOctave-firstOctave+1},(_,i)=>firstOctave+i).map(octave=><div className="pitch-map__row" role="row" key={octave}>
      <span className="pitch-map__octave" role="rowheader">{octave-1}</span>
      {PITCH_CLASSES.map((name,i)=>{
        const midi=octave*12+i;
        if(midi<result.low||midi>result.high)return <span key={name} role="cell" className="pitch-map__cell is-outside"/>;
        const raw=result.raw[midi];
        if(raw===undefined)return <span key={name} role="cell" className="pitch-map__cell is-empty" title={`${name}${octave-1}`}/>;
        const v=relative?raw-result.offset:raw;
        const side=Math.abs(v)<OFF_CENTS?"tune":v<0?"flat":"sharp";
        return <span key={name} role="cell" className={`pitch-map__cell is-${side}`} style={{"--lean":Math.min(1,Math.abs(v)/25)} as React.CSSProperties} title={`${name}${octave-1}: ${v>0?"+":""}${v}¢`}>
          <b>{v>0?"+":v<0?"−":""}{Math.abs(v)}</b>
        </span>;
      })}
    </div>)}
  </div>;
}
