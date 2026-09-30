/**
 * The playback cursor: a thin line that moves through the music while
 * Listen plays, MuseScore style, instead of colouring the sounding note
 * (which lit a half note's stem but only a beamed sixteenth's head, and
 * cost a pass over every note in the piece on every note).
 *
 * Timing comes from playback itself: each note's start and end on the audio
 * clock, so a dotted quarter holds the line for exactly its length and a
 * tempo change is already in the numbers. Between two notes the line glides
 * from one to the next, arriving exactly as the next one sounds; the last
 * note of a line glides to that line's end, then the cursor jumps down.
 */

/** One sounding note on the audio clock (seconds). */
export type CursorBeat={index:number;at:number;end:number};

type Stop={x:number;top:number;bottom:number;lineEnd:number};

/**
 * Where each note is, in the paper's own unscaled coordinates (the paper is
 * CSS-scaled for pinch zoom, and the cursor lives inside it).
 */
export function measureStops(notes:ArrayLike<SVGGElement>,paper:HTMLElement,magnify:number){
  const box=paper.getBoundingClientRect(),stops:(Stop|null)[]=[];
  const staffCache=new Map<Element,{top:number;bottom:number;right:number}>();
  const staffOf=(bar:Element)=>{
    let staff=staffCache.get(bar);if(staff)return staff;
    // The staff is the run of five evenly spaced flat unclassed paths (an
    // 8va bracket or "accel." dashes are flat and unclassed too).
    const flat=[...bar.children].filter(child=>child instanceof SVGPathElement&&!child.getAttribute("class")).map(line=>line.getBoundingClientRect()).filter(rect=>rect.height<2&&rect.width>4).sort((a,b)=>a.top-b.top);
    const at=flat.findIndex((_,i)=>{const run=flat.slice(i,i+5);if(run.length<5)return false;const gap=run[1].top-run[0].top;return gap>2&&run.every((line,k)=>k===0||Math.abs(line.top-run[k-1].top-gap)<1)});
    const five=at>=0?flat.slice(at,at+5):flat,bar_=bar.getBoundingClientRect();
    staff=five.length?{top:five[0].top,bottom:five[five.length-1].bottom,right:Math.max(...five.map(line=>line.right))}:{top:bar_.top,bottom:bar_.bottom,right:bar_.right};
    staffCache.set(bar,staff);return staff;
  };
  for(let i=0;i<notes.length;i++){
    const note=notes[i],bar=note.closest(".vf-measure");
    if(!bar){stops.push(null);continue}
    const head=note.querySelector(".vf-notehead")??note,rect=head.getBoundingClientRect(),staff=staffOf(bar);
    stops.push({x:(rect.left+rect.width/2-box.left)/magnify,top:(staff.top-box.top)/magnify-10,bottom:(staff.bottom-box.top)/magnify+10,lineEnd:(staff.right-box.left)/magnify});
  }
  // A line's end is its last bar's right edge: carry it back through the line.
  for(let i=stops.length-2;i>=0;i--){
    const here=stops[i],next=stops[i+1];
    if(here&&next&&Math.abs(next.top-here.top)<4)here.lineEnd=Math.max(here.lineEnd,next.lineEnd);
  }
  return stops;
}

/** Where the cursor is at audio time `now`, or null between/after notes. */
export function cursorAt(now:number,beats:CursorBeat[],stops:(Stop|null)[],from:{k:number}){
  while(from.k<beats.length-1&&beats[from.k].end<=now)from.k++;
  const beat=beats[from.k];
  if(!beat||now<beat.at||now>=beat.end+.25)return null;
  const here=stops[beat.index];if(!here)return null;
  const nextBeat=beats[from.k+1],next=nextBeat?stops[nextBeat.index]:null;
  const sameLine=!!next&&Math.abs(next.top-here.top)<4&&next.x>here.x;
  const target=sameLine?next!.x:here.lineEnd;
  const span=Math.max(.001,(nextBeat&&sameLine?nextBeat.at:beat.end)-beat.at);
  const progress=Math.min(1,Math.max(0,(now-beat.at)/span));
  return {x:here.x+(target-here.x)*progress,top:here.top,height:here.bottom-here.top};
}
