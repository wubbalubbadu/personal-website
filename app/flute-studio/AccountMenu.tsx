"use client";

import {usePrivateMusic,unlockPrivateMusic,lockPrivateMusic} from "./lib/privateMusic";
import Link from "next/link";
import {PracticeIcon} from "./components/PracticeIcon";
import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {useLanguage} from "./i18n/LanguageContext";
import {setPencilOnly,usePencilOnly,useTouchScreen} from "./lib/pencilMode";
import {GearIcon} from "./components/HeaderIcons";
import {backupStatus,requestPersistentStorage} from "./lib/transfer";
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
  const privateMusic=usePrivateMusic();
  const [code,setCode]=useState("");
  const pencil=usePencilOnly(),touchScreen=useTouchScreen();
  const [open,setOpen]=useState(false);
  // Read after hydration (localStorage), and again each time the menu opens.
  const [backup,setBackup]=useState<{days:number|null;due:boolean}>({days:null,due:false});
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{setBackup(backupStatus())},[open]);
  // Once per page load is plenty; the browser remembers the answer.
  useEffect(()=>{requestPersistentStorage()},[]);
  const [position,setPosition]=useState({top:62,right:16});
  useEffect(()=>{
    const close=()=>setOpen(false);
    window.addEventListener("cookie:open-tools-panel",close);
    return()=>window.removeEventListener("cookie:open-tools-panel",close);
  },[]);
  const wrap=useRef<HTMLDivElement>(null),sheetRef=useRef<HTMLDivElement>(null);
  // On a phone the panel is a bottom sheet. It is rendered at the top of the page: the nav bar's blur makes
  // position:fixed measure from the nav bar, which pinned the "bottom" sheet to the bar's bottom edge.
  const [sheet,setSheet]=useState(false);

  useEffect(()=>{
    if(!open)return;
    // Pointerdown rather than click: a click listener fires after the menu
    // has already handled its own click, which closed the menu every time
    // you picked a language.
    const onPointerDown=(event:PointerEvent)=>{
      const target=event.target as Node;
      if(!wrap.current?.contains(target)&&!sheetRef.current?.contains(target))setOpen(false);
    };
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)};
    window.addEventListener("pointerdown",onPointerDown);
    window.addEventListener("keydown",onKeyDown);
    return()=>{
      window.removeEventListener("pointerdown",onPointerDown);
      window.removeEventListener("keydown",onKeyDown);
    };
  },[open]);

  const panel=<div className="account-menu__panel" role="menu" style={sheet?undefined:{top:position.top,right:position.right}}>
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

          </button>)}
      </div>

      {/* Only a touch screen has fingers to tell apart from a pencil. */}
      {touchScreen&&<><hr className="account-menu__rule"/>
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

        </button>
      </div>
      <p className="account-menu__footnote">{t.settings.pencilOnlyNote}</p></>}

      <hr className="account-menu__rule"/>
      <p className="account-menu__group">{lang==="zh"?"数据":"Your data"}</p>
      <div className="account-menu__choices">
        <Link className="account-menu__item" role="menuitem" href="/flute-studio/transfer" onClick={()=>setOpen(false)}>
          <span>{lang==="zh"?"设备同步":"Sync devices"}</span><PracticeIcon name="next"/>
        </Link>
      </div>
      {/* A reminder, not a warning: the browser can clear this site's data (Safari after a week or so unused). */}
      <p className={backup.due?"account-menu__footnote account-menu__backup is-due":"account-menu__footnote account-menu__backup"}>{backup.days===null
        ?(lang==="zh"?"还没有备份过。生成一次代码或文件，就有了一份备份。":"Not backed up yet. Making a code or file once gives you a copy.")
        :backup.days===0?(lang==="zh"?"今天已备份":"Backed up today")
        :(lang==="zh"?`上次备份：${backup.days} 天前`:`Last backup: ${backup.days} ${backup.days===1?"day":"days"} ago`)}</p>

      <hr className="account-menu__rule"/>
      <p className="account-menu__group">{lang==="zh"?"私人曲库":"Private music"}</p>
      {privateMusic.unlocked?<div className="account-menu__choices"><Link role="menuitem" className="account-menu__item" href="/flute-studio/music" onClick={()=>setOpen(false)}>{lang==="zh"?`已解锁 ${privateMusic.items.length} 首`:`${privateMusic.items.length} pieces unlocked`}</Link><button role="menuitem" className="account-menu__item" onClick={lockPrivateMusic}>{lang==="zh"?"锁定私人曲库":"Lock private music"}</button></div>:<form className="account-menu__private" onSubmit={event=>{event.preventDefault();void unlockPrivateMusic(code).then(ok=>{if(ok)setCode("")})}}>
        <label><span>{lang==="zh"?"访问码":"Access code"}</span><input type="password" autoComplete="off" value={code} onChange={event=>setCode(event.target.value)} /></label>
        <button disabled={privateMusic.loading} type="submit">{lang==="zh"?(privateMusic.loading?"正在解锁…":"解锁"):(privateMusic.loading?"Unlocking…":"Unlock")}</button>
        {privateMusic.error&&<p role="status">{lang==="zh"?"无法解锁，请检查访问码。":"Could not unlock. Check the code."}</p>}
      </form>}
      <hr className="account-menu__rule"/>
      <p className="account-menu__group">{t.settings.about}</p>
      <p className="account-menu__about">
        <span>{t.settings.aboutApp}</span>
        <small>{t.settings.aboutVersion}</small>
      </p>
    </div>;

  return <div className="account-menu" ref={wrap}>
    <button
      type="button"
      className={open?"account-menu__trigger":"account-menu__trigger has-tip"}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={t.nav.avatarLabel}
      data-tip={open?undefined:t.nav.avatarLabel}
      onClick={()=>{
        if(!open){
          const rect=wrap.current?.getBoundingClientRect();
          const header=wrap.current?.closest("header")?.getBoundingClientRect();
          if(rect)setPosition({top:Math.max(rect.bottom,header?.bottom??0)+10-rect.top,right:0});
          setSheet(window.matchMedia("(max-width:760px)").matches);
          window.dispatchEvent(new Event("cookie:open-account-panel"));
        }
        setOpen(value=>!value);
      }}
    >
      {/* A gear rather than initials: there is no account, only settings. */}
      <GearIcon/>{backup.due&&!open&&<span className="account-menu__dot" aria-hidden="true"/>}
    </button>

    {open&&(sheet?createPortal(<div className="account-menu account-menu--sheet" ref={sheetRef}>{panel}</div>,document.body):panel)}
  </div>;
}
