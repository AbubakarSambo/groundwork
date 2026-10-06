import { whatWouldChange, writeTheKinds, run, remembered, whatThisRunMayDo, whatWouldChangeSays, NOT_CLEAR, NO_WORDS, NO_DESCRIPTION, THE_SITUATION_DECIDES, COULD_NOT_READ, theCacheKey } from './give-each-check-in-its-kind-of-work';
import { KINDS_OF_WORK } from '../src/modules/board/the-kind-of-work';

/**
 * Decision 91, item 1: an existing check-in is given the kind of work that fits it, by the one reading a new
 * check-in gets at setup, and nothing else about it changes.
 */
const FIXTURES: any[] = [
  { id: 'sales', label: 'Sales team, Q3', brief: 'Our reps sell kitchen appliances to shops in Nairobi. I want to see which deals are real.', endState: null, resolutionState: null, kindOfWork: null, kindOfWorkSetBy: null },
  { id: 'eng', label: 'Release 4.2', brief: 'The engineers are shipping the payments release.', endState: null, resolutionState: null, kindOfWork: null, kindOfWorkSetBy: null },
  { id: 'law', label: 'Kasarani Foods v Pwani Mills', brief: 'A supply contract case with a hearing in November.', endState: null, resolutionState: null, kindOfWork: null, kindOfWorkSetBy: null },
  { id: 'unclear', label: 'Board meeting prep', brief: 'Getting ready for the board.', endState: null, resolutionState: null, kindOfWork: null, kindOfWorkSetBy: null },
  { id: 'empty', label: null, brief: null, endState: null, resolutionState: null, kindOfWork: null, kindOfWorkSetBy: null },
  { id: 'name-only', label: 'Sales team', scenario: 'TEAM_UPDATES', brief: null, endState: null, resolutionState: null, kindOfWork: null, kindOfWorkSetBy: null },
  { id: 'hire', label: 'New sales hire', scenario: 'NEW_HIRE', brief: 'Sam joins to sell kitchen appliances to shops.', endState: null, resolutionState: null, kindOfWork: null, kindOfWorkSetBy: null },
  { id: 'had', label: 'Support', brief: 'Tickets.', endState: null, resolutionState: null, kindOfWork: 'support desk', kindOfWorkSetBy: 'read' },
  { id: 'lead', label: 'Mine', brief: 'Sales deals.', endState: null, resolutionState: null, kindOfWork: null, kindOfWorkSetBy: 'lead' },
];

const ANSWERS: Record<string, string> = {
  'Sales team, Q3': 'sales org',
  'Release 4.2': 'engineering release',
  'Kasarani Foods v Pwani Mills': 'a law firm matter',
  'Board meeting prep': 'banking',
};
const read = async (words: string) => {
  for (const [label, kind] of Object.entries(ANSWERS)) if (words.includes(label)) return kind;
  return 'none';
};

function db(rows: any[]) {
  const writes: any[] = [];
  const prisma: any = {
    ground: {
      findMany: jest.fn(async () => rows.map((r) => ({ ...r }))),
      updateMany: jest.fn(async (a: any) => {
        /* Like the database: a test of "not lead" on an empty value is not true, so the where must say "or empty" itself. */
        expect(a.where.NOT).toBeUndefined();
        const setByOk = (x: any) => a.where.OR.some((o: any) => ('kindOfWorkSetBy' in o && o.kindOfWorkSetBy === null ? x.kindOfWorkSetBy === null : x.kindOfWorkSetBy !== null && x.kindOfWorkSetBy !== o.kindOfWorkSetBy.not));
        const r = rows.find((x) => x.id === a.where.id && x.kindOfWork === a.where.kindOfWork && setByOk(x));
        if (!r) return { count: 0 };
        writes.push(a.data);
        Object.assign(r, a.data);
        return { count: 1 };
      }),
    },
    $disconnect: jest.fn(),
  };
  return { prisma, writes, rows };
}

