#!/usr/bin/env python3
"""Build new 3D run model using real OpenSkiMap XYZ run/lift geometry and mapped OSM forest.
The centerline's 3D elevations correct a coarse regional DEM near the piste.
Piste width remains unmeasured (rendered visual band NOT actual mapped boundary).
"""
import json,math,random,datetime,pathlib
BASE=pathlib.Path("v09/data/scene.json")
API=pathlib.Path("v10/data/openskimap-features.geojson")
FOREST=pathlib.Path("v10/work/forest.geojson")
OUT=pathlib.Path("v10/data/scene.json")
prior=json.loads(BASE.read_text())
features=json.loads(API.read_text())["features"]
run=next((f for f in features if (f.get("properties") or {}).get("ref")=="4" and (f.get("properties") or {}).get("name")=="Szumarjanka"),None)
if run is None or run["geometry"]["type"]!="LineString":raise SystemExit("OpenSkiMap Szumarjanka 4 LineString not found")
lift=next((f for f in features if (f.get("properties") or {}).get("ref")=="B1" and (f.get("properties") or {}).get("type")=="lift"),None)
if not lift:raise SystemExit("B1 chairlift source missing")
origin=prior["origin"];lat0=origin["lat"];lon0=origin["lon"];lat_scale=111132.5;lon_scale=111320*math.cos(math.radians(lat0))
def to_local(point):return [(point[1]-lat0)*lat_scale,(lon0-point[0])*lon_scale,point[2]-650 if len(point)>2 else None]
route=[to_local(p) for p in run["geometry"]["coordinates"]]
liftline=[to_local(p) for p in lift["geometry"]["coordinates"]]
def lerp(a,b,t):return a*(1-t)+b*t
def dist2_segment(x,z,a,b):
 dx=b[0]-a[0];dz=b[1]-a[1];s=((x-a[0])*dx+(z-a[1])*dz)/max(1e-8,dx*dx+dz*dz)
 t=min(1,max(0,s));qx=lerp(a[0],b[0],t);qz=lerp(a[1],b[1],t)
 return (x-qx)**2+(z-qz)**2,lerp(a[2],b[2],t)
def route_nearest(x,z):
 return min((dist2_segment(x,z,a,b) for a,b in zip(route,route[1:])),key=lambda i:i[0])
dem=prior["terrain"];dx=dem["step"];rows=dem["rows"];cols=dem["cols"];v=dem["heights"]
def source_height(x,z):
 fx=min(cols-1.00001,max(0,(x-dem["x0"])/dx))
 fz=min(rows-1.00001,max(0,(z-dem["z0"])/dx))
 ix=int(fx);iz=int(fz);tx=fx-ix;tz=fz-iz
 def at(a,b):return v[b*cols+a]
 return lerp(lerp(at(ix,iz),at(ix+1,iz),tx),lerp(at(ix,iz+1),at(ix+1,iz+1),tx),tz)
# Set a narrow, non-fictitious height correction on the 3D centerline.
# This does NOT claim actual width; smooth influence blends into surrounding terrain.
step=7;nx=math.ceil((cols-1)*dx/step)+1;nz=math.ceil((rows-1)*dx/step)+1
outheights=[];maxcorrection=0
for j in range(nz):
 z=dem["z0"]+(rows-1)*dx*j/(nz-1)
 for i in range(nx):
  x=dem["x0"]+(cols-1)*dx*i/(nx-1)
  base=source_height(x,z);d2,rh=route_nearest(x,z)
  err=rh-source_height(*route[0][:2]) if False else rh-base
  # Local relief is still coarse away from the run. Apply correction within 120m.
  influence=math.exp(-d2/(118*118))
  delta=max(-100,min(100,err))*influence
  maxcorrection=max(maxcorrection,abs(delta))
  outheights.append(round(base+delta,2))
def nearest_floor(x,z):
 fx=min(nx-1.00001,max(0,(x-dem["x0"])/((cols-1)*dx/(nx-1))))
 fz=min(nz-1.00001,max(0,(z-dem["z0"])/((rows-1)*dx/(nz-1))))
 i=int(fx);j=int(fz);t=fx-i;u=fz-j
 def at(a,b):return outheights[b*nx+a]
 return lerp(lerp(at(i,j),at(i+1,j),t),lerp(at(i,j+1),at(i+1,j+1),t),u)
