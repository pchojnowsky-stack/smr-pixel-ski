/* SnowEngine 1.6: original photo-referenced lift vehicle silhouettes and distance-based motion.
   Geometry is illustrative. A1 gondola (10-seat), B* chairlifts and C10 surface lift. */
(function(){
"use strict";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function create(g,renderer,lifts){
 function makeVehicle(type){
  const b=g.builder(),steel=[.34,.42,.48],dark=[.15,.20,.25],window=[.24,.40,.47],yellow=[.89,.68,.17],seat=[.18,.27,.32];
  if(type==="gondola"){
   // Rounded-by-panels dark 10-person cabin, yellow upper frame and panoramic windows.
   b.box(0,-4.05,0,3.2,.34,2.25,dark);
   b.box(0,-1.58,0,3.28,.40,2.34,yellow);
   b.box(0,-3.73,0,3.02,2.1,2.05,window);
   for(const side of [-1,1]){
    b.box(side*1.54,-3.72,0,.15,2.24,2.1,yellow);
    b.box(0,-3.55,side*1.10,3.0,2.30,.13,yellow);
   }
   for(const x of [-.92,0,.92]){
    b.box(x,-3.74,-1.18,.13,2.16,.13,dark);
    b.box(x,-3.74,1.18,.13,2.16,.13,dark);
   }
   b.box(0,-1.22,0,.26,1.05,.27,steel);
   b.box(0,-.26,0,1.15,.26,.8,dark);
  }else if(type==="drag"){
   b.box(0,-1.65,0,.12,3.2,.12,steel);
   b.box(0,-3.6,.13,1.75,.16,.18,dark);
   b.box(-.82,-3.72,.13,.15,.35,.15,dark);
   b.box(.82,-3.72,.13,.15,.35,.15,dark);
   b.box(0,-.21,0,.55,.24,.28,dark);
  }else{
   const isFour=type==="chair4",width=isFour?2.50:3.65;
   b.box(0,-3.90,0,width,.28,1.23,seat);
   b.box(0,-3.62,.56,width,1.21,.18,seat);
   b.box(0,-3.18,-.58,width,.12,.18,yellow);
   b.box(0,-1.73,0,.20,3.85,.19,steel);
   b.box(0,-.35,0,.62,.26,.36,dark);
   for(let x=-width/2+.26;x<width/2;x+=.60){
    b.box(x,-3.54,.64,.065,.92,.10,[.27,.36,.41]);
    b.box(x,-3.89,-.08,.43,.12,.67,[.38,.43,.45]);
   }
   // Canopy shape inspired by covered SMR chairs: long yellow lid.
   if(!isFour){
    b.box(0,-2.86,-.10,width+.23,.23,1.64,yellow);
    b.box(0,-2.10,.62,width+.12,.12,1.12,yellow);
   }
  }
  return b.done();
 }
 const types={gondola:"A1",chair6:"B1/B2",chair4:"B3/B4",drag:"C10"};
 const paths=lifts.map(line=>{
  const p=line.coordinates,cumulative=[0];
  for(let i=1;i<p.length;i++)cumulative.push(cumulative.at(-1)+Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]));
  const total=Math.max(1,cumulative.at(-1)),type=line.ref==="A1"?"gondola":line.ref==="C10"?"drag":(["B3","B4"].includes(line.ref)?"chair4":"chair6");
  const count=Math.max(4,Math.min(type==="drag"?17:14,Math.round(total/(type==="drag"?68:130))));
  return {name:line.ref,type,p,cumulative,total,count};
 });
 const meshes={};
 for(const type of ["gondola","chair6","chair4","drag"]){
  const count=paths.filter(p=>p.type===type).reduce((sum,p)=>sum+p.count,0);
  if(!count)continue;
  const arr=Array.from({length:count},()=>[0,-900,0,.01]).flat();
  meshes[type]=renderer.mesh("realistic "+type+" lift vehicles",makeVehicle(type),arr,false);
 }
 function sample(path,meters){
  const target=clamp(meters,0,path.total),L=path.cumulative;
  let i=1;while(i<L.length-1&&L[i]<target)i++;
  const t=(target-L[i-1])/Math.max(.001,L[i]-L[i-1]),a=path.p[i-1],b=path.p[i];
  return {x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,y:a[2]+(b[2]-a[2])*t};
 }
 function update(time){
  const list={gondola:[],chair6:[],chair4:[],drag:[]};
  for(const entry of paths){
   const off=entry.type==="drag"?1.35:3.2,heightOffset=entry.type==="drag"?7:entry.type==="gondola"?22:17;
   for(let i=0;i<entry.count;i++){
    // Piecewise out/back motion, with lane displacement pinched to zero at turnaround.
    const t=((time*(entry.type==="drag"?2.65:3.2)/entry.total)+i/entry.count)%1,
      reverse=t>=.5,progress=reverse?2-2*t:2*t,
      p=sample(entry,progress*entry.total),
      tang=sample(entry,clamp(progress*entry.total+(reverse?-1:1)*5,0,entry.total));
    let vx=tang.x-p.x,vz=tang.z-p.z,len=Math.hypot(vx,vz);
    if(len<.01){const a=entry.p[0],b=entry.p[1];vx=b[0]-a[0];vz=b[1]-a[1];len=Math.hypot(vx,vz)||1;}
    const lane=(reverse?1:-1)*off*Math.min(1,Math.sin(Math.PI*progress)*7);
    list[entry.type].push(p.x-vz/len*lane,p.y+heightOffset,p.z+vx/len*lane,1);
   }
  }
  for(const type of Object.keys(meshes))renderer.updateInstances(meshes[type],list[type]);
 }
 const totals=paths.reduce((out,p)=>{out[p.type]=(out[p.type]||0)+p.count;return out;},{});
 return {update,counts:totals,total:paths.reduce((n,p)=>n+p.count,0),types:paths.map(p=>({ref:p.name,type:p.type,count:p.count}))};
}
window.SnowVehicles={create};
})();