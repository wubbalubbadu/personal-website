/** Practice techniques for the close-up. Each one turns the selected notes into groups of notes on a plain
 *  grid (sixteenth = 1 unit) and writes them as MusicXML. The pitch logic is pure, so it is unit-tested
 *  without a DOM; only runsFromXml needs DOMParser. */
export type PracticeNote={step:string;alter:number;octave:number;midi:number;tupletSize?:number;beatIndex:number;/** Number of the written bar the note sits in. */measure?:number};
/** Consecutive pitched attacks. A rest ends a run, and no exercise crosses one. */
export type Run=PracticeNote[];
export type Placed={n:PracticeNote;units:number};
export type Group=Placed[];

const STEP_PC:Record<string,number>={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const glyph=(alter:number)=>alter===1?'♯':alter===-1?'♭':alter===2?'𝄪':alter===-2?'𝄫':'';
export const noteName=(n:PracticeNote,octave=true)=>`${n.step}${glyph(n.alter)}${octave?n.octave:''}`;

/** Selection XML → runs. Ties continue the previous note, grace notes are skipped, spelling and octave are kept. */
export function runsFromXml(xml:string):Run[]{
  const doc=new DOMParser().parseFromString(xml,'application/xml'),runs:Run[]=[];let run:Run=[],beatIndex=0;
  const end=()=>{if(run.length)runs.push(run);run=[]};
  doc.querySelectorAll('part > measure > note').forEach(note=>{
    if(note.querySelector('grace'))return;
    if(note.querySelector('rest')){end();return}
    const measure=Number(note.parentElement?.getAttribute('number'))||undefined;
    const p=note.querySelector('pitch');if(!p)return;
    if(note.querySelector('tie[type="stop"]'))return;
    const step=p.querySelector('step')!.textContent!,alter=Number(p.querySelector('alter')?.textContent??0),octave=Number(p.querySelector('octave')!.textContent);
    const tupletSize=Number(note.querySelector('time-modification > actual-notes')?.textContent)||undefined;
    run.push({step,alter,octave,midi:(octave+1)*12+STEP_PC[step]+alter,tupletSize,beatIndex:beatIndex++,measure});
  });
  end();return runs;
}

const place=(run:Run,units:number):Group=>run.map(n=>({n,units}));

/** Consecutive pairs in each run, divided 3:1 (longShort) or 1:3 (shortLong). A lone last note becomes a quarter. */
export function dottedGroups(runs:Run[],mode:'longShort'|'shortLong'):Group[]{
  const [a,b]=mode==='longShort'?[3,1]:[1,3];
  return runs.flatMap(run=>{const out:Group[]=[];
    for(let i=0;i<run.length;i+=2)out.push(i+1<run.length?[{n:run[i],units:a},{n:run[i+1],units:b}]:[{n:run[i],units:4}]);
    return out;});
}

/** Each adjacent pair twice (A B A B C D C D). shifted starts one note later (B C B C D E D E). A leftover note pairs with its neighbour. */
export function repeatedPairsGroups(runs:Run[],shifted:boolean):Group[]{
  return runs.flatMap(r=>{const run=shifted?r.slice(1):r,out:Group[]=[];if(run.length<2)return out;
    for(let i=0;i<run.length;i+=2){const pair=i+1<run.length?[run[i],run[i+1]]:[run[i-1],run[i]];out.push(place(pair,1),place(pair,1))}
    return out;});
}

/** Overlapping windows moving one note at a time: A B C · B C D · C D E. Runs shorter than the window are skipped. */
export function slidingGroupsGroups(runs:Run[],size:3|4):Group[]{
  return runs.flatMap(run=>Array.from({length:Math.max(0,run.length-size+1)},(_,i)=>place(run.slice(i,i+size),1)));
}

/** Which of `count` attacks get a fermata: about one in four, at least two once there are six notes, never two in a row, different for every seed. */
export function fermataPicks(count:number,seed:number):number[]{
  if(count<1)return [];
  let t=(seed*2654435761+1)>>>0;const rand=()=>{t=(t+0x6D2B79F5)>>>0;let x=t;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);return ((x^(x>>>14))>>>0)/4294967296};
  const order=Array.from({length:count},(_,i)=>i).sort(()=>rand()-.5),want=count>=6?Math.max(2,Math.round(count/4)):Math.max(1,Math.round(count/4)),picked:number[]=[];
  for(const i of order){if(picked.length>=want)break;if(!picked.some(j=>Math.abs(j-i)<2))picked.push(i)}
  return picked.sort((x,y)=>x-y);
}

