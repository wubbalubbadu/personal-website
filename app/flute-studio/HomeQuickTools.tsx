"use client";

import "./home-quick-tools.css";

const quickItems = [
  {kind:"tool",id:"tuner",icon:"⌁",title:"Tuner",detail:"Check pitch",tone:"green"},
  {kind:"tool",id:"metronome",icon:"♩",title:"Metronome",detail:"Set or tap tempo",tone:"sand"},
  {kind:"tool",id:"drone",icon:"◉",title:"Drone",detail:"Hold reference pitches",tone:"pink"},
  {kind:"link",href:"/flute-studio/music",icon:"♫",title:"Browse music",detail:"Repertoire and etudes",tone:"sage"},
  {kind:"link",href:"/flute-studio/exercises",icon:"◎",title:"Exercises",detail:"Scales and studies",tone:"mist"},
] as const;

export default function HomeQuickTools(){
  function openTool(tool:"tuner"|"metronome"|"drone"){
    window.dispatchEvent(new CustomEvent("cookie:open-practice-tools",{detail:{tool}}));
  }

  return <section className="home-quick-tools" aria-labelledby="quick-tools-title">
    <header><h2 id="quick-tools-title">Quick tools</h2></header>
    <div className="quick-tool-grid">
      {quickItems.map(item=>item.kind==="link"?
        <a key={item.href} className={`quick-tool ${item.tone}`} href={item.href}>
          <span aria-hidden="true">{item.icon}</span>
          <div><b>{item.title}</b><small>{item.detail}</small></div>
          <i aria-hidden="true">›</i>
        </a>:
        <button key={item.id} className={`quick-tool ${item.tone}`} onClick={()=>openTool(item.id)}>
          <span aria-hidden="true">{item.icon}</span>
          <div><b>{item.title}</b><small>{item.detail}</small></div>
          <i aria-hidden="true">›</i>
        </button>)}
    </div>
  </section>;
}
