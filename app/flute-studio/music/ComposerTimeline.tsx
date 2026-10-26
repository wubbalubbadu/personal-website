"use client";
import Link from "next/link";
import {useEffect,useMemo,useRef,useState} from "react";
import {composerInfo,pieceTitle,type ComposerInfo,type MusicItem} from "../../../content/music-library";
import {Dialog} from "../components/Dialog";
import "./composer-timeline.css";

/**
 * The Library as a timeline: each composer's life as a bar across the
 * centuries, their pieces as dots at the year they were written, over bands
 * for the periods. It joins the catalog to content/composers.json by the
 * composer's name, so only composers with a birth year there get a row.
 * Folk tunes, pop songs and anyone without dates stay in the List view.
 */

type Period={id:string;from:number;to:number;tone:string;en:string;zh:string};
const PERIODS:Period[]=[
  {id:"baroque",from:1600,to:1750,tone:"sand",en:"Baroque",zh:"巴洛克"},
  {id:"classical",from:1750,to:1820,tone:"sage",en:"Classical",zh:"古典"},
  {id:"romantic",from:1820,to:1900,tone:"pink",en:"Romantic",zh:"浪漫"},
  {id:"modern",from:1900,to:2000,tone:"blue",en:"20th century",zh:"20 世纪"},
  {id:"today",from:2000,to:2100,tone:"lavender",en:"Today",zh:"当代"},
];
const periodAt=(year:number)=>PERIODS.find(p=>year>=p.from&&year<p.to)??PERIODS[PERIODS.length-1];

/** Chinese for the words composers.json uses; anything else shows as written. */
const ZH_WORDS:Record<string,string>={German:"德国",French:"法国",Russian:"俄国",Italian:"意大利",Belgian:"比利时",Austrian:"奥地利",English:"英国",American:"美国",
  Baroque:"巴洛克",Classical:"古典主义",Romantic:"浪漫主义","Classical and Romantic":"古典主义与浪漫主义","Early modern":"早期现代"};
/** "1685 to 1750 · German · Baroque", the same facts line as the reader's composer card. */
export function composerFacts(info:ComposerInfo|undefined,zh:boolean){
  if(!info)return "";
  const word=(value?:string)=>value?(zh?ZH_WORDS[value]??value:value):null;
  const life=info.born&&info.died?(zh?`${info.born} 至 ${info.died}`:`${info.born} to ${info.died}`):info.born?(zh?`生于 ${info.born}`:`Born ${info.born}`):null;
  return [life,word(info.nationality),word(info.era)].filter(Boolean).join(" · ");
}

type Row={name:string;info:ComposerInfo;born:number;died:number;dated:MusicItem[];undated:MusicItem[]};

/** Rough width of a piece label in px (13px text plus the dot), for keeping labels off each other. */
const labelWidth=(text:string)=>[...text].reduce((w,ch)=>w+(/[\u3000-\u9fff\uff00-\uffef]/.test(ch)?13:7),0)+18;

