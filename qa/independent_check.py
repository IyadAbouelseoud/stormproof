"""Final pass, Track 1: independent recomputation of the Stormproof physics.

A separate implementation (no engine/ import) of: orbital period, sun-synchronous inclination,
eclipse fraction, drag decay on the shipped density tables, and the launch-fit check.
It is deliberately NOT a line-by-line port:
  - period comes from the mean motion, eclipse from asin(R/a), SSO inclination from a Newton solve of
    the J2 nodal-precession rate (and cross-checked with the textbook (a/12352 km)^3.5 rule);
  - decay uses classic RK4 with 1/8-day steps (1/96 day below 250 km), not the engine's RK2 1-day steps;
  - density interpolation is written from density_meta.json with numpy/bisect.
Constants are typed here from their public sources (WGS 84, EGM2008), not read from engine/src.

Usage (from the repo root):
  cd engine && QA_DUMP=1 pnpm exec vitest run test/independent-dump.test.ts   # engine numbers
  python qa/independent_check.py                                             # compare, exit 1 on a breach
Limits: >5% is a breach, >10% for lifetimes (prompt C, Track 1).
Not recomputed: ground-station pass geometry (data and comms fit checks), seeded events.
"""
from __future__ import annotations

import bisect
import datetime as dt
import json
import math
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "web" / "public" / "data"
CONTENT = ROOT / "content"

MU = 398600.4418  # km^3/s^2, WGS 84
RE = 6378.137  # km, WGS 84 equatorial
J2 = 1.08262668e-3  # EGM2008
CD = 2.2  # AGENTS.md s5
REENTRY_KM = 120.0  # AGENTS.md s5
END = dt.date(2041, 10, 15)  # last forecast row
EPOCH = dt.date(1970, 1, 1)
SOLAR_W_M2 = 1361.0
CELL_EFF = 0.30
DOD = 0.3  # game-balanced (engine BATTERY_DOD)
MARGIN = 35.0  # CML
# CubeSat Design Specification Rev 14.1 limits; bus values are game-balanced (engine/src/catalog.ts BUS).
FF_MAX_KG = {"1U": 2, "3U": 6, "6U": 12}
FF_UNITS = {"1U": 1, "3U": 3, "6U": 6}
BUS = {"1U": (0.5, 60000, 0.3), "3U": (1.4, 140000, 0.6), "6U": (2.6, 250000, 1.0)}
A_OVER_M = {"1U": 0.014, "3U": 0.010, "6U": 0.007}  # NASA LSP medians, AGENTS.md s5


def day(d: str | dt.date) -> float:
    if isinstance(d, str):
        d = dt.date.fromisoformat(d)
    return float((d - EPOCH).days)


# ---------------------------------------------------------------- orbit
def period_s(alt: float) -> float:
    n = math.sqrt(MU / (RE + alt) ** 3)  # mean motion, rad/s
    return 2 * math.pi / n


def sso_inclination_deg(alt: float) -> float:
    """Solve dOmega/dt(i) = 360 deg per tropical year for i by Newton iteration."""
    a = RE + alt
    n = math.sqrt(MU / a**3)
    target = 2 * math.pi / (365.2422 * 86400.0)
    i = math.radians(98.0)
    for _ in range(50):
        f = -1.5 * J2 * (RE / a) ** 2 * n * math.cos(i) - target
        df = 1.5 * J2 * (RE / a) ** 2 * n * math.sin(i)
        i -= f / df
    return math.degrees(i)


def sso_rule_of_thumb_deg(alt: float) -> float:
    return math.degrees(math.acos(-(((RE + alt) / 12352.0) ** 3.5)))


def eclipse_fraction(alt: float) -> float:
    """Cylindrical shadow, beta = 0: half-angle asin(R/a)."""
    return math.asin(RE / (RE + alt)) / math.pi


# ---------------------------------------------------------------- density tables
class Table:
    def __init__(self, name: str):
        meta = json.loads((DATA / "density_meta.json").read_text())
        t = meta["tables"][name]
        self.alt0 = meta["alt_km"]["start"]
        self.dalt = meta["alt_km"]["step"]
        self.nalt = meta["alt_km"]["count"]
        raw = np.fromfile(DATA / t["file"], dtype="<f4")
        assert raw.size == t["rows"] * self.nalt, f"{name}: size mismatch"
        self.log = raw.reshape(t["rows"], self.nalt).astype(np.float64)
        days: list[float] = []
        if t["axis"]["daily"]:
            d0 = day(t["axis"]["daily"]["start"])
            days += [d0 + k for k in range(t["axis"]["daily"]["rows"])]
        y, m = (int(x) for x in t["axis"]["monthly"]["start"].split("-")[:2])
        dom = t["axis"]["monthly"]["day_of_month"]
        while len(days) < t["rows"]:
            days.append(day(dt.date(y, m, dom)))
            y, m = (y + 1, 1) if m == 12 else (y, m + 1)
        self.days = days

    def rho(self, t: float, alt: float) -> float:
        ds = self.days
        if t <= ds[0]:
            lo, f = 0, 0.0
        elif t >= ds[-1]:
            lo, f = len(ds) - 2, 1.0
        else:
            lo = bisect.bisect_right(ds, t) - 1
            f = (t - ds[lo]) / (ds[lo + 1] - ds[lo])
        x = (alt - self.alt0) / self.dalt
        j = min(max(int(math.floor(x)), 0), self.nalt - 2)
        g = x - j
        r0 = self.log[lo, j] * (1 - g) + self.log[lo, j + 1] * g
        r1 = self.log[lo + 1, j] * (1 - g) + self.log[lo + 1, j + 1] * g
        return 10.0 ** (r0 * (1 - f) + r1 * f)


