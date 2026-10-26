"use client";

import Link from "next/link";
import {CloseButton} from "./CloseButton";
import {TEMPO_MIN,TEMPO_MAX} from "../lib/scoreTempo";
import {hasTouchScreen} from "../lib/pencilMode";
import {ExcerptTempoMark,useExcerptTempoMark} from "./ExcerptTempoMark";
import PracticeClockButton from "../PracticeClockButton";
import {useEffect,useLayoutEffect,useRef,useState} from "react";
import type {MusicItem} from "../../../content/music-library";
import {useLanguage} from "../i18n/LanguageContext";
import {useRecents} from "../lib/storage";
import {usePracticeAudio} from "../PracticeAudio";
import AccountMenu from "../AccountMenu";
import PracticeRecorder from "../PracticeRecorder";
import {StatusButton} from "./StatusButton";
import {PracticeIcon} from "./PracticeIcon";
import BackChevron from "./BackChevron";
import {AnnotationLayer} from "./AnnotationLayer";
import {ReaderPopover} from "./ReaderPopover";
import {usePaperMagnify} from "./usePaperMagnify";
import {rememberLeftOff} from "../lib/readerActivity";
import "../reader-workspace.css";
import "../music/excerpt-reader.css";

/** Original printed pages share the studio's reader chrome and markup tools. */
/**
 * `passage` pins one passage and hides the tabs (a mock audition asks for that one). `back` replaces the Library back
 * link, and `headerActions` sits after the list button, like ScoreViewer's.
 */
