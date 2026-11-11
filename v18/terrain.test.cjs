/* SnowEngine 1.7: independently verify GUGiK quantization, source guard and geometry. */
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const context={window:{},atob:(s)=>Buffer.from(s,"base64").toString("binary")};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,"terrain-data.js"),"utf8"),context);
const apply=context.window.SMR_TERRAIN17.apply;
const make=()=>({id:"hala",terrain:{x0:0,z0:0,step_x:10,step_z:10,cols:40,rows:40,
  heights:Array.from({length:1600},()=>0),groom:Array.from({length:1600},()=>.7)},
  reference:{ref:"4"},runs:[{ref:"4",coordinates:[[5,5,0],[150,150,0]]}],
  lifts:[{coordinates:[[5,5,0],[150,150,0]]}],route:[[5,5,0],[150,150,0]]});
const values=Buffer.alloc(40*40*2);
for(let i=0;i<1600;i++)values.writeInt16LE(300+i%30,i*2);
const patch={format:"smr-17-gugik-nmt-quantized",sector:"hala",
 source:{agency:"GUGiK",service:"https://mapy.geoportal.gov.pl/wss/service/PZGIK/NMT/GRID1/WCS/DigitalTerrainModelFormatTIFF",
  coverage_percent:100,downloaded_from:"real WCS GetCoverage GeoTIFF",raw_source_resolution_m:1,wcs_request_sampling_m:3},
 terrain:{x0:0,z0:0,step_x:8,step_z:8,cols:40,rows:40,
  heights16:values.toString("base64"),height_scale_m:.1}};
const geo=make(),info=apply(geo,patch);
assert.equal(info.source,"GUGiK NMT");assert.equal(info.meshM,8);
assert.equal(geo.terrain.heights.length,1600);assert(Math.abs(geo.terrain.heights[0]-30)<.001);
assert(Math.abs(geo.terrain.groom[0]-.7)<.001);
assert(geo.runs[0].coordinates[0][2]>20,"run altitude should follow terrain");
assert(geo.lifts[0].coordinates[0][2]>20,"lift altitude should follow terrain");
assert.throws(()=>apply(make(),{...patch,source:{...patch.source,downloaded_from:"synthetic"}}),/provenance/);
assert.throws(()=>apply(make(),{...patch,sector:"invalid"}),/sector/);
assert.throws(()=>apply(make(),{...patch,terrain:{...patch.terrain,heights16:"AA=="}}),/height buffer/);
console.log("PASS 1.7 GUGiK quantization, source guard and terrain alignment");
