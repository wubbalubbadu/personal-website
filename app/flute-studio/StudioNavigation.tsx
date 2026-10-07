"use client";

import Link from "next/link";
import PracticeClockButton from "./PracticeClockButton";
import {useEffect,useState} from "react";
import {usePathname,useRouter} from "next/navigation";
import AccountMenu from "./AccountMenu";
import {useLanguage} from "./i18n/LanguageContext";
import {LEARN_PAGES} from "./learn-pages";
import StudioRail,{setRailOpen,useRailOpen} from "./StudioRail";
import "./studio-navigation.css";

function useDestinations(){
  const {t,lang}=useLanguage();
  return [
    // `phone: true` marks the two a phone keeps. The studio is a desktop
    // tool — you practise at a stand with a laptop — so a phone gets the
    // two things you would actually reach for away from one: the library
    // and your own record.
    {key:"home",label:t.nav.home,href:"/flute-studio",icon:"home",also:[]},
    {key:"music",label:t.nav.music,href:"/flute-studio/music",icon:"library",phone:true,also:[]},
    {key:"exercises",label:t.nav.exercises,href:"/flute-studio/exercises",icon:"exercises",also:["/flute-studio/breathing"]},
    // Learn is the Resources page plus every page it lists, so the tab stays
    // lit while you are inside a lesson or a chart.
    {key:"resources",label:t.nav.resources,href:"/flute-studio/resources",icon:"learn",also:LEARN_PAGES.map(page=>page.href)},
    {key:"practice",label:t.nav.practice,short:lang==="zh"?"我的":"Me",href:"/flute-studio/practice",icon:"studio",phone:true,also:[]},
  ] as const;
}

type Destination = ReturnType<typeof useDestinations>[number];

function destinationIsActive(destination:Destination,pathname:string){
  if(destination.key==="home")return pathname==="/flute-studio";
  return [destination.href,...destination.also].some(href=>pathname.startsWith(href));
}

export default function StudioNavigation(){
  const pathname=usePathname();
  const router=useRouter();
  const {t,lang}=useLanguage();
  const destinations=useDestinations();
  // Folded by default, like YouTube's: icons with a word under each. The
  // menu button opens it to show what is inside each tab, and the choice
  // sticks between visits.
  const railOpen=useRailOpen();
  const toggleRail=()=>setRailOpen(!railOpen);

  // Phone: the top bar slides away while you scroll down and comes back as
  // soon as you scroll up (or reach the top), like Safari's own toolbar.
  // Each page scrolls its own container, so this listens in the capture
  // phase for any scroll and follows whichever element moved. The CSS only
  // applies the slide at phone width.
  // Remembered with the page it was hidden on, so opening another page
  // always shows the bar again.
  const [hiddenOn,setHiddenOn]=useState<string|null>(null);
  const hidden=hiddenOn===pathname;
  useEffect(()=>{
    const setHidden=(value:boolean)=>setHiddenOn(value?window.location.pathname:null);
    const last=new WeakMap<EventTarget,number>();
    const onScroll=(event:Event)=>{
      const target=event.target;
      const top=target instanceof Element?target.scrollTop:window.scrollY;
      if(target instanceof Element&&target.scrollHeight-target.clientHeight<80)return;
      const before=last.get(target??window)??top;last.set(target??window,top);
      if(top<40)setHidden(false);
      else if(top-before>6)setHidden(true);
      else if(before-top>6)setHidden(false);
    };
    document.addEventListener("scroll",onScroll,{capture:true,passive:true});
    return()=>document.removeEventListener("scroll",onScroll,{capture:true});
  },[]);

  // Production has a real network hop. Warm the persistent studio
  // destinations after the current page settles so brand and tab clicks do
  // not wait for their route payload before reacting.
  useEffect(()=>{
    const timer=window.setTimeout(()=>{
      ["/flute-studio","/flute-studio/music","/flute-studio/exercises","/flute-studio/resources","/flute-studio/practice","/flute-studio/tools"].forEach(href=>router.prefetch(href));
    },1000);
    return()=>window.clearTimeout(timer);
  },[router]);

  return <>
  <header className="studio-navigation" data-rail={railOpen?"open":"folded"} data-hidden={hidden?"":undefined}>
    <div className="studio-navigation__inner">
      {/* Only shown where the rail is (wide screens). */}
      <button type="button" className="studio-navigation__menu" onClick={toggleRail} aria-expanded={railOpen} aria-controls="studio-rail" aria-label={t.nav.menu}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
      <Link className="studio-navigation__brand" href="/flute-studio" aria-label={t.nav.brandHome}>
        <span className="studio-navigation__brand-mark" aria-hidden="true">
          <i className="crumb c1"/><i className="crumb c2"/><i className="crumb c3"/>
        </span>
        <span>{t.nav.brand}</span>
      </Link>
      <nav className="studio-navigation__tabs" aria-label={lang==="zh"?"工作室导航":"Studio navigation"}>
        {destinations.map(destination=>{
          const active=destinationIsActive(destination,pathname);
          return <Link
            key={destination.key}
            data-key={destination.key}
            data-phone={"phone" in destination&&destination.phone?"":undefined}
            href={destination.href}
            className={active?"studio-navigation__tab is-active":"studio-navigation__tab"}
            aria-current={active?"page":undefined}
          >
            {/* Words only. Every tab having a glyph made the bar read as a
                row of symbols with captions rather than as navigation, and
                the labels already say it. */}
            {/* A short name for the phone bar, where "My Studio" was cut off. */}
            {"short" in destination&&destination.short
              ?<><span className="studio-navigation__label--long">{destination.label}</span><span className="studio-navigation__label--short">{destination.short}</span></>
              :<span>{destination.label}</span>}
          </Link>;
        })}
      </nav>
      <div className="studio-navigation__actions">
        {/* The practice dock portals its launcher in here. It used to float
            in the bottom-right corner, where it competed with the cookie
            for the same spot; it belongs with the account control, since
            like that one it is available on every page. */}
        {/* The practice clock: shows its time right here while it runs. */}
        <PracticeClockButton/>
        <div id="practice-tools-slot" className="studio-navigation__tools-slot"/>
        <AccountMenu/>
      </div>
    </div>
  </header>
  {/* Wide screens only: the same destinations as a left rail, so the top
      bar gives its height back to the page. Laptop screens are short and
      wide; the rail spends width, which they have to spare. */}
  <StudioRail open={railOpen} destinations={destinations.map(destination=>({key:destination.key,label:destination.label,href:destination.href,icon:destination.icon,active:destinationIsActive(destination,pathname)}))}/>
  </>;
}
