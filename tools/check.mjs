import fs from "node:fs";
import vm from "node:vm";
const read=(f)=>fs.readFileSync(f,"utf8");
const game=read("game.js"), ui=read("index.html"), config=read("config.js");
new vm.Script(game,{filename:"game.js"});
new vm.Script(config,{filename:"config.js"});
const match=config.match(/^window\.SMR_CONFIG\s*=\s*({[\s\S]*?})\s*;\s*$/);
if(!match)throw Error("config.js must be window.SMR_CONFIG = JSON;");
const cfg=JSON.parse(match[1]);
const range={cameraDistance:[19,60],cameraHeight:[12,50],cameraLead:[14,70],skierScale:[0.6,1.4],renderScale:[0.55,1]};
for(const [key,[lo,hi]] of Object.entries(range)){
 if(typeof cfg[key]!=="number"||!Number.isFinite(cfg[key])||cfg[key]<lo||cfg[key]>hi)throw Error(key+" outside range");
}
for(const x of ['id="game"','id="left"','id="right"','id="brake"','id="start"','game.js?v=0.4.2','config.js?v=0.4.2'])if(!ui.includes(x))throw Error("Missing "+x);
if(!game.includes("window.__SMR_DEBUG__"))throw Error("Debug hook missing");
console.log("SMR 0.4.2: syntax, config and UI smoke checks passed");
