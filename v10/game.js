/* SMR 1.0 — rebuild around OpenSkiMap XYZ geometry, never a fabricated 1:1 survey.
   Terrain conforms to the imported profile; the 38m opening is illustrative.
   © OpenStreetMap contributors (ODbL), OpenSkiMap/OpenSkiData data processing.
*/
(async function(){
"use strict";
const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function fatal(reason){$("error").hidden=false;$("error").textContent=reason;console.error(reason);}
let geo;
try{const r=await fetch("./data/scene.json?v=1.0.0",{cache:"no-cache"});if(!r.ok)throw Error("HTTP "+r.status);
 geo=await r.json();if(!geo.route||geo.route.length<20||!geo.terrain||!geo.source?.run_id)throw Error("invalid OpenSkiMap source");
}catch(e){fatal("Nie udało się pobrać nowej mapy: "+e.message);return;}
if(!window.BABYLON||!window.SMR_SKIER||!window.SMR_FOREST){fatal("Brak modułu silnika, narciarza lub lasu.");return;}
const B=BABYLON,V=(x,y,z)=>new B.Vector3(x,y,z);
let engine;
try{engine=new B.Engine($("scene"),true,{powerPreference:"high-performance"});}catch(e){fatal("Brak WebGL: "+e.message);return;}
const mobile=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
engine.setHardwareScalingLevel(Math.max(1,(devicePixelRatio||1)/(mobile?1.1:1.3)));
const world=new B.Scene(engine);world.clearColor=new B.Color4(.64,.79,.90,1);
world.ambientColor=new B.Color3(.68,.78,.88);world.imageProcessingConfiguration.contrast=1.13;
world.fogMode=B.Scene.FOGMODE_EXP2;world.fogDensity=.00023;world.fogColor=new B.Color3(.76,.86,.95);
const camera=new B.FreeCamera("resort-follow-camera",V(0,340,-30),world);
camera.fov=.71;camera.minZ=.5;camera.maxZ=2100;camera.inputs.clear();world.activeCamera=camera;
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
const forest=window.SMR_FOREST.createForest(B,world,geo.forest_trees,height);
if(geo.forest_trees.length>0){shadow.addShadowCaster(forest.mesh,false);}
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
const state={mode:"menu",distance:0,lane:0,speed:15,lean:0,time:0,airborne:false,jumpY:0,jumpV:0,jumpLatch:false,jumpCooldown:0};
function reset(){
 state.distance=0;state.lane=0;state.speed=15;state.lean=0;state.time=0;state.airborne=false;state.jumpY=0;state.jumpV=0;state.jumpLatch=false;state.jumpCooldown=0;
 for(const k of Object.keys(input))input[k]=false;
 skierController.reset();const c=course(0);skier.position=V(c.x,height(c.x,c.z)+.3,c.z);
 camera.position=V(c.x+3,c.y+20,c.z-20);camera.setTarget(V(c.x,c.y,c.z+16));
}
function mode(m){state.mode=m;$("overlay").hidden=m==="play";$("pause").textContent=m==="pause"?"▶":"Ⅱ";}
$("start").onclick=()=>{if(state.mode!=="pause")reset();mode("play");};
$("pause").onclick=()=>{if(state.mode==="play"){$("heading").textContent="PAUZA";$("start").textContent="▶ KONTYNUUJ";mode("pause");}else if(state.mode==="pause")mode("play");};
for(const k of Object.keys(input)){const b=$(k),up=e=>{input[k]=false;b.classList.remove("pressed");if(e)e.preventDefault();};
 b.addEventListener("pointerdown",e=>{input[k]=true;b.classList.add("pressed");e.preventDefault();try{b.setPointerCapture(e.pointerId);}catch(_){}});
 for(const t of ["pointerup","pointercancel","lostpointercapture"])b.addEventListener(t,up);}
const keys={ArrowLeft:"left",a:"left",ArrowRight:"right",d:"right",ArrowDown:"brake",ArrowUp:"tuck",w:"tuck",Shift:"tuck"," ":"jump"};
window.addEventListener("keydown",e=>{const k=keys[e.key]||keys[e.key.toLowerCase()];if(k){input[k]=true;e.preventDefault();}else if(e.key==="Escape"&&state.mode==="play")$("pause").click();});
window.addEventListener("keyup",e=>{const k=keys[e.key]||keys[e.key.toLowerCase()];if(k){input[k]=false;e.preventDefault();}});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&state.mode==="play")$("pause").click();});
function animate(dt){
 if(state.mode!=="play")return;
 dt=clamp(dt,0,.055);state.time+=dt;
 const steer=Number(input.right)-Number(input.left),before=course(state.distance),ahead=course(Math.min(total,state.distance+6));
 const slope=clamp((before.y-ahead.y)/6,-.18,.65);
 state.speed=clamp(state.speed+dt*(5+slope*9-(input.tuck?.011:.022)*state.speed**2-(input.brake?18:0)),3,34);
 state.distance=Math.min(total,state.distance+state.speed*dt);
 const c=course(state.distance),next=course(Math.min(total,state.distance+3));
 state.lean+=(steer-state.lean)*clamp(dt*8.3,0,1);
 state.lane=clamp(state.lane+state.lean*state.speed*dt*(input.tuck?1.23:.83),-46,46);
 const tx=next.x-c.x,tz=next.z-c.z,mag=Math.max(.01,Math.hypot(tx,tz));
 const x=c.x+tz/mag*state.lane,z=c.z-tx/mag*state.lane;
 if(input.jump&&!state.jumpLatch&&!state.airborne&&state.jumpCooldown<=0){state.airborne=true;state.jumpV=8.4;state.jumpY=.01;state.jumpCooldown=.85;}
 state.jumpLatch=input.jump;state.jumpCooldown=Math.max(0,state.jumpCooldown-dt);
 if(state.airborne){state.jumpY+=state.jumpV*dt-9.4*dt*dt;state.jumpV-=18.8*dt;
  if(state.jumpY<=0){state.airborne=false;state.jumpY=0;state.jumpV=0;}}
 const y=height(x,z)+.26+state.jumpY;
 skier.position.copyFromFloats(x,y,z);skier.rotation.y=Math.atan2(tx,tz);
 skierController.animate({turn:state.lean,speed:state.speed,time:state.time,braking:input.brake,tuck:Number(input.tuck),airborne:state.airborne,dt,active:true,px:x,py:y,pz:z});
 const follow=V(x-tx/mag*19+3,y+19,z-tz/mag*19),look=V(x+tx/mag*16,y+1,z+tz/mag*16);
 camera.position=B.Vector3.Lerp(camera.position,follow,clamp(dt*4,0,1));
 camera.setTarget(B.Vector3.Lerp(camera.getTarget(),look,clamp(dt*4.5,0,1)));
 $("speed").textContent=Math.round(state.speed*3.6)+" km/h";
 $("distance").textContent=Math.round(state.distance)+" / "+Math.round(total)+" m";
 $("fill").style.width=(state.distance/total*100)+"%";
 if(state.distance>=total){$("heading").textContent="META";$("start").textContent="↻ JEDŹ PONOWNIE";mode("finish");}
}
let last=0,timer=0,frames=0;
engine.runRenderLoop(()=>{
 const now=performance.now(),dt=last?Math.min(.055,(now-last)/1000):1/60;last=now;animate(dt);
 for(let i=0;i<chairs.length;i++){
  const f=((i/chairs.length*2+state.time*.008)%2),reverse=f>1,q=lineAt(reverse?2-f:f);
  chairs[i].position.copyFrom(q);chairs[i].position.x+=(reverse?2.5:-2.5);chairs[i].rotation.y=reverse?Math.PI:0;
 }
 world.render();frames++;timer+=dt;if(timer>1.2){$("fps").textContent=Math.round(frames/timer)+" FPS · OPEN SKI MAP 1.0";timer=0;frames=0;}
});
window.addEventListener("resize",()=>engine.resize());
window.__SMR_DEBUG__={get:()=>({version:"1.0.0",mode:state.mode,distance:state.distance,sourceRunId:geo.source.run_id,terrainVertices:terrain.cols*terrain.rows,trees:geo.forest_trees.length,buildings:geo.buildings.length,chairs:chairs.length,routeMeters:total,runStartHeight:geo.reference.run_altitude_start_m,runEndHeight:geo.reference.run_altitude_end_m,airborne:state.airborne,widthMeasured:geo.reference.piste_width_measured_m,player:skier.position.asArray(),fps:Math.round(engine.getFps())}),scene:world,engine,reset};
reset();
})();