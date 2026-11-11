/* SMR Pixel Ski 0.9 - geographically anchored Szumarjanka preview.
   Mapped axis: OSM way 202733799. Model heights: coarse Mapzen DEM.
   The piste band is ILLUSTRATIVE; source data does NOT contain measured widths. */
(async()=>{
"use strict";
const $=id=>document.getElementById(id);
const error=msg=>{const el=$("error");el.hidden=false;el.textContent=msg;console.error(msg);};
if(!window.BABYLON){error("Nie można wczytać silnika Babylon.js. Sprawdź połączenie.");return;}
let map;
try{
 const response=await fetch("./data/scene.json?v=0.9.0");
 if(!response.ok)throw Error("HTTP "+response.status);
 map=await response.json();
 if(!map.reference||map.reference.osm_way!==202733799||map.route.length<10)throw Error("Błędne dane trasy");
}catch(e){error("Brak modelu geograficznego: "+e.message);return;}
const B=BABYLON,canvas=$("scene"),V=(x,y,z)=>new B.Vector3(x,y,z),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let engine;
try{engine=new B.Engine(canvas,true,{powerPreference:"high-performance"});}catch(e){error("Brak WebGL: "+e.message);return;}
const mobile=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
engine.setHardwareScalingLevel(Math.max(1,(devicePixelRatio||1)/(mobile?1.15:1.3)));
const scene=new B.Scene(engine);
scene.clearColor=new B.Color4(.69,.83,.92,1);scene.ambientColor=new B.Color3(.68,.79,.92);
scene.fogMode=B.Scene.FOGMODE_EXP2;scene.fogDensity=.00026;scene.fogColor=new B.Color3(.73,.84,.94);
const camera=new B.FreeCamera("geospatial chase",V(0,290,-42),scene);
camera.fov=.77;camera.minZ=.5;camera.maxZ=1500;camera.inputs.clear();scene.activeCamera=camera;
const ambient=new B.HemisphericLight("sky",V(-.2,1,.1),scene);ambient.intensity=.92;
const sun=new B.DirectionalLight("sun",V(-.7,-1,.3),scene);sun.intensity=1.07;sun.position=V(-200,500,150);
const shadow=new B.ShadowGenerator(mobile?512:1024,sun);shadow.usePercentageCloserFiltering=true;shadow.bias=.001;
const material=(name,color)=>{const m=new B.StandardMaterial(name,scene);m.diffuseColor=B.Color3.FromHexString(color);m.specularColor=new B.Color3(.09,.11,.12);return m;};
const snow=material("snow #DEM","#e2eef7"),piste=material("illustrative piste","#f3f9fb");
const forestMat=material("spruces","#26554d"),trunkMat=material("trunks","#746258");
const roofMat=material("roofs","#55646f"),wallMat=material("OSM buildings","#a38b79"),steel=material("cable supports","#5c7180");
piste.alpha=.97;piste.backFaceCulling=false;
const dem=map.terrain;
function height(x,z){
  const cx=clamp((x-dem.x0)/dem.step,0,dem.cols-1.001),cz=clamp((z-dem.z0)/dem.step,0,dem.rows-1.001);
  const ix=Math.floor(cx),iz=Math.floor(cz),tx=cx-ix,tz=cz-iz;
  const at=(i,j)=>dem.heights[j*dem.cols+i];
  return (1-tz)*((1-tx)*at(ix,iz)+tx*at(ix+1,iz))+tz*((1-tx)*at(ix,iz+1)+tx*at(ix+1,iz+1));
}
function meshFromGrid(){
 const pos=[],uv=[],indices=[];
 for(let j=0;j<dem.rows;j++)for(let i=0;i<dem.cols;i++){
  const x=dem.x0+i*dem.step,z=dem.z0+j*dem.step;
  pos.push(x,height(x,z),z);uv.push(i/10,j/10);
 }
 for(let j=0;j<dem.rows-1;j++)for(let i=0;i<dem.cols-1;i++){
  const a=j*dem.cols+i,b=a+1,c=a+dem.cols,d=c+1;
  indices.push(a,b,c,b,d,c);
 }
 const normals=[];B.VertexData.ComputeNormals(pos,indices,normals);
 const data=new B.VertexData();data.positions=pos;data.indices=indices;data.normals=normals;data.uvs=uv;
 const m=new B.Mesh("Mapzen georeferenced heightfield",scene);data.applyToMesh(m);m.material=snow;m.receiveShadows=true;
}
meshFromGrid();
const route=map.route;let stations=[0],total=0;
for(let i=1;i<route.length;i++){total+=Math.hypot(route[i][0]-route[i-1][0],route[i][1]-route[i-1][1]);stations.push(total);}
function onRoute(s){
 s=clamp(s,0,total);
 let i=1;while(i<stations.length-1&&stations[i]<s)i++;
 const a=route[i-1],b=route[i],delta=Math.max(.001,stations[i]-stations[i-1]),t=(s-stations[i-1])/delta;
 return {x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,
   tangentX:(b[0]-a[0])/delta,tangentZ:(b[1]-a[1])/delta};
}
function pisteRibbon(){
 const v=[],uv=[],faces=[],step=4,N=Math.ceil(total/step);
 for(let i=0;i<=N;i++){
  const s=total*i/N,c=onRoute(s),a=onRoute(Math.max(0,s-1)),b=onRoute(Math.min(total,s+1));
  const dx=b.x-a.x,dz=b.z-a.z,len=Math.max(1,Math.hypot(dx,dz)),half=map.reference.rendered_band_width_m*.5;
  for(const side of [-1,1]){
   const x=c.x+side*dz/len*half,z=c.z-side*dx/len*half;
   v.push(x,height(x,z)+.19,z);uv.push((side+1)*.5,s/8);
  }
 }
 for(let i=0;i<N;i++){let a=i*2;faces.push(a,a+2,a+1,a+1,a+2,a+3);}
 const normals=[];B.VertexData.ComputeNormals(v,faces,normals);
 const d=new B.VertexData();d.positions=v;d.indices=faces;d.normals=normals;d.uvs=uv;
 const m=new B.Mesh("UNMEASURED 38m visual piste band",scene);d.applyToMesh(m);m.material=piste;m.isPickable=false;
}
pisteRibbon();
const spruce=B.MeshBuilder.CreateCylinder("spruce thin instance",{diameterTop:0,diameterBottom:11,height:20,tessellation:7},scene);
spruce.material=forestMat;spruce.isPickable=false;
const trunk=B.MeshBuilder.CreateCylinder("trunk thin instance",{diameter:.85,height:4.6,tessellation:6},scene);trunk.material=trunkMat;
const spruceInstances=[],trunkInstances=[];
for(const [x,z,scale] of map.forest_trees){
 const y=height(x,z);
 B.Matrix.Compose(V(scale,scale,scale),B.Quaternion.Identity(),V(x,y+11*scale,z)).copyToArray(spruceInstances,spruceInstances.length);
 B.Matrix.Compose(V(scale,scale,scale),B.Quaternion.Identity(),V(x,y+2.2*scale,z)).copyToArray(trunkInstances,trunkInstances.length);
}
spruce.thinInstanceSetBuffer("matrix",new Float32Array(spruceInstances),16,true);
trunk.thinInstanceSetBuffer("matrix",new Float32Array(trunkInstances),16,true);
spruce.thinInstanceRefreshBoundingInfo();trunk.thinInstanceRefreshBoundingInfo();
for(const b of map.buildings){
 const poly=b.p;if(!poly||poly.length<3)continue;
 const xs=poly.map(p=>p[0]),zs=poly.map(p=>p[1]);
 const x=(Math.min(...xs)+Math.max(...xs))*.5,z=(Math.min(...zs)+Math.max(...zs))*.5;
 const w=Math.max(3,Math.max(...xs)-Math.min(...xs)),d=Math.max(3,Math.max(...zs)-Math.min(...zs));
 const h=b.height,y=height(x,z);
 const walls=B.MeshBuilder.CreateBox("OSM footprint approx "+b.id,{width:w,height:h,depth:d},scene);
 walls.position=V(x,y+h/2,z);walls.material=wallMat;
 const roof=B.MeshBuilder.CreateBox("building roof "+b.id,{width:w+1,height:.65,depth:d+1},scene);
 roof.position=V(x,y+h+.25,z);roof.material=roofMat;
}
const lift=map.lift_b1;
const wirePoints=lift.map(([x,z])=>V(x,height(x,z)+17,z));
const wire=B.MeshBuilder.CreateLines("B1 mapped centerline",{points:wirePoints},scene);wire.color=new B.Color3(.23,.32,.36);
for(let i=1;i<lift.length-1;i+=2){
 const [x,z]=lift[i],y=height(x,z);
 const tower=B.MeshBuilder.CreateCylinder("B1 tower - illustrative spacing",{height:17,diameter:1,tessellation:8},scene);
 tower.position=V(x,y+8.5,z);tower.material=steel;
 const cross=B.MeshBuilder.CreateBox("B1 support beam",{width:9,height:.45,depth:.8},scene);
 cross.position=V(x,y+17,z);cross.material=steel;
}
if(!window.SMR_SKIER){error("Nie można wczytać modelu narciarza");return;}
const controller=window.SMR_SKIER.createSkier(B,scene,null),skier=controller.root;
const input={left:false,right:false,brake:false,tuck:false,jump:false};
const state={mode:"menu",distance:0,speed:12,lane:0,lean:0,time:0,airborne:false,jumpHeight:0,jumpVel:0,cooldown:0,wasJump:false};
function setMode(mode){state.mode=mode;$("overlay").hidden=mode==="play";$("pause").textContent=mode==="pause"?"▶":"Ⅱ";}
function reset(){
 state.distance=0;state.speed=12;state.lane=0;state.lean=0;state.time=0;state.airborne=false;state.jumpHeight=0;state.jumpVel=0;state.cooldown=0;state.wasJump=false;
 controller.reset();const c=onRoute(0);skier.position=V(c.x,height(c.x,c.z)+.3,c.z);
 camera.position=V(c.x,height(c.x,c.z)+46,c.z-37);camera.setTarget(V(c.x,height(c.x,c.z)+1,c.z+27));
}
$("start").onclick=()=>{if(state.mode!=="pause")reset();setMode("play");};
$("pause").onclick=()=>{if(state.mode==="play"){$("heading").textContent="PAUZA";$("start").textContent="▶ KONTYNUUJ";setMode("pause");}else if(state.mode==="pause")setMode("play");};
for(const k of Object.keys(input)){
 const el=$(k),release=e=>{input[k]=false;el.classList.remove("pressed");if(e)e.preventDefault();};
 el.addEventListener("pointerdown",e=>{input[k]=true;el.classList.add("pressed");e.preventDefault();try{el.setPointerCapture(e.pointerId);}catch(_){}});
 for(const ev of ["pointerup","pointercancel","lostpointercapture"])el.addEventListener(ev,release);
}
const keys={ArrowLeft:"left",a:"left",ArrowRight:"right",d:"right",ArrowDown:"brake",ArrowUp:"tuck",w:"tuck",Shift:"tuck"," ":"jump"};
window.addEventListener("keydown",e=>{const k=keys[e.key]||keys[e.key.toLowerCase()];if(k){input[k]=true;e.preventDefault();}if(e.key==="Escape"&&state.mode==="play")$("pause").click();});
window.addEventListener("keyup",e=>{const k=keys[e.key]||keys[e.key.toLowerCase()];if(k){input[k]=false;e.preventDefault();}});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&state.mode==="play")$("pause").click();});
function step(dt){
 if(state.mode!=="play")return;
 dt=clamp(dt,0,.05);state.time+=dt;
 const steer=Number(input.right)-Number(input.left);
 state.lean+=(steer-state.lean)*clamp(dt*9,0,1);
 const c=onRoute(state.distance),f=onRoute(Math.min(total,state.distance+5));
 const slope=clamp((height(c.x,c.z)-height(f.x,f.z))/5,-.12,.4);
 state.speed=clamp(state.speed+dt*(6+slope*11-(input.tuck?.01:.022)*state.speed**2-(input.brake?20:0)),3,32);
 state.distance=Math.min(total,state.distance+state.speed*dt);
 const target=onRoute(state.distance),next=onRoute(Math.min(total,state.distance+3));
 const tx=next.x-target.x,tz=next.z-target.z,len=Math.max(.01,Math.hypot(tx,tz));
 const authority=input.tuck?1.55:1;
 state.lane=clamp(state.lane+steer*state.speed*dt*authority*.95,-70,70);
 const x=target.x+tz/len*state.lane,z=target.z-tx/len*state.lane;
 if(input.jump&&!state.wasJump&&!state.airborne&&state.cooldown<=0){state.airborne=true;state.jumpVel=8.5;state.jumpHeight=.01;state.cooldown=.8;}
 state.wasJump=input.jump;state.cooldown=Math.max(0,state.cooldown-dt);
 if(state.airborne){state.jumpHeight+=state.jumpVel*dt-9.4*dt*dt;state.jumpVel-=18.8*dt;if(state.jumpHeight<=0){state.jumpHeight=0;state.airborne=false;state.jumpVel=0;}}
 const y=height(x,z)+.3+state.jumpHeight;
 skier.position.copyFromFloats(x,y,z);
 skier.rotation.y=Math.atan2(tx,tz);
 controller.animate({turn:state.lean,speed:state.speed,time:state.time,tuck:Number(input.tuck),braking:input.brake,airborne:state.airborne,active:true,dt,px:x,py:y,pz:z});
 const desired=V(x+1.6,y+47,z-40),look=V(x+tx/len*27,y+1,z+tz/len*27);
 camera.position=B.Vector3.Lerp(camera.position,desired,clamp(dt*3.5,0,1));
 camera.setTarget(B.Vector3.Lerp(camera.getTarget(),look,clamp(dt*3.8,0,1)));
 $("speed").textContent=Math.round(state.speed*3.6)+" km/h";
 $("distance").textContent=Math.round(state.distance)+" / "+Math.round(total)+" m";
 $("fill").style.width=(state.distance/total*100)+"%";
 if(state.distance>=total){$("heading").textContent="META";$("start").textContent="↻ JEDŹ PONOWNIE";setMode("finish");}
}
let last=0,frames=0,elapsed=0;
engine.runRenderLoop(()=>{
 const now=performance.now(),dt=last?Math.min(.05,(now-last)/1000):1/60;last=now;
 step(dt);scene.render();frames++;elapsed+=dt;
 if(elapsed>1.3){$("fps").textContent=Math.round(frames/elapsed)+" FPS · GEO 0.9";elapsed=0;frames=0;}
});
window.addEventListener("resize",()=>engine.resize());
window.__SMR_DEBUG__={get:()=>({version:"0.9.0",mode:state.mode,distance:state.distance,speed:state.speed,routeMeters:total,trees:map.forest_trees.length,buildings:map.buildings.length,liftPoints:map.lift_b1.length,terrainVertices:dem.cols*dem.rows,meshes:scene.meshes.length,airborne:state.airborne,tuck:input.tuck,playerPosition:skier.position.asArray(),routeSource:map.reference.osm_way,widthMeasured:map.reference.piste_width_measured_m}),scene,engine,reset};
reset();
})();
