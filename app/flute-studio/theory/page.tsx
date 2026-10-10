'use client';
import Link from 'next/link';
import RhythmNote from './rhythm/RhythmNote';
import EngravedRow from './EngravedRow';
import {useCourseProgress} from './useCourseProgress';
import {useLanguage} from '../i18n/LanguageContext';
import './theory.css';
import './theory-home.css';
/**
 * Every card's picture is three notes in one frame (the row ends at RIGHT, the frame is centred on the staff), so all four draw
 * notation at the same, fairly large size.
 */
const RIGHT=480,ART=`20 -3 ${RIGHT+10} 310`;
export default function TheoryHome(){
  const {completed}=useCourseProgress();
  const {lang}=useLanguage(),zh=lang==='zh';
  return <main className="theory-shell theory-home">
    <header className="theory-home__header">
      <h1>{zh?'乐理课':'Theory lessons'}</h1>
    </header>
    <section className="theory-course-grid" aria-label={zh?'初学者必修课程':'Beginner essentials'}>
    <Link className={`theory-course ${completed.staff?"is-complete":""}`} href="/flute-studio/theory/first-notes">
      {completed.staff&&<span className="course-check"><span aria-hidden="true">✓</span> {zh?'已完成':'Completed'}</span>}
      <div className="theory-course__art" aria-hidden="true"><EngravedRow clef notes={[{v:1,p:2},{v:1,p:4},{v:1,p:5}]} finalBar={false} right={RIGHT} viewBox={ART}/></div>
      <div><div><h2>1. {zh?'五线谱与音符':'The staff and notes'}</h2><p>{zh?'阅读高音谱表，认识音名，并找到音符的位置。':'Read the treble staff, learn note names, and place notes.'}</p></div></div>
    </Link>
    <Link className={`theory-course ${completed.rhythm?"is-complete":""}`} href="/flute-studio/theory/rhythm">
      {completed.rhythm&&<span className="course-check"><span aria-hidden="true">✓</span> {zh?'已完成':'Completed'}</span>}
      <div className="theory-course__art" aria-hidden="true"><svg className="engraved-row" viewBox={ART}>
        {/* Just the five note shapes: this lesson is about length, not position on a staff. Same frame and scale as the other cards. */}
        {([4,2,1,.5] as const).map((value,i)=><g key={value} transform={`translate(${110+i*100} 176)`}><RhythmNote value={value}/></g>)}
      </svg></div>
      <div><div><h2>2. {zh?'音符时值':'Note lengths'}</h2><p>{zh?'认识音符形状、比较时值，并写出自己的旋律。':'Read note shapes, compare their lengths, and make a melody.'}</p></div></div>
    </Link>
    <Link className={`theory-course ${completed.measures?"is-complete":""}`} href="/flute-studio/theory/measures">
      {completed.measures&&<span className="course-check"><span aria-hidden="true">✓</span> {zh?'已完成':'Completed'}</span>}
      <div className="theory-course__art" aria-hidden="true"><EngravedRow clef={false} meter={{top:2,bottom:4}} notes={[{v:1},{v:1},{v:2}]} bars={[2]} right={RIGHT} viewBox={ART}/></div>
      <div><div><h2>3. {zh?'小节与拍号':'Measures and time signatures'}</h2><p>{zh?'把拍子组成小节，数拍，并读懂简单的拍号。':'Group and count beats, then read simple time signatures.'}</p></div></div>
    </Link>
    <Link className={`theory-course ${completed.accidentals?"is-complete":""}`} href="/flute-studio/theory/accidentals">
      {completed.accidentals&&<span className="course-check"><span aria-hidden="true">✓</span> {zh?'已完成':'Completed'}</span>}
      <div className="theory-course__art" aria-hidden="true"><EngravedRow clef notes={[{v:1,p:1,acc:'sharp'},{v:1,p:4,acc:'flat'},{v:1,p:1,acc:'natural'}]} finalBar={false} right={RIGHT} viewBox={ART}/></div>
      <div><div><h2>4. {zh?'升号、降号与还原号':'Sharps, flats and naturals'}</h2><p>{zh?'升号、降号，以及一个记号管多久。':'Sharps, flats and how long a sign lasts.'}</p></div></div>
    </Link>
    <Link className={`theory-course ${completed.keys?"is-complete":""}`} href="/flute-studio/theory/key-signatures">
      {completed.keys&&<span className="course-check"><span aria-hidden="true">✓</span> {zh?'已完成':'Completed'}</span>}
      <div className="theory-course__art" aria-hidden="true"><EngravedRow clef keySignature={2} notes={[{v:1,p:1},{v:1,p:5},{v:1,p:8}]} finalBar={false} right={RIGHT} viewBox={ART}/></div>
      <div><div><h2>5. {zh?'调号':'Key signatures'}</h2><p>{zh?'在开头只写一次：哪些音要变，什么时候改回来。':'Say it once at the start: which notes change, and how to change one back.'}</p></div></div>
    </Link>
    <Link className={`theory-course ${completed.rests?"is-complete":""}`} href="/flute-studio/theory/rests">
      {completed.rests&&<span className="course-check"><span aria-hidden="true">✓</span> {zh?'已完成':'Completed'}</span>}
      <div className="theory-course__art" aria-hidden="true"><EngravedRow clef={false} notes={[{v:1},{v:1,rest:true},{v:2}]} meter={{top:4,bottom:4}} right={RIGHT} viewBox={ART}/></div>
      <div><div><h2>6. {zh?'休止符':'Rests'}</h2><p>{zh?'认识休止符的时值，在安静时继续数拍。':'Read rest lengths and keep counting through silence.'}</p></div></div>
    </Link>
    <Link className={`theory-course ${completed.dots?"is-complete":""}`} href="/flute-studio/theory/dots-and-ties">
      {completed.dots&&<span className="course-check"><span aria-hidden="true">✓</span> {zh?'已完成':'Completed'}</span>}
      <div className="theory-course__art" aria-hidden="true"><EngravedRow clef={false} notes={[{v:1.5},{v:.5},{v:1},{v:1}]} ties={[2]} right={RIGHT} viewBox={ART}/></div>
      <div><div><h2>7. {zh?'附点与延音线':'Dots and ties'}</h2><p>{zh?'写出三拍和一拍半，让声音跨过小节线，再点出这些节奏。':'Write three beats and one and a half, carry a sound over a bar line, then tap the rhythms.'}</p></div></div>
    </Link>
    </section>
  </main>;
}
