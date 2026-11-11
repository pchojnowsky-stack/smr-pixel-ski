/* SMR Alpine 0.8.1: deterministic, frame-rate-independent arcade ski dynamics.
   All positions in world units; velocities in units per second. */
(function(){
"use strict";
function createRide({center,pisteWidth,height}){
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const state={x:center(0),z:0,speed:13,heading:0,lean:0,steer:0,tuck:0,
    airborne:false,jumpHeight:0,verticalSpeed:0,impact:0,jumpCooldown:0,groundHeight:height(center(0),0),time:0};
  let jumpHeld=false;
  function reset(){
    state.x=center(0);state.z=0;state.speed=13;state.heading=0;state.lean=0;state.steer=0;
    state.tuck=0;state.airborne=false;state.jumpHeight=0;state.verticalSpeed=0;state.impact=0;
    state.jumpCooldown=0;state.groundHeight=height(state.x,state.z);state.time=0;jumpHeld=false;
  }
  function update(input,delta){
    const dt=clamp(delta,0,.06),steer=Number(!!input.right)-Number(!!input.left);
    const tuck=!!input.tuck&&!input.brake,brake=!!input.brake;
    const jump=!!input.jump;
    const launch=jump&&!jumpHeld&&!state.airborne&&state.jumpCooldown<=0&&state.speed>6;
    jumpHeld=jump;
    state.time+=dt;
    state.steer+=(steer-state.steer)*(1-Math.exp(-dt*10));
    state.tuck+=(Number(tuck)-state.tuck)*(1-Math.exp(-dt*9));
    state.impact=Math.max(0,state.impact-dt*3.4);
    state.jumpCooldown=Math.max(0,state.jumpCooldown-dt);
    const offPiste=Math.abs(state.x-center(state.z))>pisteWidth(state.z);
    const slope=clamp((height(state.x,state.z)-height(state.x,state.z+4))/4,-.25,.48);
    const drag=(state.tuck?.0095:.0205)*state.speed*state.speed;
    const acceleration=6+slope*10-drag-(brake?19:0)-(offPiste?9:0);
    state.speed=clamp(state.speed+acceleration*dt,3,34);
    // Heading-based turns make actual curved trajectories; tuck increases edge authority.
    const turnAuthority=(.70+state.tuck*.90)*(state.airborne?.24:1)*(brake?.55:1);
    const rate=turnAuthority*(.55+Math.min(state.speed,26)/38);
    state.heading=clamp(state.heading+state.steer*rate*dt,-1.18,1.18);
    // Return toward fall-line only when neither steering direction is pressed.
    if(steer===0)state.heading*=Math.exp(-dt*(state.airborne?.08:.20));
    const advance=state.speed*dt;
    state.x+=Math.sin(state.heading)*advance;
    state.z+=Math.cos(state.heading)*advance;
    if(launch){
      state.airborne=true;state.verticalSpeed=8.0+Math.min(2.5,state.speed*.045);
      state.jumpCooldown=.9;
      state.jumpHeight=.03;
    }
    if(state.airborne){
      state.jumpHeight+=state.verticalSpeed*dt-9.4*dt*dt;
      state.verticalSpeed-=18.8*dt;
      if(state.jumpHeight<=0){
        state.jumpHeight=0;state.verticalSpeed=0;state.airborne=false;state.impact=1;
      }
    }
    state.groundHeight=height(state.x,state.z);
    state.lean=state.steer*(.42+.58*state.tuck)*(state.airborne?.40:1);
    return state;
  }
  return {state,update,reset};
}
window.SMR_RIDE={createRide,version:"0.8.1"};
})();