"""Fetch NASA GIBS WMS imagery (JPEG) into web/public/img/gibs/."""
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw" / "gibs"
OUT = ROOT.parent / "web" / "public" / "img" / "gibs"
WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
MODIS = "MODIS_Terra_CorrectedReflectance_TrueColor"
CREDIT_MODIS = "NASA EOSDIS GIBS / Worldview; MODIS Terra"
CREDIT_HLS = "NASA EOSDIS GIBS / Worldview; HLS: NASA/USGS Harmonized Landsat Sentinel-2"
W = 2048

HLS_S = "HLS_S30_Nadir_BRDF_Adjusted_Reflectance"
HLS_L = "HLS_L30_Nadir_BRDF_Adjusted_Reflectance"
HLS = HLS_S
# file -> (layer, bbox lat_min,lon_min,lat_max,lon_max, resolution_m, credit, chosen date)
JOBS = {
    "angola_cunene_namibe_modis.jpg": (MODIS, (-17.5, 11.5, -14.0, 16.0), 250, CREDIT_MODIS, "2025-06-16"),
    "angola_cunene_hls30.jpg": (HLS_L, (-17.32, 15.48, -16.82, 15.98), 30, CREDIT_HLS, "2024-08-13"),
    "jeddah_hls30.jpg": (HLS_S, (21.35, 39.05, 21.75, 39.35), 30, CREDIT_HLS, "2024-07-04"),
}
OVERRIDE = Path(__file__).with_name("gibs_dates.json")  # optional {file: date} overrides

# Prompt E4: Jeddah flood, 24 Nov 2022. IMERG 30-minute rain (about 10 km) and MODIS Terra true colour.
IMERG_WANTED = "IMERG_Rain_Rate"  # layer id named in prompt E; not in GIBS capabilities (ISSUES.md)
IMERG_FALLBACK = "IMERG_Precipitation_Rate_30min"
CREDIT_IMERG = "NASA EOSDIS GIBS / Worldview; NASA GPM IMERG (Early/Late run, 30 min)"
JEDDAH_RAIN_BBOX = (20.0, 37.7, 23.0, 40.7)
JEDDAH_MODIS_BBOX = (20.9, 38.6, 22.1, 39.8)
# Storm frames (UTC; Jeddah = UTC+3): the National Center of Meteorology reported 179 mm in 6 h on the
# morning of 24 Nov 2022, so frames cluster 03-12 UTC on 24 Nov plus one on 25 Nov.
IMERG_TIMES = ["2022-11-24T03:00:00Z", "2022-11-24T05:00:00Z", "2022-11-24T07:00:00Z",
               "2022-11-24T09:00:00Z", "2022-11-24T12:00:00Z", "2022-11-25T03:00:00Z"]
MODIS_DATES = ["2022-11-23", "2022-11-24", "2022-11-25", "2022-11-26", "2022-11-27"]


def jeddah_jobs(info):
    layer = IMERG_WANTED if IMERG_WANTED in info else IMERG_FALLBACK if IMERG_FALLBACK in info else None
    jobs = []
    if layer:
        for t in IMERG_TIMES:
            fn = f"jeddah_imerg_{t[:13].replace('-', '').replace('T', '_')}z.jpg"
            jobs.append((fn, layer, JEDDAH_RAIN_BBOX, 10000, CREDIT_IMERG, t, 512))
    for d in MODIS_DATES:
        jobs.append((f"jeddah_modis_{d.replace('-', '')}.jpg", MODIS, JEDDAH_MODIS_BBOX, 250, CREDIT_MODIS, d, 1024))
    return layer, jobs


def main_jeddah():
    """Idempotent: existing files are kept; credits.json entries are merged by file name. Failures are logged, not faked."""
    info = layers_info()
    layer, jobs = jeddah_jobs(info)
    print("IMERG layer:", layer, "(wanted", IMERG_WANTED + ")")
    OUT.mkdir(parents=True, exist_ok=True)
    cpath = OUT / "credits.json"
    credits = {c["file"]: c for c in json.loads(cpath.read_text(encoding="utf-8"))} if cpath.exists() else {}
    failed = []
    for fn, lay, bbox, res, credit, date, width in jobs:
        dest = OUT / fn
        url = credits.get(fn, {}).get("url") if dest.exists() else None
        if not url:
            url = getmap(lay, bbox, date, dest, width)
        if not url:
            failed.append(fn); continue
        print(fn, date, dest.stat().st_size // 1024, "KB")
        credits[fn] = {"file": fn, "layer": lay, "date": date, "bbox": list(bbox), "resolution_m": res,
                       "credit": credit, "url": url, "scenario": "jeddah-flood"}
    cpath.write_text(json.dumps(list(credits.values()), indent=1), encoding="utf-8")
    if failed:
        print("FAILED (record in ISSUES.md, never fake):", failed)
    return 0


def layers_info():
    cap = RAW / "capabilities.xml"
    RAW.mkdir(parents=True, exist_ok=True)
    if not cap.exists():
        r = requests.get(WMS, params={"SERVICE": "WMS", "REQUEST": "GetCapabilities", "VERSION": "1.3.0"}, timeout=120)
        r.raise_for_status()
        cap.write_bytes(r.content)
    root = ET.parse(cap).getroot()
    out = {}
    for el in root.iter():
        if el.tag.split("}")[-1] != "Layer":
            continue
        name = ext = None
        for c in el:
            t = c.tag.split("}")[-1]
            if t == "Name":
                name = c.text
            elif t == "Dimension" and c.get("name") == "time":
                ext = (c.text or "").strip()
        if name:
            out[name] = ext
    return out


def getmap(layer, bbox, date, dest, width=W):
    la0, lo0, la1, lo1 = bbox
    h = round(width * (la1 - la0) / (lo1 - lo0))
    params = {"SERVICE": "WMS", "REQUEST": "GetMap", "VERSION": "1.3.0", "LAYERS": layer,
              "STYLES": "", "FORMAT": "image/jpeg", "CRS": "EPSG:4326",
              "BBOX": f"{la0},{lo0},{la1},{lo1}", "WIDTH": width, "HEIGHT": h, "TIME": date}
    r = requests.get(WMS, params=params, timeout=180)
    if r.status_code != 200 or not r.headers.get("content-type", "").startswith("image"):
        print("  GetMap failed", r.status_code)
        return None
    dest.write_bytes(r.content)
    return r.url


def main():
    info = layers_info()
    if MODIS not in info:
        print("MODIS layer missing"); return 1
    print("MODIS ok")
    if HLS not in info:
        print("HLS layer missing"); return 1
    print("HLS layers:", {k: v for k, v in info.items() if "HLS" in k})
    ov = json.loads(OVERRIDE.read_text()) if OVERRIDE.exists() else {}
    OUT.mkdir(parents=True, exist_ok=True)
    credits = []
    for fn, (layer, bbox, res, credit, date) in JOBS.items():
        date = ov.get(fn, date)
        dest = OUT / fn
        url = getmap(layer, bbox, date, dest)
        if not url:
            return 1
        print(fn, date, dest.stat().st_size // 1024, "KB")
        credits.append({"file": fn, "layer": layer, "date": date, "bbox": list(bbox),
                        "resolution_m": res, "credit": credit, "url": url})
    old = json.loads((OUT / "credits.json").read_text(encoding="utf-8")) if (OUT / "credits.json").exists() else []
    credits += [c for c in old if c.get("scenario") == "jeddah-flood"]  # keep the Jeddah entries (main_jeddah)
    (OUT / "credits.json").write_text(json.dumps(credits, indent=1), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main_jeddah() if "--jeddah" in sys.argv else main())
