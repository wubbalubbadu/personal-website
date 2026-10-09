'use client';
import {useEffect,useState} from 'react';
export const COURSE_PROGRESS_KEY='cookie-theory-completed-v1';
type Completion={staff:boolean;rhythm:boolean;measures:boolean;accidentals:boolean;keys:boolean;rests:boolean};
export function useCourseProgress(){
  const [completed,setCompleted]=useState<Completion>({staff:false,rhythm:false,measures:false,accidentals:false,keys:false,rests:false});
  useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(COURSE_PROGRESS_KEY)??'{}');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompleted({staff:saved.staff===true,rhythm:saved.rhythm===true,measures:saved.measures===true,accidentals:saved.accidentals===true,keys:saved.keys===true,rests:saved.rests===true});
  }catch{/* Completion is optional when storage is unavailable. */}},[]);
  function finish(lesson:keyof Completion){const next={...completed,[lesson]:true};setCompleted(next);try{localStorage.setItem(COURSE_PROGRESS_KEY,JSON.stringify(next))}catch{/* The current visit still shows completion. */}}
  return {completed,finish};
}
