"use client";

import {createContext,useContext,useEffect,useLayoutEffect,useMemo,useState} from "react";
import {translations,type Lang} from "./translations";

const storageKey="cookie:language";

type LanguageContextValue={lang:Lang;setLang:(lang:Lang)=>void;t:typeof translations["en"]};

const LanguageContext=createContext<LanguageContextValue|null>(null);

export function LanguageProvider({children}:{children:React.ReactNode}){
  const [lang,setLangState]=useState<Lang>("en");

  // useLayoutEffect, not useEffect: this runs before the browser paints, so
  // the English default never actually reaches the screen when the real
  // language is Chinese. With a plain useEffect it did — the page was
  // visible and clickable for a moment showing "en" text, then every
  // language-dependent button (e.g. "Customize" vs "自定义") resized once
  // this corrected the language, which could shift a neighboring button
  // (like View settings) right under a click that was already in flight,
  // opening the wrong popover.
  useLayoutEffect(()=>{
    const saved=localStorage.getItem(storageKey);
    if(saved==="en"||saved==="zh"){setLangState(saved);return}
    if(navigator.language?.toLowerCase().startsWith("zh"))setLangState("zh");
  },[]);

  function setLang(next:Lang){
    setLangState(next);
    localStorage.setItem(storageKey,next);
    window.dispatchEvent(new Event("cookie:language-updated"));
  }

  useEffect(()=>{
    const sync=()=>{
      const saved=localStorage.getItem(storageKey);
      if(saved==="en"||saved==="zh")setLangState(saved);
    };
    window.addEventListener("cookie:language-updated",sync);
    window.addEventListener("storage",sync);
    return()=>{
      window.removeEventListener("cookie:language-updated",sync);
      window.removeEventListener("storage",sync);
    };
  },[]);

  const value=useMemo(()=>({lang,setLang,t:translations[lang]}),[lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(){
  const context=useContext(LanguageContext);
  if(!context)throw new Error("useLanguage must be used within a LanguageProvider");
  return context;
}
