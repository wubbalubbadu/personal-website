"use client";

import {useEffect,useMemo,useState} from "react";
import {difficultyLevels,musicCategories,musicLibrary,type Difficulty,type MusicCategory} from "../../../content/music-library";
import MusicRow from "../MusicRow";
import {useLanguage} from "../i18n/LanguageContext";
import "./library.css";
import "./library-fixes.css";

export default function MusicLibrary(){
  const {t}=useLanguage();
  const labels:Record<string,string>={all:t.library.all,exercise:t.library.exercise,repertoire:t.library.repertoire,etude:t.library.etude,method:t.library.method,"warm-up":t.library.warmup,beginner:t.library.beginner,"early-intermediate":t.library.earlyIntermediate,intermediate:t.library.intermediate,advanced:t.library.advanced};
  const [query,setQuery]=useState("");
  const [category,setCategory]=useState<MusicCategory>("all");
  const [difficulty,setDifficulty]=useState<Difficulty>("all");
  const [favorites,setFavorites]=useState<string[]>([]);
  const [favoritesOnly,setFavoritesOnly]=useState(false);
  const [filterOpen,setFilterOpen]=useState(false);

  useEffect(()=>{const saved=localStorage.getItem("cookie:music-favorites");if(saved)setFavorites(JSON.parse(saved));const params=new URLSearchParams(location.search),initial=params.get("category");if(musicCategories.includes(initial as MusicCategory))setCategory(initial as MusicCategory);if(params.get("favorites")==="1")setFavoritesOnly(true)},[]);
  const items=useMemo(()=>musicLibrary.filter(item=>(category==="all"||item.category===category)&&(difficulty==="all"||item.difficulty===difficulty)&&(!favoritesOnly||favorites.includes(item.id))&&`${item.title} ${item.composer} ${item.key} ${item.techniques.join(" ")}`.toLowerCase().includes(query.toLowerCase())),[query,category,difficulty,favoritesOnly,favorites]);
  function favorite(id:string){const next=favorites.includes(id)?favorites.filter(item=>item!==id):[...favorites,id];setFavorites(next);localStorage.setItem("cookie:music-favorites",JSON.stringify(next));window.dispatchEvent(new Event("cookie:favorites-updated"))}
  function pickOne(){const available=items.filter(item=>item.viewerPath);if(!available.length)return;const choice=available[Math.floor(Math.random()*available.length)];window.location.assign(choice.viewerPath!)}

  return <main className="library-shell">
    <section className="library-main">
      <div className="library-content">
        <header className="library-page-header"><p>{t.library.eyebrow}</p><div><h1>{t.library.title}</h1></div><p className="library-page-intro">{t.library.intro}</p></header>
        <div className="search-filter">
          <label className="library-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.library.searchPlaceholder}/></label>
          <button type="button" className="pick-one-trigger has-tip" data-tip={t.library.pickOne} aria-label={t.library.pickOne} onClick={pickOne} disabled={!items.some(item=>item.viewerPath)}>
            <svg viewBox="0 0 20 20" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h3.5L13 15h4"/><path d="M3 14h3.5L9 10"/><path d="M14 5h3v3"/><path d="M17 5l-3.5 3.5"/><path d="M14 15h3v-3"/><path d="M17 15l-3.5-3.5"/></svg>
          </button>
          <div className="filter-menu">
            <button className={filterOpen||difficulty!=="all"||favoritesOnly?"filter-trigger active has-tip":"filter-trigger has-tip"} data-tip={t.library.filterAria} onClick={()=>setFilterOpen(open=>!open)} aria-label={t.library.filterAria} aria-expanded={filterOpen}>
              <svg viewBox="0 0 20 20" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><line x1="3" y1="6" x2="17" y2="6"/><line x1="3" y1="10" x2="17" y2="10"/><line x1="3" y1="14" x2="17" y2="14"/><circle cx="7" cy="6" r="1.6" fill="currentColor" stroke="none"/><circle cx="13" cy="10" r="1.6" fill="currentColor" stroke="none"/><circle cx="9" cy="14" r="1.6" fill="currentColor" stroke="none"/></svg>
            </button>
            {filterOpen&&<>
              <div className="filter-menu-backdrop" onMouseDown={()=>setFilterOpen(false)}/>
              <section className="filter-menu-pop" role="dialog" aria-label={t.library.filtersAria}>
                <div className="filter-menu-row"><span><b>{t.library.filterFavorites}</b><small>{t.library.filterFavoritesDetail}</small></span><label className="filter-switch"><input type="checkbox" checked={favoritesOnly} onChange={event=>setFavoritesOnly(event.target.checked)}/><i/></label></div>
                <h3>{t.library.filterDifficulty}</h3>
                <div className="filter-menu-options">{difficultyLevels.map(value=><button key={value} className={difficulty===value?"selected":""} onClick={()=>setDifficulty(value)}><span>{labels[value]}</span>{difficulty===value&&<i>✓</i>}</button>)}</div>
                {(difficulty!=="all"||favoritesOnly)&&<button type="button" className="filter-menu-reset" onClick={()=>{setDifficulty("all");setFavoritesOnly(false)}}>{t.library.filterReset}</button>}
              </section>
            </>}
          </div>
        </div>
        <div className="category-tabs" aria-label={t.library.categoriesAria}>{musicCategories.map(value=><button key={value} className={category===value?"active":""} onClick={()=>setCategory(value)}>{labels[value]}</button>)}</div>
        <div className="collection-heading"><div><h2>{favoritesOnly?t.library.savedMusicHeading:category==="all"?t.library.allMusic:labels[category]}</h2>{difficulty!=="all"&&<p>{labels[difficulty]}</p>}</div></div>
        <section className="library-list">{items.map(item=><MusicRow key={item.id} item={item} saved={favorites.includes(item.id)} onToggleSave={()=>favorite(item.id)} detail={`${item.composer} · ${labels[item.difficulty]} · ${item.key}${!item.viewerPath?t.library.comingSoon:""}`}/>)}</section>
        {!items.length&&<div className="no-results"><span>♫</span><b>{favoritesOnly?t.library.noSavedMusic:t.library.noMatchingMusic}</b>{!favoritesOnly&&<p>{t.library.changeFilters}</p>}</div>}
      </div>
    </section>
  </main>
}
