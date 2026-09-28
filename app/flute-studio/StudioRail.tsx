"use client";

import Link from "next/link";
import {useSyncExternalStore} from "react";
import {usePathname} from "next/navigation";
import {libraryShelf} from "../../content/music-library";
import {exerciseCatalog} from "../../content/exercise-catalog";
import {scaleSetsEvent,scaleSetsKey,type ScaleSet} from "./exercises/scales/saved-sets";
import {useLanguage} from "./i18n/LanguageContext";
import {LEARN_PAGES} from "./learn-pages";
import {useStatusEntries,type MusicStatus} from "./lib/musicStatus";
import {openPracticeTool} from "./PracticeAudio";

/**
 * The desktop rail (wide screens only; iPad and phone keep the top bar).
 *
 * Folded, like YouTube's: an icon with a word under each tab. Open, each tab
 * lists what is inside it, so a saved piece or a Scale Studio set is one
 * click away without going through its page first.
 */

export type RailIcon = "home"|"library"|"exercises"|"learn"|"studio"|"tools";
export type RailDestination = {key:string;label:string;href:string;icon:RailIcon;active:boolean};
type RailChild = {key:string;label:string;href:string;active?:boolean}|{key:string;caption:string};

/** Line icons drawn on a 24 grid like the rest of the studio's icons. */
function RailGlyph({name}:{name:RailIcon}){
  const paths:Record<RailIcon,React.ReactNode>={
    home:<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>,
    library:<><path d="M9 17.5V6l10-2v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/></>,
    exercises:<><path d="M4 19h16"/><path d="M6 19v-4M10 19v-7M14 19v-10M18 19V5"/></>,
    learn:<><path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z"/><path d="M12 6v13.5"/></>,
    tools:<><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></>,
    studio:<><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 9.5h16M8.5 3v4M15.5 3v4"/><path d="M8 13.5h2M14 13.5h2M8 16.5h2"/></>,
  };
  return <svg className="studio-rail__glyph" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

// ── Stored state ────────────────────────────────────────────────────────────
// Read as raw strings so the snapshot is stable between renders (parsing in
// the snapshot would hand React a new array every time).

/** A subscriber for useSyncExternalStore; built once per store, at module level. */
function listenTo(events:string[]){
  const all=[...events,"storage"];
  return (onChange:()=>void)=>{
    all.forEach(name=>window.addEventListener(name,onChange));
    return()=>all.forEach(name=>window.removeEventListener(name,onChange));
  };
}
function useStoredString(key:string,subscribe:(onChange:()=>void)=>()=>void){
  return useSyncExternalStore(subscribe,()=>{try{return localStorage.getItem(key)}catch{return null}},()=>null);
}

function parseList<T>(raw:string|null):T[]{
  try{const value=JSON.parse(raw||"[]");return Array.isArray(value)?value:[]}catch{return []}
}

const RAIL_KEY="cookie:rail-open";
const RAIL_EVENT="cookie:rail-open";
const subscribeRail=listenTo([RAIL_EVENT]);
const subscribeSets=listenTo([scaleSetsEvent]);

/** Whether the rail is open. Folded by default; the choice sticks between visits. */
export function useRailOpen(){
  return useStoredString(RAIL_KEY,subscribeRail)==="1";
}
export function setRailOpen(open:boolean){
  try{localStorage.setItem(RAIL_KEY,open?"1":"0")}
  catch{/* Storage may be disabled; the rail still toggles for this page. */}
  window.dispatchEvent(new Event(RAIL_EVENT));
}

/** How many pieces from your lists the open rail shows before leaving the rest to the Library. */
const SAVED_LIMIT=6;
/** The exercises that are always listed: the fundamentals the Exercises tab features. */
const FEATURED_EXERCISES=exerciseCatalog.filter(entry=>entry.featured&&entry.href);

export default function StudioRail({destinations,open}:{destinations:RailDestination[];open:boolean}){
  const pathname=usePathname();
  const {t,lang}=useLanguage(),zh=lang==="zh";
  // Your lists, most recent first: what you are working on, then what you want to learn.
  const entries=useStatusEntries();
  const onList=(status:MusicStatus)=>entries.filter(entry=>entry.status===status).map(entry=>entry.id);
  const activeIds=[...onList("working"),...onList("want")];
  const sets=parseList<ScaleSet>(useStoredString(scaleSetsKey,subscribeSets)).filter(set=>typeof set?.id==="string"&&typeof set?.name==="string");

  const childrenOf=(key:string):RailChild[]=>{
    if(key==="music"){
      const saved=activeIds.map(id=>libraryShelf.find(item=>item.id===id)).filter(item=>item?.viewerPath&&!item.exercise).slice(0,SAVED_LIMIT);
      return [
        {key:"saved",label:zh?"我的列表":"My lists",href:`/flute-studio/music?list=${onList("working").length?"working":"want"}`},
        ...saved.map(item=>({key:item!.id,label:item!.title,href:item!.viewerPath!,active:pathname===item!.viewerPath})),
      ];
    }
    if(key==="exercises"){
      const savedExercises=exerciseCatalog.filter(entry=>entry.href&&!entry.featured&&activeIds.includes(entry.id));
      const hasSaved=sets.length>0||savedExercises.length>0;
      // Your saved ones first, then the tools everyone has.
      return [
        ...(hasSaved?[{key:"saved-caption",caption:zh?"我的练习":"My exercises"}]:[]),
        ...sets.map(set=>({key:`set-${set.id}`,label:set.name,href:`/flute-studio/exercises/scales?set=${encodeURIComponent(set.id)}`})),
        ...savedExercises.map(entry=>({key:entry.id,label:zh?entry.zhTitle:entry.title,href:entry.href!,active:pathname.startsWith(entry.href!)})),
        ...(hasSaved?[{key:"all-caption",caption:zh?"全部":"All exercises"}]:[]),
        ...FEATURED_EXERCISES.map(entry=>({key:entry.id,label:zh?entry.zhTitle:entry.title,href:entry.href!,active:pathname.startsWith(entry.href!)})),
      ];
    }
    if(key==="resources")return LEARN_PAGES.map(page=>({key:page.key,label:zh?page.zh:page.en,href:page.href,active:pathname.startsWith(page.href)}));
    return [];
  };

  return <nav id="studio-rail" className="studio-rail" data-open={open?"":undefined} aria-label="Studio sections">
    {destinations.map(destination=>{
      const children=open?childrenOf(destination.key):[];
      // Only the most specific place you are gets the highlight: inside a
      // lesson, the lesson is lit and Learn just stays bold, rather than two
      // stacked grey blocks.
      const childActive=children.some(child=>"active" in child&&child.active);
      const classes=["studio-rail__item"];
      if(destination.active)classes.push("is-active");
      if(destination.active&&!childActive)classes.push("is-current");
      return <div className="studio-rail__group" key={destination.key}>
        <Link href={destination.href} className={classes.join(" ")} aria-current={destination.active&&!childActive?"page":undefined}>
          <RailGlyph name={destination.icon}/>
          <span>{destination.label}</span>
        </Link>
        {children.length>0&&<ul className="studio-rail__children">
          {children.map(child=>"caption" in child
            ?<li key={child.key} className="studio-rail__caption">{child.caption}</li>
            :<li key={child.key}><Link href={child.href} className={child.active?"is-current":undefined} aria-current={child.active?"page":undefined}>{child.label}</Link></li>)}
        </ul>}
      </div>;
    })}
    {/* Tools goes to the Tools page; open, the rail also lists each tool,
        which opens straight in the practice dock over the current page. It
        is here as well as in the top bar because the corner button alone
        was easy to miss. */}
    <div className="studio-rail__group studio-rail__group--tools">
      <Link href="/flute-studio/tools" className={pathname.startsWith("/flute-studio/tools")?"studio-rail__item is-active is-current":"studio-rail__item"} aria-current={pathname.startsWith("/flute-studio/tools")?"page":undefined}>
        <RailGlyph name="tools"/>
        <span>{t.nav.tools}</span>
      </Link>
      {open&&<ul className="studio-rail__children">
        {(["tuner","metronome","drone"] as const).map(tool=><li key={tool}><button type="button" onClick={()=>openPracticeTool(tool)}>{t.quickTools[tool]}</button></li>)}
      </ul>}
    </div>
  </nav>;
}
