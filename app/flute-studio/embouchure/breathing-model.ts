import * as THREE from 'three';

const smooth=(v:number)=>THREE.MathUtils.smoothstep(v,0,1);
/** Authored flute-phrase cues, not measured muscle activation. */
export function breathPose(fullness:number,inhale=true){
 const volume=smooth(THREE.MathUtils.clamp(fullness,0,1));
 const late=smooth((.5-volume)/.5);
 const belly=inhale?volume:volume>=.5?1-.12*smooth((1-volume)/.5):.88*smooth(volume/.5);
 return {inhale,volume,belly,ribs:inhale?volume:volume>=.5?1-.04*smooth((1-volume)/.5):.96*smooth(volume/.5),
  abdomen:inhale?0:.25+.75*late,
  diaphragm:inhale?.85:.45*volume};
}

export function createBreathingModel(){
 const root=new THREE.Group();root.name='Breathing anatomy';
 const blue=new THREE.Color('#3999bd'),red=new THREE.Color('#d74b57');
 const material=(color:string,opacity=1)=>new THREE.MeshStandardMaterial({color,roughness:.65,metalness:0,transparent:false,alphaHash:opacity<1,opacity,depthWrite:true,side:THREE.DoubleSide});
 const bone=material('#ede8db'),lungMat=material('#dba7a2',.46),diaphMat=material('#9f647e');
 // Only the two separated lung shells blend; opaque tissue writes depth normally.
 lungMat.alphaHash=false;lungMat.transparent=true;lungMat.depthWrite=false;lungMat.side=THREE.FrontSide;
 const ribPivots:{group:THREE.Group,side:number}[]=[];
 const sphere=(name:string,mat:THREE.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{
  const m=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),mat);m.name=name;m.position.set(x,y,z);m.scale.set(sx,sy,sz);root.add(m);return m;
 };
 // The torso supplies orientation; omit exposed vertebrae from this teaching view.
 const ribs=new THREE.Group();ribs.name='Rib cage';root.add(ribs);
 for(let i=0;i<10;i++){
  const width=.65+.50*Math.sin((i+1)/12*Math.PI),height=1.75-i*.24;
  for(const side of [-1,1]){
   const pivot=new THREE.Group();pivot.position.set(side*.10,height,-.57);ribs.add(pivot);ribPivots.push({group:pivot,side});
   const points=[];
   for(let j=0;j<=40;j++){
    const a=j/40*Math.PI;
    points.push(new THREE.Vector3(side*width*Math.sin(a),-.19*Math.sin(a)-.17*j/40,1.24*j/40));
   }
   const curve=new THREE.CatmullRomCurve3(points);
   const ribGeometry=new THREE.TubeGeometry(curve,48,1,8,false);
   const rp=ribGeometry.attributes.position;
   // Broad, thin bone bands instead of circular pipes.
   for(let k=0;k<rp.count;k++){
    const center=curve.getPointAt(Math.floor(k/9)/48);
    const dx=rp.getX(k)-center.x,dy=rp.getY(k)-center.y,dz=rp.getZ(k)-center.z;
    rp.setXYZ(k,center.x+dx*.023,center.y+dy*.062,center.z+dz*.023);
   }
   ribGeometry.computeVertexNormals();
   const rib=new THREE.Mesh(ribGeometry,bone);rib.name='Rigid rib';if(i>=7){const lowerBone=bone.clone();lowerBone.transparent=true;lowerBone.opacity=.45;lowerBone.depthWrite=false;lowerBone.side=THREE.FrontSide;rib.material=lowerBone;}pivot.add(rib);
  }
 }
 const sternum=sphere('Sternum',bone,0,.88,.70,.075,.82,.06);ribs.add(sternum);
 const lungs=new THREE.Group();lungs.name='Lungs';root.add(lungs);
 for(const side of [-1,1]){
  const shape=new THREE.Shape();shape.moveTo(.14,-.48);shape.bezierCurveTo(.45,-.36,.83,-.43,.98,-.55);shape.bezierCurveTo(1.12,.05,.90,1.45,.51,1.81);shape.bezierCurveTo(.28,1.98,.16,1.32,.16,.88);shape.bezierCurveTo(.30,.53,.05,.12,.14,-.48);
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.48,bevelEnabled:true,bevelThickness:.15,bevelSize:.09,bevelSegments:5,steps:1,curveSegments:32});geo.translate(0,0,-.23);
  const lung=new THREE.Mesh(geo,lungMat);lung.scale.x=side;lung.name=side<0?'Right lung':'Left lung';lungs.add(lung);
 }
 const airway=new THREE.Group();root.add(airway);
 const airwayMaterial=material('#c6b9ad');airwayMaterial.transparent=true;airwayMaterial.opacity=.28;airwayMaterial.depthWrite=false;airwayMaterial.side=THREE.FrontSide;
 const tube=(points:THREE.Vector3[],radius:number)=>{const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,radius,12,false),airwayMaterial);airway.add(m);};
 tube([new THREE.Vector3(0,2.45,0),new THREE.Vector3(0,1.4,0),new THREE.Vector3(0,.95,0)],.09);
 for(const side of [-1,1])tube([new THREE.Vector3(0,1.03,0),new THREE.Vector3(side*.2,.78,0),new THREE.Vector3(side*.45,.65,0)],.063);
 const airMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
  uniforms:{phase:{value:0}},
  vertexShader:'varying vec2 flowUv; void main(){flowUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'varying vec2 flowUv; uniform float phase; void main(){float bands=.5+.5*cos(flowUv.x*32.0-phase);float edge=sin(flowUv.x*3.14159);gl_FragColor=vec4(.30,.67,.83,(.20+.45*bands)*max(.15,edge));}'});
 const air=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0,2.78,0),new THREE.Vector3(0,1.8,0),new THREE.Vector3(0,.99,0)]),60,.062,12,false),airMaterial);air.name='Throat airflow';root.add(air);
 // Parametric surfaces retain an anatomically legible dome and abdominal wall.
 function surface(name:string,mat:THREE.Material,fn:(u:number,v:number)=>THREE.Vector3){
  const geo=new THREE.BufferGeometry(),pos=[],idx=[];const n=40;
  for(let i=0;i<=n;i++)for(let j=0;j<=n;j++)pos.push(...fn(i/n,j/n).toArray());
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){const k=i*(n+1)+j;idx.push(k,k+1,k+n+1,k+1,k+n+2,k+n+1);}
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,mat);mesh.name=name;root.add(mesh);
  return {mesh,rest:new Float32Array(pos)};
 }
 const diaphragm=surface('Diaphragm',diaphMat,(u,v)=>{const a=u*Math.PI*2,r=v;return new THREE.Vector3(1.00*r*Math.cos(a),-.79+.65*(1-r*r),.64*r*Math.sin(a));});
 // One continuous neck-to-hip surface. The front opening exposes the chest;
 // the solid back, shoulders and waist make orientation readable during rotation.
 const skin=material('#d5aaa0');
 skin.transparent=true;skin.opacity=.25;skin.depthWrite=false;skin.side=THREE.FrontSide;
 // Localized abdominal glow, independent of the rest of the body shell.
 const bellyGlow={color:{value:new THREE.Color()},strength:{value:0}};
 skin.onBeforeCompile=shader=>{
  shader.uniforms.bellyGlow=bellyGlow.color;shader.uniforms.bellyStrength=bellyGlow.strength;
  shader.vertexShader='varying vec3 tissuePosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n tissuePosition=position;');
  shader.fragmentShader='varying vec3 tissuePosition; uniform vec3 bellyGlow; uniform float bellyStrength;\n'+shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   float region=exp(-pow((tissuePosition.y+1.45)/.55,2.0)-pow(tissuePosition.x/.85,2.0))*smoothstep(0.0,.45,tissuePosition.z);
   totalEmissiveRadiance+=bellyGlow*bellyStrength*region;
   diffuseColor.a=mix(.22,.72,region);`);
 };

 const profile=[[-2.65,.86,.44],[-2.35,1.16,.55],[-1.85,1.20,.57],[-1.25,1.08,.54],[-.65,1.17,.65],[.2,1.37,.80],[1.15,1.43,.80],[1.85,1.48,.68],[2.15,1.24,.55],[2.38,.49,.39],[2.75,.36,.34],[2.9,.34,.32]];
 const contour=(y:number)=>{
  let i=0;while(i<profile.length-2&&profile[i+1][0]<y)i++;
  const a=profile[i],b=profile[i+1],before=profile[Math.max(0,i-1)],after=profile[Math.min(profile.length-1,i+2)];
  const h=b[0]-a[0],t=(y-a[0])/h;
  return [1,2].map(k=>{
   const m0=(b[k]-before[k])/(b[0]-before[0])*h,m1=(after[k]-a[k])/(after[0]-a[0])*h;
   return (2*t*t*t-3*t*t+1)*a[k]+(t*t*t-2*t*t+t)*m0+(-2*t*t*t+3*t*t)*b[k]+(t*t*t-t*t)*m1;
  });
 };
 const positions:number[]=[],indices:number[]=[],rows=100,cols=100;
 for(let i=0;i<=rows;i++){
  const y=2.9-i/rows*5.55,[w,d]=contour(y);
  // Curved opening narrows into the neck and blends into the upper abdomen.
  const opening=y>-.98&&y<2.18 ? 1.10*Math.pow(Math.sin(Math.PI*(y+.98)/3.16),.35):0;
  for(let j=0;j<=cols;j++){
   const angle=opening+j/cols*(Math.PI*2-2*opening);
   positions.push(w*Math.sin(angle),y,d*Math.cos(angle));
  }
 }
 for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const k=i*(cols+1)+j;indices.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2);}
 const torsoGeo=new THREE.BufferGeometry();torsoGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));torsoGeo.setIndex(indices);torsoGeo.computeVertexNormals();
 const torso=new THREE.Mesh(torsoGeo,skin);torso.name='Torso with chest cutaway';root.add(torso);
 const belly={mesh:torso,rest:new Float32Array(positions)};
 // A small inset navel makes the front abdomen identifiable at a glance.
 const navel=sphere('Navel',material('#ac8077'),0,-1.64,.573,.038,.05,.012);
 // Flat, camera-facing cues retain a visible shaft even when the motion
 // points toward the viewer. Their offset keeps them outside the anatomy.
 const arrows:THREE.Mesh[]=[];
 const arrowShape=new THREE.Shape();arrowShape.moveTo(-.026,0);arrowShape.lineTo(.026,0);arrowShape.lineTo(.026,.28);arrowShape.lineTo(.105,.28);arrowShape.lineTo(0,.43);arrowShape.lineTo(-.105,.28);arrowShape.lineTo(-.026,.28);arrowShape.closePath();
 for(let i=0;i<14;i++){
  const mat=new THREE.MeshBasicMaterial({color:'#557788',transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide});
  const arrow=new THREE.Mesh(new THREE.ShapeGeometry(arrowShape),mat);arrow.name='Movement cue';root.add(arrow);arrows.push(arrow);
 }
 let displayedBelly=0,lastTime:number|undefined;
 function update(fullness:number,time:number,inhale=true,camera?:THREE.Camera){
  const p=breathPose(fullness,inhale),v=p.volume;
  const dt=lastTime===undefined?0:Math.min(.1,Math.max(0,time-lastTime));lastTime=time;
  airMaterial.uniforms.phase.value+=(inhale?1:-1)*dt*3;
  displayedBelly=dt>0?THREE.MathUtils.damp(displayedBelly,p.belly,7,dt):p.belly;
  // Each bone moves about its posterior attachment without scaling or bending.
  ribPivots.forEach(({group,side})=>{group.rotation.set(-.07*p.ribs,0,side*.14*p.ribs);});
  sternum.position.y=.88+.065*p.ribs;sternum.position.z=.70+.018*p.ribs;
  lungs.scale.set(.73+.095*v,.85+.12*v,.68+.10*v);lungs.position.y=.10-.14*v;
  const dp=diaphragm.mesh.geometry.attributes.position;
  for(let i=0;i<dp.count;i++){const x=diaphragm.rest[i*3],y=diaphragm.rest[i*3+1],z=diaphragm.rest[i*3+2];const center=(y+.79)/.65;dp.setXYZ(i,x*(1+.065*v),y-.546*v*center,z*(1+.065*v));}
  dp.needsUpdate=true;diaphragm.mesh.geometry.computeVertexNormals();
  const bp=belly.mesh.geometry.attributes.position;
  for(let i=0;i<bp.count;i++){
   const x=belly.rest[i*3],y=belly.rest[i*3+1],z=belly.rest[i*3+2];
   const weight=Math.exp(-Math.pow((y+1.40)/.63,2))*Math.max(0,z/.65);
   // Gentle circumferential motion includes the back, tapering before the neck.
   const chest=Math.exp(-Math.pow((y-.20)/1.05,2));
   bp.setXYZ(i,x*(1+.035*p.ribs*chest),y,z*(1+.05*p.ribs*chest)+.24*displayedBelly*weight);
  }
  navel.position.z=.573+.22*displayedBelly;
  bp.needsUpdate=true;belly.mesh.geometry.computeVertexNormals();
  // Preserve the tissue's base color. Emissive shading adds an activity cue
  // without extra transparent shells or camera-dependent blending order.
  const activity=(mat:THREE.MeshStandardMaterial,amount:number)=>{
   mat.emissive.copy(blue).lerp(red,amount);mat.emissiveIntensity=.70;
  };
  bellyGlow.color.value.copy(blue).lerp(red,p.abdomen);bellyGlow.strength.value=1.15;activity(diaphMat,p.diaphragm);
  const dir=p.inhale?1:-1;
  // Diaphragm cues originate on its upper surface, not below it on the belly.
  const diaphragmY=-.79+(.65-.546*v)*(1-Math.pow(.36/(1+.065*v),2)-Math.pow(.30/(.64*(1+.065*v)),2));
  const rotation=camera?.quaternion??new THREE.Quaternion();
  const right=new THREE.Vector3(1,0,0).applyQuaternion(rotation),up=new THREE.Vector3(0,1,0).applyQuaternion(rotation),toward=new THREE.Vector3(0,0,1).applyQuaternion(rotation);
  // Anchors and outward vectors belong to the anatomy, not the camera.
  // Only the flat arrow face billboards; its heading is the projected motion.
  const anchors=[[-1.22,.70,.32],[1.22,.70,.32],[-.36,diaphragmY,.30],[.36,diaphragmY,.30],[-.50,-1.48,.51+.20*displayedBelly],[.50,-1.48,.51+.20*displayedBelly],[-.65,.25,-.68*(1+.05*p.ribs)],[.65,.25,-.68*(1+.05*p.ribs)],[-1.22,-.25,0],[1.22,-.25,0]];
  const outward=[[-.95,.12,.30],[.95,.12,.30],[0,-1,0],[0,-1,0],[-.30,0,.95],[.30,0,.95],[-.25,0,-1],[.25,0,-1],[-1,0,0],[1,0,0]];
  arrows.forEach((a,i)=>{
   const extra=i>=10;
   const lane=extra?2+(i%2):i;
   const ribCue=lane<2||lane>=6;
   const diaphragmCue=lane===2||lane===3;
   const holding=(ribCue||diaphragmCue)&&!inhale;
   // Early-exhale arrows indicate maintained width, not inward collapse.
   const cueDirection=ribCue||diaphragmCue?1:dir;
   const normal=new THREE.Vector3(...outward[lane] as [number,number,number]).normalize();
   const direction=normal.clone().multiplyScalar(cueDirection);
   a.visible=!extra||!inhale;
   a.position.set(...anchors[lane] as [number,number,number]);
   if(extra)a.position.x+=(i<12?-.17:.17);
   const offset=cueDirection>0?.10:.48;
   a.position.addScaledVector(normal,offset).addScaledVector(toward,.10);
   let dx=direction.dot(right),dy=direction.dot(up);
   // A near head-on cue uses a small outward fan instead of becoming a dot.
   if(Math.hypot(dx,dy)<.18){dx=(lane%2===0?-1:1)*cueDirection*.25;dy=0;}
   const angle=Math.atan2(-dx,dy);
   a.quaternion.copy(rotation).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),angle));
   // One anchored arrow per location: gently grow the shaft, never recycle
   // travelling arrowheads or stack multiple cues on the same path.
   const extension=holding?.8:.8+.10*Math.sin(time*1.8);
   const size=holding?.45:1;
   a.scale.set(.8*size,extension*size,.8*size);
   const amount=inhale?0:1;
   (a.material as THREE.MeshBasicMaterial).color.copy(blue).lerp(red,amount);
   a.userData.holding=holding;
   a.userData.direction=cueDirection;
   (a.material as THREE.MeshBasicMaterial).opacity=.85;
  });
  root.updateMatrixWorld(true);
 }
 update(0,0);return {root,update};
}
