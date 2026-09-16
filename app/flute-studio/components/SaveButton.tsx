"use client";

import "./save-button.css";

/**
 * The studio's one save control.
 *
 * There used to be three: the Library row's star (36px circle, warm amber
 * hover), the score viewer's topbar star (42px rounded square, green
 * hover), and the Exercises hub, which had no save at all — just a "›"
 * chevron, so the same item was savable on one page and not on the next.
 * One star, one size, one hover, one saved colour, everywhere.
 *
 * `tip` renders the hover tooltip the topbar's other controls use; list
 * rows leave it off, since the row is already labelled.
 */
export function SaveButton({saved,onToggle,label,tip}:{saved:boolean;onToggle:()=>void;label:string;tip?:string}){
  return <button
    type="button"
    className={saved?`studio-save is-saved${tip?" has-tip":""}`:`studio-save${tip?" has-tip":""}`}
    aria-pressed={saved}
    aria-label={label}
    title={tip?undefined:label}
    data-tip={tip}
    onClick={event=>{event.preventDefault();event.stopPropagation();onToggle()}}
  >
    <svg viewBox="0 0 20 20" width="19" height="19" fill={saved?"currentColor":"none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 2.8l2.2 4.55 5 .73-3.6 3.53.85 4.99L10 14.2l-4.45 2.4.85-4.99L2.8 8.08l5-.73L10 2.8z"/>
    </svg>
  </button>;
}
