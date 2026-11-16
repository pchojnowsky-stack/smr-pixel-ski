/* SMR 1.9 ARCADE: instant direct left/right, explosive acceleration, snappy carving, trick landings. */
(function(){
"use strict";
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function createRide({height,bounds,spawn,closestDistance}){
 const state={x:spawn.x,z:spawn.z,heading:spawn.heading,speed:23,lean:0,tuck:0,time:0,
  airborne:false,jumpY:0,jumpVelocity:0,cooldown:0,impact:0,edgeDistance:0,offPiste:false,
  groundY:height(spawn.x,spawn.z),steer:0,grade:0};
 let lastJump=false;
 function reset(){Object.assign(state,{x:spawn.x,z:spawn.z,heading:spawn.heading,speed:23,lean:0,tuck:0,time:0,
  airborne:false,jumpY:0,jumpVelocity:0,cooldown:0,impact:0,edgeDistance:0,offPiste:false,
  groundY:height(spawn.x,spawn.z),steer:0,grade:0});lastJump=false;}
 function step(input,dt){
  dt=clamp(dt,0,.05);state.time+=dt;
  const steer=Number(!!input.right)-Number(!!input.left),tucked=!!input.tuck;
  state.steer=steer; // Instant ARCADE input: left negative, right positive.
  state.tuck+=(Number(tucked)-state.tuck)*(1-Math.exp(-dt*9.5));
  state.impact=Math.max(0,state.impact-dt*3.8);state.cooldown=Math.max(0,state.cooldown-dt);
  const forwardX=Math.sin(state.heading),forwardZ=Math.cos(state.heading);
  const h0=height(state.x,state.z),h1=height(state.x+forwardX*7,state.z+forwardZ*7);
  state.grade=clamp((h0-h1)/7,-.68,.68);
  state.edgeDistance=closestDistance(state.x,state.z);state.offPiste=state.edgeDistance>28;
  // Forward momentum is slope-driven; tuck reduces drag, tight carving scrubs speed.
  // Deliberately arcade, not a ski simulator: even flat traverses retain momentum.
  // Smooth max around 150 km/h on mild slopes, up to 194 km/h on fast descents.
  const drag=(.0035-.0014*state.tuck)*state.speed*state.speed;
  const edgeBrake=Math.abs(state.steer)*state.speed*.007;
  const acceleration=10.0+state.grade*14.2-drag-edgeBrake-(state.offPiste?1.15:0);
  state.speed=clamp(state.speed+acceleration*dt,13,54);
  const turn=2.15*(state.airborne?.43:1);
  state.heading+=steer*turn*(.88+state.speed/110)*dt;
  if(Math.abs(state.heading)>Math.PI*2)state.heading=((state.heading+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
  const nx=state.x+Math.sin(state.heading)*state.speed*dt,nz=state.z+Math.cos(state.heading)*state.speed*dt;
  const bx=clamp(nx,bounds.xMin+12,bounds.xMax-12),bz=clamp(nz,bounds.zMin+12,bounds.zMax-12);
  if(nx!==bx||nz!==bz)state.speed=Math.max(13,state.speed*.92);
  state.x=bx;state.z=bz;
  if(input.jump&&!lastJump&&!state.airborne&&state.cooldown<=0&&state.speed>5){
   state.airborne=true;state.jumpVelocity=11.0;state.jumpY=.01;state.cooldown=.82;
  }
  lastJump=!!input.jump;
  if(state.airborne){
   state.jumpY+=state.jumpVelocity*dt-11.5*dt*dt;state.jumpVelocity-=23*dt;
   if(state.jumpY<=0){state.airborne=false;state.jumpY=0;state.jumpVelocity=0;state.impact=1;state.speed*=.985;}
  }
  state.groundY=height(state.x,state.z);
  state.lean=steer*(.68+Math.min(.18,state.speed/150))*(state.airborne?.20:1);
  return state;
 }
 reset();return {state,step,reset};
}
window.SMR_FREERIDE={createRide,version:"1.9.0"};
})();