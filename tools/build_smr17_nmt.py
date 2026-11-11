#!/usr/bin/env python3
"""Build real SnowEngine terrain from official GUGiK WCS 1.0 GeoTIFF, never synthetic 1m data.
Source: https://www.geoportal.gov.pl/pl/usluga/uslugi-pobierania-wcs/
Inputs: v14/data/{sector}.json. Output: v17/data/{sector}.json with base64 int16 decimetres.
Requires numpy, pyproj, rasterio. Fast ~8m mesh sampled from GUGiK NMT 1m SOURCE.
"""
from __future__ import annotations
import argparse
import array
import base64
import json
import math
import os
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Dict, List

import numpy as np
from pyproj import Transformer
from rasterio.io import MemoryFile

ROOT = pathlib.Path(__file__).resolve().parents[1]
SERVICE = "https://mapy.geoportal.gov.pl/wss/service/PZGIK/NMT/GRID1/WCS/DigitalTerrainModelFormatTIFF"
COVERAGE = "DTM_PL-KRON86-NH_TIFF"
SECTORS = ("hala", "golgota", "skrzyczne")
TILE_METERS = 1024.0
WCS_METERS_PER_PIXEL = 3.0
TIMEOUT = 65

def baseline_sample(t: dict, xs: np.ndarray, zs: np.ndarray) -> np.ndarray:
    grid = np.asarray(t["heights"], dtype=np.float64).reshape(t["rows"], t["cols"])
    gx = np.clip((xs-t["x0"])/t["step_x"],0,t["cols"]-1.00001)
    gz = np.clip((zs-t["z0"])/t["step_z"],0,t["rows"]-1.00001)
    i = gx.astype(int); j = gz.astype(int)
    a=gx-i; b=gz-j
    return (grid[j,i]*(1-a)*(1-b)+grid[j,i+1]*a*(1-b)
           +grid[j+1,i]*(1-a)*b+grid[j+1,i+1]*a*b)

def fetch_tile(x0: float,y0: float,dx: float=TILE_METERS) -> tuple[np.ndarray, object]:
    n=int(math.ceil(dx/WCS_METERS_PER_PIXEL))
    params = {
       "SERVICE":"WCS","VERSION":"1.0.0","REQUEST":"GetCoverage",
       "COVERAGE":COVERAGE,"CRS":"EPSG:2180","RESPONSE_CRS":"EPSG:2180",
       "BBOX":f"{x0:.3f},{y0:.3f},{x0+dx:.3f},{y0+dx:.3f}",
       "WIDTH":str(n),"HEIGHT":str(n),"FORMAT":"GEOTIFF"
    }
    url=SERVICE+"?"+urllib.parse.urlencode(params)
    for attempt in range(3):
        try:
            req=urllib.request.Request(url,headers={"User-Agent":"SMR-Pixel-Ski/1.7 (GUGiK WCS terrain build)","Accept":"image/tiff,*/*"})
            with urllib.request.urlopen(req,timeout=TIMEOUT) as response:
                data=response.read(10_000_000)
            if not data[:4] in (b"II*\\x00",b"MM\\x00*"):
                raise RuntimeError("WCS did not return GeoTIFF (first bytes "+repr(data[:130])+")")
            with MemoryFile(data) as mem:
                with mem.open() as src:
                    if src.count!=1 or not src.crs or src.crs.to_epsg()!=2180:
                        raise RuntimeError("GUGiK raster projection/count invalid "+str(src.crs))
                    return src.read(1).astype(np.float32),src.transform
        except (urllib.error.HTTPError,urllib.error.URLError,TimeoutError,RuntimeError) as exc:
            print("WCS tile retry",attempt+1,round(x0),round(y0),str(exc)[:130],flush=True)
            if attempt==2: raise
            time.sleep(3+attempt*4)
    raise AssertionError("unreachable")

def resample(arr,transform,x,y):
    # Transform geographic EPSG:2180 raster pixel-center to sample positions.
    inv=~transform
    col,row=inv*(x,y)
    col=col-.5;row=row-.5
    c0=np.floor(col).astype(np.int32);r0=np.floor(row).astype(np.int32)
    c0=np.clip(c0,0,arr.shape[1]-2);r0=np.clip(r0,0,arr.shape[0]-2)
    a=np.clip(col-c0,0,1);b=np.clip(row-r0,0,1)
    vals=(arr[r0,c0]*(1-a)*(1-b)+arr[r0,c0+1]*a*(1-b)
          +arr[r0+1,c0]*(1-a)*b+arr[r0+1,c0+1]*a*b)
    return vals

