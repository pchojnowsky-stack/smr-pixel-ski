#!/usr/bin/env python3
"""Build three playable resort sectors from real OpenSkiMap XYZ lines & Mapzen DEM.
Forest/buildings from the geolocated OSM extraction when available. All invented
station structures and piste display widths explicitly marked illustrative.
"""
import json, math, random, io, time, pathlib, urllib.request
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parent.parent
RAW=ROOT/"v10"/"data"/"openskimap-features.geojson"
PREV=ROOT/"v13"/"data"/"scene.json"
WORK=ROOT/"v14"/"work"
OUT=ROOT/"v14"/"data"
OUT.mkdir(parents=True,exist_ok=True)
FEATURES=json.loads(RAW.read_text(encoding="utf8"))["features"]
PREVIOUS=json.loads(PREV.read_text(encoding="utf8"))
ORIGIN=PREVIOUS["origin"]
BASE=ORIGIN["height_base_m"]
LATSCALE=111132.5
LONSCALE=111320*math.cos(math.radians(ORIGIN["lat"]))
Z=12
TILES={}
AGENT="SMR-Pixel-Ski/1.4 (georeferenced terrain visualization; OpenStreetMap attribution)"
SECTORS=[
 {"id":"hala","name":"Hala Skrzyczeńska / Solisko","short":"Hala i Solisko",
  "runs":["4","7","5","3","1"],"lifts":["B1","A1"],"default":"4"},
 {"id":"golgota","name":"Golgota / Salmopol","short":"Golgota i Salmopol",
  "runs":["10","11","4A"],"lifts":["B2"],"default":"10"},
 {"id":"skrzyczne","name":"Małe Skrzyczne / Kaskada","short":"Małe Skrzyczne",
  "runs":["21","22a","22b","23","25","3a","3b","3c"],"lifts":["B3","B4","B5","B6","C10","C3"],"default":"21"}
]
def xyz(point):
 lon,lat=point[:2]
 return [round((lat-ORIGIN["lat"])*LATSCALE,3),round((ORIGIN["lon"]-lon)*LONSCALE,3),
         round((point[2] if len(point)>2 and point[2] is not None else BASE)-BASE,3)]
def read_geo(name):
 path=WORK/(name+".geojson")
 if not path.exists():
  return [],False
 value=json.loads(path.read_text(encoding="utf8"))
 return value.get("features",[]),True
def run_for(ref):
 options=[f for f in FEATURES if f.get("properties",{}).get("type")=="run" and
    str(f["properties"].get("ref") or "")==ref and f.get("geometry",{}).get("type")=="LineString"]
 return max(options,key=lambda f:len(f["geometry"]["coordinates"])) if options else None
def lift_for(ref):
 options=[f for f in FEATURES if f.get("properties",{}).get("type")=="lift" and
    str(f["properties"].get("ref") or "")==ref and f.get("geometry",{}).get("type")=="LineString"]
 return max(options,key=lambda f:len(f["geometry"]["coordinates"])) if options else None
def length(pts):
 return sum(math.hypot(b[0]-a[0],b[1]-a[1]) for a,b in zip(pts,pts[1:]))
def xyz_near(points,x,z):
 best=1e30;yy=0
 for a,b in zip(points,points[1:]):
  dx=b[0]-a[0];dz=b[1]-a[1]
  t=max(0,min(1,((x-a[0])*dx+(z-a[1])*dz)/max(1e-8,dx*dx+dz*dz)))
  nx=a[0]+dx*t;nz=a[1]+dz*t
  d2=(x-nx)**2+(z-nz)**2
  if d2<best:
   best=d2;yy=a[2]+(b[2]-a[2])*t
 return best,yy
def merc(lat,lon):
 lat=math.radians(max(-85.051,min(85.051,lat)))
 scale=2**Z
 return ((lon+180)/360*scale,(1-math.asinh(math.tan(lat))/math.pi)/2*scale)
def get_tile(ix,iy):
 k=(ix,iy)
 if k not in TILES:
  url=f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{ix}/{iy}.png"
  error=None
  for a in range(3):
   try:
    req=urllib.request.Request(url,headers={"User-Agent":AGENT})
    with urllib.request.urlopen(req,timeout=45) as resp:payload=resp.read()
    TILES[k]=Image.open(io.BytesIO(payload)).convert("RGB");break
   except Exception as e:
    error=e;time.sleep(2*(a+1))
  if k not in TILES:raise RuntimeError(f"DEM tile {k} unavailable: {error}")
 return TILES[k]
