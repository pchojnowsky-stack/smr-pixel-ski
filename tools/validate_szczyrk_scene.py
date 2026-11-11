#!/usr/bin/env python3
"""Simple regression checks for the GIS-to-game data contract."""
import json,math
from pathlib import Path
p=Path(__file__).resolve().parent.parent/"v09"/"data"/"scene.json"
d=json.loads(p.read_text(encoding="utf-8"))
route=d["route"]
length=sum(math.hypot(b[0]-a[0],b[1]-a[1]) for a,b in zip(route,route[1:]))
assert 1550<length<1850,(length,"route")
assert d["reference"]["piste_width_measured_m"] is None
assert d["reference"]["rendered_band_status"].startswith("illustrative")
assert len(d["forest_trees"])>=40
assert len(d["buildings"])>=1
assert len(d["lift_b1"])>=2
assert len(d["terrain"]["heights"])==d["terrain"]["rows"]*d["terrain"]["cols"]
assert all(0<=c[1]<=1600 for c in route)
assert 0<max(d["terrain"]["heights"])-min(d["terrain"]["heights"])<700
print("GEODATA VALID: %.1fm, %d forest trees, %d buildings, %d terrain cells"%(length,len(d["forest_trees"]),len(d["buildings"]),len(d["terrain"]["heights"])))