describe('giving each existing check-in its kind of work', () => {
  it('gives each family of work the right kind, and an unclear one none', async () => {
    const { prisma } = db(FIXTURES.map((f) => ({ ...f })));
    const plan = await whatWouldChange(prisma, read);
    expect(plan.toGive.map((c) => [c.groundId, c.kind])).toEqual([['sales', 'sales org'], ['eng', 'engineering release'], ['law', 'a law firm matter']]);
    for (const c of plan.toGive) expect(KINDS_OF_WORK).toContain(c.kind);
    expect(plan.left.map((l) => [l.groundId, l.why])).toEqual([['unclear', NOT_CLEAR], ['empty', NO_WORDS], ['name-only', NO_DESCRIPTION], ['hire', THE_SITUATION_DECIDES]]);
    expect(plan.alreadyHad).toBe(2);
  });

  it('never reads over a kind that is held or that the lead chose', async () => {
    const asked = jest.fn(read);
    const { prisma } = db(FIXTURES.map((f) => ({ ...f })));
    await whatWouldChange(prisma, asked);
    expect(asked).toHaveBeenCalledTimes(4);
    expect(asked.mock.calls.some(([w]) => w.includes('New sales hire'))).toBe(false);
    expect(asked.mock.calls.some(([w]) => w.includes('Sales deals.'))).toBe(false);
  });

  it('a model that cannot be reached leaves the check-in without a kind and says so', async () => {
    const { prisma } = db([{ ...FIXTURES[0] }]);
    const plan = await whatWouldChange(prisma, async () => { throw new Error('busy'); });
    expect(plan.toGive).toEqual([]);
    expect(plan.left[0].why).toBe(COULD_NOT_READ);
  });

  it('writes only the kind and who set it, and a second run changes nothing more', async () => {
    const { prisma, writes, rows } = db(FIXTURES.map((f) => ({ ...f })));
    const before = JSON.parse(JSON.stringify(rows));
    const plan = await whatWouldChange(prisma, read);
    expect(await writeTheKinds(prisma, plan)).toBe(3);
    expect(writes.every((w) => Object.keys(w).sort().join() === 'kindOfWork,kindOfWorkSetBy' && w.kindOfWorkSetBy === 'read')).toBe(true);
    for (const [i, r] of rows.entries()) {
      const { kindOfWork, kindOfWorkSetBy, ...rest } = r;
      const { kindOfWork: _a, kindOfWorkSetBy: _b, ...was } = before[i];
      expect(rest).toEqual(was);
    }
    const again = await whatWouldChange(prisma, read);
    expect(again.toGive).toEqual([]);
    expect(await writeTheKinds(prisma, again)).toBe(0);
    expect(writes).toHaveLength(3);
  });

  it('does not overwrite a kind the lead chose between the read and the write', async () => {
    const { prisma, rows } = db([{ ...FIXTURES[0] }]);
    const plan = await whatWouldChange(prisma, read);
    rows[0].kindOfWork = 'asset loans'; rows[0].kindOfWorkSetBy = 'lead';
    expect(await writeTheKinds(prisma, plan)).toBe(0);
    expect(rows[0].kindOfWork).toBe('asset loans');
  });

  it('asks the model once per set of words and gives the same answer after', async () => {
    const asked = jest.fn(read);
    const store: Record<string, string> = {};
    const cached = remembered(asked, store, () => undefined);
    const words = 'What the lead called it: Sales team, Q3';
    expect(await cached(words)).toBe('sales org');
    expect(await cached(words)).toBe('sales org');
    expect(asked).toHaveBeenCalledTimes(1);
    expect(Object.keys(store)).toEqual([theCacheKey(words)]);
  });

  it('reads in plain sentences', async () => {
    const { prisma } = db(FIXTURES.map((f) => ({ ...f })));
    const lines = whatWouldChangeSays(await whatWouldChange(prisma, read));
    expect(lines[0]).toBe('9 check-ins were read. 2 already have a kind of work and are left as they are.');
    expect(lines[1]).toBe('3 check-ins would be given a kind of work:');
    expect(lines.join('\n')).toContain('4 check-ins cannot be placed confidently, so they get no kind and keep the board the situation gives.');
  });
});

describe('the guard, like the other release scripts', () => {
  const local = 'postgresql://localhost:5432/gw_x';
  const hosted = 'postgresql://u:p@db.example.com:5432/gw';
  const go = async (url: string, args: string[], typed: string | null = null) => {
    const { prisma, writes } = db(FIXTURES.map((f) => ({ ...f })));
    const said: string[] = [];
    const r = await run({ url, args, prismaFor: () => prisma, readFor: () => read, ask: async () => typed, say: (l) => said.push(l) });
    return { r, writes, said };
  };

  it('is a dry run unless --write is given', async () => {
    const a = await go(local, []);
    expect(a.r.wrote).toBe(false);
    expect(a.writes).toEqual([]);
    expect(a.said[a.said.length - 1]).toBe('This was a dry run. Nothing was written.');
    expect((await go(local, ['--write'])).writes).toHaveLength(3);
    expect((await go(local, ['--write', '--dry-run'])).writes).toHaveLength(0);
  });

  it('refuses a hosted database without --hosted-database, and needs the host typed back to write', async () => {
    expect(whatThisRunMayDo(hosted, [])).toMatchObject({ refused: true });
    expect((await go(hosted, ['--write'])).writes).toEqual([]);
    expect((await go(hosted, ['--hosted-database'])).writes).toEqual([]);
    expect((await go(hosted, ['--hosted-database', '--write'], null)).writes).toEqual([]);
    expect((await go(hosted, ['--hosted-database', '--write'], 'other.example.com')).writes).toEqual([]);
    expect((await go(hosted, ['--hosted-database', '--write'], 'db.example.com')).writes).toHaveLength(3);
  });
});
