"use client";

import {useState} from "react";
import ScaleStudioPreview from "../../flute-studio/ScaleStudioPreview";
import LongTonePreview from "../../flute-studio/LongTonePreview";
import MusicPreview from "../../flute-studio/MusicPreview";
import BreathingPreview from "../../flute-studio/BreathingPreview";
import {ResourceIcon} from "../../flute-studio/components/ResourceIcon";
import "../../flute-studio/home-preview-cards.css";
import "./study.css";

type Direction="cards"|"open"|"stage";
const directions:{id:Direction;name:string;idea:string;tradeoff:string}[]=[
  {id:"cards",name:"Quiet cards",idea:"Keep the familiar grid. Let the music, rather than a colored panel, give each card its identity.",tradeoff:"Easy to scan; still feels like a collection of tools."},
  {id:"open",name:"Open page",idea:"Remove the boxes. Give the notation room and vary the composition around each activity.",tradeoff:"More spacious and less dashboard-like; takes more scrolling."},
  {id:"stage",name:"One preview",idea:"Choose an activity from a short list. Only its animation takes the stage.",tradeoff:"Calmer and more focused; you must select an activity to see its preview."},
];
const activities=[
  {id:"scales",title:"Scale Studio",copy:"Choose a key, a pattern, and how you play it.",href:"/flute-studio/exercises/scales?back=/flute-studio",Demo:ScaleStudioPreview},
  {id:"tones",title:"Long tones",copy:"Watch your pitch settle as you hold a note.",href:"/flute-studio/exercises/long-tones",Demo:LongTonePreview},
  {id:"music",title:"Browse music",copy:"Open a score with listening and practice tools built in.",href:"/flute-studio/music",Demo:MusicPreview},
  {id:"breathing",title:"Breathing Lab",copy:"Make space for a slower, steadier breath.",href:"/flute-studio/breathing",Demo:BreathingPreview},
];
const references=[
  {name:"Theory lessons",copy:"Learn to read music",href:"theory",icon:"theory" as const},
  {name:"Fingering chart",copy:"Find a note",href:"fingerings",icon:"fingerings" as const},
  {name:"Trill chart",copy:"See which keys move",href:"trills",icon:"trills" as const},
  {name:"Body & embouchure",copy:"Explore how you play",href:"embouchure",icon:"embouchure" as const},
  {name:"Technique roadmap",copy:"Find what to work on",href:"roadmap",icon:"roadmap" as const},
];
const navigation=[{name:"Home",path:""},{name:"Library",path:"/music"},{name:"Exercises",path:"/exercises"},{name:"Learn",path:"/resources"},{name:"My Studio",path:"/practice"}];

function Art({index}:{index:number}){
  const {Demo}=activities[index];
  return <div className={`shs-art shs-art--${activities[index].id}`} aria-hidden="true"><Demo zh={false}/></div>;
}
function ReferenceLinks(){return <section className="shs-reference" aria-labelledby="study-learn">
  <h2 id="study-learn">Learn & look up</h2>
  <div className="shs-reference-links">{references.map(r=><a key={r.href} href={`/flute-studio/${r.href}`}>
    <ResourceIcon name={r.icon} className="shs-reference-icon"/><span><b>{r.name}</b><small>{r.copy}</small></span>
  </a>)}</div>
  <div className="shs-tool-line"><span>At your music stand</span><a href="/flute-studio/tools">Tuner, metronome & drone</a></div>
</section>}

function QuietCards(){return <div className="shs-cards">{activities.map((a,i)=><a className="shs-card" key={a.id} href={a.href}>
  <h2>{a.title}</h2><Art index={i}/><p>{a.copy}</p>
</a>)}</div>}
function OpenPage(){return <div className="shs-open">
  {activities.slice(0,2).map((a,i)=><section className={`shs-open-feature shs-open-feature--${a.id}`} key={a.id}>
    <div className="shs-feature-copy"><h2><a href={a.href}>{a.title}</a></h2><p>{a.copy}</p><a className="shs-open-link" href={a.href}>Open {a.title}</a></div>
    <a className="shs-art-link" href={a.href} aria-label={`Open ${a.title}`}><Art index={i}/></a>
  </section>)}
  <div className="shs-open-pair">{activities.slice(2).map((a,i)=><a className="shs-open-small" key={a.id} href={a.href}>
    <Art index={i+2}/><h2>{a.title}</h2><p>{a.copy}</p>
  </a>)}</div>
</div>}
function OneStage(){
  const [selected,setSelected]=useState(0),activity=activities[selected];
  return <div className="shs-stage">
    <div className="shs-activity-list" aria-label="Choose a preview">{activities.map((a,i)=><button key={a.id} type="button" aria-pressed={selected===i} aria-controls="study-selected-preview" onClick={()=>setSelected(i)}>
      <b>{a.title}</b><span>{a.copy}</span>
    </button>)}</div>
    <section className="shs-selected" id="study-selected-preview" aria-label={`${activity.title} preview`}>
      <Art key={selected} index={selected}/>
      <div className="shs-selected-bottom"><span>Try it in the studio</span><a className="shs-action" href={activity.href}>Open {activity.title}</a></div>
    </section>
  </div>
}
export default function HomeStudy(){
  const [direction,setDirection]=useState<Direction>("cards"),[phone,setPhone]=useState(false);
  const active=directions.find(d=>d.id===direction)!;
  return <main className="shs">
    <header className="shs-controls">
      <div className="shs-lab-heading"><a href="/lab">Lab</a><h1>Studio home layouts</h1><a className="shs-original" href="/flute-studio">View current home</a></div>
      <div className="shs-options">
        <div className="shs-switch" role="group" aria-label="Layout direction">{directions.map(d=><button key={d.id} type="button" aria-pressed={direction===d.id} onClick={()=>setDirection(d.id)}>{d.name}</button>)}</div>
        <button type="button" className="shs-size" aria-pressed={phone} onClick={()=>setPhone(!phone)}>{phone?"Full-width preview":"Phone preview"}</button>
      </div>
      <p className="shs-hypothesis">{active.idea} <span>{active.tradeoff}</span></p>
    </header>
    <div className={`shs-frame ${phone?"shs-frame--phone":""}`}>
      <div className={`shs-site shs-site--${direction}`}>
        <header className="shs-site-header"><a href="/flute-studio" className="shs-brand"><span className="shs-cookie" aria-hidden="true"><i/><i/><i/></span>Cookie Flute Studio</a><a href="/flute-studio/practice">My Studio</a></header>
        <div className="shs-shell">
          <nav className="shs-nav" aria-label="Studio navigation">{navigation.map(n=><a key={n.name} aria-current={n.name==="Home"?"page":undefined} href={`/flute-studio${n.path}`}>{n.name}</a>)}</nav>
          <div className="shs-home">
            <div className="shs-intro"><h1>Practice</h1><p>A little time with your flute.</p></div>
            {direction==="cards"?<QuietCards/>:direction==="open"?<OpenPage/>:<OneStage/>}
            <ReferenceLinks/>
          </div>
        </div>
      </div>
    </div>
    <footer className="shs-notes"><p>Separate layout study. These previews reuse the studio’s animations. Links open the real tools.</p><p>Compare: where your eye lands, how quickly you find an activity, and whether it feels like a place to make music.</p></footer>
  </main>;
}
