const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={window:{}};vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname+'/freeride.js','utf8'),context);
const create=()=>context.window.SMR_FREERIDE.createRide({
 height:(x,z)=>980-.21*z+.009*x,
 bounds:{xMin:-320,xMax:400,zMin:-110,zMax:1700},
 spawn:{x:0,z:0,heading:0.16},closestDistance:(x,z)=>Math.abs(x)
});
const tick=(r,inputs,t)=>{for(let i=0;i<t*60;i++)r.step(inputs,1/60);return r.state;};
const a=create(),b=create(),c=create(),left=create();
tick(a,{},3);tick(b,{right:true},3);tick(c,{right:true,tuck:true},3);tick(left,{left:true},3);
assert(b.state.x>a.state.x+6,'world-space right turn');
assert(left.state.x<a.state.x-6,'world-space left turn');
assert(c.state.heading>b.state.heading+.2,'tuck makes tighter turn');
assert(c.state.speed>b.state.speed,'tuck reduces aerodynamic drag');
assert(b.state.z!==a.state.z,'steering changes world trajectory instead of fixed-lane offset');
const jump=create();jump.step({jump:true},1/60);assert(jump.state.airborne);
tick(jump,{jump:true},1.7);assert(!jump.state.airborne&&jump.state.jumpY===0,'lands even if held');
jump.step({jump:false},.02);jump.step({jump:true},.02);assert(jump.state.airborne,'new jump only after release/cooldown');
const edge=create();edge.state.x=390;edge.state.heading=Math.PI/2;tick(edge,{},4);
assert(edge.state.x<=388,'cannot escape bounded mesh without a terrain loader');
const reverse=create();reverse.state.heading=Math.PI;const old=reverse.state.z;tick(reverse,{},.7);assert(reverse.state.z<old,'ski any direction');
console.log('FREE TERRAIN PHYSICS PASS - left/right, tuck, jump, reverse, finite terrain bounds');
