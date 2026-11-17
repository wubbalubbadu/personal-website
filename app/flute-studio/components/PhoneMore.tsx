"use client";
import {useState} from "react";
import {PracticeIcon} from "./PracticeIcon";
import {ReaderPopover} from "./ReaderPopover";

/**
 * The phone reader's "more" menu (Nov 16): the dots at the end of the practice row. On a phone the two bars only
 * hold what you reach for while playing (Mark up and Record are in here too); the rest of the reader's own buttons stay in the page, hidden by the phone
 * block at the end of studio-shell.css, and this menu presses them for you. Nothing is duplicated: each row is one
 * of those buttons, found when the menu opens, shown with that button's own icon and name, so a page that has no
 * Tempos or no full screen simply has no such row. Hidden above 760px.
 */
// A selector, and a short name where the button's own name is a sentence ("Time Leonore Overture No. 3").
const TARGETS:[selector:string,en?:string,zh?:string][]=[
  ['.tool-group>button:has(svg[data-icon="markup"])'],
  [".record-button"],
  ['.reader-view button:has(svg[data-icon="tempo"])'],
  ['.reader-pages button:has(svg[data-icon="fullscreen"])',"Focus mode","专注模式"],
  ['.reader-pages button:has(svg[data-icon="exitFullscreen"])',"Leave focus mode","退出专注模式"],
  [".practice-clock-button","Practice timer","练习计时"],
  [".dock-launcher"],
  [".account-menu__trigger"],
];
type Row={target:HTMLElement;label:string;icon:string};

export function PhoneMore({zh}:{zh:boolean}){
  const [open,setOpen]=useState(false),[rows,setRows]=useState<Row[]>([]);
  const change=(next:boolean)=>{
    if(next){
      // The whole page, not only the reader: the Practice tools launcher is portalled in from the studio shell.
      setRows(TARGETS.flatMap(([selector,en,zhName])=>{
        const target=document.querySelector<HTMLElement>(selector);
        if(!target)return [];
        // The button's own short word when it shows one (Draw, Record, Tempos), else its accessible name.
        const label=(zh?zhName:en)||target.textContent?.trim()||target.getAttribute("aria-label")||"";
        return [{target,label,icon:target.querySelector("svg")?.outerHTML??""}];
      }));
    }
    setOpen(next);
  };
  // Close this sheet first, then press the real button, so its own sheet or panel never opens underneath this one.
  const press=(row:Row)=>{setOpen(false);window.setTimeout(()=>row.target.click(),240)};
  return <ReaderPopover label={zh?"更多":"More"} trigger={<PracticeIcon name="more"/>} className="tool has-tip phone-more__trigger" panelClassName="phone-more__panel" open={open} onOpenChange={change}>
    <ul className="phone-more__list">{rows.map(row=><li key={row.label}>
      {/* The icon is the pressed button's own svg, copied as markup: app-drawn icons, never user content. */}
      <button type="button" onClick={()=>press(row)}><span aria-hidden="true" dangerouslySetInnerHTML={{__html:row.icon}}/>{row.label}</button>
    </li>)}</ul>
  </ReaderPopover>;
}
