"""Fetch the NASA/MSFC Oct 2026 solar cycle prediction and build the monthly forecast.

File columns (confirmed from header of raw/forecast/oct2026ssn-prd.txt, Table 4):
  TIME(decimal year)  MON  SSN 95% | SSN 50% | SSN 5%  Ap 95% | Ap 50% | Ap 5%
The 50% columns are used. The file has NO F10.7 columns; F10.7 is derived from the
SSN via a quadratic fit to OMNI monthly means. Values are 13-month smoothed.
"""
from __future__ import annotations

import datetime as dt
import json
import subprocess
import sys

import numpy as np
import requests

from solar import DATA_OUT, RAW, fit_ssn_to_f107, ssn_to_f107

URL = "https://www.nasa.gov/wp-content/uploads/2026/10/oct2026ssn-prd.txt"
FDIR = RAW / "forecast"
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]


def main() -> None:
    FDIR.mkdir(parents=True, exist_ok=True)
    p = FDIR / "oct2026ssn-prd.txt"
    if p.exists() and p.stat().st_size > 0:
        print("cached forecast file")
    else:
        r = requests.get(URL, timeout=60)
        r.raise_for_status()
        p.write_bytes(r.content)
        print(f"downloaded forecast ({len(r.content)} bytes)")

    rows = []
    for line in p.read_text().splitlines():
        w = line.split()
        if len(w) == 8 and w[1] in MONTHS:
            try:
                t = float(w[0])
                vals = [float(x) for x in w[2:]]
            except ValueError:
                continue
            year = int(t)
            rows.append((f"{year:04d}-{MONTHS.index(w[1]) + 1:02d}", vals[1], vals[4]))
    rows = [r for r in rows if r[0] >= "2026-10"]
    if not rows:
        print("FAIL: no forecast rows parsed")
        sys.exit(1)

    od = RAW / "omni_daily.json"
    if not od.exists():
        subprocess.run([sys.executable, "fetch_omni.py"], check=True)
    d = json.loads(od.read_text())
    nan = lambda L: np.array([np.nan if v is None else v for v in L], dtype=float)
    f, s = nan(d["f107_adj"]), nan(d["ssn"])
    ym = np.array([x[:7] for x in d["dates"]])
    ms = sorted({m for m in ym if "2015-01" <= m <= "2026-10"})
    fm = np.array([np.nanmean(f[ym == m]) for m in ms])
    sm = np.array([np.nanmean(s[ym == m]) for m in ms])
    coeffs = fit_ssn_to_f107(sm, fm)
    ok = ~np.isnan(sm)
    pred = ssn_to_f107(sm[ok], coeffs)
    r2 = 1 - np.sum((fm[ok] - pred) ** 2) / np.sum((fm[ok] - fm[ok].mean()) ** 2)
    print(f"coeffs c0={coeffs[0]:.4f} c1={coeffs[1]:.4f} c2={coeffs[2]:.6f} R^2={r2:.4f}")

    months = [r[0] for r in rows]
    ssn = np.array([r[1] for r in rows])
    ap = [r[2] for r in rows]
    f107 = ssn_to_f107(ssn, coeffs)
    out = {"source": "NASA solar cycle prediction (MSFC), Oct 2026 release", "url": URL,
           "fit": {"form": "f107_adj = c0 + c1*ssn + c2*ssn^2",
                   "c0": round(coeffs[0], 4), "c1": round(coeffs[1], 5), "c2": round(coeffs[2], 7),
                   "r2": round(float(r2), 4), "fit_on": "OMNI monthly means 2015-01..2026-10"},
           "months": months, "ssn": [round(x, 1) for x in ssn], "ap": [round(x, 1) for x in ap],
           "f107_adj": [round(float(x), 1) for x in f107]}
    DATA_OUT.mkdir(parents=True, exist_ok=True)
    o = DATA_OUT / "sun_forecast.json"
    o.write_text(json.dumps(out, separators=(",", ":")))
    print(f"wrote {o}; months {months[0]}..{months[-1]} ({len(months)})")

    dates = [dt.date.fromisoformat(x) for x in d["dates"]]
    end = dt.date(2026, 10, 29)
    i = dates.index(end)
    recent = float(np.nanmean(f[i - 26: i + 1]))
    print(f"OMNI f107_adj last 27d mean {recent:.1f} vs forecast {months[0]} {f107[0]:.1f}: {100 * (f107[0] - recent) / recent:+.1f}%")


if __name__ == "__main__":
    main()
