"""Fetch NASA DONKI geomagnetic storms (GST) 2015..2026 -> web/public/data/storms.json."""
import json
import os
import sys
import time
from datetime import date, timedelta
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw" / "donki"
OUT = ROOT.parent / "web" / "public" / "data" / "storms.json"
YEARS = range(2015, 2027)


def main() -> int:
    key = os.environ.get("NASA_API_KEY")
    demo = not key
    if demo:
        key = "DEMO_KEY"
    RAW.mkdir(parents=True, exist_ok=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    failed = False
    for y in YEARS:
        f = RAW / f"gst_{y}.json"
        if f.exists():
            print(f"{y}: cached")
            continue
        try:
            rows, seen = [], set()
            d = date(y, 1, 1)
            while d.year == y:
                e = min(d + timedelta(days=49), date(y, 12, 31))  # API limit: 60 days
                r = requests.get(
                    "https://api.nasa.gov/DONKI/GST",
                    params={"startDate": d.isoformat(), "endDate": e.isoformat(), "api_key": key},
                    timeout=60,
                )
                print(f"{y} {d.isoformat()}: HTTP {r.status_code} remaining={r.headers.get('X-RateLimit-Remaining')}")
                if r.status_code != 200:
                    raise RuntimeError("http")
                for s_ in r.json() or []:
                    if s_.get("gstID") not in seen:
                        seen.add(s_.get("gstID"))
                        rows.append(s_)
                d = e + timedelta(days=1)
                if demo:
                    time.sleep(2)
            f.write_text(json.dumps(rows), encoding="utf-8")
        except Exception as ex:  # never print exception text (may contain key)
            print(f"{y}: error {type(ex).__name__}")
            failed = True
    if failed:
        print("some years failed")
        return 1
    storms = []
    for y in YEARS:
        data = json.loads((RAW / f"gst_{y}.json").read_text(encoding="utf-8")) or []
        n = 0
        for s in data:
            kps = [k for k in (s.get("allKpIndex") or []) if k.get("kpIndex") is not None]
            if not kps:
                continue
            best = max(kps, key=lambda k: k["kpIndex"])
            storms.append({
                "id": s.get("gstID"),
                "start": s.get("startTime"),
                "date": best["observedTime"][:10],
                "kpMax": best["kpIndex"],
                "link": s.get("link"),
            })
            n += 1
        print(f"{y}: {n} storms")
    storms.sort(key=lambda s: s["start"])
    doc = {"source": "NASA CCMC DONKI, Geomagnetic Storm (GST)", "storms": storms}
    OUT.write_text(json.dumps(doc, separators=(",", ":")), encoding="utf-8")
    print("total", len(storms))
    for s in sorted(storms, key=lambda s: -s["kpMax"])[:5]:
        print("top", s["date"], s["kpMax"], s["id"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
