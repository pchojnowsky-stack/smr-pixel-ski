#!/usr/bin/env python3
"""Offline spatial regression: no v18 OSM forest tree may intersect a piste,
lift, building or station buffer; no projected feature may exceed sector.
Source: OSM woodlands/buildings, GUGiK terrain for y.
"""
import json
import pathlib
import sys
from shapely.geometry import LineString, Point, Polygon, box
from shapely.ops import unary_union
from shapely.prepared import prep
ROOT=pathlib.Path(__file__).resolve().parents[1]
for sector in ("hala","golgota","skrzyczne"):
 scene=json.loads((ROOT/"v14/data"/(sector+".json")).read_text())
 data=json.loads((ROOT/"v18/data"/(sector+".json")).read_text())
 T=scene["terrain"]
 bounds=box(T["x0"]+14,T["z0"]+14,
   T["x0"]+(T["cols"]-1)*T["step_x"]-14,
   T["z0"]+(T["rows"]-1)*T["step_z"]-14)
 runs=[LineString([(p[0],p[1]) for p in run["coordinates"]]) for run in scene["runs"]]
 lifts=[LineString([(p[0],p[1]) for p in lift["coordinates"]]) for lift in scene["lifts"]]
 stations=[Point(p[0],p[1]) for lift in scene["lifts"] for p in (lift["coordinates"][0],lift["coordinates"][-1])]
 buildings=[]
 seen=set()
 for b in data["buildings"]:
  assert b["id"] not in seen,(sector,"duplicated building",b["id"]);seen.add(b["id"])
  assert b["id"].startswith("way/"),(sector,"not a real OSM way id",b["id"])
  poly=Polygon(b["p"])
  assert poly.is_valid and poly.area>=8,(sector,"invalid building",b["id"])
  assert bounds.buffer(20).contains(poly.centroid),(sector,"out of bounds",b["id"])
  buildings.append(poly)
 risk=unary_union(
    [line.buffer(30.8) for line in runs]
   +[line.buffer(8.8) for line in lifts]
   +[s.buffer(27.8) for s in stations]
   +[poly.buffer(8.6) for poly in buildings])
 masked=prep(risk)
 positions=set()
 for x,z,scale in data["trees"]:
  p=Point(x,z)
  assert bounds.contains(p),(sector,"tree off-map",x,z)
  assert not masked.contains(p),(sector,"tree collides with run, lift, station or building",x,z)
  assert (.5<scale<1.45),(sector,"invalid spruce scale",scale)
  key=(x,z)
  assert key not in positions,(sector,"duplicate tree",x,z)
  positions.add(key)
 # Coordinate-system regression: the same OSM way IDs from the older sector
 # must remain in roughly the same place. This catches lon/lat swaps, east/west
 # inversions, or accidental changes to the local geo projection.
 old_centres={}
 for old in scene["buildings"]:
  if len(old["p"])>=3:
   old_centres[old["id"]]=Polygon(old["p"]).centroid
 displacements=[]
 for mapped in data["buildings"]:
  old=old_centres.get(mapped["id"])
  if old is not None:
   displacements.append(old.distance(Polygon(mapped["p"]).centroid))
 assert len(displacements)>=3,(sector,"too few shared footprint IDs to verify coordinate transform")
 displacements.sort()
 assert displacements[len(displacements)//2]<3.0,(sector,"OSM building projection differs from older map",displacements[len(displacements)//2])
 assert displacements[int((len(displacements)-1)*.90)]<10.0,(sector,"OSM footprint placement changed too far",displacements[-5:])
 assert len(data["trees"])>=40
 print("SPATIAL PASS",sector,len(data["trees"]),"OSM woodland trees",len(buildings),"OSM buildings",
       "no piste/building/lift collisions",len(displacements),"matched OSM ids",flush=True)
