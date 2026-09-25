import type {ReactNode} from "react";
export type PracticeIconName = "metronome" | "tuner" | "mic" | "drone" | "markup" | "fullscreen" | "close" | "previous" | "next" | "settings" | "gear" | "tap" | "record" | "play" | "stop" | "undo" | "redo" | "saved" | "aids" | "tempo" | "print" | "top" | "highlighter" | "arrow" | "eraser" | "text" | "sticky" | "select";
const paths:Record<PracticeIconName,ReactNode>={
  // Trapezoid body, base line, pendulum arm. The weight-dot and the extra
  // crossing stroke the old glyph had collapsed into a smudge at 22px.
  metronome:<><path d="M9.2 3.5h5.6L18.5 20H5.5L9.2 3.5Z"/><path d="M6.6 14.8h10.8"/><path d="m12 14.8 3.4-8"/></>,
  // Capsule, cradle, stand: reads as "listening", which Record (a dot) does not.
  mic:<><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></>,
  tuner:<><path d="M7 3v8a5 5 0 0 0 10 0V3M12 16v6"/><path d="M5 3h4M15 3h4"/></>,
  drone:<><path d="M11 4 6 8H3v8h3l5 4V4Z"/><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></>,
  markup:<><path d="M16.1 3.9a1.9 1.9 0 0 1 2.7 0l1.3 1.3a1.9 1.9 0 0 1 0 2.7L8.5 19.5l-4.6 1.1 1.1-4.6L16.1 3.9Z"/><path d="m14.4 5.6 4 4"/></>,
  undo:<path d="m8 5-4 4 4 4M4 9h10a5 5 0 0 1 0 10h-3"/>,
  redo:<path d="m16 5 4 4-4 4M20 9H10a5 5 0 0 0 0 10h3"/>,
  highlighter:<path d="m14 4 6 6-8 8-6-6 8-8ZM6 12l-2 6 2 2 6-2M3 21h8"/>,
  arrow:<path d="M5 19 19 5M8 5h11v11"/>,
  eraser:<path d="m14 4 6 6-10 10H6l-4-4L14 4ZM8 10l6 6M10 20h10"/>,
  text:<path d="M5 6V4h14v2M12 4v16M8 20h8"/>,
  sticky:<path d="M14 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9l-7 7ZM14 21v-7h7"/>,
  select:<path d="m5 3 15 10-7 1-3 7L5 3Z"/>,
  saved:<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/>,
  aids:<><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16M5.5 8h1M5.5 12h1M5.5 16h1"/></>,
  fullscreen:<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>,
  close:<path d="m6 6 12 12M18 6 6 18"/>,
  previous:<path d="m15 5-7 7 7 7"/>,next:<path d="m9 5 7 7-7 7"/>,top:<><path d="M5 5h14"/><path d="M12 20V9"/><path d="m7.5 13.5 4.5-4.5 4.5 4.5"/></>,
  settings:<><path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 3v6M16 9v6M10 15v6"/></>,
  play:<path d="m8 4 12 8-12 8Z" fill="currentColor" stroke="none"/>,stop:<path d="M6 6h12v12H6Z" fill="currentColor" stroke="none"/>,
  gear:<><circle cx="12" cy="12" r="3.2"/><path d="M19.4 14.4a1.5 1.5 0 0 0 .3 1.7l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.5 1.5 0 0 0-1.7-.3 1.5 1.5 0 0 0-.9 1.4v.2a1.9 1.9 0 0 1-3.8 0v-.1a1.5 1.5 0 0 0-1-1.4 1.5 1.5 0 0 0-1.7.3l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.5 1.5 0 0 0 .3-1.7 1.5 1.5 0 0 0-1.4-.9h-.2a1.9 1.9 0 0 1 0-3.8h.1a1.5 1.5 0 0 0 1.4-1 1.5 1.5 0 0 0-.3-1.7l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.5 1.5 0 0 0 1.7.3h.1a1.5 1.5 0 0 0 .9-1.4v-.2a1.9 1.9 0 0 1 3.8 0v.1a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.7-.3l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.5 1.5 0 0 0-.3 1.7v.1a1.5 1.5 0 0 0 1.4.9h.2a1.9 1.9 0 0 1 0 3.8h-.1a1.5 1.5 0 0 0-1.4.9Z"/></>,
  tap:<><circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="7.4" opacity=".45"/></>,
  record:<circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/>,
  // A dial, not a metronome: the practice bar already has a metronome
  // button, and two metronomes in one toolbar would read as one control
  // drawn twice. This one is "how fast", not "click along".
  tempo:<><path d="M3.8 17.5a8.5 8.5 0 1 1 16.4 0"/><path d="m12 17.5 4.4-5.2"/><circle cx="12" cy="17.6" r="1.4" fill="currentColor" stroke="none"/></>,
  print:<><path d="M7 9V4h10v5"/><path d="M7 18H5.5A1.5 1.5 0 0 1 4 16.5v-5A1.5 1.5 0 0 1 5.5 10h13a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17"/><path d="M7 14h10v6H7Z"/></>,
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
const WARM_STOPS=["#8fb87a","#6fa8c7","#9d8ad4","#d489c4","#e0a46a"];
export function SpectrumDef({id,stops=WARM_STOPS}:{id:string;stops?:string[]}){
  return <svg width="0" height="0" aria-hidden="true" focusable="false" style={{position:"absolute"}}>
    <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      {stops.map((color,i)=><stop key={i} offset={`${i/(stops.length-1)*100}%`} stopColor={color}/>)}
    </linearGradient></defs>
  </svg>;
}
