"""T0.3 pipeline checks (AGENTS.md s5). Run: cd pipeline && uv run pytest -q"""
from __future__ import annotations

import datetime as dt
import json
import math

import numpy as np
import pytest

from solar import DATA_OUT, OMNI_END, adjusted_to_observed_ratio

META = json.loads((DATA_OUT / "density_meta.json").read_text())


def table(name: str) -> np.ndarray:
    m = META["tables"][name]
    a = np.fromfile(DATA_OUT / m["file"], dtype="<f4")
    return a.reshape(m["rows"], META["alt_km"]["count"])


def row_of(name: str, date: str) -> int:
    ax = META["tables"][name]["axis"]
    if ax["daily"] and date <= ax["daily"]["end"]:
        return (dt.date.fromisoformat(date) - dt.date.fromisoformat(ax["daily"]["start"])).days
    mo = ax["monthly"]
    off = ax["daily"]["rows"] if ax["daily"] else 0
    y0, m0 = map(int, mo["start"][:7].split("-"))
    y, m = map(int, date[:7].split("-"))
    return off + (y - y0) * 12 + (m - m0)


def col_of(alt_km: float) -> int:
    a = META["alt_km"]
    return int(round((alt_km - a["start"]) / a["step"]))


def test_f107_observed_ratio_4_jan():
    assert adjusted_to_observed_ratio(dt.date(2024, 1, 4)) == pytest.approx(1.034, abs=0.002)


def test_f107_observed_ratio_4_jul():
    assert adjusted_to_observed_ratio(dt.date(2024, 7, 4)) == pytest.approx(0.967, abs=0.002)


@pytest.mark.parametrize("orbit", ["sso", "iss"])
def test_density_500km_min_to_max_rises_10_to_25x(orbit):
    t = table(f"{orbit}_truth")
    c = col_of(500)
    lo = 10 ** t[row_of(f"{orbit}_truth", "2019-12-15"), c]
    hi = 10 ** t[row_of(f"{orbit}_truth", "2024-10-15"), c]
    print(f"{orbit} 500 km: {lo:.3e} -> {hi:.3e} = x{hi / lo:.1f}")
    assert 10 <= hi / lo <= 25


@pytest.mark.parametrize("name", ["sso_truth", "sso_plan", "iss_truth", "iss_plan"])
def test_density_tables_finite_and_monotone_in_altitude(name):
    t = table(name)
    assert np.isfinite(t).all()
    assert (np.diff(t, axis=1) < 0).all(), "density must fall with altitude"


@pytest.mark.parametrize("fname", ["sun_daily.json", "sun_forecast.json", "sun_plan2019.json", "storms.json"])
def test_json_has_no_nan(fname):
    def walk(v):
        if isinstance(v, float):
            assert math.isfinite(v)
        elif isinstance(v, dict):
            for x in v.values():
                walk(x)
        elif isinstance(v, list):
            for x in v:
                walk(x)
    d = json.loads((DATA_OUT / fname).read_text(), parse_constant=lambda c: float(c))
    for k in ("f107_adj", "f107_obs", "f107_obs81", "ap", "f107"):
        if k in d:
            assert None not in d[k], f"{fname}:{k} has nulls"
    walk(d)


def test_forecast_join_continuous_within_15pct():
    sun = json.loads((DATA_OUT / "sun_daily.json").read_text())
    fc = json.loads((DATA_OUT / "sun_forecast.json").read_text())
    assert sun["end"] == OMNI_END.isoformat()
    last27 = float(np.mean(sun["f107_adj"][-27:]))
    first = next(f for m, f in zip(fc["months"], fc["f107_adj"]) if m > OMNI_END.isoformat()[:7])
    print(f"F10.7 join: OMNI last 27 d {last27:.1f} -> forecast {first:.1f} ({first / last27 - 1:+.1%})")
    assert abs(first / last27 - 1) <= 0.15


def test_data_files_under_4mb():
    files = [p for p in DATA_OUT.iterdir() if p.is_file() and p.name != ".gitkeep"]
    total = sum(p.stat().st_size for p in files)
    print("data:", {p.name: p.stat().st_size for p in files}, "total", total)
    assert total < 4 * 1024 * 1024
