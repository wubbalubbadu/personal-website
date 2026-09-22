/**
 * Scale engraving against the actual available reading area, not device
 * names. Ramps up to a true 1.0 (standard notation size) by a comfortable
 * ~1070px reading width and stays there — extra width beyond that should
 * fit more music per line/page (see the wide-page CSS), not inflate notes
 * past normal size. Only genuinely narrow (phone) widths scale down, and
 * only as far as still-readable (.55 floor).
 */
export function notationScale(width:number,height:number,preference=1){
  const widthFactor=Math.max(.55,Math.min(1,.55+(width-320)*.0006));
  const heightFactor=Math.max(.88,Math.min(1,height/650));
  return Math.max(.4,Math.min(1.2,widthFactor*heightFactor*preference));
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
export function pageAt(offsets:number[],top:number){
  let index=0;for(let i=1;i<offsets.length;i++){if(offsets[i]>top)break;index=i}return index;
}

export function tabletReader(touchPoints:number,shortestScreenEdge:number){
  return touchPoints>1&&shortestScreenEdge>=600;
}
export function initialReaderLayout(tablet:boolean,saved?:string|null,tabletSaved?:string|null){
  const valid=(value?:string|null)=>value==='900'||value==='auto'||value==='spread';
  return tablet?(valid(tabletSaved)?tabletSaved!:'auto'):(valid(saved)?saved!:'900');
}
