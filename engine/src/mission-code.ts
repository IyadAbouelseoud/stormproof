/**
 * Mission codes: a compact, URL-safe, content-independent encoding of a MissionDesign.
 * Format: "SP1-" + base64url(UTF-8 of the fields joined by '~'). Pure; no content lookup.
 */
import type { FormFactor, MissionDesign, OrbitType, PartSlot, RoleAssignments, RoleId, SimMode, StormPolicy } from './contracts';

const VERSION = 'SP1';
const SLOTS: PartSlot[] = ['camera', 'panels', 'battery', 'radio', 'computer', 'pointing', 'fuel'];
const ROLES: RoleId[] = ['systems-lead', 'science', 'power-spacecraft', 'orbit-comms'];
const FF: FormFactor[] = ['1U', '3U', '6U'];
const ORBIT: Record<OrbitType, string> = { SSO: 'S', 'ISS51.6': 'I' };
const MODE: Record<SimMode, string> = { plan: 'p', truth: 't' };
const POLICY: Record<StormPolicy, string> = { 'ride-out': 'r', 'safe-mode': 's' };
const SEP = '~';

const inv = <K extends string>(m: Record<K, string>): Record<string, K> =>
  Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k])) as Record<string, K>;

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** UTF-8 bytes of a string via encodeURIComponent (ES only, no DOM/Node globals). */
function utf8(s: string): number[] {
  const e = encodeURIComponent(s);
  const out: number[] = [];
  for (let i = 0; i < e.length; i++) {
    if (e[i] === '%') {
      out.push(parseInt(e.slice(i + 1, i + 3), 16));
      i += 2;
    } else out.push(e.charCodeAt(i));
  }
  return out;
}

function b64urlEncode(s: string): string {
  const b = utf8(s);
  let o = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i]! << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    o += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!;
    if (i + 1 < b.length) o += B64[(n >> 6) & 63]!;
    if (i + 2 < b.length) o += B64[n & 63]!;
  }
  return o;
}

function b64urlDecode(s: string): string {
  if (!/^[A-Za-z0-9_-]*$/.test(s) || s.length % 4 === 1) throw new Error('mission code: bad characters');
  const bytes: number[] = [];
  for (let i = 0; i < s.length; i += 4) {
    const c = s.slice(i, i + 4);
    let n = 0;
    for (let k = 0; k < 4; k++) n = (n << 6) | (k < c.length ? B64.indexOf(c[k]!) : 0);
    bytes.push((n >> 16) & 255);
    if (c.length > 2) bytes.push((n >> 8) & 255);
    if (c.length > 3) bytes.push(n & 255);
  }
  try {
    return decodeURIComponent(bytes.map((x) => '%' + x.toString(16).padStart(2, '0')).join(''));
  } catch {
    throw new Error('mission code: not UTF-8');
  }
}

/** Free-text fields (ids, names) are percent-encoded so they can never contain the separator. */
const enc = (s: string): string => encodeURIComponent(s).replace(/~/g, '%7E');
const dec = (s: string): string => decodeURIComponent(s);

export function encodeMission(d: MissionDesign): string {
  const roles = d.roles ? ROLES.map((r) => (d.roles![r] === undefined ? '' : '=' + enc(d.roles![r]!))).join(',') : '';
  const fields = [
    enc(d.scenarioId),
    ...SLOTS.map((s) => enc(d.parts[s])),
    d.formFactor,
    ORBIT[d.orbit.type],
    String(d.orbit.altitudeKm),
    enc(d.rocketId),
    d.launchDate,
    MODE[d.mode],
    String(d.seed >>> 0),
    d.stormPolicy ? POLICY[d.stormPolicy] : '',
    d.roles ? 'R' + roles : '',
  ];
  return `${VERSION}-${b64urlEncode(fields.join(SEP))}`;
}

export function decodeMission(code: string): MissionDesign {
  const c = code.trim();
  const dash = c.indexOf('-');
  if (dash < 0 || c.slice(0, dash) !== VERSION) throw new Error('mission code: unknown version');
  const body = c.slice(dash + 1);
  const f = b64urlDecode(body).split(SEP);
  if (f.length !== 17) throw new Error('mission code: wrong field count');
  const [scenario, ...tail] = f as [string, ...string[]];
  const partIds = tail.slice(0, 7);
  const [ff, orbit, alt, rocket, date, mode, seed, policy, roles] = tail.slice(7) as string[];
  if (!FF.includes(ff as FormFactor)) throw new Error('mission code: bad form factor');
  const orbitType = inv(ORBIT)[orbit!];
  const simMode = inv(MODE)[mode!];
  if (!orbitType || !simMode) throw new Error('mission code: bad orbit or mode');
  const altitudeKm = Number(alt);
  const seedN = Number(seed);
  if (!Number.isFinite(altitudeKm) || !/^\d+$/.test(seed!) || seedN > 0xffffffff) throw new Error('mission code: bad number');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date!)) throw new Error('mission code: bad date');

  const parts = Object.fromEntries(SLOTS.map((s, i) => [s, dec(partIds[i]!)])) as MissionDesign['parts'];
  const design: MissionDesign = {
    scenarioId: dec(scenario),
    parts,
    formFactor: ff as FormFactor,
    orbit: { type: orbitType, altitudeKm },
    rocketId: dec(rocket!),
    launchDate: date!,
    mode: simMode,
    seed: seedN,
  };
  if (roles) {
    if (!roles.startsWith('R')) throw new Error('mission code: bad roles');
    const vals = roles.slice(1).split(',');
    if (vals.length !== ROLES.length) throw new Error('mission code: bad roles');
    const ra: RoleAssignments = {};
    ROLES.forEach((r, i) => {
      const v = vals[i]!;
      if (v.startsWith('=')) ra[r] = dec(v.slice(1));
    });
    design.roles = ra;
  }
  if (policy) {
    const p = inv(POLICY)[policy];
    if (!p) throw new Error('mission code: bad storm policy');
    design.stormPolicy = p;
  }
  return design;
}
