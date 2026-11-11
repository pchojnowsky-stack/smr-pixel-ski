/* SnowEngine 1.3 simple mobile trick: jump + left/right = one full 360. */
(function(){
"use strict";
const PI2=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function createTricks(){
 const state={yaw:0,direction:0,active:false,completed:false,completedCount:0,score:0,
  progress:0,duration:.52,elapsed:0,combo:"",lastResult:""};
 let prevAir=false,prevLeft=false,prevRight=false,latched=false;
 function reset(){state.yaw=0;state.direction=0;state.active=false;state.completed=false;
  state.completedCount=0;state.score=0;state.progress=0;state.duration=.52;
  state.elapsed=0;state.combo="";state.lastResult="";
  prevAir=false;prevLeft=false;prevRight=false;latched=false;}
 function update(ride,input,dt){
  dt=clamp(dt,0,.05);
  const airborne=!!ride.airborne,left=!!input.left,right=!!input.right;
  const takeoff=airborne&&!prevAir;
  if(takeoff){latched=false;state.yaw=0;state.active=false;state.completed=false;state.progress=0;state.direction=0;}
  if(airborne&&!latched&&!state.active&&!state.completed){
   // A direction held on takeoff, or a new direction tap midair, triggers once.
   const leftTriggered=left&&!right&&(takeoff||!prevLeft);
   const rightTriggered=right&&!left&&(takeoff||!prevRight);
   if(leftTriggered||rightTriggered){
    const direction=leftTriggered?-1:1;
    const v=ride.jumpVelocity||0,h=Math.max(0,ride.jumpY||0);
    const remaining=(v+Math.sqrt(Math.max(0,v*v+40*h)))/20;
    if(remaining>=.22){
     latched=true;state.direction=direction;state.combo=direction<0?"360° W LEWO":"360° W PRAWO";
     state.duration=clamp(remaining*.68,.24,.53);
     state.elapsed=0;state.active=true;state.lastResult="";state.progress=0;
    }
   }
  }
  if(state.active&&airborne){
   state.elapsed+=dt;
   state.progress=clamp(state.elapsed/state.duration,0,1);
   const t=state.progress,sm=t*t*(3-2*t);
   state.yaw=state.direction*PI2*sm;
   if(t>=1){
    state.yaw=state.direction*PI2;
    state.active=false;state.completed=true;
    state.completedCount++;state.score+=100;state.lastResult=state.combo+" +100";
   }
  }
  if(!airborne&&prevAir){
   if(state.active&&!state.completed)state.lastResult="NIEUDANY TRICK";
   state.active=false;state.yaw=0;state.progress=0;
  }
  if(!airborne&&!prevAir)state.yaw=0;
  prevAir=airborne;prevLeft=left;prevRight=right;
  return state;
 }
 reset();return {state,reset,update};
}
window.SMR_TRICKS={createTricks,version:"1.3.0"};
})();