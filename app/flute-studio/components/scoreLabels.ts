/**
 * Note labels shared by the score reader and the close-up. No React and no
 * reader state: input in, text or DOM out.
 */
const SYLLABLE:Record<string,string>={C:"Do",D:"Re",E:"Mi",F:"Fa",G:"Sol",A:"La",B:"Ti"};
const SIGN:Record<string,string>={"♯":"♯","#":"♯","♭":"♭","b":"♭","𝄪":"𝄪","𝄫":"𝄫","♮":""};

/**
 * Fixed Do with plain syllables and the written accidental: A♭ is La♭, F♯ is
 * Fa♯, E♯ stays Mi♯ (the written letter, never the sounding enharmonic). A
 * natural shows no sign. Accepts "A♭" or "A♭4".
 */
export function solfege(written:string){
  const match=written.match(/^([A-G])(.*?)-?\d*$/);
  if(!match)return written;
  const sign=[...match[2]].map(char=>SIGN[char]??"").join("");
  return `${SYLLABLE[match[1]]}${sign}`;
}

type LabelEvent={p:string|null;d:number;tied?:boolean};
export type NoteLabelOptions={
  kind:"names"|"solfege";
  events:LabelEvent[];
  /** Written pitches ("A♭4"), indexed like events. The label uses the written spelling, never the sounding one. */
  displayPitches?:(string|null)[];
  /** Events that start a beat. Where two labels overlap, the one on a beat stays solid. */
  beatStarts:Set<number>;
  /** Redo only bars from here on; earlier labels are left alone. */
  fromMeasure?:number;
  /** "above": a pill over each note (the default). "below": small plain labels in one lane under the staff. */
  place?:"above"|"below";
  /** "ledger": only notes on ledger lines (A5 and up, C4 and down, as written), for high etudes. */
  only?:"all"|"ledger";
};

/** A written pitch ("A♭5") on ledger lines of the treble staff: A5 or higher, C4 or lower. */
export function onLedgerLines(written:string){
  const match=written.match(/^([A-G])[^\d-]*(-?\d+)$/);if(!match)return false;
  const position="CDEFGAB".indexOf(match[1])+7*Number(match[2]);
  return position>=5+7*5||position<=7*4;
}

const FONT="400 12px Arial";
const BELOW_FONT="400 11px Arial";
const GAP=4;
const widthCache=new Map<string,number>();
let measureContext:CanvasRenderingContext2D|null|undefined;
/** Text width from a canvas, with no DOM layout. */
export function textWidth(text:string,font=FONT){
  const key=`${font}|${text}`,known=widthCache.get(key);
  if(known!==undefined)return known;
  if(measureContext===undefined)measureContext=typeof document==="undefined"?null:document.createElement("canvas").getContext("2d");
  let width=text.length*7;
  if(measureContext){measureContext.font=font;width=measureContext.measureText(text).width}
  widthCache.set(key,width);
  return width;
}

type Placed={el:HTMLElement;left:number;right:number;top:number;bottom:number;beat:boolean};
type Solid={left:number;right:number;top:number;bottom:number};
const COLUMN=16;

/**
 * Name or solfège pills, always above the note. Each pill starts just above
 * its notehead and lifts until it clears every stem, beam, notehead and
 * accidental it would otherwise sit on, so it never covers a note. A slur may
 * run behind a pill; that is fine.
 * (VexFlow draws the stems of beamed notes outside the note's own group, so
 * the collision test uses the drawn geometry, not per-note bookkeeping.)
 * Pills that mostly overlap fade the covered one (the one off the beat, else
 * the later one); the CSS shows it fully on hover. A slight overlap stays solid.
 *
 * Every layout read happens before the first DOM write, and the pills go in
 * as one fragment.
 */
