/* SMR 1.5 - original piste guidance, safety fencing and low-cost forest belts. */
(function(){
"use strict";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distanceToSegment=(x,z,a,c)=>{
 const dx=c[0]-a[0],dz=c[1]-a[1],t=clamp(((x-a[0])*dx+(z-a[1])*dz)/Math.max(.001,dx*dx+dz*dz),0,1);
 return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);
};
const grades={easy:[.16,.43,.90],intermediate:[.87,.18,.19],advanced:[.15,.17,.20],unknown:[.75,.62,.22]};
function spruceLite(){
 const b=SnowGeometry.builder(),green=[[.065,.24,.18],[.07,.29,.24],[.10,.33,.25]],white=[.91,.95,.99];
 b.box(0,0,0,.38,10,.38,[.34,.27,.21]);
 for(let y=1.8,k=0;k<6;k++,y+=2.2){
  const radius=5.6-k*.66;
  for(let a=0;a<6;a++){
   const t=a*Math.PI/3+(.35*k),dx=Math.cos(t),dz=Math.sin(t),tx=-dz,tz=dx;
   const left=[dx*.3+tx*radius*.23,y+.24,dz*.3+tz*radius*.23],right=[dx*.3-tx*radius*.23,y+.24,dz*.3-tz*radius*.23],tip=[dx*radius,y-.53,dz*radius];
   b.triangle(left,right,tip,green[(a+k)%green.length],true);
   if(a%2===k%2)b.triangle([dx*.42+tx*.65,y+.40,dz*.42+tz*.65],[dx*.42-tx*.65,y+.40,dz*.42-tz*.65],[dx*radius*.82,y-.18,dz*radius*.82],white,true);
  }
 }
 return b.done();
}
function create(geo,height,{mobile=false}={}){
 const runs=geo.runs||[],b=SnowGeometry.builder(),T=geo.terrain;
 const xMin=T.x0+18,xMax=T.x0+(T.cols-1)*T.step_x-18,zMin=T.z0+18,zMax=T.z0+(T.rows-1)*T.step_z-18;
 const colors={...grades};let posts=0,netPanels=0,markers=0;
 const nearby=(x,z,min)=>{
  for(const run of runs)for(let i=1;i<run.coordinates.length;i++)
   if(distanceToSegment(x,z,run.coordinates[i-1],run.coordinates[i])<min)return true;
  return false;
 };
 const fence=(a,c,side,difficulty)=>{
  const color=difficulty==="advanced"?[.93,.24,.13]:[.96,.42,.14],bottom=.50;
  for(const level of [bottom,1.1,1.66]){
   b.quad([a.x-.048,a.y+level,a.z-.048],[a.x+.048,a.y+level,a.z+.048],
    [c.x+.048,c.y+level,c.z+.048],[c.x-.048,c.y+level,c.z-.048],color,true);
  }
  const count=Math.max(2,Math.ceil(Math.hypot(c.x-a.x,c.z-a.z)/3.5));
  for(let q=1;q<count;q++){const t=q/count,x=a.x+(c.x-a.x)*t,z=a.z+(c.z-a.z)*t,y=height(x,z)+.1;
   b.box(x,y+.54,z,.06,1.66,.06,color);
  }
  netPanels++;
 };
 for(const run of runs){
  const pts=run.coordinates||[],col=colors[run.difficulty]||colors.unknown;
  let n=0;
  for(let i=1;i<pts.length;i++){
   const a=pts[i-1],c=pts[i],dx=c[0]-a[0],dz=c[1]-a[1],len=Math.hypot(dx,dz);
   if(len<.1)continue;
   const nx=dz/len,nz=-dx/len,steps=Math.max(1,Math.ceil(len/34));
   const grade=Math.abs((c[2]-a[2])/len),hazard=run.difficulty==="advanced"||grade>.26;
   for(let j=0;j<=steps;j++){
    if(i>1&&j===0)continue;
    const t=j/steps,centerX=a[0]+dx*t,centerZ=a[1]+dz*t;
    // Approximate 22-25 m half-width. Not a surveyed piste boundary.
    const margin=run.difficulty==="advanced"?23:27;
    for(const side of [-1,1]){
     const x=centerX+side*nx*margin,z=centerZ+side*nz*margin;
     if(x<xMin||x>xMax||z<zMin||z>zMax)continue;
     const y=height(x,z)+.12;
     b.box(x,y,z,.24,2.45,.24,[.29,.38,.44]);posts++;
     if(n%4===0){b.box(x,y+2.07,z,.8,.38,.16,col);markers++;}
     if(hazard&&j>0&&n%3!==0){
      const t0=(j-1)/steps,px=a[0]+dx*t0+side*nx*margin,pz=a[1]+dz*t0+side*nz*margin;
      if(px>=xMin&&px<=xMax&&pz>=zMin&&pz<=zMax)
       fence({x:px,y:height(px,pz)+.12,z:pz},{x,y,z},side,run.difficulty);
     }
    }
    n++;
   }
  }
 }
 // Cheap extra forest along both sides of the mapped runs, excluding every run corridor.
 let seed=0x15cc52d^(runs.length*337);
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};
 const forest=[],cells=new Set(),budget=mobile?440:780;
 for(const run of runs){
  const pts=run.coordinates||[];
  for(let i=1;i<pts.length&&forest.length<budget;i++){
   const a=pts[i-1],c=pts[i],dx=c[0]-a[0],dz=c[1]-a[1],len=Math.hypot(dx,dz);if(len<.1)continue;
   const nx=dz/len,nz=-dx/len;
   for(let t=0;t<len&&forest.length<budget;t+=32){
    for(const side of [-1,1]){
     if(rand()<.16)continue;
     const u=clamp((t+(rand()-.5)*22)/len,0,1);
     const offset=32+rand()*67,ax=a[0]+dx*u,az=a[1]+dz*u;
     const x=ax+side*nx*offset+(rand()-.5)*8,z=az+side*nz*offset+(rand()-.5)*8;
     if(x<xMin||x>xMax||z<zMin||z>zMax||nearby(x,z,29))continue;
     const cell=Math.floor(x/9)+"/"+Math.floor(z/9);if(cells.has(cell))continue;cells.add(cell);
     forest.push(x,height(x,z)-.25,z,.40+rand()*.42);
    }
   }
  }
 }
 return {shape:b.done(),extraForest:forest,spruceShape:spruceLite(),posts,netPanels,markers,extraTrees:forest.length};
}
window.SnowPiste={create,spruceLite};
})();