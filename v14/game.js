/* SnowEngine / SMR 1.4: multi-sector OpenSkiMap resort with smartphone controls. */
(async function(){
"use strict";
const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let geo,manifest,zone,chosenRun;
try{
 const search=new URLSearchParams(window.location.search);
 const m=await fetch("./data/index.json?v=1.4.0");if(!m.ok)throw Error("Missing resort index "+m.status);
 manifest=await m.json();
 zone=manifest.sectors.find(x=>x.id===search.get("zone"))||manifest.sectors[0];
 const res=await fetch(zone.scene+"?v=1.4.0");
 if(!res.ok)throw Error("Missing terrain zone "+zone.id);
 geo=await res.json();
 chosenRun=geo.runs.find(x=>x.ref===search.get("run"))||geo.runs.find(x=>x.ref===zone.defaultRun)||geo.runs[0];
 if(!chosenRun||!geo.lifts.length||geo.terrain.cols<30)throw Error("Invalid multi-sector map");
 geo.route=chosenRun.coordinates;
 geo.source.run_id=chosenRun.id;
 geo.reference.name=chosenRun.name;geo.reference.ref=chosenRun.ref;
 const zoneSelect=$("sectorSelect"),runSelect=$("runSelect");
 for(const entry of manifest.sectors){
  const option=document.createElement("option");option.value=entry.id;option.textContent=entry.short+" ("+entry.runs.length+" tras)";
  zoneSelect.appendChild(option);
 }
 zoneSelect.value=zone.id;
 for(const run of geo.runs){
  const opt=document.createElement("option");opt.value=run.ref;
  const grade=run.difficulty==="advanced"?"⚫":run.difficulty==="intermediate"?"🔴":"🔵";
  opt.textContent=grade+" "+run.ref+" · "+run.name;runSelect.appendChild(opt);
 }
 runSelect.value=chosenRun.ref;
 function navigate(id,ref){
  const u=new URL(window.location.href);u.searchParams.set("zone",id);u.searchParams.delete("run");
  if(ref)u.searchParams.set("run",ref);window.location.assign(u.toString());
 }
 zoneSelect.onchange=()=>navigate(zoneSelect.value,null);
 runSelect.onchange=()=>navigate(zone.id,runSelect.value);
 $("zoneName").textContent=zone.short;
 $("runName").textContent=chosenRun.ref+" · "+chosenRun.name;
 $("resortSummary").textContent=geo.runs.length+" tras • "+geo.lifts.length+" wyciągów • "+geo.forest_trees.length+" drzew";
 $("heading").textContent=chosenRun.name.toUpperCase();
}catch(e){$("error").hidden=false;$("error").textContent="Nie udało się uruchomić ośrodka: "+e.message;return;}
if(!window.SnowEngine||!window.SnowGeometry||!window.SMR_FREERIDE||!window.SMR_TRICKS){$("error").hidden=false;$("error").textContent="Brak modułu nowego renderera";return;}
let renderer;
try{renderer=new SnowEngine.SnowEngine($("scene"));}
catch(e){$("error").hidden=false;$("error").textContent="WebGL2 nie jest dostępny: "+e.message;return;}
const g=SnowGeometry,T=geo.terrain,route=geo.route;
function height(x,z){
 const u=clamp((x-T.x0)/T.step_x,0,T.cols-1.001),w=clamp((z-T.z0)/T.step_z,0,T.rows-1.001);
 const i=Math.floor(u),j=Math.floor(w),a=u-i,b=w-j,at=(i,j)=>T.heights[j*T.cols+i];
 return (1-b)*(at(i,j)*(1-a)+at(i+1,j)*a)+b*(at(i,j+1)*(1-a)+at(i+1,j+1)*a);
}
const lengths=[0];for(let i=1;i<route.length;i++){
 const a=route[i-1],b=route[i];lengths.push(lengths[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1]));}
const length=lengths[lengths.length-1];
function at(s){
 s=clamp(s,0,length);let i=1;while(i<lengths.length-1&&lengths[i]<s)i++;
 const a=route[i-1],b=route[i],d=Math.max(1e-4,lengths[i]-lengths[i-1]),t=(s-lengths[i-1])/d;
 return {x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,y:a[2]+(b[2]-a[2])*t,heading:Math.atan2(b[0]-a[0],b[1]-a[1])};
}
function nearestDistance(x,z){
 let best=Infinity;
 for(let i=1;i<route.length;i++){
  const a=route[i-1],b=route[i],dx=b[0]-a[0],dz=b[1]-a[1];
  const t=clamp(((x-a[0])*dx+(z-a[1])*dz)/Math.max(1e-6,dx*dx+dz*dz),0,1);
  best=Math.min(best,Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t));
 }return best;
}
const terrain=renderer.mesh("highland snowy terrain",g.terrain(geo,height),null,false);
const allTrees=geo.forest_trees;
const mobile=/Android|iPhone|Mobile/i.test(navigator.userAgent);
const trees=mobile?allTrees.filter((_,i)=>i%3!==0):allTrees;
const instance=[];
for(const [x,z,scale] of trees)instance.push(x,height(x,z),z,scale);
const spruce=renderer.mesh("snow-covered spruce forest",g.spruce(),instance,true);
const buildings=renderer.mesh("OSM buildings",g.buildings(geo,height),null,true);
const lifts=geo.lifts.map(line=>renderer.mesh("wyciąg "+line.ref,
 g.lift({...geo,lift_b1:line.coordinates},height),null,true));
