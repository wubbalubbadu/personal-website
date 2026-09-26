"use client";

import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {musicLibrary,libraryTags,hasTag,tagKey} from "../../../content/music-library";
import MusicRow from "../MusicRow";
import {useLanguage} from "../i18n/LanguageContext";
import "./library.css";
import "./library-fixes.css";

export default function MusicLibrary(){
  const router=useRouter();
  const {t,lang}=useLanguage(),zh=lang==="zh";
  // Chips are built from the tags in use, so a new tag typed in the uploader
  // shows up here on its own. Known tags get a Chinese label; others show as typed.
  const tags=useMemo(()=>libraryTags(),[]);
  const zhTags:Record<string,string>={pop:"流行",folk:"民谣",classical:"古典","k-pop":"韩流","j-pop":"日本流行",film:"电影",excerpt:"管弦乐片段",etude:"练习曲"};
  const tagLabel=(tag:string)=>zh?zhTags[tagKey(tag)]??tag:tag;
  const [query,setQuery]=useState("");
  // "all", "beginner" (the Good first pieces shelf) or a tag.
  const [shelf,setShelf]=useState("all");
  const [favorites,setFavorites]=useState<string[]>([]);
  const [favoritesOnly,setFavoritesOnly]=useState(false);

  useEffect(()=>{const saved=localStorage.getItem("cookie:music-favorites");if(saved)setFavorites(JSON.parse(saved));const params=new URLSearchParams(location.search),initial=params.get("tag");if(params.get("shelf")==="beginner")setShelf("beginner");else if(initial&&tags.some(tag=>tagKey(tag)===tagKey(initial)))setShelf(initial);if(params.get("favorites")==="1")setFavoritesOnly(true)},[]);
  const items=useMemo(()=>musicLibrary.filter(item=>(shelf==="all"||(shelf==="beginner"?item.beginner:hasTag(item,shelf)))&&(!favoritesOnly||favorites.includes(item.id))&&`${item.title} ${item.composer}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.title.localeCompare(b.title)),[query,shelf,favoritesOnly,favorites]);
  function favorite(id:string){const next=favorites.includes(id)?favorites.filter(item=>item!==id):[...favorites,id];setFavorites(next);localStorage.setItem("cookie:music-favorites",JSON.stringify(next));window.dispatchEvent(new Event("cookie:favorites-updated"))}
  function pickOne(){const available=items.filter(item=>item.viewerPath);if(!available.length)return;const choice=available[Math.floor(Math.random()*available.length)];router.push(choice.viewerPath!)}

  return <main className="library-shell">
    <section className="library-main">
      <div className="library-content">
        <header className="library-page-header"><p>{t.library.eyebrow}</p><div><h1>{t.library.title}</h1></div></header>
        <div className="search-filter">
          <label className="library-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.library.searchPlaceholder}/></label>
          <button type="button" className="pick-one-trigger" title={t.library.pickOne} aria-label={t.library.pickOne} onClick={pickOne} disabled={!items.some(item=>item.viewerPath)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7h3.6L17 17h4"/><path d="M3 17h3.6L10 13"/><path d="M18 4l3 3-3 3"/><path d="M18 14l3 3-3 3"/></svg>
            <span>{t.library.pickOne}</span>
          </button>
        </div>
        <div className="category-tabs" aria-label={t.library.categoriesAria}>
          {["all","beginner",...tags].map(value=><button key={value} className={shelf===value&&!favoritesOnly?"active":""} onClick={()=>{setShelf(value);setFavoritesOnly(false)}}>{value==="all"?(zh?"全部":"All"):value==="beginner"?(zh?"适合入门":"Good first pieces"):tagLabel(value)}</button>)}
          <button className={favoritesOnly?"active":""} onClick={()=>{setFavoritesOnly(true);setShelf("all")}}>{t.library.savedMusicHeading}</button>
        </div>
        <section className="library-list">{items.map(item=><MusicRow key={item.id} item={item} saved={favorites.includes(item.id)} onToggleSave={()=>favorite(item.id)} detail={`${item.composer}${!item.viewerPath?t.library.comingSoon:""}`}/>)}</section>
        {!items.length&&<div className="no-results"><span>♫</span><b>{favoritesOnly?t.library.noSavedMusic:t.library.noMatchingMusic}</b>{!favoritesOnly&&<p>{t.library.changeFilters}</p>}</div>}
      </div>
    </section>
  </main>
}
