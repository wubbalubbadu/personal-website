import type {ReactNode} from "react";
export type PracticeIconName = "metronome" | "tuner" | "drone" | "markup" | "fullscreen" | "close" | "previous" | "next" | "settings" | "gear" | "tap" | "record" | "play" | "stop" | "undo" | "redo" | "saved" | "aids";
const paths:Record<PracticeIconName,ReactNode>={
  metronome:<><path d="M8 3h8l4 18H4L8 3Z"/><path d="m12 17 5-11M8 17h8"/><circle cx="15.5" cy="8" r="1"/></>,
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
};
export function PracticeIcon({name}:{name:PracticeIconName}){return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>}
