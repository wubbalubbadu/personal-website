"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import {
  AnswerNode,
  GREETING,
  INTENTS,
  nextChips,
  PRIMARY_CHIPS,
  SECONDARY_CHIPS,
} from "./lib/answers";
import { CanvasTab, tabFromSpec } from "./lib/canvas";
import Canvas from "./canvas/Canvas";

type Msg = { id: string; role: "visitor" | "haylie"; nodes: AnswerNode[] };
type ChipView = "root" | { chips: string[] };

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

function NodeView({ node }: { node: AnswerNode }) {
  if (node.kind === "text") return <p className="node-text">{node.value}</p>;
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

function Bubble({ msg, logRef }: { msg: Msg; logRef: RefObject<HTMLDivElement | null> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [past, setPast] = useState(false);
  useEffect(() => {
    const el = ref.current;
    const root = logRef.current;
    if (!el || !root) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const rootTop = root.getBoundingClientRect().top;
        setPast(entry.intersectionRatio < 0.2 && entry.boundingClientRect.top < rootTop + 48);
      },
      { root, threshold: [0, 0.2, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [logRef]);
  return (
    <div ref={ref} className={`bubble bubble--${msg.role}${past ? " is-past" : ""}`}>
      {msg.nodes.map((node, i) => (
        <NodeView key={i} node={node} />
      ))}
    </div>
  );
}

const greetingMsg = (): Msg => ({ id: "greet", role: "haylie", nodes: GREETING });

export default function ChatPanel() {
  const [thread, setThread] = useState<Msg[]>(() => [greetingMsg()]);
  const [view, setView] = useState<ChipView>("root");
  const [asked, setAsked] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const [tabs, setTabs] = useState<CanvasTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  const scrollDown = useCallback(() => {
    const el = logRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [reduced]);

  useEffect(() => {
    scrollDown();
  }, [thread, typing, scrollDown]);

  const openTab = useCallback((tab: CanvasTab) => {
    setTabs((prev) => (prev.some((t) => t.id === tab.id) ? prev : [...prev, tab]));
    setActiveTabId(tab.id);
  }, []);

  const ask = useCallback(
    (intentId: string) => {
      const intent = INTENTS[intentId];
      if (!intent) return;
      const stamp = Date.now();
      setThread((t) => [
        ...t,
        { id: `${intentId}-q-${stamp}`, role: "visitor", nodes: [{ kind: "text", value: intent.ask }] },
      ]);
      setView({ chips: [] });
      setTyping(true);
      const nextAsked = asked.includes(intentId) ? asked : [...asked, intentId];
      window.setTimeout(
        () => {
          setTyping(false);
          setThread((t) => [...t, { id: `${intentId}-a-${Date.now()}`, role: "haylie", nodes: intent.answer }]);
          setAsked(nextAsked);
          setView({ chips: nextChips(intentId, nextAsked) });
          if (intent.canvas) openTab(tabFromSpec(intent.canvas));
        },
        reduced ? 0 : 460,
      );
    },
    [asked, reduced, openTab],
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

  const reset = useCallback(() => {
    setThread([greetingMsg()]);
    setView("root");
    setAsked([]);
    setTyping(false);
    setTabs([]);
    setActiveTabId(null);
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => prev.filter((t) => t.id !== id));
      setActiveTabId((cur) => {
        if (cur !== id) return cur;
        const remaining = tabs.filter((t) => t.id !== id);
        return remaining[remaining.length - 1]?.id ?? null;
      });
    },
    [tabs],
  );

  const collapse = useCallback(() => {
    setTabs([]);
    setActiveTabId(null);
  }, []);

  const openProject = useCallback(
    (slug: string) => {
      openTab(tabFromSpec(slug ? { kind: "project", slug } : { kind: "projects" }));
    },
    [openTab],
  );

  const split = tabs.length > 0;

  return (
    <div className={`workbench${split ? " is-split" : ""}`}>
      <section className="chat-device">
        <header className="chat-head">
          <span className="chat-head__id">Haylie Wu</span>
          <span className="chat-head__meta">Portfolio</span>
          <button type="button" className="chat-head__clr" onClick={reset} aria-label="Start over">
            CLR
          </button>
        </header>

        <div className="chat-log" ref={logRef} role="log" aria-live="polite">
          {thread.map((msg) => (
            <Bubble key={msg.id} msg={msg} logRef={logRef} />
          ))}
          {typing ? (
            <div className="bubble bubble--haylie bubble--typing" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          ) : null}
        </div>

        <div className="chip-dock">
          {view === "root" ? (
            <>
              <div className="chip-row chip-row--primary">
                {PRIMARY_CHIPS.map((id) => (
                  <button type="button" key={id} className="chip chip--primary" onClick={() => onChip(id)}>
                    {INTENTS[id].chip}
                  </button>
                ))}
              </div>
              <div className="chip-row">
                {SECONDARY_CHIPS.map((id) => (
                  <button type="button" key={id} className="chip" onClick={() => onChip(id)}>
                    {INTENTS[id].chip}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="chip-row">
              {view.chips.map((id) => (
                <button type="button" key={id} className="chip" onClick={() => onChip(id)}>
                  {id === "menu" ? "Menu" : INTENTS[id].chip}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

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
    </div>
  );
}
