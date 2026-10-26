'use client';
import {useEffect,useRef,useState} from 'react';
import {useLanguage} from '../i18n/LanguageContext';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createModel} from './model';
import {MIN_NOTE,MAX_NOTE,noteName,REGISTERS,registerOf,type Register} from './poses';
import StudioPage from '../components/StudioPage';
import Workbench from '../components/Workbench';
import {PracticeIcon} from '../components/PracticeIcon';
import './workbench.css';
import StaffNote from './StaffNote';
import Breathing from './Breathing';

// What each register asks of the player, one short line per part. The 3D model shows the same change.
const REGISTER_COPY:Record<Register,{name:[string,string];air:[string,string];lips:[string,string];vowel:[string,string]}>={
 low:{name:['Low','低音区'],air:['Slower, aimed down into the tube','气流慢一些，往下吹进笛管'],lips:['Lips relaxed, jaw dropped','嘴唇放松，下巴放低'],vowel:['ahh, ohh','“啊”、“哦”']},
 middle:{name:['Middle','中音区'],air:['Faster, aimed more across the hole','气流快一些，更多地越过吹孔'],lips:['Smaller opening, jaw a little forward','唇缝变小，下巴微微向前'],vowel:['eeh','“诶”']},
 high:{name:['High','高音区'],air:['Very fast, almost straight across','气流很快，几乎平着掠过吹孔'],lips:['Small opening, tongue and lower lip forward','唇缝很小，舌头和下唇往前'],vowel:['eee','“衣”']},
};

