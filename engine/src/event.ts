/**
 * Event replay (prompt E2): could the satellite take a useful look at a dated event (Jeddah flood, 24 Nov 2022)?
 * Pure and deterministic: the pass phase comes from its own RNG stream derived from design.seed, so the
 * main stream (launch slip, storm votes) is untouched.
 *
 * Model (game-balanced, disclosed): mean revisit R = revisitDays(swath x off-nadir factor, altitude on the
 * event day, target latitude); first pass at a seeded phase in [0, R) on or after the event date, then every
 * R days inside the look window (radar: R halved, it also looks on night crossings). Radar sees through cloud; optical needs a 'clear' or 'partly' daily cloud tag
 * (MODIS Terra, read by eye). 'cloudy' and 'no-image' block optical (no-image = unknown, conservative).
 */
import type { CloudTag, CloudTagFile, Part, Scenario } from './catalog';
import type { EventLook, EventReplay, FitVerdict, TimelineDay } from './contracts';
import { dayNum, isoOf } from './dates';
import { msg, r1 } from './msg';
import { revisitDays, swathKm } from './orbit';
import { createRng } from './rng';

/** Salt for the event RNG stream (any fixed constant). */
const EVENT_SALT = 0x9e3779b9;

export interface EventInputs {
  scenario: Scenario;
  camera: Part;
  pointing: Part;
  timeline: TimelineDay[];
  fit: FitVerdict[];
  cloud: CloudTagFile | undefined;
  seed: number;
}

export const cameraKind = (p: Part): 'optical' | 'radar' => p.cameraType ?? 'optical';

/** Swath on the ground including the pointing part's off-nadir factor (default 1). */
export const lookSwathKm = (camera: Part, pointing: Part | undefined, altKm: number): number =>
  swathKm(camera.swathAt500Km ?? 0, altKm) * (pointing?.offNadirFactor ?? 1);

export function eventReplay(x: EventInputs): EventReplay | undefined {
  const ev = x.scenario.event;
  if (!ev) return undefined;
  const window = x.scenario.lookWindowDays ?? 0;
  const lat = x.scenario.targetLatDeg ?? 0;
  const eDay = dayNum(ev.date);
  const tl = x.timeline;
  const first = dayNum(tl[0]!.date);
  const last = dayNum(tl[tl.length - 1]!.date);
  const reentered = last < eDay; // the timeline ends at reentry (or the 2041 forecast end)
  const alive = first <= eDay && eDay <= last;
  const base = {
    date: ev.date,
    alive,
    reentryBeforeEvent: reentered && first <= eDay,
    reentryDate: reentered ? tl[tl.length - 1]!.date : null,
  };
  if (!alive) return { ...base, revisitDays: null, firstUsefulLookDays: null, looks: [] };

  const altKm = tl[eDay - first]!.altitudeKm;
  const swath = lookSwathKm(x.camera, x.pointing, altKm);
  const kind = cameraKind(x.camera);
  // Radar does not need daylight: it can look on the night crossing too, halving the mean revisit. game-balanced.
  const R = swath > 0 ? revisitDays(swath, altKm, lat) / (kind === 'radar' ? 2 : 1) : Infinity;
  const ok = (c: string): boolean => x.fit.find((f) => f.check === c)?.pass ?? false;
  const powered = ok('power') && ok('energy') && ok('data');
  const tags = new Map<string, CloudTag>((x.cloud?.days ?? []).map((d) => [d.date, d.tag]));

  const looks: EventLook[] = [];
  if (Number.isFinite(R)) {
    const phase = createRng((x.seed ^ EVENT_SALT) >>> 0).next() * R;
    for (let t = phase; t <= window; t += R) {
      const day = Math.floor(eDay + t);
      if (day > last) break; // reentered inside the window
      const date = isoOf(day);
      const days = r1(t);
      const look = (usable: boolean, key: string, en: string): EventLook => ({ date, days, camera: kind, usable, why: msg(key, en, { date }) });
      if (!powered) {
        looks.push(look(false, 'event.power_short', `Pass on ${date}: not enough power or data margin to take the picture.`));
      } else if (kind === 'radar') {
        looks.push(look(true, 'event.radar_ok', `Pass on ${date}: the radar sees through the cloud.`));
      } else {
        const tag = tags.get(date) ?? 'no-image';
        looks.push(
          tag === 'clear' ? look(true, 'event.optical_clear', `Pass on ${date}: clear at the Terra overpass, the camera sees the ground.`)
            : tag === 'partly' ? look(true, 'event.optical_partly', `Pass on ${date}: partly cloudy at the Terra overpass, a partial view.`)
              : tag === 'cloudy' ? look(false, 'event.optical_cloud', `Pass on ${date}: storm cloud blocks the camera.`)
                : look(false, 'event.optical_no_image', `Pass on ${date}: no image that day, counted as not usable.`),
        );
      }
    }
  }
  const useful = looks.find((l) => l.usable);
  return { ...base, revisitDays: Number.isFinite(R) ? r1(R) : null, firstUsefulLookDays: useful ? useful.days : null, looks };
}
