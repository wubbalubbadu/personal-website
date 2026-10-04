/**
 * Tempo and expression words ("Allegro.", "a tempo.", "Piu vivo.") as OSMD
 * draws them, tidied for every score. (Their bold or italic style is the
 * theory layer's job: scoreTheory.directionStyle.)
 *
 * - Words are placed just above the staff, where a slur or a tall stem can
 *   already be. A word that would touch or crowd one is lifted until it clears
 *   it with a little air, never far (a long way up would detach it from the music).
 *
 * Runs on the SVG after every engraving; words already seen are skipped.
 */
const MARGIN=6,MAX_LIFT=34,STEP=3;

type Box={left:number;right:number;top:number;bottom:number};
const sizeOf=(text:SVGTextElement)=>Number(text.getAttribute("font-size")?.replace("px",""))||0;

/** A direction word: a few letters in the size VexFlow uses for them (before the app has styled them, so not by weight). Not a number, a dynamic or a metronome mark; a title or composer line sits clear of everything, so it is never moved. */
function isWord(text:SVGTextElement){
  const content=text.textContent?.trim()??"";
  if(content.length<2||/^[\d.\s]+$/.test(content)||/[♩♪♫=]/.test(content)||/^[pmfsz]{1,4}\.?$/.test(content))return false;
  const size=sizeOf(text);
  return size>=14&&size<=26;
}

export function refineDirectionWords(root:Element){
  root.querySelectorAll<SVGSVGElement>("svg").forEach(svg=>{
    const words=[...svg.querySelectorAll<SVGTextElement>("text")].filter(text=>text.dataset.refined===undefined&&isWord(text));
    if(!words.length)return;
    const box=(element:SVGGraphicsElement):Box=>{const b=element.getBBox();return {left:b.x,right:b.x+b.width,top:b.y,bottom:b.y+b.height}};

    const measured=words.map(text=>({text,box:box(text),size:sizeOf(text)}));

    // What a word must stay clear of, as small boxes: stems, noteheads, and the outlines of slurs and beams.
    const solids:Box[]=[];
    const add=(left:number,right:number,top:number,bottom:number)=>solids.push({left,right,top,bottom});
    svg.querySelectorAll<SVGGraphicsElement>("path.vf-stem,.vf-notehead").forEach(part=>solids.push(box(part)));
    svg.querySelectorAll<SVGPathElement>("g.vf-curve > path,.vf-beam path").forEach(path=>{
      let length=0;try{length=path.getTotalLength()}catch{return}
      for(let at=0;at<=length;at+=Math.max(2.5,length/120)){const point=path.getPointAtLength(at);add(point.x-1.5,point.x+1.5,point.y-1.5,point.y+1.5)}
    });

    for(const {text,box:area} of measured){
      text.dataset.refined="";
      let lift=0;
      for(let tries=0;tries<12&&lift<MAX_LIFT;tries++){
        const top=area.top-lift,bottom=area.bottom-lift;
        // Anything under the word that reaches into its margin (not things already above it).
        const hit=solids.some(solid=>solid.right>area.left-2&&solid.left<area.right+2&&solid.bottom>top&&solid.top<bottom+MARGIN);
        if(!hit)break;
        lift+=STEP;
      }
      if(lift>0)text.setAttribute("y",String((Number(text.getAttribute("y"))||0)-Math.min(lift,MAX_LIFT)));
    }
  });
}
