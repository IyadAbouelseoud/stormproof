import React from 'react';
import type { Part, PartSlot } from '@stormproof/engine';
import { useI18n } from '../i18n';
import { fmtNum } from '../format';
import { partName } from '../content';
import {
  batteryDod,
  climbKm,
  groundResolutionM,
  mbPerPass,
  orbitPhysics,
  partById,
  panelGenW,
  photoWidthKm,
  simulate,
  type MissionDesign,
  type SimResult,
} from '../engineAdapter';
import { CameraView, useGibsImage } from './CameraView';

/** Central share of the 30 m image the camera views show (zoomed so the pixels can be seen). */
const CROP = 0.125;
const SCALE_BOXES_M = [100, 250, 500, 1000, 2000];

interface LabProps {
  slot: PartSlot;
  current: Part;
  option: Part | null;
  design: MissionDesign;
  result: SimResult;
}

function Bar({ fill, kind = 'lapis', mark }: { fill: number; kind?: 'lapis' | 'ok' | 'fail' | 'dark'; mark?: number }): React.JSX.Element {
  return (
    <span className="lab-bar" aria-hidden="true">
      <span className={`lab-bar-fill lab-bar-fill--${kind}`} style={{ '--fill': Math.max(0, Math.min(1, fill)) } as React.CSSProperties} />
      {mark !== undefined && <span className="lab-bar-mark" style={{ '--at': Math.max(0, Math.min(1, mark)) } as React.CSSProperties} />}
    </span>
  );
}

/** One labelled row: who (your pick / this option), a bar, and the sentence a screen reader reads. */
function Row({ who, children, text }: { who: string; children: React.ReactNode; text: string }): React.JSX.Element {
  return (
    <div className="lab-row-wrap">
      <div className="lab-row">
        <span className="type-label">{who}</span>
        {children}
      </div>
      <p className="type-small lab-text">{text}</p>
    </div>
  );
}

const withPart = (d: MissionDesign, slot: PartSlot, id: string): MissionDesign => ({ ...d, mode: 'truth', parts: { ...d.parts, [slot]: id } });

/**
 * H3 Part lab: one live mini-visual per slot, computed at the current orbit from the engine's own formulas
 * (orbit.ts, power.ts, decay.ts) or from engine runs (simulate). Compares your pick with one other option.
 */
