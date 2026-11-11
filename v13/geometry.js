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
 const T=geo.terrain,P=[],N=[],C=[],I=[],route=geo.route;
 const nearest=(x,z)=>{let best=1e15;for(let k=1;k<route.length;k++){
  const a=route[k-1],b=route[k],dx=b[0]-a[0],dz=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/Math.max(.001,dx*dx+dz*dz)));
  best=Math.min(best,(x-a[0]-dx*t)**2+(z-a[1]-dz*t)**2);
 }return Math.sqrt(best);};
 for(let j=0;j<T.rows;j++)for(let i=0;i<T.cols;i++){
  const x=T.x0+i*T.step_x,z=T.z0+j*T.step_z,y=T.heights[j*T.cols+i],dx=(height(x+4,z)-height(x-4,z))/8,dz=(height(x,z+4)-height(x,z-4))/8;
  const normal=[-dx,1,-dz],len=Math.hypot(...normal);
  const fade=1-Math.min(1,Math.max(0,(nearest(x,z)-14)/33));
  const grain=.014*Math.sin(x*.16+z*.29)*Math.cos(z*.08),g=Math.min(.99,.83+.12*fade+grain);
  P.push(x,y,z);N.push(...normal.map(t=>t/len));C.push(g*.95,g*.97,g*1.035);
 }
 for(let j=0;j<T.rows-1;j++)for(let i=0;i<T.cols-1;i++){
  const a=j*T.cols+i,b=a+1,c=a+T.cols,d=c+1;I.push(a,c,b,b,c,d);
 }return {positions:P,normals:N,colors:C,indices:I};
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
 const b=builder();
 for(const o of geo.buildings){if(!o.p||o.p.length<3)continue;
  const x=o.p.reduce((s,v)=>s+v[0],0)/o.p.length,z=o.p.reduce((s,v)=>s+v[1],0)/o.p.length;
  const xs=o.p.map(p=>p[0]),zs=o.p.map(p=>p[1]),w=Math.max(2,Math.max(...xs)-Math.min(...xs)),d=Math.max(2,Math.max(...zs)-Math.min(...zs));
  const h=o.height||6,y=height(x,z);b.box(x,y,z,w,h,d,[.54,.45,.41]);b.box(x,y+h,z,w+1,.6,d+1,[.28,.34,.4]);
 }return b.done();
}
function lift(geo,height){
 const b=builder(),pts=geo.lift_b1;
 for(let i=1;i<pts.length;i++)for(const offset of [-2,2]){
  const a=pts[i-1],c=pts[i],y=a[2]+16,Y=c[2]+16;
  b.quad([a[0]+offset-.08,y,a[1]],[a[0]+offset+.08,y,a[1]],[c[0]+offset+.08,Y,c[1]],[c[0]+offset-.08,Y,c[1]],[.25,.33,.36],true);
 }
 for(let i=1;i<pts.length-1;i+=2){
  const p=pts[i],y=height(p[0],p[1]),h=Math.max(10,p[2]+16-y);
  b.box(p[0],y,p[1],.8,h,.8,[.38,.47,.54]);b.box(p[0],y+h,p[1],9,.5,1,[.39,.5,.56]);
 }return b.done();
}
function skier(){
 const b=builder();
 b.box(0,.16,0,.96,.18,2.8,[.36,.49,.59]);
 b.box(0,.32,-.1,.85,.9,.7,[.17,.29,.40]);b.box(0,1.18,0,1.05,1.2,.83,[.12,.45,.52]);
 b.box(0,2.38,0,.55,.55,.55,[.18,.25,.35]);b.box(0,2.28,.34,.49,.17,.1,[.76,.86,.93]);
 b.box(-.68,1.28,.05,.34,1.0,.35,[.13,.4,.46]);b.box(.68,1.28,.05,.34,1,.35,[.13,.4,.46]);
 return b.done();
}
window.SnowGeometry={builder,terrain,spruce,buildings,lift,skier};
})();