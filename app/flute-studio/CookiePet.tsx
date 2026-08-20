"use client";

import {PointerEvent,useEffect,useRef,useState} from "react";
import "./cookie-pet.css";

type Point={x:number;y:number};

export default function CookiePet(){
  const [point,setPoint]=useState<Point|null>(null);
  const [message,setMessage]=useState(false);
  const drag=useRef<{dx:number;dy:number;moved:boolean}|null>(null);
  const bubbleTimer=useRef<number|null>(null);

  useEffect(()=>{const saved=localStorage.getItem("cookie:pet-position");if(saved){try{const value=JSON.parse(saved) as Point;setPoint(value)}catch{}}return()=>{if(bubbleTimer.current)window.clearTimeout(bubbleTimer.current)}},[]);

  function down(event:PointerEvent<HTMLDivElement>){
    const rect=event.currentTarget.getBoundingClientRect();
    drag.current={dx:event.clientX-rect.left,dy:event.clientY-rect.top,moved:false};
    if(!point)setPoint({x:rect.left,y:rect.top});
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event:PointerEvent<HTMLDivElement>){
    if(!drag.current)return;
    drag.current.moved=true;
    const x=Math.max(10,Math.min(window.innerWidth-70,event.clientX-drag.current.dx));
    const y=Math.max(76,Math.min(window.innerHeight-76,event.clientY-drag.current.dy));
    setPoint({x,y});
  }
  function up(event:PointerEvent<HTMLDivElement>){
    if(!drag.current)return;
    const wasMoved=drag.current.moved;
    drag.current=null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if(point)localStorage.setItem("cookie:pet-position",JSON.stringify(point));
    if(!wasMoved){setMessage(true);if(bubbleTimer.current)window.clearTimeout(bubbleTimer.current);bubbleTimer.current=window.setTimeout(()=>setMessage(false),2600)}
  }

  return <div className="cookie-pet-wrap" style={point?{left:point.x,top:point.y,right:"auto",bottom:"auto"}:undefined}>
    {message&&<div className="cookie-pet-bubble">One focused session?</div>}
    <div className="cookie-pet" role="button" tabIndex={0} aria-label="Cookie practice companion. Drag to move or click for a message." onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{drag.current=null}}>
      <span className="chip c1"/><span className="chip c2"/><span className="chip c3"/><span className="chip c4"/><span className="chip c5"/>
      <i className="eye left"/><i className="eye right"/><b className="smile"/>
    </div>
  </div>;
}
