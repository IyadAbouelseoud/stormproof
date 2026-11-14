"""Pre-compute orbit-averaged NRLMSIS 2.1 density tables (AGENTS.md s5).

Tables (log10 rho [kg/m^3], little-endian Float32, row-major [row][alt]):
  density_{sso,iss}_truth.bin  rows = daily 2015-01-01..2026-10-29 (OMNI), then monthly (15th) 2026-11..2041-10 (NASA prediction)
  density_{sso,iss}_plan.bin   rows = monthly (15th) 2015-01..2041-10 (sun_plan2019.json)
Altitudes 150..800 km step 10 (66 columns).

Drivers passed explicitly to pymsis.calculate (never its internal downloads):
  f107s  = OBSERVED F10.7 of the previous day (pymsis convention), observed = adjusted*(1AU/r)^2
  f107as = 81-day centred mean of observed F10.7
  aps    = daily Ap in all 7 slots (daily-Ap mode)
Monthly rows use the monthly F10.7 (converted to observed at the 15th) for both f107s and f107as, and the monthly Ap.

Orbit average: circular orbit, 12 points in argument of latitude u.
  SSO: inclination from J2 sun-synchrony at each altitude, ascending node 22:30 local time (10:30 descending), UT 00 and 12.
  ISS: 51.6 deg, node local time 00/06/12/18 h (precession averages over local time), UT 00.
Storm truth correction: x1.875 on 2022-02-03..05 in truth tables (Fang et al. 2022); MSIS under-responds to storms.
"""
from __future__ import annotations

import datetime as dt
import json
import time
from multiprocessing import Pool

import numpy as np
import pymsis

from solar import DATA_OUT, RAW, OMNI_END, adjusted_to_observed, adjusted_to_observed_ratio, centred_mean_81, daterange

ALTS = np.arange(150, 801, 10, dtype=float)
N_U = 12
R_EARTH_KM = 6378.137
J2_SSO_KM = 12352.0  # cos(i) = -(a / 12352 km)^3.5 for a circular sun-synchronous orbit (J2), source: Vallado 4th ed.
ISS_INC = 51.6
SSO_LTAN_H = 22.5  # 10:30 descending node
STORM_FACTOR = 1.875  # Fang et al. 2022, 3-5 Feb 2022
STORM_DAYS = {dt.date(2022, 2, 3), dt.date(2022, 2, 4), dt.date(2022, 2, 5)}

ORBITS = {
    "sso": {"ltan_h": [SSO_LTAN_H], "ut_h": [0.0, 12.0]},
    "iss": {"ltan_h": [0.0, 6.0, 12.0, 18.0], "ut_h": [0.0]},
}


def sso_inclination(alt_km: float) -> float:
    return float(np.degrees(np.arccos(-((R_EARTH_KM + alt_km) / J2_SSO_KM) ** 3.5)))


