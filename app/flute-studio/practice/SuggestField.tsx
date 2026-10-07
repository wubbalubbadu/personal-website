"use client";
import {useState,type ReactNode} from "react";

export type SuggestItem={id:string;title:string;composer:string};

/**
 * One text field that also finds exercises and pieces: type anything and press Enter to use your own words, or pick
 * a match from the list under it (arrow keys work too). Used to add routine steps and to name a focus session.
 */
export function SuggestField({id,items,value,onChange,onText,onPick,placeholder,label,submitLabel,icon}:{
  id:string;items:SuggestItem[];value:string;onChange:(text:string)=>void;
  /** Enter with your own words. */onText:(text:string)=>void;
  /** A match picked from the list. */onPick:(item:SuggestItem)=>void;
  placeholder:string;label:string;submitLabel:string;icon?:ReactNode;
}){
  // The list opens as soon as you click in (everything you could pick), and narrows as you type.
  const [at,setAt]=useState(-1),[open,setOpen]=useState(false);
  const query=value.trim().toLocaleLowerCase();
  const matches=!open?[]:query?items.filter(item=>`${item.title} ${item.composer}`.toLocaleLowerCase().includes(query)):items;
  const pick=(item:SuggestItem)=>{onPick(item);setAt(-1);setOpen(false)};
  return <div className="suggest-field">
    <form className="routine-add" onSubmit={e=>{e.preventDefault();if(at>=0&&matches[at])pick(matches[at]);else if(value.trim()){onText(value.trim());setAt(-1);setOpen(false)}}}>
      {icon}
      <input value={value} onChange={e=>{onChange(e.target.value);setAt(-1);setOpen(true)}} onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)} placeholder={placeholder} aria-label={label}
        role="combobox" aria-expanded={matches.length>0} aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={at>=0?`${id}-${at}`:undefined}
        onKeyDown={e=>{
          if(e.key==="ArrowDown"&&matches.length){e.preventDefault();setAt(i=>Math.min(matches.length-1,i+1))}
          else if(e.key==="ArrowUp"&&matches.length){e.preventDefault();setAt(i=>Math.max(-1,i-1))}
          else if(e.key==="Escape"){onChange("");setAt(-1);setOpen(false)}
        }}/>
      {value.trim()&&<button type="submit">{submitLabel}</button>}
    </form>
    {matches.length>0&&<ul className="routine-suggestions" id={`${id}-list`} role="listbox" aria-label={label}>
      {matches.map((item,i)=><li key={item.id} id={`${id}-${i}`} role="option" aria-selected={i===at}>
        <button type="button" className={i===at?"is-active":""} onMouseDown={e=>e.preventDefault()} onClick={()=>pick(item)}>
          <span>{item.title}<small>{item.composer}</small></span>
        </button>
      </li>)}
    </ul>}
  </div>;
}
