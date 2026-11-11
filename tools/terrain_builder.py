#!/usr/bin/env python3
"""SMR Terrain Builder: georeferenced raster->Babylon terrain and surveyed piste polygons.

Usage:
 python tools/terrain_builder.py --dem source_nmt.tif --scene v09/data/scene.json --out /tmp/terrain-hires.json
 python tools/terrain_builder.py --dem source_nmt.tif --scene v09/data/scene.json --boundary piste-area.geojson --out terrain-hires.json

Source files are user-supplied; never relabel the existing coarse Mapzen surface as GUGiK.
Dependencies: numpy, rasterio, pyproj, shapely.
"""
import argparse
import datetime
import json
import math
from pathlib import Path
import numpy as np
from pyproj import Transformer
from shapely.geometry import shape, Polygon
from shapely.validation import explain_validity
import rasterio

def origin_transform(origin):
    lat,lon=origin["lat"],origin["lon"]
    lat_scale=111132.5
    lon_scale=111320*math.cos(math.radians(lat))
    def local_to_wgs(x,z):
        return lon-z/lon_scale,lat+x/lat_scale
    def wgs_to_local(lon2,lat2):
        return (lat2-lat)*lat_scale,(lon-lon2)*lon_scale
    return local_to_wgs,wgs_to_local

def load_boundary(path,origin):
    data=json.loads(Path(path).read_text(encoding="utf-8"))
    if data.get("type")=="FeatureCollection":
        features=data.get("features",[])
        if len(features)!=1: raise ValueError("Boundary GeoJSON needs exactly one polygon feature")
        data=features[0]
    if data.get("type")=="Feature": data=data["geometry"]
    if data.get("type") not in ("Polygon","MultiPolygon"):
        raise ValueError("A piste boundary must be a Polygon or MultiPolygon")
    geom=shape(data)
    if geom.is_empty or not geom.is_valid:
        raise ValueError("Invalid piste boundary: "+explain_validity(geom))
    if geom.area<=0:raise ValueError("Empty piste boundary")
    # Boundary GeoJSON must use WGS84 lon,lat (RFC 7946).
    minlon,minlat,maxlon,maxlat=geom.bounds
    if not (15<minlon<25 and 45<minlat<55 and 15<maxlon<25 and 45<maxlat<55):
        raise ValueError("Polygon must use geographic WGS84 lon/lat; do not pass local metres")
    _,convert=origin_transform(origin)
    def project_ring(ring):
        return [[round(convert(a,b)[0],2),round(convert(a,b)[1],2)] for a,b in ring]
    def project_poly(poly):
        return [project_ring(poly.exterior.coords)]+[project_ring(r.coords) for r in poly.interiors]
    polys=[geom] if geom.geom_type=="Polygon" else list(geom.geoms)
    return [project_poly(p) for p in polys]

