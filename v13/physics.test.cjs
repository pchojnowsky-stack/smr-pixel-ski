const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={window:{}};vm.createContext(context);
for(const name of ['freeride.js','tricks.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+name,'utf8'),context);
function ride(){return context.window.SMR_FREERIDE.createRide({height:(x,z)=>980-.18*z,
 bounds:{xMin:-330,xMax:420,zMin:-110,zMax:1700},spawn:{x:0,z:0,heading:.15},
 closestDistance:(x,z)=>Math.abs(x)});}
function run(r,button,t=1){for(let i=0;i<Math.round(t*60);i++)r.step(button,1/60);return r.state;}
const passive=ride(),speedup=ride();
run(passive,{},2);run(speedup,{accelerate:true},2);
assert(speedup.state.speed>passive.state.speed+5,'GAS must visibly accelerate');
const left=ride(),right=ride();
run(left,{left:true,accelerate:true},.5);run(right,{right:true,accelerate:true},.5);
assert(left.state.heading<.15&&right.state.heading>.15,'left/right carve in opposite directions');
function perform(direction){
 const r=ride(),trick=context.window.SMR_TRICKS.createTricks(),input={jump:true};
 r.step(input,.016);trick.update(r.state,input,.016);assert(r.state.airborne,'jump starts');
 input[direction]=true;
 for(let i=0;i<52;i++){r.step(input,.016);trick.update(r.state,input,.016);}
 assert.equal(trick.state.completedCount,1,'one 360 per jump');
 assert.equal(trick.state.score,100,'only one trick awarded');
 assert.equal(trick.state.direction,direction==='left'?-1:1,'correct 360 direction');
 assert(Math.abs(Math.abs(trick.state.yaw)-2*Math.PI)<.00001,'full 360 visual rotation');
 for(let i=0;i<30;i++){r.step(input,.016);trick.update(r.state,input,.016);}
 assert.equal(trick.state.yaw,0,'skier returns to neutral on landing');
 assert.equal(trick.state.completedCount,1,'holding button cannot repeat trick');
 return trick;
}
perform('left');perform('right');
const ground=context.window.SMR_TRICKS.createTricks();ground.update({airborne:false,jumpVelocity:0,jumpY:0},{left:true},.016);
assert.equal(ground.state.completedCount,0,'no ground trick');
console.log('MOBILE PHYSICS PASS: GAS, steering, jump+LEFT 360, jump+RIGHT 360, landing and anti-repeat');