def decay_days(tab: Table, launch: str, alt: float, cd_am: float, waypoints=(), reboost=None):
    """RK4 on dh/dt = -(Cd A/m) rho sqrt(mu a). Returns (lifetime days or None, {date: altitude})."""
    def rate(t: float, h: float) -> float:  # km/day
        a_m = (RE + h) * 1000.0
        return -cd_am * tab.rho(t, h) * math.sqrt(MU * 1e9 * a_m) * 86400.0 / 1000.0

    t0 = day(launch)
    t, h = t0, alt
    end = day(END)
    want = {day(w): w for w in waypoints}
    seen: dict[str, float] = {}
    budget = reboost["budget"] if reboost else 0.0
    while t < end:
        if t in want and want[t] not in seen:
            seen[want[t]] = h
        dtm = 1 / 96 if h < 250 else 1 / 8
        k1 = rate(t, h)
        k2 = rate(t + dtm / 2, h + k1 * dtm / 2)
        k3 = rate(t + dtm / 2, h + k2 * dtm / 2)
        k4 = rate(t + dtm, h + k3 * dtm)
        hn = h + dtm * (k1 + 2 * k2 + 2 * k3 + k4) / 6
        if hn <= REENTRY_KM:
            return t + dtm * (h - REENTRY_KM) / (h - hn) - t0, seen
        t, h = round((t + dtm) * 96) / 96, hn
        if reboost and budget > 0 and h <= reboost["trigger"]:
            climb = min(budget, reboost["target"] - h)
            h += climb
            budget -= climb
    return None, seen


# ---------------------------------------------------------------- launch fit
def fit_check(design: dict) -> dict:
    parts = {p["id"]: p for p in json.loads((CONTENT / "parts.json").read_text())["parts"]}
    rockets = {r["id"]: r for r in json.loads((CONTENT / "rockets.json").read_text())["rockets"]}
    scen = {"angola": "angola.json", "jeddah-flood": "jeddah-flood.json"}[design["scenarioId"]]
    scenario = json.loads((CONTENT / "scenarios" / scen).read_text())
    chosen = [parts[i] for i in design["parts"].values()]
    ff = design["formFactor"]
    alt = design["orbit"]["altitudeKm"]
    bus_kg, bus_usd, bus_u = BUS[ff]
    mass = bus_kg + sum(p["massKg"] for p in chosen)
    units = bus_u + sum(p["units"] for p in chosen)
    rocket = rockets[design["rocketId"]]
    launch_cost = max(rocket.get("minPriceUsd", 0), mass * rocket["priceUsdPerKg"])
    cost = bus_usd + sum(p["costUsd"] for p in chosen) + launch_cost
    ecl = eclipse_fraction(alt)
    area = sum(p.get("effectiveAreaM2", 0) for p in chosen)
    gen = SOLAR_W_M2 * CELL_EFF * area * (1 - ecl)
    load = sum(p["powerW"] for p in chosen)
    ecl_min = ecl * period_s(alt) / 60
    need_wh = load * ecl_min / 60
    usable = sum(p.get("capacityWh", 0) for p in chosen) * DOD
    d = design["launchDate"]
    return {
        "mass_kg": mass, "units": units, "cost_usd": cost, "gen_w": gen, "load_w": load,
        "fit": {
            "mass": mass <= FF_MAX_KG[ff],
            "volume": units <= FF_UNITS[ff],
            "power": (gen - load) / load * 100 >= MARGIN,
            "energy": (usable - need_wh) / need_wh * 100 >= MARGIN,
            "budget": cost <= scenario["budgetUsd"],
            "rocket-capacity": mass <= rocket["capacityKg"],
            "rocket-orbit": design["orbit"]["type"] in rocket["orbits"] and rocket["minAltKm"] <= alt <= rocket["maxAltKm"],
            "launch-window": "2015-01-01" <= d <= "2026-12-31" and d >= rocket["firstFlight"],
        },
        "lifetime_min_days": scenario["lifetimeMinDays"],
        "dv": next((p.get("deltaVMs", 0) for p in chosen if p["slot"] == "fuel"), 0),
    }


# ---------------------------------------------------------------- compare
rows: list[tuple[str, float, float, float, float]] = []
breaches: list[str] = []


