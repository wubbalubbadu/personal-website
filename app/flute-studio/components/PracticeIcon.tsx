import type {ReactNode} from "react";
export type PracticeIconName = "metronome" | "tuner" | "drone" | "markup" | "fullscreen" | "close" | "previous" | "next" | "settings" | "gear" | "tap" | "record" | "play" | "stop" | "undo" | "redo" | "saved" | "aids" | "tempo";
const paths:Record<PracticeIconName,ReactNode>={
  // Trapezoid body, base line, pendulum arm. The weight-dot and the extra
  // crossing stroke the old glyph had collapsed into a smudge at 22px.
  metronome:<><path d="M9.2 3.5h5.6L18.5 20H5.5L9.2 3.5Z"/><path d="M6.6 14.8h10.8"/><path d="m12 14.8 3.4-8"/></>,
  tuner:<><path d="M7 3v8a5 5 0 0 0 10 0V3M12 16v6"/><path d="M5 3h4M15 3h4"/></>,
  drone:<><path d="M11 4 6 8H3v8h3l5 4V4Z"/><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></>,
  markup:<><path d="M16.1 3.9a1.9 1.9 0 0 1 2.7 0l1.3 1.3a1.9 1.9 0 0 1 0 2.7L8.5 19.5l-4.6 1.1 1.1-4.6L16.1 3.9Z"/><path d="m14.4 5.6 4 4"/></>,
  undo:<><path d="M4 3v6h6M4 9a8 8 0 1 1 0 8"/></>,
  redo:<><path d="M20 3v6h-6M20 9a8 8 0 1 0 0 8"/></>,
  saved:<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/>,
  aids:<><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16M5.5 8h1M5.5 12h1M5.5 16h1"/></>,
  fullscreen:<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>,
  close:<path d="m6 6 12 12M18 6 6 18"/>,
  previous:<path d="m15 5-7 7 7 7"/>,next:<path d="m9 5 7 7-7 7"/>,
  settings:<><path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 3v6M16 9v6M10 15v6"/></>,
  play:<path d="m8 4 12 8-12 8Z" fill="currentColor" stroke="none"/>,stop:<path d="M6 6h12v12H6Z" fill="currentColor" stroke="none"/>,
  gear:<><circle cx="12" cy="12" r="3.2"/><path d="M19.4 14.4a1.5 1.5 0 0 0 .3 1.7l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.5 1.5 0 0 0-1.7-.3 1.5 1.5 0 0 0-.9 1.4v.2a1.9 1.9 0 0 1-3.8 0v-.1a1.5 1.5 0 0 0-1-1.4 1.5 1.5 0 0 0-1.7.3l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.5 1.5 0 0 0 .3-1.7 1.5 1.5 0 0 0-1.4-.9h-.2a1.9 1.9 0 0 1 0-3.8h.1a1.5 1.5 0 0 0 1.4-1 1.5 1.5 0 0 0-.3-1.7l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.5 1.5 0 0 0 1.7.3h.1a1.5 1.5 0 0 0 .9-1.4v-.2a1.9 1.9 0 0 1 3.8 0v.1a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.7-.3l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.5 1.5 0 0 0-.3 1.7v.1a1.5 1.5 0 0 0 1.4.9h.2a1.9 1.9 0 0 1 0 3.8h-.1a1.5 1.5 0 0 0-1.4.9Z"/></>,
  tap:<><circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="7.4" opacity=".45"/></>,
  record:<circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/>,
  // A dial, not a metronome: the practice bar already has a metronome
  // button, and two metronomes in one toolbar would read as one control
  // drawn twice. This one is "how fast", not "click along".
  tempo:<><path d="M3.8 17.5a8.5 8.5 0 1 1 16.4 0"/><path d="m12 17.5 4.4-5.2"/><circle cx="12" cy="17.6" r="1.4" fill="currentColor" stroke="none"/></>,
};
/**
 * `gradient` swaps the stroke for an SVG paint server by id — a CSS
 * gradient cannot paint a stroke, so the colours have to come from a
 * <linearGradient> elsewhere in the document (see SpectrumDef). Every
 * glyph here is stroke-only, so this is enough to recolour any of them.
 */
export function PracticeIcon({name,gradient}:{name:PracticeIconName;gradient?:string}){return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={gradient?`url(#${gradient})`:"currentColor"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>}

/**
 * The gradient the studio's one rainbow control paints its icon with.
 * Rendered once, zero-sized, next to whatever uses it; the stops match
 * --spectrum in studio-tokens.css so the icon, the label and the ring are
 * the same sweep of colour.
 */
export function SpectrumDef({id}:{id:string}){
  return <svg width="0" height="0" aria-hidden="true" focusable="false" style={{position:"absolute"}}>
    <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#8fb87a"/><stop offset="25%" stopColor="#6fa8c7"/><stop offset="50%" stopColor="#9d8ad4"/><stop offset="75%" stopColor="#d489c4"/><stop offset="100%" stopColor="#e0a46a"/>
    </linearGradient></defs>
  </svg>;
}
