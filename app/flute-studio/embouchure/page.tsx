'use client';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createModel} from './model';
import {MIN_NOTE,MAX_NOTE,noteName} from './poses';
import StudioPage from '../components/StudioPage';
import Workbench from '../components/Workbench';
import './workbench.css';
import StaffNote from './StaffNote';

export default function EmbouchurePage(){
 const host=useRef<HTMLDivElement>(null), target=useRef(76), air=useRef(true), animate=useRef(false), direction=useRef(1), reset=useRef(()=>{}), exportModel=useRef(()=>{});
 const [note,setNote]=useState(76),[showAir,setShowAir]=useState(true),[playing,setPlaying]=useState(false),[error,setError]=useState('');
 useEffect(()=>{target.current=note;},[note]);
 useEffect(()=>{air.current=showAir;},[showAir]);
 useEffect(()=>{animate.current=playing;},[playing]);
 useEffect(()=>{
   const container=host.current!;let renderer:THREE.WebGLRenderer;
   try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{const message=document.createElement('p');message.setAttribute('role','alert');message.textContent='This browser could not start the 3D viewer. Try a browser with WebGL enabled.';container.appendChild(message);return()=>message.remove();}
   renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setClearColor('#f1f5f6');container.appendChild(renderer.domElement);
   renderer.domElement.setAttribute('aria-label','Interactive side cutaway of mouth, tongue, lips, and flute headjoint');
   const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#ffffff','#8d7477',2.5));const light=new THREE.DirectionalLight('#fff8ec',3);light.position.set(-2,4,7);scene.add(light);
   const camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.set(-.5,.0,8.8);
   const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(-.55,-.1,0);controls.enablePan=false;controls.minDistance=5;controls.maxDistance=12;controls.minAzimuthAngle=-.4;controls.maxAzimuthAngle=.4;controls.minPolarAngle=1.2;controls.maxPolarAngle=1.9;controls.enableDamping=true;
   reset.current=()=>{camera.position.set(-.5,0,8.8);controls.target.set(-.55,-.1,0);controls.update();};
   const model=createModel();scene.add(model.root);
   exportModel.current=()=>{const exported=model.root.clone(true);exported.traverse(object=>{if(object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial){object.material=new THREE.MeshBasicMaterial({color:object.material.uniforms.color.value,transparent:true,opacity:.35,side:THREE.DoubleSide});}});new GLTFExporter().parse(exported,result=>{const blob=new Blob([result as ArrayBuffer],{type:'model/gltf-binary'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='cookie-embouchure.glb';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},()=>setError('The model could not be exported. Please try again.'),{binary:true,onlyVisible:true});};
   const resize=new ResizeObserver(()=>{const {width,height}=container.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();});resize.observe(container);
   let frame=0,last=performance.now(),current=76,scaleTime=0;
   const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   function tick(now:number){const dt=Math.min((now-last)/1000,.05);last=now;if(animate.current){scaleTime+=dt;if(scaleTime>.55){scaleTime=0;setNote(n=>{if(n>=MAX_NOTE)direction.current=-1;if(n<=MIN_NOTE&&direction.current<0){animate.current=false;setPlaying(false);return MIN_NOTE;}return n+direction.current;});}}else scaleTime=0;
     current=reduced?target.current:THREE.MathUtils.damp(current,target.current,8,dt);model.update(current,reduced?0:now/1000,air.current);controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(tick);
   }frame=requestAnimationFrame(tick);
   return()=>{cancelAnimationFrame(frame);resize.disconnect();controls.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});renderer.dispose();renderer.domElement.remove();};
 },[]);
 const choose=(n:number)=>{setPlaying(false);setNote(n);};
 return <StudioPage
  title="Simulation"
  eyebrow="Body & sound"
  intro="A side cutaway of the lips, jaw, tongue, and air stream, and how they shift as the pitch climbs. Drag to look around. Authored as a teaching aid, not a physiological model."
  backHref="/flute-studio"
  width="wide"
 >
  <div className="emb">
   <Workbench
    viewport={<>
     <div ref={host} className="emb-canvas"/>
     {error&&<p role="alert" className="emb-alert">{error}</p>}
     <div className="emb-viewport-top"><button type="button" onClick={()=>reset.current()}>Reset view</button></div>
    </>}
    panel={<>
     <strong className="emb-note">{noteName(note)}</strong>
     <StaffNote midi={note}/>
     <div className="emb-cue"><span>Vowel</span><h2>{note<76?'Ah / oh':note<88?'Eh → ee':'Ee'}</h2></div>
     <label className="emb-check"><input type="checkbox" checked={showAir} onChange={e=>setShowAir(e.target.checked)}/> Airflow</label>
     <button type="button" className="emb-play" onClick={()=>{if(playing){setPlaying(false);}else{direction.current=1;setNote(MIN_NOTE);setPlaying(true);}}}>{playing?'Pause':'Play scale'}</button>
     <button type="button" className="emb-secondary" onClick={()=>exportModel.current()}>Download model</button>
    </>}
    scrubber={<section className="emb-range" aria-label="Flute note selection">
     <div className="emb-range-heading"><label htmlFor="emb-note-range">Note</label><span>B3–D7</span></div>
     <input id="emb-note-range" type="range" min={MIN_NOTE} max={MAX_NOTE} value={note} aria-valuetext={noteName(note)} onChange={e=>choose(Number(e.target.value))}/>
     <div className="emb-notes">{Array.from({length:MAX_NOTE-MIN_NOTE+1},(_,i)=>i+MIN_NOTE).map(n=><button type="button" key={n} className={`${n===note?'selected ':''}${n===76||n===88?'pivot':''}`} aria-pressed={n===note} onClick={()=>choose(n)}>{noteName(n)}</button>)}</div>
    </section>}
   />
  </div>
 </StudioPage>;
}
