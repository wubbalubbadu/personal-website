"use client";
import {usePrivateMusic} from "../lib/privateMusic";

import {useMemo,useState,useSyncExternalStore} from "react";
import {libraryShelf as publicShelf,libraryTags,hasTag,tagKey} from "../../../content/music-library";
import MusicRow from "../MusicRow";
import {tagTone,BEGINNER_TONE} from "../lib/tagTone";
import {STATUSES,STATUS_LABELS,STATUS_TONES,useStatuses} from "../lib/musicStatus";
import "../components/status-button.css";
import {useLanguage} from "../i18n/LanguageContext";
import "./library.css";
import "./library-fixes.css";

/** Chinese labels for the known tags; others show as typed. */
const ZH_TAGS:Record<string,string>={pop:"流行",folk:"民谣",classical:"古典","k-pop":"韩流","j-pop":"日本流行",film:"电影",excerpt:"管弦乐片段",etude:"练习曲",exercise:"练习"};

/** The chips that come first, after All; other tags follow Saved music and Good first pieces. */
const LEAD_TAGS=["classical","exercise","etude","excerpt"];

/** The URL only changes by navigation, which remounts the page, so nothing to subscribe to. */
const noSubscribe=()=>()=>{};

export default function MusicLibrary(){
  const privateMusic=usePrivateMusic();
  const libraryShelf=useMemo(()=>[...publicShelf,...privateMusic.items],[privateMusic.items]);
  const {t,lang}=useLanguage(),zh=lang==="zh";
  // Chips are built from the tags in use, so a new tag typed in the uploader
  // shows up here on its own. Known tags get a Chinese label; others show as typed.
  const tags=useMemo(()=>libraryTags(libraryShelf),[libraryShelf]);
  const tagLabel=(tag:string)=>zh?ZH_TAGS[tagKey(tag)]??tag:tagKey(tag)==="excerpt"?"Orchestral excerpts":tag;
  const [query,setQuery]=useState("");
  // A link can open the Library on a shelf (?shelf=beginner, ?tag=etude) or
  // one of your lists (?list=working). ?favorites=1, from before the lists
  // replaced the star, opens Want to learn. The URL is read as an outside
  // store, so the server render and the first client render agree; once a
  // chip is tapped, the tap wins.
  const search=useSyncExternalStore(noSubscribe,()=>location.search,()=>"");
  const fromUrl=useMemo(()=>{
    const params=new URLSearchParams(search),tag=params.get("tag"),list=params.get("list");
    // Matched loosely (?tag=etude), kept as the chip spells it, so the chip lights up.
    const known=tag?tags.find(name=>tagKey(name)===tagKey(tag)):undefined;
    if(list&&(STATUSES as string[]).includes(list))return `status:${list}`;
    if(params.get("favorites")==="1")return "status:want";
    return params.get("shelf")==="beginner"?"beginner":known??"all";
  },[search,tags]);
  // "all", "beginner" (the Good first pieces shelf), "status:want" and the
  // like (your lists) or a tag. null until a chip is tapped.
  const [picked,setShelf]=useState<string|null>(null);
  const shelf=picked??fromUrl;
  const statuses=useStatuses();

  const items=useMemo(()=>{
    // Search looks at everything a row shows: title, composer, tags (in both
    // languages), Good first piece, and an exercise's description. Every word
    // typed has to match somewhere, so "classical bach" narrows rather than widens.
    const matchesQuery=(item:typeof libraryShelf[number])=>{
      const haystack=[item.title,item.composer,item.excerpt?.part??"",item.excerpt?.passage??"",item.excerpt?.zhPassage??"",...item.tags,...item.tags.map(tag=>ZH_TAGS[tagKey(tag)]??""),item.beginner?"good first piece beginner 适合入门":"",statuses[item.id]?`${STATUS_LABELS[statuses[item.id]].en} ${STATUS_LABELS[statuses[item.id]].zh}`:"",item.exercise?.detail??"",item.exercise?.zhTitle??"",item.exercise?.zhDetail??""].join(" ").toLowerCase();
      return query.toLowerCase().split(/\s+/).filter(Boolean).every(word=>haystack.includes(word));
    };
    return libraryShelf.filter(item=>(shelf==="all"||(shelf==="beginner"?item.beginner:shelf.startsWith("status:")?statuses[item.id]===shelf.slice(7):hasTag(item,shelf)))&&matchesQuery(item)).sort((a,b)=>a.title.localeCompare(b.title))},[query,shelf,statuses,libraryShelf]);

  return <main className="library-shell">
    <section className="library-main">
      <div className="library-content">
        <header className="library-page-header" data-tab-title><div><h1>{t.library.title}</h1></div></header>
        <div className="search-filter">
          <label className="library-search"><svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="9" cy="9" r="5.5"/><path d="m13.2 13.2 3.3 3.3"/></svg><span className="sr-only">{t.library.searchPlaceholder}</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.library.searchPlaceholder}/></label>
        </div>
        {/* Chips in order of how often they are the way in: your saved music
            right after All, then the three kinds of music, then the lighter shelves.
            One row that scrolls sideways, fading at the edge that has more. */}
        <div className="category-tabs library-chips" aria-label={t.library.categoriesAria}>
          {(()=>{
            // Tapping the chip that is on turns it off again (back to All), like a filter.
            const chip=(value:string,label:string,mark?:React.ReactNode)=>{const on=shelf===value;const mine=mark!==undefined;return <button key={value} className={`${on?"active":""}${mine?" is-mine":""}`} aria-pressed={on} data-tone={value==="all"||mine?undefined:value==="beginner"?BEGINNER_TONE:tagTone(value)} onClick={()=>{setShelf(on&&value!=="all"?"all":value)}}>{mark}{label}</button>};
            const lead=LEAD_TAGS.map(key=>tags.find(tag=>tagKey(tag)===key)).filter((tag):tag is string=>!!tag);
            const rest=tags.filter(tag=>!lead.includes(tag));
            return <>
              {chip("all",zh?"全部":"All")}
              {/* Your three lists, one kind of chip (grey, with a dot), then a thin
                  divider before the music's own tags. */}
              {STATUSES.map(value=>chip(`status:${value}`,STATUS_LABELS[value][zh?"zh":"en"],<i className="status-dot" data-tone={STATUS_TONES[value]} aria-hidden="true"/>))}
              <span className="library-chips__divider" aria-hidden="true"/>
              {lead.map(tag=>chip(tag,tagLabel(tag)))}
              <span className="library-chips__divider" aria-hidden="true"/>
              {chip("beginner",zh?"适合入门":"Good first pieces")}
              {rest.map(tag=>chip(tag,tagLabel(tag)))}
            </>;
          })()}
        </div>
        <section className="library-list">{items.map(item=><MusicRow key={item.id} item={item} tagLabel={tagLabel}/>)}</section>
        {!items.length&&<div className="no-results"><span>♫</span><b>{shelf.startsWith("status:")?(zh?"这个列表还是空的":"Nothing on this list yet"):t.library.noMatchingMusic}</b><p>{shelf.startsWith("status:")?(zh?"在曲目右侧点 +，或在谱子页面加入列表。":"Tap + on a row, or add from a score's page."):t.library.changeFilters}</p></div>}
      </div>
    </section>
  </main>
}