const stations=renderer.mesh("starty tras i stacje wyciągów",
 g.resortObjects(geo,height),null,true);
const skier=renderer.mesh("carving skier",g.skier(),null,true);
const npcInstances=[];
for(let i=0;i<13;i++){const p=at(90+(i*117)%Math.max(200,length-90));npcInstances.push(p.x,height(p.x,p.z),p.z,.83);}
const npc=renderer.mesh("NPC skiers",g.skier(),npcInstances,true);

const snowParticleBuilder=g.builder();
snowParticleBuilder.quad([-.25,0,0],[.25,0,0],[.25,.55,0],[-.25,.55,0],[.98,.99,1],true);
snowParticleBuilder.quad([0,0,-.25],[0,0,.25],[0,.55,.25],[0,.55,-.25],[.88,.93,.99],true);
const particles=Array.from({length:85},()=>({x:0,y:-900,z:0,age:99,vx:0,vy:0,vz:0,scale:.1}));
const sprayMesh=renderer.mesh("carving powder spray",snowParticleBuilder.done(),Array.from({length:85},()=>[0,-900,0,.01]).flat(),false);
let sprayAccumulator=0;
function updateSnowSpray(dt){
 for(const p of particles){
  if(p.age<.95){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=2.5*dt;}
 }
 if(!state.airborne&&state.speed>8){
  const density=state.speed*(Math.abs(state.steer)*.65+(input.accelerate?.35:.15));
  sprayAccumulator+=dt*density*1.75;
  while(sprayAccumulator>=1){
   sprayAccumulator-=1;
   const p=particles.find(v=>v.age>.95);
   if(!p)break;
   const side=Math.cos(state.heading),sideZ=-Math.sin(state.heading);
   const backwards=Math.sin(state.heading),backZ=Math.cos(state.heading);
   const angle=(Math.random()-.5),sign=Math.random()<.5?-1:1;
   p.x=state.x+sign*.45*side-backwards*.8;p.z=state.z+sign*.45*sideZ-backZ*.8;
   p.y=height(p.x,p.z)+.16;p.vx=side*(angle*7+sign*1.5)-backwards*2;
   p.vz=sideZ*(angle*7+sign*1.5)-backZ*2;p.vy=1.2+Math.random()*3.2;
   p.age=0;p.scale=.3+Math.random()*.7;
  }
 } else sprayAccumulator=0;
 renderer.updateInstances(sprayMesh,particles.flatMap(p=>[p.x,p.age>.95?-900:p.y,p.z,p.scale*Math.max(.03,1-p.age/.95)]));
}

const chairBuilder=g.builder();
chairBuilder.box(0,-4.4,0,3.2,.22,1,[.28,.41,.49]);
chairBuilder.box(0,-4.2,.52,3.2,1.1,.22,[.29,.42,.5]);
chairBuilder.box(0,-2.35,0,.15,4.1,.15,[.36,.48,.52]);
const liftLayout=geo.lifts.map(line=>{
 const p=line.coordinates;
 const meters=p.slice(1).reduce((sum,v,i)=>sum+Math.hypot(v[0]-p[i][0],v[1]-p[i][1]),0);
 return {path:p,count:Math.max(5,Math.min(15,Math.round(meters/135)))};
});
const totalChairs=liftLayout.reduce((s,x)=>s+x.count,0);
const chairInstances=[];
for(let i=0;i<totalChairs;i++)chairInstances.push(0,-900,0,1);
const chairs=renderer.mesh("krzesełka na wszystkich wyciągach",chairBuilder.done(),chairInstances,true);
function chairAt(path,t){
 const n=path.length-1,f=clamp(t,0,1)*n,i=Math.min(n-1,Math.floor(f)),
 a=path[i],b=path[i+1],u=f-i;
 return [a[0]+(b[0]-a[0])*u,a[2]+(b[2]-a[2])*u+16,a[1]+(b[1]-a[1])*u];
}
const bounds={xMin:T.x0,xMax:T.x0+(T.cols-1)*T.step_x,zMin:T.z0,zMax:T.z0+(T.rows-1)*T.step_z};
const spawn={x:route[0][0],z:route[0][1],heading:at(10).heading};
const ride=SMR_FREERIDE.createRide({height,bounds,spawn,closestDistance:nearestDistance});
const state=ride.state,input={left:false,right:false,accelerate:false,jump:false};
const tricks=SMR_TRICKS.createTricks();const trickState=tricks.state;
let mode="menu",aerial=true,zoom=1,timer=0,frames=0,last=0,toastUntil=0,lastTrickLabel="";
let cam=[spawn.x-40,height(spawn.x,spawn.z)+140,spawn.z-110],target=[spawn.x,height(spawn.x,spawn.z),spawn.z+25];
function changeMode(m){mode=m;$("overlay").hidden=m==="play";document.body.classList.toggle("playing",m==="play");}
function reset(){
 ride.reset();tricks.reset();skier.yaw=0;for(const k in input)input[k]=false;cam=[state.x-45,state.groundY+140,state.z-110];
 target=[state.x,state.groundY,state.z+25];traceLeft.length=0;traceRight.length=0;
}
$("start").onclick=()=>{if(mode!=="pause")reset();changeMode("play");};
$("resortMenu").onclick=()=>{$("heading").textContent=chosenRun.name.toUpperCase();
 $("start").textContent="▶ KONTYNUUJ";changeMode("pause");};
