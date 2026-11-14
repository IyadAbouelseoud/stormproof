"""Reconstruct the 2019 Solar Cycle 25 panel forecast (plan-mode Sun), monthly 2015-01..2041-10.

AGENTS.md s5: plan mode = reconstructed 2019 panel forecast, peak SSN 115 in Jul 2025.
- Before the Cycle 25 minimum (Dec 2019) the plan Sun is the real OMNI monthly mean (the past was known).
- From Dec 2019: Hathaway et al. (1994) cycle shape R(t) = a t^3 / (exp(t^2/b^2) - c), c = 0.8,
  t in months since the minimum, with a and b solved so the peak is SSN 115 in Jul 2025 (2019 panel).
  Cycle-minimum date Dec 2019 is the observed minimum (SIDC), used as the forecast's start.
- After the cycle-25 curve decays: cycle 26 is a copy of the cycle-25 curve shifted by 11 years
  ("game-balanced": the 2019 panel did not forecast cycle 26).
- F10.7 from SSN via the OMNI least-squares fit stored in sun_forecast.json (computed).
- Ap from a least-squares linear fit Ap ~ SSN on OMNI monthly means 2015-2026 (computed).
Writes web/public/data/sun_plan2019.json.
"""
from __future__ import annotations

import json

import numpy as np

from solar import DATA_OUT, RAW, ssn_to_f107

PEAK_SSN = 115.0  # 2019 panel (AGENTS.md s5)
MIN_MONTH = (2019, 12)  # cycle 25 minimum
PEAK_MONTH = (2025, 7)  # 2019 panel peak
C_SHAPE = 0.8  # Hathaway et al. 1994
CYCLE_MONTHS = 132  # 11 years, game-balanced for cycle 26


def month_index(y: int, m: int) -> int:
    return (y - 2015) * 12 + (m - 1)


def hathaway(t: np.ndarray, a: float, b: float) -> np.ndarray:
    t = np.clip(t, 0, None)
    return a * t**3 / (np.exp((t / b) ** 2) - C_SHAPE)


def solve_shape(peak_t: float, peak_value: float) -> tuple[float, float]:
    """Find b so the curve peaks at peak_t months, then a so it peaks at peak_value."""
    t = np.linspace(0.0, 200.0, 20001)
    lo, hi = 10.0, 200.0
    for _ in range(80):
        b = 0.5 * (lo + hi)
        tp = t[np.argmax(hathaway(t, 1.0, b))]
        lo, hi = (b, hi) if tp < peak_t else (lo, b)
    b = 0.5 * (lo + hi)
    a = peak_value / hathaway(t, 1.0, b).max()
    return float(a), float(b)


def main() -> None:
    omni = json.loads((RAW / "omni_daily.json").read_text())
    fit = json.loads((DATA_OUT / "sun_forecast.json").read_text())["fit"]
    coeffs = (fit["c0"], fit["c1"], fit["c2"])

    months = [f"{y}-{m:02d}" for y in range(2015, 2042) for m in range(1, 13)]
    months = months[: months.index("2041-10") + 1]
    n = len(months)

    # OMNI monthly means 2015..2026
    keys = [d[:7] for d in omni["dates"]]
    ssn_d = np.array([np.nan if v is None else v for v in omni["ssn"]], dtype=float)
    ap_d = np.array([np.nan if v is None else v for v in omni["ap"]], dtype=float)
    om_ssn, om_ap = {}, {}
    for k in sorted(set(keys)):
        idx = [i for i, kk in enumerate(keys) if kk == k]
        s, a = ssn_d[idx], ap_d[idx]
        if np.any(~np.isnan(s)):
            om_ssn[k] = float(np.nanmean(s))
        if np.any(~np.isnan(a)):
            om_ap[k] = float(np.nanmean(a))

    # Ap ~ SSN linear fit (computed on OMNI monthly means 2015..2026)
    both = [k for k in om_ssn if k in om_ap and k >= "2015-01"]
    ap_c1, ap_c0 = np.polyfit([om_ssn[k] for k in both], [om_ap[k] for k in both], 1)

    i_min = month_index(*MIN_MONTH)
    peak_t = month_index(*PEAK_MONTH) - i_min
    a, b = solve_shape(float(peak_t), PEAK_SSN)
    t = np.arange(n, dtype=float) - i_min
    ssn = hathaway(t, a, b) + hathaway(t - CYCLE_MONTHS, a, b)
    source = np.array(["panel2019"] * n, dtype=object)
    for i, k in enumerate(months[:i_min]):
        ssn[i] = om_ssn[k]
        source[i] = "omni"
    source[i_min + CYCLE_MONTHS:] = "panel2019-repeat"

    f107 = ssn_to_f107(ssn, coeffs)
    ap = ap_c0 + ap_c1 * ssn

    out = {
        "source": "Reconstructed 2019 NOAA/NASA Solar Cycle 25 Prediction Panel forecast (peak SSN 115, Jul 2025); "
        "OMNI monthly means before Dec 2019; cycle 26 = cycle 25 shape +11 y (game-balanced)",
        "shape": {"form": "a*t^3/(exp((t/b)^2)-c), t months since 2019-12", "a": a, "b": b, "c": C_SHAPE},
        "ap_fit": {"form": "ap = c0 + c1*ssn", "c0": float(ap_c0), "c1": float(ap_c1), "fit_on": "OMNI monthly means 2015-2026"},
        "f107_fit": fit,
        "months": months,
        "segment": list(source),
        "ssn": [round(float(v), 1) for v in ssn],
        "f107_adj": [round(float(v), 1) for v in f107],
        "ap": [round(float(v), 1) for v in ap],
    }
    path = DATA_OUT / "sun_plan2019.json"
    path.write_text(json.dumps(out, separators=(",", ":")))
    ip = int(np.argmax(np.where(source == "panel2019", ssn, -1)))
    print(f"plan2019: a={a:.4g} b={b:.2f}; peak SSN {ssn[ip]:.1f} at {months[ip]}; "
          f"F10.7 at peak {f107[ip]:.1f}; Ap fit {ap_c0:.2f}+{ap_c1:.4f}*ssn; wrote {path.name} ({path.stat().st_size} B)")


if __name__ == "__main__":
    main()
