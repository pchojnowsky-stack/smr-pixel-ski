"""Unit tests with synthetic georeferenced DEM; no network access required."""
import importlib.util,json,tempfile,unittest
from pathlib import Path
import numpy as np,rasterio
from rasterio.transform import from_origin
spec=importlib.util.spec_from_file_location("tb","tools/terrain_builder.py")
tb=importlib.util.module_from_spec(spec);spec.loader.exec_module(tb)
class TerrainTest(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory()
  self.dir=Path(self.tmp.name)
  scene=json.loads(Path("v09/data/scene.json").read_text())
  # Compact fixture: 45 x 65 meters, snapped to existing origin, no change to production data.
  scene["terrain"]={"x0":0,"z0":0,"step":5,"cols":10,"rows":14}
  self.origin=scene["origin"]
  self.scene=self.dir/"scene.json";self.scene.write_text(json.dumps(scene))
  # WGS84 fixture with broad coverage, constant known height.
  lon,lat=tb.origin_transform(scene["origin"])[0](0,0)
  tif=self.dir/"dem.tif"
  with rasterio.open(tif,"w",driver="GTiff",width=128,height=128,count=1,dtype="float32",
     crs="EPSG:4326",transform=from_origin(lon-.005,lat+.005,.0001,.0001),
     nodata=-9999) as ds:ds.write(np.full((128,128),901,dtype="float32"),1)
  self.tif=tif
 def tearDown(self):self.tmp.cleanup()
 def test_flat_dem(self):
  r=tb.build(self.scene,self.tif,self.dir/"out.json",grid_step=5)
  self.assertEqual(r["terrain"]["cols"],10);self.assertEqual(r["terrain"]["rows"],14)
  self.assertTrue(all(y==251 for y in r["terrain"]["heights"]))
  self.assertIsNone(r["piste_boundary_local"])
 def test_boundary_geojson(self):
  lon,lat=tb.origin_transform(self.origin)[0](0,0)
  coords=[[lon,lat],[lon-.00005,lat],[lon-.00005,lat+.00005],[lon,lat+.00005],[lon,lat]]
  p=self.dir/"piste.geojson"
  p.write_text(json.dumps({"type":"Polygon","coordinates":[coords]}))
  result=tb.build(self.scene,self.tif,self.dir/"out.json",boundary=p,grid_step=5)
  self.assertEqual(len(result["piste_boundary_local"]),1)
  self.assertIn("supplied",result["piste_boundary_status"])
 def test_reject_missing_coverage(self):
  with rasterio.open(self.tif,"r+") as ds:
   ds.write(np.full((128,128),-9999,dtype="float32"),1)
  with self.assertRaisesRegex(ValueError,"NoData"):tb.build(self.scene,self.tif,self.dir/"out.json",grid_step=5)
 def test_reject_fake_polygon(self):
  p=self.dir/"fake.json";p.write_text(json.dumps({"type":"Polygon","coordinates":[[[0,0],[100,0],[100,100],[0,0]]]}))
  with self.assertRaisesRegex(ValueError,"WGS84"):tb.load_boundary(p,self.origin)
if __name__=="__main__":unittest.main()
