/**
 * Focus handling for the shared Dialog (components/Dialog.tsx): which elements Tab can reach, and where Tab goes
 * when it would otherwise leave the dialog. The two decisions are plain functions over plain values, so they are
 * tested without a browser (tests/focus-trap.test.mjs); only `tabbableWithin` touches the DOM.
 */

/** Everything that could take keyboard focus. `isTabbable` then drops the ones Tab should skip. */
export const FOCUSABLE_SELECTOR='a[href],area[href],button,input,select,textarea,summary,iframe,audio[controls],video[controls],[contenteditable]:not([contenteditable="false"]),[tabindex]';

/** What `isTabbable` needs to know about an element. */
export type TabCandidate={disabled?:boolean;tabIndex:number;/** Has a box on the page and is not visibility:hidden. */visible:boolean};

/** Tab stops here: not disabled, not taken out of the tab order with tabindex=-1, and actually on the page. */
export function isTabbable(candidate:TabCandidate):boolean{
  return !candidate.disabled&&candidate.tabIndex>=0&&candidate.visible;
}

/**
 * Where Tab should go inside a trap of `count` tab stops when focus is on stop `current` (-1 when focus is not on
 * any of them: on the dialog itself, on the page behind it, or on something that just went away).
 * Returns the index to focus, or null to leave the key to the browser (a move between two stops inside the trap).
 * With no stops at all it returns -1: keep focus on the dialog itself.
 */
export function nextFocusIndex(count:number,current:number,backward:boolean):number|null{
  if(count<=0)return -1;
  if(current<0||current>=count)return backward?count-1:0;
  if(backward)return current===0?count-1:null;
  return current===count-1?0:null;
}

/** The tab stops inside `root`, in document order, measured now (dialog contents change while it is open). */
export function tabbableWithin(root:HTMLElement):HTMLElement[]{
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(element=>isTabbable({
    disabled:(element as HTMLButtonElement).disabled===true||element.closest("fieldset[disabled]")!==null||element.closest("[inert]")!==null,
    tabIndex:element.tabIndex,
    visible:element.getClientRects().length>0&&getComputedStyle(element).visibility!=="hidden",
  }));
}
