'use client';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import Workbench from '../components/Workbench';
import {breathPose,createBreathingModel} from './breathing-model';

export default function Breathing(){
 const host=useRef<HTMLDivElement>(null),phaseRef=useRef(0),running=useRef(false);
 const [phase,setPhase]=useState(0),[playing,setPlaying]=useState(false),[error,setError]=useState(false);
 useEffect(()=>{
  const container=host.current!;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true});}catch{setError(true);return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setClearColor('#f1f5f6');container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Ribs, lungs, diaphragm and abdominal wall during a controlled breath');
  renderer.domElement.setAttribute('role','img');
  const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#ffffff','#8d7477',2.5));
  const light=new THREE.DirectionalLight('#fff8ec',3);light.position.set(-3,5,7);scene.add(light);
  const camera=new THREE.PerspectiveCamera(35,1,.1,50);camera.position.set(3.0,2.0,9.2);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.08,0);controls.enablePan=false;controls.enableDamping=true;controls.minDistance=7;controls.maxDistance=14;controls.minAzimuthAngle=-.65;controls.maxAzimuthAngle=.65;controls.minPolarAngle=1.15;controls.maxPolarAngle=1.9;controls.enabled=false;renderer.domElement.style.touchAction='pan-y';
  const activate=(on:boolean)=>{controls.enabled=on;renderer.domElement.style.touchAction=on?'none':'pan-y';container.dataset.active=String(on);};
  const pointer=(e:PointerEvent)=>activate(container.contains(e.target as Node));
  const focus=(e:FocusEvent)=>activate(container.contains(e.target as Node));
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){activate(false);container.blur();}};
  document.addEventListener('pointerdown',pointer,true);document.addEventListener('focusin',focus);document.addEventListener('keydown',escape);
  const model=createBreathingModel();scene.add(model.root);
  const resize=new ResizeObserver(()=>{const {width,height}=container.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/Math.max(height,1);camera.updateProjectionMatrix();});resize.observe(container);
  let frame=0,last=performance.now(),elapsed=0,lastUI=0;
  const tick=(now:number)=>{const dt=Math.min((now-last)/1000,.05);last=now;
   if(running.current){elapsed+=dt;phaseRef.current=(phaseRef.current+dt/12)%1;if(now-lastUI>80){setPhase(phaseRef.current);lastUI=now;}}
   model.update(phaseRef.current,elapsed);controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(tick);
  };frame=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(frame);resize.disconnect();controls.dispose();document.removeEventListener('pointerdown',pointer,true);document.removeEventListener('focusin',focus);document.removeEventListener('keydown',escape);scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});renderer.dispose();renderer.domElement.remove();};
 },[]);
 const pose=breathPose(phase);
 const toggle=()=>{running.current=!running.current;setPlaying(running.current);};
 return <Workbench viewport={<>
  <div ref={host} tabIndex={0} className="emb-canvas breath-canvas"/>
  {error&&<p role="alert">The 3D viewer needs WebGL. Please try another browser.</p>}
 </>} panel={<>
  <h2 className="breath-title">{pose.inhale?'Breathe in':'Breathe out'}</h2>
  <p className="emb-cue">{pose.inhale?'Release the belly. Let the lower ribs widen.':phase<.65?'Keep the ribs comfortably open as the air leaves.':'Let the belly draw inward. Release into the next breath.'}</p>
  <dl className="breath-parts">
   <div><dt>Ribs</dt><dd>{pose.inhale?'Widening':'Returning gradually'}</dd></div>
   <div><dt>Diaphragm</dt><dd>{pose.inhale?'Engaging, moving down':'Easing, moving up'}</dd></div>
   <div><dt>Belly</dt><dd>{pose.inhale?'Releasing outward':phase>.93?'Releasing':'Engaging inward'}</dd></div>
  </dl>
  <div className="breath-legend"><span><i/>Releasing</span><span><i/>Engaging</span></div>
  <label className="breath-timeline">Breath cycle<input aria-label="Breath cycle" type="range" min="0" max="1000" value={Math.round(phase*1000)} onChange={e=>{const p=Number(e.target.value)/1000;phaseRef.current=p;setPhase(p);running.current=false;setPlaying(false);}}/></label>
  <div className="breath-timing"><span>In · 3s</span><span>Out · 9s</span></div>
  <button type="button" className="emb-play" onClick={toggle}>{playing?'Pause':'Play breath'}</button>
 </>}/>;
}
