"use client";

import Link from "next/link";
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
import {DownloadIcon} from "./HeaderIcons";
import {AnnotationLayer} from "./AnnotationLayer";
import {ReaderPopover} from "./ReaderPopover";
import {usePaperMagnify} from "./usePaperMagnify";
import "../reader-workspace.css";
import "../music/excerpt-reader.css";

/** Original printed pages share the studio's reader chrome and markup tools. */
export default function FixedScoreViewer({item,onInteractive}:{item:MusicItem;onInteractive?:()=>void}){
  const {lang,t}=useLanguage(),zh=lang==="zh",excerpt=item.excerpt!;
  const {record}=useRecents('music');
  const {bpm,setBpm,metro,toggleMetro,initializeScore,setBeats}=usePracticeAudio();
  const scroller=useRef<HTMLDivElement>(null),paper=useRef<HTMLDivElement>(null),shell=useRef<HTMLElement>(null);
  const [annotating,setAnnotating]=useState(false),[toolbar,setToolbar]=useState<HTMLDivElement|null>(null);
  const [fit,setFit]=useState<'page'|'width'>('page'),[pageWidth,setPageWidth]=useState(0),[layoutVersion,setLayoutVersion]=useState(0);
  const [page,setPage]=useState(0),[listen,setListen]=useState(false),[video,setVideo]=useState<string|null>(null),[error,setError]=useState(false),[focus,setFocus]=useState(false);
  const {zoom,zoomAt,reset}=usePaperMagnify(scroller,paper,annotating);
  const metroTaps=useRef<number[]>([]);
  function tapTempo(){const now=performance.now();metroTaps.current=[...metroTaps.current.filter(t=>now-t<3000),now].slice(-5);const taps=metroTaps.current;if(taps.length>1)setBpm(60000/((now-taps[0])/(taps.length-1)))}
  const recordings=item.recordings??[],selected=recordings.find(r=>r.id===video);
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
      const height=el.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom);
      const ratio=excerpt.pages[page].width/excerpt.pages[page].height;
      setPageWidth(Math.max(1,Math.min(950,available,fit==='page'?height*ratio:Infinity)));
      setLayoutVersion(v=>v+1);
    };
    measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect();
  },[fit,page,excerpt.pages]);
  const turn=(next:number)=>{if(next<0||next>=excerpt.pages.length)return;reset();setPage(next);setError(false)};
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(annotating||e.ctrlKey||e.metaKey||e.altKey||(e.target as HTMLElement).closest('input,textarea,button,a,[contenteditable], [role="dialog"]'))return;
      if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();turn(page+1)}
      if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();turn(page-1)}
    };
    document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);
  });
  function toggleFocus(){
    if(focus){setFocus(false);if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});return}
    setFocus(true);void shell.current?.requestFullscreen?.().catch(()=>{});
  }
  const original=excerpt.pages[page];
  return <main ref={shell} className="app-shell reader-workspace restored-reader fixed-score-reader" data-annotating={annotating} data-listen={listen||undefined}>
    <section className="workspace">
      <header className="topbar"><div><Link className="back has-tip" href="/flute-studio/music?tag=excerpt" aria-label={zh?'返回曲库':'Back to Library'}><BackChevron/></Link><strong>{item.title}</strong></div><div>
        <span className="topbar-toolbar-slot"/>
        <StatusButton id={item.id} zh={zh}/>
        {onInteractive&&<div className="reader-choice" role="group" aria-label={zh?'乐谱格式':'Score format'}><button aria-pressed={true}>PDF</button><button aria-pressed={false} onClick={onInteractive}>XML</button></div>}
        {item.pdfPath&&<a className="icon-btn has-tip" href={item.pdfPath} download aria-label={t.scoreViewer.downloadPdf} data-tip={t.scoreViewer.downloadPdf}><DownloadIcon/></a>}
        <span className="topbar-spacer"/><div id="reader-tools-slot" className="topbar-tools-slot"/><AccountMenu/>
      </div></header>
      <div className="practice-bar">
        <div className="tool-group"><button data-tip={t.scoreViewer.markUp} className={`tool has-tip${annotating?' on':''}`} aria-pressed={annotating} onClick={()=>setAnnotating(v=>!v)}><PracticeIcon name="markup"/>{t.scoreViewer.markUp}</button>
          {recordings.length>0&&<button data-tip={zh?"参考录音":"Reference recordings"} className={`tool has-tip${listen?' on':''}`} aria-expanded={listen} aria-controls="excerpt-recordings" onClick={()=>{setListen(v=>!v);setVideo(null)}}><PracticeIcon name="play"/>{zh?'聆听':'Listen'}</button>}
        </div>
        <div className="transport"><PracticeRecorder/><div className="tempo-group"><button data-tip={t.scoreViewer.metronomeTip} className={`tool has-tip${metro?' on':''}`} aria-pressed={metro} onClick={toggleMetro}><PracticeIcon name="metronome"/>{t.scoreViewer.metronome}</button><div className="tempo"><button className="tempo-step" aria-label={zh?'减慢':'Slower'} disabled={bpm<=30} onClick={()=>setBpm(bpm-1)}>−</button><label className="tempo-field"><input aria-label={t.scoreViewer.tempoAria} type="number" min="30" max="220" value={bpm} onChange={e=>{const n=Number(e.target.value);if(n>=30&&n<=220)setBpm(n)}}/></label><button className="tempo-step" aria-label={zh?'加快':'Faster'} disabled={bpm>=220} onClick={()=>setBpm(bpm+1)}>+</button></div></div><button className="tool has-tip reader-tap" data-tip={t.scoreViewer.tapTempo} aria-label={t.scoreViewer.tapTempo} onClick={tapTempo}><PracticeIcon name="tap"/>{zh?"打拍":"Tap"}</button></div>
        <div className="reader-header restored-view-controls"><div className="reader-view"><ReaderPopover label={zh?'显示设置':'View settings'} className="tool has-tip" trigger={<><PracticeIcon name="view"/>{zh?'显示':'View'}</>}>
          <div className="reader-setting-row"><span>{zh?'页面大小':'Page size'}</span><div className="reader-choice"><button aria-pressed={fit==='page'} onClick={()=>{setFit('page');reset()}}>{zh?'整页':'Fit page'}</button><button aria-pressed={fit==='width'} onClick={()=>{setFit('width');reset()}}>{zh?'适应宽度':'Fit width'}</button></div></div>
        </ReaderPopover></div>
        <div className="reader-pages" data-mode="pages"><button className="reader-pages__top" aria-label={zh?'回到开头':'Back to top'} disabled={page===0} onClick={()=>turn(0)}><PracticeIcon name="top"/></button><button aria-label={t.scoreViewer.previousPage} disabled={page===0} onClick={()=>turn(page-1)}><PracticeIcon name="previous"/></button><button aria-label={t.scoreViewer.nextPage} disabled={page===excerpt.pages.length-1} onClick={()=>turn(page+1)}><PracticeIcon name="next"/></button><span aria-live="polite">{page+1} / {excerpt.pages.length}</span><button className="tool has-tip" data-tip={focus?t.scoreViewer.exitFocusMode:t.scoreViewer.focusModeTip} aria-pressed={focus} aria-label={focus?t.scoreViewer.exitFocusMode:t.scoreViewer.enterFocusMode} onClick={toggleFocus}><PracticeIcon name={focus?'exitFullscreen':'fullscreen'}/></button></div></div>
      </div>
      <div className="reader-rows"><div className="markup-row" ref={setToolbar}/></div>
      <div className="score-scroll" ref={scroller}>
        <div className="score-paper engraved fixed-score-paper" ref={paper} style={{'--score-layout-width':`${pageWidth||original.width}px`,visibility:pageWidth?'visible':'hidden'} as React.CSSProperties}>
          <div className="osmd-score fixed-score-page" data-score-page={page}>
            {/* Native image dimensions reserve the page before loading. The PDF carries this same engraving. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={original.src} src={original.src} width={original.width} height={original.height} alt={`${item.title}, ${excerpt.part}, ${excerpt.passage}, ${zh?'第':'page'} ${page+1}`} draggable={false} onLoad={()=>{setError(false);setLayoutVersion(v=>v+1)}} onError={()=>setError(true)}/>
          </div>
          <AnnotationLayer key={`${item.id}:page:${page}`} id={`${item.id}:page:${page}`} active={annotating} layoutReady={pageWidth>0&&!error} layoutVersion={layoutVersion} toolbar={toolbar} zh={zh} onClose={()=>setAnnotating(false)} zoom={zoom} onZoom={zoomAt}/>
          {error&&<p role="alert" className="excerpt-load-error">{zh?'无法加载谱面。':'The score image could not load.'} <a href={item.pdfPath}>{zh?'打开 PDF':'Open PDF'}</a></p>}
        </div>
      </div>
      {listen&&<aside id="excerpt-recordings" className="excerpt-recordings" aria-label={zh?'参考录音':'Reference recordings'}>
        <header><strong>{zh?'参考录音':'Recordings'}</strong><button aria-label={zh?'关闭录音':'Close recordings'} onClick={()=>{setListen(false);setVideo(null)}}><PracticeIcon name="close"/></button></header>
        {recordings.map(r=><div className="excerpt-recording" key={r.id}><strong>{r.title}</strong><p>{r.performer}</p><div><button aria-pressed={video===r.id} onClick={()=>setVideo(video===r.id?null:r.id)}><PracticeIcon name={video===r.id?'stop':'play'}/>{video===r.id?(zh?'停止':'Stop'):(zh?'播放':'Play')}</button><a href={`https://www.youtube.com/watch?v=${r.youtubeId}${r.startSeconds?`&t=${r.startSeconds}s`:''}`} target="_blank" rel="noreferrer">YouTube ↗</a></div></div>)}
        {selected&&<iframe key={selected.id} title={`${selected.title} · ${selected.performer}`} src={`https://www.youtube-nocookie.com/embed/${selected.youtubeId}?autoplay=1&start=${selected.startSeconds??0}`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>}
      </aside>}
    </section>
  </main>;
}
