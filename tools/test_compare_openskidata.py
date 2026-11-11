import importlib.util
import json
import unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location("openski","tools/compare_openskidata.py")
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class OpenSkiDataTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.scene=json.loads(Path("v09/data/scene.json").read_text(encoding="utf8"))
  import math
  o=cls.scene["origin"]
  cls.to_geo=staticmethod(lambda x,z:[o["lon"]-z/(111320*math.cos(math.radians(o["lat"]))),o["lat"]+x/111132.5])
 def feature(self,points,name="Szumarjanka",ref="4",typ="LineString"):
  coords=[self.to_geo(*p) for p in points]
  if typ=="Polygon":coords=[coords+[coords[0]]]
  return {"type":"Feature","geometry":{"type":typ,"coordinates":coords},
   "properties":{"type":"Run","uses":["downhill"],"name":name,"ref":ref,"id":"fixture","sources":[]}}
 def test_matching_reversed(self):
  f=self.feature(list(reversed(self.scene["route"])))
  r=mod.compare(self.scene,[f],"synthetic fixture")
  self.assertEqual(r["reviewed_runs"],1)
  self.assertLess(r["potential_matches"][0]["best_geometry_comparison"]["mean_axis_offset_m"],.05)
  self.assertIsNone(r["chosen_replacement_route"])
 def test_area_is_not_centerline(self):
  r=mod.compare(self.scene,[self.feature([[0,0],[0,40],[30,40],[30,0]],typ="Polygon")],"fixture")
  self.assertEqual(r["potential_matches"][0]["geometry_type"],"Polygon")
  self.assertIsNone(r["potential_matches"][0]["best_geometry_comparison"])
 def test_unrelated_distant_skipped(self):
  f=self.feature([[700,0],[700,50]],name="Other",ref="7")
  r=mod.compare(self.scene,[f],"fixture")
  self.assertEqual(len(r["potential_matches"]),0)
 def test_invalid_coordinates_skipped(self):
  f=self.feature(self.scene["route"])
  f["geometry"]["coordinates"]=[[123,10],[124,11]]
  self.assertEqual(mod.compare(self.scene,[f],"fixture")["reviewed_runs"],0)
 def test_downhill_only(self):
  f=self.feature(self.scene["route"]);f["properties"]["uses"]=["nordic"]
  self.assertEqual(mod.compare(self.scene,[f],"fixture")["reviewed_runs"],0)
if __name__=="__main__":unittest.main()
