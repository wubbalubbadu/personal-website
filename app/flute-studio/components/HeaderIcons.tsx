/**
 * Icons for the header controls (reader bar and studio nav), drawn to match
 * the tuning fork beside them: 20px box, 1.7 stroke, round caps and joins,
 * no fills. A typed "↓" or a thin spoked cog read as a different set.
 */
const base={viewBox:"0 0 20 20",width:20,height:20,fill:"none",stroke:"currentColor",strokeWidth:1.7,strokeLinecap:"round" as const,strokeLinejoin:"round" as const,"aria-hidden":true};

/** Settings: a soft eight-lobed gear rather than a toothed cog. */
export function GearIcon(){
  return <svg {...base}><path d="M10.00 2.15 L10.51 2.29 L10.96 2.69 L11.35 3.23 L11.66 3.79 L11.95 4.25 L12.28 4.50 L12.69 4.55 L13.21 4.44 L13.83 4.26 L14.49 4.15 L15.09 4.19 L15.55 4.45 L15.81 4.91 L15.85 5.51 L15.74 6.17 L15.56 6.79 L15.45 7.31 L15.50 7.72 L15.75 8.05 L16.21 8.34 L16.77 8.65 L17.31 9.04 L17.71 9.49 L17.85 10.00 L17.71 10.51 L17.31 10.96 L16.77 11.35 L16.21 11.66 L15.75 11.95 L15.50 12.28 L15.45 12.69 L15.56 13.21 L15.74 13.83 L15.85 14.49 L15.81 15.09 L15.55 15.55 L15.09 15.81 L14.49 15.85 L13.83 15.74 L13.21 15.56 L12.69 15.45 L12.28 15.50 L11.95 15.75 L11.66 16.21 L11.35 16.77 L10.96 17.31 L10.51 17.71 L10.00 17.85 L9.49 17.71 L9.04 17.31 L8.65 16.77 L8.34 16.21 L8.05 15.75 L7.72 15.50 L7.31 15.45 L6.79 15.56 L6.17 15.74 L5.51 15.85 L4.91 15.81 L4.45 15.55 L4.19 15.09 L4.15 14.49 L4.26 13.83 L4.44 13.21 L4.55 12.69 L4.50 12.28 L4.25 11.95 L3.79 11.66 L3.23 11.35 L2.69 10.96 L2.29 10.51 L2.15 10.00 L2.29 9.49 L2.69 9.04 L3.23 8.65 L3.79 8.34 L4.25 8.05 L4.50 7.72 L4.55 7.31 L4.44 6.79 L4.26 6.17 L4.15 5.51 L4.19 4.91 L4.45 4.45 L4.91 4.19 L5.51 4.15 L6.17 4.26 L6.79 4.44 L7.31 4.55 L7.72 4.50 L8.05 4.25 L8.34 3.79 L8.65 3.23 L9.04 2.69 L9.49 2.29Z"/><circle cx="10" cy="10" r="2.6"/></svg>;
}

/** Download: an arrow landing on a line. */
export function DownloadIcon(){
  return <svg {...base}><path d="M10 3.5v9M6 9l4 4 4-4M4.5 16.5h11"/></svg>;
}

export function PlusIcon(){
  return <svg {...base}><path d="M10 4.5v11M4.5 10h11"/></svg>;
}

export function CheckIcon(){
  return <svg {...base}><path d="M4.5 10.5 8 14l7.5-8"/></svg>;
}

/** Fold and unfold: a chevron that points down when closed and turns up when open (rotate it with CSS). */
export function ChevronIcon(){
  return <svg {...base} className="chevron-icon"><path d="M5.5 8 10 12.5 14.5 8"/></svg>;
}