function Embouchure(){
 const {lang}=useLanguage(),zh=lang==='zh',l=zh?1:0;
 const host=useRef<HTMLDivElement>(null), target=useRef(81), animate=useRef(false), direction=useRef(1), reset=useRef(()=>{});
 const [note,setNote]=useState(81),[playing,setPlaying]=useState(false);
 useEffect(()=>{target.current=note;},[note]);
 useEffect(()=>{animate.current=playing;},[playing]);
 useEffect(()=>{
   const container=host.current!;let renderer:THREE.WebGLRenderer;
   try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{const message=document.createElement('p');message.setAttribute('role','alert');message.className='emb-error';message.textContent=(zh?"无法启动三维视图，请使用支持 WebGL 的浏览器。":"This browser could not start the 3D viewer. Try a browser with WebGL enabled.");container.appendChild(message);return()=>message.remove();}
   renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setClearColor('#f5f5f7');container.appendChild(renderer.domElement);
   renderer.domElement.setAttribute('aria-label',(zh?"嘴部、舌头、嘴唇与长笛笛头的交互式剖面图":"Interactive side cutaway of mouth, tongue, lips, and flute headjoint"));
   const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#ffffff','#8d7477',1.85));const light=new THREE.DirectionalLight('#fff8ec',2.35);light.position.set(-2,4,7);scene.add(light);
   const camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.set(-.5,.0,8.8);
   const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(-.55,-.1,0);controls.enablePan=false;controls.minDistance=5;controls.maxDistance=12;controls.minAzimuthAngle=-.4;controls.maxAzimuthAngle=.4;controls.minPolarAngle=1.2;controls.maxPolarAngle=1.9;controls.enableDamping=true;
   controls.enabled=false;
   renderer.domElement.style.touchAction='pan-y';
   container.tabIndex=0;
   // On a touch screen the page keeps vertical swipes (touch-action stays pan-y), so a swipe over the model scrolls the
   // page and a sideways drag turns it. With a mouse or pen, an active model takes every drag.
   const activate=(active:boolean,touch=false)=>{controls.enabled=active;renderer.domElement.style.touchAction=active&&!touch?'none':'pan-y';container.dataset.active=String(active);};
   let touching=false;
   const pointer=(event:PointerEvent)=>{touching=event.pointerType==='touch';activate(container.contains(event.target as Node),touching);};
   const focus=(event:FocusEvent)=>activate(container.contains(event.target as Node),touching);
   const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){activate(false);container.blur();}};
   document.addEventListener('pointerdown',pointer,true);
   document.addEventListener('focusin',focus);
   document.addEventListener('keydown',escape);
   reset.current=()=>{camera.position.set(-.5,0,8.8);controls.target.set(-.55,-.1,0);controls.update();};
   const model=createModel();scene.add(model.root);
   // The cutaway is wider than tall: in a narrow view (iPad beside the panel) widen the field of view so the lips and
   // headjoint stay in frame instead of being cropped at the sides.
   const resize=new ResizeObserver(()=>{const {width,height}=container.getBoundingClientRect();renderer.setSize(width,height);const aspect=width/Math.max(height,1);camera.aspect=aspect;camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(17))*Math.max(1,1.3/aspect)));camera.updateProjectionMatrix();});resize.observe(container);
   let frame=0,last=performance.now(),current=target.current,scaleTime=0;
   const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   function tick(now:number){const dt=Math.min((now-last)/1000,.05);last=now;if(animate.current){scaleTime+=dt;if(scaleTime>.183){scaleTime=0;setNote(n=>{if(n>=MAX_NOTE)direction.current=-1;if(n<=MIN_NOTE&&direction.current<0){animate.current=false;setPlaying(false);return MIN_NOTE;}return n+direction.current;});}}else scaleTime=0;
     current=reduced?target.current:THREE.MathUtils.damp(current,target.current,8,dt);model.update(current,reduced?0:now/1000,true);controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(tick);
   }frame=requestAnimationFrame(tick);
   return()=>{document.removeEventListener('pointerdown',pointer,true);document.removeEventListener('focusin',focus);document.removeEventListener('keydown',escape);cancelAnimationFrame(frame);resize.disconnect();controls.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});renderer.dispose();renderer.domElement.remove();};
 },[zh]);
 const choose=(n:number)=>{setPlaying(false);setNote(n);};
 const register=registerOf(note),copy=REGISTER_COPY[register];
 const toggle=()=>{if(playing){setPlaying(false);}else{direction.current=1;setNote(MIN_NOTE);setPlaying(true);}};
 return <Workbench
  viewport={<>
   <div ref={host} className="emb-canvas"/>
   <div className="emb-overlay emb-overlay--top">
    <span className="emb-hint">{zh?"拖动可以转动模型":"Drag to turn the model"}</span>
    <button type="button" className="text-action" onClick={()=>reset.current()}>{zh?"恢复视角":"Reset view"}</button>
   </div>
   {/* The air ribbon's colour is its speed (model.ts lerps warm to cool with the register). */}
   <div className="emb-overlay emb-overlay--bottom emb-air-key" aria-hidden="true"><span><i data-air="slow"/>{zh?"慢速气流":"Slow air"}</span><span><i data-air="fast"/>{zh?"快速气流":"Fast air"}</span></div>
  </>}
  panel={<>
   <section className="emb-block" aria-labelledby="emb-register-label">
    <span className="emb-label" id="emb-register-label">{zh?"音区":"Register"}</span>
    <div className="emb-registers">
     {REGISTERS.map(r=><button key={r.id} type="button" aria-pressed={register===r.id} onClick={()=>choose(r.home)}>
      {REGISTER_COPY[r.id].name[l]}<small>{noteName(r.from)}{zh?" 至 ":" to "}{noteName(r.to)}</small>
     </button>)}
    </div>
   </section>
   <section className="emb-block emb-note-block" aria-label={zh?"长笛音高选择":"Flute note selection"}>
    <div className="emb-note-row">
     <div className="emb-staff"><StaffNote midi={note}/></div>
     <strong className="emb-note">{noteName(note)}</strong>
     <button type="button" className="emb-action" onClick={toggle}><PracticeIcon name={playing?'pause':'play'}/>{playing?(zh?"暂停":"Pause"):(zh?"播放音阶":"Play scale")}</button>
    </div>
    <div className="emb-range">
     <span>{noteName(MIN_NOTE)}</span>
     <input type="range" min={MIN_NOTE} max={MAX_NOTE} value={note} aria-label={zh?"音高":"Note"} aria-valuetext={noteName(note)} onChange={e=>choose(Number(e.target.value))}/>
     <span>{noteName(MAX_NOTE)}</span>
    </div>
   </section>
   <section className="emb-block emb-block--side" aria-labelledby="emb-changes-label">
    <span className="emb-label" id="emb-changes-label">{zh?`${copy.name[1]}的变化`:`In the ${copy.name[0].toLowerCase()} register`}</span>
    <dl className="emb-parts">
     <div><dt>{zh?"气流":"Air"}</dt><dd>{copy.air[l]}</dd></div>
     <div><dt>{zh?"嘴唇和下巴":"Lips and jaw"}</dt><dd>{copy.lips[l]}</dd></div>
     <div><dt>{zh?"口腔形状":"Mouth shape"}</dt><dd>{copy.vowel[l]}</dd></div>
    </dl>
   </section>
  </>}
 />;
}

export default function EmbouchurePage(){
 const {lang}=useLanguage(),zh=lang==='zh';
 const [view,setView]=useState<'embouchure'|'breathing'>('embouchure');
 return <StudioPage title={(zh?"身体与口型":"Body & embouchure")} backHref="/flute-studio" width="wide">
  <div className="emb">
   <nav className="emb-views" aria-label={(zh?"身体模型":"Body models")}>
    <button type="button" aria-pressed={view==='embouchure'} onClick={()=>setView('embouchure')}>{(zh?"口型":"Embouchure")}</button>
    <button type="button" aria-pressed={view==='breathing'} onClick={()=>setView('breathing')}>{(zh?"呼吸":"Breathing")}</button>
   </nav>
   {view==='embouchure'?<Embouchure/>:<Breathing/>}
  </div>
 </StudioPage>;
}
