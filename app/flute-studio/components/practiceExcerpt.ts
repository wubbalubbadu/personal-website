import {majorKeys,scaleTypes,scaleMusicXML,keyForType,type ScaleTypeId} from '../exercises/scales/scale-score';
import {pitchClass,type PassageEvent} from './passageAnalysis';

const serialize=(doc:Document)=>new XMLSerializer().serializeToString(doc);
export type PracticeVariation='original'|'even'|'slur'|'tongue'|'staccato';

/** Keep the source notation, carrying the active clef, key, meter and divisions into the selection. */
export function extractMeasures(xml:string,from:number,to:number){
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.querySelector('parsererror'))throw new Error('This score could not be opened.');
  const part=doc.querySelector('part');if(!part)throw new Error('No music was found.');
  doc.querySelectorAll('part').forEach(p=>{if(p!==part)p.remove()});
  doc.querySelectorAll('score-part').forEach(p=>{if(p.id!==part.id)p.remove()});
  const bars=Array.from(part.children).filter(n=>n.tagName==='measure');
  const low=Math.max(1,Math.min(from,to)),high=Math.min(bars.length,Math.max(from,to));
  const attributes=new Map<string,Element>(),activeSlurs=new Map<string,Element>();
  bars.slice(0,low-1).forEach(bar=>{
    bar.querySelectorAll('attributes > *').forEach(a=>attributes.set(a.tagName+':'+(a.getAttribute('number')??''),a));
    bar.querySelectorAll('slur').forEach(s=>{const id=s.getAttribute('number')??'1';if(s.getAttribute('type')==='start')activeSlurs.set(id,s);if(s.getAttribute('type')==='stop')activeSlurs.delete(id)});
  });
  bars.forEach((bar,i)=>{if(i<low-1||i>=high)bar.remove()});
  const first=part.querySelector('measure');if(!first)throw new Error('Select at least one measure.');
  let attrs=first.querySelector('attributes');if(!attrs){attrs=doc.createElement('attributes');first.prepend(attrs)}
  attributes.forEach((a,key)=>{if(!Array.from(attrs!.children).some(c=>c.tagName+':'+(c.getAttribute('number')??'')===key))attrs!.append(a.cloneNode(true))});
  const lastDynamic=bars.slice(0,low-1).flatMap(bar=>Array.from(bar.querySelectorAll('direction')).filter(d=>d.querySelector('dynamics'))).at(-1);
  if(lastDynamic){const carried=lastDynamic.cloneNode(true) as Element;carried.querySelectorAll('offset').forEach(n=>n.remove());attrs.after(carried)}
  const notes=Array.from(part.querySelectorAll('note')).filter(n=>n.querySelector('pitch')&&!n.querySelector('grace'));
  const notations=(note:Element)=>{let n=note.querySelector('notations');if(!n){n=doc.createElement('notations');note.append(n)}return n};
  if(notes.length){
    activeSlurs.forEach((s,id)=>{const start=s.cloneNode(true) as Element;start.setAttribute('type','start');start.setAttribute('number',id);notations(notes[0]).prepend(start)});
    const open=new Map<string,Element>();
    part.querySelectorAll('slur').forEach(s=>{const id=s.getAttribute('number')??'1';if(s.getAttribute('type')==='start')open.set(id,s);else if(s.getAttribute('type')==='stop'){if(open.has(id))open.delete(id);else s.remove()}});
    open.forEach((s,id)=>{const stop=doc.createElement('slur');stop.setAttribute('type','stop');stop.setAttribute('number',id);notations(notes.at(-1)!).append(stop)});
    notes[0].querySelectorAll('tie[type="stop"],tied[type="stop"]').forEach(n=>n.remove());
    notes.at(-1)!.querySelectorAll('tie[type="start"],tied[type="start"]').forEach(n=>n.remove());
  }
  doc.querySelectorAll('print,credit,work,movement-title,identification,part-name,part-abbreviation,measure-style').forEach(n=>n.remove());
  doc.querySelectorAll('[default-x],[default-y],[relative-x],[relative-y]').forEach(n=>['default-x','default-y','relative-x','relative-y'].forEach(a=>n.removeAttribute(a)));
  return serialize(doc);
}

export function practiceVariation(xml:string,variation:PracticeVariation){
  if(variation==='original')return xml;
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  doc.querySelectorAll('direction,harmony,notations > slur,notations > articulations').forEach(n=>n.remove());
  const pitched=Array.from(doc.querySelectorAll('note')).filter(n=>n.querySelector('pitch')&&!n.querySelector('grace'));
  if(variation==='even'){
    // Rebuild attack order in 4/4: tied continuations are not new attacks.
    const attacks=pitched.filter(n=>!n.querySelector('tie[type="stop"]'));
    const part=doc.querySelector('part')!,key=doc.querySelector('key')?.outerHTML??'<key><fifths>0</fifths></key>';
    part.replaceChildren();
    for(let i=0;i<attacks.length;i+=8){
      const bar=doc.createElement('measure');bar.setAttribute('number',String(i/8+1));
      const group=attacks.slice(i,i+8);
      bar.innerHTML=`${i===0?`<attributes><divisions>2</divisions>${key}<time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>`:''}${group.map(n=>`<note>${n.querySelector('pitch')!.outerHTML}<duration>1</duration><type>eighth</type></note>`).join('')}${Array.from({length:8-group.length},()=>'<note><rest/><duration>1</duration><type>eighth</type></note>').join('')}`;
      part.append(bar);
    }
  }else{
    let run:Element[]=[];
    const finish=()=>{if(variation==='slur'&&run.length>1){[run[0],run.at(-1)!].forEach((note,i)=>{let ns=note.querySelector('notations');if(!ns){ns=doc.createElement('notations');note.append(ns)}const s=doc.createElement('slur');s.setAttribute('type',i?'stop':'start');s.setAttribute('number','1');ns.append(s)})}run=[]};
    doc.querySelectorAll('note').forEach(note=>{if(note.querySelector('rest')){finish();return}if(note.querySelector('grace'))return;run.push(note);if(variation==='staccato'&&!note.querySelector('tie[type="stop"]')){let ns=note.querySelector('notations');if(!ns){ns=doc.createElement('notations');note.append(ns)}const a=doc.createElement('articulations');a.append(doc.createElement('staccato'));ns.append(a)}});finish();
  }
  return serialize(doc);
}