$("pause").onclick=()=>{if(mode==="play"){$("heading").textContent="PAUZA";$("start").textContent="▶ KONTYNUUJ";changeMode("pause");}else if(mode==="pause")changeMode("play");};
$("camera").onclick=()=>{aerial=!aerial;$("camera").textContent=aerial?"KAMERA: LOT":"KAMERA: BLISKO";};
$("zoomIn").onclick=()=>zoom=clamp(zoom*.78,.47,2.3);
$("zoomOut").onclick=()=>zoom=clamp(zoom*1.27,.47,2.3);
for(const key in input){
 const b=$(key);
 if(!b)throw Error("Missing mobile control "+key);
 b.addEventListener("pointerdown",e=>{input[key]=true;b.classList.add("pressed");e.preventDefault();try{b.setPointerCapture(e.pointerId);}catch(_){}});
 for(const ev of ["pointerup","pointercancel","lostpointercapture"])b.addEventListener(ev,e=>{input[key]=false;b.classList.remove("pressed");e.preventDefault();});
}
const keys={ArrowLeft:"left",a:"left",ArrowRight:"right",d:"right",ArrowUp:"accelerate",w:"accelerate",Shift:"accelerate"," ":"jump"};
window.addEventListener("keydown",e=>{const key=keys[e.key]||keys[e.key.toLowerCase()];if(key){input[key]=true;e.preventDefault();}
 if(e.key==="c")$("camera").click();if(e.key==="=")$("zoomIn").click();if(e.key==="-")$("zoomOut").click();
 if(e.key==="Escape")$("pause").click();});
window.addEventListener("keyup",e=>{const key=keys[e.key]||keys[e.key.toLowerCase()];if(key){input[key]=false;e.preventDefault();}});
window.addEventListener("blur",()=>{for(const k in input)input[k]=false;});
const traceLeft=[],traceRight=[];
const trailShape=g.builder();
const CAP=220;
for(let i=0;i<CAP-1;i++){
 // Immutable local ribbon geometry; dynamic trail positions use GPU instance offsets.
 const step=i*.23;
 trailShape.quad([-.13,.04,step],[.13,.04,step],[.13,.04,step+.25],[-.13,.04,step+.25],[.48,.63,.70],true);
}
const traceMeshes=[];
const trailInstancesL=[],trailInstancesR=[];
for(let i=0;i<CAP;i++){trailInstancesL.push(0,-900,0,.001);trailInstancesR.push(0,-900,0,.001);}
 // Two long-lived world-space strips are streamed at low cost.
