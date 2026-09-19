"use client";

import {useLanguage} from "./i18n/LanguageContext";
import "./home-quick-tools.css";

export default function HomeQuickTools(){
  const {t}=useLanguage();
  const quickItems = [
    {kind:"tool",id:"tuner",icon:"⌁",title:t.quickTools.tuner,detail:t.quickTools.tunerDetail,tone:"green"},
    {kind:"tool",id:"metronome",icon:"♩",title:t.quickTools.metronome,detail:t.quickTools.metronomeDetail,tone:"sand"},
    {kind:"tool",id:"drone",icon:"◉",title:t.quickTools.drone,detail:t.quickTools.droneDetail,tone:"pink"},
    {kind:"link",href:"/flute-studio/fingerings",icon:"●○",title:t.quickTools.fingeringChart,detail:t.quickTools.fingeringChartDetail,tone:"mist"},
    {kind:"link",href:"/flute-studio/trills",icon:"↟",title:t.quickTools.trillChart,detail:t.quickTools.trillChartDetail,tone:"blue"},
  ] as const;

  function openTool(tool:"tuner"|"metronome"|"drone"){
    window.dispatchEvent(new CustomEvent("cookie:open-practice-tools",{detail:{tool}}));
  }

  return <section className="home-quick-tools" aria-label="Quick tools">
    <div className="quick-tool-grid">
      {quickItems.map((item)=>item.kind==="link"?
        <a key={item.href} className={`quick-tool ${item.tone}`} data-tool={item.href.endsWith("trills") ? "trill" : "fingering"} href={item.href} target={item.href.startsWith("http")?"_blank":undefined} rel={item.href.startsWith("http")?"noreferrer":undefined}>
          <span aria-hidden="true"><i className="quick-tool__glyph">{item.icon}</i></span>
          <div><b>{item.title}</b><small>{item.detail}</small></div>
          <i aria-hidden="true">›</i>
        </a>:
        <button key={item.id} className={`quick-tool ${item.tone}`} data-tool={item.id} onClick={()=>openTool(item.id)}>
          <span aria-hidden="true"><i className="quick-tool__glyph">{item.icon}</i></span>
          <div><b>{item.title}</b><small>{item.detail}</small></div>
          <i aria-hidden="true">›</i>
        </button>)}
    </div>
  </section>;
}
