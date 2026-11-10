import fs from "node:fs";
const file="config.js";
const match=fs.readFileSync(file,"utf8").match(/^window\.SMR_CONFIG\s*=\s*({[\s\S]*?})\s*;\s*$/);
if(!match)throw Error("Invalid config.js format");
const cfg=JSON.parse(match[1]);
const ranges={cameraDistance:[19,60],cameraHeight:[12,50],cameraLead:[14,70],skierScale:[0.6,1.4],renderScale:[0.55,1]};
let setting=process.env.SETTING||"",value=process.env.VALUE||"";
if(process.env.GITHUB_EVENT_NAME==="issue_comment"){
 const line=(process.env.COMMENT||"").split(/\r?\n/)[0];
 const parsed=line.match(/^\/tune\s+([A-Za-z]+)\s+(-?\d+(?:\.\d+)?)\s*$/);
 if(!parsed)throw Error("Expected /tune cameraDistance 32");
 setting=parsed[1];value=parsed[2];
}
if(!Object.hasOwn(ranges,setting))throw Error("Allowed settings: "+Object.keys(ranges).join(", "));
const number=Number(value),[lo,hi]=ranges[setting];
if(!Number.isFinite(number)||number<lo||number>hi)throw Error(setting+" must be between "+lo+" and "+hi);
if(cfg[setting]===number){console.log("Already set: "+setting+"="+number);process.exit(0);}
cfg[setting]=number;
fs.writeFileSync(file,"window.SMR_CONFIG = "+JSON.stringify(cfg,null,2)+";\n");
console.log("SMR Tune Agent: updated "+setting+" -> "+number);
