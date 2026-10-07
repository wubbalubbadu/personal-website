'use client';
import {useEffect,useRef,useState} from 'react';
import {useLanguage} from '../i18n/LanguageContext';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import Workbench from '../components/Workbench';
import {breathPose,createBreathingModel} from './breathing-model';

export default function Breathing(){
 const {lang}=useLanguage(),zh=lang==='zh';
 const host=useRef<HTMLDivElement>(null),phaseRef=useRef(1),running=useRef(true),inhaling=useRef(false),cycleRef=useRef(0);
 const [phase,setPhase]=useState(1),[playing,setPlaying]=useState(true),[error,setError]=useState(false),[inhale,setInhale]=useState(false),[cyclePosition,setCyclePosition]=useState(0);
 useEffect(()=>{
  const container=host.current!;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true});}catch{setError(true);return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setClearColor('#f1f5f6');container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label',(zh?"有控制地呼吸时的肋骨、肺、横膈膜与腹壁":"Ribs, lungs, diaphragm and abdominal wall during a controlled breath"));
  renderer.domElement.setAttribute('role','img');
  const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#ffffff','#8d7477',2.5));
  const light=new THREE.DirectionalLight('#fff8ec',3);light.position.set(-3,5,7);scene.add(light);
  const camera=new THREE.PerspectiveCamera(35,1,.1,50);camera.position.set(3.0,1.8,11.4);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.08,0);controls.enablePan=false;controls.enableDamping=true;controls.minDistance=7;controls.maxDistance=14;controls.minAzimuthAngle=-Math.PI/2;controls.maxAzimuthAngle=Math.PI/2;controls.minPolarAngle=1.05;controls.maxPolarAngle=1.75;controls.enabled=false;renderer.domElement.style.touchAction='pan-y';
  const activate=(on:boolean)=>{controls.enabled=on;renderer.domElement.style.touchAction=on?'none':'pan-y';container.dataset.active=String(on);};
  const pointer=(e:PointerEvent)=>activate(container.contains(e.target as Node));
  const focus=(e:FocusEvent)=>activate(container.contains(e.target as Node));
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){activate(false);container.blur();}};
  document.addEventListener('pointerdown',pointer,true);document.addEventListener('focusin',focus);document.addEventListener('keydown',escape);
  const model=createBreathingModel();scene.add(model.root);
  const resize=new ResizeObserver(()=>{const {width,height}=container.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/Math.max(height,1);camera.updateProjectionMatrix();});resize.observe(container);
  let frame=0,last=performance.now(),elapsed=0,lastUI=0;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced){running.current=false;setPlaying(false);}
  const tick=(now:number)=>{const dt=Math.min((now-last)/1000,.05);last=now;
   if(!reduced)elapsed+=dt;
   if(running.current){
    cycleRef.current=(cycleRef.current+dt/10)%1;
    const c=cycleRef.current,position=(1+Math.cos(c*Math.PI*2))/2,direction=c>=.5;
    phaseRef.current=position;inhaling.current=direction;
    if(now-lastUI>80){setPhase(position);setInhale(direction);setCyclePosition(c);lastUI=now;}
   }
   controls.update();model.update(phaseRef.current,elapsed,inhaling.current,camera);renderer.render(scene,camera);frame=requestAnimationFrame(tick);
  };frame=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(frame);resize.disconnect();controls.dispose();document.removeEventListener('pointerdown',pointer,true);document.removeEventListener('focusin',focus);document.removeEventListener('keydown',escape);scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});renderer.dispose();renderer.domElement.remove();};
 },[zh]);
 const pose=breathPose(phase,inhale);
 const toggle=()=>{running.current=!running.current;setPlaying(running.current);};
 const seek=(c:number)=>{c=((c%1)+1)%1;cycleRef.current=c;setCyclePosition(c);const p=(1+Math.cos(c*Math.PI*2))/2;phaseRef.current=p;setPhase(p);inhaling.current=c>=.5;setInhale(c>=.5);running.current=false;setPlaying(false);};
 const angle=cyclePosition*Math.PI*2;
 return <Workbench viewport={<>
  <div ref={host} tabIndex={0} className="emb-canvas breath-canvas"/>
  {error&&<p role="alert">{(zh?"三维视图需要 WebGL，请尝试其他浏览器。":"The 3D viewer needs WebGL. Please try another browser.")}</p>}
 </>} panel={<>
  <h2 className="breath-title">{pose.inhale?(zh?"吸气":"Inhale"):(zh?"呼气":"Exhale")}</h2>
  <p className="emb-cue">{pose.inhale?(zh?"放松腹部，感受气息下沉，让下肋向两侧和背部舒展。":"Drop and release the belly. Let the breath feel low and the lower ribs open around the sides and back."):phase>.5?(zh?"感受下肋和腹部的支持，保持核心灵活，不要僵硬地绷紧。":"Feel support around the lower ribs and belly. Keep the core responsive, without bracing."):(zh?"逐渐收腹以维持气流，保持动作柔韧。":"Gradually draw the belly inward to continue the airflow. Keep the effort supple.")}</p>
  <dl className="breath-parts">
   <div><dt>{(zh?"下肋":"Lower ribs")}</dt><dd>{pose.inhale?(zh?"向躯干四周舒展":"Opening around the torso"):phase>.5?(zh?"保持舒适的展开状态":"Staying comfortably open"):(zh?"逐渐回收":"Returning gradually")}</dd></div>
   <div><dt>{(zh?"横膈膜":"Diaphragm")}</dt><dd>{pose.inhale?(zh?"下降":"Descending"):(zh?"有控制地放松并逐渐上升":"Controlled release, gradual rise")}</dd></div>
   <div><dt>{(zh?"腹部":"Belly")}</dt><dd>{pose.inhale?(zh?"放松并向外展开":"Releasing outward"):phase>.5?(zh?"保持支持，不向内拉紧":"Supporting, without pulling in"):(zh?"逐渐内收":"Drawing inward gradually")}</dd></div>
  </dl>
  <div className="breath-legend"><span><i/>{(zh?"放松":"Releasing")}</span><span><i/>{(zh?"发力":"Engaging")}</span></div>
  <div className="breath-cycle" role="slider" tabIndex={0} aria-label={(zh?"呼吸周期":"Breath cycle")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(cyclePosition*100)} aria-valuetext={`${inhale?(zh?"吸气":"Inhale"):(zh?"呼气":"Exhale")}, ${Math.round(phase*100)}${zh?"% 充盈度":" percent full"}`}
   onKeyDown={e=>{if(['ArrowRight','ArrowUp','ArrowLeft','ArrowDown','Home'].includes(e.key)){e.preventDefault();seek(e.key==='Home'?0:cyclePosition+(['ArrowRight','ArrowUp'].includes(e.key)?.025:-.025));}}}
   onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);const r=e.currentTarget.getBoundingClientRect();seek((Math.atan2(e.clientX-r.left-r.width/2,-(e.clientY-r.top-r.height/2))+2*Math.PI)/(2*Math.PI));}}
   onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId)){const r=e.currentTarget.getBoundingClientRect();seek((Math.atan2(e.clientX-r.left-r.width/2,-(e.clientY-r.top-r.height/2))+2*Math.PI)/(2*Math.PI));}}}>
   <svg viewBox="0 0 220 160" aria-hidden="true">
    <path d="M110 20 A60 60 0 0 1 110 140" fill="none" stroke="#ca9295" strokeWidth="6"/>
    <path d="M110 140 A60 60 0 0 1 110 20" fill="none" stroke="#87b4c8" strokeWidth="6"/>
    <path d="M165 74 l5 9 5-9 M45 86 l5-9 5 9" fill="none" stroke="#607a70" strokeWidth="2"/>
    <text x="28" y="84" textAnchor="middle">{(zh?"吸气":"Inhale")}</text><text x="194" y="84" textAnchor="middle">{(zh?"呼气":"Exhale")}</text>
    <circle cx={110+60*Math.sin(angle)} cy={80-60*Math.cos(angle)} r="7" fill="#40553d" stroke="white" strokeWidth="2"/>
   </svg>
  </div>
  <button type="button" className="emb-play" onClick={toggle}>{playing?(zh?"暂停":"Pause"):(zh?"播放呼吸示范":"Play breath")}</button>
 </>}/>;
}
