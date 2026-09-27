'use client';
import Link from 'next/link';
import TrebleClef from './TrebleClef';
import QuarterNote from './QuarterNote';
import RhythmNote from './rhythm/RhythmNote';
import EngravedRow from './EngravedRow';
import {useCourseProgress} from './useCourseProgress';
import {useLanguage} from '../i18n/LanguageContext';
import './theory.css';
import './theory-home.css';
export default function TheoryHome(){
  const {completed}=useCourseProgress();
  const {lang}=useLanguage(),zh=lang==='zh';
  return <main className="theory-shell theory-home">
    <header className="theory-home__header">
      <p>{zh?'初学者必修':'Beginner essentials'}</p>
      <h1>{zh?'乐理课':'Theory lessons'}</h1>
      <p>{zh?'学习识谱的互动教程。':'Interactive lessons for reading and playing beginner music.'}</p>
    </header>
    <section className="theory-course-grid" aria-label={zh?'初学者必修课程':'Beginner essentials'}>
    <Link className={`theory-course ${completed.staff?"is-complete":""}`} href="/flute-studio/theory/first-notes">
      <svg viewBox="0 0 760 310" aria-hidden="true">
        {[0,1,2,3,4].map(i=><line key={i} x1="55" x2="705" y1={104+i*24} y2={104+i*24} stroke="currentColor" strokeWidth="1"/>)}<TrebleClef/>
        {[2,3,5,4].map((p,i)=><g key={i} transform={`translate(${250+i*110} ${200-p*12})`}><QuarterNote down={p>=4}/></g>)}
      </svg>
      <div><div><h2>1. {zh?'五线谱与音符':'The staff and notes'}{completed.staff&&<span className="course-check" aria-label={zh?'已完成':'Completed'}>✓</span>}</h2><p>{zh?'阅读高音谱表，认识音名，并找到音符的位置。':'Read the treble staff, learn note names, and place notes.'}</p></div></div>
    </Link>
    <Link className={`theory-course ${completed.rhythm?"is-complete":""}`} href="/flute-studio/theory/rhythm">
      <svg viewBox="0 0 760 310" aria-hidden="true">
        {/* Just the five note shapes: this lesson is about length, not position on a staff. */}
        {([4,2,1,.5,.25] as const).map((value,i)=><g key={value} transform={`translate(${155+i*115} 200)`}><RhythmNote value={value}/></g>)}
      </svg>
      <div><div><h2>2. {zh?'音符时值':'Note lengths'}{completed.rhythm&&<span className="course-check" aria-label={zh?'已完成':'Completed'}>✓</span>}</h2><p>{zh?'认识音符形状、比较时值，并写出自己的旋律。':'Read note shapes, compare their lengths, and make a melody.'}</p></div></div>
    </Link>
    <Link className={`theory-course ${completed.measures?"is-complete":""}`} href="/flute-studio/theory/measures">
      <div className="theory-course__art" aria-hidden="true"><EngravedRow clef={false} meter={{top:4,bottom:4}} notes={[{v:1},{v:1},{v:2},{v:2},{v:1},{v:1}]} bars={[3]} viewBox="30 0 860 310"/></div>
      <div><div><h2>3. {zh?'小节与拍号':'Measures and time signatures'}{completed.measures&&<span className="course-check" aria-label={zh?'已完成':'Completed'}>✓</span>}</h2><p>{zh?'把拍子组成小节，数拍，并读懂简单的拍号。':'Group and count beats, then read simple time signatures.'}</p></div></div>
    </Link>
    </section>
  </main>;
}
