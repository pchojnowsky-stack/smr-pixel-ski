/* SMR 1.1 — aerial camera and free traversal around OpenSkiMap XYZ, never a fabricated 1:1 survey.
   Terrain conforms to the imported profile; the 38m opening is illustrative.
   © OpenStreetMap contributors (ODbL), OpenSkiMap/OpenSkiData data processing.
*/
(async function(){
"use strict";
const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function fatal(reason){$("error").hidden=false;$("error").textContent=reason;console.error(reason);}
let geo;
try{const r=await fetch("./data/scene.json?v=1.1.0",{cache:"no-cache"});if(!r.ok)throw Error("HTTP "+r.status);
 geo=await r.json();if(!geo.route||geo.route.length<20||!geo.terrain||!geo.source?.run_id)throw Error("invalid OpenSkiMap source");
}catch(e){fatal("Nie udało się pobrać nowej mapy: "+e.message);return;}
if(!window.BABYLON||!window.SMR_SKIER||!window.SMR_FOREST){fatal("Brak modułu silnika, narciarza lub lasu.");return;}
const B=BABYLON,V=(x,y,z)=>new B.Vector3(x,y,z);
let engine;
try{engine=new B.Engine($("scene"),true,{powerPreference:"high-performance"});}catch(e){fatal("Brak WebGL: "+e.message);return;}
const mobile=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
engine.setHardwareScalingLevel(Math.max(1,(devicePixelRatio||1)/(mobile?1.1:1.3)));
const world=new B.Scene(engine);world.clearColor=new B.Color4(.72,.80,.89,1);
world.ambientColor=new B.Color3(.68,.78,.88);world.imageProcessingConfiguration.contrast=1.13;
world.fogMode=B.Scene.FOGMODE_EXP2;world.fogDensity=.00016;world.fogColor=new B.Color3(.78,.83,.91);
const camera=new B.FreeCamera("resort-follow-camera",V(0,340,-30),world);
camera.fov=.72;camera.minZ=.5;camera.maxZ=2100;camera.inputs.clear();world.activeCamera=camera;
const hemisphere=new B.HemisphericLight("high alpine winter ambient",V(-.1,1,.26),world);
hemisphere.intensity=.86;hemisphere.diffuse=new B.Color3(.88,.94,1);
const sun=new B.DirectionalLight("winter side sun",V(-.6,-.91,.36),world);
sun.position=V(-240,480,-160);sun.intensity=1.16;sun.diffuse=new B.Color3(1,.96,.86);
const shadow=new B.ShadowGenerator(mobile?512:1024,sun);shadow.usePercentageCloserFiltering=true;shadow.bias=.002;
const mat=(name,color)=>{const m=new B.StandardMaterial(name,world);m.diffuseColor=B.Color3.FromHexString(color);m.specularColor=new B.Color3(.045,.065,.08);return m;};
const wood=mat("warm mountain timber","#846450"),roof=mat("slate roofs","#465964"),blue=mat("lift steel","#455f76"),glass=mat("hut windows","#6d9bb4");
const terrain=geo.terrain,grid=terrain.heights,sx=terrain.step_x,sz=terrain.step_z;
function height(x,z){const u=clamp((x-terrain.x0)/sx,0,terrain.cols-1.001),w=clamp((z-terrain.z0)/sz,0,terrain.rows-1.001);
 const i=Math.floor(u),j=Math.floor(w),a=u-i,b=w-j,at=(a,b)=>grid[b*terrain.cols+a];
 return (1-b)*(at(i,j)*(1-a)+at(i+1,j)*a)+b*(at(i,j+1)*(1-a)+at(i+1,j+1)*a);
}
const route=geo.route,lengths=[0];for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i];lengths.push(lengths[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1]));}
const total=lengths[lengths.length-1];
function course(s){s=clamp(s,0,total);let low=1,high=lengths.length-1;
 while(low<high){const mid=(low+high)>>1;if(lengths[mid]<s)low=mid+1;else high=mid;}
 const i=low,a=route[i-1],b=route[i],l=Math.max(.00001,lengths[i]-lengths[i-1]),t=(s-lengths[i-1])/l;
 return {x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,y:a[2]+(b[2]-a[2])*t,dx:(b[0]-a[0])/l,dz:(b[1]-a[1])/l};
}
function closestCourse(x,z){let best=1e14,nearest=null;
 for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],dx=b[0]-a[0],dz=b[1]-a[1];
  const t=clamp(((x-a[0])*dx+(z-a[1])*dz)/Math.max(1e-9,dx*dx+dz*dz),0,1);
  const px=a[0]+dx*t,pz=a[1]+dz*t,d2=(x-px)**2+(z-pz)**2;
  if(d2<best){best=d2;nearest={x:px,z:pz};}
 }
 return Math.sqrt(best);
}
function terrainMesh(){
 const points=[],colors=[],indices=[],uv=[],cols=terrain.cols,rows=terrain.rows;
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
   const x=terrain.x0+i*sx,z=terrain.z0+j*sz,y=grid[j*cols+i];points.push(x,y,z);
   const distance=closestCourse(x,z),factor=1-clamp((distance-16)/33,0,1);
   // Groomed clear piste rather than visibly floating overlay. Width is visual not surveyed.
   const frost=.022*Math.sin(x*.17+z*.28)*Math.cos(z*.052)+.035*Math.sin(x*.04-z*.06);
   const g=clamp(.79+factor*.145+frost,.65,.985);
   colors.push(g*.91,g*.965,Math.min(1,g*1.045),1);uv.push(x/18,z/18);
 }
 for(let j=0;j<rows-1;j++)for(let i=0;i<cols-1;i++){
  const a=j*cols+i,b=a+1,c=a+cols,d=c+1;indices.push(a,c,b,b,c,d);
 }
 const normals=[];B.VertexData.ComputeNormals(points,indices,normals);
 const vd=new B.VertexData();vd.positions=points;vd.indices=indices;vd.normals=normals;vd.colors=colors;vd.uvs=uv;
 const m=new B.Mesh("OpenSkiMap corrected winter relief",world);vd.applyToMesh(m);
 const material=mat("snow terrain vertex-blended","#ffffff");material.useVertexColors=true;material.backFaceCulling=false;
 material.specularColor=new B.Color3(.025,.035,.045);material.disableLighting=true;material.emissiveColor=new B.Color3(.98,.99,1);m.material=material;m.receiveShadows=false;
 return m;
}
terrainMesh();
const renderTrees=mobile?geo.forest_trees.filter((_,i)=>i%2===0):geo.forest_trees;
const forest=window.SMR_FOREST.createForest(B,world,renderTrees,height);
function snowShadows(){
  const positions=[],indices=[];
  for(const [x,z,scale] of renderTrees){
    const len=10.5*scale,side=1.25*scale;
    const tri=[[x-side,z],[x+side,z],[x+len*.95,z+len*.55]];
    const id=positions.length/3;
    for(const [sx,sz] of tri)positions.push(sx,height(sx,sz)+.44,sz);
    indices.push(id,id+1,id+2);
  }
  if(!positions.length)return null;
  const normals=[];B.VertexData.ComputeNormals(positions,indices,normals);
  const vd=new B.VertexData();vd.positions=positions;vd.indices=indices;vd.normals=normals;
  const sh=new B.Mesh("procedural winter tree shadows",world);vd.applyToMesh(sh);
  const m=new B.StandardMaterial("pale blue spruce shadows",world);
  m.disableLighting=true;m.emissiveColor=new B.Color3(.28,.39,.48);m.alpha=.19;
  m.backFaceCulling=false;m.depthFunction=B.Engine.LEQUAL;sh.material=m;sh.isPickable=false;
  return sh;
}
const treeShadows=snowShadows();

