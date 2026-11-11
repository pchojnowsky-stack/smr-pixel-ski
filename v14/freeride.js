/* SMR 1.3: touch-only left/right, gas and jump; free terrain physics. */
(function(){
"use strict";
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function createRide({height,bounds,spawn,closestDistance}){
 const state={x:spawn.x,z:spawn.z,heading:spawn.heading,speed:12,lean:0,tuck:0,time:0,
  airborne:false,jumpY:0,jumpVelocity:0,cooldown:0,impact:0,edgeDistance:0,offPiste:false,
  groundY:height(spawn.x,spawn.z),steer:0};
 let lastJump=false;
 function reset(){state.x=spawn.x;state.z=spawn.z;state.heading=spawn.heading;state.speed=12;
  state.lean=0;state.tuck=0;state.time=0;state.airborne=false;state.jumpY=0;
  state.jumpVelocity=0;state.cooldown=0;state.impact=0;state.edgeDistance=0;state.offPiste=false;
  state.groundY=height(state.x,state.z);state.steer=0;lastJump=false;}
 function step(input,dt){
  dt=clamp(dt,0,.05);state.time+=dt;
  const steer=Number(!!input.right)-Number(!!input.left);
  state.steer+=(steer-state.steer)*(1-Math.exp(-dt*9));
  state.tuck+=(Number(!!input.tuck)-state.tuck)*(1-Math.exp(-dt*6.5));
  state.impact=Math.max(0,state.impact-dt*2.8);
  state.cooldown=Math.max(0,state.cooldown-dt);
  const forwardX=Math.sin(state.heading),forwardZ=Math.cos(state.heading);
  const h0=height(state.x,state.z),h1=height(state.x+forwardX*8,state.z+forwardZ*8);
  const grade=clamp((h0-h1)/8,-.6,.6);
  state.edgeDistance=closestDistance(state.x,state.z);
  state.offPiste=state.edgeDistance>25;
  const drag=.014*state.speed*state.speed;
  const accel=2.3+grade*13.8+(input.accelerate?12.5:0)-drag-(state.offPiste?2.3:0);
  state.speed=clamp(state.speed+accel*dt,2,36);
  const turn=.92*(state.airborne?.24:1);
  state.heading+=state.steer*turn*(.65+state.speed/48)*dt;
  if(Math.abs(state.heading)>Math.PI*2)state.heading=((state.heading+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
  const nx=state.x+Math.sin(state.heading)*state.speed*dt,nz=state.z+Math.cos(state.heading)*state.speed*dt;
  const minX=bounds.xMin+12,maxX=bounds.xMax-12,minZ=bounds.zMin+12,maxZ=bounds.zMax-12;
  const bx=clamp(nx,minX,maxX),bz=clamp(nz,minZ,maxZ);
  if(nx!==bx||nz!==bz)state.speed=Math.max(2,state.speed*.83);
  state.x=bx;state.z=bz;
  if(input.jump&&!lastJump&&!state.airborne&&state.cooldown<=0&&state.speed>5){
   state.airborne=true;state.jumpVelocity=8.7;state.jumpY=.01;state.cooldown=1.1;
  }
  lastJump=!!input.jump;
  if(state.airborne){state.jumpY+=state.jumpVelocity*dt-10.0*dt*dt;state.jumpVelocity-=20*dt;
   if(state.jumpY<=0){state.airborne=false;state.jumpY=0;state.jumpVelocity=0;state.impact=1;}
  }
  state.groundY=height(state.x,state.z);
  state.lean=state.steer*(.48+state.tuck*.38)*(state.airborne?.28:1);
  return state;
 }
 reset();return {state,step,reset};
}
window.SMR_FREERIDE={createRide,version:"1.3.0"};
})();