const trailUnit=g.builder();trailUnit.box(0,0,0,.18,.025,.45,[.45,.63,.74]);
traceMeshes.push(renderer.mesh("left ski tracks",trailUnit.done(),trailInstancesL,false));
traceMeshes.push(renderer.mesh("right ski tracks",trailUnit.done(),trailInstancesR,false));
let traceClock=0;
function updateTracks(dt){
 traceClock+=dt;if(traceClock<.08||state.airborne||state.speed<4)return;traceClock=0;
 const sideX=Math.cos(state.heading),sideZ=-Math.sin(state.heading),backX=Math.sin(state.heading),backZ=Math.cos(state.heading);
 for(const [sign,list] of [[-1,traceLeft],[1,traceRight]]){
  const x=state.x+sideX*.32*sign-backX*.65,z=state.z+sideZ*.32*sign-backZ*.65;
  list.push([x,height(x,z)+.10,z,.95]);if(list.length>CAP)list.shift();
 }
 for(const [k,list] of [[0,traceLeft],[1,traceRight]]){
  const instances=[];for(let i=0;i<CAP;i++){const p=list[i]||[0,-900,0,.001];instances.push(...p);}
  renderer.updateInstances(traceMeshes[k],instances);
 }
}
function updateNPCs(){
 const inst=[];for(let i=0;i<13;i++){const p=at(50+(i*128+state.time*(7+i%3))%Math.max(120,length-20));
  inst.push(p.x+Math.sin(state.time*1.0+i)*5,height(p.x,p.z),p.z,.82);}
 renderer.updateInstances(npc,inst);
}
function updateChairs(){
 const inst=[];
 for(const entry of liftLayout){
  for(let i=0;i<entry.count;i++){
   const t=(i/entry.count*2+state.time*.009)%2,side=t>1?2-t:t;
   const p=chairAt(entry.path,side);
   inst.push(p[0]+(t>1?2:-2),p[1],p[2],1);
  }
 }
 renderer.updateInstances(chairs,inst);
}
function frame(dt){
 if(mode!=="play")return;
 ride.step(input,dt);
 tricks.update(state,input,dt);
 skier.offset=[state.x,state.groundY+.13+state.jumpY,state.z];
 skier.yaw=state.heading+trickState.yaw;
 if(trickState.lastResult&&trickState.lastResult!==lastTrickLabel){
   lastTrickLabel=trickState.lastResult;
   $("trickToast").textContent=trickState.lastResult;
   $("trickToast").classList.add("visible");
   toastUntil=state.time+1.8;
 }
 if(state.time>toastUntil)$("trickToast").classList.remove("visible");
 updateTracks(dt);updateSnowSpray(dt);updateNPCs();updateChairs();
 const dx=Math.sin(state.heading),dz=Math.cos(state.heading),aerialDistance=(aerial?95:26)*zoom,heightOffset=(aerial?140:20)*zoom;
 const desired=[state.x-dx*aerialDistance+aerialDistance*.07,state.groundY+heightOffset,state.z-dz*aerialDistance];
 const look=[state.x+dx*(aerial?20:12),state.groundY+state.jumpY*.2,state.z+dz*(aerial?20:12)];
 const factor=1-Math.exp(-dt*3.2);
 for(let i=0;i<3;i++){cam[i]+=(desired[i]-cam[i])*factor;target[i]+=(look[i]-target[i])*factor;}
 $("clock").textContent=Math.floor(state.time/60)+":"+String(Math.floor(state.time%60)).padStart(2,"0");
 $("speed").textContent=Math.round(state.speed*3.6)+" km/h";
 $("distance").textContent=(state.offPiste?"FREERIDE":"TRASA")+" · "+Math.round(state.edgeDistance)+" m od osi";
}
function tick(now){
 const dt=last?clamp((now-last)/1000,0,.05):1/60;last=now;
 frame(dt);renderer.render(cam,target);
 timer+=dt;frames++;
 if(timer>1){$("fps").textContent=Math.round(frames/timer)+" FPS · WEBGL2";timer=0;frames=0;}
 requestAnimationFrame(tick);
}
reset();skier.offset=[state.x,state.groundY+.13,state.z];updateNPCs();updateChairs();
window.__SMR_DEBUG__={get:()=>({version:"1.4.0",engine:"SnowEngine WebGL2",noBabylon:typeof window.BABYLON==="undefined",
 mode,freeTerrain:true,zone:zone.id,runRef:chosenRun.ref,
 resortRunCount:geo.runs.length,resortLiftCount:geo.lifts.length,
 resortTrees:geo.forest_trees.length,resortBuildings:geo.buildings.length,
 x:state.x,z:state.z,heading:state.heading,speed:state.speed,airborne:state.airborne,
 controls:{left:input.left,right:input.right,accelerate:input.accelerate,jump:input.jump},
 spinYaw:trickState.yaw,skierYaw:skier.yaw,trickDirection:trickState.direction,
 trickActive:trickState.active,trickCompleted:trickState.completedCount,trickScore:trickState.score,lastTrick:trickState.lastResult,
 trees:trees.length,terrainVertices:T.cols*T.rows,chairs:totalChairs,npcs:13,snowParticles:particles.filter(p=>p.age<.95).length,trailPoints:traceLeft.length,
 camera:aerial?"aerial":"close",zoom,widthMeasured:geo.reference.piste_width_measured_m,
 webgl2:!!renderer.gl,shadowMap:renderer.shadowReady,sourceRunId:geo.source.run_id,frame:renderer.frame}),renderer,ride};
requestAnimationFrame(tick);
})();