// Thin-instance canopy already has baked white snow caps; avoid expensive shadow rendering on phones.
function box(name,w,h,d,x,y,z,m,angle=0){const o=B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},world);
 o.position=V(x,y,z);o.rotation.y=angle;o.material=m;o.isPickable=false;return o;}
for(const building of geo.buildings){
 const ps=building.p;if(!ps||ps.length<3)continue;
 // Use longest footprint edge to align roof/walls with real-world building heading.
 let best=0,angle=0;for(let i=0;i<ps.length;i++){const a=ps[i],b=ps[(i+1)%ps.length],d=Math.hypot(b[0]-a[0],b[1]-a[1]);
 if(d>best){best=d;angle=Math.atan2(-(b[1]-a[1]),b[0]-a[0]);}}
 let cx=0,cz=0;for(const p of ps){cx+=p[0];cz+=p[1];}cx/=ps.length;cz/=ps.length;
 const co=Math.cos(angle),si=Math.sin(angle);
 const local=ps.map(([x,z])=>[(x-cx)*co-(z-cz)*si,(x-cx)*si+(z-cz)*co]);
 const w=Math.max(3,Math.max(...local.map(x=>x[0]))-Math.min(...local.map(x=>x[0])));
 const d=Math.max(3,Math.max(...local.map(x=>x[1]))-Math.min(...local.map(x=>x[1])));
 const h=building.height,y=height(cx,cz);
 box("OSM building "+building.id,w,h,d,cx,y+h/2,cz,wood,angle);
 const roofLeft=box("winter roof A",w/2+.65,.5,d+1,cx-w/4*co,y+h+.9,cz+w/4*si,roof,angle);
 const roofRight=box("winter roof B",w/2+.65,.5,d+1,cx+w/4*co,y+h+.9,cz-w/4*si,roof,angle);
 roofLeft.rotation.z=angle+.16;roofRight.rotation.z=angle-.16;
 if(d>7){box("panoramic facade",Math.min(3,w*.3),Math.min(3,h*.5),.16,cx,y+h*.55,cz-d/2,glass,angle);}
}
// B1 cable positions and elevations from OpenSkiMap; physical tower placements remain illustrative.
const lift=geo.lift_b1;
const wirePoints=lift.map(p=>V(p[0],p[2]+16,p[1]));
const cable=B.MeshBuilder.CreateLines("OpenSkiMap B1 georeferenced lift line",{points:wirePoints},world);
cable.color=new B.Color3(.22,.31,.40);
function lineAt(fraction){const l=lift.length-1,raw=clamp(fraction,0,1)*l,i=Math.min(l-1,Math.floor(raw)),t=raw-i,a=lift[i],b=lift[i+1];
 return V(a[0]+(b[0]-a[0])*t,a[2]+(b[2]-a[2])*t+15,a[1]+(b[1]-a[1])*t);
}
for(let i=1;i<lift.length-1;i+=2){const p=lift[i],ground=height(p[0],p[1]);
 const h=Math.max(10,p[2]-ground+15);
 const column=B.MeshBuilder.CreateCylinder("B1 indicative tower",{height:h,diameter:.9,tessellation:8},world);
 column.position=V(p[0],ground+h/2,p[1]);column.material=blue;
 box("lift roller beam",8,.4,.85,p[0],ground+h+.2,p[1],blue);
}
const chairs=[];
for(let i=0;i<14;i++){const n=new B.TransformNode("B1 moving cabin "+i,world);
 const seat=box("chair seat",3.3,.26,1.15,0,-4.15,0,blue);seat.parent=n;seat.position=V(0,-4.15,0);
 const back=box("chair back",3.3,1.35,.19,0,-3.6,.51,blue);back.parent=n;back.position=V(0,-3.6,.51);
 const hanger=B.MeshBuilder.CreateCylinder("chair support",{height:4,diameter:.12,tessellation:7},world);hanger.parent=n;hanger.position=V(0,-2,0);hanger.material=blue;
 chairs.push(n);
}

