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


def getmap(layer, bbox, date, dest):
    la0, lo0, la1, lo1 = bbox
    h = round(W * (la1 - la0) / (lo1 - lo0))
    params = {"SERVICE": "WMS", "REQUEST": "GetMap", "VERSION": "1.3.0", "LAYERS": layer,
              "STYLES": "", "FORMAT": "image/jpeg", "CRS": "EPSG:4326",
              "BBOX": f"{la0},{lo0},{la1},{lo1}", "WIDTH": W, "HEIGHT": h, "TIME": date}
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
    (OUT / "credits.json").write_text(json.dumps(credits, indent=1), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
