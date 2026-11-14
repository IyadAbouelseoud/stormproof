#!/usr/bin/env python3
"""Validate ChatGPT content batches. Usage: python3 qa/validate_content.py batchN.json
Checks: JSON, en+ar present, word limits, banned words, em dash, '!', placeholders, stray numbers."""
import json, re, sys
BANNED = ["delve","tapestry","realm","journey","unlock","leverage","embark","harness","elevate","seamless","robust","cutting-edge","game-changing","revolutionary","in today's world","let's dive","imagine","not just"]
ALLOWED_NUM = {"926","2.5","497","15","2023","27","2025","2017","2022","2","3","5","24","179","6","200","500","210","0.35","2027","10","30","85","12","25","1","4","16","7"}
LIM = {"title":6,"tagline":12,"text":40,"mission":35,"role":20,"why":25,"label":5,"win":30,"fail":30,"limits":25,"name":4,"blurb":22,"tradeoff":18,"instruction":20,"empty":15,"line":14,"onboarding":20,"plain":25,"term":8}
MSG_PH = {"cause.sun_days":["days"],"cause.density":["factor"],"cause.slip":["months"],"cause.storm":["km"],"cause.propulsion":["days"],"cause.verdict":["verdict"],"fit.mass_over":["over_kg","max_kg"],"fit.power_short":["short_w"],"fit.volume_over":["over_u"],"fit.rocket_capacity":["mass_kg","cap_kg"],"fit.orbit_unsupported":["rocket","altitude_km"],"fit.before_first_flight":["rocket","date"],"fit.budget_over":["over_usd"],"outcome.reentered":["date","days"],"outcome.alive":["years"],"outcome.alive_forecast_end":["years"],"outcome.reentered_before_event":["date"],"disposal.fcc_pass":["years"],"disposal.fcc_fail":["years"],"disposal.nasa_pass":["years"],"disposal.nasa_fail":["years"],"event.look_met":["days"],"event.look_missed":["days"],"event.optical_cloud":["date"],"storm.vote_prompt":[],"storm.safe_mode":[],"storm.ride_out":[]}
B1_PH = {"budget","revisit_days","gsd_m","data_gb","lifetime_days","look_days"}
errs, warns = [], []
def walk(o, path, field, key):
    if isinstance(o, dict) and set(o) == {"en","ar"}:
        check(o, path, field, key); return
    if isinstance(o, dict) and ("en" in o) != ("ar" in o):
        errs.append(f"{path}: has only one of en/ar"); return
    if isinstance(o, dict):
        for k, v in o.items(): walk(v, f"{path}.{k}", k, key)
    elif isinstance(o, list):
        for i, v in enumerate(o): walk(v, f"{path}[{i}]", field, key)
def check(l, path, field, key):
    en, ar = l["en"], l["ar"]
    if not en.strip() or not ar.strip(): errs.append(f"{path}: empty en/ar"); return
    lim = 28 if key else LIM.get(field)
    for lang, t in (("en",en),("ar",ar)):
        n = len(t.split())
        if lim and n > lim: errs.append(f"{path}.{lang}: {n} words > {lim}")
        if "—" in t or "–" in t: errs.append(f"{path}.{lang}: dash")
        if "!" in t: errs.append(f"{path}.{lang}: exclamation")
        if lang == "en":
            for b in BANNED:
                if re.search(r"\b"+re.escape(b), t, re.I): errs.append(f"{path}.en: banned '{b}'")
        for num in re.findall(r"(?<![{\w])\d+(?:\.\d+)?(?![\w}])", re.sub(r"\{[^}]*\}", "", t)):
            if num not in ALLOWED_NUM: warns.append(f"{path}.{lang}: number {num} not in facts list")
    pe, pa = set(re.findall(r"\{(\w+)\}", en)), set(re.findall(r"\{(\w+)\}", ar))
    if pe != pa: errs.append(f"{path}: placeholders differ en {sorted(pe)} vs ar {sorted(pa)}")
    allowed = set(MSG_PH.get(key, [])) if key else B1_PH
    if not pe <= allowed: errs.append(f"{path}: placeholder not allowed {sorted(pe-allowed)}")
d = json.load(open(sys.argv[1], encoding="utf-8"))
if "messages" in d:
    keys = {m["key"] for m in d["messages"]}
    for k in MSG_PH:
        if k not in keys: errs.append(f"missing message key {k}")
    for m in d["messages"]:
        if m["key"] not in MSG_PH: errs.append(f"unknown key {m['key']}")
        else: walk(m["text"], f"messages.{m['key']}", "text", m["key"])
else:
    walk(d, "$", None, None)
if "parts" in d:
    need = "camera-budget camera-standard camera-sharp camera-radar panels-small panels-medium panels-large battery-small battery-medium battery-large radio-slow radio-standard radio-fast computer-basic computer-standard computer-large pointing-basic pointing-standard pointing-precise fuel-small fuel-large".split()
    for i in need:
        if i not in {p["id"] for p in d["parts"]}: errs.append(f"missing part {i}")
if "scenarios" in d:
    for i in ("angola","jeddah"):
        if i not in {s["id"] for s in d["scenarios"]}: errs.append(f"missing scenario {i}")
if "screens" in d and len(d["screens"]) != 7: errs.append("need 7 screens")
print("ERRORS:", *errs, sep="\n  ") if errs else print("ERRORS: none")
print("WARNINGS:", *warns, sep="\n  ") if warns else print("WARNINGS: none")
sys.exit(1 if errs else 0)
