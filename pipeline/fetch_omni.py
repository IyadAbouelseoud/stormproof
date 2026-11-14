"""Fetch OMNI2 hourly low-res records and build daily solar/geomagnetic series.

Layout confirmed from https://spdf.gsfc.nasa.gov/pub/data/omni/low_res_omni/omni2.text
(cached as raw/omni/omni2.text). Words are 1-indexed, whitespace separated:
  word 1  Year            word 2  Decimal day (Jan 1 = 1)    word 3  Hour 0..23
  word 39 Kp*10 (e.g. 3+ = 33), fill 99
  word 40 R sunspot number (version 2), fill 999
  word 50 ap-index (nT), fill 999
  word 51 f10.7_index (sfu), fill 999.9
"""
from __future__ import annotations

import datetime as dt
import json
import sys

import numpy as np
import requests

from solar import DATA_OUT, OMNI_END, RAW, adjusted_to_observed, centred_mean_81, daterange

BASE = "https://spdf.gsfc.nasa.gov/pub/data/omni/low_res_omni/"
OMNI_DIR = RAW / "omni"
START = dt.date(2014, 1, 1)
OUT_START = dt.date(2015, 1, 1)
NWORDS = 55


def download(name: str) -> None:
    p = OMNI_DIR / name
    if p.exists() and p.stat().st_size > 0:
        print(f"cached {name}")
        return
    r = requests.get(BASE + name, timeout=120)
    r.raise_for_status()
    p.write_bytes(r.content)
    print(f"downloaded {name} ({len(r.content)} bytes)")


def main() -> None:
    OMNI_DIR.mkdir(parents=True, exist_ok=True)
    download("omni2.text")
    n = (OMNI_END.year - START.year) + 1
    days = daterange(START, dt.date(OMNI_END.year, 12, 31))
    idx = {d: i for i, d in enumerate(days)}
    N = len(days)
    f107 = [[] for _ in range(N)]
    ap = [[] for _ in range(N)]
    kp = [[] for _ in range(N)]
    ssn = [[] for _ in range(N)]
    for y in range(START.year, OMNI_END.year + 1):
        name = f"omni2_{y}.dat"
        download(name)
        for line in (OMNI_DIR / name).read_text().splitlines():
            w = line.split()
            if len(w) < NWORDS:
                continue
            d = dt.date(int(w[0]), 1, 1) + dt.timedelta(days=int(w[1]) - 1)
            i = idx.get(d)
            if i is None:
                continue
            v = float(w[50])
            if v < 999.0:
                f107[i].append(v)
            v = int(w[49])
            if v != 999:
                ap[i].append(v)
            v = int(w[38])
            if v != 99:
                kp[i].append(v / 10.0)
            v = int(w[39])
            if v != 999:
                ssn[i].append(v)
    mean = lambda L: np.array([np.mean(x) if x else np.nan for x in L])
    f = mean(f107)
    a = mean(ap)
    k = np.array([max(x) if x else np.nan for x in kp])
    s = mean(ssn)

    valid = np.where(~np.isnan(f))[0]
    last = int(valid[-1])
    if days[last] > OMNI_END:
        last = max(i for i in valid if days[i] <= OMNI_END)
    days = days[: last + 1]
    f, a, k, s = f[: last + 1], a[: last + 1], k[: last + 1], s[: last + 1]
    # fill F10.7 gaps <= 3 days
    filled = 0
    i = 0
    while i < len(f):
        if np.isnan(f[i]):
            j = i
            while j < len(f) and np.isnan(f[j]):
                j += 1
            if i == 0 or j - i > 3:
                print(f"FAIL: F10.7 gap {days[i]}..{days[j-1]} ({j-i} days)")
                sys.exit(1)
            f[i:j] = np.interp(np.arange(i, j), [i - 1, j], [f[i - 1], f[j]])
            filled += j - i
            i = j
        else:
            i += 1
    print(f"F10.7 days filled by interpolation: {filled}")
    print(f"last valid date: {days[-1]}")

    nn = lambda x: [None if np.isnan(v) else float(v) for v in x]
    RAW.mkdir(exist_ok=True)
    (RAW / "omni_daily.json").write_text(json.dumps({
        "dates": [d.isoformat() for d in days],
        "f107_adj": nn(f), "ap": nn(a), "kp_max": nn(k), "ssn": nn(s)}))

    obs = adjusted_to_observed(days, f)
    obs81 = centred_mean_81(obs)
    o = days.index(OUT_START)
    r1 = lambda x: [None if np.isnan(v) else round(float(v), 1) for v in x[o:]]
    out = {"source": "NASA GSFC SPDF OMNIWeb, OMNI2 hourly low-res, daily values",
           "start": OUT_START.isoformat(), "end": days[-1].isoformat(),
           "f107_adj": r1(f), "f107_obs": r1(obs), "f107_obs81": r1(obs81),
           "ap": r1(a), "kp_max": r1(k), "ssn": r1(s)}
    DATA_OUT.mkdir(parents=True, exist_ok=True)
    p = DATA_OUT / "sun_daily.json"
    p.write_text(json.dumps(out, separators=(",", ":")))
    print(f"wrote {p} ({p.stat().st_size} bytes); NaN left: ap={int(np.isnan(a).sum())} kp={int(np.isnan(k).sum())} ssn={int(np.isnan(s).sum())}")


if __name__ == "__main__":
    main()
