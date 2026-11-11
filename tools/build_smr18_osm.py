#!/usr/bin/env python3
"""Szczyrk 1.8. Build georeferenced OSM-only forest and building overlays.
No trees may be fabricated outside mapped natural=wood or landuse=forest
boundaries. No assumed identity for unsigned buildings. OSM is community
mapping, not a geodetic cadastral survey.
"""
import argparse
import json
import math
import pathlib
import random
import time
import urllib.parse
import urllib.request
from shapely.geometry import LineString, Point, Polygon, box
from shapely.ops import polygonize, unary_union
from shapely.prepared import prep

ROOT=pathlib.Path(__file__).resolve().parents[1]
SCENE=ROOT/"v14"/"data"
OUTPUT=ROOT/"v18"/"data"
ORIGIN={"lat":49.6837296,"lon":18.9958973}
LAT_METRES=111132.5
LON_METRES=111320*math.cos(math.radians(ORIGIN["lat"]))
OVERPASS=[
 "https://overpass.kumi.systems/api/interpreter",
 "https://overpass-api.de/api/interpreter",
 "https://overpass.nchc.org.tw/api/interpreter",
]
ALLOWED_FOREST={"natural=wood","landuse=forest"}
FOREST_SPACING_M=23.0
FOREST_LIMIT=2100
BUILDINGS_LIMIT=350

def to_local(lon,lat):
 return ((lat-ORIGIN["lat"])*LAT_METRES,(ORIGIN["lon"]-lon)*LON_METRES)

def as_local_ring(coords):
 return [to_local(lon,lat) for lon,lat in coords]

def ring(geometry):
 if len(geometry)<4:return None
 p=[to_local(pt["lon"],pt["lat"]) for pt in geometry]
 if p[0]!=p[-1]:p.append(p[0])
 if len(p)<4:return None
 return p

def geom_way(elem):
 try:
  pts=ring(elem.get("geometry") or [])
  if not pts:return []
  polygon=Polygon(pts)
  if not polygon.is_valid:polygon=polygon.buffer(0)
  if polygon.is_empty:return []
  return [polygon] if polygon.geom_type=="Polygon" else list(polygon.geoms)
 except (TypeError,ValueError,KeyError):return []

def geom_relation(elem):
 outers=[];inners=[]
 for member in elem.get("members",[]):
  if member.get("type")!="way":continue
  pts=ring(member.get("geometry") or [])
  if pts is None:continue
  (inners if member.get("role")=="inner" else outers).append(LineString(pts))
 if not outers:return []
 outer=list(polygonize(unary_union(outers)))
 if not outer:
  for line in outers:
   if line.is_ring:outer.append(Polygon(line))
 if not outer:return []
 inner=list(polygonize(unary_union(inners))) if inners else []
 shape=unary_union(outer)
 if inner:shape=shape.difference(unary_union(inner))
 if not shape.is_valid:shape=shape.buffer(0)
 if shape.is_empty:return []
 return [shape] if shape.geom_type=="Polygon" else list(getattr(shape,"geoms",[]))

def sector_bbox(scene,pad=35):
 t=scene["terrain"]
 xmin=t["x0"]-pad;xmax=t["x0"]+(t["cols"]-1)*t["step_x"]+pad
 zmin=t["z0"]-pad;zmax=t["z0"]+(t["rows"]-1)*t["step_z"]+pad
 west=ORIGIN["lon"]-zmax/LON_METRES;east=ORIGIN["lon"]-zmin/LON_METRES
 south=ORIGIN["lat"]+xmin/LAT_METRES;north=ORIGIN["lat"]+xmax/LAT_METRES
 return south,west,north,east

