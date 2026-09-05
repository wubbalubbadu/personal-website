"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { AnswerNode, GREETING, INTENTS, nextChips, ROOT_CHIPS } from "./lib/answers";

type Msg = { id: string; role: "visitor" | "haylie"; nodes: AnswerNode[] };

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

function LazyVideo({ youtube, start, caption }: { youtube: string; start?: number; caption?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || show) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show]);
  const src = `https://www.youtube-nocookie.com/embed/${youtube}${start ? `?start=${start}` : ""}`;
  return (
    <figure className="node-video" ref={ref}>
      {show ? (
        <iframe
          src={src}
          title={caption ?? "Performance video"}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <div className="node-video__ph" aria-hidden="true" />
      )}
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

function NodeView({ node }: { node: AnswerNode }) {
  if (node.kind === "text") return <p className="node-text">{node.value}</p>;
  if (node.kind === "linkList")
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
  if (node.kind === "image") {
    const img = <img src={node.src} alt={node.alt} loading="lazy" />;
    return <div className="node-image">{node.href ? <a href={node.href}>{img}</a> : img}</div>;
  }
  if (node.kind === "video") return <LazyVideo youtube={node.youtube} start={node.start} caption={node.caption} />;
  return null;
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
  const [chips, setChips] = useState<string[]>(ROOT_CHIPS);
  const [asked, setAsked] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  const scrollDown = useCallback(() => {
    const el = logRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [reduced]);

  useEffect(() => {
    scrollDown();
  }, [thread, typing, scrollDown]);

  const ask = useCallback(
    (intentId: string) => {
      const intent = INTENTS[intentId];
      if (!intent) return;
      const stamp = Date.now();
      setThread((t) => [
        ...t,
        { id: `${intentId}-q-${stamp}`, role: "visitor", nodes: [{ kind: "text", value: intent.ask }] },
      ]);
      setChips([]);
      setTyping(true);
      const nextAsked = asked.includes(intentId) ? asked : [...asked, intentId];
      window.setTimeout(
        () => {
          setTyping(false);
          setThread((t) => [...t, { id: `${intentId}-a-${Date.now()}`, role: "haylie", nodes: intent.answer }]);
          setAsked(nextAsked);
          setChips(nextChips(intentId, nextAsked));
        },
        reduced ? 0 : 460,
      );
    },
    [asked, reduced],
  );

  const onChip = useCallback(
    (id: string) => {
      if (id === "menu") {
        setChips(ROOT_CHIPS);
        return;
      }
      ask(id);
    },
    [ask],
  );

  const reset = useCallback(() => {
    setThread([greetingMsg()]);
    setChips(ROOT_CHIPS);
    setAsked([]);
    setTyping(false);
  }, []);

  return (
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

      <div className="chip-row" role="group" aria-label="Suggested questions">
        {chips.map((id) => (
          <button type="button" key={id} className="chip" onClick={() => onChip(id)}>
            {id === "menu" ? "Menu" : INTENTS[id].chip}
          </button>
        ))}
      </div>
    </section>
  );
}
