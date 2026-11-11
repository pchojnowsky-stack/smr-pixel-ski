#!/usr/bin/env python3
"""Retrieve georeferenced terrain, pistes, woodland, buildings and aerialways.
This is a DATA acquisition stage, not a claim that the existing synthetic game is surveyed.
Requires Pillow. All output metadata preserves source and validation status.
"""
import datetime as dt
import io
import json
import math
import os
import pathlib
import time
import urllib.parse
import urllib.request
from PIL import Image

OUT=pathlib.Path(__file__).resolve().parent.parent/"v09"/"data"
OUT.mkdir(parents=True,exist_ok=True)
# Broad search box, NOT surveyed piste boundaries. GPS is [south,west,north,east].
BOX=(49.681,18.974,49.715,19.049)
NMT_NOTE="Replace coarse global DEM with Polish GUGiK NMT 1 m; see v09/README.md"
Q='''[out:json][timeout:90];
(
way["piste:type"="downhill"]({s},{w},{n},{e});
way["aerialway"]({s},{w},{n},{e});
way["landuse"="forest"]({s},{w},{n},{e});
way["natural"="wood"]({s},{w},{n},{e});
way["building"]({s},{w},{n},{e});
);
out geom;'''.format(s=BOX[0],w=BOX[1],n=BOX[2],e=BOX[3])
AGENTS=["https://overpass.kumi.systems/api/interpreter",
"https://overpass.nchc.org.tw/api/interpreter",
"https://overpass-api.de/api/interpreter",
"https://overpass.private.coffee/api/interpreter"]
def retrieve(url,data=None):
  request=urllib.request.Request(url,data=data,headers={"User-Agent":"SMR-Pixel-Ski-Geodata/0.9 (educational ski map; GitHub project)","Accept":"application/json,image/png,*/*"})
  with urllib.request.urlopen(request,timeout=95) as response:
    return response.read()
def osm():
  errors=[]
  for host in AGENTS:
    try:
      payload=retrieve(host,urllib.parse.urlencode({"data":Q}).encode())
      result=json.loads(payload)
      if len(result.get("elements",[]))<5:
        raise RuntimeError("Unusually small extract; check search extent")
      return result,host
    except Exception as exc:
      errors.append(host+": "+str(exc))
      time.sleep(1)
  raise RuntimeError("All Overpass APIs failed: "+" | ".join(errors))
def haversine(a,b):
  lat1,lon1=a;lat2,lon2=b
  p1,p2=map(math.radians,(lat1,lat2));dp=p2-p1;dl=math.radians(lon2-lon1)
  return 2*6371008.8*math.asin(math.sqrt(math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2))
def length(coords):
  return sum(haversine((a[1],a[0]),(b[1],b[0])) for a,b in zip(coords,coords[1:]))
def mercator(lat,lon,z=12):
  lat=math.radians(max(-85.051128, min(85.051128,lat)))
  num=2**z
  return (lon+180)/360*num,(1-math.asinh(math.tan(lat))/math.pi)/2*num
CACHE={}
def tile(z,x,y):
  key=(z,x,y)
  if key not in CACHE:
    url=f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
    CACHE[key]=Image.open(io.BytesIO(retrieve(url))).convert("RGB")
  return CACHE[key]
def elevation(lat,lon,z=12):
  xx,yy=mercator(lat,lon,z)
  tx,ty=math.floor(xx),math.floor(yy)
  img=tile(z,tx,ty)
  r,g,b=img.getpixel((min(255,int((xx-tx)*256)),min(255,int((yy-ty)*256))))
  return round(r*256+g+b/256-32768,2)
