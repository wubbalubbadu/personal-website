'use client';
import {useEffect,useState} from 'react';
import {readSaved,SAVE_KEY,type SavedLesson} from './model';
export function useLessonSave(startAtBeginning=false){
  const [data,setData]=useState<SavedLesson>(()=>readSaved(null));
  const [ready,setReady]=useState(false),[saving,setSaving]=useState(true);
  useEffect(()=>{
    // Read browser storage only after hydration; the server has no saved lesson.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try{setData({...readSaved(localStorage.getItem(SAVE_KEY)),...(startAtBeginning?{step:0}:{})})}catch{setSaving(false)}
    setReady(true);
  },[startAtBeginning]);
  useEffect(()=>{
    if(!ready)return;
    try{localStorage.setItem(SAVE_KEY,JSON.stringify(data))}catch{
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSaving(false);
    }
  },[data,ready]);
  return {data,setData,ready,saving};
}
