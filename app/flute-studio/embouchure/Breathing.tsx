'use client';
import {useEffect,useRef,useState} from 'react';
import {useLanguage} from '../i18n/LanguageContext';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import Workbench from '../components/Workbench';
import {PracticeIcon} from '../components/PracticeIcon';
import {breathPose,createBreathingModel} from './breathing-model';

export default function Breathing(){
 const {lang}=useLanguage(),zh=lang==='zh';
 const host=useRef<HTMLDivElement>(null),phaseRef=useRef(1),running=useRef(true),inhaling=useRef(false),cycleRef=useRef(0);
 const [phase,setPhase]=useState(1),[playing,setPlaying]=useState(true),[error,setError]=useState(false),[inhale,setInhale]=useState(false),[cyclePosition,setCyclePosition]=useState(0);
 useEffect(()=>{
  const container=host.current!;let renderer:THREE.WebGLRenderer;
  // WebGL availability is only known when the browser renderer is created.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  try{renderer=new THREE.WebGLRenderer({antialias:true});}catch{setError(true);return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setClearColor('#f5f5f7');container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label',(zh?"有控制地呼吸时的肋骨、肺、横膈膜与腹壁":"Ribs, lungs, diaphragm and abdominal wall during a controlled breath"));
  renderer.domElement.setAttribute('role','img');
  const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#ffffff','#8d7477',2.5));
  const light=new THREE.DirectionalLight('#fff8ec',3);light.position.set(-3,5,7);scene.add(light);
  const camera=new THREE.PerspectiveCamera(35,1,.1,50);camera.position.set(3.0,1.8,11.4);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.08,0);controls.enablePan=false;controls.enableDamping=true;controls.minDistance=7;controls.maxDistance=14;controls.minAzimuthAngle=-Math.PI/2;controls.maxAzimuthAngle=Math.PI/2;controls.minPolarAngle=1.05;controls.maxPolarAngle=1.75;controls.enabled=false;renderer.domElement.style.touchAction='pan-y';
  controls.listenToKeyEvents(container);
  // Touch keeps vertical swipes for the page (pan-y), so swiping over the model scrolls and a sideways drag turns it.
  let touching=false;
  const activate=(on:boolean)=>{controls.enabled=on;renderer.domElement.style.touchAction=on&&!touching?'none':'pan-y';container.dataset.active=String(on);};
  const pointer=(e:PointerEvent)=>{touching=e.pointerType==='touch';activate(container.contains(e.target as Node));};
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
 // Which moment of the breath: 0 inhale, 1 early exhale (still full), 2 late exhale. Every caption and part line has
 // one text per moment, all laid in the same spot (Stack), so the panel never changes height and the ring stays put.
 const moment=pose.inhale?0:phase>.5?1:2;
 const captions:[string,string,string]=zh?["肚子放松，让气息沉下去，下肋往两侧和后背打开。","感觉下肋和腹部在托住气息，身体保持灵活，别绷得太紧。","慢慢收腹，让气流一直送出去，动作保持柔和。"]:["Drop and release the belly. Let the breath feel low and the lower ribs open around the sides and back.","Feel support around the lower ribs and belly. Keep the core responsive, without bracing.","Gradually draw the belly inward to continue the airflow. Keep the effort supple."];
 const parts:[string,[string,string,string]][]=[
  [zh?"下肋":"Lower ribs",zh?["向四周打开","舒服地保持打开","慢慢收回"]:["Opening around the torso","Staying comfortably open","Returning gradually"]],
  [zh?"横膈膜":"Diaphragm",zh?["往下降","慢慢地、有控制地上升","慢慢地、有控制地上升"]:["Descending","Rising slowly, under control","Rising slowly, under control"]],
  [zh?"腹部":"Belly",zh?["放松，向外鼓起","托住气息，不往里收紧","慢慢往里收"]:["Releasing outward","Supporting, without pulling in","Drawing inward gradually"]],
 ];
 return <Workbench viewport={<>
  {/* OrbitControls handles Shift+arrow rotation on this focusable 3D application. */}
  {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
  <div ref={host} tabIndex={0} role="application" aria-label={zh?"三维呼吸模型。按住 Shift 并按方向键旋转，按 Escape 退出。":"3D breathing model. Hold Shift and press arrow keys to rotate; press Escape to exit."} className="emb-canvas breath-canvas"/>
  {error&&<p role="alert" className="emb-error">{(zh?"三维视图需要 WebGL，请尝试其他浏览器。":"The 3D viewer needs WebGL. Please try another browser.")}</p>}
  <div className="emb-overlay emb-overlay--top"><span className="emb-hint">{zh?"拖动可以转动模型":"Drag to turn the model"}</span></div>
  <div className="emb-overlay emb-overlay--bottom emb-air-key" aria-hidden="true"><span><i data-tone="release"/>{zh?"放松":"Releasing"}</span><span><i data-tone="engage"/>{zh?"发力":"Engaging"}</span></div>
 </>} panel={<>
  <section className="emb-block">
   <div className="emb-note-row breath-head">
    <h2 className="emb-note">{pose.inhale?(zh?"吸气":"Inhale"):(zh?"呼气":"Exhale")}</h2>
    <button type="button" className="emb-action" onClick={toggle}><PracticeIcon name={playing?'pause':'play'}/>{playing?(zh?"暂停":"Pause"):(zh?"播放":"Play")}</button>
   </div>
   <Stack className="emb-caption" texts={captions} active={moment}/>
  </section>
  <section className="emb-block" aria-labelledby="breath-parts-label">
   <span className="emb-label" id="breath-parts-label">{zh?"身体的变化":"What moves"}</span>
   <dl className="emb-parts">{parts.map(([name,what])=><div key={name}><dt>{name}</dt><dd><Stack texts={what} active={moment}/></dd></div>)}</dl>
  </section>
  <section className="emb-block emb-block--side breath-cycle-block" aria-labelledby="breath-cycle-label">
   <span className="emb-label" id="breath-cycle-label">{zh?"沿着圆圈拖动":"Drag around the circle"}</span>
   <div className="breath-cycle" role="slider" tabIndex={0} aria-label={(zh?"呼吸周期":"Breath cycle")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(cyclePosition*100)} aria-valuetext={zh?`${inhale?"吸气":"呼气"}，气息 ${Math.round(phase*100)}%`:`${inhale?"Inhale":"Exhale"}, ${Math.round(phase*100)} percent full`}
    onKeyDown={e=>{if(['ArrowRight','ArrowUp','ArrowLeft','ArrowDown','Home'].includes(e.key)){e.preventDefault();seek(e.key==='Home'?0:cyclePosition+(['ArrowRight','ArrowUp'].includes(e.key)?.025:-.025));}}}
    onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);const r=e.currentTarget.getBoundingClientRect();seek((Math.atan2(e.clientX-r.left-r.width/2,-(e.clientY-r.top-r.height/2))+2*Math.PI)/(2*Math.PI));}}
    onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId)){const r=e.currentTarget.getBoundingClientRect();seek((Math.atan2(e.clientX-r.left-r.width/2,-(e.clientY-r.top-r.height/2))+2*Math.PI)/(2*Math.PI));}}}>
    <svg viewBox="-24 0 268 160" aria-hidden="true">
     <path d="M110 20 A60 60 0 0 1 110 140" fill="none" stroke="#ca9295" strokeWidth="6" strokeLinecap="round"/>
     <path d="M110 140 A60 60 0 0 1 110 20" fill="none" stroke="#87b4c8" strokeWidth="6" strokeLinecap="round"/>
     <path d="M164 77 l6 6 6-6 M44 83 l6-6 6 6" fill="none" stroke="#85868e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
     <text x="38" y="84" textAnchor="end">{(zh?"吸气":"Inhale")}</text><text x="182" y="84" textAnchor="start">{(zh?"呼气":"Exhale")}</text>
     <circle cx={110+60*Math.sin(angle)} cy={80-60*Math.cos(angle)} r="8" fill="#6d4585" stroke="white" strokeWidth="2.5"/>
    </svg>
   </div>
  </section>
 </>}/>;
}

// Every text a line can show, laid in one grid cell; only the active one is visible, so the line is always as tall as
// its longest text and nothing below it moves when the text changes.
function Stack({texts,active,className}:{texts:readonly string[];active:number;className?:string}){
 return <span className={`emb-stack${className?` ${className}`:''}`}>{texts.map((text,i)=><span key={i} aria-hidden={i!==active} data-on={i===active||undefined}>{text}</span>)}</span>;
}
