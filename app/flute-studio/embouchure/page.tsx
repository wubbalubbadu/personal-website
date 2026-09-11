'use client';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createModel} from './model';
import {MIN_NOTE,MAX_NOTE,noteName} from './poses';
import StudioPage from '../components/StudioPage';
import Workbench from '../components/Workbench';
import './workbench.css';
import StaffNote from './StaffNote';

// Short, register-specific embouchure cues. Thresholds match poses.ts (E5=76, E6=88).
function guidance(note: number) {
  if (note < 76) return 'Air aims down into the tube, jaw drops — ahh, ohh';
  if (note < 88) return 'Air blows a little more forward — eeh';
  return 'Tongue and lower lip move forward, air very fast across — eee';
}

export default function EmbouchurePage(){
 const host=useRef<HTMLDivElement>(null), target=useRef(76), animate=useRef(false), direction=useRef(1), reset=useRef(()=>{});
 const [note,setNote]=useState(76),[playing,setPlaying]=useState(false);
 useEffect(()=>{target.current=note;},[note]);
 useEffect(()=>{animate.current=playing;},[playing]);
 useEffect(()=>{
   const container=host.current!;let renderer:THREE.WebGLRenderer;
   try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{const message=document.createElement('p');message.setAttribute('role','alert');message.textContent='This browser could not start the 3D viewer. Try a browser with WebGL enabled.';container.appendChild(message);return()=>message.remove();}
   renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setClearColor('#f1f5f6');container.appendChild(renderer.domElement);
   renderer.domElement.setAttribute('aria-label','Interactive side cutaway of mouth, tongue, lips, and flute headjoint');
   const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#ffffff','#8d7477',2.5));const light=new THREE.DirectionalLight('#fff8ec',3);light.position.set(-2,4,7);scene.add(light);
   const camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.set(-.5,.0,8.8);
   const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(-.55,-.1,0);controls.enablePan=false;controls.minDistance=5;controls.maxDistance=12;controls.minAzimuthAngle=-.4;controls.maxAzimuthAngle=.4;controls.minPolarAngle=1.2;controls.maxPolarAngle=1.9;controls.enableDamping=true;
   controls.enabled=false;
   renderer.domElement.style.touchAction='pan-y';
   container.tabIndex=0;
   const activate=(active:boolean)=>{controls.enabled=active;renderer.domElement.style.touchAction=active?'none':'pan-y';container.dataset.active=String(active);};
   const pointer=(event:PointerEvent)=>{activate(container.contains(event.target as Node));};
   const focus=(event:FocusEvent)=>activate(container.contains(event.target as Node));
   const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){activate(false);container.blur();}};
   document.addEventListener('pointerdown',pointer,true);
   document.addEventListener('focusin',focus);
   document.addEventListener('keydown',escape);
   reset.current=()=>{camera.position.set(-.5,0,8.8);controls.target.set(-.55,-.1,0);controls.update();};
   const model=createModel();scene.add(model.root);
   const resize=new ResizeObserver(()=>{const {width,height}=container.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();});resize.observe(container);
   let frame=0,last=performance.now(),current=76,scaleTime=0;
   const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   function tick(now:number){const dt=Math.min((now-last)/1000,.05);last=now;if(animate.current){scaleTime+=dt;if(scaleTime>.183){scaleTime=0;setNote(n=>{if(n>=MAX_NOTE)direction.current=-1;if(n<=MIN_NOTE&&direction.current<0){animate.current=false;setPlaying(false);return MIN_NOTE;}return n+direction.current;});}}else scaleTime=0;
     current=reduced?target.current:THREE.MathUtils.damp(current,target.current,8,dt);model.update(current,reduced?0:now/1000,true);controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(tick);
   }frame=requestAnimationFrame(tick);
   return()=>{document.removeEventListener('pointerdown',pointer,true);document.removeEventListener('focusin',focus);document.removeEventListener('keydown',escape);cancelAnimationFrame(frame);resize.disconnect();controls.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});renderer.dispose();renderer.domElement.remove();};
 },[]);
 const choose=(n:number)=>{setPlaying(false);setNote(n);};
 const pointerPct=(note-MIN_NOTE)/(MAX_NOTE-MIN_NOTE)*100;
 return <StudioPage
  title="Inside the embouchure"
  backHref="/flute-studio"
  width="wide"
 >
  <div className="emb">
   <Workbench
    viewport={<>
     <div ref={host} className="emb-canvas"/>
     <div className="emb-viewport-top"><button type="button" onClick={()=>reset.current()}>Reset view</button></div>
    </>}
    panel={<>
     <strong className="emb-note">{noteName(note)}</strong>
     <div className="emb-staff"><StaffNote midi={note}/></div>
     <section className="emb-range" aria-label="Flute note selection">
      <div className="emb-range-track">
       <input id="emb-note-range" type="range" min={MIN_NOTE} max={MAX_NOTE} value={note} aria-valuetext={noteName(note)} onChange={e=>choose(Number(e.target.value))}/>
       <span className="emb-range-pointer" style={{left:`${pointerPct}%`}} aria-hidden="true">{noteName(note)}</span>
      </div>
      <div className="emb-range-ends"><span>B3</span><span>D7</span></div>
     </section>
     <p className="emb-cue">{guidance(note)}</p>
     <button type="button" className="emb-play" onClick={()=>{if(playing){setPlaying(false);}else{direction.current=1;setNote(MIN_NOTE);setPlaying(true);}}}><span aria-hidden="true">{playing?'❚❚':'▶'}</span>{playing?'Pause':'Play scale'}</button>
    </>}
   />
  </div>
 </StudioPage>;
}