export function placeNoteLabels(root:HTMLElement,options:NoteLabelOptions){
  const from=options.fromMeasure??1;
  root.querySelectorAll<HTMLElement>(".note-pill").forEach(pill=>{if(from<=1||Number(pill.dataset.measure)>=from)pill.remove()});
  const nodes=[...root.querySelectorAll<SVGGElement>(".vf-stavenote[data-event]")].filter(node=>Number(node.dataset.measure)>=from);
  if(!nodes.length)return;
  const scale=root.offsetWidth?root.getBoundingClientRect().width/root.offsetWidth:1;
  const rootBox=root.getBoundingClientRect();
  const toPaper=(x:number,y:number)=>({x:(x-rootBox.left)/scale,y:(y-rootBox.top)/scale});
  const read=(element:Element)=>{const box=element.getBoundingClientRect();return {left:(box.left-rootBox.left)/scale,right:(box.right-rootBox.left)/scale,top:(box.top-rootBox.top)/scale,bottom:(box.bottom-rootBox.top)/scale}};
  // What the pills must stay off, bucketed by x. Only things below the first note being labelled matter.
  const firstTop=Math.min(...nodes.map(node=>read(node).top))-80;
  const grid=new Map<number,Solid[]>();
  const add=(solid:Solid)=>{for(let column=Math.floor(solid.left/COLUMN);column<=Math.floor(solid.right/COLUMN);column++){const bucket=grid.get(column);if(bucket)bucket.push(solid);else grid.set(column,[solid])}};
  const outline=(path:SVGPathElement)=>{
    // Points along the path's own outline (a beam is a thin filled shape, so its edge is the shape), as small boxes.
    if(read(path).bottom<firstTop)return;
    let length=0;try{length=path.getTotalLength()}catch{return}
    const matrix=path.getScreenCTM();if(!matrix||!length)return;
    for(let d=0;d<=length;d+=Math.max(2.5,length/90)){
      const point=path.getPointAtLength(d),screen=new DOMPoint(point.x,point.y).matrixTransform(matrix),at=toPaper(screen.x,screen.y);
      if(at.y<firstTop)continue;
      add({left:at.x-2,right:at.x+2,top:at.y-2,bottom:at.y+2});
    }
  };
  root.querySelectorAll<SVGPathElement>("path.vf-stem").forEach(stem=>{const box=read(stem);if(box.bottom>=firstTop)add({...box,left:box.left-1,right:box.right+1})});
  root.querySelectorAll(".vf-notehead,.vf-modifiers path").forEach(part=>{const box=read(part);if(box.bottom>=firstTop)add(box)});
  root.querySelectorAll<SVGPathElement>(".vf-beam path").forEach(outline);
  const measured=nodes.flatMap(node=>{
    const index=Number(node.dataset.event),event=options.events[index];
    // Grace notes, rests and the second half of a tie carry no label of their own.
    if(!event?.p||event.d===0||event.tied)return [];
    if(options.only==="ledger"&&!onLedgerLines(options.displayPitches?.[index]??event.p))return [];
    const head=node.querySelector(".vf-notehead");if(!head)return [];
    return [{node,index,head:read(head)}];
  });
  const below=options.place==="below";
  // Under the staff: one lane per line of music, just below its lowest staff line or lowest note, whichever is
  // lower, so the labels read as a row instead of hopping around. Dynamics and hairpins there push a label down.
  const lane=new Map<number,number>();
  if(below){
    root.querySelectorAll(".vf-text,[class*='hairpin'],[class*='crescendo']").forEach(part=>{const box=read(part);if(box.bottom>=firstTop)add(box)});
    const staffBottom=new Map<Element,{top:number;bottom:number}>();
    const staffOf=(bar:Element)=>{
      let known=staffBottom.get(bar);if(known)return known;
      const lines=[...bar.children].filter(child=>child instanceof SVGPathElement&&!child.getAttribute("class")).map(read).filter(box=>box.bottom-box.top<2&&box.right-box.left>20);
      const box=lines.length?{top:Math.min(...lines.map(b=>b.top)),bottom:Math.max(...lines.map(b=>b.bottom))}:read(bar);
      known={top:box.top,bottom:box.bottom};staffBottom.set(bar,known);return known;
    };
    for(const item of measured){
      const bar=item.node.closest(".vf-measure");if(!bar)continue;
      const staff=staffOf(bar),key=Math.round(staff.top/8);
      lane.set(key,Math.max(lane.get(key)??0,staff.bottom,item.head.bottom));
    }
    for(const item of measured){const bar=item.node.closest(".vf-measure");(item as {lane?:number}).lane=bar?lane.get(Math.round(staffOf(bar).top/8)):undefined}
  }
  const placed:Placed[]=[],fragment=document.createDocumentFragment(),height=17;
  for(const entry of measured){
    const {node,index,head}=entry;
    const written=options.displayPitches?.[index]??options.events[index].p!,letter=written.replace(/\d/,"");
    const text=options.kind==="solfege"?solfege(letter):letter;
    const centre=(head.left+head.right)/2;
    if(below){
      // Top of the label; it moves down past anything in its way.
      const half=(textWidth(text,BELOW_FONT)+4)/2,tall=13;
      let y=((entry as {lane?:number}).lane??head.bottom)+GAP;
      for(let tries=0;tries<6;tries++){
        let drop=-Infinity;
        for(let column=Math.floor((centre-half)/COLUMN);column<=Math.floor((centre+half)/COLUMN);column++){
          for(const box of grid.get(column)??[])if(box.right>centre-half&&box.left<centre+half&&box.top<y+tall&&box.bottom>y)drop=Math.max(drop,box.bottom);
        }
        if(drop===-Infinity)break;
        y=drop+2;
      }
      const label=document.createElement("span");
      label.className=`practice-overlay note-pill note-pill--below ${options.kind==="solfege"?"solfege-marker":"note-name-marker"}`;
      label.textContent=text;label.dataset.measure=node.dataset.measure??"0";
      label.style.left=`${centre}px`;label.style.top=`${y}px`;
      const placedItem:Placed={el:label,left:centre-half,right:centre+half,top:y,bottom:y+tall,beat:options.beatStarts.has(index)};
      for(let k=placed.length-1;k>=Math.max(0,placed.length-14);k--){
        const other=placed[k],across=Math.min(placedItem.right,other.right)-Math.max(placedItem.left,other.left),down=Math.min(placedItem.bottom,other.bottom)-Math.max(placedItem.top,other.top);
        if(across<=0||down<=0)continue;
        if(across*down<.5*(placedItem.right-placedItem.left)*tall)continue;
        (placedItem.beat&&!other.beat?other:placedItem).el.classList.add("is-covered");
      }
      placed.push(placedItem);fragment.appendChild(label);
      continue;
    }
    const half=(textWidth(text)+10)/2;
    let y=head.top-GAP;
    // Lift above whatever the pill would sit on (a few tries, then leave it).
    for(let tries=0;tries<10;tries++){
      let lift=Infinity;
      for(let column=Math.floor((centre-half)/COLUMN);column<=Math.floor((centre+half)/COLUMN);column++){
        for(const box of grid.get(column)??[])if(box.right>centre-half&&box.left<centre+half&&box.bottom>y-height&&box.top<y)lift=Math.min(lift,box.top);
      }
      if(lift===Infinity)break;
      y=lift-GAP;
    }
    const pill=document.createElement("span");
    pill.className=`practice-overlay note-pill ${options.kind==="solfege"?"solfege-marker":"note-name-marker"}`;
    pill.textContent=text;pill.dataset.measure=node.dataset.measure??"0";
    pill.style.left=`${centre}px`;pill.style.top=`${y}px`;
    const item:Placed={el:pill,left:centre-half,right:centre+half,top:y-height,bottom:y,beat:options.beatStarts.has(index)};
    // Compare with the few pills before it: notes arrive in reading order, so only near neighbours can overlap.
    for(let k=placed.length-1;k>=Math.max(0,placed.length-14);k--){
      const other=placed[k];
      const across=Math.min(item.right,other.right)-Math.max(item.left,other.left),down=Math.min(item.bottom,other.bottom)-Math.max(item.top,other.top);
      if(across<=0||down<=0)continue;
      // A pill that is only clipped at the edge stays solid; it fades when most of it is under another.
      if(across*down<.5*(item.right-item.left)*height)continue;
      const cover=item.beat&&!other.beat?other:item;
      cover.el.classList.add("is-covered");
    }
    placed.push(item);fragment.appendChild(pill);
  }
  root.appendChild(fragment);
}

