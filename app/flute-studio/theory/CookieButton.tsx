'use client';
import type {ButtonHTMLAttributes} from 'react';
import './cookie-button.css';

/**
 * A big cookie to press: tap it on each note (clapping) or hold it for a note's length. The same
 * cookie as the Cookie pet (golden, chocolate chips, face), so the lessons' "do it" button is Cookie.
 */
export default function CookieButton({pressed=false,className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{pressed?:boolean}){
  return <button type="button" {...props} className={`cookie-button ${pressed?'is-pressed':''} ${className}`}>
    <span className="cookie-button__chip c1"/><span className="cookie-button__chip c2"/><span className="cookie-button__chip c3"/><span className="cookie-button__chip c4"/><span className="cookie-button__chip c5"/>
    <span className="cookie-button__eye left"/><span className="cookie-button__eye right"/><span className="cookie-button__smile"/>
  </button>;
}
