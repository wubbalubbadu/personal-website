import "./close-button.css";

/**
 * The one close button (COMPONENTS.md, "Close vs delete"): the Mark Up toolbar's plain ×, dark, no fill, no border,
 * no hover change and no tooltip. It only closes things; removing data uses the trash icon instead.
 * Pass `className` for placement (position, margins), never for its look.
 */
export function CloseButton({label,onClick,className}:{label:string;onClick:()=>void;className?:string}){
  return <button type="button" className={className?`close-button ${className}`:"close-button"} aria-label={label} onClick={onClick}>
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5 5 15"/></svg>
  </button>;
}
