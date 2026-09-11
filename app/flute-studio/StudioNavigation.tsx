"use client";

import Link from "next/link";
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

  return <header className="studio-navigation">
    <div className="studio-navigation__inner">
      <Link className="studio-navigation__brand" href="/flute-studio" aria-label={t.nav.brandHome}>
        <span className="studio-navigation__brand-mark" aria-hidden="true">
          <i className="crumb c1"/><i className="crumb c2"/><i className="crumb c3"/>
        </span>
        <span>{t.nav.brand}</span>
      </Link>
      <nav className="studio-navigation__tabs" aria-label="Studio navigation">
        {destinations.map(destination=>{
          const active=destinationIsActive(destination,pathname);
          return <Link
            key={destination.key}
            data-key={destination.key}
            href={destination.href}
            className={active?"studio-navigation__tab is-active":"studio-navigation__tab"}
            aria-current={active?"page":undefined}
          >
            <span className="studio-navigation__tab-icon" aria-hidden="true">{destination.icon}</span>
            <span>{destination.label}</span>
          </Link>;
        })}
      </nav>
      <div className="studio-navigation__actions">
        <span className="studio-navigation__avatar" role="img" aria-label={t.nav.avatarLabel}>HW</span>
      </div>
    </div>
  </header>;
}
