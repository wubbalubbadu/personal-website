"use client";

import {useEffect,useMemo,useState} from "react";
import "./roadmap.css";

type Status="not-yet"|"exploring"|"comfortable";
type Skill={id:string;title:string;prompt:string;stage:string};
type Group={id:string;title:string;description:string;tone:string;skills:Skill[]};

const statusOptions:readonly {id:Status;label:string}[]=[
  {id:"not-yet",label:"Not yet"},
  {id:"exploring",label:"Exploring"},
  {id:"comfortable",label:"Comfortable"},
];

const groups:readonly Group[]=[
  {id:"foundation",title:"Air & foundation",description:"Start here to understand how the player creates and sustains sound.",tone:"sage",skills:[
    {id:"posture",title:"Balance and posture",prompt:"How do you set up the flute and release unnecessary tension?",stage:"Foundation"},
    {id:"breath",title:"Breathing and air support",prompt:"Can you describe where you breathe and how you keep the air moving?",stage:"Foundation"},
    {id:"tone",title:"Centered tone",prompt:"Can you start a clear, steady note in the low and middle registers?",stage:"Foundation"},
    {id:"long-tone",title:"Long tones",prompt:"Have you practiced sustaining one pitch while listening for steadiness?",stage:"Foundation"},
    {id:"decrescendo",title:"Decrescendo and release",prompt:"Can you taper a note without the pitch rising or the sound collapsing?",stage:"Developing"},
    {id:"range",title:"Register connection",prompt:"Can you move between low, middle, and high registers without forcing?",stage:"Developing"},
  ]},
  {id:"expression",title:"Sound & expression",description:"Listen for control, flexibility, and musical intention rather than one ideal sound.",tone:"pink",skills:[
    {id:"dynamics",title:"Dynamic control",prompt:"Can you change volume while keeping a stable tone and pitch?",stage:"Developing"},
    {id:"vibrato",title:"Vibrato",prompt:"Have you explored controlled air pulses and varied vibrato speed or width?",stage:"Developing"},
    {id:"intonation",title:"Intonation awareness",prompt:"Do you adjust pitch by listening rather than only watching a tuner?",stage:"Developing"},
    {id:"color",title:"Tone color",prompt:"Can you intentionally make the sound warmer, clearer, softer, or more focused?",stage:"Advanced"},
    {id:"phrase",title:"Phrasing and breath planning",prompt:"Can you choose phrase direction and breaths before playing?",stage:"Developing"},
  ]},
  {id:"articulation",title:"Articulation",description:"Check clarity, variety, and coordination between air, tongue, and fingers.",tone:"sand",skills:[
    {id:"single-tongue",title:"Single tonguing",prompt:"Can you begin notes with a clear, light tongue and continuous air?",stage:"Foundation"},
    {id:"slur",title:"Slurs and legato",prompt:"Can you connect notes without bumps or unintended accents?",stage:"Foundation"},
    {id:"staccato",title:"Staccato and detaché",prompt:"Can you vary note length without stopping the air harshly?",stage:"Developing"},
    {id:"mixed-articulation",title:"Mixed articulation patterns",prompt:"Can you coordinate changing slur and tongue patterns at a steady tempo?",stage:"Developing"},
    {id:"multiple-tongue",title:"Double and triple tonguing",prompt:"Have you practiced balanced front and back syllables?",stage:"Advanced"},
  ]},
  {id:"fingers",title:"Fingers & patterns",description:"Use familiar patterns to reveal coordination, key knowledge, and fluency.",tone:"blue",skills:[
    {id:"coordination",title:"Finger coordination",prompt:"Can you keep fingers close to the keys and move them together cleanly?",stage:"Foundation"},
    {id:"trills",title:"Finger trills",prompt:"Do you know common trill fingerings, and can you trill without gripping?",stage:"Developing"},
    {id:"major-scales",title:"Major scales",prompt:"Which major scales can you play from memory, and over what range?",stage:"Foundation → Advanced"},
    {id:"minor-scales",title:"Minor scales",prompt:"Which natural, harmonic, and melodic minor forms are familiar?",stage:"Developing"},
    {id:"chromatic",title:"Chromatic scale",prompt:"Can you play a smooth chromatic scale through your comfortable range?",stage:"Developing"},
    {id:"arpeggios",title:"Arpeggios",prompt:"Can you hear and play major, minor, and dominant-seventh patterns?",stage:"Developing"},
    {id:"thirds",title:"Scales in thirds",prompt:"Have you practiced interval patterns beyond stepwise scales?",stage:"Advanced"},
  ]},
  {id:"reading",title:"Reading & musicianship",description:"Separate reading knowledge from physical flute technique during the conversation.",tone:"lavender",skills:[
    {id:"pulse",title:"Pulse and subdivisions",prompt:"Can you maintain a pulse and count eighths, sixteenths, triplets, and dotted rhythms?",stage:"Foundation → Advanced"},
    {id:"meter",title:"Meter",prompt:"Which simple, compound, mixed, or changing meters have you played?",stage:"Foundation → Advanced"},
    {id:"keys",title:"Keys and accidentals",prompt:"Which key signatures feel familiar, and how do you handle accidentals?",stage:"Foundation → Advanced"},
    {id:"sight-reading",title:"Sight-reading",prompt:"How do you scan key, meter, rhythm, range, and breaths before starting?",stage:"Developing"},
    {id:"ornaments",title:"Trills and ornaments",prompt:"Have you played grace notes, trills, mordents, or turns in context?",stage:"Developing"},
  ]},
  {id:"extended",title:"Extended techniques",description:"A preview branch for later exploration, not a requirement for general flute playing.",tone:"coral",skills:[
    {id:"harmonics",title:"Harmonics",prompt:"Have you produced overtones from a lower fingering and compared their color?",stage:"Introduction"},
    {id:"flutter",title:"Flutter tonguing",prompt:"Have you tried tongue-rolled or throat-produced flutter tonguing?",stage:"Introduction"},
    {id:"air-sounds",title:"Air sounds",prompt:"Have you explored pitched and unpitched air sounds?",stage:"Exploration"},
    {id:"sing-play",title:"Singing and playing",prompt:"Have you sustained a sung pitch while playing another note?",stage:"Exploration"},
    {id:"pitch-bend",title:"Pitch bends and quarter-tones",prompt:"Have you explored lip bends or alternate fingerings for pitch inflection?",stage:"Exploration"},
    {id:"percussive",title:"Key clicks and tongue effects",prompt:"Have you explored key clicks, key slaps, tongue pizzicato, or tongue ram?",stage:"Exploration"},
    {id:"multiphonics",title:"Multiphonics",prompt:"Have you used a tested fingering to produce more than one pitch?",stage:"Advanced exploration"},
    {id:"whistle-jet",title:"Whistle tones and jet whistle",prompt:"Have you explored very soft whistle tones or covered-embouchure jet effects?",stage:"Advanced exploration"},
  ]},
];

