/**
 * Scale engraving against the actual available reading area, not device
 * names. Ramps up to a true 1.0 (standard notation size) by a comfortable
 * ~1070px reading width and stays there — extra width beyond that should
 * fit more music per line/page (see the wide-page CSS), not inflate notes
 * past normal size by default. Only genuinely narrow (phone) widths scale
 * down, and only as far as still-readable (.55 floor). A size preference above
 * about 1.3 really does enlarge the notes (it used to stop at 1.2, so the top
 * of the slider did nothing on a big screen).
 */
export function notationScale(width:number,height:number,preference=1){
  const widthFactor=Math.max(.55,Math.min(1,.55+(width-320)*.0006));
  const heightFactor=Math.max(.88,Math.min(1,height/650));
  return Math.max(.4,Math.min(2,widthFactor*heightFactor*preference));
}
export function pageOffsets(systems:{top:number;bottom:number}[],height:number,maxScroll:number){
  const offsets=[0];let start=0;
  for(const system of systems){
    if(system.bottom-start>height&&system.top>start+24){
      const next=Math.max(0,Math.min(maxScroll,system.top-24));
      if(next>offsets[offsets.length-1]+1){offsets.push(next);start=next}
    }
  }
  return offsets;
}
/** maxScroll: the scroller's real limit. Scrolled to the bottom is the last page, even when that page's start lies past it. */
export function pageAt(offsets:number[],top:number,maxScroll?:number){
  if(maxScroll!==undefined&&maxScroll>0&&top>=maxScroll-2)return offsets.length-1;
  let index=0;for(let i=1;i<offsets.length;i++){if(offsets[i]>top)break;index=i}return index;
}
/**
 * The height pages are cut for, kept steady while a phone's window breathes: the reader's header tucking away
 * (about 44px) or Safari's toolbar showing and hiding (50 to 80px) used to re-cut the pages, so the total changed
 * after a turn ("1 / 3" became "1 / 4"). A new width (rotation) starts over; a shorter window is always taken, so
 * every page still fits; a taller one only when it grows by more than `grow` (full screen, a real resize).
 * The caller passes the height with Safari's toolbar showing (see smallViewportGap), so the shorter case is rare.
 */
export function stablePageHeight(previous:{width:number;height:number}|null,width:number,height:number,grow=120){
  if(!previous||previous.width!==width||height<previous.height||height>previous.height+grow)return {width,height};
  return previous;
}

export function tabletReader(touchPoints:number,shortestScreenEdge:number){
  return touchPoints>1&&shortestScreenEdge>=600;
}
export function initialReaderLayout(tablet:boolean,saved?:string|null,tabletSaved?:string|null){
  const valid=(value?:string|null)=>value==='900'||value==='auto'||value==='spread';
  return tablet?(valid(tabletSaved)?tabletSaved!:'auto'):(valid(saved)?saved!:'spread');
}
