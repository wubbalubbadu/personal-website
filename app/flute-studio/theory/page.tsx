'use client';
import Link from 'next/link';
import TrebleClef from './TrebleClef';
import QuarterNote from './QuarterNote';
import RhythmNote from './rhythm/RhythmNote';
import {useCourseProgress} from './useCourseProgress';
import {useLanguage} from '../i18n/LanguageContext';
import './theory.css';
import './lesson-frame.css';
export default function TheoryHome(){
  const {completed}=useCourseProgress();
  const {lang}=useLanguage(),zh=lang==='zh';
  return <main className="theory-shell theory-home">
    <h1>{zh?'乐理课':'Theory lessons'}</h1>
    <p>{zh?'学习识谱的互动教程。':'Interactive tutorial for reading music.'}</p>
    <Link className={`theory-course ${completed.staff?"is-complete":""}`} href="/flute-studio/theory/first-notes">
      <svg viewBox="0 0 760 310" aria-hidden="true">
        {[0,1,2,3,4].map(i=><line key={i} x1="55" x2="705" y1={104+i*24} y2={104+i*24} stroke="currentColor" strokeWidth="1"/>)}<TrebleClef/>
        {[2,3,5,4].map((p,i)=><g key={i} transform={`translate(${250+i*110} ${200-p*12})`}><QuarterNote down={p>=4}/></g>)}
      </svg>
      <div><div><h2>{zh?'五线谱与音符':'The staff and notes'}{completed.staff&&<span className="course-check" aria-label={zh?'已完成':'Completed'}> ✓</span>}</h2><p>{zh?'高音谱号、音名与音符的位置。':'Treble clef, note names, and staff positions.'}</p></div><span>{zh?'打开课程':'Open lesson'} <span aria-hidden="true">›</span></span></div>
    </Link>
    <Link className={`theory-course ${completed.rhythm?"is-complete":""}`} href="/flute-studio/theory/rhythm">
      <svg viewBox="0 0 760 310" aria-hidden="true">
        {[0,1,2,3,4].map(i=><line key={i} x1="55" x2="705" y1={104+i*24} y2={104+i*24} stroke="currentColor" strokeWidth="1"/>)}
        {([4,2,1,.5,.25] as const).map((value,i)=><g key={value} transform={`translate(${155+i*115} 176)`}><RhythmNote value={value}/></g>)}
      </svg>
      <div><div><h2>{zh?'节奏：音符的时值':'Rhythm: note lengths'}{completed.rhythm&&<span className="course-check" aria-label={zh?'已完成':'Completed'}> ✓</span>}</h2><p>{zh?'认识音符形状、比较时值、写出旋律。':'Read note shapes, compare lengths, and make a melody.'}</p></div><span>{zh?'打开课程':'Open lesson'} <span aria-hidden="true">›</span></span></div>
    </Link>
  </main>;
}