export function PartLab({ slot, current, option, design, result }: LabProps): React.JSX.Element | null {
  const { t, lang } = useI18n();
  const alt = design.orbit.altitudeKm;
  const parts = option ? [current, option] : [current];
  const who = (i: number) => (i === 0 ? t('lab.current') : t('lab.option'));
  const name = (p: Part) => partName(p.id, lang, p.name);
  const n = (v: number, d = 1) => fmtNum(lang, v, d);
  const img = useGibsImage(design.scenarioId);
  const phys = orbitPhysics(design);
  const loadW = result.gauges.power.value;
  const madeMB = result.gauges.data.value;

  let title = '';
  let body: React.ReactNode = null;

  switch (slot) {
    case 'camera': {
      title = t('lab.cam.title');
      const maxW = Math.max(...parts.map((p) => photoWidthKm(p, alt)), 1);
      const groundM = img ? 2048 * img.resolutionM * CROP : 1;
      const box = SCALE_BOXES_M.find((m) => m / groundM >= 0.05) ?? 2000;
      body = (
        <>
          {img ? (
            <div className="lab-cam-pair" dir="ltr">
              {parts.map((p, i) => {
                const g = groundResolutionM(p, alt);
                return (
                  <figure key={p.id} className="lab-cam-fig">
                    <div className="lab-cam">
                      <CameraView img={img} gsdM={g} crop={CROP} width={360} label={t('lab.cam.alt', { part: name(p), gsd: n(g), alt: n(alt, 0) })} />
                      <span className="lab-cam-label lab-cam-label--a type-label">{who(i)}</span>
                      <span className="lab-cam-scale" style={{ inlineSize: `${(box / groundM) * 100}%`, aspectRatio: '1 / 1', ['--box' as string]: `${(box / groundM) * 100}%` }} aria-hidden="true" />
                    </div>
                    <figcaption className="type-small">
                      {name(p)}: {n(g)} m{g <= img.resolutionM ? ` · ${t('lab.cam.sharper')}` : ''}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          ) : null}
          <p className="type-small lab-text">{t('lab.cam.scale', { m: n(box, 0) })}</p>
          {parts.map((p, i) => {
            const w = photoWidthKm(p, alt);
            return (
              <Row key={p.id} who={who(i)} text={t('lab.cam.width', { w: n(w, 0) })}>
                <Bar fill={w / maxW} />
              </Row>
            );
          })}
          {img && <p className="type-small lab-credit">{t('lab.cam.credit')}</p>}
        </>
      );
      break;
    }
    case 'panels': {
      title = t('lab.panels.title');
      const gens = parts.map((p) => panelGenW(p, alt));
      const max = Math.max(...gens, loadW, 1) * 1.1;
      const maxArea = Math.max(...parts.map((p) => p.effectiveAreaM2 ?? 0), 0.01);
      body = (
        <>
          <svg viewBox="0 0 220 70" className="lab-svg" aria-hidden="true">
            {parts.map((p, i) => {
              const wing = 20 + ((p.effectiveAreaM2 ?? 0) / maxArea) * 70;
              const cy = option ? 18 + i * 34 : 35;
              return (
                <g key={p.id} className={i === 0 ? 'lab-sat' : 'lab-sat lab-sat--opt'}>
                  <rect x={110 - wing - 12} y={cy - 9} width={wing} height={18} fill="var(--color-lapis-tint)" stroke="var(--color-lapis)" />
                  <rect x={98} y={cy - 12} width={24} height={24} fill="var(--color-ground-raised)" stroke="var(--color-ink)" />
                  <rect x={122} y={cy - 9} width={wing} height={18} fill="var(--color-lapis-tint)" stroke="var(--color-lapis)" />
                </g>
              );
            })}
          </svg>
          {parts.map((p, i) => (
            <Row key={p.id} who={who(i)} text={t('lab.panels.text', { part: name(p), area: n(p.effectiveAreaM2 ?? 0, 3), gen: n(gens[i]!), alt: n(alt, 0), load: n(loadW) })}>
              <Bar fill={gens[i]! / max} kind={gens[i]! >= loadW * 1.35 ? 'ok' : 'fail'} mark={loadW / max} />
            </Row>
          ))}
        </>
      );
      break;
    }
    case 'battery': {
      title = t('lab.bat.title');
      const need = (loadW * phys.eclipseMin) / 60;
      body = (
        <>
          {parts.map((p, i) => {
            const usable = (p.capacityWh ?? 0) * batteryDod;
            const lastsMin = loadW > 0 ? (usable / loadW) * 60 : Infinity;
            const ok = lastsMin >= phys.eclipseMin;
            const spare = need > 0 ? ((usable - need) / need) * 100 : 100;
            const head = ok ? t('lab.bat.ok', { min: n(phys.eclipseMin), pct: n(spare, 0) }) : t('lab.bat.out', { m: n(lastsMin), min: n(phys.eclipseMin) });
            return (
              <Row key={p.id} who={who(i)} text={`${head}. ${t('lab.bat.text', { part: name(p), usable: n(usable), min: n(phys.eclipseMin), need: n(need), load: n(loadW) })}`}>
                <Bar fill={Math.min(1, lastsMin / Math.max(phys.eclipseMin * 2, 1))} kind={ok ? 'ok' : 'fail'} mark={0.5} />
              </Row>
            );
          })}
        </>
      );
      break;
    }
    case 'radio': {
      title = t('lab.radio.title');
      const caps = parts.map((p) => ((p.downlinkMbps ?? 0) * phys.contactMinPerDay * 60) / 8);
      const max = Math.max(...caps, madeMB, 1);
      body = (
        <>
          {parts.map((p, i) => (
            <Row key={p.id} who={who(i)} text={t('lab.radio.text', { part: name(p), pass: n(phys.passMin), mb: n(mbPerPass(p, design), 0), cap: n(caps[i]!, 0), made: n(madeMB, 0) })}>
              <Bar fill={Math.log10(1 + caps[i]!) / Math.log10(1 + max)} kind={caps[i]! >= madeMB ? 'ok' : 'fail'} mark={Math.log10(1 + madeMB) / Math.log10(1 + max)} />
            </Row>
          ))}
        </>
      );
      break;
    }
    case 'computer': {
      title = t('lab.comp.title');
      const hours = phys.passesPerDay > 0 ? 24 / phys.passesPerDay : 24;
      const fill = (madeMB * hours) / 24;
      body = (
        <>
          {parts.map((p, i) => {
            const st = p.storageMB ?? 0;
            const pct = st > 0 ? (fill / st) * 100 : 100;
            const text = t('lab.comp.text', { part: name(p), st: n(st, 0), h: n(hours), fill: n(fill, 0), pct: n(Math.min(pct, 999), 0) });
            return (
              <Row key={p.id} who={who(i)} text={pct > 100 ? `${text} ${t('lab.comp.full')}.` : text}>
                <Bar fill={pct / 100} kind={pct > 100 ? 'fail' : 'ok'} />
              </Row>
            );
          })}
        </>
      );
      break;
    }
    case 'pointing': {
      title = t('lab.point.title');
      const runs = parts.map((p) => simulate(withPart(design, 'pointing', p.id)));
      const revisit = runs.map((r) => r.score.requirements.find((q) => q.id === 'revisit'));
      const swath = (camW: number, p: Part) => camW * (p.offNadirFactor ?? 1);
      const camWidth = photoWidthKmOf(design);
      const maxW = Math.max(...parts.map((p) => swath(camWidth, p)), 1);
      body = (
        <>
          <svg viewBox="0 0 220 80" className="lab-svg" aria-hidden="true">
            <line x1="0" y1="72" x2="220" y2="72" stroke="var(--color-rule)" strokeWidth="2" />
            {parts.map((p, i) => {
              const half = (swath(camWidth, p) / maxW) * 100;
              return (
                <polygon
                  key={p.id}
                  points={`110,10 ${110 - half},72 ${110 + half},72`}
                  fill={i === 0 ? 'var(--color-lapis-tint)' : 'none'}
                  stroke={i === 0 ? 'var(--color-lapis)' : 'var(--color-ink)'}
                  strokeDasharray={i === 0 ? undefined : '4 3'}
                />
              );
            })}
            <rect x="104" y="2" width="12" height="10" fill="var(--color-ground-raised)" stroke="var(--color-ink)" />
          </svg>
          {parts.map((p, i) => {
            const q = revisit[i];
            return (
              <Row key={p.id} who={who(i)} text={t('lab.point.text', { part: name(p), w: n(swath(camWidth, p), 0), days: q ? n(q.value) : '—', target: q ? n(q.target) : '—' })}>
                <Bar fill={swath(camWidth, p) / maxW} kind={q?.met ? 'ok' : 'fail'} />
              </Row>
            );
          })}
        </>
      );
      break;
    }
    case 'fuel': {
      title = t('lab.fuel.title');
      const runs = parts.map((p) => simulate(withPart(design, 'fuel', p.id)));
      const base = runs[0]!.lifetimeDays;
      const maxKm = Math.max(...parts.map((p) => climbKm(p, alt)), 1);
      body = (
        <>
          {parts.map((p, i) => {
            const km = climbKm(p, alt);
            const d = runs[i]!.lifetimeDays - base;
            const life = i === 0 ? '' : ` ${t('lab.fuel.life', { sign: d >= 0 ? '+' : '-', days: n(Math.abs(d), 0) })}.`;
            return (
              <Row key={p.id} who={who(i)} text={`${t('lab.fuel.text', { part: name(p), dv: n(p.deltaVMs ?? 0, 0), km: n(km) })}${life}`}>
                <Bar fill={km / maxKm} />
              </Row>
            );
          })}
        </>
      );
      break;
    }
    default:
      return null;
  }

  return (
    <section className="lab" aria-label={`${t('lab.title')}: ${title}`} data-lab={slot}>
      <div className="lab-head">
        <h5 className="type-label-l">{title}</h5>
        <span className="type-label lab-tag">{t('lab.computed')}</span>
      </div>
      {body}
    </section>
  );
}

/** Photo width of the design's camera at its altitude, km. */
function photoWidthKmOf(design: MissionDesign): number {
  const cam = partById(design.parts.camera);
  return cam ? photoWidthKm(cam, design.orbit.altitudeKm) : 0;
}
