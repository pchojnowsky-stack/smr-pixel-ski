/* Deterministic logic QA for v15 downhill handling, jump and tuck. */
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require("node:path").join(__dirname,"freeride.js"),"utf8"),context={window:{}};
vm.runInNewContext(source,context);
const build=()=>context.window.SMR_FREERIDE.createRide({
 height:(x,z)=>1000-z*.2,bounds:{xMin:-1500,xMax:1500,zMin:-200,zMax:3500},
 spawn:{x:0,z:0,heading:0},closestDistance:(x,z)=>Math.abs(x)});
const a=build(),b=build();
for(let i=0;i<180;i++){a.step({left:false,right:false,tuck:false,jump:false},1/60);b.step({left:false,right:false,tuck:true,jump:false},1/60);}
assert(b.state.speed>a.state.speed,"tuck should reduce drag and accelerate more");
const c=build();const h0=c.state.heading;
for(let i=0;i<50;i++)c.step({right:true},1/60);
assert(c.state.heading>h0+.25,"right turn must be responsive");
c.step({jump:true},1/60);assert(c.state.airborne&&c.state.jumpY>0,"jump must take off");
for(let i=0;i<100;i++)c.step({jump:false},1/60);
assert(!c.state.airborne&&c.state.jumpY===0,"jump must land");
console.log("PASS v15 physics: tuck, carve, landing");