def orbit_samples(orbit: str, alt_km: float) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Return (lat_deg, lon_deg, ut_hours) samples for one orbit average at this altitude."""
    inc = np.radians(sso_inclination(alt_km) if orbit == "sso" else ISS_INC)
    u = (np.arange(N_U) + 0.5) * 2 * np.pi / N_U
    lats, lons, uts = [], [], []
    for ltan in ORBITS[orbit]["ltan_h"]:
        node = np.radians((ltan - 12.0) * 15.0)  # node right ascension relative to the Sun
        x = np.cos(node) * np.cos(u) - np.sin(node) * np.cos(inc) * np.sin(u)
        y = np.sin(node) * np.cos(u) + np.cos(node) * np.cos(inc) * np.sin(u)
        z = np.sin(inc) * np.sin(u)
        lat = np.degrees(np.arcsin(z))
        lst = (12.0 + np.degrees(np.arctan2(y, x)) / 15.0) % 24.0
        for ut in ORBITS[orbit]["ut_h"]:
            lon = ((lst - ut) * 15.0 + 180.0) % 360.0 - 180.0
            lats.append(lat)
            lons.append(lon)
            uts.append(np.full(N_U, ut))
    return np.concatenate(lats), np.concatenate(lons), np.concatenate(uts)


def compute_rows(args: tuple[str, list[str], np.ndarray, np.ndarray, np.ndarray]) -> np.ndarray:
    """Orbit-averaged log10 density for a chunk of rows -> shape (rows, n_alts)."""
    orbit, dates, f107, f107a, ap = args
    out = np.empty((len(dates), len(ALTS)), dtype=np.float64)
    for j, alt in enumerate(ALTS):
        lat, lon, ut = orbit_samples(orbit, alt)
        k = len(lat)
        day0 = np.array(dates, dtype="datetime64[D]")
        t = (day0[:, None] + (ut[None, :] * 3600).astype("timedelta64[s]")).ravel()
        n = len(dates)
        res = pymsis.calculate(
            t,
            np.tile(lon, n),
            np.tile(lat, n),
            np.full(n * k, alt),
            np.repeat(f107, k),
            np.repeat(f107a, k),
            np.repeat(np.repeat(ap, 7).reshape(n, 7), k, axis=0),
            version=2.1,
        )
        rho = res[:, pymsis.Variable.MASS_DENSITY].reshape(n, k)
        out[:, j] = np.log10(rho.mean(axis=1))
    return out


def truth_drivers() -> tuple[list[str], np.ndarray, np.ndarray, np.ndarray, int]:
    omni = json.loads((RAW / "omni_daily.json").read_text())
    odates = [dt.date.fromisoformat(d) for d in omni["dates"]]
    adj = np.array(omni["f107_adj"], dtype=float)
    obs = adjusted_to_observed(odates, adj)
    obs81 = centred_mean_81(obs)
    ap = np.array(omni["ap"], dtype=float)
    idx = {d: i for i, d in enumerate(odates)}

    days = daterange(dt.date(2015, 1, 1), OMNI_END)
    rows = [d.isoformat() for d in days]
    f107 = np.array([obs[idx[d] - 1] for d in days])  # previous day
    f107a = np.array([obs81[idx[d]] for d in days])
    apd = np.array([ap[idx[d]] for d in days])
    n_daily = len(rows)

    fc = json.loads((DATA_OUT / "sun_forecast.json").read_text())
    for m, f, a in zip(fc["months"], fc["f107_adj"], fc["ap"]):
        if m <= OMNI_END.isoformat()[:7]:
            continue
        mid = dt.date.fromisoformat(m + "-15")
        o = f * adjusted_to_observed_ratio(mid)
        rows.append(mid.isoformat())
        f107 = np.append(f107, o)
        f107a = np.append(f107a, o)
        apd = np.append(apd, a)
    return rows, f107, f107a, apd, n_daily


def plan_drivers() -> tuple[list[str], np.ndarray, np.ndarray, np.ndarray]:
    p = json.loads((DATA_OUT / "sun_plan2019.json").read_text())
    rows = [m + "-15" for m in p["months"]]
    f = np.array([fv * adjusted_to_observed_ratio(dt.date.fromisoformat(r)) for fv, r in zip(p["f107_adj"], rows)])
    return rows, f, f.copy(), np.array(p["ap"], dtype=float)


def build_table(pool: Pool, orbit: str, rows: list[str], f107: np.ndarray, f107a: np.ndarray, ap: np.ndarray) -> np.ndarray:
    assert not (np.isnan(f107).any() or np.isnan(f107a).any() or np.isnan(ap).any()), "NaN driver"
    chunk = 40
    jobs = [(orbit, rows[i:i + chunk], f107[i:i + chunk], f107a[i:i + chunk], ap[i:i + chunk]) for i in range(0, len(rows), chunk)]
    return np.vstack(pool.map(compute_rows, jobs))


def main() -> None:
    t0 = time.time()
    t_rows, t_f, t_fa, t_ap, n_daily = truth_drivers()
    p_rows, p_f, p_fa, p_ap = plan_drivers()
    storm_idx = [i for i, r in enumerate(t_rows[:n_daily]) if dt.date.fromisoformat(r) in STORM_DAYS]
    meta = {
        "model": f"NRLMSIS 2.1 via pymsis {pymsis.__version__} (NRL; non-commercial licence: only pre-computed tables ship)",
        "drivers": "NASA OMNIWeb F10.7 (adjusted->observed, previous day) + 81-day mean + daily Ap; after 2026-10-29 the NASA Oct 2026 solar-cycle prediction (SSN->F10.7 fit)",
        "encoding": "log10(rho kg/m^3), little-endian float32, row-major [row][alt]",
        "alt_km": {"start": 150, "step": 10, "count": len(ALTS)},
        "orbit_average": {"points_per_orbit": N_U, "sso": {"ltan_h": SSO_LTAN_H, "ut_h": ORBITS["sso"]["ut_h"], "inclination": "J2 sun-synchronous per altitude"},
                          "iss": {"inclination_deg": ISS_INC, "ltan_h": ORBITS["iss"]["ltan_h"], "ut_h": ORBITS["iss"]["ut_h"]}},
        "storm_correction": {"factor": STORM_FACTOR, "dates": sorted(d.isoformat() for d in STORM_DAYS), "tables": "truth", "source": "Fang et al. 2022"},
        "tables": {},
    }
    with Pool() as pool:
        for orbit in ("sso", "iss"):
            for mode, rows, f, fa, ap in (("truth", t_rows, t_f, t_fa, t_ap), ("plan", p_rows, p_f, p_fa, p_ap)):
                t1 = time.time()
                tab = build_table(pool, orbit, rows, f, fa, ap)
                if mode == "truth":
                    tab[storm_idx, :] += np.log10(STORM_FACTOR)
                assert np.isfinite(tab).all(), f"non-finite in {orbit}_{mode}"
                name = f"density_{orbit}_{mode}.bin"
                (DATA_OUT / name).write_bytes(tab.astype("<f4").tobytes())
                axis = ({"daily": {"start": t_rows[0], "end": t_rows[n_daily - 1], "rows": n_daily},
                         "monthly": {"start": t_rows[n_daily], "end": t_rows[-1], "rows": len(t_rows) - n_daily, "day_of_month": 15, "forecast": True}}
                        if mode == "truth" else
                        {"daily": None, "monthly": {"start": p_rows[0], "end": p_rows[-1], "rows": len(p_rows), "day_of_month": 15, "forecast": False}})
                meta["tables"][f"{orbit}_{mode}"] = {"file": name, "rows": len(rows), "axis": axis}
                print(f"{name}: {tab.shape} {(DATA_OUT / name).stat().st_size} B in {time.time() - t1:.0f}s", flush=True)
    (DATA_OUT / "density_meta.json").write_text(json.dumps(meta, indent=1))
    print(f"density done in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
