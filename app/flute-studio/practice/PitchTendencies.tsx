"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {readPitchHistory,noteTendencies,focusNotes,correctedNotes,habits,PITCH_UPDATED,OFF_CENTS,HOLD_GOAL_MS,type PitchRecord,type NoteTendency} from "../lib/pitchHistory";

const PITCH_CLASSES=["C","C♯","D","E♭","E","F","F♯","G","A♭","A","B♭","B"];
/** The flute's range, low C to high D. Notes outside it still count if they were played. */
const LOW=60,HIGH=98;

/**
 * Where your pitch leans, note by note, across every session. The map answers
 * "which notes"; the list under it answers "what to practise next". Nothing
 * here guesses: a note only earns a colour from notes actually measured.
 */
export function PitchTendencies({zh}:{zh:boolean}){
  const [records,setRecords]=useState<PitchRecord[]|null>(null);
  useEffect(()=>{
    const load=()=>setRecords(readPitchHistory());
    load();
    window.addEventListener(PITCH_UPDATED,load);window.addEventListener("storage",load);
    return()=>{window.removeEventListener(PITCH_UPDATED,load);window.removeEventListener("storage",load)};
  },[]);
  if(records===null)return null;
  const tendencies=noteTendencies(records),focus=focusNotes(tendencies).slice(0,4),fixed=correctedNotes(tendencies).slice(0,4),habit=habits(records);
  const midis=[...tendencies.keys()];
  const low=Math.min(LOW,...midis),high=Math.max(HIGH,...midis);
  const octaves=Array.from({length:Math.floor(high/12)-Math.floor(low/12)+1},(_,i)=>Math.floor(low/12)+i);
  const lean=(flat:number,sharp:number,cents:number,count:number)=>{
    const isFlat=flat>=sharp,times=Math.round((isFlat?flat:sharp)*count);
    return zh?`${count} 次中 ${times} 次偏${isFlat?"低":"高"}，通常 ${Math.abs(cents)} 音分`:`${isFlat?"Flat":"Sharp"} in ${times} of ${count} · typically ${Math.abs(cents)}¢`;
  };
  const stillOff=(t:NoteTendency)=>lean(t.finalFlat,t.finalSharp,t.final,t.count);
  const firstTry=(t:NoteTendency)=>zh?`第一次常偏${t.instinct<0?"低":"高"} ${Math.abs(t.instinct)} 音分，之后你会调准`:`Starts ${t.instinct<0?"flat":"sharp"} by ~${Math.abs(t.instinct)}¢, then you bring it in`;
  const cellText=(t:NoteTendency)=>{
    const start=Math.abs(t.instinct)<=OFF_CENTS?(zh?"第一次就准":"in tune on the first try"):(zh?`第一次偏${t.instinct<0?"低":"高"} ${Math.abs(t.instinct)} 音分`:`first try ${Math.abs(t.instinct)}¢ ${t.instinct<0?"flat":"sharp"}`);
    const end=Math.abs(t.final)<=OFF_CENTS?(zh?"最后准":"ends in tune"):(zh?`最后偏${t.final<0?"低":"高"} ${Math.abs(t.final)} 音分`:`ends ${Math.abs(t.final)}¢ ${t.final<0?"flat":"sharp"}`);
    return `${t.pitch} · ${start} · ${end} · ${zh?`最近 ${t.count} 次`:`last ${t.count}`}`;
  };
  return <section id="pitch" className="practice-card pitch-card" aria-labelledby="pitch-title">
    <div className="practice-card__heading">
      <h2 id="pitch-title">{zh?"音准倾向":"Pitch tendencies"}</h2>
      {records.length>0&&<span className="pitch-card__meta">{zh?`${records.length} 个音 · ${habit.sessions} 次练习`:`${records.length} notes · ${habit.sessions} ${habit.sessions===1?"session":"sessions"}`}</span>}
    </div>
    {!records.length
      ?<p className="practice-card__empty">{zh?"在长音练习中打开“音准”，这里会画出你每个音的倾向。":"Turn on Pitch in Long tones, and this map fills in note by note."} <Link href="/flute-studio/exercises/long-tones">{zh?"去练长音 ›":"Go to Long tones ›"}</Link></p>
      :<>
      <div className="pitch-map" role="table" aria-label={zh?"每个音的平均音准":"Typical pitch of each note"}>
        <div className="pitch-map__row pitch-map__head" role="row"><span role="columnheader"/>{PITCH_CLASSES.map(name=><span key={name} role="columnheader">{name}</span>)}</div>
        {octaves.map(octave=><div className="pitch-map__row" role="row" key={octave}>
          <span className="pitch-map__octave" role="rowheader">{octave-1}</span>
          {PITCH_CLASSES.map((name,i)=>{
            const midi=octave*12+i,t=tendencies.get(midi);
            if(midi<low||midi>high)return <span key={name} role="cell" className="pitch-map__cell is-outside"/>;
            if(!t)return <span key={name} role="cell" className="pitch-map__cell is-empty" title={`${name}${octave-1}`}/>;
            // Coloured by your first try (your instinct); a ✓ means you usually end in tune anyway.
            const side=Math.abs(t.instinct)<=OFF_CENTS?"tune":t.instinct<0?"flat":"sharp";
            const strength=Math.min(1,Math.abs(t.instinct)/25);
            const corrected=side!=="tune"&&Math.abs(t.final)<=OFF_CENTS;
            return <span key={name} role="cell" className={`pitch-map__cell is-${side}`} style={{"--lean":strength} as React.CSSProperties} title={cellText(t)} aria-label={cellText(t)}>
              <b>{t.instinct>0?"+":t.instinct<0?"−":""}{Math.abs(t.instinct)}{corrected&&<i aria-hidden="true"> ✓</i>}</b><small>{t.count}</small>
            </span>;
          })}
        </div>)}
        <div className="pitch-map__legend" aria-hidden="true"><span className="is-flat">{zh?"偏低":"flat"}</span><span className="is-tune">{zh?"准":"in tune"}</span><span className="is-sharp">{zh?"偏高":"sharp"}</span><small>{zh?"颜色和数字：第一次的偏差（音分）· ✓ 之后调准了 · 次数":"colour and number: your first try (cents) · ✓ you then fixed it · count"}</small></div>
      </div>
      <div className="pitch-card__insights">
        <div>
          <h3>{zh?"接下来练这些":"Work on these"}</h3>
          <p className="pitch-card__hint">{zh?"再吹一遍之后仍然偏的音。":"Still off after you tried again."}</p>
          {focus.length
            ?<ul className="pitch-card__focus">{focus.map(t=><li key={t.midi}><b>{t.pitch}</b><span>{stillOff(t)}</span></li>)}</ul>
            :<p className="practice-card__empty">{zh?"没有。每个音至少吹 3 次后才会下结论。":"Nothing yet. A note needs 3 or more readings before it shows here."}</p>}
          {fixed.length>0&&<>
            <h3 className="pitch-card__subhead">{zh?"你自己会调准的音":"You fix these yourself"}</h3>
            <ul className="pitch-card__focus is-fixed">{fixed.map(t=><li key={t.midi}><b>{t.pitch}</b><span>{firstTry(t)}</span></li>)}</ul>
          </>}
        </div>
        <div>
          <h3>{zh?"你的习惯":"Your habits"}</h3>
          <ul className="pitch-card__habits">
            {habit.longNotes>=3&&<li className={habit.endingDropShare>=.4?"is-warn":""}>{habit.endingDropShare>=.4?(zh?`${Math.round(habit.endingDropShare*100)}% 的长音在结尾下降`:`Endings drop on ${Math.round(habit.endingDropShare*100)}% of your long notes`):(zh?"大多数长音的结尾都很稳":"Your endings hold steady on most long notes")}{habit.endingDropShare>=.4&&<small>{zh?"结尾保持气息支撑，不要让气流变弱。":"Keep the air support through the end instead of letting it fade."}</small>}</li>}
            <li className={habit.medianHoldMs<HOLD_GOAL_MS?"is-warn":""}>{zh?`通常每个音保持 ${(habit.medianHoldMs/1000).toFixed(1)} 秒`:`You typically hold a note ${(habit.medianHoldMs/1000).toFixed(1)}s`}{habit.medianHoldMs<HOLD_GOAL_MS&&<small>{zh?`目标：${HOLD_GOAL_MS/1000} 秒。`:`Aim for ${HOLD_GOAL_MS/1000}s.`}</small>}</li>
          </ul>
        </div>
      </div>
      </>}
  </section>;
}
