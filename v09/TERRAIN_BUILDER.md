# SMR Terrain Builder 0.9.2 — real terrain build pipeline

The previous game preview uses Mapzen coarse DEM, 38m illustrative ribbon and primitive tree cones. A convincing recreation **cannot** be achieved by styling alone.

## References and independent implementation
- BlenderGIS: https://github.com/domlysz/BlenderGIS (GIS workflow reference).
- OSM OpenSkiMap: https://openskimap.org (piste data conventions and quality review).
- Open Ski Model: https://github.com/bkahan/open-ski-model (ski mountain model concept; check actual code license before reuse).
- Polish geoportal NMT: https://www.geoportal.gov.pl/pl/dane/numeryczny-model-terenu-nmt/
- OSM geometry license ODbL https://www.openstreetmap.org/copyright

The tool below is original code. No copied third-party code/assets.

## Generate actual high resolution terrain (when GUGiK raster available)

```bash
python -m pip install numpy rasterio pyproj shapely
python tools/terrain_builder.py --dem input/NMT_Szczyrk.tif --scene v09/data/scene.json --step 2 --out v09/data/terrain-hires.json
```

Optional: add a **verified**, manually traced GeoJSON polygon in EPSG:4326 WGS84 lon-lat with `--boundary input/szumarjanka-area.geojson`. It is not valid to invent the width. See generated metadata for CRS, actual input resolution and source. Do not commit restricted source rasters or unverified outlines.

### Limitations
- Assumes GeoTIFF contains vertical values **in metres**. Verify source's *vertical* CRS explicitly before claiming PL-EVRF2007-NH.
- Nearest-neighbor sample currently chosen to preserve input readings; a next stage can offer hillshade, bilinear resampling, terrain LOD and high performance mobile tiling.
- If data coverage has NoData, tool stops instead of creating fake elevations.
- The existing 38m ribbon in v09 remains illustrative until polygon geometry supplied.
- Output is a source asset for further integration. **It is not loaded by the published game automatically**; the current scene remains unchanged.
- Validate polygon against GUGiK orthophoto and OSM topology. Reconcile the OSM 1686m vs operator 2014m difference before claiming 1:1.

## Automated checks
`python -m unittest discover -s tools -p 'test_terrain_builder.py' -v` uses a generated georeferenced GeoTIFF and checks height values, boundary handling, and NoData rejection.
