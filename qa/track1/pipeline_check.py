"""Final pass, Track 1: checks of the Sun-data rules in AGENTS.md s5 against the SHIPPED files.
Run: cd pipeline && uv run python ../qa/track1/pipeline_check.py
 1. F10.7 adjusted -> observed: recomputed with an independent Earth-Sun distance formula
    (Astronomical Almanac low-precision: r = 1.00014 - 0.01671 cos g - 0.00014 cos 2g).
 2. 81-day centred mean of observed F10.7, recomputed.
 3. Forecast join at 29 Oct 2026.
 4. Feb 2022 storm factor: re-run NRLMSIS 2.1 (pymsis) for 1-7 Feb 2022 from the shipped drivers and
    compare with the shipped truth table; the difference must be log10(1.875) on 3-5 Feb and ~0 elsewhere.
"""
import datetime as dt, json, math, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "web" / "public" / "data"
sys.path.insert(0, str(ROOT / "pipeline"))
fails = []
def check(name, ok, detail):
    print(("PASS " if ok else "FAIL ") + name + ": " + detail)
    if not ok: fails.append(name)

sun = json.loads((DATA / "sun_daily.json").read_text())
d0 = dt.date.fromisoformat(sun["start"]); n = len(sun["f107_adj"])
dates = [d0 + dt.timedelta(days=i) for i in range(n)]
adj = np.array(sun["f107_adj"], float); obs = np.array(sun["f107_obs"], float); o81 = np.array(sun["f107_obs81"], float)

def r_au(d):
    k = (d - dt.date(2000, 1, 1)).days - 0.5 + 0.5  # days from J2000.0 at 12 UT
    g = math.radians((357.529 + 0.98560028 * k) % 360)
    return 1.00014 - 0.01671 * math.cos(g) - 0.00014 * math.cos(2 * g)
ratio = np.array([1 / r_au(d) ** 2 for d in dates])
dev = np.abs(obs / adj - ratio)
check("1 adjusted->observed over all days", dev.max() < 0.003, f"{n} days, max |ratio diff| {dev.max():.4f} (0.1 sfu rounding included)")
for md, want in (((1, 4), 1.034), ((7, 4), 0.967)):
    rs = [obs[i] / adj[i] for i, d in enumerate(dates) if (d.month, d.day) == md]
    check(f"1 ratio on {md[1]}/{md[0]}", abs(np.mean(rs) - want) < 0.002, f"mean {np.mean(rs):.4f} over {len(rs)} years (AGENTS.md: {want})")

m81 = np.array([obs[max(0, i - 40): i + 41].mean() for i in range(n)])
inner = np.abs(m81 - o81)[40:n - 40].max()
check("2 81-day centred mean", inner < 0.1, f"max diff {inner:.3f} sfu on days 41..{n - 40}; the first 40 days differ by up to {np.abs(m81 - o81)[:40].max():.1f} sfu because the pipeline window also uses Dec 2014 OMNI days that are not in sun_daily.json")

fc = json.loads((DATA / "sun_forecast.json").read_text())
meta = json.loads((DATA / "density_meta.json").read_text())
ax = meta["tables"]["sso_truth"]["axis"]
check("3 OMNI ends 2026-10-29", sun["end"] == "2026-10-29" and dates[-1].isoformat() == "2026-10-29" and ax["daily"]["end"] == "2026-10-29", f"sun_daily end {sun['end']}, table daily end {ax['daily']['end']}")
check("3 forecast rows start the month after", ax["monthly"]["start"] == "2026-11-15" and ax["monthly"]["end"] == "2041-10-15" and ax["monthly"]["forecast"], f"monthly {ax['monthly']['start']}..{ax['monthly']['end']}, {ax['monthly']['rows']} rows")
i11 = fc["months"].index("2026-11")
join = fc["f107_adj"][i11] / adj[-27:].mean()
print(f"INFO 3 join: first forecast month F10.7 {fc['f107_adj'][i11]} vs last 27 OMNI days {adj[-27:].mean():.1f} = {join - 1:+.1%} (disclosed in HANDOFF as +9%)")
c = fc["fit"]; ssn = np.array(fc["ssn"], float); f = c["c0"] + c["c1"] * ssn + c["c2"] * ssn ** 2
check("3 SSN->F10.7 fit applied", np.abs(f - np.array(fc["f107_adj"])).max() < 0.06, f"max diff {np.abs(f - np.array(fc['f107_adj'])).max():.3f} sfu, R2 {c['r2']}")

import build_density as bd
rows = [(dt.date(2022, 2, 1) + dt.timedelta(days=i)) for i in range(7)]
idx = [(d - d0).days for d in rows]
f107 = np.array([obs[i - 1] for i in idx]); f107a = np.array([o81[i] for i in idx]); ap = np.array([sun["ap"][i] for i in idx], float)
mine = bd.compute_rows(("sso", [d.isoformat() for d in rows], f107, f107a, ap))
nalt = meta["alt_km"]["count"]
tab = np.fromfile(DATA / "density_sso_truth.bin", dtype="<f4").reshape(-1, nalt)[idx]
diff = (tab - mine).mean(axis=1)
want = math.log10(1.875)
for d, x in zip(rows, diff):
    storm = d.isoformat() in meta["storm_correction"]["dates"]
    check(f"4 {d} {'storm day' if storm else 'normal day'}", abs(x - (want if storm else 0)) < 0.01, f"shipped - recomputed log10 rho = {x:+.4f} (expected {want if storm else 0:+.4f}); factor {10 ** x:.3f}")
print(f"\nRESULT: {len(fails)} failed")
sys.exit(1 if fails else 0)