def elevation(x,z):
 lat=ORIGIN["lat"]+x/LATSCALE
 lon=ORIGIN["lon"]-z/LONSCALE
 xx,yy=merc(lat,lon)
 i,j=math.floor(xx),math.floor(yy)
 a=min(255,max(0,int((xx-i)*256)));b=min(255,max(0,int((yy-j)*256)))
 r,g,b=get_tile(i,j).getpixel((a,b))
 return r*256+g+b/256-32768-BASE
def pip(x,z,ring):
 on=False;j=len(ring)-1
 for i in range(len(ring)):
  a,b=ring[i],ring[j]
  if ((a[1]>z)!=(b[1]>z)) and x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]:
   on=not on
  j=i
 return on
def sector_build(spec,forest_data,building_data,forest_available,building_available):
 runs=[]
 for ref in spec["runs"]:
  f=run_for(ref)
  if f:
   p=f["properties"];pts=[xyz(x) for x in f["geometry"]["coordinates"]]
   runs.append({"id":p["id"],"ref":ref,"name":p.get("name") or ("Trasa "+ref),
    "difficulty":p.get("difficulty") or "unknown","length_m":round(length(pts),1),
    "coordinates":pts})
 lifts=[]
 for ref in spec["lifts"]:
  f=lift_for(ref)
  if f:
   p=f["properties"];lifts.append({"id":p["id"],"ref":ref,"name":p.get("name") or ref,
    "coordinates":[xyz(c) for c in f["geometry"]["coordinates"]]})
 if not runs or not lifts or spec["default"] not in [x["ref"] for x in runs]:
  raise RuntimeError("Missing expected authoritative run/lift for "+spec["id"])
 allpoints=[p for o in runs+lifts for p in o["coordinates"]]
 xlo=min(p[0] for p in allpoints)-210;xhi=max(p[0] for p in allpoints)+210
 zlo=min(p[1] for p in allpoints)-210;zhi=max(p[1] for p in allpoints)+210
 # Terrain is approximately 14-22m grid, not a false claim of 1m NMT.
 step=max(14,math.sqrt((xhi-xlo)*(zhi-zlo)/76000))
 cols=math.ceil((xhi-xlo)/step)+1;rows=math.ceil((zhi-zlo)/step)+1
 step_x=(xhi-xlo)/(cols-1);step_z=(zhi-zlo)/(rows-1)
 nearby_segments=[]
 for run in runs:
  nearby_segments.extend(zip(run["coordinates"],run["coordinates"][1:]))
 def nearest(x,z):
  best=1e30;h=0
  for a,b in nearby_segments:
   dx=b[0]-a[0];dz=b[1]-a[1]
   t=max(0,min(1,((x-a[0])*dx+(z-a[1])*dz)/max(1e-8,dx*dx+dz*dz)))
   nx=a[0]+dx*t;nz=a[1]+dz*t;dd=(x-nx)**2+(z-nz)**2
   if dd<best:best=dd;h=a[2]+t*(b[2]-a[2])
  return best,h
 heights=[];groom=[];basecache=[]
 for j in range(rows):
  z=zlo+j*step_z
  row=[]
  for i in range(cols):
   x=xlo+i*step_x
   row.append(elevation(x,z))
  basecache.append(row)
 for j in range(rows):
  z=zlo+j*step_z
  for i in range(cols):
   x=xlo+i*step_x
   h=basecache[j][i]
   d2,ref_h=nearest(x,z)
   # Source centerline height blends into global DEM; lateral relief approximate.
   shift=max(-110,min(110,ref_h-h))*math.exp(-d2/(115*115))
   heights.append(round(h+shift,2))
   groom.append(round(max(0,1-(math.sqrt(d2)-15)/36),2))
 def inside(x,z):
  return xlo<x<xhi and zlo<z<zhi
 # Real polygon placement with deterministic sampling. Do not invent individual trees.
 forest_polys=[]
 for f in forest_data:
  g=f.get("geometry",{})
  if g.get("type")!="Polygon":continue
  ring=[xyz(p)[:2] for p in g["coordinates"][0]]
  if len(ring)<4:continue
  a=max(xlo,min(v[0] for v in ring));b=min(xhi,max(v[0] for v in ring))
  c=max(zlo,min(v[1] for v in ring));d=min(zhi,max(v[1] for v in ring))
  if a<b and c<d:forest_polys.append((ring,a,b,c,d))
 rng=random.Random({"hala":14,"golgota":15,"skrzyczne":16}[spec["id"]])
 trees=[];limit=1300
 for ring,a,b,c,d in forest_polys:
  if len(trees)>=limit:break
  num=min(8000,int((b-a)*(d-c)/170))
  for _ in range(num):
   if len(trees)>=limit:break
   x=rng.uniform(a,b);z=rng.uniform(c,d)
   if pip(x,z,ring) and nearest(x,z)[0]>38**2:
    trees.append([round(x,1),round(z,1),round(rng.uniform(.65,1.30),2)])
 fallback=False
 if len(trees)<65:
  fallback=True
  # Clearly disclosed procedural fallback where OSM forest coverage is insufficient.
  for _ in range(12000):
   if len(trees)>=650:break
   x=rng.uniform(xlo+25,xhi-25);z=rng.uniform(zlo+25,zhi-25)
   if nearest(x,z)[0]<75**2:continue
   cluster=math.sin(x*.003+z*.008)*math.cos(z*.004-x*.009)
   if cluster>.13:trees.append([round(x,1),round(z,1),round(rng.uniform(.65,1.30),2)])
 buildings=[]
 for f in building_data:
  g=f.get("geometry",{});t=f.get("properties",{}).get("tags",{})
  if g.get("type")!="Polygon":continue
  coords=[xyz(p)[:2] for p in g["coordinates"][0]]
  if len(coords)<4:continue
  x=sum(p[0] for p in coords[:-1])/(len(coords)-1)
  z=sum(p[1] for p in coords[:-1])/(len(coords)-1)
  if not inside(x,z):continue
  if nearest(x,z)[0]>300**2:continue
  if len(coords)>35:continue
  levels=t.get("building:levels")
  try:h=round(max(3,min(22,float(levels)*3.1)),1) if levels else 7
  except (TypeError,ValueError):h=7
  buildings.append({"id":f.get("id","osm"),"p":[[round(u,1),round(v,1)] for u,v in coords[:-1]],"height":h,"estimated_height":not bool(levels)})
  if len(buildings)>=95:break
 main=next(x for x in runs if x["ref"]==spec["default"])
 result={
  "format":"smr-resort-multi-zone-14","id":spec["id"],"name":spec["name"],
  "origin":ORIGIN,"terrain":{"x0":round(xlo,3),"z0":round(zlo,3),
      "step_x":round(step_x,6),"step_z":round(step_z,6),"cols":cols,"rows":rows,
      "heights":heights,"groom":groom},
  "runs":runs,"lifts":lifts,"route":main["coordinates"],"lift_b1":lifts[0]["coordinates"],
  "forest_trees":trees,"buildings":buildings,
  "source":{"name":"OpenSkiMap OpenSkiData / OSM","url":"https://api.openskimap.org/features.geojson",
    "run_id":main["id"],"source_bounds":"GPS OpenSkiMap features",
    "terrain":"Mapzen Terrarium z12 interpolated and corrected near OpenSkiMap 3D route centerlines",
    "osm_forest_polygons_available":forest_available,"osm_buildings_available":building_available,
    "forest_fallback_procedural":fallback,
    "license":"OpenStreetMap contributors ODbL; Mapzen terrain source attribution required"},
  "reference":{"name":main["name"],"ref":main["ref"],"piste_width_measured_m":None,
    "render_width_status":"illustrative piste grooming, not a field survey",
    "not_1_to_1":True}
 }
 (OUT/(spec["id"]+".json")).write_text(json.dumps(result,ensure_ascii=False,separators=(",",":")),encoding="utf8")
 return {"id":spec["id"],"title":spec["name"],"short":spec["short"],
  "scene":"./data/"+spec["id"]+".json","defaultRun":spec["default"],
  "runs":[{"ref":r["ref"],"name":r["name"],"difficulty":r["difficulty"],"length_m":r["length_m"]} for r in runs],
  "liftCount":len(lifts),"buildingCount":len(buildings),"treeCount":len(trees),
  "forestProcedural":fallback,"terrainCells":len(heights)}
forest,fa=read_geo("forest");buildings,ba=read_geo("buildings")
manifest={"format":"smr-14-sector-index","source":"OpenSkiMap and OSM features","defaultSector":"hala",
 "sectors":[sector_build(s,forest,buildings,fa,ba) for s in SECTORS],
 "accuracy_warning":"Play routes use original OpenSkiMap centerlines, but piste borders and terrain outside run axes are approximations."}
(OUT/"index.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf8")
print(json.dumps({"sectors":[{"id":s["id"],"runs":len(s["runs"]),"lifts":s["liftCount"],
  "trees":s["treeCount"],"forestProcedural":s["forestProcedural"],"buildings":s["buildingCount"],
  "cells":s["terrainCells"]} for s in manifest["sectors"]],"tiles":len(TILES)},ensure_ascii=False,indent=2))
