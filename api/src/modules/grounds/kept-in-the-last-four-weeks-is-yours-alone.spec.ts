import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { ForbiddenException } from '@nestjs/common';
import { keptLately, keptLatelySays } from './your-board';
import { YourBoardService } from './your-board.service';

/**
 * "KEPT 11 OF 20 IN THE LAST 4 WEEKS" (week 9). Counted from what was settled, done or not done,
 * made in the 28 days before today; open ones count in neither number. Served only to the person, on
 * their own You board (the more private option, for Hafsah to confirm): each person's load across
 * check-ins is private under CLAUDE.md, so a lead, a colleague and an admin get it nowhere.
 */

const NOW = new Date('2026-09-29T12:00:00Z');
const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000);

describe('the arithmetic', () => {
  it('counts what was settled in the last 28 days: kept over kept and not kept', () => {
    const rows = [
      ...Array.from({ length: 11 }, () => ({ status: 'DONE', createdAt: ago(5) })),
      ...Array.from({ length: 9 }, () => ({ status: 'NOT_DONE', createdAt: ago(20) })),
    ];
    expect(keptLately(rows, NOW)).toMatchObject({ kept: 11, of: 20 });
  });
  it('open, dropped, older than four weeks and not yet made are left out of both numbers', () => {
    const rows = [
      { status: 'DONE', createdAt: ago(27.9) },
      { status: 'NOT_DONE', createdAt: ago(1) },
      { status: 'UNKNOWN', createdAt: ago(1) },
      { status: 'DROPPED', createdAt: ago(1) },
      { status: 'DONE', createdAt: ago(28.1) },
      { status: 'NOT_DONE', createdAt: ago(60) },
      { status: 'DONE', createdAt: ago(-1) },
      { status: 'DONE', createdAt: null },
    ];
    expect(keptLately(rows, NOW)).toMatchObject({ kept: 1, of: 2 });
  });
  it('nothing settled is no sentence at all, not "none of none"', () => {
    expect(keptLately([{ status: 'UNKNOWN', createdAt: ago(1) }], NOW)).toBeNull();
    expect(keptLately([], NOW)).toBeNull();
  });
});

/*
 * WHEN IT WAS SETTLED, AND LEAVE WHILE IT WAS OPEN (1 October). Week 9 added `settledAt` so this count
 * reads the day a promise was settled, and both ways of settling stamp it, but the count read the day
 * it was made. And a promise made on the Friday before a week of leave, missed while away and settled
 * "not done" on return, was counted as a miss, because only the day it was made was checked against
 * the leave (week 23: nothing counts against them).
 */
describe('read by the day it was settled, with leave over the whole time it was open', () => {
  it('counts by the day it was settled, and by the day it was made where no day of settling is stored', () => {
    expect(keptLately([{ status: 'NOT_DONE', createdAt: ago(35), settledAt: ago(6) }], NOW)).toMatchObject({ kept: 0, of: 1 });
    expect(keptLately([{ status: 'DONE', createdAt: ago(20), settledAt: ago(30) }], NOW)).toBeNull();
    expect(keptLately([{ status: 'DONE', createdAt: ago(20) }], NOW)).toMatchObject({ kept: 1, of: 1 });
  });
  it('a miss is not counted when leave fell between the day it was made and the day it was settled', () => {
    const leave = [{ from: ago(14), to: ago(9) }];
    const rows = [
      { status: 'NOT_DONE', createdAt: ago(17), settledAt: ago(7) },
      { status: 'NOT_DONE', createdAt: ago(25), settledAt: ago(20) },
      { status: 'DONE', createdAt: ago(17), settledAt: ago(7) },
    ];
    expect(keptLately(rows, NOW, leave)).toMatchObject({ kept: 1, of: 2 });
    expect(keptLately(rows, NOW)).toMatchObject({ kept: 1, of: 3 });
  });
});

describe('the sentence, in the prototype’s words, all in words or all in figures', () => {
  it.each([
    [11, 20, 'In the last 4 weeks, you kept 11 of your 20 commitments.'],
    [9, 10, 'In the last four weeks, you kept nine of your ten commitments.'],
    [3, 12, 'In the last 4 weeks, you kept 3 of your 12 commitments.'],
    [0, 3, 'In the last four weeks, you kept none of your three commitments.'],
    [3, 3, 'In the last four weeks, you kept all three of your commitments.'],
    [14, 14, 'In the last 4 weeks, you kept all 14 of your commitments.'],
    [1, 1, 'In the last four weeks, you kept your one commitment.'],
    [0, 1, 'In the last four weeks, you did not keep your one commitment.'],
    /* The reviewer read "you kept all two of your commitments". */
    [2, 2, 'In the last four weeks, you kept both of your commitments.'],
    [1, 2, 'In the last four weeks, you kept one of your two commitments.'],
    [0, 2, 'In the last four weeks, you did not keep either of your two commitments.'],
  ])('%i of %i', (kept, of, says) => {
    expect(keptLatelySays(kept, of)).toBe(says);
  });
  it('never "all two", and every small number reads as English', () => {
    for (let of = 1; of <= 10; of++) for (let kept = 0; kept <= of; kept++) {
      const says = keptLatelySays(kept, of);
      expect(says).not.toMatch(/all (one|two)\b|none of your (one|two)\b/);
      expect(says).toMatch(/^In the last four weeks, you .*commitments?\.$/);
    }
  });
  it('never a score, a percentage or a label', () => {
    for (const [k, o] of [[11, 20], [0, 3], [1, 1]]) expect(keptLatelySays(k, o)).not.toMatch(/%|score|rating|\bPIP\b|at risk|\bexit\b|below|poor|good/i);
  });
});