/** A preparation exercise, ranked by shared pitches and stepwise motion, not a claim about the passage's key. */
export function relatedScale(events:PassageEvent[],sourceXml?:string){
  const pitches=events.flatMap(e=>e.p&&!e.tied?[e.p]:[]),pcs=pitches.map(pitchClass).filter((x):x is number=>x!==null),distinct=[...new Set(pcs)];
  const arpeggio=relatedArpeggio(pitches,pcs);if(arpeggio)return arpeggio;
  if(distinct.length<4)return null;
  // One scale form first. Only when none fits, a minor passage that mixes the raised and natural 6th and 7th is judged against all three forms together.
  const rank=(union:boolean)=>majorKeys.flatMap(key=>scaleTypes.filter(t=>['major','natural','harmonic','melodic'].includes(t.id)).map(type=>{
    const own=new Set(type.intervals.map(i=>(key.pc+i)%12));
    const tones=type.id==='major'||!union?own:new Set(scaleTypes.filter(t=>['natural','harmonic','melodic'].includes(t.id)).flatMap(t=>t.intervals.map(i=>(key.pc+i)%12)));
    const matched=distinct.filter(p=>tones.has(p)),ownMatched=distinct.filter(p=>own.has(p)).length;
    const steps=pcs.slice(1).filter((p,i)=>tones.has(p)&&tones.has(pcs[i])&&[1,2,10,11].includes((p-pcs[i]+12)%12)).length;
    return {key,type,matched,steps,score:matched.length*3+ownMatched*.1+(type.id==='melodic'?.05:0)+steps+(pcs[0]===key.pc?1:0)+(pcs.at(-1)===key.pc?1:0)};
  })).filter(c=>c.matched.length/distinct.length>=.8&&c.steps>=3).sort((a,b)=>b.score-a.score);
  const best=rank(false)[0]??rank(true)[0];if(!best)return null;
  const written=sourceXml?Array.from(new DOMParser().parseFromString(sourceXml,'application/xml').querySelectorAll('pitch')).map(p=>{const alter=Number(p.querySelector('alter')?.textContent??0);return `${p.querySelector('step')?.textContent}${alter===1?'♯':alter===-1?'♭':''}${p.querySelector('octave')?.textContent}`}):pitches;
  const evidence=[...new Set(written.filter(p=>best.matched.includes(pitchClass(p)!)).map(p=>p.replace(/\d+$/,'')))];
  const midi=pitches.map(p=>{const m=p.match(/(\d+)$/)!;return (Number(m[1])+1)*12+pitchClass(p)!});
  const span={low:Math.max(59,Math.min(...midi)),high:Math.min(98,Math.max(...midi))};
  const spelling=keyForType(best.key,best.type).label;
  return {label:`${spelling[0].toUpperCase()+spelling.slice(1)} ${best.type.label.toLowerCase()}`,key:best.key.id,type:best.type.id as ScaleTypeId,evidence,xml:scaleMusicXML(best.key,'custom',{kind:'whole',mode:'tongue'},'even',best.type.id,'scale','none','lowest',span)};
}

/**
 * A passage built on one triad (a broken chord: Badinerie's opening is B minor) is practised as that key's
 * arpeggio, not its scale. It counts when nearly every note (85%) is a tone of one major or minor triad,
 * all three tones are there, and the line mostly leaps (a run of steps through chord tones is a scale).
 */
function relatedArpeggio(pitches:string[],pcs:number[]){
  if(pcs.length<4)return null;
  const leaps=pcs.slice(1).filter((p,i)=>{const d=(p-pcs[i]+12)%12;return d>=3&&d<=9}).length/Math.max(1,pcs.length-1);
  if(leaps<.4)return null;
  const best=majorKeys.flatMap(key=>(['major','natural'] as const).map(typeId=>{
    const triad=[0,typeId==='major'?4:3,7].map(i=>(key.pc+i)%12);
    const share=pcs.filter(p=>triad.includes(p)).length/pcs.length;
    return {key,typeId,share,complete:triad.every(t=>pcs.includes(t)),score:share+(pcs[0]===key.pc?.05:0)+(pcs.at(-1)===key.pc?.05:0)};
  })).filter(c=>c.complete&&c.share>=.85).sort((a,b)=>b.score-a.score)[0];
  if(!best)return null;
  const type=scaleTypes.find(t=>t.id===best.typeId)!;
  const midi=pitches.map(p=>{const m=p.match(/(\d+)$/)!;return (Number(m[1])+1)*12+pitchClass(p)!});
  const span={low:Math.max(59,Math.min(...midi)),high:Math.min(98,Math.max(...midi))};
  const spelling=keyForType(best.key,type).label;
  return {label:`${spelling[0].toUpperCase()+spelling.slice(1)} ${best.typeId==='major'?'major':'minor'} arpeggio`,key:best.key.id,type:best.typeId as ScaleTypeId,form:'arpeggio' as const,evidence:[] as string[],xml:scaleMusicXML(best.key,'custom',{kind:'whole',mode:'tongue'},'even',best.typeId,'arpeggio','none','lowest',span)};
}
