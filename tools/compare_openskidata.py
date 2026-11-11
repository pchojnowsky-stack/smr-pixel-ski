#!/usr/bin/env python3
"""Audited OpenSkiData Run GeoJSON comparison against route 4 in SMR Pixel Ski.
Never auto-replace geometry or infer piste width from a centerline.
"""
import argparse
import datetime
import json
import math
from pathlib import Path

def local(origin,lon,lat):
    return [(lat-origin["lat"])*111132.5,(origin["lon"]-lon)*111320*math.cos(math.radians(origin["lat"]))]
def length(points):
    return sum(math.dist(a,b) for a,b in zip(points,points[1:]))
def at_fraction(points,f):
    ds=[0.]
    for a,b in zip(points,points[1:]):ds.append(ds[-1]+math.dist(a,b))
    target=f*ds[-1];i=1
    while i<len(ds)-1 and ds[i]<target:i+=1
    t=(target-ds[i-1])/max(1e-8,ds[i]-ds[i-1])
    return [points[i-1][j]*(1-t)+points[i][j]*t for j in (0,1)]
def deviation(a,b):
    if len(a)<2 or len(b)<2:return None
    return min(sum(math.dist(at_fraction(a,i/20),at_fraction(orient,i/20)) for i in range(21))/21 for orient in [b,list(reversed(b))])
def valid(coords):
    return isinstance(coords,list) and len(coords)>=2 and all(isinstance(p,(list,tuple)) and len(p)>=2
        and all(isinstance(v,(int,float)) for v in p[:2]) and 18.90<p[0]<19.12 and 49.62<p[1]<49.78 for p in coords)
def compare(scene,features,source):
    route=scene["route"];origin=scene["origin"];matches=[];considered=0
    for feat in features:
        if feat.get("type")!="Feature":continue
        p=feat.get("properties") or {}; g=feat.get("geometry") or {}
        uses=p.get("uses") or []
        if "downhill" not in uses and p.get("piste:type")!="downhill":continue
        typ=g.get("type");coordinates=g.get("coordinates") or []
        if typ=="LineString":lines=[coordinates] if valid(coordinates) else []
        elif typ=="MultiLineString":lines=[a for a in coordinates if valid(a)]
        elif typ=="Polygon":lines=[] if coordinates and valid(coordinates[0]) else None
        else:continue
        if lines is None or (typ!="Polygon" and not lines):continue
        considered+=1
        name=str(p.get("name") or "");ref=str(p.get("ref") or "")
        sections=[]
        for line in lines:
            xy=[local(origin,*point[:2]) for point in line]
            sections.append({"length_m":round(length(xy),1),"mean_axis_offset_m":round(deviation(route,xy),1),
              "start_offset_m":round(min(math.dist(xy[0],route[0]),math.dist(xy[-1],route[0])),1),
              "end_offset_m":round(min(math.dist(xy[0],route[-1]),math.dist(xy[-1],route[-1])),1)})
        best=min(sections,key=lambda t:t["mean_axis_offset_m"],default=None)
        identity="szumarj" in name.casefold() or "szmaragd" in name.casefold() or ref.strip()=="4"
        if identity or (best and best["mean_axis_offset_m"]<250):
            matches.append({"id":str(p.get("id") or feat.get("id") or ""),"name":name,"ref":ref,
             "geometry_type":typ,"identity_tag_match":identity,"segments":sections,
             "best_geometry_comparison":best,"sources":p.get("sources",[]),
             "manual_review_required":True})
    matches.sort(key=lambda x:(not x["identity_tag_match"],(x["best_geometry_comparison"] or {}).get("mean_axis_offset_m",float("inf"))))
    return {"generated_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "source":source,"source_project":"https://github.com/russellporter/openskidata-processor",
        "reference_osm_way":scene["reference"]["osm_way"],
        "current_length_m":scene["reference"]["osm_route_length_m"],
        "operator_length_m":scene["reference"]["operator_published_length_m"],
        "reviewed_runs":considered,"potential_matches":matches,
        "chosen_replacement_route":None,"measured_width_m":None,
        "data_license_to_verify":True,
        "caveats":["OpenSkiData primarily derives from OpenStreetMap, not independent surveying.",
          "Single named route can be split into several Run features; match connected segments.",
          "Area boundary must not be used as an axis; manual orthoimage verification required.",
          "This analysis does not alter the published game."]}
def main():
    a=argparse.ArgumentParser()
    a.add_argument("--runs",required=True,help="Downloaded OpenSkiData runs.geojson")
    a.add_argument("--scene",default="v09/data/scene.json")
    a.add_argument("--out",default="v09/data/openskidata-comparison.json")
    o=a.parse_args()
    scene=json.loads(Path(o.scene).read_text(encoding="utf-8"))
    runs=json.loads(Path(o.runs).read_text(encoding="utf-8"))
    if runs.get("type")!="FeatureCollection" or not isinstance(runs.get("features"),list):
        raise ValueError("Expected GeoJSON FeatureCollection")
    report=compare(scene,runs["features"],o.runs)
    output=Path(o.out);output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({"report":str(output),"reviewed_runs":report["reviewed_runs"],
       "matches":len(report["potential_matches"]),"geometry_auto_replaced":False}))
if __name__=="__main__":main()
