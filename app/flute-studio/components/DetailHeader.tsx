import Link from "next/link";
import type {ReactNode} from "react";
import BackChevron from "./BackChevron";
import "./detail-header.css";

/**
 * The header of a page you reach from another page (a book, Cookie's scale routine, a mock audition), Nov 14.
 * The back link is a small line of its own above the title, so it never takes a column and the title, meta and
 * everything below start on the same left edge as the tab pages. A status (the list pill) sits on the title's line,
 * right after it. `meta` is one grey line under the title (composer, count, date).
 */
export default function DetailHeader({backHref,backLabel,title,status,meta,children}:{backHref:string;backLabel:string;title:ReactNode;status?:ReactNode;meta?:ReactNode;children?:ReactNode}){
  return <header className="detail-header">
    <Link className="detail-header__back" href={backHref}><BackChevron/><span>{backLabel}</span></Link>
    <div className="detail-header__title"><h1>{title}</h1>{status}</div>
    {meta&&<p className="detail-header__meta">{meta}</p>}
    {children}
  </header>;
}
