"""Run the whole pipeline in order. Idempotent: fetch scripts reuse cached raw downloads in pipeline/raw/.

Run from pipeline/:  uv run --env-file .env python build_all.py
(without .env, drop --env-file; fetch_donki then falls back to DEMO_KEY.)
"""
from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
STEPS = [
    "fetch_omni.py",        # NASA OMNIWeb -> sun_daily.json
    "fetch_forecast.py",    # NASA solar-cycle prediction -> sun_forecast.json
    "build_plan2019.py",    # 2019 panel forecast -> sun_plan2019.json
    "fetch_donki.py",       # NASA DONKI GST -> storms.json
    "fetch_gibs.py",        # NASA GIBS imagery -> img/gibs/*.jpg + credits.json
    "build_density.py",     # NRLMSIS 2.1 tables -> density_*.bin + density_meta.json
]


def main() -> None:
    for step in STEPS:
        t = time.time()
        print(f"== {step}", flush=True)
        r = subprocess.run([sys.executable, str(HERE / step)], cwd=HERE)
        if r.returncode != 0:
            sys.exit(f"FAILED: {step} (exit {r.returncode})")
        print(f"== {step} ok ({time.time() - t:.0f}s)", flush=True)


if __name__ == "__main__":
    main()
