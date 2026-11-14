/** The real catalog in content/ (parts, rockets, scenarios, Jeddah cloud tags), for Jeddah tests. */
import { readFileSync } from 'node:fs';
import type { CloudTagFile, Content, Part, Rocket, Scenario } from '../../src/catalog';
import { engineDataFrom, type EngineData } from '../../src/flight';
import { testEngineData } from './engine';

const C = new URL('../../../content/', import.meta.url);
const json = <T>(p: string): T => JSON.parse(readFileSync(new URL(p, C), 'utf8')) as T;

export function realContent(): Content {
  return {
    parts: json<{ parts: Part[] }>('parts.json').parts,
    rockets: json<{ rockets: Rocket[] }>('rockets.json').rockets,
    scenarios: [json<Scenario>('scenarios/angola.json'), json<Scenario>('scenarios/jeddah-flood.json')],
    cloudTags: { 'jeddah-cloud-2022-11': json<CloudTagFile>('evidence/jeddah-cloud-2022-11.json') },
  };
}

let cached: EngineData | null = null;
/** Same density tables and storms as testEngineData(), with the real content catalog. */
export function realEngineData(): EngineData {
  cached ??= { ...testEngineData(), content: realContent() };
  return cached;
}
export { engineDataFrom };
