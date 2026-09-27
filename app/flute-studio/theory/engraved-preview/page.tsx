'use client';
// Temporary: a look at EngravedRow against the reference, before lesson pages use it. Delete when done.
import {useState} from 'react';
import EngravedRow from '../EngravedRow';
const q={v:1 as const},h={v:2 as const},w={v:4 as const},e={v:.5 as const};
const JINGLE=[{v:1,p:0},{v:1,p:0},{v:2,p:0},{v:1,p:0},{v:1,p:0},{v:2,p:0},{v:1,p:0},{v:1,p:2},{v:1,p:-2},{v:1,p:-1},{v:4,p:0}] as const;
export default function Preview(){
  const [barred,setBarred]=useState(false);
  return <main style={{padding:'80px 40px',maxWidth:1000,margin:'0 auto',display:'grid',gap:28,background:'#fff'}}>
    <EngravedRow clef={false} meter={{top:4,bottom:4}} notes={[q,q,q,q]} bars={[]}/>
    <EngravedRow clef={false} meter={{top:3,bottom:4}} notes={[q,q,q]}/>
    <EngravedRow clef={false} meter={{top:6,bottom:8}} notes={[e,e,e,e,e,e]} beams={[[0,1,2],[3,4,5]]}/>
    <EngravedRow clef={false} meter={{top:3,bottom:2}} notes={[h,h,h]}/>
    <EngravedRow clef={false} meter={{top:4,bottom:4,symbol:'common'}} notes={[h,q,q,w]} bars={[3]}/>
    <button onClick={()=>setBarred(b=>!b)} style={{justifySelf:'start'}}>{barred?'Remove bar lines':'Add bar lines'}</button>
    <EngravedRow notes={[...JINGLE]} even={!barred} bars={barred?[3,6,10]:[]} meter={barred?{top:4,bottom:4}:null}/>
  </main>;
}
