#!/usr/bin/env python3
"""Validate resort's published multi-zone geographic data before browser rendering."""
import json,math,pathlib
DATA=pathlib.Path("v14/data")
index=json.loads((DATA/"index.json").read_text(encoding="utf8"))
assert len(index["sectors"])==3,index
run_ids=set()
all_lifts=set()
for sector in index["sectors"]:
 s=json.loads((DATA/(sector["id"]+".json")).read_text(encoding="utf8"))
 t=s["terrain"]
 assert t["cols"]*t["rows"]==len(t["heights"])==len(t["groom"])
 assert len(s["runs"])==len(sector["runs"])
 assert len(s["lifts"])==sector["liftCount"]
 assert len(s["forest_trees"])>=100
 assert s["reference"]["piste_width_measured_m"] is None
 assert max(t["heights"])-min(t["heights"])>90
 assert t["step_x"]>0 and t["step_z"]>0
 for line in s["runs"]:
  assert len(line["coordinates"])>=2
  assert line["length_m"]>180
  assert line["id"] not in run_ids, "Duplicate run "+line["id"]
  run_ids.add(line["id"])
 for lift in s["lifts"]:
  assert len(lift["coordinates"])>=2
  all_lifts.add(lift["id"])
 assert sector["defaultRun"] in [x["ref"] for x in s["runs"]]
 print(sector["id"],"runs",len(s["runs"]),"lifts",len(s["lifts"]),"trees",len(s["forest_trees"]),"cells",len(t["heights"]))
assert len(run_ids)>=14 and len(all_lifts)>=7
print("GEO DATA PASS",len(run_ids),"runs,",len(all_lifts),"lifts, 3 sectors")
