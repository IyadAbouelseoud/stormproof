"""Shared solar helpers (physics; owned by the lead, not workers).

AGENTS.md s5: NASA OMNI daily F10.7 is adjusted to 1 AU; NRLMSIS expects observed flux:
observed = adjusted * (1 AU / r)^2, plus the 81-day centred mean of observed.
"""
from __future__ import annotations

import datetime as dt
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
RAW = HERE / "raw"
DATA_OUT = HERE.parent / "web" / "public" / "data"

# Earth orbit eccentricity (J2000), source: Astronomical Almanac; perihelion ~ day-of-year 4.
ECCENTRICITY = 0.01671
PERIHELION_DOY = 4.0
YEAR_DAYS = 365.256

OMNI_END = dt.date(2026, 10, 29)  # last OMNI day (AGENTS.md s5)


def sun_earth_distance_au(d: dt.date) -> float:
    """First-order Earth-Sun distance in AU (good to ~1e-4 AU)."""
    doy = d.timetuple().tm_yday
    return 1.0 - ECCENTRICITY * np.cos(2.0 * np.pi * (doy - PERIHELION_DOY) / YEAR_DAYS)


def adjusted_to_observed_ratio(d: dt.date) -> float:
    """observed / adjusted = (1 AU / r)^2. ~1.034 on 4 Jan, ~0.967 on 4 Jul."""
    return 1.0 / sun_earth_distance_au(d) ** 2


def adjusted_to_observed(dates: list[dt.date], adjusted: np.ndarray) -> np.ndarray:
    ratio = np.array([adjusted_to_observed_ratio(d) for d in dates])
    return np.asarray(adjusted, dtype=float) * ratio


def centred_mean_81(values: np.ndarray) -> np.ndarray:
    """81-day centred mean ignoring NaN; edges use the available window."""
    v = np.asarray(values, dtype=float)
    out = np.full_like(v, np.nan)
    for i in range(len(v)):
        w = v[max(0, i - 40): i + 41]
        w = w[~np.isnan(w)]
        if w.size:
            out[i] = w.mean()
    return out


def fit_ssn_to_f107(ssn_monthly: np.ndarray, f107_monthly: np.ndarray) -> tuple[float, float, float]:
    """Least-squares quadratic F10.7 = c0 + c1*SSN + c2*SSN^2 on monthly means (computed, AGENTS.md s5)."""
    m = ~(np.isnan(ssn_monthly) | np.isnan(f107_monthly))
    c2, c1, c0 = np.polyfit(ssn_monthly[m], f107_monthly[m], 2)
    return float(c0), float(c1), float(c2)


def ssn_to_f107(ssn: np.ndarray, coeffs: tuple[float, float, float]) -> np.ndarray:
    c0, c1, c2 = coeffs
    s = np.asarray(ssn, dtype=float)
    return c0 + c1 * s + c2 * s * s


def daterange(start: dt.date, end: dt.date) -> list[dt.date]:
    """Inclusive daily range."""
    return [start + dt.timedelta(days=i) for i in range((end - start).days + 1)]
