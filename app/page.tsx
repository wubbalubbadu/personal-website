"use client";

import { useState } from "react";

const skills = [
  { icon: "✶", name: "Ideas", meta: "12 thoughts", color: "lilac" },
  { icon: "↗", name: "Spending", meta: "$46 today", color: "mint" },
  { icon: "☾", name: "Diary", meta: "3 day streak", color: "peach" },
  { icon: "♡", name: "Health", meta: "Feeling steady", color: "rose" },
];

const tasks = [
  { title: "Outline research proposal", tag: "Important", time: "10:00", tone: "amber" },
  { title: "Pick up prescription", tag: "Urgent", time: "12:30", tone: "coral" },
  { title: "Read for 30 minutes", tag: "For you", time: "4:30", tone: "green" },
];

export default function Home() {
  const [view, setView] = useState("Week");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState<string[]>([]);

  function submit() {
    if (!message.trim()) return;
    setSent(true);
    setMessage("");
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brandmark">w</span><span>within.</span></div>
        <nav aria-label="Main navigation">
          <button className="nav active"><span>◉</span> Today</button>
          <button className="nav"><span>□</span> Calendar</button>
          <button className="nav"><span>✓</span> Tasks <b>6</b></button>
          <button className="nav"><span>○</span> Inbox <i>2</i></button>
        </nav>
        <p className="eyebrow">Your spaces</p>
        <nav>
          {skills.map((skill) => <button className="nav small" key={skill.name}><span className={`dot ${skill.color}`} />{skill.name}</button>)}
        </nav>
        <button className="profile"><span>HW</span><div><strong>Haylie</strong><small>Personal space</small></div><em>⋯</em></button>
      </aside>

      <section className="content">
        <header>
          <div><p>Thursday, August 13</p><h1>Good morning, Haylie.</h1><h2>Let’s make today feel possible.</h2></div>
          <button className="bell" aria-label="Notifications">♢<span /></button>
        </header>

        <section className="ask">
          <div className="orb">✶</div>
          <div className="askcopy">
            <label htmlFor="companion">What’s on your mind?</label>
            <textarea id="companion" value={message} onChange={(e) => {setMessage(e.target.value); setSent(false)}} placeholder="Tell me anything. A plan, an idea, what happened yesterday…" />
            <div className="askactions"><button className="mic" aria-label="Record voice">●</button><span>{sent ? "Got it. I’ll help you sort that out." : "You can speak naturally. I’ll organize it with you."}</span><button className="send" onClick={submit}>Send <b>↑</b></button></div>
          </div>
        </section>

        <div className="grid">
          <section className="panel day">
            <div className="panelhead"><div><p className="eyebrow">Your day</p><h3>A gentle plan, with room to breathe.</h3></div><button>View calendar ↗</button></div>
            <div className="timeline">
              <div className="event fixed" style={{gridRow:"1 / 3"}}><time>9:00</time><div><small>FIXED</small><strong>Design seminar</strong><span>Room 402</span></div></div>
              <div className="event suggested" style={{gridRow:"3 / 5"}}><time>10:30</time><div><small>✶ SUGGESTED FOR YOU</small><strong>Research proposal</strong><span>90 min focus block</span></div><button>Move</button></div>
              <div className="event fixed" style={{gridRow:"5 / 7"}}><time>2:00</time><div><small>FIXED</small><strong>Advisor appointment</strong><span>Online</span></div></div>
              <div className="event personal" style={{gridRow:"7 / 8"}}><time>4:30</time><div><small>FOR YOU</small><strong>Reading &amp; tea</strong></div></div>
            </div>
            <p className="companion-note"><span>♡</span> You have a focused morning and a softer afternoon. I kept an hour open after your appointment, just in case you need it.</p>
          </section>

          <div className="rightcol">
            <section className="panel tasks">
              <div className="panelhead"><div><p className="eyebrow">Next up</p><h3>Three things worth your attention</h3></div><button>All tasks ↗</button></div>
              {tasks.map((task) => <button key={task.title} className={`task ${done.includes(task.title) ? "done" : ""}`} onClick={() => setDone(v => v.includes(task.title) ? v.filter(x => x !== task.title) : [...v, task.title])}><span className="check">✓</span><div><strong>{task.title}</strong><small><i className={task.tone}>{task.tag}</i> {task.time}</small></div></button>)}
              <button className="add">+ Add something</button>
            </section>

            <section className="panel skillpanel">
              <div className="panelhead"><div><p className="eyebrow">Your spaces</p><h3>Everything you’re tending to</h3></div><button>Manage ↗</button></div>
              <div className="skillgrid">{skills.map((skill) => <button className="skill" key={skill.name}><span className={skill.color}>{skill.icon}</span><div><strong>{skill.name}</strong><small>{skill.meta}</small></div><b>›</b></button>)}</div>
            </section>
          </div>
        </div>

        <section className="calendar panel">
          <div><p className="eyebrow">Calendar</p><h3>August 10–16</h3></div>
          <div className="viewtoggle">{["Day","Week","Month"].map(v => <button key={v} className={view === v ? "selected" : ""} onClick={() => setView(v)}>{v}</button>)}</div>
          <button className="open">Open {view.toLowerCase()} view →</button>
        </section>
      </section>
    </main>
  );
}
