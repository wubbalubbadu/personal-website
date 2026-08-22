"use client";

import {createContext,useContext,useEffect,useMemo,useState} from "react";
import {translations,type Lang} from "./translations";

const storageKey="cookie:language";

type LanguageContextValue={lang:Lang;setLang:(lang:Lang)=>void;t:typeof translations["en"]};

const LanguageContext=createContext<LanguageContextValue|null>(null);

export function LanguageProvider({children}:{children:React.ReactNode}){
  const [lang,setLangState]=useState<Lang>("en");

  useEffect(()=>{
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