/* One check-in: Wairimu runs it, Daniel and Brian take part, Grace is an admin who is not in it. */
const ORG = 'org-baridi';
const people = {
  daniel: { userId: 'u-daniel', email: 'daniel@baridi.test', role: 'MEMBER' },
  wairimu: { userId: 'u-wairimu', email: 'wairimu@baridi.test', role: 'LEAD' },
  brian: { userId: 'u-brian', email: 'brian@baridi.test', role: 'MEMBER' },
  grace: { userId: 'u-grace', email: 'grace@baridi.test', role: 'ADMIN' },
};
const sales = {
  id: 'g-sales', label: 'Sales team, Q3', status: 'ACTIVE', organizationId: ORG, initiatorId: 'u-wairimu', closedAt: null, resolvedAt: null,
  participants: [{ id: 'p-wairimu', userId: 'u-wairimu' }, { id: 'p-daniel', userId: 'u-daniel' }, { id: 'p-brian', userId: 'u-brian' }],
  checkIns: [],
};
const recent = new Date(Date.now() - 5 * 86_400_000);
const DANIELS = [
  ...Array.from({ length: 11 }, (_, i) => ({ id: `k-d${i}`, groundId: 'g-sales', participantId: 'p-daniel', text: `Call customer ${i}`, whenSaid: null, status: 'DONE', settledBy: i === 0 ? 'PROVEN' : 'SAID', createdAt: recent })),
  ...Array.from({ length: 9 }, (_, i) => ({ id: `k-n${i}`, groundId: 'g-sales', participantId: 'p-daniel', text: `Visit shop ${i}`, whenSaid: null, status: 'NOT_DONE', settledBy: 'SAID', createdAt: recent })),
  { id: 'k-open', groundId: 'g-sales', participantId: 'p-daniel', text: 'Visit Green Mart', whenSaid: 'Thursday', status: 'UNKNOWN', settledBy: null, createdAt: recent },
];
const matches = (row: any, where: any) => Object.entries(where ?? {}).every(([k, v]: [string, any]) =>
  v && typeof v === 'object' && 'in' in v ? v.in.includes(row[k]) : v && typeof v === 'object' ? true : row[k] === v);

function setup() {
  const none = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) };
  const prisma: any = {
    /* The You board reads the person's own patterns (29 September); none here. */
    patternDetection: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    personObjective: none, groundObjective: none, coachingState: none, person: none, todo: none, groundDependency: none,
    groundCommitment: { findMany: jest.fn(async ({ where }: any) => DANIELS.filter((r) => matches(r, where))) },
  };
  const grounds: any = { list: jest.fn(async (_o: string, userId: string, _e: string, role: string) => (role === 'ADMIN' || sales.participants.some((p) => p.userId === userId) ? [sales] : [])) };
  const svc = new YourBoardService(prisma, grounds);
  return (who: keyof typeof people, askedFor?: string) => svc.forReader({ ...people[who], organizationId: ORG }, askedFor);
}

const A_COUNT = /kept \S+ of|of your \S+ commitments|kept all|kept none|kept your one|\b11 of\b/i;

describe('served to Daniel alone, on his own You board', () => {
  it('Daniel reads it, and each settled line carries how it is known', async () => {
    const b = await setup()('daniel');
    expect(b.keptLately).toEqual({ kept: 11, of: 20, says: 'In the last 4 weeks, you kept 11 of your 20 commitments.' });
    expect(b.saidYoudDo.find((s) => s.id === 'k-d0')?.settledBy).toBe('proven');
    expect(b.saidYoudDo.find((s) => s.id === 'k-n0')?.settledBy).toBe('said');
    expect(b.saidYoudDo.find((s) => s.id === 'k-open')).not.toHaveProperty('settledBy');
  });

  it.each(['wairimu', 'brian', 'grace'] as const)('%s, asking for Daniel’s, is refused', async (who) => {
    await expect(setup()(who, 'u-daniel')).rejects.toThrow(ForbiddenException);
  });

  it.each(['wairimu', 'brian', 'grace'] as const)('%s’s own board carries no count of Daniel’s, though the list carries his place', async (who) => {
    const b = await setup()(who);
    expect(b.keptLately).toBeNull();
    expect(JSON.stringify(b)).not.toMatch(A_COUNT);
  });
});

describe('and nowhere else', () => {
  it('nothing outside the You board works out or serves the count', () => {
    const root = join(__dirname, '..', '..');
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (p.endsWith('.ts') && !p.endsWith('.spec.ts') && /keptLately|keptLatelySays/.test(readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''))) found.push(p.slice(root.length + 1));
      }
    };
    walk(root);
    expect(found.sort()).toEqual(['modules/grounds/your-board.ts']);
  });
});
