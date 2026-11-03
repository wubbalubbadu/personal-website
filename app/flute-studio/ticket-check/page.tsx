'use client';
import {useState} from 'react';
import {TempoPill} from '../components/TempoPill';
import {ReaderPopover} from '../components/ReaderPopover';
import '../practice/mock/mock-audition.css';
import '../components/offline.css';
import {ItemCard} from '../components/ItemCard';
export default function Check(){
 const [tempo,setTempo]=useState(60),[on,setOn]=useState(false);
 const pill=<TempoPill tempo={tempo} onChange={setTempo} sounding={on} onSound={()=>setOn(!on)} label="Check"/>;
 return <main style={{padding:40}}><h1>Local component check</h1><style>{`.ticket-before .mock-button{height:40px;padding:0 20px;border:0;border-radius:12px;background:#f1f1f2;color:#45464f;font:inherit;font-size:14px;font-weight:600;cursor:pointer}.ticket-before .offline-label{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 14px 0 11px;border:0;border-radius:10px;background:#f1f1f2;color:#45464f;font:600 13px/1 inherit;white-space:nowrap}`}</style><div className="ticket-before"><button className="mock-button">Start</button><button className="offline-label">Keep offline</button></div><div className="ticket-after"><button className="mock-button action-button">Start</button><button className="offline-label action-button action-button--inherit-type">Keep offline</button></div>{pill}<ReaderPopover label="Pill check" trigger="Pill check">{pill}</ReaderPopover><ul><ItemCard as="li"><a href="#" className="item-card__body"><b>Working item</b><small>Composer</small></a></ItemCard></ul></main>;
}