def main():
  raw,server=osm()
  pistes=[];forest=[];buildings=[];lifts=[]
  for e in raw["elements"]:
    if e.get("type")!="way" or len(e.get("geometry",[]))<2:continue
    tags=e.get("tags",{})
    coords=[[p["lon"],p["lat"]] for p in e["geometry"]]
    feature={"type":"Feature","id":"way/"+str(e["id"]),"properties":{"osm_id":e["id"],"tags":tags},"geometry":{"type":"LineString","coordinates":coords}}
    if tags.get("piste:type")=="downhill":
      feature["properties"]["length_m_osm"]=round(length(coords),1)
      pistes.append(feature)
    if tags.get("aerialway"):lifts.append(feature)
    if tags.get("building"):buildings.append(feature)
    if tags.get("landuse")=="forest" or tags.get("natural")=="wood":forest.append(feature)
  # Polygon only for CLOSED ways; no fabricated widths or polygon completion.
  for layer in (forest,buildings):
    for f in layer:
      c=f["geometry"]["coordinates"]
      if c[0]==c[-1] and len(c)>=4:f["geometry"]={"type":"Polygon","coordinates":[c]}
  for name,data in (("pistes",pistes),("forest",forest),("buildings",buildings),("lifts",lifts)):
    (OUT/(name+".geojson")).write_text(json.dumps({"type":"FeatureCollection","features":data},ensure_ascii=False,separators=(",",":")),encoding="utf-8")
  # Search candidates, but NEVER choose a fake continuous geometry when tags are incomplete.
  candidates=[]
  for p in pistes:
    tags=p["properties"]["tags"]
    label=" ".join(str(tags.get(k,"")) for k in ("name","piste:name","piste:ref","ref")).lower()
    if "szumarj" in label or "szmaragd" in label or any(x.strip()=="4" for x in label.split()):
      candidates.append({"osm_id":p["id"],"label":label,"length_m":p["properties"]["length_m_osm"]})
  # DEM samples in GPS latitude-longitude grid; coarse initial preview, NOT a GUGiK NMT.
  s,w,n,e=BOX
  rows,columns=100,100
  terrain=[]
  for j in range(rows):
    lat=s+(n-s)*j/(rows-1)
    terrain.append([elevation(lat,w+(e-w)*i/(columns-1)) for i in range(columns)])
  dem={"source":"Mapzen Terrain Tiles / terrarium, zoom 12 (global mixed-resolution DEM)","bbox_swen":BOX,"rows":rows,"columns":columns,"heights_m":terrain,
       "coordinate_order":"south-to-north rows, west-to-east columns","no_vertical_exaggeration":True,
       "warning":NMT_NOTE}
  (OUT/"terrain.json").write_text(json.dumps(dem,separators=(",",":")))
  report={"generated_utc":dt.datetime.now(dt.timezone.utc).isoformat(),"bbox_swen":BOX,"osm_source":server,
          "osm_license":"OpenStreetMap contributors, ODbL 1.0","dem_source":"Mapzen Terrain Tiles (various sources; see attribution)",
          "official_reference":{"trail":"4 (Szumarjanka / Szmaragdowa), Hala Skrzyczenska to Solisko","published_length_m":2014,
                                "published_vertical_drop_m":345,"start_elevation_m":1000,"end_elevation_m":655,
                                "width_m":None,"width_status":"NOT MEASURED"},
          "counts":{"pistes":len(pistes),"forest_ways":len(forest),"buildings":len(buildings),"aerialway_ways":len(lifts)},
          "route_4_candidates":candidates,"continuous_route_verified":False,"geometry_is_surveyed":False,
          "dem_grid_median_resolution_m":"coarse: tile zoom 12, not GUGiK 1-m NMT",
          "tiles_downloaded":len(CACHE),
          "limitations":["A way can represent a route segment, not a full piste; no manual gap bridging.",
                         "Building and forest OSM completeness/accuracy vary.",
                         "Piste widths remain unknown until mapped area boundaries or orthoimage measurement.",
                         "Mapzen global DEM does not resolve small bumps or accurate 1-m local grades."]}
  (OUT/"quality-report.json").write_text(json.dumps(report,indent=2,ensure_ascii=False))
  print(json.dumps(report,ensure_ascii=False,indent=2))
  if not pistes or not forest:raise RuntimeError("Invalid extract: missing ski pistes or forest")
if __name__=="__main__":main()
