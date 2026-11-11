#!/usr/bin/env python3
"""Fetch one bounded OpenSkiMap official API extract (not tile scraping).
Published API implementation: /features.geojson?bbox=minLon,minLat,maxLon,maxLat&types=run,lift
https://github.com/russellporter/api.openskimap.org/blob/master/src/app.ts
"""
import json,sys,urllib.parse,urllib.request,datetime,pathlib,collections,time
BBOX=(18.974,49.681,19.049,49.715)
api="https://api.openskimap.org/features.geojson"
url=api+"?"+urllib.parse.urlencode({"bbox":",".join(map(str,BBOX)),"types":"run,lift"})
directory=pathlib.Path("v10/data");directory.mkdir(parents=True,exist_ok=True)
response=None;error=None
for attempt in range(3):
 try:
  req=urllib.request.Request(url,headers={"User-Agent":"SMR-Pixel-Ski/1.0 (research noncommercial geodata rebuild; source attributed)","Accept":"application/geo+json,application/json"})
  with urllib.request.urlopen(req,timeout=35) as res: response=res.read(12000000)
  break
 except Exception as exc:
  error=repr(exc);time.sleep(3*(attempt+1))
if response is None:raise RuntimeError("Official OpenSkiMap API unavailable: "+str(error))
data=json.loads(response)
if data.get("type")!="FeatureCollection" or not isinstance(data.get("features"),list):raise RuntimeError("Unexpected OpenSkiMap API response")
feats=data["features"]
summary={"retrieved_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"source_url":url,"bbox_wsen":BBOX,"count":len(feats),
 "feature_type_counts":dict(collections.Counter(str((f.get("properties") or {}).get("type")) for f in feats)),
 "names":[{"id":(f.get("properties") or {}).get("id"),"name":(f.get("properties") or {}).get("name"),"ref":(f.get("properties") or {}).get("ref"),
          "geometry":(f.get("geometry") or {}).get("type"),"sources":(f.get("properties") or {}).get("sources",[])[:2]} for f in feats if any(
         w in str((f.get("properties") or {}).get("name","")).casefold() for w in ("szumarj","szmaragd","solisko","skrzycz")) or str((f.get("properties") or {}).get("ref"))=="4"][:40],
 "license":"OpenSkiMap/OpenSkiData uses OSM data (ODbL) and other attributed sources; verify derived dataset licensing before redistribution."}
(directory/"openskimap-features.geojson").write_text(json.dumps(data,ensure_ascii=False,separators=(",",":")),encoding="utf8")
(directory/"openskimap-source-report.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding="utf8")
print("OPEN SKI MAP FETCH",json.dumps(summary,ensure_ascii=False)[:16000],flush=True)
if not feats:raise RuntimeError("OpenSkiMap returned no features for Szczyrk")
