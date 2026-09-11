import * as THREE from 'three';

const smooth=(v:number)=>THREE.MathUtils.smoothstep(v,0,1);
/** Authored flute-phrase cues, not measured muscle activation. */
export function breathPose(phase:number){
 const p=THREE.MathUtils.clamp(phase,0,1),inhale=p<.25;
 const exhale=THREE.MathUtils.clamp((p-.25)/.75,0,1);
 const volume=inhale?smooth(p/.25):1-smooth(exhale);
 return {inhale,volume,ribs:inhale?volume:1-smooth(Math.pow(exhale,1.4)),
  abdomen:inhale?0:smooth(exhale/.48)*(1-smooth((exhale-.90)/.10)),
  diaphragm:inhale?volume:Math.pow(1-exhale,1.6)};
}

export function createBreathingModel(){
 const root=new THREE.Group();root.name='Breathing anatomy';
 const blue=new THREE.Color('#6099b5'),red=new THREE.Color('#bc6069');
 const material=(color:string,opacity=1)=>new THREE.MeshStandardMaterial({color,roughness:.65,metalness:0,transparent:opacity<1,opacity,depthWrite:opacity===1,side:THREE.DoubleSide});
 const bone=material('#ede8db'),lungMat=material('#dba7a2',.78),bellyMat=material('#6099b5',.85),diaphMat=material('#6099b5');
 const ribMuscle=material('#6099b5',.50);
 const sphere=(name:string,mat:THREE.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{
  const m=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),mat);m.name=name;m.position.set(x,y,z);m.scale.set(sx,sy,sz);root.add(m);return m;
 };
 // A narrow posterior column anchors the ribs without hiding the organs.
 for(let i=0;i<12;i++)sphere('Vertebra',bone,0,1.95-i*.29,-.47,.12,.10,.10);
 const ribs=new THREE.Group();ribs.name='Rib cage';root.add(ribs);
 for(let i=0;i<10;i++){
  const width=.65+.50*Math.sin((i+1)/12*Math.PI),height=1.75-i*.24;
  for(const side of [-1,1]){
   const points=[];
   for(let j=0;j<=40;j++){
    const a=j/40*Math.PI;
    points.push(new THREE.Vector3(side*(.10+width*Math.sin(a)),height-.19*Math.sin(a)-.17*j/40,-.46+.99*j/40));
   }
   const curve=new THREE.CatmullRomCurve3(points);
   const rib=new THREE.Mesh(new THREE.TubeGeometry(curve,48,.041,8,false),bone);ribs.add(rib);
   if(i<8){const muscle=new THREE.Mesh(new THREE.TubeGeometry(curve,48,.074,8,false),ribMuscle);muscle.position.y=-.095;ribs.add(muscle);}
  }
 }
 const sternum=sphere('Sternum',bone,0,.88,.55,.075,.82,.06);ribs.add(sternum);
 const lungs=new THREE.Group();lungs.name='Lungs';root.add(lungs);
 for(const side of [-1,1]){
  const shape=new THREE.Shape();shape.moveTo(.14,-.48);shape.bezierCurveTo(.45,-.36,.83,-.43,.98,-.55);shape.bezierCurveTo(1.12,.05,.90,1.45,.51,1.81);shape.bezierCurveTo(.28,1.98,.16,1.32,.16,.88);shape.bezierCurveTo(.30,.53,.05,.12,.14,-.48);
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.48,bevelEnabled:true,bevelThickness:.15,bevelSize:.09,bevelSegments:5,steps:1,curveSegments:32});geo.translate(0,0,-.23);
  const lung=new THREE.Mesh(geo,lungMat);lung.scale.x=side;lung.name=side<0?'Right lung':'Left lung';lungs.add(lung);
 }
 const airway=new THREE.Group();root.add(airway);
 const tube=(points:THREE.Vector3[],radius:number)=>{const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,radius,12,false),material('#c6b9ad'));airway.add(m);};
 tube([new THREE.Vector3(0,2.45,0),new THREE.Vector3(0,1.4,0),new THREE.Vector3(0,.95,0)],.09);
 for(const side of [-1,1])tube([new THREE.Vector3(0,1.03,0),new THREE.Vector3(side*.2,.78,0),new THREE.Vector3(side*.45,.65,0)],.063);
 // Parametric surfaces retain an anatomically legible dome and abdominal wall.
 function surface(name:string,mat:THREE.Material,fn:(u:number,v:number)=>THREE.Vector3){
  const geo=new THREE.BufferGeometry(),pos=[],idx=[];const n=40;
  for(let i=0;i<=n;i++)for(let j=0;j<=n;j++)pos.push(...fn(i/n,j/n).toArray());
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){const k=i*(n+1)+j;idx.push(k,k+1,k+n+1,k+1,k+n+2,k+n+1);}
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,mat);mesh.name=name;root.add(mesh);
  return {mesh,rest:new Float32Array(pos)};
 }
 const diaphragm=surface('Diaphragm',diaphMat,(u,v)=>{const a=u*Math.PI*2,r=v;return new THREE.Vector3(1.08*r*Math.cos(a),-.79+.51*(1-r*r),.83*r*Math.sin(a));});
 const belly=surface('Abdominal wall',bellyMat,(u,v)=>{const a=(u-.5)*Math.PI;const w=.88-.22*v;return new THREE.Vector3(w*Math.sin(a),-.83-1.40*v,.08+(.55+.20*Math.sin(v*Math.PI))*Math.cos(a));});
 const arrows:THREE.ArrowHelper[]=[];
 for(let i=0;i<5;i++){const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(),.4,0x627f91,.11,.07);root.add(arrow);arrows.push(arrow);}
 function update(phase:number,time:number){
  const p=breathPose(phase),v=p.volume;
  ribs.scale.set(1+.085*p.ribs,1+.025*p.ribs,1+.065*p.ribs);
  lungs.scale.set(1+.07*v,1+.14*v,1+.1*v);lungs.position.y=-.21*v;
  const dp=diaphragm.mesh.geometry.attributes.position;
  for(let i=0;i<dp.count;i++){const x=diaphragm.rest[i*3],y=diaphragm.rest[i*3+1],z=diaphragm.rest[i*3+2];const center=(y+.79)/.51;dp.setXYZ(i,x*(1+.065*v),y-.42*v*center,z*(1+.065*v));}
  dp.needsUpdate=true;diaphragm.mesh.geometry.computeVertexNormals();
  const bp=belly.mesh.geometry.attributes.position;
  for(let i=0;i<bp.count;i++){const x=belly.rest[i*3],y=belly.rest[i*3+1],z=belly.rest[i*3+2],weight=Math.sin(Math.PI*((-.83-y)/1.4));bp.setXYZ(i,x*(1+.045*v),y,z+.21*v*weight);}
  bp.needsUpdate=true;belly.mesh.geometry.computeVertexNormals();
  bellyMat.color.copy(blue).lerp(red,p.abdomen);diaphMat.color.copy(blue).lerp(red,p.diaphragm);ribMuscle.color.copy(blue).lerp(red,p.inhale?v:p.diaphragm*.65);
  const dir=p.inhale?1:-1,pulse=.035*Math.sin(time*3.8),length=.43+pulse;
  arrows[0].position.set(-1.26,.55,.65);arrows[0].setDirection(new THREE.Vector3(-dir,dir*.14,0).normalize());
  arrows[1].position.set(1.26,.55,.65);arrows[1].setDirection(new THREE.Vector3(dir,dir*.14,0).normalize());
  arrows[2].position.set(0,-.45-.42*v,.78);arrows[2].setDirection(new THREE.Vector3(0,-dir,0));
  arrows[3].position.set(-.80-dir*.12,-1.51,.73+.15*v);arrows[3].setDirection(new THREE.Vector3(dir,0,0).multiplyScalar(-1));
  arrows[4].position.set(.80+dir*.12,-1.51,.73+.15*v);arrows[4].setDirection(new THREE.Vector3(dir,0,0));
  arrows.forEach(a=>a.setLength(length,.13,.09));
  root.updateMatrixWorld(true);
 }
 update(0,0);return {root,update};
}
