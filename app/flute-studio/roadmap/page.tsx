"use client";

import {useState} from "react";
import "./roadmap.css";

type Skill={title:string;description:string;stage:string};
type Group={id:string;title:string;description:string;tone:string;skills:Skill[]};

const journey=[
  {level:"1",title:"Beginner",summary:"Build a reliable setup and make clear, connected sounds.",skills:["Posture and breath","Centered tone","Single tonguing and slurs","Simple rhythms","One-octave scales"]},
  {level:"2",title:"Developing",summary:"Connect registers and add more control to phrases and fingers.",skills:["Register connection","Crescendo and decrescendo","Early vibrato","Minor scales and arpeggios","Trill fingerings"]},
  {level:"3",title:"Intermediate",summary:"Play with greater fluency, color, accuracy, and rhythmic range.",skills:["Two-octave scales","Intonation awareness","Mixed articulations","Ornaments","Double tonguing"]},
  {level:"4",title:"Advanced",summary:"Shape a mature sound across the full flute range and varied styles.",skills:["Tone color","Extreme dynamics","Complex rhythm and meter","Multiple tonguing","Style and interpretation"]},
  {level:"5",title:"Explore",summary:"Use contemporary sounds as an optional branch of flute playing.",skills:["Harmonics","Flutter tongue","Air sounds and key clicks","Singing and playing","Multiphonics and quarter-tones"]},
] as const;

const s=(title:string,description:string,stage:string):Skill=>({title,description,stage});
const groups:readonly Group[]=[
  {id:"foundation",title:"Air & foundation",description:"How breath, balance, and embouchure create a steady flute sound.",tone:"sage",skills:[
    s("Balance and posture","Set up the flute with comfortable alignment and as little extra tension as possible.","Beginner"),
    s("Breathing and air support","Plan full, quiet breaths and keep the air moving through the phrase.","Beginner"),
    s("Centered tone","Start and sustain a clear note in the low and middle registers.","Beginner"),
    s("Long tones","Sustain pitches while listening for steadiness, resonance, and pitch.","Beginner"),
    s("Decrescendo and release","Taper a note without letting the pitch rise or the sound collapse.","Developing"),
    s("Register connection","Move between low, middle, and high registers without forcing the sound.","Developing"),
  ]},
  {id:"expression",title:"Sound & expression",description:"Control pitch, dynamics, color, vibrato, and the direction of a phrase.",tone:"pink",skills:[
    s("Dynamic control","Change volume while keeping the tone and pitch stable.","Developing"),
    s("Vibrato","Use controlled air pulses and vary vibrato speed and width for the phrase.","Developing"),
    s("Intonation awareness","Hear pitch tendencies and adjust with air direction, support, and embouchure.","Developing"),
    s("Tone color","Intentionally make the sound warmer, clearer, softer, or more focused.","Advanced"),
    s("Phrasing and breath planning","Choose phrase direction and breathing places before playing.","Developing"),
  ]},
  {id:"articulation",title:"Articulation",description:"Coordinate air, tongue, and fingers for clear and varied note shapes.",tone:"sand",skills:[
    s("Single tonguing","Begin notes with a light tongue while the air continues to move.","Beginner"),
    s("Slurs and legato","Connect notes without bumps, gaps, or unintended accents.","Beginner"),
    s("Staccato and detaché","Vary note length without stopping the air harshly.","Developing"),
    s("Mixed articulation patterns","Coordinate changing slur and tongue patterns at a steady tempo.","Intermediate"),
    s("Double and triple tonguing","Balance the front and back syllables at increasing speeds.","Intermediate to advanced"),
  ]},
  {id:"fingers",title:"Fingers & patterns",description:"Develop efficient finger motion through scales, trills, and recurring patterns.",tone:"blue",skills:[
    s("Finger coordination","Keep fingers close to the keys and move related fingers together cleanly.","Beginner"),
    s("Finger trills","Learn common trill fingerings and trill without gripping the flute.","Developing"),
    s("Major scales","Expand from one octave to two octaves and eventually the full practical range.","Beginner to advanced"),
    s("Minor scales","Learn natural, harmonic, and melodic minor forms.","Developing"),
    s("Chromatic scale","Connect chromatic fingerings smoothly through the comfortable range.","Developing"),
    s("Arpeggios","Hear and play major, minor, and dominant-seventh patterns.","Developing"),
    s("Scales in thirds","Practice interval patterns beyond stepwise scales.","Advanced"),
  ]},
  {id:"reading",title:"Reading & musicianship",description:"Connect notation, rhythm, harmony, listening, and musical style.",tone:"lavender",skills:[
    s("Pulse and subdivisions","Maintain a pulse while reading eighths, sixteenths, triplets, and dotted rhythms.","Beginner to advanced"),
    s("Meter","Progress from simple and compound meter to mixed and changing meters.","Beginner to advanced"),
    s("Keys and accidentals","Recognize key signatures and respond accurately to written accidentals.","Beginner to advanced"),
    s("Sight-reading","Scan key, meter, rhythm, range, and breaths before starting.","Developing"),
    s("Trills and ornaments","Play grace notes, trills, mordents, and turns in musical context.","Intermediate"),
  ]},
  {id:"extended",title:"Extended techniques",description:"An optional branch for exploring the contemporary sound world of the flute.",tone:"coral",skills:[
    s("Harmonics","Produce overtones from a lower fingering and compare their color and pitch.","Introduction"),
    s("Flutter tonguing","Explore tongue-rolled or throat-produced flutter tonguing.","Introduction"),
    s("Air sounds","Create pitched and unpitched air sounds with controlled airflow.","Explore"),
    s("Singing and playing","Sustain a sung pitch while playing another flute pitch.","Explore"),
    s("Pitch bends and quarter-tones","Use lip bends and alternate fingerings for pitch inflection.","Explore"),
    s("Key clicks and tongue effects","Explore key clicks, key slaps, tongue pizzicato, and tongue ram.","Explore"),
    s("Multiphonics","Use tested fingerings and voicing to produce more than one pitch.","Advanced exploration"),
    s("Whistle tones and jet whistle","Explore very soft whistle tones and covered-embouchure jet effects.","Advanced exploration"),
  ]},
];

