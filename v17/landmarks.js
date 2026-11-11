/* SnowEngine 1.7: authored geometric reconstructions from documented resort visual cues.
   OSM anchors + photographed facade features, NOT 1:1 surveyed/fotogrammetric models. */
(function(){
"use strict";
const wood=[.46,.29,.16],timber=[.34,.23,.16],dark=[.16,.20,.23],black=[.12,.15,.18],
      glazing=[.17,.36,.44],glint=[.31,.54,.59],stone=[.42,.44,.43],snow=[.86,.92,.97],metal=[.39,.46,.48],amber=[.85,.58,.12];
function create(geo,height,g,renderer){
 const b=g.builder(),locations=[];
 const addBox=(x,z,y,w,h,d,color)=>b.box(x,y,z,w,h,d,color);
 function line(x,z,y,X,Z,Y,thickness,color){
  const dx=X-x,dz=Z-z,len=Math.hypot(dx,dz)||1,nx=-dz/len*thickness/2,nz=dx/len*thickness/2;
  b.quad([x+nx,y,z+nz],[x-nx,y,z-nz],[X-nx,Y,Z-nz],[X+nx,Y,Z+nz],color,true);
 }
 function roof(x,z,y,w,d,rise,col){
  const ridge=y+rise,front=z-d/2,back=z+d/2,l=x-w/2,r=x+w/2;
  b.quad([l,y,front],[r,y,front],[r-w*.15,ridge,z],[l+w*.15,ridge,z],col,true);
  b.quad([l+w*.15,ridge,z],[r-w*.15,ridge,z],[r,y,back],[l,y,back],col,true);
  b.triangle([l,y,front],[l+w*.15,ridge,z],[l,y,back],col,true);
  b.triangle([r,y,back],[r-w*.15,ridge,z],[r,y,front],col,true);
  line(l,front,y,r,front,y,.36,snow);line(l,back,y,r,back,y,.36,snow);
 }
 function glazingWall(x,z,y,w,h,forward=true){
  addBox(x,z,y,w,h,.20,glazing);
  for(let i=0;i<=Math.ceil(w/2.2);i++){
   const xx=x-w/2+w*i/Math.ceil(w/2.2);
   addBox(xx,z-.13,y,.13,h,.16,black);
  }
  addBox(x,z-.15,y+h*.65,w,.12,.17,black);
  addBox(x,z-.14,y+h*.30,w,.10,.17,black);
  // angled reflected highlights with tempered shades, not transparent shader
  for(let i=0;i<Math.floor(w/4);i++)addBox(x-w*.35+i*3.5,z-.16,y+h*.64,.46,h*.23,.035,glint);
 }
 function lodge(){
  // OSM way/657912056 is 26m from top B1; landmark attribution is a visual hypothesis.
  const o=geo.buildings.find(x=>x.id==="way/657912056");
  if(!o)return;
  const xs=o.p.map(p=>p[0]),zs=o.p.map(p=>p[1]),
        x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2,
        w=Math.max(12,Math.max(...xs)-Math.min(...xs)),d=Math.max(14,Math.max(...zs)-Math.min(...zs)),
        y=height(x,z)+.25;
  // Mountain restaurant silhouette: stone plinth, warm timber/slat upper storey, glazing and terrace.
  addBox(x,z,y,w,1.25,d,stone);
  addBox(x,z,y+1.22,w,4.05,d,wood);
  addBox(x,z-d*.505,y+1.3,w*.84,3.6,.24,glazing);
  glazingWall(x,z-d*.51,y+1.38,w*.79,3.28);
  const ribs=Math.max(10,Math.floor(w/.9));
  for(let j=0;j<ribs;j++){
   const xx=x-w/2+.3+(w-.6)*j/(ribs-1);
   addBox(xx,z+d*.50,y+1.15,.13,3.95,.17,timber);
  }
  roof(x,z,y+5.25,w+2.0,d+2.6,1.83,dark);
  // A broad raised terrace at the south-facing panorama, railing, posts and small tables.
  const tz=z-d*.68-4,tw=w+6,depth=8.0,ty=y+1.50;
  addBox(x,tz,ty-.23,tw,.29,depth,wood);
  for(const xx of [x-tw*.45,x-tw*.15,x+tw*.15,x+tw*.45]){
   addBox(xx,tz-depth*.34,ty-1.5,.38,1.55,.38,stone);
   addBox(xx,tz-depth*.48,ty,.13,1.22,.14,metal);
  }
  addBox(x,tz-depth*.48,ty+1.18,tw*.94,.13,.17,metal);
  for(let k=-2;k<=2;k++){
   const tx=x+k*tw/6,tzz=tz+(k%2)*2;
   addBox(tx,tzz,ty+.70,1.45,.12,1.45,[.44,.32,.23]);
   addBox(tx,tzz,ty+.14,.15,.55,.15,black);
   for(const side of [-1,1])addBox(tx+side*.88,tzz,ty+.13,.22,.72,.7,wood);
  }
  // Hanging sign treatment with yellow brand fascia.
  addBox(x,z-d*.51-.35,y+4.0,w*.37,.62,.14,[.82,.57,.14]);
  locations.push({id:"kuflonka-inspired",x,z,anchor:o.id,reference:"photo-informed, OSM footprint candidate",model:"timber glazed lodge + terrace"});
 }
 function gondolaTerminal(ref,index){
  const lineData=geo.lifts.find(l=>l.ref===ref);if(!lineData)return;
  const p=lineData.coordinates[index===0?0:lineData.coordinates.length-1],x=p[0],z=p[1],
        y=height(x,z),isBase=index===0,w=isBase?24:19,d=isBase?33:23,h=isBase?8.7:7.8;
  // dark metal/charcoal box station with sheltered curved roof and large entry portal
  addBox(x,z,y,w,1.45,d,stone);addBox(x,z,y+1.45,w-1.0,h-2,d-1.8,[.29,.34,.35]);
  addBox(x,z-d*.46,y+2.15,w*.79,h-3.6,.20,glazing);
  for(let k=-4;k<=4;k++)addBox(x+k*w*.079,z-d*.465,y+2.06,.15,h-3.35,.19,black);
  for(let k=-3;k<=3;k++)addBox(x+k*w*.1,z-d*.47,y+3.85,w*.008,.20,.22,metal);
  // raised high central roof with side eaves and machine housing
  addBox(x,z,y+h-.52,w+4,1.0,d+5,dark);
  addBox(x,z,y+h+.48,w*.39,1.80,d*.74,black);
  for(const side of [-1,1]){
   addBox(x+side*(w*.49),z,y+1.2,.24,h-1,.24,metal);
   addBox(x+side*(w*.43),z+d*.38,y+1.4,1.2,4.1,.28,metal);
  }
  // entry barrier, turnstile posts and numbered boarding approach
  for(let k=-3;k<=3;k++){
   const xx=x+k*2.5;
   addBox(xx,z-d*.64,y+.32,.18,1.1,.18,black);
   addBox(xx,z-d*.64-.48,y+1.4,1.05,.16,.18,metal);
  }
  addBox(x,z-d*.56,y+3.55,w*.6,.64,.22,amber);
  // cable/drive sheave above the platform, represented by segmented steel assembly
  const driveY=y+h+1.45;
  for(let i=0;i<12;i++){
   const a=i*Math.PI/6,c=(i+1)*Math.PI/6;
   line(x+Math.cos(a)*2.1,z+Math.sin(a)*2.1,driveY,x+Math.cos(c)*2.1,z+Math.sin(c)*2.1,driveY,.17,metal);
  }
  // base terminal has more ticket/rental modules than compact top station
  if(isBase){
   for(let i=0;i<3;i++){
    const tx=x-w*.3+i*w*.3,zz=z+d*.65;
    addBox(tx,zz,y+1.0,4.2,3.6,4.0,wood);
    addBox(tx,zz-2.09,y+1.62,3.4,2.05,.15,glazing);
    addBox(tx,zz,y+4.55,4.9,.37,4.7,dark);
   }
  }
  locations.push({id:"A1-"+(isBase?"base":"upper"),x,z,reference:"photo-informed lift station",model:"dark metal/glass terminal + boarding"});
 }
 function terminalB1(){
  const lineData=geo.lifts.find(l=>l.ref==="B1");if(!lineData)return;
  for(const i of [0,lineData.coordinates.length-1]){
   const p=lineData.coordinates[i],x=p[0],z=p[1],y=height(x,z);
   addBox(x,z,y+1.4,13,3.5,17,[.31,.37,.40]);
   addBox(x,z,y+4.8,15,1.3,19,dark);
   for(const side of [-1,1])addBox(x+side*5,z,y+2.5,.21,3.0,11,metal);
   for(let j=-2;j<=2;j++)addBox(x+j*2.1,z-8.65,y+1.6,.16,2.0,.12,amber);
  }
  locations.push({id:"B1-terminal-pair",reference:"photo-inspired scale",model:"covered six-seat chair terminal"});
 }
 if(geo.id==="hala"){lodge();gondolaTerminal("A1",0);gondolaTerminal("A1",1);terminalB1();}
 const shape=b.done();
 const mesh=renderer.mesh("photo-guided authored resort landmarks",shape,null,true);
 return {mesh,locations,vertices:shape.positions.length/3};
}
window.SnowLandmarks={create,version:"1.7.0"};
})();