def cmp(label: str, engine, mine, limit_pct: float) -> None:
    if engine is None or mine is None:
        ok = engine is None and mine is None
        rows.append((label, float("nan"), float("nan"), 0.0 if ok else float("inf"), limit_pct))
        if not ok:
            breaches.append(f"{label}: engine {engine} vs independent {mine}")
        return
    delta = abs(mine - engine) / abs(engine) * 100 if engine else abs(mine) * 100
    rows.append((label, engine, mine, delta, limit_pct))
    if delta > limit_pct:
        breaches.append(f"{label}: engine {engine:.6g} vs independent {mine:.6g} ({delta:.2f}% > {limit_pct}%)")


def main() -> int:
    src = ROOT / "qa" / "track1" / "engine_values.json"
    if not src.exists():
        print("missing qa/track1/engine_values.json: run the engine dump first (see the docstring)")
        return 2
    eng = json.loads(src.read_text())

    for o in eng["orbit"]:
        a = o["altKm"]
        cmp(f"period {a} km (s)", o["periodS"], period_s(a), 5)
        cmp(f"SSO inclination {a} km (deg)", o["ssoInclinationDeg"], sso_inclination_deg(a), 5)
        cmp(f"SSO inclination {a} km, 12352-km rule (deg)", o["ssoInclinationDeg"], sso_rule_of_thumb_deg(a), 5)
        cmp(f"eclipse fraction {a} km", o["eclipseFraction"], eclipse_fraction(a), 5)

    tabs = {n: Table(n) for n in ("sso_truth", "sso_plan", "iss_truth", "iss_plan")}
    life: dict[str, float | None] = {}
    for name, c in eng["decay"].items():
        wps = [w[0] for w in c["waypoints"]]
        mine, seen = decay_days(tabs[c["table"]], c["launch"], c["altKm"], c["cdAm"], wps)
        life[name] = mine
        cmp(f"lifetime {name} (days)", c["lifetimeDays"], mine, 10)
        for d, h in c["waypoints"]:
            cmp(f"altitude {name} on {d} (km)", h, seen.get(d), 5)

    for name, s in eng["simulate"].items():
        d = s["design"]
        f = fit_check(d)
        cmp(f"{name}: mass (kg)", s["gauges"]["mass"]["value"], f["mass_kg"], 5)
        cmp(f"{name}: power load (W)", s["gauges"]["power"]["value"], f["load_w"], 5)
        cmp(f"{name}: power generated (W)", s["gauges"]["power"]["limit"], f["gen_w"], 5)
        cmp(f"{name}: cost (USD)", s["gauges"]["budget"]["value"], f["cost_usd"], 5)
        for check, mine_pass in f["fit"].items():
            if s["fit"][check] != mine_pass:
                breaches.append(f"{name}: fit check '{check}' engine {s['fit'][check]} vs independent {mine_pass}")
            rows.append((f"{name}: fit '{check}' pass", float(s["fit"][check]), float(mine_pass), 0.0 if s["fit"][check] == mine_pass else float("inf"), 0))
        if d["mode"] == "plan":
            alt = d["orbit"]["altitudeKm"]
            dv = f["dv"]
            a = RE + alt
            rb = {"trigger": alt - 10, "target": alt, "budget": 2 * a * (dv / 1000) / math.sqrt(MU / a)} if dv > 0 else None
            tab = tabs["sso_plan" if d["orbit"]["type"] == "SSO" else "iss_plan"]
            mine, _ = decay_days(tab, d["launchDate"], alt, CD * A_OVER_M[d["formFactor"]], reboost=rb)
            eng_days = None if s["outcome"]["kind"] == "alive-at-forecast-end" else s["lifetimeDays"]
            cmp(f"{name}: plan lifetime with reboost (days)", eng_days, mine, 10)

    print(f"{'quantity':58s} {'engine':>13s} {'independent':>13s} {'delta %':>8s} {'limit':>6s}")
    for label, e, m, dlt, lim in rows:
        print(f"{label:58s} {e:13.6g} {m:13.6g} {dlt:8.3f} {lim:6g}")

    # Derived checks against the published references (reported, golden tests judge them).
    t, p = life["facsat2_truth"], life["facsat2_plan"]
    print(f"\nFACSAT-2 (independent): truth {t:.1f} d (real 926 d), plan {p:.1f} d, plan/truth {p / t:.2f} (paper 1.52)")
    print(f"Starlink trap 210 km, 3 Feb 2022 (independent): truth {life['starlink_truth']:.2f} d, plan {life['starlink_plan']:.2f} d")
    over = eng["simulate"]["oversized_1U"]["fit"]
    failed = sorted(k for k, v in over.items() if not v)
    print(f"Oversized 1U must fail the fit check: engine fails {failed}")
    if not failed:
        breaches.append("oversized 1U design passed every fit check")
    print(f"\nRESULT: {len(rows)} comparisons, {len(breaches)} over the limit")
    for b in breaches:
        print("  BREACH:", b)
    return 1 if breaches else 0


if __name__ == "__main__":
    sys.exit(main())
