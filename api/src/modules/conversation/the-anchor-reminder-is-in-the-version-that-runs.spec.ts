import { PromptsService, SEEDED_ON_START } from '../prompts/prompts.service';
import { ANCHOR_LEAD_PROMPT, ANCHOR_LEAD_PROMPT_KEY, THE_ANCHOR_REMINDER, theAnchorGuidance } from './the-anchor-lead-conversation';

/**
 * THE SHORT REMINDER READ LAST IS IN THE VERSION THAT RUNS.
 *
 * It used to be added from the code on every turn, so a version stored in the database (the one that
 * runs) could never drop it, and a version activated by hand could never change it. It is now part of
 * the stored words. A start seeds the new words the way every prompt is seeded: it replaces a version
 * the start itself activated, and never one somebody activated by hand.
 */
type Row = { id: string; key: string; version: number; content: string; summary: string | null; isActive: boolean; activatedAt: Date | null; activatedBy: string | null };

function aTable(rows: Row[]) {
  const t = rows.map((r) => ({ ...r }));
  const matches = (r: Row, where: any) => Object.entries(where ?? {}).every(([k, v]) => (r as any)[k] === v);
  const newestFirst = (xs: Row[]) => [...xs].sort((a, b) => b.version - a.version);
  const promptVersion = {
    findFirst: jest.fn(async (a: any) => newestFirst(t.filter((r) => matches(r, a?.where)))[0] ?? null),
    findUnique: jest.fn(async (a: any) => t.find((r) => r.id === a.where.id) ?? null),
    create: jest.fn(async (a: any) => {
      const row: Row = { id: `v-${t.length + 1}`, summary: null, isActive: false, activatedAt: null, activatedBy: null, ...a.data };
      t.push(row);
      return row;
    }),
    updateMany: jest.fn(async (a: any) => { for (const r of t.filter((x) => matches(x, a.where))) Object.assign(r, a.data); return {}; }),
    update: jest.fn(async (a: any) => { const r = t.find((x) => x.id === a.where.id)!; Object.assign(r, a.data); return r; }),
  };
  const prisma: any = { promptVersion, $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops) };
  return { prisma, rows: t, activeOf: (key: string) => t.find((r) => r.key === key && r.isActive) ?? null };
}

const THE_OLD_WORDS = ANCHOR_LEAD_PROMPT.slice(0, ANCHOR_LEAD_PROMPT.indexOf('=== READ THIS LAST ==='));
const row = (o: Partial<Row> & Pick<Row, 'id' | 'version' | 'content'>): Row => ({ key: ANCHOR_LEAD_PROMPT_KEY, summary: 'Seeded on deploy', isActive: false, activatedAt: null, activatedBy: null, ...o });

describe('the anchor reminder, and the version that runs', () => {
  it('a start replaces the version it activated itself, and the version that then runs carries the reminder', async () => {
    const t = aTable([row({ id: 'old', version: 8, content: THE_OLD_WORDS.trim(), isActive: true, activatedBy: SEEDED_ON_START })]);
    await new PromptsService(t.prisma, {} as any).onModuleInit();
    const running = t.activeOf(ANCHOR_LEAD_PROMPT_KEY)!;
    expect(running.id).not.toBe('old');
    expect(running.content).toContain(THE_ANCHOR_REMINDER);
    const prompts: any = { getActive: async () => running };
    const g = await theAnchorGuidance(async () => true, prompts, 'HELP_TEAM_UNDERSTAND', []);
    expect(g!.promptVersionId).toBe(running.id);
    expect(g!.last).toBe(THE_ANCHOR_REMINDER);
    expect(g!.text).not.toContain(THE_ANCHOR_REMINDER);
  });

  it('a start never replaces a version somebody activated by hand, which then runs as its author wrote it', async () => {
    const t = aTable([row({ id: 'hand', version: 9, content: 'HAND WORDS', summary: 'Tighter opener', isActive: true, activatedBy: 'u-admin' })]);
    await new PromptsService(t.prisma, {} as any).onModuleInit();
    expect(t.activeOf(ANCHOR_LEAD_PROMPT_KEY)!.id).toBe('hand');
    expect(t.rows.find((r) => r.content === ANCHOR_LEAD_PROMPT)).toMatchObject({ isActive: false });
    const g = await theAnchorGuidance(async () => true, { getActive: async () => t.activeOf(ANCHOR_LEAD_PROMPT_KEY) } as any, 'HELP_TEAM_UNDERSTAND', []);
    expect(g).toMatchObject({ text: 'HAND WORDS', last: '', promptVersionId: 'hand' });
  });
});
