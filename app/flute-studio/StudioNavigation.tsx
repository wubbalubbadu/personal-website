"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";
import "./studio-navigation.css";

const destinations = [
  {key:"home",label:"Home",href:"/flute-studio",icon:"⌂"},
  {key:"music",label:"Music",href:"/flute-studio/music",icon:"♫"},
  {key:"exercises",label:"Exercises",href:"/flute-studio/exercises",icon:"◎"},
  {key:"practice",label:"Practice",href:"/flute-studio#practice",icon:"✓"},
] as const;

type Destination = typeof destinations[number];

function destinationIsActive(destination:Destination,pathname:string,hash:string){
  if(destination.key==="practice")return (pathname==="/flute-studio"&&hash==="#practice")||pathname.startsWith("/flute-studio/practice");
  if(destination.key==="home")return pathname==="/flute-studio"&&hash!=="#practice";
  return pathname.startsWith(destination.href);
}

export default function StudioNavigation(){
  const pathname=usePathname();
  const [hash,setHash]=useState("");
  const [selectedKey,setSelectedKey]=useState<Destination["key"]|null>(null);

  useEffect(()=>{
    const syncHash=()=>{setHash(window.location.hash);setSelectedKey(null)};
    syncHash();
    window.addEventListener("hashchange",syncHash);
    return()=>window.removeEventListener("hashchange",syncHash);
  },[pathname]);

  function openTools(){
    window.dispatchEvent(new CustomEvent("cookie:open-practice-tools",{detail:{tool:"tuner"}}));
  }

  return <header className="studio-navigation">
    <div className="studio-navigation__inner">
      <Link className="studio-navigation__brand" href="/flute-studio" onClick={()=>{setSelectedKey("home");setHash("")}} aria-label="Cookie Flute Studio home">
        <span className="studio-navigation__brand-mark" aria-hidden="true">♫</span>
        <span>Cookie Flute Studio</span>
      </Link>
      <nav className="studio-navigation__tabs" aria-label="Studio navigation">
        {destinations.map(destination=>{
          const active=selectedKey?selectedKey===destination.key:destinationIsActive(destination,pathname,hash);
          return <Link
            key={destination.key}
            href={destination.href}
            className={active?"studio-navigation__tab is-active":"studio-navigation__tab"}
            aria-current={active?"page":undefined}
            onClick={()=>{setSelectedKey(destination.key);setHash(destination.key==="practice"?"#practice":"")}}
          >
            <span className="studio-navigation__tab-icon" aria-hidden="true">{destination.icon}</span>
            <span>{destination.label}</span>
          </Link>;
        })}
      </nav>
      <div className="studio-navigation__actions">
        <button className="studio-navigation__tools" type="button" onClick={openTools}>
          <span aria-hidden="true">⌁</span>
          Tools
        </button>
        <span className="studio-navigation__avatar" role="img" aria-label="Haylie Wu profile">HW</span>
      </div>
    </div>
  </header>;
}
