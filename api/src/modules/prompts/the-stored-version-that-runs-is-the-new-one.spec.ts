import { PromptsService, SEEDED_ON_START } from './prompts.service';
import { SEED_PROMPTS, ONE_VOICE } from '../conversation/prompt-library';

/**
 * THE STORED VERSION THAT RUNS IS THE NEW ONE (fix plan, release batch 1, groups 5 and 6; CLAUDE.md, "The engine's instructions live in
 * two places"). The check-in's own instruction ("system") and the pulse and collections packs are stored prompts that can override the
 * file. On the local bed gw_loop_round39 (read only, 4 November 2026) each of the five rows below was version 1, active, activated by
 * "seeded on start". This starts the prompt store, as the API does on every start, from rows in exactly that state with the old words,
 * and reads what then runs: the new words, as a new version the start activated, and the old one kept.
 */
type Row = { id: string; key: string; version: number; content: string; summary: string | null; isActive: boolean; activatedAt: Date | null; activatedBy: string | null };

function aTable(rows: Row[]) {
  const t = rows.map((r) => ({ ...r }));
  const matches = (r: Row, where: any) => Object.entries(where ?? {}).every(([k, v]) => (r as any)[k] === v);
  const newestFirst = (xs: Row[]) => [...xs].sort((a, b) => b.version - a.version);
  const promptVersion = {
    findFirst: jest.fn(async (a: any) => newestFirst(t.filter((r) => matches(r, a?.where)))[0] ?? null),
    findUnique: jest.fn(async (a: any) => t.find((r) => r.id === a.where.id) ?? null),
    create: jest.fn(async (a: any) => { const row: Row = { id: `v-${t.length + 1}`, summary: null, isActive: false, activatedAt: null, activatedBy: null, ...a.data }; t.push(row); return row; }),
    updateMany: jest.fn(async (a: any) => { for (const r of t.filter((x) => matches(x, a.where))) Object.assign(r, a.data); return {}; }),
    update: jest.fn(async (a: any) => { const r = t.find((x) => x.id === a.where.id)!; Object.assign(r, a.data); return r; }),
  };
  return { prisma: { promptVersion, $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops) } as any, rows: t };
}

const KEYS = ['system', 'scenario.pulse_check.initiator', 'scenario.pulse_check.participant', 'scenario.collections.initiator', 'scenario.collections.participant'];

describe('after a start, from the rows the bed holds', () => {
  it('each of the five runs the words in the code, as a new version the start activated', async () => {
    const before: Row[] = KEYS.map((key, i) => ({
      id: `old-${i}`, key, version: 1, content: `OLD WORDS for ${key}. KEEP IT SHORT: about ten minutes. A QUESTION CARRIES ITS REASON.`,
      summary: null, isActive: true, activatedAt: new Date('2026-11-04T06:00:00Z'), activatedBy: SEEDED_ON_START,
    }));
    const t = aTable(before);
    const prompts = new PromptsService(t.prisma, {} as any);
    await prompts.onModuleInit();
    for (const key of KEYS) {
      const runs = await prompts.getActive(key);
      expect(runs.content).toBe(SEED_PROMPTS.find((s) => s.key === key)!.content);
      expect(runs).toMatchObject({ version: 2, activatedBy: SEEDED_ON_START });
      expect(runs.content).not.toMatch(/KEEP IT SHORT|A QUESTION CARRIES ITS REASON|It helps to keep a definition/);
      expect(t.rows.find((r) => r.id === before[KEYS.indexOf(key)].id)!.isActive).toBe(false);
    }
    expect((await prompts.getActive('system')).content).toContain(ONE_VOICE);
  });
});