/** Exercises show only the notes: no tempo words, expression text, metronome marks or chord symbols. */
export function stripMarks(xml:string){
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  doc.querySelectorAll('direction,harmony').forEach(n=>n.remove());
  return new XMLSerializer().serializeToString(doc);
}

/** The written rhythm with fermatas on random notes. Nothing else changes. */
export function addFermatas(xml:string,seed:number){
  const doc=new DOMParser().parseFromString(stripMarks(xml),'application/xml');
  const attacks=Array.from(doc.querySelectorAll('part > measure > note')).filter(n=>n.querySelector('pitch')&&!n.querySelector('grace')&&!n.querySelector('tie[type="stop"]'));
  fermataPicks(attacks.length,seed).forEach(i=>{const note=attacks[i];let ns=note.querySelector('notations');if(!ns){ns=doc.createElement('notations');note.append(ns)}const f=doc.createElement('fermata');f.setAttribute('type','upright');ns.append(f)});
  return new XMLSerializer().serializeToString(doc);
}

/** Pitch sequence of groups, for tests. */
export const pitchSequence=(groups:Group[])=>groups.flatMap(g=>g.map(p=>`${noteName(p.n)}`));

const TYPES:Record<number,[string,boolean]>={1:['16th',false],2:['eighth',false],3:['eighth',true],4:['quarter',false],6:['quarter',true],8:['half',false],12:['half',true],16:['whole',false]};
const noteXml=(p:Placed)=>{const [type,dot]=TYPES[p.units]??TYPES[4];
  return `<note><pitch><step>${p.n.step}</step>${p.n.alter?`<alter>${p.n.alter}</alter>`:''}<octave>${p.n.octave}</octave></pitch><duration>${p.units}</duration><type>${type}</type>${dot?'<dot/>':''}</note>`};


/** Write groups as MusicXML, one bar per written bar of the source (a group belongs to the bar its first note came from). Each bar's meter just
 *  adds up its notes and is meant to be hidden when drawn, so a practice grid never claims to be the piece's time signature. */
