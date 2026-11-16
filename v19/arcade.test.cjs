/* SnowEngine 1.9 arcade gameplay: numerical tests for left/right, acceleration and jumps. */
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const code=fs.readFileSync(path.join(__dirname,"freeride.js"),"utf8"),sandbox={window:{}};
vm.runInNewContext(code,sandbox);
const make=()=>sandbox.window.SMR_FREERIDE.createRide({
 height:(x,z)=>1100-z*.18,
 bounds:{xMin:-2000,xMax:2000,zMin:-2000,zMax:5000},
 spawn:{x:0,z:0,heading:0},
 closestDistance:()=>0});
const drive=(ride,input,frames=60)=>{for(let i=0;i<frames;i++)ride.step(input,1/60);};
const empty={left:false,right:false,tuck:false,jump:false};
const left=make(),right=make(),neutral=make();
assert(left.state.speed*3.6>=80,"Initial downhill pace must be arcade-fast (>80 km/h)");
drive(left,{...empty,left:true},25);
drive(right,{...empty,right:true},25);
drive(neutral,empty,25);
assert(left.state.heading<-.5,"Left button must steer left directly");
assert(right.state.heading>.5,"Right button must steer right directly");
assert(Math.abs(neutral.state.heading)<1e-8,"No button must go straight");
assert(left.state.steer===-1 && right.state.steer===1,"No steering latency allowed");
assert(left.state.x<neutral.state.x-1,"Left must move ski line to left (not just turn animation)");
assert(right.state.x>neutral.state.x+1,"Right must move ski line to right");
const acceleration=make(),cruiseBefore=acceleration.state.speed;
drive(acceleration,empty,240);
assert(acceleration.state.speed>cruiseBefore+8,"Arcade mode must accelerate quickly");
assert(acceleration.state.speed*3.6>110,"Arcade pace should exceed 110 km/h on a moderate slope");
const tuck=make(),normal=make();
drive(tuck,{...empty,tuck:true},260);drive(normal,empty,260);
assert(tuck.state.speed>normal.state.speed,"Tuck must boost speed");
const jump=make();jump.step({...empty,jump:true},1/60);
assert(jump.state.airborne&&jump.state.jumpY>0,"Two-pole quick tap must take off");
drive(jump,empty,160);
assert(!jump.state.airborne&&jump.state.jumpY===0,"Jump must land");
console.log("PASS arcade 1.9 direct left/right physical displacement; boost acceleration; tuck; jump; km/h");
