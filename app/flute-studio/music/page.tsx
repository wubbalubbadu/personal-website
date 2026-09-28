"use client";

import {useEffect,useMemo,useState} from "react";
import {libraryShelf,libraryTags,hasTag,tagKey} from "../../../content/music-library";
import MusicRow from "../MusicRow";
import {useLanguage} from "../i18n/LanguageContext";
import "./library.css";
import "./library-fixes.css";

/** Chinese labels for the known tags; others show as typed. */
const ZH_TAGS:Record<string,string>={pop:"流行",folk:"民谣",classical:"古典","k-pop":"韩流","j-pop":"日本流行",film:"电影",excerpt:"管弦乐片段",etude:"练习曲",exercise:"练习"};

/** The chips that come first, after All; other tags follow Saved music and Good first pieces. */
const LEAD_TAGS=["classical","exercise","etude"];

export default function MusicLibrary(){
  const {t,lang}=useLanguage(),zh=lang==="zh";
  // Chips are built from the tags in use, so a new tag typed in the uploader
  // shows up here on its own. Known tags get a Chinese label; others show as typed.
  const tags=useMemo(()=>libraryTags(libraryShelf),[]);
  const tagLabel=(tag:string)=>zh?ZH_TAGS[tagKey(tag)]??tag:tag;
  const [query,setQuery]=useState("");
  // "all", "beginner" (the Good first pieces shelf) or a tag.
  const [shelf,setShelf]=useState("all");
  const [favorites,setFavorites]=useState<string[]>([]);
  const [favoritesOnly,setFavoritesOnly]=useState(false);

  useEffect(()=>{const saved=localStorage.getItem("cookie:music-favorites");if(saved)setFavorites(JSON.parse(saved));const params=new URLSearchParams(location.search),initial=params.get("tag");if(params.get("shelf")==="beginner")setShelf("beginner");else if(initial&&tags.some(tag=>tagKey(tag)===tagKey(initial)))setShelf(initial);if(params.get("favorites")==="1")setFavoritesOnly(true)},[]);
  const items=useMemo(()=>{
    // Search looks at everything a row shows: title, composer, tags (in both
    // languages), Good first piece, and an exercise's description. Every word
    // typed has to match somewhere, so "classical bach" narrows rather than widens.
    const matchesQuery=(item:typeof libraryShelf[number])=>{
      const haystack=[item.title,item.composer,...item.tags,...item.tags.map(tag=>ZH_TAGS[tagKey(tag)]??""),item.beginner?"good first piece beginner 适合入门":"",item.exercise?.detail??"",item.exercise?.zhTitle??"",item.exercise?.zhDetail??""].join(" ").toLowerCase();
      return query.toLowerCase().split(/\s+/).filter(Boolean).every(word=>haystack.includes(word));
    };
    return libraryShelf.filter(item=>(shelf==="all"||(shelf==="beginner"?item.beginner:hasTag(item,shelf)))&&(!favoritesOnly||favorites.includes(item.id))&&matchesQuery(item)).sort((a,b)=>a.title.localeCompare(b.title))},[query,shelf,favoritesOnly,favorites]);
  function favorite(id:string){const next=favorites.includes(id)?favorites.filter(item=>item!==id):[...favorites,id];setFavorites(next);localStorage.setItem("cookie:music-favorites",JSON.stringify(next));window.dispatchEvent(new Event("cookie:favorites-updated"))}

  return <main className="library-shell">
    <section className="library-main">
      <div className="library-content">
        <header className="library-page-header" data-tab-title><div><h1>{t.library.title}</h1></div></header>
        <div className="search-filter">
          <label className="library-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.library.searchPlaceholder}/></label>
        </div>
        {/* Chips in order of how often they are the way in: the three kinds
            of music first, then your saved music, then the lighter shelves.
            One row that scrolls sideways, fading at the edge that has more. */}
        <div className="category-tabs library-chips" aria-label={t.library.categoriesAria}>
          {(()=>{
            // Tapping the chip that is on turns it off again (back to All), like a filter.
            const chip=(value:string,label:string)=>{const on=shelf===value&&!favoritesOnly;return <button key={value} className={on?"active":""} aria-pressed={on} onClick={()=>{setShelf(on&&value!=="all"?"all":value);setFavoritesOnly(false)}}>{label}</button>};
            const lead=LEAD_TAGS.map(key=>tags.find(tag=>tagKey(tag)===key)).filter((tag):tag is string=>!!tag);
            const rest=tags.filter(tag=>!lead.includes(tag));
            return <>
              {chip("all",zh?"全部":"All")}
              {lead.map(tag=>chip(tag,tagLabel(tag)))}
              <button className={favoritesOnly?"active":""} aria-pressed={favoritesOnly} onClick={()=>{setFavoritesOnly(!favoritesOnly);setShelf("all")}}>{t.library.savedMusicHeading}</button>
              {chip("beginner",zh?"适合入门":"Good first pieces")}
              {rest.map(tag=>chip(tag,tagLabel(tag)))}
            </>;
          })()}
        </div>
        <section className="library-list">{items.map(item=><MusicRow key={item.id} item={item} saved={favorites.includes(item.id)} onToggleSave={()=>favorite(item.id)} tagLabel={tagLabel}/>)}</section>
        {!items.length&&<div className="no-results"><span>♫</span><b>{favoritesOnly?t.library.noSavedMusic:t.library.noMatchingMusic}</b>{!favoritesOnly&&<p>{t.library.changeFilters}</p>}</div>}
      </div>
    </section>
  </main>
}