export default function ComposerTimeline({items,zh}:{items:MusicItem[];zh:boolean}){
  const rows=useMemo(()=>{
    const byName=new Map<string,Row>();
    for(const item of items){
      if(!item.composer||item.exercise)continue;
      const info=composerInfo(item.composer);
      if(!info?.born)continue;
      let row=byName.get(item.composer);
      if(!row){row={name:item.composer,info,born:info.born,died:info.died??new Date().getFullYear(),dated:[],undated:[]};byName.set(item.composer,row)}
      (item.year?row.dated:row.undated).push(item);
    }
    for(const row of byName.values()){row.dated.sort((a,b)=>a.year!-b.year!);row.undated.sort((a,b)=>a.title.localeCompare(b.title))}
    return [...byName.values()].sort((a,b)=>a.born-b.born||a.name.localeCompare(b.name));
  },[items]);
  const leftOut=useMemo(()=>items.filter(item=>!item.exercise&&item.composer!=="Cookie"&&!composerInfo(item.composer)?.born).length,[items]);

  // The span shown: whole half-centuries around everyone on it.
  const [start,end]=useMemo(()=>{
    if(!rows.length)return [1650,2000];
    const first=Math.min(...rows.map(r=>r.born)),last=Math.max(...rows.map(r=>Math.max(r.died,...r.dated.map(p=>p.year!))));
    return [Math.floor((first-5)/50)*50,Math.ceil((last+5)/50)*50];
  },[rows]);
  const x=(year:number)=>(year-start)/(end-start)*100;

  // Labels go in lanes under the bar so neighbours never overlap; that needs the drawn width.
  const canvas=useRef<HTMLDivElement>(null);
  const [width,setWidth]=useState(720);
  useEffect(()=>{
    const el=canvas.current;if(!el)return;
    const observer=new ResizeObserver(([entry])=>setWidth(entry.contentRect.width));
    observer.observe(el);return()=>observer.disconnect();
  },[]);

  const [open,setOpen]=useState<Row|null>(null);
  const ticks=[];for(let year=start;year<=end;year+=50)ticks.push(year);

  if(!rows.length)return <p className="composer-timeline__note">{zh?"等曲库里有了带年代的作曲家，这里就会出现时间线。":"Once the Library has composers with dates, their timeline shows up here."}</p>;

  return <section className="composer-timeline" aria-label={zh?"作曲家时间线":"Composer timeline"}>
    <div className="composer-timeline__scroll">
      <div className="composer-timeline__canvas" ref={canvas}>
        {/* Period bands sit behind every row, so the rows read as grouped by period. */}
        <div className="composer-timeline__bands" aria-hidden="true">
          {PERIODS.filter(p=>p.to>start&&p.from<end).map(p=>{const from=Math.max(p.from,start),to=Math.min(p.to,end);
            return <div key={p.id} className="composer-timeline__band" data-tone={p.tone} style={{left:`${x(from)}%`,width:`${x(to)-x(from)}%`}}><span>{zh?p.zh:p.en}</span></div>})}
        </div>
        <ol className="composer-timeline__rows">
          {rows.map(row=>{
            const tone=periodAt(row.born+25).tone;
            // Greedy lanes: each label takes the first lane whose last label ends before it starts.
            const laneEnds:number[]=[];
            const labels=row.dated.map(item=>{
              const text=`${pieceTitle(item,zh)} ${item.year}`,w=labelWidth(text),at=x(item.year!)/100*width;
              const flip=at+w>width;const left=flip?at-w+9:at-9;
              let lane=laneEnds.findIndex(e=>e+8<=left);if(lane<0){lane=laneEnds.length;laneEnds.push(0)}
              laneEnds[lane]=left+w;
              return {item,lane,flip};
            });
            return <li key={row.name} className="composer-timeline__row" style={{["--lanes" as string]:Math.max(1,laneEnds.length)}}>
              <div className="composer-timeline__who" style={{marginLeft:`clamp(0px, ${x(row.born)}%, calc(100% - 220px))`}}>
                <button type="button" className="composer-timeline__name" onClick={()=>setOpen(row)}>{row.name}</button>
                <span className="composer-timeline__life">{row.born} {zh?"至":"to"} {row.died}</span>
                {row.undated.map(item=>item.viewerPath
                  ?<Link key={item.id} className="composer-timeline__extra" href={item.viewerPath}>{pieceTitle(item,zh)}</Link>
                  :<span key={item.id} className="composer-timeline__extra is-disabled">{pieceTitle(item,zh)}</span>)}
              </div>
              <div className="composer-timeline__track">
                <span className="composer-timeline__bar" data-tone={tone} style={{left:`${x(row.born)}%`,width:`${x(row.died)-x(row.born)}%`}}/>
                {row.dated.map(item=>item.viewerPath
                  ?<Link key={item.id} href={item.viewerPath} className="composer-timeline__dot" data-tone={tone} style={{left:`${x(item.year!)}%`}} tabIndex={-1} aria-hidden="true"/>
                  :<span key={item.id} className="composer-timeline__dot" data-tone={tone} style={{left:`${x(item.year!)}%`}} aria-hidden="true"/>)}
                {labels.map(({item,lane,flip})=>{
                  const style={left:`${x(item.year!)}%`,top:`calc(22px + ${lane} * 22px)`};
                  const body=<><b>{pieceTitle(item,zh)}</b> <small>{item.year}</small></>;
                  return item.viewerPath
                    ?<Link key={item.id} href={item.viewerPath} className={`composer-timeline__piece${flip?" is-flipped":""}`} style={style}>{body}</Link>
                    :<span key={item.id} className={`composer-timeline__piece is-disabled${flip?" is-flipped":""}`} style={style}>{body}</span>;
                })}
              </div>
            </li>;
          })}
        </ol>
        <div className="composer-timeline__axis" aria-hidden="true">
          {ticks.map(year=><span key={year} style={{left:`${x(year)}%`}}>{year}</span>)}
        </div>
      </div>
    </div>
    {leftOut>0&&<p className="composer-timeline__note">{zh?"民谣、流行歌，还有暂时没有作曲家年代的曲子，都在列表里。":"Folk tunes, pop songs and pieces we don't have composer dates for yet are in the List view."}</p>}

    {open&&<Dialog label={open.name} closeLabel={zh?"关闭":"Close"} onClose={()=>setOpen(null)} title={<h2>{open.name}</h2>} panelClassName="composer-card">
      {composerFacts(open.info,zh)&&<p className="composer-card__facts">{composerFacts(open.info,zh)}</p>}
      <p className="composer-card__bio">{open.info.bio}</p>
      <h3>{zh?"曲库里的作品":"In the Library"}</h3>
      <ul>{[...open.dated,...open.undated].map(item=><li key={item.id}>
        {item.viewerPath?<Link href={item.viewerPath}>{pieceTitle(item,zh)}</Link>:<span>{pieceTitle(item,zh)}</span>}
        {item.year&&<small> ({item.year})</small>}
        {item.about&&<p>{item.about}</p>}
      </li>)}</ul>
    </Dialog>}
  </section>;
}