def build(sector: str,spacing: float,output_dir: pathlib.Path) -> dict:
    source=json.loads((ROOT/"v14"/"data"/(sector+".json")).read_text())
    origin=source["origin"];t=source["terrain"]
    width=(t["cols"]-1)*t["step_x"];height=(t["rows"]-1)*t["step_z"]
    cols=int(math.ceil(width/spacing))+1;rows=int(math.ceil(height/spacing))+1
    if cols*rows>380_000: raise RuntimeError("Excessive vertex budget")
    step_x=width/(cols-1);step_z=height/(rows-1)
    xs=t["x0"]+np.arange(cols,dtype=np.float64)*step_x
    zs=t["z0"]+np.arange(rows,dtype=np.float64)*step_z
    xx,zz=np.meshgrid(xs,zs)
    # x = north metres, z = west metres. Around central lat 49.684 N.
    lat=origin["lat"]+xx/111_195.080
    lon=origin["lon"]-zz/(111_195.080*math.cos(math.radians(origin["lat"])))
    crs_transform=Transformer.from_crs(4326,2180,always_xy=True)
    east,north=crs_transform.transform(lon,lat)
    heights=np.full(east.shape,np.nan,dtype=np.float32)
    left=math.floor(float(east.min())/TILE_METERS)*TILE_METERS
    bottom=math.floor(float(north.min())/TILE_METERS)*TILE_METERS
    ntiles=math.ceil((float(east.max())-left)/TILE_METERS)*math.ceil((float(north.max())-bottom)/TILE_METERS)
    print(f"{sector}: target {cols}x{rows}, {ntiles} WCS tiles (3m samples from official NMT)",flush=True)
    if ntiles>50:raise RuntimeError("WCS request budget exceeded")
    idx=0
    for ey in np.arange(bottom,float(north.max())+1,TILE_METERS):
        for ex in np.arange(left,float(east.max())+1,TILE_METERS):
            mask=(east>=ex)&(east<ex+TILE_METERS)&(north>=ey)&(north<ey+TILE_METERS)
            if not mask.any():continue
            data,tr=fetch_tile(float(ex),float(ey))
            sample=resample(data,tr,east[mask],north[mask])
            sample[(sample<300)|(sample>1600)]=np.nan
            heights[mask]=sample
            idx+=1;print(f"  {sector} tile {idx}/{ntiles} valid {np.isfinite(sample).sum()}",flush=True)
    valid=np.isfinite(heights)
    fraction=float(valid.mean())
    if fraction<.985:
        raise RuntimeError(f"{sector}: GUGiK raster coverage only {fraction:.1%}; refusing to label as NMT scene")
    old=baseline_sample(t,xx,zz)
    raw=heights-origin["height_base_m"]
    # One vertical offset matches existing camera/objects; local NMT slopes stay untouched.
    delta=float(np.median(old[valid]-raw[valid]))
    if abs(delta)>35:raise RuntimeError(f"{sector}: dangerous vertical datum/coordinate offset {delta:.1f}m")
    heights=np.where(valid,raw+delta,old)
    if not np.all(np.isfinite(heights)) or heights.min() < -1500 or heights.max()>1500:raise RuntimeError("Bad heights")
    q=np.rint(heights*10).astype("<i2")
    encoded=base64.b64encode(q.tobytes()).decode("ascii")
    layer={
     "format":"smr-17-gugik-nmt-quantized","sector":sector,
     "source":{"agency":"GUGiK","service":SERVICE,"coverage":COVERAGE,
       "request_crs":"EPSG:2180","vertical_datum":"PL-KRON86-NH (adjusted to game base)",
       "raw_source_resolution_m":1,"wcs_request_sampling_m":WCS_METERS_PER_PIXEL,
       "mesh_sample_spacing_m":[step_x,step_z],"coverage_percent":round(fraction*100,3),
       "height_alignment_offset_m":round(delta,3),"downloaded_from":"real WCS GetCoverage GeoTIFF"},
     "terrain":{"x0":t["x0"],"z0":t["z0"],"step_x":step_x,"step_z":step_z,
       "cols":cols,"rows":rows,"height_base_m":origin["height_base_m"],
       "heights16":encoded,"height_scale_m":.1}
    }
    output_dir.mkdir(parents=True,exist_ok=True)
    dst=output_dir/(sector+".json");dst.write_text(json.dumps(layer,separators=(",",":"))+"\\n")
    print(f"{dst} {dst.stat().st_size} bytes; terrain min={heights.min():.1f} max={heights.max():.1f}, offset={delta:.2f}",flush=True)
    return layer["source"]

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--sectors",nargs="+",choices=SECTORS,default=list(SECTORS))
    p.add_argument("--spacing",type=float,default=8.0)
    p.add_argument("--output",type=pathlib.Path,default=ROOT/"v17"/"data")
    a=p.parse_args()
    if a.spacing<6 or a.spacing>14:raise RuntimeError("Target mesh spacing must be 6..14 m")
    sources={}
    for sector in a.sectors:
        sources[sector]=build(sector,a.spacing,a.output)
    (a.output/"manifest.json").write_text(json.dumps({
      "source":"verified GUGiK WCS elevation","sectors":sorted(sources.keys()),
      "sources":sources,"not_a_lidar_point_cloud":True},ensure_ascii=False,indent=2)+"\\n")
if __name__=="__main__":
    main()