export default function TechniqueRoadmapPage(){
  const [activeGroup,setActiveGroup]=useState(groups[0].id);
  const current=groups.find(group=>group.id===activeGroup)??groups[0];
  return <main className="roadmap-page"><div className="roadmap-page__content">
    <header className="roadmap-header"><p>Flute learning path</p><h1>Technique roadmap</h1><p className="roadmap-header__intro">See how flute skills build over time, then open any area to explore what comes next.</p></header>
    <section className="roadmap-journey" aria-labelledby="roadmap-journey-title">
      <header><p>Big picture</p><h2 id="roadmap-journey-title">From first sound to advanced exploration</h2></header>
      <ol>{journey.map(step=><li key={step.level}><div className="roadmap-journey__number">{step.level}</div><div className="roadmap-journey__copy"><h3>{step.title}</h3><p>{step.summary}</p><ul>{step.skills.map(skill=><li key={skill}>{skill}</li>)}</ul></div></li>)}</ol>
    </section>
    <section className="roadmap-explore" aria-labelledby="roadmap-explore-title">
      <header><p>Explore by area</p><h2 id="roadmap-explore-title">Choose a technique family</h2></header>
      <nav className="roadmap-path" aria-label="Technique areas">{groups.map((group,index)=><button key={group.id} type="button" aria-pressed={activeGroup===group.id} className={`${activeGroup===group.id?"active ":""}${group.tone}`} onClick={()=>setActiveGroup(group.id)}><span>{index+1}</span><strong>{group.title}</strong></button>)}</nav>
      <section className={`roadmap-panel ${current.tone}`} aria-labelledby="roadmap-group-title"><header><div><p>{current.id==="extended"?"Optional exploration":"Technique area"}</p><h2 id="roadmap-group-title">{current.title}</h2><span>{current.description}</span></div></header><div className="roadmap-skill-list">{current.skills.map(skill=><article className="roadmap-skill" key={skill.title}><small>{skill.stage}</small><h3>{skill.title}</h3><p>{skill.description}</p></article>)}</div></section>
    </section>
    <footer className="roadmap-sources"><p>The sequence is a flexible learning path, not a fixed level or examination. It is informed by the National Flute Association repertoire level criteria and Emi Ferguson’s extended-technique resource.</p><div><a href="https://www.nfaonline.org/resources-publications/publications/selected-flute-repertoire-and-studies---history" target="_blank" rel="noreferrer">NFA guide</a><a href="https://www.emiferguson.com/flutes-extendedtechniques" target="_blank" rel="noreferrer">Extended techniques source</a></div></footer>
  </div></main>;
}
