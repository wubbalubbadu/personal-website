/**
 * The tools panel metronome's extra options ("More" in the panel): which note the click counts, the meter and its
 * grouping, subdivision ticks, and a mark for every click (accent, normal, silent). Kept apart from the reader's click
 * track on purpose: the reader, tricky bits and tempo pills start the plain metronome and never read this.
 *
 * Everything here is pure: PracticeAudio turns a setup into one bar of click times on the audio clock.
 */

export type ClickNote="quarter"|"eighth"|"dotted"|"half";
export type BeatMark="accent"|"normal"|"silent";
export type Subdivision=1|2|3|4;
export type MetronomeSetup={
  /** The note the tempo number counts (and, outside grouped eighth meters, the note that clicks). */
  note:ClickNote;
  /** A meter id from METERS, or null: the simple "N beats" chip decides (N/4). */
  meter:string|null;
  /** Quieter ticks splitting every click evenly. */
  sub:Subdivision;
  /** One mark per click, per meter and click note ("7/8 2+2+3|eighth"). Missing = the default pattern. */
  marks:Record<string,BeatMark[]>;
  /** Pulse training: bars of click, then whole bars of silence (see PULSE below). */
  pulse:Pulse;
};

/**
 * Pulse training. Ghost: `play` bars with the click, then `rest` silent bars, round after round; with `grow` each
 * round's silence is one bar longer (up to MAX_REST), so you hold the pulse a little longer every time. Random gaps:
 * `play` bars with the click, then 1 to `gaps` silent bars, picked fresh each round, so you can't count your way to
 * the click's return. Silent bars keep their beats on the clock: the click comes back exactly where it would have
 * been, and the player hears whether they drifted.
 */
export type PulseMode="off"|"ghost"|"random";
export type Pulse={mode:PulseMode;play:number;rest:number;grow:boolean;gaps:number};
export const DEFAULT_PULSE:Pulse={mode:"off",play:4,rest:2,grow:false,gaps:4};
export const PULSE_LIMITS={play:[1,16],rest:[1,8],gaps:[1,4]} as const;
export const MAX_REST=16;
/**
 * Round `round` (0 first) as one flag per bar: false = click, true = silent. Always starts with its click bars, so
 * pressing play never begins in silence.
 */
export function pulseRound(pulse:Pulse,round:number,random:()=>number=Math.random):boolean[]{
  if(pulse.mode==="off")return [false];
  const silent=pulse.mode==="ghost"
    ?Math.min(MAX_REST,pulse.rest+(pulse.grow?round:0))
    :1+Math.floor(random()*Math.max(1,pulse.gaps));
  return [...Array<boolean>(pulse.play).fill(false),...Array<boolean>(silent).fill(true)];
}
/** Where a running metronome is in its rounds: the current round's bars and the bar it is on. */
export type PulseState={round:number;bars:boolean[];index:number};
export const startPulse=(pulse:Pulse,random?:()=>number):PulseState=>({round:0,bars:pulseRound(pulse,0,random),index:0});
/** The bar after `state`, starting the next round when this one is used up. */
export function nextPulse(pulse:Pulse,state:PulseState,random?:()=>number):PulseState{
  if(state.index+1<state.bars.length)return {...state,index:state.index+1};
  const round=state.round+1;return {round,bars:pulseRound(pulse,round,random),index:0};
}

/** Length of each click note in quarter notes. */
export const NOTE_QUARTERS:Record<ClickNote,number>={quarter:1,eighth:.5,dotted:1.5,half:2};
export const CLICK_NOTES:ClickNote[]=["quarter","eighth","dotted","half"];

/**
 * The meters on offer. `groups` (in eighths) for the eighth-note meters: the click falls at the start of each group,
 * so 7/8 2+2+3 clicks quarter, quarter, dotted quarter, the way the reader counts it (scoreTheory groups).
 */
