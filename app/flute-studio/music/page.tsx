"use client";
import {usePrivateMusic} from "../lib/privateMusic";

import {useMemo,useState,useSyncExternalStore} from "react";
import {libraryShelf as publicShelf,libraryTags,hasTag,tagKey,tagName} from "../../../content/music-library";
import MusicRow from "../MusicRow";
import ComposerTimeline from "./ComposerTimeline";
import MusicShelf from "./MusicShelf";
import {tagTone,BEGINNER_TONE} from "../lib/tagTone";
import {STATUSES,STATUS_LABELS,STATUS_TONES,useStatuses,type MusicStatus} from "../lib/musicStatus";
import "../components/status-button.css";
import {useLanguage} from "../i18n/LanguageContext";
import "./library.css";
import "./library-fixes.css";

/** The tags that come first; the others follow Beginner, most used first. */
const LEAD_TAGS=["classical","exercise","etude","excerpt"];

/** The URL only changes by navigation, which remounts the page, so nothing to subscribe to. */
const noSubscribe=()=>()=>{};

type View="list"|"shelf"|"timeline";
const VIEWS:View[]=["list","shelf","timeline"];

export default function MusicLibrary(){
  const privateMusic=usePrivateMusic();
  const libraryShelf=useMemo(()=>[...publicShelf,...privateMusic.items],[privateMusic.items]);
  const {t,lang}=useLanguage(),zh=lang==="zh";
  // Chips are built from the tags in use, so a new tag typed in the uploader
  // shows up here on its own. Known tags get a Chinese label; others show as typed.
  const tags=useMemo(()=>libraryTags(libraryShelf),[libraryShelf]);
  const tagLabel=(tag:string)=>tagName(tag,zh);
  const [query,setQuery]=useState("");
  // A link can open the Library on a shelf (?shelf=beginner, ?tag=etude) or
  // one of your lists (?list=working, from the rail). The lists live in the
  // Shelf view now, so ?list= opens it on that column. ?favorites=1, from
  // before the lists replaced the star, opens Want to learn. The URL is read
  // as an outside store, so the server render and the first client render
  // agree; once a chip is tapped, the tap wins.
  const search=useSyncExternalStore(noSubscribe,()=>location.search,()=>"");
  // The server cannot see the address, so the music waits for the first client render instead of showing the List
  // and then jumping to the Shelf or Timeline a link asked for.
  const ready=useSyncExternalStore(noSubscribe,()=>true,()=>false);
  const fromUrl=useMemo(()=>{
    const params=new URLSearchParams(search),tag=params.get("tag"),list=params.get("list");
    // Matched loosely (?tag=etude), kept as the chip spells it, so the chip lights up.
    const known=tag?tags.find(name=>tagKey(name)===tagKey(tag)):undefined;
    const focus:MusicStatus|undefined=list&&(STATUSES as string[]).includes(list)?list as MusicStatus:params.get("favorites")==="1"?"want":undefined;
    const asked=params.get("view") as View|null;
    return {
      shelf:params.get("shelf")==="beginner"?"beginner":known??"all",
      view:focus?"shelf":asked&&VIEWS.includes(asked)?asked:"list" as View,
      focus,
    };
  },[search,tags]);
  // "all", "beginner" (the Good first pieces shelf) or a tag. null until a chip is tapped.
  const [picked,setShelf]=useState<string|null>(null);
  const shelf=picked??fromUrl.shelf;
  // List, Shelf or Timeline. ?view=shelf and ?view=timeline open those, and switching writes it back into the
  // address, so coming back from a piece returns to the view you left.
  const [pickedView,setPickedView]=useState<View|null>(null);
  const view=pickedView??fromUrl.view;
  const showView=(next:View)=>{
    setPickedView(next);
    const url=new URL(location.href);
    url.searchParams.delete("list");url.searchParams.delete("favorites");
    if(next==="list")url.searchParams.delete("view");else url.searchParams.set("view",next);
    history.replaceState(history.state,"",url);
  };
  const statuses=useStatuses();

  // Search and the tag chips narrow every view, so the row above the music means the same thing in all three.
  const items=useMemo(()=>{
    // Search looks at everything a row shows: title, composer, tags (in both
    // languages), Good first piece, and an exercise's description. Every word
    // typed has to match somewhere, so "classical bach" narrows rather than widens.
    const matchesQuery=(item:typeof libraryShelf[number])=>{
      const haystack=[item.title,item.zhTitle??"",item.composer,item.excerpt?.part??"",item.excerpt?.passage??"",item.excerpt?.zhPassage??"",...item.tags,...item.tags.map(tag=>tagName(tag,true)),item.beginner?"good first piece beginner 适合入门":"",statuses[item.id]?`${STATUS_LABELS[statuses[item.id]].en} ${STATUS_LABELS[statuses[item.id]].zh}`:"",item.exercise?.detail??"",item.exercise?.zhTitle??"",item.exercise?.zhDetail??""].join(" ").toLowerCase();
      return query.toLowerCase().split(/\s+/).filter(Boolean).every(word=>haystack.includes(word));
    };
    return libraryShelf.filter(item=>(shelf==="all"||(shelf==="beginner"?item.beginner:shelf.startsWith("status:")?statuses[item.id]===shelf.slice(7):hasTag(item,shelf)))&&matchesQuery(item)).sort((a,b)=>a.title.localeCompare(b.title))},[query,shelf,statuses,libraryShelf]);

  const lead=LEAD_TAGS.map(key=>tags.find(tag=>tagKey(tag)===key)).filter((tag):tag is string=>!!tag);
  const viewLabels:Record<View,string>={list:zh?"列表":"List",shelf:zh?"书架":"Shelf",timeline:zh?"时间线":"Timeline"};

  return <main className="library-shell">
    <section className="library-main">
      <div className="library-content">
        <header className="library-page-header" data-tab-title><div><h1>{t.library.title}</h1></div></header>
        {/* One row: a short search on the left, the way to look at the music on the right. Phones hide the page
            header and show the title in the top bar, so this row is the first thing there. */}
        <div className="library-toolbar">
          <label className="library-find"><svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="9" cy="9" r="5.5"/><path d="m13.2 13.2 3.3 3.3"/></svg><span className="sr-only">{t.library.searchPlaceholder}</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.library.searchPlaceholder}/></label>
          <div className="view-switch" role="group" aria-label={zh?"显示方式":"View"}>
            {VIEWS.map(value=><button key={value} type="button" aria-pressed={ready&&view===value} onClick={()=>showView(value)}>{viewLabels[value]}</button>)}
          </div>
        </div>
        <div className="category-tabs library-chips" aria-label={t.library.categoriesAria}>
          {(()=>{
            const chip=(value:string,label:string,mark?:React.ReactNode)=>{const on=shelf===value;const mine=mark!==undefined;return <button key={value} className={`${on?"active":""}${mine?" is-mine":""}`} aria-pressed={on} data-tone={value==="all"||mine?undefined:value==="beginner"?BEGINNER_TONE:tagTone(value)} onClick={()=>{setShelf(on&&value!=="all"?"all":value)}}>{mark}{label}</button>};
            const rest=tags.filter(tag=>!lead.includes(tag));
            return <>
              {/* Row one: All and the music's tags. Row two: your three lists. */}
              <span className="library-chips__row">
              {chip("all",zh?"全部":"All")}
              {lead.map(tag=>chip(tag,tagLabel(tag)))}
              {chip("beginner",zh?"入门":"Beginner")}
              {rest.map(tag=>chip(tag,tagLabel(tag)))}
              </span>
              <span className="library-chips__row library-chips__row--lists">
              {STATUSES.map(value=>chip(`status:${value}`,STATUS_LABELS[value][zh?"zh":"en"],<i className="status-dot" data-tone={STATUS_TONES[value]} aria-hidden="true"/>))}
              </span>
            </>;
          })()}
        </div>
        {!ready?null:view==="timeline"?<ComposerTimeline items={items} zh={zh}/>
          :view==="shelf"?<MusicShelf items={items} zh={zh} focus={pickedView?undefined:fromUrl.focus} filtered={shelf!=="all"||!!query.trim()}/>
          :<>
            <section className="library-list">{items.map(item=><MusicRow key={item.id} item={item} tagLabel={tagLabel}/>)}</section>
            {!items.length&&<div className="no-results"><span>♫</span><b>{t.library.noMatchingMusic}</b><p>{t.library.changeFilters}</p></div>}
          </>}
      </div>
    </section>
  </main>
}
