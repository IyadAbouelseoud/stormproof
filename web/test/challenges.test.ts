// Prompt H7: the challenge codes are locked: each start design does not complete its quest, each solution does.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  vi.stubGlobal('fetch', async (url: string) => {
    const buf = readFileSync(resolve(__dirname, '../public/data', String(url).split('/').pop()!));
    return { ok: true, status: 200, json: async () => JSON.parse(buf.toString('utf8')), arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
  });
});

describe('H7 challenge cards', () => {
  it('three challenges, start fails and solution completes, codes round-trip', async () => {
    const a = await import('../src/engineAdapter');
    await a.loadEngine();
    const { CHALLENGES, challengeMet } = await import('../src/challenges');
    expect(CHALLENGES).toHaveLength(3);
    for (const c of CHALLENGES) {
      const s = a.decodeMission(c.start);
      const f = a.decodeMission(c.solution);
      expect(s, c.id).not.toBeNull();
      expect(f, c.id).not.toBeNull();
      const rs = a.simulate({ ...s!, mode: 'truth' });
      const rf = a.simulate({ ...f!, mode: 'truth' });
      expect(rs.missionCode).toBe(c.start);
      expect(rf.missionCode).toBe(c.solution);
      expect(challengeMet(c, rs), `${c.id} start`).toBe(false);
      expect(challengeMet(c, rf), `${c.id} solution`).toBe(true);
      expect(rf.fit.every((x) => x.pass), `${c.id} solution fit`).toBe(true);
    }
  });
});