export type Meter={id:string;top:number;bottom:2|4|8;groups?:number[]};
export const METERS:Meter[]=[
  {id:"2/4",top:2,bottom:4},{id:"3/4",top:3,bottom:4},{id:"4/4",top:4,bottom:4},{id:"5/4",top:5,bottom:4},{id:"6/4",top:6,bottom:4},
  {id:"2/2",top:2,bottom:2},{id:"3/2",top:3,bottom:2},
  {id:"6/8",top:6,bottom:8,groups:[3,3]},{id:"9/8",top:9,bottom:8,groups:[3,3,3]},{id:"12/8",top:12,bottom:8,groups:[3,3,3,3]},
  {id:"5/8 2+3",top:5,bottom:8,groups:[2,3]},{id:"5/8 3+2",top:5,bottom:8,groups:[3,2]},
  {id:"7/8 2+2+3",top:7,bottom:8,groups:[2,2,3]},{id:"7/8 2+3+2",top:7,bottom:8,groups:[2,3,2]},{id:"7/8 3+2+2",top:7,bottom:8,groups:[3,2,2]},
];
/** The meter list without the grouping repeats, for the − / + stepper; grouping is its own choice. */
export const METER_STEPS=["2/4","3/4","4/4","5/4","6/4","2/2","3/2","6/8","9/8","12/8","5/8","7/8"];
export const meterLabel=(id:string)=>id.split(" ")[0];
export const groupingsFor=(step:string)=>METERS.filter(m=>meterLabel(m.id)===step);

export const DEFAULT_SETUP:MetronomeSetup={note:"quarter",meter:null,sub:1,marks:{},pulse:DEFAULT_PULSE};
export const SETUP_KEY="cookie:metronome-setup:v1";

/** The meter in force: the setup's, else N/4 from the simple Beats chip (any N it can show). */
export function meterOf(setup:MetronomeSetup,beats:number):Meter{
  return METERS.find(m=>m.id===setup.meter)??{id:`${beats}/4`,top:Math.max(1,Math.round(beats)),bottom:4};
}
const barQuarters=(meter:Meter)=>meter.top*4/meter.bottom;

/**
 * Click notes that make sense in this meter. Grouped eighth meters click per group (quarter or dotted quarter
 * counting it) or per eighth; a half note never fits them. Other meters need the bar to split evenly into the note.
 */
export function notesFor(meter:Meter):ClickNote[]{
  if(meter.groups)return ["quarter","eighth","dotted"];
  const bar=barQuarters(meter);
  return CLICK_NOTES.filter(note=>Math.abs(bar/NOTE_QUARTERS[note]-Math.round(bar/NOTE_QUARTERS[note]))<1e-9);
}
/** The setup's click note if this meter allows it, else the meter's natural one. */
export function noteIn(setup:MetronomeSetup,meter:Meter):ClickNote{
  const allowed=notesFor(meter);
  if(allowed.includes(setup.note))return setup.note;
  return meter.groups?"dotted":meter.bottom===2?"half":"quarter";
}

/** One click in a bar: where it starts and how long it lasts, in quarter notes; groupStart = a group begins here. */
export type Click={at:number;length:number;groupStart:boolean};
export function clicksOf(meter:Meter,note:ClickNote):Click[]{
  if(meter.groups&&note!=="eighth"){
    let at=0;return meter.groups.map(g=>{const click={at,length:g/2,groupStart:true};at+=g/2;return click});
  }
  const length=NOTE_QUARTERS[note],count=Math.max(1,Math.round(barQuarters(meter)/length));
  const starts=new Set<number>();
  if(meter.groups){let at=0;for(const g of meter.groups){starts.add(at);at+=g}}
  return Array.from({length:count},(_,i)=>({at:i*length,length,groupStart:meter.groups?starts.has(i):i===0}));
}
export const marksKey=(meter:Meter,note:ClickNote)=>`${meter.id}|${note}`;
/**
 * The pattern before you change anything: the downbeat accented; in grouped eighth meters clicked in eighths, every
 * group start too, so 7/8 counted 1 2 1 2 1 2 3 still shows its 2+2+3.
 */
export function defaultMarks(clicks:Click[]):BeatMark[]{
  // Clicking per group, every click starts one: only the downbeat is accented then.
  const eighths=clicks.some(c=>!c.groupStart);
  return clicks.map((c,i)=>i===0||(eighths&&c.groupStart)?"accent":"normal");
}
export function marksOf(setup:MetronomeSetup,meter:Meter,note:ClickNote):BeatMark[]{
  const clicks=clicksOf(meter,note),saved=setup.marks[marksKey(meter,note)];
  return saved&&saved.length===clicks.length?saved:defaultMarks(clicks);
}
/** Tap a beat dot: normal → accent → silent → normal. */
export const nextMark=(mark:BeatMark):BeatMark=>mark==="normal"?"accent":mark==="accent"?"silent":"normal";

