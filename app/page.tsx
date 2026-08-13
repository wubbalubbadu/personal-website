"use client";

import { useEffect, useState } from "react";

type Message = { id: string; userText: string; assistantText: string; createdAt: number };
type Proposal = { id: string; messageId: string; category: string; title: string; details: string; status: string; createdAt: number };

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [sparkOpen, setSparkOpen] = useState(false);
  const [sparkIndex, setSparkIndex] = useState(0);
  const sparks = [
    { kind: "English recall", icon: "A·", title: "Think of or think about?", body: "Complete this aloud: I was waiting for Codex when I suddenly ___ an idea for the app.", answer: "thought of" },
    { kind: "Pick up a thread", icon: "∿", title: "Your attention system", body: "You wanted ideas to stay separate from tasks. What would make an idea worth revisiting a month later?", answer: "Say what comes to mind" },
    { kind: "Tiny reset", icon: "✶", title: "Look away for twenty seconds", body: "Find the farthest thing you can see. Let your eyes rest there, then take one slow breath.", answer: "Done" },
    { kind: "Just for fun", icon: "?", title: "A two-minute curiosity", body: "If your week had a weather forecast, what would today be and what is arriving tomorrow?", answer: "Tell me your forecast" },
  ];
  const spark = sparks[sparkIndex % sparks.length];

  async function loadState() {
    const response = await fetch("/api/state");
    if (!response.ok) return;
    const data = await response.json() as { messages: Message[]; proposals: Proposal[] };
    setHistory(data.messages);
    setProposals(data.proposals);
  }

  useEffect(() => { loadState(); }, []);

  async function submit() {
    if (!message.trim()) return;
    setBusy(true); setError(""); setSent(false);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: message }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to reach your companion");
      setMessage(""); setSent(true); await loadState();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Something went wrong"); }
    finally { setBusy(false); }
  }

  async function decide(id: string, status: "approved" | "rejected") {
    await fetch("/api/proposals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    setProposals(v => v.map(p => p.id === id ? { ...p, status } : p));
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
          <button className="nav spark-nav" onClick={() => setSparkOpen(true)}><span>✶</span> Fill a moment</button>
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
            <div className="askactions"><button className="mic" aria-label="Record voice">●</button><span>{error || (busy ? "Thinking and organizing…" : sent ? "Saved. Review what I noticed below." : "You can speak naturally. I’ll organize it with you.")}</span><button className="send" disabled={busy} onClick={submit}>{busy ? "Working" : "Send"} <b>↑</b></button></div>
          </div>
        </section>

        {(proposals.some(p => p.status === "pending") || history.length > 0) && <section className="memory-row">
          {proposals.some(p => p.status === "pending") && <section className="panel reviewbox">
            <div className="panelhead"><div><p className="eyebrow">Review before saving</p><h3>Here’s what I noticed</h3></div><span>{proposals.filter(p => p.status === "pending").length} pending</span></div>
            {proposals.filter(p => p.status === "pending").map(p => <article className="proposal" key={p.id}><span className={`category ${p.category}`}>{p.category}</span><div><strong>{p.title}</strong>{p.details && <small>{p.details}</small>}</div><button onClick={() => decide(p.id, "rejected")} aria-label="Reject">×</button><button className="approve" onClick={() => decide(p.id, "approved")}>Approve</button></article>)}
          </section>}
          {history.length > 0 && <section className="panel historybox">
            <div className="panelhead"><div><p className="eyebrow">Conversation memory</p><h3>Recent check-ins</h3></div><span>Saved privately</span></div>
            {history.slice(0, 3).map(m => <article className="memory" key={m.id}><time>{new Date(m.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time><p><b>You</b> {m.userText}</p><p><b>Within</b> {m.assistantText}</p></article>)}
          </section>}
        </section>}

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
      <button className="floating-spark" onClick={() => setSparkOpen(true)}><span>✶</span><div><strong>Fill a moment</strong><small>Something small while you wait</small></div></button>
      {sparkOpen && <div className="sparkbackdrop" onClick={() => setSparkOpen(false)}>
        <section className="sparkmodal" onClick={(e) => e.stopPropagation()} aria-modal="true" role="dialog" aria-label="Fill a moment">
          <button className="close" onClick={() => setSparkOpen(false)}>×</button>
          <p className="eyebrow">A SMALL POCKET OF TIME</p>
          <div className="sparkicon">{spark.icon}</div>
          <small>{spark.kind}</small><h3>{spark.title}</h3><p>{spark.body}</p>
          <button className="sparkanswer">{spark.answer}</button>
          <div className="sparkfooter"><button onClick={() => setSparkOpen(false)}>Not now</button><span>1 of 1</span><button onClick={() => setSparkIndex(v => v + 1)}>Try another →</button></div>
        </section>
      </div>}
    </main>
  );
}
