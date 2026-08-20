"use client";

import {useEffect,useMemo,useState} from "react";
import {difficultyLevels,musicCategories,musicLibrary,type Difficulty,type MusicCategory} from "../../../content/music-library";
import "./library.css";

const labels:Record<string,string>={all:"All",exercise:"Exercises",repertoire:"Repertoire",etude:"Etudes",method:"Methods","warm-up":"Warm-ups",beginner:"Beginner","early-intermediate":"Early intermediate",intermediate:"Intermediate",advanced:"Advanced"};
const symbols:Record<string,string>={exercise:"♩",repertoire:"♫",etude:"𝄞",method:"≋","warm-up":"◌"};

export default function MusicLibrary(){
  const [query,setQuery]=useState("");
  const [category,setCategory]=useState<MusicCategory>("all");
  const [difficulty,setDifficulty]=useState<Difficulty>("all");
  const [favorites,setFavorites]=useState<string[]>([]);
  const [favoritesOnly,setFavoritesOnly]=useState(false);
  const [filterOpen,setFilterOpen]=useState(false);
  const [compact,setCompact]=useState(false);

  useEffect(()=>{const saved=localStorage.getItem("cookie:music-favorites");if(saved)setFavorites(JSON.parse(saved));const params=new URLSearchParams(location.search),initial=params.get("category");if(musicCategories.includes(initial as MusicCategory))setCategory(initial as MusicCategory);if(params.get("favorites")==="1")setFavoritesOnly(true)},[]);
  const items=useMemo(()=>musicLibrary.filter(item=>(category==="all"||item.category===category)&&(difficulty==="all"||item.difficulty===difficulty)&&(!favoritesOnly||favorites.includes(item.id))&&`${item.title} ${item.composer} ${item.key} ${item.techniques.join(" ")}`.toLowerCase().includes(query.toLowerCase())),[query,category,difficulty,favoritesOnly,favorites]);
  function favorite(id:string){const next=favorites.includes(id)?favorites.filter(item=>item!==id):[...favorites,id];setFavorites(next);localStorage.setItem("cookie:music-favorites",JSON.stringify(next));window.dispatchEvent(new Event("cookie:favorites-updated"))}

  return <main className="library-shell">
    <section className="library-main" onScroll={event=>setCompact(event.currentTarget.scrollTop>42)}>
      <header className={compact?"library-header compact":"library-header"}><div className="compact-nav"><a href="/flute-studio" aria-label="Back to studio">‹</a><strong>Library</strong><button aria-label="Library options">•••</button></div><div className="large-title"><h1>Library</h1><span>{musicLibrary.length} materials</span></div></header>
      <div className="library-content">
        <div className="search-filter"><label className="library-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search music"/><kbd>{items.length}</kbd></label><button className={filterOpen||difficulty!=="all"||favoritesOnly?"filter-trigger active":"filter-trigger"} onClick={()=>setFilterOpen(true)} aria-label="Open library filters"><span>☷</span></button></div>
        <div className="category-tabs" aria-label="Music categories">{musicCategories.map(value=><button key={value} className={category===value?"active":""} onClick={()=>setCategory(value)}>{labels[value]}</button>)}</div>
        <div className="collection-heading"><div><h2>{favoritesOnly?"Saved music":category==="all"?"All music":labels[category]}</h2>{difficulty!=="all"&&<p>{labels[difficulty]}</p>}</div><span>{items.length}</span></div>
        <section className="library-list">{items.map((item,index)=><article className={item.viewerPath?"library-row openable":"library-row"} key={item.id} role={item.viewerPath?"link":undefined} tabIndex={item.viewerPath?0:undefined} onClick={()=>{if(item.viewerPath)window.location.assign(item.viewerPath)}} onKeyDown={event=>{if(item.viewerPath&&(event.key==="Enter"||event.key===" "))window.location.assign(item.viewerPath)}}><div className={`music-symbol tone-${index%4}`} aria-hidden="true">{symbols[item.category]}</div><div className="row-copy"><h3>{item.title}</h3><p>{item.composer} · {labels[item.difficulty]} · {item.key}</p></div><button className={favorites.includes(item.id)?"row-favorite saved":"row-favorite"} aria-label={`${favorites.includes(item.id)?"Remove":"Save"} ${item.title}`} onClick={event=>{event.stopPropagation();favorite(item.id)}}>{favorites.includes(item.id)?"♥":"♡"}</button><span className={item.viewerPath?"row-action":"row-action disabled"}>{item.viewerPath?"Open":"Soon"}</span></article>)}</section>
        {!items.length&&<div className="no-results"><span>♫</span><b>{favoritesOnly?"No saved music":"No matching music"}</b>{!favoritesOnly&&<p>Change the filters or try another search.</p>}</div>}
      </div>
    </section>
    {filterOpen&&<div className="sheet-backdrop" onMouseDown={()=>setFilterOpen(false)}><section className="filter-sheet" role="dialog" aria-modal="true" aria-label="Library filters" onMouseDown={event=>event.stopPropagation()}><i className="sheet-handle"/><header><button onClick={()=>{setDifficulty("all");setFavoritesOnly(false)}}>Reset</button><strong>Filters</strong><button onClick={()=>setFilterOpen(false)}>Done</button></header><div className="inset-group"><label><span><b>Favorites</b><small>Only show saved music</small></span><input type="checkbox" checked={favoritesOnly} onChange={event=>setFavoritesOnly(event.target.checked)}/><i/></label></div><h3>Difficulty</h3><div className="inset-group difficulty-options">{difficultyLevels.map(value=><button key={value} className={difficulty===value?"selected":""} onClick={()=>setDifficulty(value)}><span>{labels[value]}</span><i>{difficulty===value?"✓":""}</i></button>)}</div></section></div>}
  </main>
}
