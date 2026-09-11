"use client";

import {usePathname} from "next/navigation";
import {useLanguage} from "./i18n/LanguageContext";
import "./studio-navigation.css";

function useDestinations(){
  const {t}=useLanguage();
  return [
    {key:"home",label:t.nav.home,href:"/flute-studio",icon:"⌂"},
    {key:"music",label:t.nav.music,href:"/flute-studio/music",icon:"♫"},
    {key:"exercises",label:t.nav.exercises,href:"/flute-studio/exercises",icon:"◎"},
    {key:"practice",label:t.nav.practice,href:"/flute-studio/practice",icon:"✓"},
    {key:"settings",label:t.nav.settings,href:"/flute-studio/settings",icon:"⚙"},
  ] as const;
}

type Destination = ReturnType<typeof useDestinations>[number];

function destinationIsActive(destination:Destination,pathname:string){
  if(destination.key==="home")return pathname==="/flute-studio";
  return pathname.startsWith(destination.href);
}

export default function StudioNavigation(){
  const pathname=usePathname();
  const {t}=useLanguage();
  const destinations=useDestinations();

  function openTools(){
    window.dispatchEvent(new CustomEvent("cookie:open-practice-tools",{detail:{tool:"tuner"}}));
  }

  return <header className="studio-navigation">
    <div className="studio-navigation__inner">
      <a className="studio-navigation__brand" href="/flute-studio" aria-label={t.nav.brandHome}>
        <span className="studio-navigation__brand-mark" aria-hidden="true">♫</span>
        <span>{t.nav.brand}</span>
      </a>
      <nav className="studio-navigation__tabs" aria-label="Studio navigation">
        {destinations.map(destination=>{
          const active=destinationIsActive(destination,pathname);
          return <a
            key={destination.key}
            href={destination.href}
            className={active?"studio-navigation__tab is-active":"studio-navigation__tab"}
            aria-current={active?"page":undefined}
          >
            <span className="studio-navigation__tab-icon" aria-hidden="true">{destination.icon}</span>
            <span>{destination.label}</span>
          </a>;
        })}
      </nav>
      <div className="studio-navigation__actions">
        <button className="studio-navigation__tools" type="button" onClick={openTools}>
          <span aria-hidden="true">⌁</span>
          {t.nav.tools}
        </button>
        <span className="studio-navigation__avatar" role="img" aria-label={t.nav.avatarLabel}>HW</span>
      </div>
    </div>
  </header>;
}
