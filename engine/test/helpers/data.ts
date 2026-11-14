import { readFileSync } from 'node:fs';
import type { DensityMeta, DensityTable } from '../../src/drag';
import { makeTable } from '../../src/drag';

const DATA = new URL('../../../web/public/data/', import.meta.url);

export const meta = JSON.parse(readFileSync(new URL('density_meta.json', DATA), 'utf8')) as DensityMeta;

export function loadTable(name: 'sso_truth' | 'sso_plan' | 'iss_truth' | 'iss_plan'): DensityTable {
  const b = readFileSync(new URL(meta.tables[name]!.file, DATA));
  const f = new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  return makeTable(meta, name, f);
}

export function loadJson<T>(file: string): T {
  return JSON.parse(readFileSync(new URL(file, DATA), 'utf8')) as T;
}