const storageKey="cookie:technique-roadmap-v1";

export default function TechniqueRoadmapPage(){
  const [statuses,setStatuses]=useState<Record<string,Status>>({});
  const [activeGroup,setActiveGroup]=useState(groups[0].id);
  const [notes,setNotes]=useState("");
  const [ready,setReady]=useState(false);

  useEffect(()=>{
    try{const saved=localStorage.getItem(storageKey);if(saved){const data=JSON.parse(saved);setStatuses(data.statuses??{});setNotes(data.notes??"");}}catch{}
    setReady(true);
  },[]);
  useEffect(()=>{if(ready)localStorage.setItem(storageKey,JSON.stringify({statuses,notes}));},[statuses,notes,ready]);

  const allSkills=useMemo(()=>groups.flatMap(group=>group.skills),[]);
  const reviewed=Object.keys(statuses).length;
  const comfortable=Object.values(statuses).filter(value=>value==="comfortable").length;
  const current=groups.find(group=>group.id===activeGroup)??groups[0];

  function setStatus(id:string,status:Status){setStatuses(previous=>({...previous,[id]:status}));}
  function reset(){if(window.confirm("Clear this technique check-in and start again?")){setStatuses({});setNotes("");}}

  return <main className="roadmap-page">
    <div className="roadmap-page__content">
      <header className="roadmap-header">
        <p>Teacher guide</p>
        <div><h1>Technique roadmap</h1><span>{reviewed} of {allSkills.length} discussed</span></div>
        <p className="roadmap-header__intro">Use this as a conversation guide for a trial lesson. Mark what the player remembers today without assigning them a fixed level.</p>
      </header>

      <section className="roadmap-overview" aria-label="Check-in overview">
        <div><span>Discussed</span><strong>{reviewed}</strong></div>
        <div><span>Comfortable today</span><strong>{comfortable}</strong></div>
        <div><span>Still to explore</span><strong>{allSkills.length-reviewed}</strong></div>
        <button type="button" onClick={reset}>Reset check-in</button>
      </section>

      <nav className="roadmap-path" aria-label="Technique areas">
        {groups.map((group,index)=>{
          const count=group.skills.filter(skill=>statuses[skill.id]).length;
          return <button key={group.id} type="button" className={`${activeGroup===group.id?"active ":""}${group.tone}`} onClick={()=>setActiveGroup(group.id)}>
            <span>{index+1}</span><div><strong>{group.title}</strong><small>{count}/{group.skills.length} discussed</small></div>
          </button>;
        })}
      </nav>

      <section className={`roadmap-panel ${current.tone}`} aria-labelledby="roadmap-group-title">
        <header><div><p>{current.id==="extended"?"Optional exploration":"Technique area"}</p><h2 id="roadmap-group-title">{current.title}</h2><span>{current.description}</span></div></header>
        <div className="roadmap-skill-list">
          {current.skills.map(skill=><article className="roadmap-skill" key={skill.id}>
            <div className="roadmap-skill__copy"><small>{skill.stage}</small><h3>{skill.title}</h3><p>{skill.prompt}</p></div>
            <div className="roadmap-status" role="group" aria-label={`${skill.title} status`}>
              {statusOptions.map(option=><button key={option.id} type="button" aria-pressed={statuses[skill.id]===option.id} onClick={()=>setStatus(skill.id,option.id)}>{option.label}</button>)}
            </div>
          </article>)}
        </div>
      </section>

      <section className="roadmap-notes">
        <label htmlFor="roadmap-notes"><span>Trial lesson notes</span><small>What returned easily? What needs rebuilding? What did the student enjoy?</small></label>
        <textarea id="roadmap-notes" value={notes} onChange={event=>setNotes(event.target.value)} placeholder="Write observations and possible next steps…"/>
      </section>

      <footer className="roadmap-sources"><p>This roadmap is a teaching prompt, not an examination or diagnosis. Its progression is adapted from the National Flute Association Selected Flute Repertoire and Studies level criteria, with an extended-technique preview informed by Emi Ferguson’s flute resource.</p><div><a href="https://www.nfaonline.org/resources-publications/publications/selected-flute-repertoire-and-studies---history" target="_blank" rel="noreferrer">NFA guide</a><a href="https://www.emiferguson.com/flutes-extendedtechniques" target="_blank" rel="noreferrer">Extended techniques source</a></div></footer>
    </div>
  </main>;
}