const skierController=window.SMR_SKIER.createSkier(B,world,null),skier=skierController.root;
const input={left:false,right:false,brake:false,tuck:false,jump:false};
const spawn={x:route[0][0],z:route[0][1],heading:Math.atan2(route[1][0]-route[0][0],route[1][1]-route[0][1])};
const bounds={xMin:terrain.x0,xMax:terrain.x0+(terrain.cols-1)*sx,zMin:terrain.z0,zMax:terrain.z0+(terrain.rows-1)*sz};
if(!window.SMR_FREERIDE){fatal("Brakuje modułu swobodnej jazdy");return;}
const ride=window.SMR_FREERIDE.createRide({height,bounds,spawn,closestDistance:closestCourse});
const state=ride.state;
let currentMode="menu",aerial=true,zoom=(window.innerHeight>window.innerWidth?1.45:1),trailFrame=0;
function setMode(next){currentMode=next;$("overlay").hidden=next==="play";$("pause").textContent=next==="pause"?"▶":"Ⅱ";
 document.body.classList.toggle("playing",next==="play");}
function pause(){if(currentMode==="play"){$("heading").textContent="PAUZA";$("start").textContent="▶ KONTYNUUJ";setMode("pause");}
 else if(currentMode==="pause")setMode("play");}
$("start").onclick=()=>{if(currentMode!=="pause")reset();setMode("play");};
$("pause").onclick=pause;
$("camera").onclick=()=>{aerial=!aerial;$("camera").textContent=aerial?"KAMERA: LOT":"KAMERA: BLISKO";};
$("zoomIn").onclick=()=>{zoom=clamp(zoom*.79,.43,2.2);};
$("zoomOut").onclick=()=>{zoom=clamp(zoom*1.26,.43,2.2);};
for(const k of Object.keys(input)){
 const b=$(k);
 const release=e=>{input[k]=false;b.classList.remove("pressed");if(e)e.preventDefault();};
 b.addEventListener("pointerdown",e=>{input[k]=true;b.classList.add("pressed");e.preventDefault();try{b.setPointerCapture(e.pointerId);}catch(_){}});
 for(const ev of ["pointerup","pointercancel","lostpointercapture"])b.addEventListener(ev,release);
}
const keys={ArrowLeft:"left",a:"left",ArrowRight:"right",d:"right",ArrowDown:"brake",s:"brake",ArrowUp:"tuck",w:"tuck",Shift:"tuck"," ":"jump"};
window.addEventListener("keydown",e=>{
 const key=keys[e.key]||keys[e.key.toLowerCase()];
 if(key){input[key]=true;e.preventDefault();}
 if(e.key==="Escape")pause();
 if(e.key==="c"||e.key==="C")$("camera").click();
 if(e.key==="="||e.key==="+")$("zoomIn").click();
 if(e.key==="-"||e.key==="_")$("zoomOut").click();
});
window.addEventListener("keyup",e=>{const key=keys[e.key]||keys[e.key.toLowerCase()];if(key){input[key]=false;e.preventDefault();}});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&currentMode==="play")pause();});
const traces=[[],[]],MAX_TRACK=240;
function createTrace(name){
 const points=Array.from({length:MAX_TRACK},()=>V(0,-800,0));
 const mesh=B.MeshBuilder.CreateLines(name,{points,updatable:true},world);
 mesh.color=B.Color3.FromHexString("#6b96aa");mesh.alpha=.67;mesh.isPickable=false;
 return mesh;
}
const trailMeshes=[createTrace("left tracked ski edge"),createTrace("right tracked ski edge")];
function updateTraces(){
 if(state.airborne||state.speed<3)return;
 trailFrame++;
 if(trailFrame%3!==0)return;
 const dirX=Math.sin(state.heading),dirZ=Math.cos(state.heading),sideX=Math.cos(state.heading),sideZ=-Math.sin(state.heading);
 for(let k=0;k<2;k++){
  const side=k===0?-1:1,xx=state.x+sideX*.32*side-dirX*.82,zz=state.z+sideZ*.32*side-dirZ*.82;
  const yy=height(xx,zz)+.31;
  const list=traces[k];list.push(V(xx,yy,zz));if(list.length>MAX_TRACK)list.shift();
  const display=Array.from({length:MAX_TRACK},(_,i)=>{
    const n=list[i-MAX_TRACK+list.length];return n?n:V(state.x,-800,state.z);
  });
  B.MeshBuilder.CreateLines(trailMeshes[k].name,{points:display,instance:trailMeshes[k]},world);
 }
}
function eraseTraces(){
 for(const t of traces)t.length=0;
 for(let k=0;k<2;k++)B.MeshBuilder.CreateLines(trailMeshes[k].name,{points:Array.from({length:MAX_TRACK},()=>V(0,-800,0)),instance:trailMeshes[k]},world);
}
const npcBody=mat("NPC jackets","#db7345"),npcDark=mat("NPC pants","#264a5f");
const npcs=[];
for(let i=0;i<10;i++){
 const n=new B.TransformNode("distant skier "+i,world),p=course(80+i*135);
 const body=B.MeshBuilder.CreateCapsule("npc jacket",{height:2.0,radius:.43,tessellation:6},world);body.parent=n;body.position=V(0,1.4,0);body.material=i%3===0?npcDark:npcBody;
 const helmet=B.MeshBuilder.CreateSphere("npc helmet",{diameter:.57,segments:7},world);helmet.parent=n;helmet.position=V(0,2.6,0);helmet.material=npcDark;
 for(let j of [-1,1]){const ski=box("npc ski",.18,.10,2.5,j*.3,.12,.22,blue);ski.parent=n;ski.position=V(j*.3,.12,.22);}
 n.position=V(p.x,height(p.x,p.z),p.z);npcs.push({root:n,offset:i*139,phase:i*1.6});
}
function updateNPCs(){
 for(const npc of npcs){
  const p=course(80+(npc.offset+state.time*7)%Math.max(140,total-90));
  const x=p.x+Math.sin(npc.phase+state.time)*7,z=p.z;
  npc.root.position.copyFromFloats(x,height(x,z),z);
  npc.root.rotation.y=Math.atan2(p.dx,p.dz)+Math.sin(npc.phase+state.time)*.14;
  npc.root.setEnabled(Math.hypot(x-state.x,z-state.z)<350);
 }
}
function reset(){
 ride.reset();eraseTraces();for(const k of Object.keys(input))input[k]=false;
 skierController.reset();skier.position=V(state.x,state.groundY+.30,state.z);skier.rotation.y=state.heading;
 const d=V(Math.sin(state.heading),0,Math.cos(state.heading));
 const camDistance=(aerial?89:24)*zoom,camHeight=(aerial?138:17)*zoom;
 camera.position=V(state.x-d.x*camDistance+camDistance*.06,state.groundY+camHeight,state.z-d.z*camDistance);
 camera.setTarget(V(state.x+d.x*22,state.groundY,state.z+d.z*22));
}
function update(dt){
 if(currentMode!=="play")return;
 ride.step(input,dt);
 const y=state.groundY+.30+state.jumpY;
 skier.position.copyFromFloats(state.x,y,state.z);
 skier.rotation.y=state.heading;
 skierController.animate({turn:state.lean,speed:state.speed,time:state.time,braking:input.brake,
  tuck:state.tuck,airborne:state.airborne,impact:state.impact,dt,active:true,px:state.x,py:y,pz:state.z});
 updateTraces();updateNPCs();
 const dir=V(Math.sin(state.heading),0,Math.cos(state.heading));
 const camDistance=(aerial?112:24)*zoom;
 const camHeight=(aerial?91:17)*zoom;
 const desired=V(state.x-dir.x*camDistance+camDistance*.05,state.groundY+camHeight+state.jumpY*.15,
                 state.z-dir.z*camDistance);
 const look=V(state.x+dir.x*(aerial?23:15),state.groundY+state.jumpY*.42,
              state.z+dir.z*(aerial?23:15));
 camera.position=B.Vector3.Lerp(camera.position,desired,clamp(dt*2.9,0,1));
 camera.setTarget(B.Vector3.Lerp(camera.getTarget(),look,clamp(dt*3.3,0,1)));
 $("speed").textContent=Math.round(state.speed*3.6)+" km/h";
 $("clock").textContent=Math.floor(state.time/60)+":"+String(Math.floor(state.time%60)).padStart(2,"0");
 $("distance").textContent=(state.offPiste?"FREERIDE":"TRASA")+" · "+Math.round(state.edgeDistance)+" m od osi";
 $("fill").style.width=clamp((state.z-bounds.zMin)/(bounds.zMax-bounds.zMin)*100,0,100)+"%";
}
let last=0,timer=0,frames=0;
engine.runRenderLoop(()=>{
 const now=performance.now(),dt=last?Math.min(.055,(now-last)/1000):1/60;last=now;update(dt);
 for(let i=0;i<chairs.length;i++){
  const f=((i/chairs.length*2+state.time*.008)%2),reverse=f>1,q=lineAt(reverse?2-f:f);
  chairs[i].position.copyFrom(q);chairs[i].position.x+=(reverse?2.5:-2.5);chairs[i].rotation.y=reverse?Math.PI:0;
 }
 world.render();frames++;timer+=dt;if(timer>1.2){$("fps").textContent=Math.round(frames/timer)+" FPS · FREERIDE 1.1";timer=0;frames=0;}
});
window.addEventListener("resize",()=>engine.resize());
window.__SMR_DEBUG__={get:()=>({version:"1.1.0",mode:currentMode,freeTerrain:true,
 x:state.x,z:state.z,heading:state.heading,speed:state.speed,offPiste:state.offPiste,
 edgeDistance:state.edgeDistance,tuck:state.tuck,airborne:state.airborne,jumpY:state.jumpY,
 cameraMode:aerial?"aerial":"close",zoom,terrainVertices:terrain.cols*terrain.rows,
 trees:geo.forest_trees.length,renderedTrees:renderTrees.length,buildings:geo.buildings.length,
 npcs:npcs.length,chairs:chairs.length,trailPoints:traces[0].length,
 sourceRunId:geo.source.run_id,widthMeasured:geo.reference.piste_width_measured_m,
 player:skier.position.asArray(),camera:camera.position.asArray(),fps:Math.round(engine.getFps())}),scene:world,engine,reset};
reset();
})();