/** One sound in a bar, in seconds from the bar's start. `click` is the click it belongs to (ticks included). */
export type BarEvent={at:number;kind:"accent"|"normal"|"tick";click:number};
/**
 * One bar of the setup at a tempo: `bpm` counts the click note, so eighth = 80 makes a quarter last 1.5 s.
 * A silent click is silent with its subdivision ticks. Accent off (the simple chip) plays accents as normal clicks.
 */
export type Bar={events:BarEvent[];length:number;clickAt:number[];bpm:number;
  /** Pulse training: this bar is silent, and where it sits in its round (for the panel's bar marks). */
  pulse?:PulseState&{silent:boolean}};
export function barOf(setup:MetronomeSetup,beats:number,accent:boolean,bpm:number,pulse?:PulseState):Bar{
  const meter=meterOf(setup,beats),note=noteIn(setup,meter),clicks=clicksOf(meter,note),marks=marksOf(setup,meter,note);
  const quarter=60/bpm/NOTE_QUARTERS[note],events:BarEvent[]=[];
  clicks.forEach((c,i)=>{
    const mark=marks[i];if(mark==="silent")return;
    events.push({at:c.at*quarter,kind:mark==="accent"&&accent?"accent":"normal",click:i});
    for(let k=1;k<setup.sub;k++)events.push({at:(c.at+k*c.length/setup.sub)*quarter,kind:"tick",click:i});
  });
  const silent=!!pulse&&setup.pulse.mode!=="off"&&pulse.bars[pulse.index];
  return {events:silent?[]:events,length:barQuarters(meter)*quarter,clickAt:clicks.map(c=>c.at*quarter),bpm,
    ...(pulse&&setup.pulse.mode!=="off"?{pulse:{...pulse,silent}}:{})};
}

/** The same bar at another tempo: every time scales by old / new bpm, so a re-time can keep its place in the bar. */
export function retimeBar(bar:Bar,bpm:number):Bar{
  const f=bar.bpm/bpm;
  return {...bar,events:bar.events.map(e=>({...e,at:e.at*f})),length:bar.length*f,clickAt:bar.clickAt.map(t=>t*f),bpm};
}

/** Read the saved setup, ignoring anything malformed (a hand-edited or older value must not break the metronome). */
export function readSetup(raw:string|null):MetronomeSetup{
  try{
    const value=raw?JSON.parse(raw):null;if(!value||typeof value!=="object")return DEFAULT_SETUP;
    const note=CLICK_NOTES.includes(value.note)?value.note as ClickNote:"quarter";
    const meter=typeof value.meter==="string"&&METERS.some(m=>m.id===value.meter)?value.meter:null;
    const sub=[1,2,3,4].includes(value.sub)?value.sub as Subdivision:1;
    const marks:Record<string,BeatMark[]>={};
    if(value.marks&&typeof value.marks==="object")for(const [key,list] of Object.entries(value.marks))
      if(Array.isArray(list)&&list.every(m=>m==="accent"||m==="normal"||m==="silent"))marks[key]=list as BeatMark[];
    return {note,meter,sub,marks,pulse:readPulse(value.pulse)};
  }catch{return DEFAULT_SETUP}
}

const clampInt=(value:unknown,[low,high]:readonly [number,number],fallback:number)=>typeof value==="number"&&Number.isFinite(value)?Math.max(low,Math.min(high,Math.round(value))):fallback;
function readPulse(value:unknown):Pulse{
  if(!value||typeof value!=="object")return DEFAULT_PULSE;
  const v=value as Partial<Pulse>;
  return {mode:v.mode==="ghost"||v.mode==="random"?v.mode:"off",play:clampInt(v.play,PULSE_LIMITS.play,DEFAULT_PULSE.play),
    rest:clampInt(v.rest,PULSE_LIMITS.rest,DEFAULT_PULSE.rest),grow:v.grow===true,gaps:clampInt(v.gaps,PULSE_LIMITS.gaps,DEFAULT_PULSE.gaps)};
}
