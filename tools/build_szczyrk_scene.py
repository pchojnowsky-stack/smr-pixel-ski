#!/usr/bin/env python3
"""Prepare an auditable, metre-scale 3D scene from an OSM extract + coarse DEM.
No invented surveyed piste width, forest positions or building locations.
"""
import json,math,random
from pathlib import Path
from shapely.geometry import Polygon,LineString,Point,box
ROOT=Path(__file__).resolve().parent.parent
IN=ROOT/"v09"/"data"
OUT=IN/"scene.json"
def read(name):return json.loads((IN/name).read_text(encoding="utf-8"))
def main():
  piste=next(p for p in read("pistes.geojson")["features"] if p["id"]=="way/202733799")
  points=piste["geometry"]["coordinates"]
  lon0,lat0=points[0]; kx=111132.5; kz=111320*math.cos(math.radians(lat0))
  def xy(p):return [(p[1]-lat0)*kx,(lon0-p[0])*kz]
  route=[xy(p) for p in points]
  line=LineString(route)
  if not (1550<line.length<1850):raise ValueError("Unexpected trail length: "+str(line.length))
  dem=read("terrain.json"); s,w,n,e=dem["bbox_swen"]; grid=dem["heights_m"]
  def altitude(x,z):
    lon=lon0-z/kz;lat=lat0+x/kx
    a=max(0,min(98.999,(lon-w)/(e-w)*(dem["columns"]-1)))
    b=max(0,min(98.999,(lat-s)/(n-s)*(dem["rows"]-1)))
    i=int(a);j=int(b);u=a-i;v=b-j
    return ((grid[j][i]*(1-u)+grid[j][i+1]*u)*(1-v)
           +(grid[j+1][i]*(1-u)+grid[j+1][i+1]*u)*v)-650
  terrain={"x0":-315,"z0":-110,"step":14,"cols":52,"rows":131}
  terrain["heights"]=[round(altitude(terrain["x0"]+i*terrain["step"],terrain["z0"]+j*terrain["step"]),1)
    for j in range(terrain["rows"]) for i in range(terrain["cols"])]
  rng=random.Random(90425);forest=[]
  corridor=line.buffer(185)
  sceneBox=box(-315,-110,415,1710)
  for feature in read("forest.geojson")["features"]:
    geom=feature["geometry"]
    if geom["type"]!="Polygon":continue
    exterior=[xy(p) for p in geom["coordinates"][0]]
    poly=Polygon(exterior)
    if not poly.is_valid:poly=poly.buffer(0)
    region=poly.intersection(corridor).intersection(sceneBox)
    if region.is_empty:continue
    count=min(400,max(1,int(region.area/700)))
    a,b,c,d=region.bounds
    added=0
    for _ in range(count*18):
      if added>=count:break
      x=rng.uniform(a,c);z=rng.uniform(b,d)
      if region.covers(Point(x,z)) and line.distance(Point(x,z))>24:
        forest.append([round(x,1),round(z,1),round(rng.uniform(.7,1.28),2)]);added+=1
  if len(forest)<40:raise ValueError("Few geolocated forest samples: "+str(len(forest)))
  buildings=[]
  for f in read("buildings.geojson")["features"]:
    geom=f["geometry"]
    if geom["type"]!="Polygon":continue
    ring=[xy(p) for p in geom["coordinates"][0]]
    if len(ring)<4:continue
    p=Polygon(ring)
    if not p.is_valid:p=p.buffer(0)
    if p.is_empty or p.distance(line)>145 or p.area<12:continue
    shell=p.simplify(.7,preserve_topology=True)
    if shell.geom_type!="Polygon":continue
    coords=list(shell.exterior.coords)[:-1]
    if len(coords)>30:continue
    tags=f["properties"]["tags"]
    levels=tags.get("building:levels",None)
    try:h=min(20,max(3,float(levels)*3.1)) if levels else 7
    except (ValueError,TypeError):h=7
    buildings.append({"id":f["id"],"p":[[round(x,1),round(z,1)] for x,z in coords],
       "height":round(h,1),"osm_name":tags.get("name",""),"height_estimated":levels is None})
  buildings.sort(key=lambda b:line.distance(Polygon(b["p"])))
  buildings=buildings[:115]
  lifts=read("lifts.geojson")["features"]
  b1=next(f for f in lifts if f["properties"]["tags"].get("ref")=="B1")
  cable=[xy(p) for p in b1["geometry"]["coordinates"]]
  # No sourced piste-border polygons exist here. The 38m band is VISUAL ONLY.
  scene={
    "version":"0.9.0","route_name":"Szumarjanka","route_ref":"4",
    "reference":{"osm_way":202733799,"osm_route_length_m":round(line.length,1),
       "operator_published_length_m":2014,"operator_published_drop_m":345,
       "piste_width_measured_m":None,"rendered_band_width_m":38,
       "rendered_band_status":"illustrative, NOT measured",
       "dem":"Mapzen Terrarium zoom 12, not GUGiK NMT 1 m",
       "forest_source":"OSM mapped polygons; random render positions within mapped forest",
       "buildings_source":"OSM building footprints; heights approximate when unknown",
       "lift_source":"OpenStreetMap way for B1",
       "attribution":"(c) OpenStreetMap contributors (ODbL); Mapzen Terrain Tiles (attribution varies by source)",
       "input_report":"quality-report.json"},
    "origin":{"lat":lat0,"lon":lon0,"x_axis":"north","z_axis":"west","unit":"metre","height_base_m":650},
    "route":[[round(x,2),round(z,2)] for x,z in route],
    "terrain":terrain,
    "forest_trees":forest,
    "buildings":buildings,
    "lift_b1":[[round(x,2),round(z,2)] for x,z in cable]
  }
  assert scene["route"][0]==[0.0,0.0]
  assert scene["route"][-1][1]>1400
  assert terrain["rows"]*terrain["cols"]==len(terrain["heights"])
  OUT.write_text(json.dumps(scene,separators=(",",":"),ensure_ascii=False),encoding="utf-8")
  print("GEO SCENE: route=%.1fm DEM=%d cells trees=%d buildings=%d B1=%d coords size=%d bytes"%
      (line.length,len(terrain["heights"]),len(forest),len(buildings),len(cable),OUT.stat().st_size))
  print("RELIEF samples: start=%.1fm end=%.1fm (global DEM estimate)"%
      (altitude(*route[0])+650,altitude(*route[-1])+650))
if __name__=="__main__":main()
