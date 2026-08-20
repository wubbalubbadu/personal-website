"use client";

import "./home-quick-tools.css";

const tools = [
  {id:"tuner", icon:"⌁", title:"Tuner", detail:"Stable pitch reading", tone:"green"},
  {id:"metronome", icon:"♩", title:"Metronome", detail:"Tempo and tap", tone:"sand"},
  {id:"drone", icon:"◉", title:"Drone", detail:"Pitch pipe", tone:"pink"},
] as const;

export default function HomeQuickTools(){
  function openTool(tool:(typeof tools)[number]["id"]){
    window.dispatchEvent(new CustomEvent("cookie:open-practice-tools",{detail:{tool}}));
  }

  return <section className="home-quick-tools" aria-labelledby="quick-tools-title">
    <header>
      <div><h2 id="quick-tools-title">Quick tools</h2><p>Open one without leaving Home</p></div>
      <span>3-in-1 console</span>
    </header>
    <div className="quick-tool-grid">
      {tools.map(tool=><button key={tool.id} className={`quick-tool ${tool.tone}`} onClick={()=>openTool(tool.id)}>
        <span aria-hidden="true">{tool.icon}</span>
        <div><b>{tool.title}</b><small>{tool.detail}</small></div>
        <i aria-hidden="true">›</i>
      </button>)}
    </div>
  </section>;
}
