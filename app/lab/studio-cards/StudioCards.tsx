"use client";

import Link from "next/link";
import ScaleStudioPreview from "../../flute-studio/ScaleStudioPreview";
import LongTonePreview from "../../flute-studio/LongTonePreview";
import BreathingPreview from "../../flute-studio/BreathingPreview";
import {libraryShelf,pieceTitle} from "../../../content/music-library";
import "../../flute-studio/components/piece-chip.css";
import "./studio-cards.css";

/**
 * Practice row study (Nov 12): the live tiles ("Now") above the same demos redrawn in ink, to borrow the Tricky bits
 * tile's printed feel. Second try: the first (still drawings, engraving-type labels, a serif title list) was rejected.
 */
const PICKS=["johann-sebastian-bach-badinerie","camille-saint-saens-le-cygne","traditional-amazing-grace"];
const picks=()=>PICKS.map(id=>libraryShelf.find(i=>i.id===id)).filter(i=>i?.viewerPath);

function Tile({tint,title,href,children}:{tint:string;title:string;href:string;children:React.ReactNode}){
  return <Link href={href} className={`preview-card preview-card--${tint} ink-tile`}>
    <div className="preview-card__stage ink-stage">{children}</div>
    <div className="preview-card__copy"><b>{title}</b></div>
  </Link>;
}

export default function StudioCards(){
  return <main className="studio-shell"><section className="studio-main"><div className="home-content sc home-preview">
    <h2 className="home-preview__group">Practice, now</h2>
    <section className="home-preview-grid practice-tiles">
      <Tile tint="scales" title="Scale Studio" href="/flute-studio/exercises/scales"><div className="practice-tile__fit"><ScaleStudioPreview zh={false} bar/></div></Tile>
      <Tile tint="tones" title="Long tones" href="/flute-studio/exercises/long-tones"><div className="practice-tile__fit"><LongTonePreview zh={false}/></div></Tile>
      <div className="preview-card preview-card--music">
        <div className="preview-card__stage"><div className="music-picks">
          {picks().map(i=><Link key={i!.id} className="piece-chip" href={i!.viewerPath!}>{pieceTitle(i!,false)}</Link>)}
          <Link className="piece-chip music-picks__all" href="/flute-studio/music">All music ›</Link>
        </div></div>
        <div className="preview-card__copy"><b>Browse music</b></div>
      </div>
      <Tile tint="breathing" title="Breathing Lab" href="/flute-studio/breathing"><div className="practice-tile__fit"><BreathingPreview zh={false}/></div></Tile>
    </section>

    {/* Ink: the same live demos, same size and motion, redrawn in black ink (studio-cards.css). */}
    <h2 className="home-preview__group">Practice, ink</h2>
    <section className="home-preview-grid practice-tiles ink-row">
      <Tile tint="scales" title="Scale Studio" href="/flute-studio/exercises/scales"><div className="practice-tile__fit"><ScaleStudioPreview zh={false} bar/></div></Tile>
      <Tile tint="tones" title="Long tones" href="/flute-studio/exercises/long-tones"><div className="practice-tile__fit"><LongTonePreview zh={false}/></div></Tile>
      <div className="preview-card preview-card--music">
        <div className="preview-card__stage"><div className="music-picks">
          {picks().map(i=><Link key={i!.id} className="piece-chip" href={i!.viewerPath!}>{pieceTitle(i!,false)}</Link>)}
          <Link className="piece-chip music-picks__all" href="/flute-studio/music">All music ›</Link>
        </div></div>
        <div className="preview-card__copy"><b>Browse music</b></div>
      </div>
      <Tile tint="breathing" title="Breathing Lab" href="/flute-studio/breathing"><div className="practice-tile__fit"><BreathingPreview zh={false}/></div></Tile>
    </section>
  </div></section></main>;
}