const ACCIDENTAL_NAME:Record<number,string>={[-2]:"flat-flat",[-1]:"flat",0:"natural",1:"sharp",2:"double-sharp"};
const SHARP_ORDER=["F","C","G","D","A","E","B"];
/** Alteration the key signature gives each letter, from its number of sharps (positive) or flats (negative). */
function keyAlterations(fifths:number){
  const alters:Record<string,number>={};
  if(fifths>0)SHARP_ORDER.slice(0,fifths).forEach(step=>{alters[step]=1});
  if(fifths<0)[...SHARP_ORDER].reverse().slice(0,-fifths).forEach(step=>{alters[step]=-1});
  return alters;
}
const AFTER_ACCIDENTAL=["time-modification","stem","notehead","notehead-text","staff","beam","notations","lyric","play"];

/**
 * Reminder accidentals, written into the MusicXML before it is engraved so the
 * engraver makes room for them and they never sit on a neighbouring note.
 * A reminder goes on:
 * - every note the key signature alters (each F in G major gets its sharp);
 * - a note still under an accidental printed earlier in the same bar, same
 *   octave (the engraver prints it once per bar, and the return is where a
 *   reminder helps).
 * A note whose accidental the engraver prints anyway is left alone, as is the
 * second half of a tie.
 *
 * Returns, for the first part, the index of every note that received one (its
 * place among that part's notes, rests and grace notes included, which is the
 * reader's event index), so the reminder can be styled after engraving.
 */
