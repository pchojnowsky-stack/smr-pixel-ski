/* SnowEngine 1.7 elevation: only verified source files replace Mapzen, never synthetic upsampling. */
(function(){
"use strict";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function sample(field,x,z){
 const tx=clamp((x-field.x0)/field.step_x,0,field.cols-1.00001),
  tz=clamp((z-field.z0)/field.step_z,0,field.rows-1.00001),
  i=Math.floor(tx),j=Math.floor(tz),a=tx-i,b=tz-j,h=field.heights;
 const k=j*field.cols+i;
 return h[k]*(1-a)*(1-b)+h[k+1]*a*(1-b)+h[k+field.cols]*(1-a)*b+h[k+field.cols+1]*a*b;
}
function apply(geo,patch){
 if(patch.format!=="smr-17-gugik-nmt-quantized"||patch.sector!==geo.id)
   throw Error("Unexpected GUGiK file format or sector");
 if(patch.source?.agency!=="GUGiK"||!patch.source?.service?.includes("/PZGIK/NMT/")||
    patch.source?.coverage_percent<98.5||patch.source?.downloaded_from!=="real WCS GetCoverage GeoTIFF")
   throw Error("Terrain provenance not verified");
 const t=patch.terrain,cols=t.cols,rows=t.rows;
 if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<30||rows<30||cols*rows>400000)
  throw Error("Invalid NMT mesh dimensions");
 const bin=atob(t.heights16);
 if(bin.length!==cols*rows*2)throw Error("Invalid NMT height buffer length");
 const data=new DataView(new ArrayBuffer(bin.length)),byteArray=new Uint8Array(data.buffer);
 for(let i=0;i<bin.length;i++)byteArray[i]=bin.charCodeAt(i);
 const heights=new Float32Array(cols*rows),scale=t.height_scale_m;
 if(!(scale>.001&&scale<1))throw Error("Invalid elevation scale");
 for(let i=0;i<heights.length;i++)heights[i]=data.getInt16(i*2,true)*scale;
 const old=geo.terrain;
 const next={x0:t.x0,z0:t.z0,step_x:t.step_x,step_z:t.step_z,cols,rows,heights,
  groom:new Uint8Array(cols*rows)};
 const oldGroom=old.groom||[];
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
  const x=t.x0+i*t.step_x,z=t.z0+j*t.step_z;
  const gx=clamp(Math.round((x-old.x0)/old.step_x),0,old.cols-1),
        gz=clamp(Math.round((z-old.z0)/old.step_z),0,old.rows-1);
  next.groom[j*cols+i]=Math.round(255*clamp(oldGroom[gz*old.cols+gx]??.4,0,1));
 }
 // Geometry shader expects grooming intensity 0..1; compact byte storage requires conversion.
 for(let i=0;i<next.groom.length;i++)next.groom[i]/=255;
 // Keep game-relative elevations; rescue pre-mapped lift/cable altitudes from new ground.
 for(const run of geo.runs)for(const p of run.coordinates)p[2]=sample(next,p[0],p[1]);
 for(const lift of geo.lifts)for(const p of lift.coordinates)p[2]=sample(next,p[0],p[1]);
 geo.terrain=next;geo.route=geo.runs.find(x=>x.ref===geo.reference.ref)?.coordinates||geo.route;
 geo.nmt={source:"GUGiK NMT",meshM:Math.round((next.step_x+next.step_z)*5)/10,
  service:patch.source.service,sourceGridM:patch.source.raw_source_resolution_m,
  requestSampleM:patch.source.wcs_request_sampling_m,alignOffsetM:patch.source.height_alignment_offset_m};
 return geo.nmt;
}
window.SMR_TERRAIN17={apply,sample,version:"1.7.0"};
})();