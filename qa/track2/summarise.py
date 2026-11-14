"""Summarise a qa/track2/results/*.json sweep: axe by impact, console errors, overflow kinds (noise filtered)."""
import json, io, sys, collections
d = json.load(io.open(sys.argv[1], encoding='utf8'))
combos = sorted({a['key'].rsplit('-', 1)[0] if a['key'].count('-') < 5 else '-'.join(a['key'].split('-')[:4]) for a in d['axe'] + d['overflow'] + d['dials']})
print('combos seen:', len(combos))
imp = collections.Counter((a['impact'], a['id']) for a in d['axe'])
print('axe:', dict(imp) or 'none')
print('axe serious+critical:', sum(v for (i, _), v in imp.items() if i in ('serious', 'critical')))
print('console/page errors:', len(d['errors']), d['errors'][:3])
NOISE = ('span.xd-dot', 'div.sp-stars', 'span.odometer-digit-box')
real = [o for o in d['overflow'] if not o.get('sel', '').startswith(NOISE) and o['kind'] != 'scrollable']
kinds = collections.Counter((o['kind'], o.get('sel') or (o.get('a', '') + ' / ' + o.get('b', ''))) for o in real)
print('overflow findings (decorative dot, star layer, odometer reel and scrollable tables left out):', len(real))
for (k, s), n in kinds.most_common(25):
    print(f'  {n:3d}  {k:16s} {s[:110]}')
bad = [x for x in d['dials'] if x['sw'] > x['cw'] or not x['inside']]
print('dial readouts:', len(d['dials']), 'outside or clipped:', len(bad))
print('arText screens:', len(d.get('arText', {})), 'misc:', d.get('misc', [])[:5])
