/**
 * The reader's "Show on the page" options, applied to a close-up row. Nothing
 * here draws its own labels: reminder accidentals, note pills and beat sticks
 * all come from the same code the reader runs, so they match it exactly.
 */
import {placePracticeOverlays,tagReminderAccidentals} from './ScoreViewer';
import {placeNoteLabels,addReminderAccidentals} from './scoreLabels';
import {readScoreFacts} from './scoreTheory';
import {measureBeatOffsets} from './rhythmGrid';
import type {deriveScoreEvents} from './deriveScoreEvents';

export type PracticeDisplay={names:'off'|'names'|'solfege';accidentals:boolean;rhythm:boolean};
export const noDisplay:PracticeDisplay={names:'off',accidentals:false,rhythm:false};

const GLYPH:Record<number,string>={[-2]:'𝄫',[-1]:'♭',0:'',1:'♯',2:'𝄪'};

/** The MusicXML with reminder accidentals written in (the reader's rule), and the events that got one. */
export function withReminders(xml:string){
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  const reminders=addReminderAccidentals(doc);
  return {xml:new XMLSerializer().serializeToString(doc),reminders};
}

/** Written spelling of every event ("B♭4"), null for a rest: the same order the engraver lists events (a chord counts once). */
export function writtenPitches(xml:string):(string|null)[]{
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  return [...doc.querySelectorAll('part:first-of-type > measure > note')].filter(note=>!note.querySelector(':scope > chord')).map(note=>{
    const pitch=note.querySelector(':scope > pitch');if(!pitch)return null;
    return `${pitch.querySelector('step')!.textContent}${GLYPH[Number(pitch.querySelector('alter')?.textContent??0)]??''}${pitch.querySelector('octave')!.textContent}`;
  });
}

/** Pills, beat sticks and reminder colouring on an engraved row. `host` is the element OSMD drew into. */
export function decorateRow(host:HTMLElement,xml:string,seq:ReturnType<typeof deriveScoreEvents>,display:PracticeDisplay,reminders:number[]){
  const drawn=[...host.querySelectorAll<SVGGElement>('.vf-stavenote')],{events,measureStarts,unitsPerBeat}=seq;
  const measureOf=(index:number)=>{let result=1;measureStarts.forEach((start,i)=>{if(start<=index)result=i+1});return result};
  drawn.forEach((node,index)=>{node.dataset.event=String(index);node.dataset.measure=String(measureOf(index))});
  host.classList.add('osmd-score');host.dataset.noteDisplay=display.names;host.dataset.rhythm=display.rhythm?'bars':'off';
  tagReminderAccidentals(drawn,new Set(display.accidentals?reminders:[]),0);
  const meters=readScoreFacts(xml).measures,pitches=writtenPitches(xml);
  const visible={names:display.names==='names',solfege:display.names==='solfege',accidentals:display.accidentals,tonguing:false,sticks:display.rhythm};
  placePracticeOverlays(host as HTMLDivElement,events,measureStarts,unitsPerBeat,new Set(),pitches,undefined,false,undefined,visible,meters);
  if(display.names==='off'){host.querySelectorAll('.note-pill').forEach(pill=>pill.remove());return}
  // Which events start a beat: where two pills collide, the one on a beat stays solid.
  const beatStarts=new Set<number>();
  for(let measure=1;measure<=measureStarts.length;measure++){
    const start=measureStarts[measure-1],end=measureStarts[measure]??events.length;
    const plan=measureBeatOffsets(events.slice(start,end).map(event=>event.d),meters[measure-1]??{beats:4,beatType:4},unitsPerBeat,measure===1);
    if(!plan)continue;
    const beats=new Set(plan.offsets);let onset=0;
    for(let i=start;i<end;i++){if(beats.has(onset))beatStarts.add(i);onset+=events[i]?.d??0}
  }
  placeNoteLabels(host,{kind:display.names,events,displayPitches:pitches,beatStarts});
}

/** The notes a player sounds in a selection, as Tone Lab targets. Each id is the note's event index, so the Tone Lab's marks land on the right notehead; ties, grace notes and rests are not targets. */
export function attackTargets(xml:string){
  const doc=new DOMParser().parseFromString(xml,'application/xml'),STEP:Record<string,number>={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  return [...doc.querySelectorAll('part:first-of-type > measure > note')].filter(note=>!note.querySelector(':scope > chord')).flatMap((note,id)=>{
    const pitch=note.querySelector(':scope > pitch');
    if(!pitch||note.querySelector(':scope > grace')||note.querySelector(':scope > tie[type="stop"]'))return [];
    const step=pitch.querySelector('step')!.textContent!,alter=Number(pitch.querySelector('alter')?.textContent??0),octave=Number(pitch.querySelector('octave')!.textContent);
    return [{id,midi:(octave+1)*12+STEP[step]+alter,group:0,pitch:`${step}${GLYPH[alter]??''}${octave}`}];
  });
}