export function addReminderAccidentals(doc:Document):number[]{
  const reminders:number[]=[];
  doc.querySelectorAll("part").forEach((part,partIndex)=>{
    let fifths=0,ordinal=0;
    part.querySelectorAll(":scope > measure").forEach(measure=>{
      const key=measure.querySelector("attributes > key > fifths");
      if(key)fifths=Number(key.textContent)||0;
      const keyAlter=keyAlterations(fifths),inForce=new Map<string,number>();
      measure.querySelectorAll(":scope > note").forEach(note=>{
        // A chord shares its first note's place in the event list.
        const isChord=!!note.querySelector(":scope > chord");
        const index=isChord?ordinal-1:ordinal;
        if(!isChord)ordinal++;
        const pitch=note.querySelector(":scope > pitch");if(!pitch)return;
        const step=pitch.querySelector("step")!.textContent!,octave=pitch.querySelector("octave")!.textContent!;
        const alter=Number(pitch.querySelector("alter")?.textContent??0),slot=step+octave,expected=keyAlter[step]??0;
        const before=inForce.get(slot)??expected;
        const printed=alter!==before||!!note.querySelector(":scope > accidental");
        inForce.set(slot,alter);
        if(printed)return;
        if(note.querySelector(':scope > tie[type="stop"]'))return;
        const keyNote=alter===expected&&expected!==0,carried=alter!==expected;
        if(!keyNote&&!carried)return;
        const accidental=doc.createElement("accidental");accidental.textContent=ACCIDENTAL_NAME[alter]??"natural";
        const next=AFTER_ACCIDENTAL.map(name=>note.querySelector(`:scope > ${name}`)).find(Boolean)??null;
        note.insertBefore(accidental,next);
        if(partIndex===0)reminders.push(index);
      });
    });
  });
  return reminders;
}