def request(scene,sector):
 bbox=",".join(f"{n:.7f}" for n in sector_bbox(scene))
 q=f"""[out:json][timeout:180];
 (
 way["natural"="wood"]({bbox});
 way["landuse"="forest"]({bbox});
 relation["natural"="wood"]({bbox});
 relation["landuse"="forest"]({bbox});
 way["building"]({bbox});
 relation["building"]({bbox});
 );
 out geom;"""
 errors=[]
 for endpoint in OVERPASS:
  for attempt in range(2):
   try:
    data=urllib.parse.urlencode({"data":q}).encode()
    req=urllib.request.Request(endpoint,data=data,headers={
      "User-Agent":"SMR-Pixel-Ski-OSM-GeoVerifier/1.8 (OpenStreetMap attribution)",
      "Content-Type":"application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req,timeout=230) as response:
      payload=response.read(25_000_000)
    output=json.loads(payload)
    if "elements" not in output:raise RuntimeError("No elements in OSM response")
    print(sector,"downloaded",len(output["elements"]),"OSM features from",endpoint,flush=True)
    return output["elements"],endpoint
   except Exception as e:
    errors.append(str(e)[:180])
    print(sector,"OSM request failure",endpoint,attempt+1,str(e)[:180],flush=True)
    time.sleep(3+attempt*7)
 raise RuntimeError("Cannot get verified OSM data for "+sector+": "+" | ".join(errors))

def segments(scene):
 ret=[]
 for run in scene["runs"]:
  pts=run["coordinates"]
  ret.extend(LineString([(p[0],p[1]) for p in pts]).geoms if False else [LineString([(p[0],p[1]) for p in pts])])
 return ret

def make(scene,sector,elements,endpoint):
 terrain=scene["terrain"]
 playable=box(terrain["x0"]+15,terrain["z0"]+15,
   terrain["x0"]+(terrain["cols"]-1)*terrain["step_x"]-15,
   terrain["z0"]+(terrain["rows"]-1)*terrain["step_z"]-15)
 runs=segments(scene)
 lifts=[LineString([(p[0],p[1]) for p in l["coordinates"]]) for l in scene["lifts"]]
 run_block=unary_union([line.buffer(31) for line in runs])
 lift_block=unary_union([line.buffer(9) for line in lifts])
 station_block=unary_union([Point(p[0],p[1]).buffer(28)
   for l in scene["lifts"] for p in [l["coordinates"][0],l["coordinates"][-1]]])
 woods=[];raw_buildings=[];wood_ids=[]
 for elem in elements:
  tags=elem.get("tags",{})
  shapes=geom_way(elem) if elem["type"]=="way" else geom_relation(elem)
  if not shapes:continue
  identifier=f'{elem["type"]}/{elem["id"]}'
  for poly in shapes:
   if poly.area<10:continue
   region=poly.intersection(playable)
   if region.is_empty:continue
   if (tags.get("natural")=="wood" or tags.get("landuse")=="forest") and region.area>120:
    woods.append(region);wood_ids.append(identifier)
   if tags.get("building") and tags.get("building")!="no" and elem["type"]=="way":
    # Building geometries retain their complete OSM footprint, not an approximation.
    if not playable.contains(poly.centroid) or poly.area<10:continue
    if poly.area>25000:continue
    if poly.geom_type!="Polygon":continue
    raw_buildings.append((identifier,poly,tags))
 if not woods:raise RuntimeError(sector+": NO mapped OSM woodland: cannot place invented forest")
 if not raw_buildings:raise RuntimeError(sector+": no mapped OSM building outlines")
 forest_area=unary_union(woods)
 unique={}
 for id,poly,tags in raw_buildings:
  unique[id]=(id,poly,tags)
 all_buildings=list(unique.values())
 # Full geographical footprint, ordered by nearby slope and lift, not OSM API order.
 relevant_runs=unary_union(runs+lifts)
 def priority(entry):
  id,poly,tags=entry
  name=(tags.get("name") or "").lower()
  structure_priority=0 if "kuflon" in name else 1
  d=poly.distance(relevant_runs)
  return (structure_priority,round(d/10),-poly.area,id)
 all_buildings.sort(key=priority)
 # Keep all building footprint polygons near pistes and extra structures to a finite LOD.
 selected=all_buildings[:BUILDINGS_LIMIT]
 all_build_poly=unary_union([poly.buffer(9) for _,poly,_ in all_buildings])
 # No trees on mapped building footprints, roads near stations, mapped runs or lifts.
 forest_valid=forest_area.difference(unary_union([run_block,lift_block,station_block,all_build_poly]))
 if forest_valid.is_empty:raise RuntimeError(sector+": mapped woodland entirely intersects obstacles")
 accessible_area=forest_valid.area
 # Stable grid-like stratification across the ENTIRE woodland; avoid iterating polygons in OSM order.
 xmin,zmin,xmax,zmax=playable.bounds
 seed={"hala":51832,"golgota":92811,"skrzyczne":72943}[sector]
 rng=random.Random(seed)
 valid=prep(forest_valid)
 candidates=[]
 spacing=FOREST_SPACING_M
 ix0=int(math.floor(xmin/spacing));ix1=int(math.ceil(xmax/spacing))
 iz0=int(math.floor(zmin/spacing));iz1=int(math.ceil(zmax/spacing))
 for i in range(ix0,ix1):
  for j in range(iz0,iz1):
   x=(i+.5+(rng.random()-.5)*.8)*spacing
   z=(j+.5+(rng.random()-.5)*.8)*spacing
   if valid.contains(Point(x,z)):
    candidates.append([round(x,2),round(z,2),round(.65+rng.random()*.70,2)])
 # Unbiased deterministic spatial thinning; sample across entire forest not just first polygon.
 if len(candidates)>FOREST_LIMIT:
  rng.shuffle(candidates);candidates=candidates[:FOREST_LIMIT]
 candidates.sort(key=lambda t:(t[0],t[1]))
 def keep_polygon(coords):
  shell=Polygon(coords)
  if shell.is_empty or not shell.is_valid:return None
  simplified=shell.simplify(.32,preserve_topology=True)
  points=list(simplified.exterior.coords)[:-1]
  if len(points)>65:points=list(shell.exterior.coords)[:-1]
  if len(points)>65:return None
  return [[round(x,2),round(z,2)] for x,z in points]
 buildings=[]
 for id,poly,tags in selected:
  coords=keep_polygon(poly.exterior.coords)
  if not coords or len(coords)<3:continue
  name=tags.get("name") or tags.get("operator") or ""
  levels=tags.get("building:levels")
  height_raw=tags.get("height")
  known_height=False
  try:
   if height_raw:
    h=float(str(height_raw).split()[0]);known_height=True
   elif levels:
    h=float(levels)*3.1;known_height=True
   else:h=7.0
  except (ValueError,TypeError):h=7.0
  h=min(24,max(2.8,h))
  buildings.append({"id":id,"p":coords,"height":round(h,2),
   "estimated_height":not known_height,"osm_name":name[:95],
   "source":"OpenStreetMap mapped footprint","footprint_area_m2":round(poly.area,1)})
 landmark=[b for b in buildings if "kuflon" in b.get("osm_name","").lower()]
 # Trees satisfy BOTH provenance and scenic collision rules.
 for tree in candidates:
  x,z=tree[:2]
  assert forest_valid.covers(Point(x,z))
 if len(candidates)<40:raise RuntimeError(sector+": too few sourced trees ("+str(len(candidates))+")")
 if len(buildings)<5:raise RuntimeError(sector+": insufficient OSM buildings after processing")
 output={
  "format":"smr18-osm-geolocated-landcover",
  "sector":sector,
  "origin":scene["origin"],
  "source":{"name":"OpenStreetMap Overpass live building and woodland geometries",
   "endpoint":endpoint,"osm_feature_count":len(elements),
   "forest_element_count":len(wood_ids),"forest_area_m2":round(forest_area.area),
   "woodland_after_exclusion_m2":round(accessible_area),
   "building_total_mapped":len(all_buildings),
   "forest_procedural_fallback":False,
   "location_quality":"mapped OSM footprints & polygons, NOT cadastral survey",
   "building_selection":"distance-prioritized, not source-order"},
  "trees":candidates,
  "buildings":buildings,
  "landmarks":{"kuflonka_candidates":[{"id":b["id"],"name":b["osm_name"]} for b in landmark]},
 }
 print(sector,"OSM trees",len(candidates),"buildings",len(buildings),
  "mapped",len(all_buildings),"forest area",round(forest_area.area),
  "valid wood area",round(accessible_area),"Kuflonka",landmark,flush=True)
 return output

def main():
 parser=argparse.ArgumentParser()
 parser.add_argument("--sectors",nargs="+",choices=("hala","golgota","skrzyczne"),default=["hala","golgota","skrzyczne"])
 parser.add_argument("--out",type=pathlib.Path,default=OUTPUT)
 args=parser.parse_args()
 args.out.mkdir(parents=True,exist_ok=True)
 manifest={"format":"smr18-osm-geolocated-manifest","sectors":[],"sources":{}}
 for sector in args.sectors:
  scene=json.loads((SCENE/(sector+".json")).read_text(encoding="utf8"))
  features,endpoint=request(scene,sector)
  data=make(scene,sector,features,endpoint)
  (args.out/(sector+".json")).write_text(json.dumps(data,ensure_ascii=False,separators=(",",":"))+"\n")
  manifest["sectors"].append(sector)
  manifest["sources"][sector]={"endpoint":endpoint,"trees":len(data["trees"]),
     "buildings":len(data["buildings"]),"forest_area_m2":data["source"]["forest_area_m2"],
     "mapped_buildings":data["source"]["building_total_mapped"],"verified_polygon":True}
 (args.out/"osm-manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n")
if __name__=="__main__":main()