# Real mapped forest polygons, with procedurally distributed individual trees INSIDE polygons only.
rng=random.Random(10401);trees=[]
def in_poly(x,z,ring):
 inside=False;j=len(ring)-1
 for i in range(len(ring)):
  xi,zi=ring[i];xj,zj=ring[j]
  if ((zi>z)!=(zj>z)) and (x<(xj-xi)*(z-zi)/(zj-zi)+xi):inside=not inside
  j=i
 return inside
if FOREST.exists():
 polygons=json.loads(FOREST.read_text())["features"]
 for feature in polygons:
  g=feature.get("geometry") or {}
  if g.get("type")!="Polygon":continue
  ring=[[to_local(p)[0],to_local(p)[1]] for p in g["coordinates"][0]]
  if len(ring)<4:continue
  xmin=max(dem["x0"],min(p[0] for p in ring));xmax=min(dem["x0"]+(cols-1)*dx,max(p[0] for p in ring))
  zmin=max(dem["z0"],min(p[1] for p in ring));zmax=min(dem["z0"]+(rows-1)*dx,max(p[1] for p in ring))
  if xmin>=xmax or zmin>=zmax:continue
  for _ in range(min(8000,int((xmax-xmin)*(zmax-zmin)/150))):
   x=rng.uniform(xmin,xmax);z=rng.uniform(zmin,zmax)
   if not in_poly(x,z,ring):continue
   d2,_=route_nearest(x,z)
   if d2<35**2:continue # keep safe visual opening along piste (not measured edge)
   trees.append([round(x,1),round(z,1),round(rng.uniform(.64,1.34),2)])
 # Thin instance limit for mobile; keep geographic provenance.
 rng.shuffle(trees);trees=trees[:1400]
else:trees=prior["forest_trees"]
route_length=sum(math.hypot(b[0]-a[0],b[1]-a[1]) for a,b in zip(route,route[1:]))
if not 1550<route_length<1900:raise ValueError("Unexpected OpenSkiMap route axis length")
result={"format":"smr-szczyrk-openskimap-v10",
 "source":{"name":"OpenSkiMap OpenSkiData","url":"https://api.openskimap.org/features.geojson",
           "run_id":run["properties"]["id"],"osm_sources":run["properties"]["sources"],
           "lift_id":lift["properties"]["id"],"lift_osm_sources":lift["properties"]["sources"],
           "license":"OpenStreetMap contributors ODbL (derived source attribution required)",
           "generated_utc":datetime.datetime.now(datetime.timezone.utc).isoformat()},
 "origin":origin,
 "route":[[round(q,3) for q in p] for p in route],
 "lift_b1":[[round(q,3) for q in p] for p in liftline],
 "terrain":{"x0":dem["x0"],"z0":dem["z0"],"step_x":round((cols-1)*dx/(nx-1),4),
    "step_z":round((rows-1)*dx/(nz-1),4),"cols":nx,"rows":nz,"heights":outheights},
 "forest_trees":trees,"buildings":prior["buildings"],
 "reference":{"name":"Szumarjanka","ref":"4","openskidata_axis_length_m":round(route_length,1),
  "published_route_length_m":2014,"run_altitude_start_m":route[0][2]+650,
  "run_altitude_end_m":route[-1][2]+650,
  "piste_width_measured_m":None,"render_width_m":38,
  "render_width_status":"illustrative until ortho-verified piste area polygons",
  "elevation_quality":"OpenSkiMap/OpenSkiData 3D centerline, blended with coarse Mapzen DEM",
  "terrain_correction_max_m":round(maxcorrection,1),
  "caution":"Course geometry is OpenSkiMap-derived OSM and not a cadastral survey. 1m GUGiK DEM and actual piste boundaries pending."}}
OUT.write_text(json.dumps(result,ensure_ascii=False,separators=(",",":")),encoding="utf8")
print("SCENE v10",json.dumps({k:result["reference"].get(k) for k in ("openskidata_axis_length_m","run_altitude_start_m","run_altitude_end_m","terrain_correction_max_m")}),"trees",len(trees),"buildings",len(result["buildings"]),"terrain",nx,nz,flush=True)
assert len(trees)>120 and len(outheights)==nx*nz
