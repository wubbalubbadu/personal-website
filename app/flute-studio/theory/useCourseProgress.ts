'use client';
import {useEffect,useState} from 'react';
export const COURSE_PROGRESS_KEY='cookie-theory-completed-v1';
type Completion={staff:boolean;rhythm:boolean};
export function useCourseProgress(){
  const [completed,setCompleted]=useState<Completion>({staff:false,rhythm:false});
  useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(COURSE_PROGRESS_KEY)??'{}');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompleted({staff:saved.staff===true,rhythm:saved.rhythm===true});
  }catch{/* Completion is optional when storage is unavailable. */}},[]);
  function finish(lesson:keyof Completion){const next={...completed,[lesson]:true};setCompleted(next);try{localStorage.setItem(COURSE_PROGRESS_KEY,JSON.stringify(next))}catch{/* The current visit still shows completion. */}}
  return {completed,finish};
}
