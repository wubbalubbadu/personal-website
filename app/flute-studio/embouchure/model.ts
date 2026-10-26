import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {poseAt} from './poses';

type Point = [number, number];
export function createModel() {
  const root = new THREE.Group(); root.name = 'Embouchure cutaway';
  // Illustrated look: toon shading in three flat shades (a lit face, a mid tone, a shadow on the rims) plus an outline
  // around every part (outline() below), like an anatomy diagram rather than a rendered object.
  const tones = new THREE.DataTexture(new Uint8Array([185, 230, 255]), 3, 1, THREE.RedFormat);
  tones.minFilter = tones.magFilter = THREE.NearestFilter; tones.needsUpdate = true;
  const material = (color: string) => new THREE.MeshToonMaterial({color, gradientMap: tones, side: THREE.DoubleSide});
  // The Breathing tab's diagram palette (breathing-model.ts: warm skin, rose, dusty blue), one clear colour per part:
  // muted warm skin, rose lips (the front of the face, blended in facialMorph), a berry tongue with a moist sheen,
  // bright teeth, and a cool blue silver dark enough to show on the light background.
  const tissue = material('#e3c1b1'), tongueMat = material('#a3506b'), tooth = material('#fffcf4'), silver = material('#aeb8c5');
  const shape = (points: Point[]) => {
    const s = new THREE.Shape(); s.moveTo(...points[0]);
    const curve = new THREE.SplineCurve(points.map(p=>new THREE.Vector2(...p)));
    curve.getPoints(100).slice(1).forEach(p=>s.lineTo(p.x,p.y)); s.closePath(); return s;
  };
  // Softly rounded edges: a wider, deeper bevel in more steps. bevelOffset keeps the side walls exactly .035 outside the
  // outline, as before, so the lip still meets the lip plate where it was tuned. Thin metal parts keep the small bevel.
  function slab(name: string, points: Point[], mat: THREE.Material, depth=.28, round=true) {
    const bevel = round ? {bevelSegments:6,bevelSize:.06,bevelOffset:-.025,bevelThickness:.09} : {bevelSegments:3,bevelSize:.035,bevelThickness:.035};
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape(points),{depth,bevelEnabled:true,steps:1,curveSegments:48,...bevel}),mat);
    mesh.name=name; root.add(mesh); return mesh;
  }
  // Lips share the facial mesh. Their material transitions smoothly, so there
  // are no independently moving surfaces that can cross the face.
  const upper = slab('Palate, face and upper lip', [[-2.55,-1.65],[-2.62,-.5],[-2.48,.7],[-2.05,1.16],[-1.25,1.36],[-.45,1.25],[-.02,.84],[.07,.55],[.31,.4],[.55,.28],[.59,.18],[.43,.18],[.16,.27],[-.2,.45],[-.78,.79],[-1.5,.87],[-2.08,.64],[-2.3,-.4],[-2.3,-1.65],[-2.55,-1.65]],tissue,.36);
  const lower = slab('Floor of mouth, chin and lower lip',[[-2.03,-1.65],[-1.94,-.9],[-1.28,-.74],[-.55,-.57],[-.15,-.24],[.22,-.06],[.48,.01],[.61,-.015],[.57,-.12],[.4,-.18],[.17,-.2],[-.04,-.48],[-.28,-.8],[-.67,-1.08],[-1.57,-1.2],[-1.72,-1.65],[-2.03,-1.65]],tissue,.36);
  function facialMorph(mesh: THREE.Mesh<THREE.ExtrudeGeometry>, lowerPart: boolean) {
    const base=Float32Array.from(mesh.geometry.attributes.position.array), target=Float32Array.from(base), colors=[];
    const skin=new THREE.Color('#e3c1b1'), rose=new THREE.Color('#d0889a');
    for(let i=0;i<base.length;i+=3){
      const x=base[i],y=base[i+1],front=THREE.MathUtils.smoothstep(x,-.35,.55);
      if(lowerPart){const contact=THREE.MathUtils.smoothstep(x,-.1,.17)*(1-THREE.MathUtils.smoothstep(y,-.19,-.08));target[i]=Math.min(.833,x+(.08*(1-front)+.18*front)*(1-contact));target[i+1]+=(.30*(1-front)+.06*front)*(1-contact)-.025*contact;if(target[i]>.44)target[i+1]=Math.max(-.225,target[i+1]);}
      else {target[i]+=.06*front;target[i+1]-=.015*front; if(x < -2.1 && y < .3)target[i]+=.13;}
      const c=skin.clone().lerp(rose,front*.85);colors.push(c.r,c.g,c.b);
    }
    mesh.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    mesh.material=new THREE.MeshToonMaterial({vertexColors:true,gradientMap:tones,side:THREE.DoubleSide});
    mesh.geometry.morphAttributes.position=[new THREE.Float32BufferAttribute(target,3)];mesh.updateMorphTargets();mesh.morphTargetDictionary={HighRegister:0};
  }
  facialMorph(upper,false);facialMorph(lower,true);
  function enamel(name:string,x:number,y:number,group?:THREE.Group) {
    const m = new THREE.Mesh(new RoundedBoxGeometry(.16,.28,.36,4,.05),tooth);m.position.set(x,y,.23);m.rotation.z=-.08;m.name=name;root.add(m);if(group)group.attach(m);return m;
  }
  const upperTeeth=enamel('Upper incisors',-.39,.33); const lowerTeeth=enamel('Lower incisors',-.37,-.37);
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
  const plate=slab('Lip plate contact',[[.12,-.34],[.25,-.285],[.42,-.27],[.42,-.33],[.27,-.35],[.12,-.39],[.12,-.34]],silver,.47,false);
  const blowingEdge=slab('Blowing edge',[[1.04,-.285],[1.10,-.265],[1.16,-.29],[1.15,-.34],[1.09,-.36],[1.04,-.35],[1.04,-.285]],silver,.47,false);
  const instrument=new THREE.Group();instrument.name='Headjoint';instrument.position.set(.42,-.27,0);root.add(instrument);instrument.attach(flute);instrument.attach(plate);instrument.attach(blowingEdge);
  // Outlines: a copy of each part a hair larger (pushed out along smoothed normals), showing only its back faces, so
  // a thin darker rim appears around the part's silhouette. It is a child of the part and shares its morph weights, so
  // it follows the jaw, lips and tongue exactly.
  function outline(mesh:THREE.Mesh,color:string,width=.03){
    const shell=mesh.geometry.clone();['uv','normal','color'].forEach(a=>shell.deleteAttribute(a));
    const smooth=mergeVertices(shell,1e-4);smooth.computeVertexNormals();
    // Pushed back in depth so where the jaw's morph folds the surface the outline stays behind it, not across it.
    const ink=new THREE.MeshBasicMaterial({color,side:THREE.BackSide,polygonOffset:true,polygonOffsetFactor:4,polygonOffsetUnits:4});
    // Grows only sideways (in the drawing plane), never toward the viewer, so where the jaw's morph bends the surface the
    // outline cannot poke out in front of it; faces that point at the viewer barely move.
    ink.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`{vec2 side=normal.xy;float len=length(side);if(len>1e-4)transformed.xy+=side/len*${width.toFixed(3)}*min(1.,len*3.);}\n#include <project_vertex>`);};
    const hull=new THREE.Mesh(smooth,ink);hull.name=`${mesh.name} outline`;
    if(mesh.morphTargetInfluences){hull.morphTargetInfluences=mesh.morphTargetInfluences;hull.morphTargetDictionary=mesh.morphTargetDictionary;}
    mesh.add(hull);
  }
  outline(upper,'#9a6b5f');outline(lower,'#9a6b5f');outline(tongue,'#6c2a40');
  outline(upperTeeth,'#a89a85',.016);outline(lowerTeeth,'#a89a85',.016);
  outline(tube,'#5f6a78',.016);outline(plate,'#5f6a78',.012);outline(blowingEdge,'#5f6a78',.012);
  const air = new THREE.Group();air.name='Airflow';root.add(air);
  const warm=new THREE.Color('#e6a15c'),cool=new THREE.Color('#4e9fe2');
  const flowMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{color:{value:warm.clone()},phase:{value:0},strength:{value:.48}},
    vertexShader:`varying vec2 flowUv;void main(){flowUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform vec3 color;uniform float phase;uniform float strength;varying vec2 flowUv;void main(){float edge=pow(max(0.,sin(flowUv.y*3.14159265)),.65);float band=.52+.48*pow(.5+.5*sin(flowUv.x*38.-phase*6.2831853),2.);gl_FragColor=vec4(color,edge*band*strength);
#include <colorspace_fragment>
}`});
  function ribbon(name:string,mat=flowMaterial){const geo=new THREE.BufferGeometry();const positions=new Float32Array(81*2*3),uv=new Float32Array(81*2*2),indices=[];for(let i=0;i<=80;i++){uv.set([i/80,0,i/80,1],i*4);if(i<80){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}}geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.setIndex(indices);const mesh=new THREE.Mesh(geo,mat);mesh.name=name;mesh.frustumCulled=false;air.add(mesh);return geo;}
  // Inside the mouth the air fills the space instead of running as a thin stream: one flat shape covering the whole
  // cavity, from the throat to the gap between the lips, drawn behind the tissue (z .12) so the palate, tongue, teeth
  // and lips cut it to the mouth's real shape as they move. A slow drift (up the throat, then toward the lips) shows the
  // direction and speeds up with the register; the stream itself shows outside the lips (the jet). Its floor reaches .25
  // below the floor of the mouth at the back, hidden at rest, so Breathing Lab's open jaw stays filled.
  const mouthMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{color:flowMaterial.uniforms.color,phase:flowMaterial.uniforms.phase,strength:{value:.5}},
    vertexShader:`varying vec2 spot;void main(){spot=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform vec3 color;uniform float phase;uniform float strength;varying vec2 spot;void main(){float along=spot.x+max(0.,-spot.y)*.9;float drift=.8+.2*sin(along*7.-phase*6.2831853);gl_FragColor=vec4(color,drift*strength);
#include <colorspace_fragment>
}`});
  const roof:Point[]=[[.58,.2],[.16,.26],[-.2,.45],[-.78,.8],[-1.5,.88],[-2.1,.65],[-2.32,-.4],[-2.32,-1.6]];
  const floor:Point[]=[[-1.98,-1.6],[-1.95,-1.2],[-1.28,-1.03],[-.55,-.85],[-.15,-.27],[.2,-.06],[.58,0]];
  const cavityShape=new THREE.Shape();
  [...roof,...floor].forEach(([x,y],i)=>i?cavityShape.lineTo(x,y):cavityShape.moveTo(x,y));
  const mouthAir=new THREE.Mesh(new THREE.ShapeGeometry(cavityShape),mouthMaterial);mouthAir.name='Mouth air volume';mouthAir.position.z=.12;air.add(mouthAir);
  // The floor rides with the lower jaw (same lift as facialMorph gives the lower part, and the inhalation drop), so the
  // part tucked under the jaw never shows below the chin when the jaw rises for high notes.
  const airPositions=mouthAir.geometry.attributes.position as THREE.BufferAttribute,airBase=Float32Array.from(airPositions.array);
  const at=(i:number,[x,y]:Point)=>Math.abs(airBase[i*3]-x)<1e-4&&Math.abs(airBase[i*3+1]-y)<1e-4;
  const onFloor=Array.from({length:airPositions.count},(_,i)=>floor.some(p=>at(i,p)));
  // The two front corners follow the lip outlet each frame, narrowing to the jet's width, so the air runs from the mouth
  // through the lips straight into the jet with no gap.
  const frontTop=Array.from({length:airPositions.count},(_,i)=>at(i,roof[0])),frontBottom=Array.from({length:airPositions.count},(_,i)=>at(i,floor[floor.length-1]));
  const jetFlow=ribbon('Lip jet');
  // A continuous translucent air field rather than separate streams.
  const intakeMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{time:{value:0},strength:{value:0},color:{value:cool.clone()}},
    vertexShader:`varying vec2 airUv;void main(){airUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 airUv;uniform float time;uniform float strength;uniform vec3 color;
    void main(){
      vec2 p=vec2(airUv.x*2.4,(airUv.y-.5)*3.6);
      float radius=length(p),angle=atan(p.y,p.x),drift=radius+time*.65;
      float mist=.65+.18*sin(drift*5.+sin(angle*3.))+.12*sin(drift*9.-angle*2.);
      float edge=(1.-smoothstep(.4,2.15,radius))*smoothstep(0.,.15,airUv.x)*smoothstep(0.,.12,airUv.y)*smoothstep(0.,.12,1.-airUv.y);
      gl_FragColor=vec4(color,edge*mist*strength);
      #include <colorspace_fragment>
    }`});
  const intakeField=new THREE.Mesh(new THREE.PlaneGeometry(2.4,3.6),intakeMaterial);
  intakeField.name='Surrounding air gathering into mouth';air.add(intakeField);
  function fill(geometry:THREE.BufferGeometry,curve:THREE.Curve<THREE.Vector3>,width:(u:number)=>number){const pos=geometry.attributes.position;for(let i=0;i<=80;i++){const u=i/80,p=curve.getPoint(u),tangent=curve.getTangent(u),normal=new THREE.Vector3(-tangent.y,tangent.x,0).normalize().multiplyScalar(width(u));pos.setXYZ(i*2,p.x+normal.x,p.y+normal.y,.12);pos.setXYZ(i*2+1,p.x-normal.x,p.y-normal.y,.12);}pos.needsUpdate=true;}
  let phase=0,previousTime:number|undefined,speed=.4;
  function update(note:number,time:number,showAir:boolean,inhalation=0,inhaling=inhalation>.5){
    const {t}=poseAt(note);
    lower.position.y=-.24*inhalation; tongue.position.y=-.10*inhalation;
    upper.scale.x=1+.018*inhalation;
    // Give the opening lower lip clearance from the plate during inhalation.
    instrument.position.set(.42+.08*inhalation,-.27-.34*inhalation,0);
    tongue.morphTargetInfluences![0]=t;
    upper.morphTargetInfluences![0]=t;lower.morphTargetInfluences![0]=t;lowerTeeth.position.y=-.37+.30*t-.24*inhalation;lowerTeeth.position.x=-.37+.08*t;
    // Integrate velocity, rather than multiplying absolute time by a changing speed.
    const dt=previousTime===undefined?0:Math.max(0,Math.min(.05,time-previousTime));previousTime=time;
    speed=THREE.MathUtils.damp(speed,.4+1.8*t,4,dt);phase=(phase+dt*speed*(inhaling?-1:1))%100;
    flowMaterial.uniforms.phase.value=phase;flowMaterial.uniforms.color.value.copy(warm).lerp(cool,Math.max(t,inhalation));air.visible=showAir;
    const outlet=new THREE.Vector3(.60+.18*t,.085+.02*t-.10*inhalation,.58);
    instrument.updateMatrixWorld(true);
    // One flow envelope: downward into the bore, gradually becoming horizontal.
    const angle=-1.15+1.11*t;
    const direction=new THREE.Vector3(Math.cos(angle),Math.sin(angle),0);
    let length=.80+.50*t;
    // Stop at the inner wall instead of drawing airflow through solid metal.
    for(let d=.01;d<=length;d+=.01){
      const p=outlet.clone().addScaledVector(direction,d);
      const radius=Math.hypot(p.x-.74,p.y+.77);
      const angleAtTube=Math.atan2(p.y+.77,p.x-.74);
      const throughOpening=angleAtTube>.98 && angleAtTube<2.16;
      if(!throughOpening && p.y<-.255 && radius>.49 && radius<.64){length=Math.max(.02,d-.025);break;}
    }
    const end=outlet.clone().addScaledVector(direction,length);
    if(inhalation>0)end.lerp(new THREE.Vector3(1.8,.18,.58),inhalation);
    const jetWidth=.067-.043*t+.10*inhalation;
    const jet=new THREE.LineCurve3(outlet,end);
    fill(jetFlow,jet,u=>jetWidth*(1+.65*u)*Math.min(1,(1-u)*8)*(inhaling?0:1-inhalation));
    // Keep air behind the opaque cutaway surfaces so lips, teeth and tongue
    // occlude it instead of being painted blue by a foreground overlay.
    intakeField.position.set(outlet.x+1.2,outlet.y,.12);
    intakeMaterial.uniforms.time.value=time;
    intakeMaterial.uniforms.strength.value=.85*inhalation;
    for(let i=0;i<airPositions.count;i++){if(frontTop[i]||frontBottom[i]){airPositions.setXY(i,outlet.x,outlet.y+(frontTop[i]?1:-1)*jetWidth);continue;}if(!onFloor[i])continue;const x=airBase[i*3],front=THREE.MathUtils.smoothstep(x,-.35,.55);airPositions.setY(i,airBase[i*3+1]+(.30*(1-front)+.06*front)*t-.24*inhalation);}
    airPositions.needsUpdate=true;
    flowMaterial.uniforms.strength.value=.48+.16*inhalation;mouthMaterial.uniforms.strength.value=.5+.1*inhalation;


  }
  return {root,update};
}
