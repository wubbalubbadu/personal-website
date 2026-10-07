"use client";
import {useLanguage} from "./i18n/LanguageContext";
export default function StudioLoading(){
  const {lang}=useLanguage();
  return <div className="studio-route-loading" role="status" aria-live="polite">
    <span aria-hidden="true"/>
    <p>{lang==="zh"?"正在打开…":"Opening…"}</p>
  </div>;
}
