/* SnowEngine original procedural geometry. */
(function(){
"use strict";
function builder(){
 const P=[],N=[],C=[],I=[];
 function triangle(a,b,c,color,twosided=false){
  const u=b.map((x,i)=>x-a[i]),v=c.map((x,i)=>x-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n)||1;
  const normal=n.map(q=>q/len),base=P.length/3;
  for(const p of [a,b,c]){P.push(...p);N.push(...normal);C.push(...color);}I.push(base,base+1,base+2);
  if(twosided){const start=P.length/3;for(const p of [c,b,a]){P.push(...p);N.push(...normal.map(x=>-x));C.push(...color);}I.push(start,start+1,start+2);}
 }
 function quad(a,b,c,d,color,twosided=false){triangle(a,b,c,color,twosided);triangle(a,c,d,color,twosided);}
 function box(x,y,z,w,h,d,color){
  const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2],
   A=[a[0],y+h,a[2]],B=[b[0],y+h,b[2]],D=[c[0],y+h,c[2]],E=[e[0],y+h,e[2]];
  quad(a,e,E,A,color);quad(b,B,D,c,color);quad(a,A,B,b,color);quad(e,c,D,E,color);quad(A,E,D,B,color);quad(a,b,c,e,color);
 }
 return {triangle,quad,box,done:()=>({positions:P,normals:N,colors:C,indices:I})};
}
function terrain(geo,height){
 const T=geo.terrain,P=[],N=[],C=[],I=[],groom=T.groom||[],W=T.cols,H=T.rows;
 const sample=(i,j)=>T.heights[Math.max(0,Math.min(H-1,j))*W+Math.max(0,Math.min(W-1,i))];
 // Position heights are source DEM; only normals and surface appearance are refined.
 for(let j=0;j<H;j++)for(let i=0;i<W;i++){
  const x=T.x0+i*T.step_x,z=T.z0+j*T.step_z,y=sample(i,j);
  const dx=(sample(i+1,j)-sample(i-1,j))/(T.step_x*(i===0||i===W-1?1:2)),
        dz=(sample(i,j+1)-sample(i,j-1))/(T.step_z*(j===0||j===H-1?1:2));
  const normal=[-dx,1,-dz],len=Math.hypot(...normal),slope=Math.atan(Math.hypot(dx,dz));
  const smoothGroom=Math.max(0,Math.min(1,groom[j*W+i]??.18));
  const ridge=Math.pow(Math.max(0,Math.sin(x*.037+z*.024)*Math.cos(z*.051-x*.022)),4);
  const micro=.009*Math.sin(x*.31+z*.19)+.008*Math.sin(z*.11-x*.09);
  const blueShade=Math.min(.10,slope*.13)+(.02*(1-smoothGroom));
  const r=.915+.038*smoothGroom-blueShade*.68+micro-ridge*.009,
        g=.941+.030*smoothGroom-blueShade*.38+micro*.72,
        b=.974+.023*smoothGroom+blueShade*.20+micro*.4;
  P.push(x,y,z);N.push(normal[0]/len,normal[1]/len,normal[2]/len);
  C.push(Math.max(.65,Math.min(1,r)),Math.max(.69,Math.min(1,g)),Math.max(.75,Math.min(1,b)));
 }
 for(let j=0;j<H-1;j++)for(let i=0;i<W-1;i++){
  const a=j*W+i,b=a+1,c=a+W,d=c+1;I.push(a,c,b,b,c,d);
 }
 return {positions:P,normals:N,colors:C,indices:I};
}
function spruce(){
 const b=builder(),green=[[.055,.23,.19],[.075,.27,.21],[.087,.31,.24],[.05,.20,.17]],snow=[[.85,.92,.975],[.93,.96,1],[.75,.86,.94]];
 for(let j=0;j<10;j++){
  const a=j*Math.PI/5,c=(j+1)*Math.PI/5;
  b.quad([Math.cos(a)*.32,0,Math.sin(a)*.32],[Math.cos(c)*.32,0,Math.sin(c)*.32],
   [Math.cos(c)*.21,5,Math.sin(c)*.21],[Math.cos(a)*.21,5,Math.sin(a)*.21],[.29,.235,.205]);
 }
 for(let level=0;level<10;level++){
  const y=1.55+level*1.55,span=6.35-level*.56;
  for(let j=0;j<8;j++){
   const a=(j+level*.28)*Math.PI/4,dx=Math.cos(a),dz=Math.sin(a),tx=-dz,tz=dx,width=span*.26,g=green[(j+level)%4];
   const root1=[dx*.4+tx*width,y+.3,dz*.4+tz*width],root2=[dx*.4-tx*width,y+.3,dz*.4-tz*width],tip=[dx*span,y-.7,dz*span],crest=[dx*.11,y+1.4,dz*.11];
   b.triangle(root1,crest,tip,g,true);b.triangle(root2,tip,crest,g,true);
   if((j+level)%3!==0)b.triangle([dx*.5+tx*width*.7,y+.4,dz*.5+tz*width*.7],
    [dx*.5-tx*width*.7,y+.4,dz*.5-tz*width*.7],[dx*span*.84,y+.09,dz*span*.84],snow[(j+level)%3],true);
  }
 }
 for(let j=0;j<9;j++){const a=j*2*Math.PI/9,c=(j+1)*2*Math.PI/9;
  b.triangle([Math.cos(a)*.2,15.5,Math.sin(a)*.2],[Math.cos(c)*.2,15.5,Math.sin(c)*.2],[0,18.8,0],green[j%4],true);
 }return b.done();
}
function buildings(geo,height){
 const b=builder(),lifts=geo.lifts||[],runs=geo.runs||[],info={total:0,detailed:0,flagships:0,windowPanels:0};
 const forestLodge=new Set(["way/657912056","way/600794855"]);
 const clamp=(v,a,c)=>Math.max(a,Math.min(c,v));
 function nearInfrastructure(x,z){
  let best=1e9;
  for(const lift of lifts)for(const p of [lift.coordinates[0],lift.coordinates[lift.coordinates.length-1]])
   best=Math.min(best,Math.hypot(x-p[0],z-p[1]));
  for(const run of runs)for(let i=0;i<run.coordinates.length;i+=Math.max(1,Math.floor(run.coordinates.length/22))){
   const p=run.coordinates[i];best=Math.min(best,Math.hypot(x-p[0],z-p[1]));
  }
  return best;
 }
 function orientedPanel(a,c,yBottom,yTop,color,offset=.065){
  const dx=c[0]-a[0],dz=c[1]-a[1],len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len;
  b.quad([a[0]+nx*offset,yBottom,a[1]+nz*offset],
   [c[0]+nx*offset,yBottom,c[1]+nz*offset],
   [c[0]+nx*offset,yTop,c[1]+nz*offset],
   [a[0]+nx*offset,yTop,a[1]+nz*offset],color,true);
 }
 for(const o of geo.buildings||[]){
  if(geo.id==="hala"&&o.id==="way/657912056")continue; // custom photo-guided lodge in landmarks.js
  if(!o.p||o.p.length<3)continue;const footprint=o.p,ct=footprint.length,
   x=footprint.reduce((sum,p)=>sum+p[0],0)/ct,z=footprint.reduce((sum,p)=>sum+p[1],0)/ct;
  const dist=nearInfrastructure(x,z),feature=forestLodge.has(o.id);
  const detail=dist<165||feature,h=clamp(o.height||6,4.4,11),baseY=height(x,z)-.22;
  const warm=feature?[.41,.30,.23]:detail?[.53,.39,.27]:[.52,.45,.38],
        roof=[.20,.25,.29],trim=[.28,.32,.33],glass=[.24,.43,.50],stone=[.40,.43,.43];
  info.total++;if(detail)info.detailed++;if(feature)info.flagships++;
  // Facades follow mapped OSM polygons, not their bounding rectangular envelopes.
  for(let k=0;k<ct;k++){
   const a=footprint[k],c=footprint[(k+1)%ct],length=Math.hypot(c[0]-a[0],c[1]-a[1]);
   if(length<.2)continue;
   b.quad([a[0],baseY,a[1]],[c[0],baseY,c[1]],
    [c[0],baseY+h,c[1]],[a[0],baseY+h,a[1]],warm,true);
   if(detail&&length>3){
    orientedPanel(a,c,baseY+.18,baseY+.76,stone,.11);
    for(let level=.95;level<h-1.1;level+=.58)orientedPanel(a,c,baseY+level,baseY+level+.065,trim,.105);
    const count=Math.min(6,Math.floor(length/3.6));
    if(count){
     const dx=(c[0]-a[0]),dz=(c[1]-a[1]);
     for(let t=0;t<count;t++){
      const u=(t+.20)/count,v=(t+.80)/count;
      const from=[a[0]+dx*u,a[1]+dz*u],to=[a[0]+dx*v,a[1]+dz*v];
      orientedPanel(from,to,baseY+h*.34,baseY+h*.78,glass,.15);
      orientedPanel(from,to,baseY+h*.34+.12,baseY+h*.34+.20,trim,.17);
      info.windowPanels++;
     }
    }
   }
  }
  // Hipped roof aligned with actual perimeter; no oversized box overhang.
  const apex=[x,baseY+h+Math.min(3.1,Math.max(1.2,h*.31)),z];
  for(let k=0;k<ct;k++){
   const a=footprint[k],c=footprint[(k+1)%ct];
   b.triangle([a[0],baseY+h,a[1]],[c[0],baseY+h,c[1]],apex,roof,true);
  }
  if(detail){
   // Snow line beneath roof; dark slate roof and low projecting eaves.
   for(let k=0;k<ct;k++){
    const a=footprint[k],c=footprint[(k+1)%ct];
    orientedPanel(a,c,baseY+h-.16,baseY+h+.19,[.82,.86,.87],.12);
   }
  }
  if(feature){
   // Photo-inspired mountain terrace, never asserted to be a surveyed footprint.
   const xs=footprint.map(p=>p[0]),zs=footprint.map(p=>p[1]),xmin=Math.min(...xs),
    xmax=Math.max(...xs),zmin=Math.min(...zs),zmax=Math.max(...zs),width=xmax-xmin;
   const deckZ=zmin-4,deckY=baseY+1.1;
   b.box(x,deckY-.28,deckZ,Math.min(29,width+7),.32,7.4,[.42,.30,.20]);
   for(let i=0;i<5;i++){
    const xx=x+(i-2)*Math.min(5,(width+5)/5);
    b.box(xx,baseY,deckZ-2.5,.29,1.05,.29,stone);
    b.box(xx,deckY,deckZ-3.45,.16,1.55,.16,[.43,.36,.29]);
   }
   b.box(x,deckY+1.5,deckZ-3.45,Math.min(29,width+7),.16,.17,[.44,.35,.26]);
  }
 }
 const shape=b.done();shape.buildingStats=info;return shape;
}
function lift(geo,height){
 const b=builder(),pts=geo.lift_b1||[],ref=geo.lift_ref||"B1";
 if(pts.length<2)return b.done();
 const gondola=ref==="A1",drag=ref.startsWith("C"),yLift=drag?7:gondola?22:17;
 const steel=[.37,.46,.51],dark=[.18,.23,.28],pulley=[.49,.55,.59];
 // Original corridor geometry is retained. Each cable has sag, return lane and supports.
 function line(x0,y0,z0,x1,y1,z1,thick,col){
  const dx=x1-x0,dz=z1-z0,len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len,w=thick*.5;
  b.quad([x0+nx*w,y0,z0+nz*w],[x0-nx*w,y0,z0-nz*w],
   [x1-nx*w,y1,z1-nz*w],[x1+nx*w,y1,z1+nz*w],col,true);
 }
 for(let i=1;i<pts.length;i++){
  const a=pts[i-1],c=pts[i],len=Math.hypot(c[0]-a[0],c[1]-a[1]),n=Math.max(1,Math.ceil(len/17));
  const xDir=(c[1]-a[1])/(len||1),zDir=-(c[0]-a[0])/(len||1);
  for(const lane of [-1,1]){
   const offset=(drag?1.35:3.2)*lane;
   let prev=null;
   for(let k=0;k<=n;k++){
    const t=k/n,x=a[0]+(c[0]-a[0])*t+xDir*offset,z=a[1]+(c[1]-a[1])*t+zDir*offset,
     sag=(Math.sin(Math.PI*t)**2)*Math.min(3,len*.006),
     y=a[2]+(c[2]-a[2])*t+yLift-sag;
    if(prev)line(prev[0],prev[1],prev[2],x,y,z,drag?.10:.14,dark);
    prev=[x,y,z];
   }
  }
 }
 const length=pts.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-pts[i][0],p[1]-pts[i][1]),0);
 const nTowers=Math.max(2,Math.min(16,Math.round(length/125)));
 for(let k=1;k<nTowers;k++){
  const t=k/nTowers*(pts.length-1),i=Math.min(pts.length-2,Math.floor(t)),a=pts[i],c=pts[i+1],u=t-i;
  const x=a[0]+(c[0]-a[0])*u,z=a[1]+(c[1]-a[1])*u,y=height(x,z),cableY=a[2]+(c[2]-a[2])*u+yLift;
  const h=Math.max(5,cableY-y),towerH=h-1.0;
  b.box(x,y,z,.85,towerH,.85,steel);
  b.box(x,y+towerH,z,drag?5.5:11,.55,1.35,pulley);
  for(const sign of [-1,1]){
   b.box(x+sign*(drag?1.6:3.45),y+towerH+.23,z,1,.46,.95,dark);
   b.box(x+sign*(drag?1.6:3.45),y+towerH+.48,z,.78,.17,1.35,pulley);
  }
  if(!drag)for(const sign of [-1,1]){
   b.box(x+sign*.65,y+towerH-2.3,z,.19,3.2,.20,steel);
  }
 }
 return b.done();
}
function skier(){
 const b=builder();
 b.box(0,.16,0,.96,.18,2.8,[.36,.49,.59]);
 b.box(0,.32,-.1,.85,.9,.7,[.17,.29,.40]);b.box(0,1.18,0,1.05,1.2,.83,[.12,.45,.52]);
 b.box(0,2.38,0,.55,.55,.55,[.18,.25,.35]);b.box(0,2.28,.34,.49,.17,.1,[.76,.86,.93]);
 b.box(-.68,1.28,.05,.34,1.0,.35,[.13,.4,.46]);b.box(.68,1.28,.05,.34,1,.35,[.13,.4,.46]);
 return b.done();
}
function resortObjects(geo,height){
 const b=builder(),colors={easy:[.19,.44,.85],intermediate:[.83,.18,.20],advanced:[.15,.16,.20],unknown:[.65,.58,.29]};
 for(const run of geo.runs||[]){
  const p=run.coordinates[0],q=run.coordinates[run.coordinates.length-1],col=colors[run.difficulty]||colors.unknown;
  const y=height(p[0],p[1]),fy=height(q[0],q[1]);
  b.box(p[0]+5,y,p[1],.38,4.1,.38,[.30,.36,.4]);
  b.box(p[0]+5,y+2.9,p[1],5.5,1.28,.24,col);
  b.box(q[0]+4,fy,q[1],.3,3.1,.3,[.28,.34,.39]);
 }
 for(const lift of geo.lifts||[]){
  if(geo.id==="hala"&&(lift.ref==="A1"||lift.ref==="B1"))continue; // bespoke lift terminals
  const gondola=lift.ref==="A1",drag=lift.ref.startsWith("C");
  for(let k=0;k<2;k++){
   const p=k===0?lift.coordinates[0]:lift.coordinates[lift.coordinates.length-1],
    x=p[0],z=p[1],y=height(x,z),w=gondola?23:drag?8:16,d=gondola?24:drag?9:18,
    h=gondola?8:drag?3.5:6,steel=[.27,.34,.39],roof=[.17,.24,.29];
   // Recognisable station enclosure: concrete foundation, glass bands, roof machinery.
   b.box(x,y,z,w,1.05,d,[.43,.47,.48]);
   b.box(x,y+1.05,z,w*.87,h-1.05,d*.82,[.31,.38,.42]);
   b.box(x,y+h,z,w+2,.9,d+2,roof);
   b.box(x,y+2.2,z-d*.42,w*.60,2.35,.19,[.24,.47,.55]);
   b.box(x,y+h+.8,z,w*.25,1.1,d*.40,steel);
   for(const side of [-1,1]){
    b.box(x+side*(w*.50),y+1.2,z,.45,h-.6,.45,steel);
    if(!drag)b.box(x+side*w*.34,y+h+.55,z,2,.3,d*.55,[.45,.50,.52]);
   }
   if(gondola){
    for(let i=-2;i<=2;i++)b.box(x+i*3.5,y+1.15,z-d*.45,.14,3,.14,[.17,.23,.27]);
    b.box(x,y+.5,z+d*.55,w*.77,.35,7,[.38,.35,.31]);
   }
  }
 }
 return b.done();
}
window.SnowGeometry={builder,terrain,spruce,buildings,lift,skier,resortObjects};
})();