def build(scene_path,dem_path,out_path,boundary=None,grid_step=3,limit=800_000):
    source=json.loads(Path(scene_path).read_text(encoding="utf-8"))
    if "origin" not in source or "terrain" not in source:raise ValueError("Missing scene origin or terrain extent")
    box=source["terrain"]
    x0,z0=box["x0"],box["z0"]
    nx=math.ceil((box["cols"]-1)*box["step"]/grid_step)+1
    nz=math.ceil((box["rows"]-1)*box["step"]/grid_step)+1
    if nx*nz>limit:raise ValueError(f"Grid too dense ({nx*nz}). Increase --step (mobile limit: {limit})")
    xs=x0+np.linspace(0,(box["cols"]-1)*box["step"],nx)
    zs=z0+np.linspace(0,(box["rows"]-1)*box["step"],nz)
    xx,zz=np.meshgrid(xs,zs)
    to_gps,_=origin_transform(source["origin"])
    lon,lat=to_gps(xx,zz)
    with rasterio.open(dem_path) as dataset:
        if dataset.crs is None:raise ValueError("Raster must declare a coordinate reference system")
        if dataset.count<1:raise ValueError("Raster has no height band")
        transformer=Transformer.from_crs("EPSG:4326",dataset.crs,always_xy=True)
        gx,gy=transformer.transform(lon,lat)
        inv=~dataset.transform
        col,row=inv*(gx,gy)
        # Index by nearest raster cell; no filling missing cells with synthetic elevation.
        ci=np.floor(np.asarray(col)+.5).astype(int)
        ri=np.floor(np.asarray(row)+.5).astype(int)
        inside=(ci>=0)&(ci<dataset.width)&(ri>=0)&(ri<dataset.height)
        raster=dataset.read(1,masked=True)
        heights=np.full(ci.shape,np.nan,dtype=np.float64)
        rows=ri[inside];cols=ci[inside]
        heights[inside]=np.asarray(raster.filled(np.nan),dtype=np.float64)[rows,cols]
        valid=np.isfinite(heights)
        if dataset.nodata is not None:valid &= heights!=dataset.nodata
        if not valid.all():
            raise ValueError(f"DEM missing/NoData in {int((~valid).sum())} required cells. Obtain the complete NMT tile mosaic; no interpolation over missing source tiles.")
        if heights.max()-heights.min()>2500:raise ValueError("Terrain elevation range suspicious; verify CRS and height units")
        if not (-200<=heights.min()<=3000):raise ValueError("Elevation outside plausible Polish terrain bounds")
        band=np.rint(heights-source["origin"]["height_base_m"]).astype(float)
        layer={"x0":round(float(xs[0]),2),"z0":round(float(zs[0]),2),
               "step_x":round(float(xs[1]-xs[0]),4),"step_z":round(float(zs[1]-zs[0]),4),
               "cols":nx,"rows":nz,"heights":band.flatten().tolist()}
        meta={"dataset":str(dem_path),"crs":str(dataset.crs),"source_raster_res":list(dataset.res),
              "nodata_count":0,"sampled_height_min_m":round(float(heights.min()),2),
              "sampled_height_max_m":round(float(heights.max()),2),
              "sample_method":"nearest-cell, no fabricated missing elevations",
              "vertical_reference":"unknown: verify raster metadata, do not assume PL-EVRF2007-NH",
              "generated_utc":datetime.datetime.now(datetime.timezone.utc).isoformat()}
    output={"format":"smr-terrain-2","origin":source["origin"],"terrain":layer,"metadata":meta,
            "reference_route_osm":source["reference"]["osm_way"],
            "piste_boundary_status":"not supplied","piste_boundary_local":None}
    if boundary:
        output["piste_boundary_local"]=load_boundary(boundary,source["origin"])
        output["piste_boundary_status"]="source polygon supplied (accuracy not independently verified)"
        output["metadata"]["piste_boundary_file"]=str(boundary)
    Path(out_path).parent.mkdir(parents=True,exist_ok=True)
    Path(out_path).write_text(json.dumps(output,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    return output

def main():
    ap=argparse.ArgumentParser(description="Convert georeferenced elevation raster and optional piste polygon to verified 3D inputs")
    ap.add_argument("--dem",required=True,help="Local GeoTIFF NMT file; never silently download unknown coverage")
    ap.add_argument("--scene",default="v09/data/scene.json")
    ap.add_argument("--boundary",help="WGS84 GeoJSON polygon of verified piste borders (optional)")
    ap.add_argument("--out",default="v09/data/terrain-hires.json")
    ap.add_argument("--step",type=float,default=3.0,help="Output sample spacing in metres")
    a=ap.parse_args()
    if not (.5<=a.step<=30):ap.error("--step must be 0.5 to 30 metres")
    output=build(a.scene,a.dem,a.out,a.boundary,a.step)
    print(json.dumps({"written":a.out,"grid":[output["terrain"]["cols"],output["terrain"]["rows"]],
       "min_m":output["metadata"]["sampled_height_min_m"],
       "max_m":output["metadata"]["sampled_height_max_m"],
       "boundary":output["piste_boundary_status"]},ensure_ascii=False))
if __name__=="__main__":main()
