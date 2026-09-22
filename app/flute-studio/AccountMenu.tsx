"use client";

import {useEffect,useRef,useState} from "react";
import {useLanguage} from "./i18n/LanguageContext";
import {setPencilOnly,usePencilOnly} from "./lib/pencilMode";
import "./account-menu.css";

/**
 * The account menu, hanging off the avatar in the top right.
 *
 * Settings used to be a nav tab with two pages behind it, which gave a
 * language switch and a version number the same billing as Music and
 * Exercises. Tabs are for places you go to do something; settings is
 * somewhere you visit rarely, change one thing, and leave. On the web that
 * lives under the account control, which is also where signing out will
 * want to go later.
 *
 * Everything the two pages held fits here without a route: there was only
 * ever a language choice and an about block.
 */
export default function AccountMenu(){
  const {t,lang,setLang}=useLanguage();
  const pencil=usePencilOnly();
  const [open,setOpen]=useState(false);
  const [position,setPosition]=useState({top:62,right:16});
  useEffect(()=>{
    const close=()=>setOpen(false);
    window.addEventListener("cookie:open-tools-panel",close);
    return()=>window.removeEventListener("cookie:open-tools-panel",close);
  },[]);
  const wrap=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    if(!open)return;
    // Pointerdown rather than click: a click listener fires after the menu
    // has already handled its own click, which closed the menu every time
    // you picked a language.
    const onPointerDown=(event:PointerEvent)=>{
      if(!wrap.current?.contains(event.target as Node))setOpen(false);
    };
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)};
    window.addEventListener("pointerdown",onPointerDown);
    window.addEventListener("keydown",onKeyDown);
    return()=>{
      window.removeEventListener("pointerdown",onPointerDown);
      window.removeEventListener("keydown",onKeyDown);
    };
  },[open]);

  return <div className="account-menu" ref={wrap}>
    <button
      type="button"
      className="account-menu__trigger"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={t.nav.avatarLabel}
      onClick={()=>{
        if(!open){
          const rect=wrap.current?.getBoundingClientRect();
          const header=wrap.current?.closest("header")?.getBoundingClientRect();
          if(rect)setPosition({top:Math.max(rect.bottom,header?.bottom??0)+10-rect.top,right:0});
          window.dispatchEvent(new Event("cookie:open-account-panel"));
        }
        setOpen(value=>!value);
      }}
    >HW</button>

    {open&&<div className="account-menu__panel" role="menu" style={{top:position.top,right:position.right}}>
      <p className="account-menu__group">{t.settings.language}</p>
      <div className="account-menu__choices">
        {([["en",t.settings.english],["zh",t.settings.chinese]] as const).map(([value,label])=>
          <button
            key={value}
            type="button"
            role="menuitemradio"
            aria-checked={lang===value}
            className={lang===value?"account-menu__item is-on":"account-menu__item"}
            onClick={()=>setLang(value)}
          >
            <span>{label}</span>
            {lang===value&&<b aria-hidden="true">✓</b>}
          </button>)}
      </div>

      <hr className="account-menu__rule"/>
      <p className="account-menu__group">{t.settings.drawing}</p>
      <div className="account-menu__choices">
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={pencil}
          className={pencil?"account-menu__item is-on":"account-menu__item"}
          onClick={()=>setPencilOnly(!pencil)}
        >
          <span>{t.settings.pencilOnly}</span>
          {pencil&&<b aria-hidden="true">✓</b>}
        </button>
      </div>
      <p className="account-menu__footnote">{t.settings.pencilOnlyNote}</p>

      <hr className="account-menu__rule"/>
      <p className="account-menu__group">{t.settings.about}</p>
      <p className="account-menu__about">
        <span>{t.settings.aboutApp}</span>
        <small>{t.settings.aboutVersion}</small>
      </p>
    </div>}
  </div>;
}
