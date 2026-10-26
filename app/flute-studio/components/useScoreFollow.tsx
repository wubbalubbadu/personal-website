"use client";
import {useCallback,useEffect,useRef,useState} from "react";

/**
 * Score following: while anything moves the purple cursor (Listen, the click track, the auto drone), the view keeps
 * up with it. The steady click has no cursor, so it never moves the score.
 *
 * - Pages: when the view sits on a page start (Prev/Next, the opening) or shows two pages, the page turns as the
 *   cursor reaches the next one, so a two-page view turns once the right page is played.
 * - Scrolling: anywhere between page starts, and always on a phone, the score glides so the playing line sits near
 *   the top with the next line fully in view. It only moves when that look-ahead line is cut off, not on every line.
 * - Browsing while it plays (wheel, swipe, scroll bar, page keys, Prev/Next, pinch) stops following and shows
 *   Resume following, which jumps back to the playing line and carries on. Tapping a bar to play from it also
 *   rejoins, since the cursor is then where you are reading.
 *
 * Positions come from the cursor line itself (an HTML child of the zoomed paper), never from the SVG, so pinch zoom's
 * CSS `zoom` cannot skew them (see the magnify quirk): the line's own rect gives the scale between the cursor's
 * unscaled paper units and the screen.
 */

/** One engraved line of music, in the cursor's unscaled paper units. */
export type FollowSystem={top:number;bottom:number};

type Options={
  scrollerRef:React.RefObject<HTMLElement|null>;
  /** The cursor is running: Listen, the click track or the auto drone. */
  active:boolean;
  /** Page starts in the scroller's own scroll units (computePages). */
  pageOffsets:()=>number[];
  /** The view is reading page by page right now: two pages, or parked on a page start. */
  paged:()=>boolean;
  /** Turn to a page without counting as browsing. */
  turnPage:(index:number)=>void;
};

