/**
 * Physical and game constants. Every exported number has an entry in SOURCES
 * (a citation, "AGENTS.md s5" for team-agreed values, or "game-balanced").
 */

export const MU_KM3_S2 = 398600.4418;
export const R_EARTH_KM = 6378.137;
export const J2 = 1.08262668e-3;
export const OMEGA_EARTH_RAD_S = 7.2921159e-5;
export const TROPICAL_YEAR_DAYS = 365.2422;

export const SOLAR_CONSTANT_W_M2 = 1361;
export const CELL_EFFICIENCY = 0.3;

export const CD = 2.2;
export const AREA_TO_MASS_M2_KG = { '1U': 0.014, '3U': 0.01, '6U': 0.007 } as const;
export const REENTRY_ALT_KM = 120;
export const HOURLY_BELOW_KM = 250;

export const GSD_REF_ALT_KM = 500;
export const FUNDA_LAT_DEG = -8.9;
export const FUNDA_LON_DEG = 13.2;
export const ELEVATION_MASK_DEG = 10;
export const TARGET_LAT_DEG = -16.0;

export const CML_MARGIN_PCT = 35;
export const FCC_DISPOSAL_YEARS = 5;
export const NASA_DISPOSAL_YEARS = 25;

export const OMNI_END = '2026-10-29';
export const STORM_ALERT_KP = 7;
export const BATTERY_DOD = 0.3;

export const SOURCES: Record<string, string> = {
  MU_KM3_S2: 'WGS 84 / EGM96 Earth gravitational parameter',
  R_EARTH_KM: 'WGS 84 equatorial radius',
  J2: 'EGM2008 J2 (Vallado, Fundamentals of Astrodynamics, 4th ed.)',
  OMEGA_EARTH_RAD_S: 'WGS 84 Earth rotation rate',
  TROPICAL_YEAR_DAYS: 'IAU tropical year (sun-synchronous precession rate)',
  SOLAR_CONSTANT_W_M2: 'AGENTS.md s5; Kopp & Lean 2011 total solar irradiance',
  CELL_EFFICIENCY: 'AGENTS.md s5 (triple-junction cells, about 30%)',
  CD: 'AGENTS.md s5 (standard drag coefficient)',
  AREA_TO_MASS_M2_KG: 'AGENTS.md s5; NASA LSP CubeSat area-to-mass medians',
  REENTRY_ALT_KM: 'AGENTS.md s5 (reentry interface)',
  HOURLY_BELOW_KM: 'AGENTS.md s5 (integrator step switch)',
  GSD_REF_ALT_KM: 'AGENTS.md s5 (GSD(h) = GSD(500 km) * h / 500)',
  FUNDA_LAT_DEG: 'AGENTS.md s5; Funda ground station, approximate location',
  FUNDA_LON_DEG: 'AGENTS.md s5; Funda ground station, approximate location',
  ELEVATION_MASK_DEG: 'game-balanced',
  TARGET_LAT_DEG: 'game-balanced (centre of the Cunene/Namibe drought area, approximate)',
  CML_MARGIN_PCT: 'AGENTS.md s5; JPL Concept Maturity Level 4 design margins',
  FCC_DISPOSAL_YEARS: 'FCC 22-74 (5-year rule)',
  NASA_DISPOSAL_YEARS: 'NASA-STD-8719.14C (25-year rule)',
  OMNI_END: 'AGENTS.md s5 (last NASA OMNI day)',
  STORM_ALERT_KP: 'game-balanced (alert at Kp >= 7, NOAA G3)',
  BATTERY_DOD: 'game-balanced (usable depth of discharge for LEO cycling)',
};
