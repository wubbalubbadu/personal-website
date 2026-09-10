import * as THREE from 'three';
import {poseAt} from './poses';

type Point = [number, number];
export function createModel() {
  const root = new THREE.Group(); root.name = 'Embouchure cutaway';
  const material = (color: string, metalness=0) => new THREE.MeshStandardMaterial({color, roughness: metalness ? .27 : .58, metalness});
  const tissue = material('#d5aaa0'), tongueMat = material('#b96d79'), tooth = material('#fff9e8'), silver = material('#edf1f5', .48);
  const shape = (points: Point[]) => {
    const s = new THREE.Shape(); s.moveTo(...points[0]);
    const curve = new THREE.SplineCurve(points.map(p=>new THREE.Vector2(...p)));
    curve.getPoints(100).slice(1).forEach(p=>s.lineTo(p.x,p.y)); s.closePath(); return s;
  };
  function slab(name: string, points: Point[], mat: THREE.Material, depth=.28) {
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape(points),{depth,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.035,bevelThickness:.035,curveSegments:32}),mat);
    mesh.name=name; root.add(mesh); return mesh;
  }
  // Lips share the facial mesh. Their material transitions smoothly, so there
  // are no independently moving surfaces that can cross the face.
  const upper = slab('Palate, face and upper lip', [[-2.55,-1.65],[-2.62,-.5],[-2.48,.7],[-2.05,1.16],[-1.25,1.36],[-.45,1.25],[-.02,.84],[.07,.55],[.31,.4],[.55,.28],[.59,.18],[.43,.18],[.16,.27],[-.2,.45],[-.78,.79],[-1.5,.87],[-2.08,.64],[-2.3,-.4],[-2.3,-1.65],[-2.55,-1.65]],tissue,.36);
  const lower = slab('Floor of mouth, chin and lower lip',[[-2.03,-1.65],[-1.94,-.9],[-1.28,-.74],[-.55,-.57],[-.15,-.24],[.22,-.06],[.48,.01],[.61,-.015],[.57,-.12],[.4,-.18],[.17,-.2],[-.04,-.48],[-.28,-.8],[-.67,-1.08],[-1.57,-1.2],[-1.72,-1.65],[-2.03,-1.65]],tissue,.36);
  function facialMorph(mesh: THREE.Mesh<THREE.ExtrudeGeometry>, lowerPart: boolean) {
    const base=Float32Array.from(mesh.geometry.attributes.position.array), target=Float32Array.from(base), colors=[];
    const skin=new THREE.Color('#d5aaa0'), rose=new THREE.Color('#be8c89');
    for(let i=0;i<base.length;i+=3){
      const x=base[i],y=base[i+1],front=THREE.MathUtils.smoothstep(x,-.35,.55);
      if(lowerPart){const contact=THREE.MathUtils.smoothstep(x,-.1,.17)*(1-THREE.MathUtils.smoothstep(y,-.19,-.08));target[i]+=.23*front*(1-contact);target[i+1]+=(.16*(1-front)+.035*front)*(1-contact);}
      else {target[i]+=.06*front;target[i+1]-=.045*front; if(x < -2.1 && y < .3)target[i]+=.13;}
      const c=skin.clone().lerp(rose,front*.85);colors.push(c.r,c.g,c.b);
    }
    mesh.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    mesh.material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.6});
    mesh.geometry.morphAttributes.position=[new THREE.Float32BufferAttribute(target,3)];mesh.updateMorphTargets();mesh.morphTargetDictionary={HighRegister:0};
  }
  facialMorph(upper,false);facialMorph(lower,true);
  function enamel(name:string,x:number,y:number,group?:THREE.Group) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(.16,.28,.36),tooth);m.position.set(x,y,.23);m.rotation.z=-.08;m.name=name;root.add(m);if(group)group.attach(m);return m;
  }
  enamel('Upper incisors',-.39,.33); const lowerTeeth=enamel('Lower incisors',-.37,-.37);
  const tonguePoints:Point[]=[[-1.94,-1.1],[-1.98,-.48],[-1.77,-.23],[-1.37,-.15],[-.94,-.15],[-.57,-.2],[-.48,-.3],[-.69,-.43],[-1.2,-.56],[-1.72,-.7],[-1.94,-1.1]];
  const tongue = slab('Tongue',tonguePoints,tongueMat,.43);
  const base = Float32Array.from(tongue.geometry.attributes.position.array);
  const target = Float32Array.from(base);
  for(let i=0;i<target.length;i+=3){const w=Math.max(0,Math.min(1,(base[i]+2)/1.5));target[i]+=.10*w;target[i+1]+=.59*Math.sin(w*Math.PI*.75)*w;}
  tongue.geometry.morphAttributes.position=[new THREE.Float32BufferAttribute(target,3)];tongue.updateMorphTargets();tongue.morphTargetDictionary={Forward:0};
  // Tube section faces the viewer; the opening is an actual gap at the top.
  const flute = new THREE.Group();flute.name='Headjoint cross-section';root.add(flute);flute.position.set(.74,-.77,.05);
  const ring = new THREE.Shape();const start=2.16,end=Math.PI*2+.98;
  ring.absarc(0,0,.59,start,end,false);ring.absarc(0,0,.51,end,start,true);ring.closePath();
  const tube = new THREE.Mesh(new THREE.ExtrudeGeometry(ring,{depth:.46,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2,curveSegments:64}),silver);tube.name='Tube wall and embouchure opening';flute.add(tube);
  const plate=slab('Lip plate contact',[[-.13,-.46],[-.02,-.36],[.18,-.28],[.42,-.27],[.42,-.33],[.17,-.35],[-.03,-.43],[-.13,-.51],[-.13,-.46]],silver,.47);
  const blowingEdge=slab('Blowing edge',[[1.04,-.285],[1.1,-.24],[1.34,-.26],[1.34,-.33],[1.12,-.32],[1.04,-.35],[1.04,-.285]],silver,.47);
  const instrument=new THREE.Group();instrument.name='Headjoint';instrument.position.set(.42,-.27,0);root.add(instrument);instrument.attach(flute);instrument.attach(plate);instrument.attach(blowingEdge);
  const air = new THREE.Group();air.name='Airflow';root.add(air);
  const warm=new THREE.Color('#e6a15c'),cool=new THREE.Color('#4e9fe2');
  const flowMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{color:{value:warm.clone()},phase:{value:0},strength:{value:.48}},
    vertexShader:`varying vec2 flowUv;void main(){flowUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform vec3 color;uniform float phase;uniform float strength;varying vec2 flowUv;void main(){float edge=pow(sin(flowUv.y*3.14159265),.65);float band=.76+.24*sin(flowUv.x*38.-phase*6.2831853);gl_FragColor=vec4(color,edge*band*strength);
#include <colorspace_fragment>
}`});
  function ribbon(name:string){const geo=new THREE.BufferGeometry();const positions=new Float32Array(81*2*3),uv=new Float32Array(81*2*2),indices=[];for(let i=0;i<=80;i++){uv.set([i/80,0,i/80,1],i*4);if(i<80){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}}geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.setIndex(indices);const mesh=new THREE.Mesh(geo,flowMaterial);mesh.name=name;mesh.frustumCulled=false;air.add(mesh);return geo;}
  const mouthFlow=ribbon('Mouth air volume'),jetFlow=ribbon('Lip jet'),inFlow=ribbon('Flow into tube'),outFlow=ribbon('Flow over edge');
  function fill(geometry:THREE.BufferGeometry,curve:THREE.Curve<THREE.Vector3>,width:(u:number)=>number){const pos=geometry.attributes.position;for(let i=0;i<=80;i++){const u=i/80,p=curve.getPoint(u),tangent=curve.getTangent(u),normal=new THREE.Vector3(-tangent.y,tangent.x,0).normalize().multiplyScalar(width(u));pos.setXYZ(i*2,p.x+normal.x,p.y+normal.y,.58);pos.setXYZ(i*2+1,p.x-normal.x,p.y-normal.y,.58);}pos.needsUpdate=true;}
  let phase=0,previousTime:number|undefined;
  function update(note:number,time:number,showAir:boolean){
    const {t}=poseAt(note);tongue.morphTargetInfluences![0]=t;
    upper.morphTargetInfluences![0]=t;lower.morphTargetInfluences![0]=t;lowerTeeth.position.y=-.37+.16*t;
    // Integrate velocity, rather than multiplying absolute time by a changing speed.
    const dt=previousTime===undefined?0:Math.max(0,Math.min(.05,time-previousTime));previousTime=time;phase=(phase+dt*(.65+.75*t))%100;
    flowMaterial.uniforms.phase.value=phase;flowMaterial.uniforms.color.value.copy(warm).lerp(cool,t);air.visible=showAir;
    const outlet=new THREE.Vector3(.60+.23*t,.085-.005*t,.58);
    instrument.rotation.z=.5*t;instrument.updateMatrixWorld(true);
    const edge=instrument.localToWorld(new THREE.Vector3(1.065-.42,-.30+.27,.58));
    const inEnd=instrument.localToWorld(new THREE.Vector3(.76-.42,-1.11+.27,.58));
    const inControl=instrument.localToWorld(new THREE.Vector3(.90-.42,-.49+.27,.58));
    // A gently changing exit tangent gives the low pose its downward channel.
    const mouth=new THREE.CatmullRomCurve3([new THREE.Vector3(-2.14+.05*t,-1.35,.58),new THREE.Vector3(-2.14+.05*t,-.15,.58),new THREE.Vector3(-1.8,.24+.20*t,.58),new THREE.Vector3(-1.3,.30+.24*t,.58),new THREE.Vector3(-.75,.30+.25*t,.58),new THREE.Vector3(-.14,.23,.58),outlet]);
    fill(mouthFlow,mouth,u=>{const broad=.22-.10*t;return u<.48?THREE.MathUtils.lerp(.055,broad,THREE.MathUtils.smoothstep(u,.22,.48)):THREE.MathUtils.lerp(broad,.035-.01*t,THREE.MathUtils.smoothstep(u,.55,1));});
    const jet=new THREE.CubicBezierCurve3(outlet,outlet.clone().add(new THREE.Vector3(.12,-.15*(1-t)-.01,.0)),edge.clone().add(new THREE.Vector3(-.10,.06,0)),edge);
    fill(jetFlow,jet,()=>.028-.009*t);
    fill(inFlow,new THREE.QuadraticBezierCurve3(edge,inControl,inEnd),u=>(.047-.02*t)*(1-u*.6));
    fill(outFlow,new THREE.QuadraticBezierCurve3(edge,new THREE.Vector3(1.3,-.14,.58),new THREE.Vector3(1.76,-.1,.58)),u=>(.018+.021*t)*(1-u*.8));
    // Keep the plate beneath the jaw at every pose.

  }
  return {root,update};
}