const EDGE=16;
const reducedMotion=()=>typeof window!=="undefined"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useScoreFollow({scrollerRef,active,pageOffsets,paged,turnPage}:Options){
  const [following,setFollowing]=useState(true);
  const [direction,setDirection]=useState<"up"|"down"|null>(null);
  // Every new run starts out following (state adjusted during render, React's pattern for resetting on a prop change).
  const [run,setRun]=useState(active);
  if(run!==active){setRun(active);setFollowing(true);setDirection(null)}
  const followingRef=useRef(true),activeRef=useRef(active);
  const callbacks=useRef({pageOffsets,paged,turnPage});
  useEffect(()=>{callbacks.current={pageOffsets,paged,turnPage}});
  /** The cursor as last drawn, so Resume can jump to it and the pill can point at it. */
  const last=useRef<{line:HTMLElement;top:number;height:number;systems:FollowSystem[]}|null>(null);
  const placedTop=useRef<number|null>(null);

  useEffect(()=>{activeRef.current=active;followingRef.current=true;placedTop.current=null;if(!active)last.current=null},[active]);

  /** Where the playing line is relative to the window, for the pill's arrow. */
  const measureDirection=useCallback(()=>{
    const cursor=last.current,scroller=scrollerRef.current;if(!cursor||!scroller)return;
    const rect=cursor.line.getBoundingClientRect(),view=scroller.getBoundingClientRect();
    setDirection(rect.bottom<view.top+EDGE?"up":rect.top>view.bottom-EDGE?"down":null);
  },[scrollerRef]);

  /** The person is reading elsewhere: stop following until Resume. */
  const browse=useCallback(()=>{
    if(!activeRef.current||!followingRef.current)return;
    followingRef.current=false;setFollowing(false);
    requestAnimationFrame(measureDirection);
  },[measureDirection]);

  /** Bring the playing line into view: by page when reading by page, else by a smooth scroll. */
  const place=useCallback((force:boolean)=>{
    const cursor=last.current,scroller=scrollerRef.current;if(!cursor||!scroller||!cursor.height)return;
    const rect=cursor.line.getBoundingClientRect(),view=scroller.getBoundingClientRect();
    const scale=rect.height/cursor.height||1;
    const screenY=(y:number)=>rect.top+(y-cursor.top)*scale;
    const here=cursor.systems.findIndex(system=>Math.abs(system.top-cursor.top)<4);
    const system=cursor.systems[here]??{top:cursor.top,bottom:cursor.top+cursor.height};
    const next=here>=0?cursor.systems[here+1]:undefined;
    const top=screenY(system.top),bottom=screenY(next?next.bottom:system.bottom);
    const phone=window.matchMedia("(max-width:760px)").matches;
    if(!phone&&callbacks.current.paged()){
      const offsets=callbacks.current.pageOffsets(),at=top-view.top+scroller.scrollTop;
      let page=0;for(let i=1;i<offsets.length;i++)if(offsets[i]<=at+4)page=i;
      if(force||Math.abs(scroller.scrollTop-(offsets[page]??0))>2)callbacks.current.turnPage(page);
      return;
    }
    if(!force&&top>=view.top+EDGE&&bottom<=view.bottom-EDGE)return;
    // The playing line sits a fifth of the way down (some of the line before stays for context), or higher when
    // that would cut off the line after it.
    const room=view.height-EDGE-(bottom-top),lead=Math.max(EDGE,Math.min(view.height*.2,room));
    scroller.scrollTo({top:scroller.scrollTop+top-view.top-lead,behavior:reducedMotion()?"instant":"smooth"});
  },[scrollerRef]);

  /** Called by the cursor loop on every frame it draws; only acts when the cursor reaches a new line. */
  const update=useCallback((line:HTMLElement,top:number,height:number,systems:FollowSystem[])=>{
    last.current={line,top,height,systems};
    if(!activeRef.current||!followingRef.current||placedTop.current===top)return;
    placedTop.current=top;place(false);
  },[place]);

  /** The engraving was redrawn (zoom, layout): look again at the next frame. */
  const remeasure=useCallback(()=>{placedTop.current=null},[]);

  const resume=useCallback(()=>{
    followingRef.current=true;setFollowing(true);setDirection(null);
    placedTop.current=last.current?.top??null;place(true);
  },[place]);

  /** Playback jumped to a bar you tapped, so the cursor is where you are reading: follow again from there, without a jump. */
  const rejoin=useCallback(()=>{
    if(followingRef.current)return;
    followingRef.current=true;setFollowing(true);setDirection(null);placedTop.current=null;
  },[]);

  // Browsing gestures on the score. A tap (on a bar, to jump playback there) is not browsing; a swipe is.
  useEffect(()=>{
    const scroller=scrollerRef.current;if(!scroller||!active)return;
    let startY=0,startX=0;
    const drawing=()=>!!scroller.closest('[data-annotating="true"]');
    const wheel=()=>browse();
    const touchStart=(e:TouchEvent)=>{startX=e.touches[0]?.clientX??0;startY=e.touches[0]?.clientY??0};
    const touchMove=(e:TouchEvent)=>{
      if(drawing())return;
      const touch=e.touches[0];if(e.touches.length>1||!touch||Math.hypot(touch.clientX-startX,touch.clientY-startY)>10)browse();
    };
    // The scroll bar itself: a press on the scroller outside its content box.
    const press=(e:PointerEvent)=>{if(e.target===scroller&&(e.offsetX>scroller.clientWidth||e.offsetY>scroller.clientHeight))browse()};
    const keys=(e:KeyboardEvent)=>{
      if(e.defaultPrevented&&!["PageUp","PageDown"].includes(e.key))return;
      const target=e.target as HTMLElement|null;if(target?.closest?.("input,textarea,select,[contenteditable]"))return;
      if(["PageUp","PageDown","Home","End"].includes(e.key))browse();
    };
    const scrolled=()=>{if(!followingRef.current)measureDirection()};
    scroller.addEventListener("wheel",wheel,{passive:true});
    scroller.addEventListener("touchstart",touchStart,{passive:true});
    scroller.addEventListener("touchmove",touchMove,{passive:true});
    scroller.addEventListener("pointerdown",press);
    scroller.addEventListener("scroll",scrolled,{passive:true});
    document.addEventListener("keydown",keys);
    return()=>{scroller.removeEventListener("wheel",wheel);scroller.removeEventListener("touchstart",touchStart);scroller.removeEventListener("touchmove",touchMove);scroller.removeEventListener("pointerdown",press);scroller.removeEventListener("scroll",scrolled);document.removeEventListener("keydown",keys)};
  },[active,browse,measureDirection,scrollerRef]);

  return {following,showResume:active&&!following,direction,update,browse,resume,rejoin,remeasure};
}

/** The Resume following pill: a soft pill just under the toolbar, its arrow pointing at the playing line. */
export function ResumeFollowingPill({direction,zh,onResume}:{direction:"up"|"down"|null;zh:boolean;onResume:()=>void}){
  return <div className="follow-resume" role="status">
    <button type="button" onClick={onResume}>
      <svg viewBox="0 0 24 24" aria-hidden="true" data-direction={direction??"here"}>{direction?<><path d="M12 5v14"/><path d="m6.5 13.5 5.5 5.5 5.5-5.5"/></>:<><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></>}</svg>
      {zh?"继续跟随":"Resume following"}
    </button>
  </div>;
}
