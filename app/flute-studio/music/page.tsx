"use client";

import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {musicCategories,musicLibrary,type MusicCategory} from "../../../content/music-library";
import MusicRow from "../MusicRow";
import {useLanguage} from "../i18n/LanguageContext";
import "./library.css";
import "./library-fixes.css";

export default function MusicLibrary(){
  const router=useRouter();
  const {t,lang}=useLanguage(),zh=lang==="zh";
  const labels:Record<MusicCategory,string>=zh
    ?{all:"全部",simple:"入门小曲",pop:"流行音乐",repertoire:"古典曲目",etude:"练习曲",excerpt:"管弦乐片段"}
    :{all:"All",simple:"Simple tunes",pop:"Pop tunes",repertoire:"Classical repertoire",etude:"Etudes",excerpt:"Orchestral excerpts"};
  const [query,setQuery]=useState("");
  const [category,setCategory]=useState<MusicCategory>("all");
  const [favorites,setFavorites]=useState<string[]>([]);
  const [favoritesOnly,setFavoritesOnly]=useState(false);

  useEffect(()=>{const saved=localStorage.getItem("cookie:music-favorites");if(saved)setFavorites(JSON.parse(saved));const params=new URLSearchParams(location.search),initial=params.get("category");if(musicCategories.includes(initial as MusicCategory))setCategory(initial as MusicCategory);if(params.get("favorites")==="1")setFavoritesOnly(true)},[]);
  const items=useMemo(()=>musicLibrary.filter(item=>(category==="all"||item.category===category)&&(!favoritesOnly||favorites.includes(item.id))&&`${item.title} ${item.composer}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.title.localeCompare(b.title)),[query,category,favoritesOnly,favorites]);
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
          {musicCategories.map(value=><button key={value} className={category===value&&!favoritesOnly?"active":""} onClick={()=>{setCategory(value);setFavoritesOnly(false)}}>{labels[value]}</button>)}
          <button className={favoritesOnly?"active":""} onClick={()=>{setFavoritesOnly(true);setCategory("all")}}>{t.library.savedMusicHeading}</button>
        </div>
        <section className="library-list">{items.map(item=><MusicRow key={item.id} item={item} saved={favorites.includes(item.id)} onToggleSave={()=>favorite(item.id)} detail={`${item.composer}${!item.viewerPath?t.library.comingSoon:""}`}/>)}</section>
        {!items.length&&<div className="no-results"><span>♫</span><b>{favoritesOnly?t.library.noSavedMusic:t.library.noMatchingMusic}</b>{!favoritesOnly&&<p>{t.library.changeFilters}</p>}</div>}
      </div>
    </section>
  </main>
}
