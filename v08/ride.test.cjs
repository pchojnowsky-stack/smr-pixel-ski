const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+"/ride.js","utf8"),ctx);
const create=()=>ctx.window.SMR_RIDE.createRide({center:()=>0,pisteWidth:()=>40,height:(_x,z)=>200-.22*z});
function simulate(ride,input,seconds){for(let i=0;i<seconds*60;i++)ride.update(input,1/60);return ride.state;}
const straight=create(),normal=create(),tucked=create();
simulate(straight,{},.65);
simulate(normal,{right:true},.65);
simulate(tucked,{right:true,tuck:true},.65);
assert(normal.state.x>straight.state.x+.8,"right steering changes trajectory");
assert(tucked.state.heading>normal.state.heading+.20,"tuck produces tighter heading curve");
assert(tucked.state.speed>normal.state.speed,"tuck increases downhill speed");
const left=create();simulate(left,{left:true},2);assert(left.state.x<straight.state.x-4,"left steering works");
const jump=create();jump.update({jump:true},1/60);assert(jump.state.airborne&&jump.state.jumpHeight>0,"jump launches");
simulate(jump,{jump:true},1.4);assert(!jump.state.airborne&&jump.state.jumpHeight===0,"jump lands without repeated autojump");
jump.update({jump:false},1/60);assert(jump.state.jumpCooldown===0,"jump cooldown expires");
jump.update({jump:true},1/60);assert(jump.state.airborne,"jump can repeat after release");
console.log("Ride physics: turning, tuck, speed, jump, landing, edge trigger PASS");
