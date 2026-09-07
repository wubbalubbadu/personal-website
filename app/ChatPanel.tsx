"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "./canvas.css";
import { AnswerNode, CHIP_GROUPS, GREETING, INTENTS, nextChips, ROOT_CHIPS } from "./lib/answers";
import { CanvasTab, tabFromSpec } from "./lib/canvas";
import Canvas from "./canvas/Canvas";

type Msg = { id: string; role: "visitor" | "haylie"; nodes: AnswerNode[]; fresh?: boolean };
type ChipView = "root" | { chips: string[] };

const KEYS: Record<string, string> = {
  background: "b",
  experience: "t",
  resume: "r",
  projects: "p",
  "tech-stack": "s",
  "why-both": "w",
  flute: "f",
  "looking-for": "g",
  contact: "c",
  "cookie-flute-studio": "1",
  "learning-log": "2",
  market: "3",
  skuy: "4",
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

function NodeView({ node, onAsk }: { node: AnswerNode; onAsk: (id: string) => void }) {
  if (node.kind === "text") return <p className="node-text">{node.value}</p>;

  if (node.kind === "rich") {
    return (
      <p className="node-text">
        {node.segments.map((seg, i) => {
          if ("intent" in seg) {
            return (
              <button type="button" key={i} className="chat-inlink" onClick={() => onAsk(seg.intent)}>
                {seg.text}
              </button>
            );
          }
          if ("href" in seg) {
            return (
              <a key={i} href={seg.href} target="_blank" rel="noreferrer" className="chat-inlink">
                {seg.text}
              </a>
            );
          }
          return <span key={i}>{seg.text}</span>;
        })}
      </p>
    );
  }

  return (
    <ul className="node-links">
      {node.items.map((item) => {
        const external = item.href.startsWith("http");
        return (
          <li key={item.href}>
            <a href={item.href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
              {item.label}
            </a>
            {item.note ? <span className="node-links__note">{item.note}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

function Message({ msg, reduced, onAsk }: { msg: Msg; reduced: boolean; onAsk: (id: string) => void }) {
  if (msg.role === "visitor") {
    return (
      <div className="msg msg--visitor">
        <span className="msg__who">You</span>
        {msg.nodes.map((node, i) => (
          <NodeView key={i} node={node} onAsk={onAsk} />
        ))}
      </div>
    );
  }
  return (
    <div className="msg msg--haylie">
      <span className="msg__who">
        <b>Haylie</b> · now
      </span>
      <div className="msg__body">
        {msg.nodes.map((node, i) => (
          <div
            key={i}
            className={msg.fresh && !reduced ? "reveal" : undefined}
            style={msg.fresh && !reduced ? { animationDelay: `${i * 90}ms` } : undefined}
          >
            <NodeView node={node} onAsk={onAsk} />
          </div>
        ))}
      </div>
    </div>
  );
}

const greetingMsg = (): Msg => ({ id: "greet", role: "haylie", nodes: GREETING });

export default function ChatPanel() {
  const [thread, setThread] = useState<Msg[]>(() => [greetingMsg()]);
  const [view, setView] = useState<ChipView>("root");
  const [typing, setTyping] = useState(false);
  const [tabs, setTabs] = useState<CanvasTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [thread, typing, reduced]);

  const openTab = useCallback((tab: CanvasTab) => {
    setTabs((prev) => (prev.some((t) => t.id === tab.id) ? prev : [...prev, tab]));
    setActiveTabId(tab.id);
  }, []);

  const ask = useCallback(
    (intentId: string) => {
      const intent = INTENTS[intentId];
      if (!intent || busyRef.current) return;
      if (intent.navigate) {
        window.location.href = intent.navigate;
        return;
      }
      busyRef.current = true;
      const stamp = Date.now();
      setThread((t) => [
        ...t.map((m) => ({ ...m, fresh: false })),
        { id: `${intentId}-q-${stamp}`, role: "visitor", nodes: [{ kind: "text", value: intent.ask }] },
      ]);
      setView({ chips: [] });
      setTyping(true);
      window.setTimeout(
        () => {
          setTyping(false);
          setThread((t) => [
            ...t,
            { id: `${intentId}-a-${Date.now()}`, role: "haylie", nodes: intent.answer, fresh: true },
          ]);
          setView({ chips: nextChips(intentId, []) });
          if (intent.canvas) openTab(tabFromSpec(intent.canvas));
          busyRef.current = false;
        },
        reduced ? 0 : 380 + Math.min(JSON.stringify(intent.answer).length, 320),
      );
    },
    [reduced, openTab],
  );

  const onChip = useCallback(
    (id: string) => {
      if (id === "menu") {
        setView("root");
        return;
      }
      ask(id);
    },
    [ask],
  );

  const collapse = useCallback(() => {
    setTabs([]);
    setActiveTabId(null);
  }, []);

  const reset = useCallback(() => {
    setThread([greetingMsg()]);
    setView("root");
    setTyping(false);
    setTabs([]);
    setActiveTabId(null);
    busyRef.current = false;
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const remaining = prev.filter((t) => t.id !== id);
      setActiveTabId((cur) => (cur === id ? (remaining[remaining.length - 1]?.id ?? null) : cur));
      return remaining;
    });
  }, []);

  const openProject = useCallback(
    (slug: string) => {
      openTab(tabFromSpec(slug ? { kind: "project", slug } : { kind: "projects" }));
    },
    [openTab],
  );

  const chipIds = view === "root" ? ROOT_CHIPS : view.chips;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (tabs.length) collapse();
        else setView("root");
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const hit = chipIds.find((id) => KEYS[id] === e.key.toLowerCase());
      if (hit) {
        e.preventDefault();
        onChip(hit);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chipIds, tabs.length, collapse, onChip]);

  const split = tabs.length > 0;
  const atRoot = view === "root";
  const followUps = view === "root" ? [] : view.chips;

  return (
    <div className="win" data-canvas={split ? "open" : "closed"}>
      <div className="win-bar">
        <div className="win-lights">
          <button type="button" className="win-close" onClick={collapse} aria-label="Close panel" />
          <i className="y" aria-hidden="true" />
          <i className="g" aria-hidden="true" />
        </div>
        <span className="win-title">haylie.dev</span>
        <div className="win-tools">
          <button type="button" className="win-reset" onClick={reset} aria-label="Start over" title="Start over">
            ⟲
          </button>
          <span className="win-status">● READY</span>
        </div>
      </div>

      <div className="win-body">
        <section className="chat-col">
          <div className="chat-log" ref={logRef} role="log" aria-live="polite">
            {thread.map((msg) => (
              <Message key={msg.id} msg={msg} reduced={reduced} onAsk={onChip} />
            ))}
            {typing ? (
              <div className="msg msg--haylie msg--typing" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
            ) : null}
          </div>

          <div className="asks" aria-label="Suggested questions">
            {atRoot
              ? CHIP_GROUPS.map((group) => (
                  <div className="asks-group" key={group.label}>
                    <span className="asks-label">{group.label}</span>
                    <div className="asks-row">
                      {group.ids.map((id) => (
                        <button type="button" key={id} className="ask-pill" onClick={() => onChip(id)}>
                          {INTENTS[id].ask}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              : followUps.length
                ? (
                    <div className="asks-group">
                      <span className="asks-label">Keep going</span>
                      <div className="asks-row">
                        {followUps.map((id) =>
                          id === "menu" ? (
                            <button type="button" key="menu" className="ask-pill ask-pill--back" onClick={() => onChip("menu")}>
                              ↺ all topics
                            </button>
                          ) : (
                            <button type="button" key={id} className="ask-pill" onClick={() => onChip(id)}>
                              {INTENTS[id].ask}
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  )
                : null}
          </div>
        </section>

        <section className="canvas-col" aria-hidden={!split}>
          {split ? (
            <Canvas
              tabs={tabs}
              activeId={activeTabId}
              onSelect={setActiveTabId}
              onClose={closeTab}
              onCollapse={collapse}
              onOpenProject={openProject}
            />
          ) : null}
        </section>
      </div>

      <div className="win-foot">
        <span>HAYLIE WU — SOFTWARE + FLUTE</span>
        <a href="mailto:hayliewu0709@gmail.com">SAY HI ↗</a>
      </div>
    </div>
  );
}
