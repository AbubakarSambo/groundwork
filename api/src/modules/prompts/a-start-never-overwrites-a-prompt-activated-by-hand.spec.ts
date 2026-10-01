import { PromptsService, SEEDED_ON_START, theSeedingActivatedIt } from './prompts.service';

/**
 * A START NEVER OVERWRITES A PROMPT SOMEBODY ACTIVATED BY HAND (decision 74, item 6).
 *
 * The prompt file is stood in for by a small SEED_PROMPTS, and the database by an in-memory table
 * that behaves like prompt_versions for the reads and writes the start makes. Each test starts the
 * service, as the API does on every start, and reads what is active afterwards.
 */
const mockSeeds: { key: string; content: string }[] = [];
jest.mock('../conversation/prompt-library', () => ({ get SEED_PROMPTS() { return mockSeeds; } }));

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

const row = (o: Partial<Row> & Pick<Row, 'id' | 'key' | 'version' | 'content'>): Row => ({ summary: 'Seeded on deploy', isActive: false, activatedAt: null, activatedBy: null, ...o });

async function startWith(seeds: { key: string; content: string }[], rows: Row[]) {
  mockSeeds.splice(0, mockSeeds.length, ...seeds);
  const table = aTable(rows);
  await new PromptsService(table.prisma, {} as any).onModuleInit();
  return table;
}

describe('a start, against what is active', () => {
  it('a version activated by hand stays active when the file’s words change, and the new words wait as a version', async () => {
    const t = await startWith([{ key: 'drift_lead', content: 'NEW WORDS' }], [
      row({ id: 'a', key: 'drift_lead', version: 1, content: 'OLD WORDS', summary: 'Seeded on deploy' }),
      row({ id: 'b', key: 'drift_lead', version: 2, content: 'HAND WORDS', summary: 'Tighter opener', isActive: true, activatedBy: 'u-platform-admin' }),
    ]);
    expect(t.activeOf('drift_lead')!.id).toBe('b');
    const added = t.rows.find((r) => r.content === 'NEW WORDS')!;
    expect(added).toMatchObject({ version: 3, isActive: false, summary: 'Seeded on deploy' });
  });

  it('a version activated by hand before this rule, made through /prompts with its own summary, stays active too', async () => {
    const t = await startWith([{ key: 'report_synthesis', content: 'NEW WORDS' }], [
      row({ id: 'a', key: 'report_synthesis', version: 6, content: 'SEEDED', summary: 'Seeded on deploy' }),
      row({ id: 'b', key: 'report_synthesis', version: 7, content: 'HAND', summary: 'Fix for the opener', isActive: true, activatedBy: null }),
    ]);
    expect(t.activeOf('report_synthesis')!.id).toBe('b');
    expect(t.rows.filter((r) => r.content === 'NEW WORDS')).toHaveLength(1);
  });

  it('a version the start activated is replaced by the new words, and the start marks its own activation', async () => {
    const t = await startWith([{ key: 'drift_lead', content: 'NEW WORDS' }], [
      row({ id: 'a', key: 'drift_lead', version: 4, content: 'OLD WORDS', isActive: true, activatedBy: SEEDED_ON_START }),
    ]);
    expect(t.activeOf('drift_lead')).toMatchObject({ content: 'NEW WORDS', version: 5, activatedBy: SEEDED_ON_START });
    expect(t.rows.find((r) => r.id === 'a')!.isActive).toBe(false);
  });

  it('a version seeded before this rule ("Seeded on deploy", nobody recorded) is replaced, as are prisma/seed.ts’s first versions', async () => {
    const t = await startWith([{ key: 'drift_lead', content: 'NEW' }, { key: 'drift', content: 'NEW DRIFT' }], [
      row({ id: 'a', key: 'drift_lead', version: 9, content: 'OLD', isActive: true }),
      row({ id: 'd', key: 'drift', version: 1, content: 'FIRST', summary: null, isActive: true }),
    ]);
    expect(t.activeOf('drift_lead')!.content).toBe('NEW');
    expect(t.activeOf('drift')!.content).toBe('NEW DRIFT');
  });

  it('a new key is created and activated', async () => {
    const t = await startWith([{ key: 'company_picture', content: 'PICTURE WORDS' }], []);
    expect(t.activeOf('company_picture')).toMatchObject({ version: 1, content: 'PICTURE WORDS', summary: 'Seeded on deploy', activatedBy: SEEDED_ON_START });
  });

  it('an older seeded version with the same words is activated again, rather than copied, when the active one is the seeding’s own', async () => {
    const t = await startWith([{ key: 'drift_lead', content: 'BACK AGAIN' }], [
      row({ id: 'a', key: 'drift_lead', version: 1, content: 'BACK AGAIN' }),
      row({ id: 'b', key: 'drift_lead', version: 2, content: 'WENT AWAY', isActive: true, activatedBy: SEEDED_ON_START }),
    ]);
    expect(t.activeOf('drift_lead')!.id).toBe('a');
    expect(t.rows).toHaveLength(2);
  });

  it('nothing changes when the active words already match, whoever activated them', async () => {
    const t = await startWith([{ key: 'drift_lead', content: 'SAME' }], [
      row({ id: 'a', key: 'drift_lead', version: 3, content: 'SAME', isActive: true, activatedBy: 'u-platform-admin' }),
    ]);
    expect(t.prisma.promptVersion.create).not.toHaveBeenCalled();
    expect(t.prisma.promptVersion.update).not.toHaveBeenCalled();
    expect(t.activeOf('drift_lead')!.id).toBe('a');
  });

  it('a second start after a hand activation adds nothing more', async () => {
    const t = await startWith([{ key: 'drift_lead', content: 'NEW WORDS' }], [
      row({ id: 'b', key: 'drift_lead', version: 2, content: 'HAND', summary: 'Mine', isActive: true, activatedBy: 'u-platform-admin' }),
      row({ id: 'c', key: 'drift_lead', version: 3, content: 'NEW WORDS' }),
    ]);
    expect(t.prisma.promptVersion.create).not.toHaveBeenCalled();
    expect(t.activeOf('drift_lead')!.id).toBe('b');
  });
});

describe('activating by hand records who did it', () => {
  it('the /prompts route passes the admin’s id, and a start then leaves that version alone', async () => {
    const t = aTable([row({ id: 'a', key: 'drift_lead', version: 1, content: 'X' })]);
    const svc = new PromptsService(t.prisma, {} as any);
    await svc.activate('a', 'u-platform-admin');
    expect(t.activeOf('drift_lead')!.activatedBy).toBe('u-platform-admin');
    expect(theSeedingActivatedIt(t.activeOf('drift_lead')!)).toBe(false);
  });

  it('with no id given it still counts as by hand', async () => {
    const t = aTable([row({ id: 'a', key: 'drift_lead', version: 1, content: 'X' })]);
    await new PromptsService(t.prisma, {} as any).activate('a');
    expect(theSeedingActivatedIt(t.activeOf('drift_lead')!)).toBe(false);
  });
});