export default function FixedScoreViewer({item,onInteractive,passage:pinned,back,headerActions}:{item:MusicItem;onInteractive?:(passageId:string)=>void;passage?:string;back?:{href:string;label:string};headerActions?:React.ReactNode}){
  const {lang,t}=useLanguage(),zh=lang==="zh",excerpt=item.excerpt!;
  const {record}=useRecents('music');
  const {bpm,setBpm,metro,toggleMetro,initializeScore,setBeats}=usePracticeAudio();
  const scroller=useRef<HTMLDivElement>(null),paper=useRef<HTMLDivElement>(null),shell=useRef<HTMLElement>(null);
  const [annotating,setAnnotating]=useState(false),[toolbar,setToolbar]=useState<HTMLDivElement|null>(null);
  const [fit,setFit]=useState<'page'|'width'>('width'),[pageWidth,setPageWidth]=useState(0),[layoutVersion,setLayoutVersion]=useState(0);
  const [page,setPage]=useState(0),[listen,setListen]=useState(false),[video,setVideo]=useState<string|null>(null),[error,setError]=useState(false),[focus,setFocus]=useState(false);
  const {zoom,zoomAt,reset}=usePaperMagnify(scroller,paper,annotating);
  const [showTempo,setShowTempo]=useExcerptTempoMark();
  // Several passages of one piece are tabs. First visit opens the first (most
  // asked) one, after that the one you last had open; ?passage= wins over both.
  const allPassages=excerpt.passages??[{id:'main',label:excerpt.passage,zhLabel:excerpt.zhPassage,pages:excerpt.pages}];
  const passages=pinned?allPassages.filter(p=>p.id===pinned).concat(allPassages.some(p=>p.id===pinned)?[]:allPassages.slice(0,1)):allPassages;
  const tabKey=`cookie:excerpt-tab:${item.id}`;
  const [passageId,setPassageId]=useState(passages[0].id);
  useEffect(()=>{
    let saved:string|null=null;try{saved=localStorage.getItem(tabKey)}catch{/* First tab still works. */}
    const wanted=new URLSearchParams(window.location.search).get('passage')??saved;
    // ?page= (from Home's "Where you left off"): the printed page, counted from 1. One frame, so both land together.
    const resume=Number(new URLSearchParams(window.location.search).get('page'));
    requestAnimationFrame(()=>{
      if(!pinned&&wanted&&passages.some(p=>p.id===wanted))setPassageId(wanted);
      if(resume>1)setPage(resume-1);
    });
  },[tabKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const passage=passages.find(p=>p.id===passageId)??passages[0],pages=passage.pages;
  // Home's "Where you left off". Not during a mock audition (a pinned passage), which is not where you stopped reading.
  useEffect(()=>{if(!pinned)rememberLeftOff({id:item.id,page:page+1,passage:passage.id})},[pinned,item.id,page,passage.id]);
  // A remembered page past the end (the passage changed since) falls back to the first.
  useEffect(()=>{if(page>=pages.length)requestAnimationFrame(()=>setPage(0))},[page,pages.length]);
  function choosePassage(id:string){reset();setPage(0);setError(false);setPassageId(id);try{localStorage.setItem(tabKey,id)}catch{/* Not remembered this visit. */}}
  // Long passages (several printed pages) open on the whole page, and on a wide
  // screen two pages sit side by side like a part on the stand. Both pages get
  // the same width so the staff size matches; the taller one sets the fit.
  const [wide,setWide]=useState(false);
  useEffect(()=>{requestAnimationFrame(()=>setFit(pages.length>1?'page':'width'))},[pages]);
  const spread=fit==='page'&&wide&&pages.length>1;
  const shown=spread?pages.slice(page,page+2):[pages[page]];
  const step=spread?2:1;
  const pageKey=spread?`${item.id}:${passage.id}:spread:${page}`:passages.length>1?`${item.id}:${passage.id}:page:${page}`:`${item.id}:page:${page}`;
  const metroTaps=useRef<number[]>([]);
  function tapTempo(){const now=performance.now();metroTaps.current=[...metroTaps.current.filter(t=>now-t<3000),now].slice(-5);const taps=metroTaps.current;if(taps.length>1)setBpm(60000/((now-taps[0])/(taps.length-1)))}
  const recordings=item.recordings??[];
  useEffect(()=>{record(item.id);initializeScore(item.pulsePerMeasure?`${item.id}:bar-pulse`:item.id,item.defaultTempo??60);if(item.pulsePerMeasure)setBeats(1)},[record,item.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{
    document.documentElement.classList.toggle('score-focus-mode',focus);
    return()=>document.documentElement.classList.remove('score-focus-mode');
  },[focus]);
  useEffect(()=>{
    const changed=()=>{if(!document.fullscreenElement)setFocus(false)};
    document.addEventListener('fullscreenchange',changed);return()=>document.removeEventListener('fullscreenchange',changed);
  },[]);
  // Fit changes the whole page size, never staff spacing or printed breaks.
  useLayoutEffect(()=>{
    const el=scroller.current;if(!el)return;
    const measure=()=>{
      const css=getComputedStyle(el),available=el.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight);
      // The passage tabs take a row above the page unless they sit in the margin.
      const tabs=el.querySelector<HTMLElement>('.excerpt-passages'),tabRow=tabs&&getComputedStyle(tabs).position!=='absolute'?tabs.offsetHeight+12:0;
      const height=el.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom)-tabRow;
      const ratio=pages[page].width/pages[page].height;
      const tallest=Math.min(...pages.map(p=>p.width/p.height));
      const isWide=pages.length>1&&available>height*tallest*2;setWide(isWide);
      if(fit==='page'&&isWide)setPageWidth(Math.max(1,Math.min((available-16)/2,height*tallest)));
      else setPageWidth(Math.max(1,Math.min(950,available,fit==='page'?height*ratio:Infinity)));
      setLayoutVersion(v=>v+1);
    };
    measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect();
  },[fit,page,pages]);
  const turn=(next:number)=>{if(next<0||next>=pages.length)return;reset();setPage(spread?next-next%2:next);setError(false)};
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(annotating||e.ctrlKey||e.metaKey||e.altKey||(e.target as HTMLElement).closest('input,textarea,button,a,[contenteditable], [role="dialog"]'))return;
      if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();turn(page+step)}
      if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();turn(page-step)}
    };
    document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);
  });
  function toggleFocus(){
    if(focus){setFocus(false);if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});return}
    // Touch screens get focus mode alone: iPad Safari's full screen lays its own × over the toolbar's first buttons.
    setFocus(true);if(!hasTouchScreen())void shell.current?.requestFullscreen?.().catch(()=>{});
  }
  const original=pages[page];
  return <main ref={shell} className="app-shell reader-workspace restored-reader fixed-score-reader" data-annotating={annotating} data-listen={listen||undefined}>
    <section className="workspace">
      <header className="topbar"><div><Link className="back has-tip" href={back?.href??"/flute-studio/music?tag=excerpt"} aria-label={back?.label??(zh?'返回曲库':'Back to Library')}><BackChevron/></Link><strong>{item.title}</strong></div><div>
        <span className="topbar-toolbar-slot"/>
        <StatusButton id={item.id} zh={zh}/>
        {headerActions}
        {onInteractive&&(passage.scorePath??(passages.length===1&&item.scorePath))&&<div className="reader-choice format-switch" role="group" aria-label={zh?'乐谱格式':'Score format'}><button aria-pressed={true}>PDF</button><button aria-pressed={false} onClick={()=>onInteractive(passage.id)}>XML</button></div>}
        <span className="topbar-spacer"/><PracticeClockButton/><div id="reader-tools-slot" className="topbar-tools-slot"/><AccountMenu/>
      </div></header>
      <div className="practice-bar">
        <div className="tool-group"><button data-tip={t.scoreViewer.markUp} className={`tool has-tip${annotating?' on':''}`} aria-pressed={annotating} onClick={()=>setAnnotating(v=>!v)}><PracticeIcon name="markup"/>{t.scoreViewer.markUp}</button>
          {recordings.length>0&&<button data-tip={zh?"参考录音":"Reference recordings"} className={`tool has-tip${listen?' on':''}`} aria-expanded={listen} aria-controls="excerpt-recordings" onClick={()=>{setListen(v=>!v);setVideo(null)}}><PracticeIcon name="play"/>{zh?'聆听':'Listen'}</button>}
        </div>
        <div className="transport"><PracticeRecorder/><div className="transport-pill"><div className="tempo-group"><button data-tip={t.scoreViewer.metronomeTip} className={`tool has-tip${metro?' on':''}`} aria-pressed={metro} onClick={toggleMetro}><PracticeIcon name="metronome"/>{t.scoreViewer.metronome}</button><div className="tempo"><button className="tempo-step" aria-label={zh?'减慢':'Slower'} disabled={bpm<=TEMPO_MIN} onClick={()=>setBpm(bpm-1)}>−</button><label className="tempo-field"><input aria-label={t.scoreViewer.tempoAria} type="number" min="30" max="220" value={bpm} onChange={e=>{const n=Number(e.target.value);if(n>=30&&n<=220)setBpm(n)}}/></label><button className="tempo-step" aria-label={zh?'加快':'Faster'} disabled={bpm>=TEMPO_MAX} onClick={()=>setBpm(bpm+1)}>+</button></div></div><button className="tool has-tip reader-tap" data-tip={t.scoreViewer.tapTempo} aria-label={t.scoreViewer.tapTempo} onClick={tapTempo}><PracticeIcon name="tap"/>{zh?"打拍":"Tap"}</button></div></div>
        <div className="reader-header restored-view-controls"><div className="reader-view"><ReaderPopover label={zh?'显示设置':'View settings'} className="tool has-tip" trigger={<><PracticeIcon name="view"/>{zh?'显示':'View'}</>}>
          <div className="reader-setting-row"><span>{zh?"练习速度":"Practice tempo"}</span><div className="reader-choice" role="group" aria-label={zh?"练习速度":"Practice tempo"}><button aria-pressed={!showTempo} onClick={()=>setShowTempo(false)}>{zh?"隐藏":"Hidden"}</button><button aria-pressed={showTempo} onClick={()=>setShowTempo(true)}>{zh?"显示在乐谱上":"On the page"}</button></div></div>
          <div className="reader-setting-row"><span>{zh?'页面大小':'Page size'}</span><div className="reader-choice"><button aria-pressed={fit==='page'} onClick={()=>{setFit('page');reset()}}>{zh?'整页':'Fit page'}</button><button aria-pressed={fit==='width'} onClick={()=>{setFit('width');reset()}}>{zh?'适应宽度':'Fit width'}</button></div></div>
        </ReaderPopover></div>
        <div className="reader-pages" data-mode="pages"><button className="reader-pages__top" aria-label={zh?'回到开头':'Back to top'} disabled={page===0} onClick={()=>turn(0)}><PracticeIcon name="top"/></button><button aria-label={t.scoreViewer.previousPage} disabled={page===0} onClick={()=>turn(page-step)}><PracticeIcon name="previous"/></button><button aria-label={t.scoreViewer.nextPage} disabled={page+step>=pages.length} onClick={()=>turn(page+step)}><PracticeIcon name="next"/></button><span aria-live="polite">{shown.length>1?`${page+1}–${page+2}`:page+1} / {pages.length}</span><button className="tool has-tip" data-tip={focus?t.scoreViewer.exitFocusMode:t.scoreViewer.focusModeTip} aria-label={focus?t.scoreViewer.exitFocusMode:t.scoreViewer.enterFocusMode} onClick={toggleFocus}><PracticeIcon name={focus?'exitFullscreen':'fullscreen'}/></button></div></div>
      </div>
      <div className="reader-rows"><div className="markup-row" ref={setToolbar}/></div>
      <div className="score-scroll" ref={scroller} data-passages={passages.length>1||undefined}>
        {/* Passage tabs sit on the grey around the page, not in a toolbar row of their own. */}
        {passages.length>1&&<div className="excerpt-passages" role="group" aria-label={zh?'片段':'Passages'}>{passages.map(p=><button key={p.id} className={p.id===passage.id?'active':undefined} aria-pressed={p.id===passage.id} onClick={()=>choosePassage(p.id)}>{zh?p.zhLabel??p.label:p.label}</button>)}{showTempo&&<ExcerptTempoMark itemId={item.id} passageId={passage.id} title={[item.title,zh?passage.zhLabel??passage.label:passage.label].filter(Boolean).join(' · ')} tempo={bpm} onChange={setBpm} sounding={metro} onSound={toggleMetro} zh={zh}/>}</div>}
        {/* Tabs: the pills ride at the end of the tab row. No tabs: their own row above the page, outside it so Draw marks never shift. */}
        {showTempo&&passages.length<2&&pageWidth>0&&<div className="excerpt-tempo-row" style={{width:`${pageWidth*shown.length+(shown.length-1)*16}px`}}><ExcerptTempoMark itemId={item.id} passageId={passage.id} title={[item.title,zh?passage.zhLabel??passage.label:passage.label].filter(Boolean).join(' · ')} tempo={bpm} onChange={setBpm} sounding={metro} onSound={toggleMetro} zh={zh}/></div>}
        <div className="score-paper engraved fixed-score-paper" data-spread={spread||undefined} ref={paper} style={{'--score-layout-width':`${(pageWidth||original.width)*shown.length+(shown.length-1)*16}px`,'--sheet-width':`${pageWidth||original.width}px`,visibility:pageWidth?'visible':'hidden'} as React.CSSProperties}>
          <div className="osmd-score fixed-score-page" data-score-page={page}>
            {/* Native image dimensions reserve the page before loading. */}
            {shown.map((sheet,i)=>
              // eslint-disable-next-line @next/next/no-img-element
              <img key={sheet.src} src={sheet.src} width={sheet.width} height={sheet.height} alt={`${item.title}, ${excerpt.part}, ${passage.label}, ${zh?'第':'page'} ${page+i+1}`} draggable={false} onLoad={()=>{setError(false);setLayoutVersion(v=>v+1)}} onError={()=>setError(true)}/>)}
          </div>
          <AnnotationLayer key={pageKey} id={pageKey} active={annotating} layoutReady={pageWidth>0&&!error} layoutVersion={layoutVersion} toolbar={toolbar} zh={zh} onClose={()=>setAnnotating(false)} zoom={zoom} onZoom={zoomAt}/>
          {error&&<p role="alert" className="excerpt-load-error">{zh?'无法加载谱面。':'The score image could not load.'}</p>}
        </div>
      </div>
      {listen&&<aside id="excerpt-recordings" className="excerpt-recordings" aria-label={zh?'参考录音':'Reference recordings'}>
        {/* Built from the reader's own pieces: CloseButton, the grey/purple chip (.scale-book__chip, purple while playing), a .text-action link. */}
        <header><span>{zh?'参考录音':'Recordings'}</span><CloseButton label={zh?'关闭录音':'Close recordings'} onClick={()=>{setListen(false);setVideo(null)}}/></header>
        {recordings.map(r=><div className="excerpt-recording" key={r.id}>
          <strong>{r.title}</strong><span>{r.performer}</span>
          <div><button type="button" className={`scale-book__chip${video===r.id?' selected':''}`} aria-pressed={video===r.id} onClick={()=>setVideo(video===r.id?null:r.id)}><PracticeIcon name={video===r.id?'stop':'play'}/>{video===r.id?(zh?'停止':'Stop'):(zh?'播放':'Play')}</button><a className="text-action" href={`https://www.youtube.com/watch?v=${r.youtubeId}${r.startSeconds?`&t=${r.startSeconds}s`:''}`} target="_blank" rel="noreferrer">{zh?'在 YouTube 打开':'Open in YouTube'}</a></div>
          {video===r.id&&<iframe title={`${r.title} · ${r.performer}`} src={`https://www.youtube-nocookie.com/embed/${r.youtubeId}?autoplay=1&start=${r.startSeconds??0}`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>}
        </div>)}
      </aside>}
    </section>
  </main>;
}