export function notesToMusicXML(groups:Group[],key='<key><fifths>0</fifths></key>',clef='<clef><sign>G</sign><line>2</line></clef>'){
  const size=(g:Group)=>g.reduce((s,p)=>s+p.units,0),bars:{number:number;groups:Group[]}[]=[];
  groups.forEach((g,i)=>{const m=g[0]?.n.measure??i,last=bars[bars.length-1];
    if(last&&last.number===m)last.groups.push(g);else bars.push({number:m,groups:[g]})});
  let previous='';
  return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1"><part-list><score-part id="P1"><part-name/></score-part></part-list><part id="P1">${bars.map((bar,i)=>{
    const units=bar.groups.reduce((s,g)=>s+size(g),0),time=units%4===0?`<time><beats>${units/4}</beats><beat-type>4</beat-type></time>`:`<time><beats>${units}</beats><beat-type>16</beat-type></time>`;
    const changed=time!==previous;previous=time;
    return `<measure number="${i+1}">${i===0?`<attributes><divisions>4</divisions>${key}${time}${clef}</attributes>`:changed?`<attributes>${time}</attributes>`:''}${bar.groups.map(g=>g.map(noteXml).join('')).join('')}</measure>`}).join('')}</part></score-partwise>`;
}

type Ctx={key?:string;clef?:string};
export const dotted=(runs:Run[],mode:'longShort'|'shortLong',c:Ctx={})=>notesToMusicXML(dottedGroups(runs,mode),c.key,c.clef);
export const repeatedPairs=(runs:Run[],shifted:boolean,c:Ctx={})=>notesToMusicXML(repeatedPairsGroups(runs,shifted),c.key,c.clef);
export const slidingGroups=(runs:Run[],size:3|4,c:Ctx={})=>notesToMusicXML(slidingGroupsGroups(runs,size),c.key,c.clef);

/** Ways to split a group of `size` notes into two or three beats-of-feel. */
export function splitPatterns(size:number):number[][]{
  const two=(a:number)=>[a,size-a];
  if(size<5)return [];
  if(size===5)return [[3,2],[2,3]];
  if(size===6)return [[3,3],[2,2,2]];
  if(size===7)return [[4,3],[3,4]];
  const high=Math.ceil(size/2);
  return [two(high),two(size-high),...(size%3===0?[Array(size/3).fill(3)]:[])];
}

const BEAM_LEVELS:Record<string,number>={eighth:1,'16th':2,'32nd':3,'64th':4};

/** Keep the written rhythm and pitches; regroup each tuplet of `size` notes by beaming and accenting the sub-groups. */
export function splitTuplets(xml:string,size:number,pattern:number[]){
  const doc=new DOMParser().parseFromString(stripMarks(xml),'application/xml');
  const notes=Array.from(doc.querySelectorAll('part > measure > note')).filter(n=>!n.querySelector('grace'));
  let open:Element[]=[];const groups:Element[][]=[];
  notes.forEach(n=>{
    const actual=Number(n.querySelector('time-modification > actual-notes')?.textContent);
    if(!actual){open=[];return}
    open.push(n);if(open.length===actual){if(actual===size)groups.push(open);open=[]}
  });
  groups.forEach(group=>{
    group.forEach(n=>n.querySelectorAll('beam').forEach(b=>b.remove()));
    let at=0;
    pattern.forEach(count=>{
      const part=group.slice(at,at+count);at+=count;
      const pitched=part.filter(n=>!n.querySelector('rest')&&BEAM_LEVELS[n.querySelector('type')?.textContent??'']);
      if(pitched[0]){let ns=pitched[0].querySelector('notations');if(!ns){ns=doc.createElement('notations');pitched[0].append(ns)}
        const art=doc.createElement('articulations');art.append(doc.createElement('accent'));ns.append(art)}
      if(pitched.length<2)return;
      for(let level=1;level<=4;level++){
        const at=pitched.filter(n=>BEAM_LEVELS[n.querySelector('type')!.textContent!]>=level);
        if(at.length<2&&level>1)continue;
        at.forEach((n,i)=>{const beam=doc.createElement('beam');beam.setAttribute('number',String(level));beam.textContent=at.length<2?'begin':i===0?'begin':i===at.length-1?'end':'continue';
          if(at.length<2)return;n.insertBefore(beam,n.querySelector('notations,lyric'))});
      }
    });
  });
  return {xml:new XMLSerializer().serializeToString(doc),count:groups.length};
}

/** One option per distinct tuplet size found in the selection and per way to split it. */
export function splitOptions(xml:string){
  const doc=new DOMParser().parseFromString(xml,'application/xml'),sizes=new Set<number>();
  let open=0;
  doc.querySelectorAll('part > measure > note').forEach(n=>{
    if(n.querySelector('grace'))return;
    const actual=Number(n.querySelector('time-modification > actual-notes')?.textContent);
    if(!actual){open=0;return}
    open++;if(open===actual){if(actual>=5)sizes.add(actual);open=0}
  });
  return [...sizes].sort((a,b)=>a-b).flatMap(size=>splitPatterns(size).map(pattern=>({size,pattern,title:`${size} as ${pattern.join('+')}`,xml:splitTuplets(xml,size,pattern).xml})));
}

/** Positions (among attacked notes, in order) that carry a fermata, so playback can hold them. */
export function fermataAttackIndexes(xml:string):number[]{
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  const attacks=Array.from(doc.querySelectorAll('part > measure > note')).filter(n=>n.querySelector('pitch')&&!n.querySelector('grace')&&!n.querySelector('tie[type="stop"]'));
  return attacks.flatMap((n,i)=>n.querySelector('fermata')?[i]:[]);
}
