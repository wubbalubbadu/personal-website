'use client';
import {useSyncExternalStore} from 'react';

const query='(max-width: 760px)';
const subscribe=(notify:()=>void)=>{
  const media=window.matchMedia(query);
  media.addEventListener('change',notify);
  return()=>media.removeEventListener('change',notify);
};
/** Keep desktop engraving unchanged and use fewer horizontal units on phones. */
export function usePhoneNotation(){
  return useSyncExternalStore(subscribe,()=>window.matchMedia(query).matches,()=>false);
}
