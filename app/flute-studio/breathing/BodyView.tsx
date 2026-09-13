'use client';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createModel} from '../embouchure/model';
import {createBreathingModel} from '../embouchure/breathing-model';
export default function BodyView({fullness,inhale,time,mode,running,hold}:{mode:string;fullness:number;inhale:boolean;time:number;running:boolean;hold:boolean}){
 const host=useRef<HTMLDivElement>(null),state=useRef({fullness,inhale,time,running,hold});
 const [failed,setFailed]=useState(false);
 useEffect(()=>{state.current={fullness,inhale,time,running,hold}},[fullness,inhale,time,running,hold]);
 useEffect(()=>{
  const element=host.current!;let renderer:THREE.WebGLRenderer;
  // WebGL availability is discovered only when mounting the canvas.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  try{renderer=new THREE.WebGLRenderer({antialias:true})}catch{setFailed(true);return}
  renderer.setClearColor('#f1f5f6');renderer.setPixelRatio(Math.min(devicePixelRatio,2));element.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#ffffff','#8d7477',2.5));const light=new THREE.DirectionalLight('#fff8ec',3);light.position.set(-3,5,7);scene.add(light);
  const camera=new THREE.PerspectiveCamera(35,1,.1,50);camera.position.set(mode==='embouchure'?-.5:2,mode==='embouchure'?0:1,mode==='embouchure'?8.8:10);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(mode==='embouchure'?-.55:0,mode==='embouchure'?-.1:.08,0);controls.enableZoom=false;controls.enablePan=false;controls.minAzimuthAngle=-Math.PI/2;controls.maxAzimuthAngle=Math.PI/2;controls.minPolarAngle=1.05;controls.maxPolarAngle=1.75;
  const body=mode==='body'?createBreathingModel():null,mouth=mode==='embouchure'?createModel():null;if(mouth){mouth.root.scale.setScalar(.7);mouth.root.position.set(-.165,-.03,0)}scene.add((body??mouth)!.root);
  const resize=new ResizeObserver(()=>{const {width,height}=element.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/Math.max(height,1);camera.updateProjectionMatrix()});resize.observe(element);
  let frame=0,opening=0,last=performance.now();const draw=()=>{const s=state.current,now=performance.now(),dt=Math.min((now-last)/1000,.05);last=now;opening=THREE.MathUtils.damp(opening,s.inhale||s.hold?1:0,6,dt);body?.update(s.fullness,s.time,s.inhale,camera);mouth?.update(59,s.time,s.running&&!s.hold,opening,s.inhale);controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(draw)};draw();
  return()=>{cancelAnimationFrame(frame);resize.disconnect();controls.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())}});renderer.dispose();renderer.domElement.remove()};
 },[mode]);
 return <div className="bl-body" ref={host} role="img" aria-label="Breathing model synchronized to the exercise">{failed&&<p>3D unavailable. Choose Flower & ball or Cycle.</p>}</div>;
}
