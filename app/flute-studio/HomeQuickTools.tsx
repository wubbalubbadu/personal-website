"use client";

import {ResourceIcon} from "./components/ResourceIcon";
import {useLanguage} from "./i18n/LanguageContext";
import "./home-quick-tools.css";

export default function HomeQuickTools(){
  const {t}=useLanguage();
  // Tools are things that RUN — they open the practice dock in place. The
  // fingering and trill charts used to sit here too, but a chart is
  // something you read, and they are cards under Resources now.
  const quickItems = [
    {id:"tuner",title:t.quickTools.tuner,detail:t.quickTools.tunerDetail,tone:"green"},
    {id:"metronome",title:t.quickTools.metronome,detail:t.quickTools.metronomeDetail,tone:"sand"},
    {id:"drone",title:t.quickTools.drone,detail:t.quickTools.droneDetail,tone:"pink"},
  ] as const;

  function openTool(tool:"tuner"|"metronome"|"drone"){
    window.dispatchEvent(new CustomEvent("cookie:open-practice-tools",{detail:{tool}}));
  }

  return <section className="home-quick-tools" aria-label="Quick tools">
    <div className="quick-tool-grid">
      {quickItems.map(item=>
        <button key={item.id} className={`quick-tool ${item.tone}`} data-tool={item.id} onClick={()=>openTool(item.id)}>
          <ResourceIcon name={item.id} className="quick-tool__glyph"/>
          <div><b>{item.title}</b><small>{item.detail}</small></div>
          <i aria-hidden="true">›</i>
        </button>)}
    </div>
  </section>;
}
