import { readFileSync } from 'node:fs';
import stub from '../fixtures/content-stub.json';
import type { Content } from '../../src/catalog';
import { engineDataFrom, type EngineData, type TableName } from '../../src/flight';
import type { Storm } from '../../src/events';
import { loadJson, meta } from './data';

const DATA = new URL('../../../web/public/data/', import.meta.url);

function bin(name: TableName): ArrayBuffer {
  const b = readFileSync(new URL(meta.tables[name]!.file, DATA));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

let cached: EngineData | null = null;
/** Engine data from web/public/data and the content stub (until content/ lands). */
export function testEngineData(): EngineData {
  cached ??= engineDataFrom({
    meta,
    bins: { sso_truth: bin('sso_truth'), sso_plan: bin('sso_plan'), iss_truth: bin('iss_truth'), iss_plan: bin('iss_plan') },
    storms: loadJson<{ storms: Storm[] }>('storms.json'),
    content: stub as unknown as Content,
  });
  return cached;
}
