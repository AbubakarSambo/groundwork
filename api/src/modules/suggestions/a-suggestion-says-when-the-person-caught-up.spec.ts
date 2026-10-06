import { SuggestionsService } from './suggestions.service';
import { labelsForParties } from '../reports/party-labels';

/**
 * DECISION 75, ITEM 24: AN UNDECIDED SUGGESTION KEEPS ITS FACTS, AND SAYS WHEN THE PERSON CAUGHT UP.
 *
 * Wairimu runs "Kwame, first 90 days" (a probation, an evaluation check-in, item 25). Kwame kept 2 of 8 of his
 * commitments, so Groundwork suggested extra support. Before anyone decided, he kept 6 of 8. The suggestion's
 * facts stay exactly as they were reached, and every reader of it is told, in a plain sentence with the date,
 * that he has caught up since. Aisha, a colleague, reads nothing. Grace, an admin, reads it once it is appealed.
 */
const ORG = 'org1';
const party = (id: string, userId: string, type: string, first: string, day: number) => ({
  id, userId, partyType: type, roleAsDescribed: null, email: `${first.toLowerCase()}@baridi.test`, createdAt: new Date(2026, 6, day), managingOnly: false,
  user: { firstName: first, lastName: '', email: `${first.toLowerCase()}@baridi.test` },
});
const participants = [
  party('p-wairimu', 'u-wairimu', 'INITIATOR', 'Wairimu', 1),
  party('p-kwame', 'u-kwame', 'PARTICIPANT', 'Kwame', 2),
  party('p-aisha', 'u-aisha', 'PARTICIPANT', 'Aisha', 3),
];
const labels = labelsForParties(participants as any);

function world() {
  const rows: any[] = [];
  const matches = (r: any, where: any) => Object.entries(where ?? {}).every(([k, v]: [string, any]) => {
    if (k === 'about') return participants.find((p) => p.id === r.aboutParticipantId)?.userId === v.userId;
    if (v && typeof v === 'object' && 'not' in v) return r[k] !== v.not;
    return r[k] === v;
  });
  const prisma: any = {
    ground: { findUnique: jest.fn(async ({ select }: any) => ({ id: 'g1', label: 'Kwame, first 90 days', organizationId: ORG, initiatorId: 'u-wairimu', scenario: 'NEW_HIRE', peersVisibleToEachOther: null, participants, ...(select ? {} : {}) })) },
    groundParticipant: { findFirst: jest.fn(async ({ where }: any) => participants.find((p) => p.id === where.id) ?? null) },
    platformSetting: { findUnique: jest.fn(async () => null) },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => ({ role: where.userId_organizationId.userId === 'u-grace' ? 'ADMIN' : 'MEMBER' })) },
    personObjective: { findMany: jest.fn(async () => []) },
    user: { findMany: jest.fn(async () => []) },
    suggestion: {
      findFirst: jest.fn(async ({ where }: any) => rows.find((r) => matches(r, where)) ?? null),
      findMany: jest.fn(async ({ where }: any) => rows.filter((r) => matches(r, where))),
      findUnique: jest.fn(async ({ where }: any) => {
        const r = rows.find((x) => x.id === where.id);
        return r ? { ...r, about: { userId: participants.find((p) => p.id === r.aboutParticipantId)?.userId ?? null } } : null;
      }),
      create: jest.fn(async ({ data }: any) => {
        const row = {
          id: `s-${rows.length + 1}`, decision: null, decisionReason: null, decidedById: null, decidedAt: null, theirSide: null, theirSideAt: null,
          appeal: null, appealedAt: null, appealOutcome: null, appealReason: null, appealDecidedById: null, appealDecidedAt: null, caughtUpAt: null,
          createdAt: new Date('2026-09-20T09:00:00Z'), ...data,
        };
        rows.push(row);
        return { id: row.id };
      }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(rows.find((r) => r.id === where.id), data)),
    },
  };
  const svc = new SuggestionsService(prisma);
  const kwame = (kept: number, of: number) => ({
    aboutParticipantId: 'p-kwame', aboutLabel: labels.get('p-kwame')!, leadLabel: labels.get('p-wairimu')!,
    commitmentsSettledRecently: { kept, of }, ownWords: null,
  });
  return { svc, rows, kwame };
}

const NOW = new Date('2026-10-05T09:00:00Z');
const reader = (userId: string) => ({ userId, organizationId: ORG });
const FACTS = 'In the last four weeks, you kept two of your eight commitments in this check-in. When fewer than half are kept, Groundwork suggests extra help to Wairimu.';
const FOR_THE_LEAD = 'Kwame has caught up since this was suggested. Since Thursday 1 October, Kwame has kept as many of the commitments made in this check-in as Groundwork looks for.';
const FOR_KWAME = 'You have caught up since this was suggested. Since Thursday 1 October, you have kept as many of your commitments in this check-in as Groundwork looks for.';

async function caughtUpOnThe1st() {
  const w = world();
  await w.svc.reachFromTheRecord('g1', w.kwame(2, 8), new Date('2026-09-20T09:00:00Z'));
  await w.svc.reachFromTheRecord('g1', w.kwame(6, 8), new Date('2026-10-01T12:00:00Z'));
  return w;
}

describe('a suggestion nobody has decided, after Kwame caught up', () => {
  it('keeps its original facts, and stays the only suggestion', async () => {
    const w = await caughtUpOnThe1st();
    expect(w.rows).toHaveLength(1);
    /* Stored with labels, as every suggestion is; each reader is served it with names (the tests below). */
    expect(w.rows[0].factsForThem).toContain('you kept two of your eight commitments in this check-in.');
    expect(w.rows[0].caughtUpAt).toEqual(new Date('2026-10-01T12:00:00Z'));
  });

  it('Wairimu, who runs it, reads that he caught up, with the date, and the count the suggestion was reached on (decision 86)', async () => {
    const w = await caughtUpOnThe1st();
    const [s]: any[] = (await w.svc.forGround('g1', reader('u-wairimu'), NOW)).suggestions;
    expect(s.why).toBe('In the last four weeks, Kwame kept two of the eight commitments made in this check-in. That is 25%. When fewer than half are kept, Groundwork suggests extra support.');
    expect(s.caughtUp).toBe(FOR_THE_LEAD);
    expect(JSON.stringify(s)).not.toMatch(/\d+ of \d+/);
  });

  it('Kwame reads his original facts and that he caught up, as "you"', async () => {
    const w = await caughtUpOnThe1st();
    const [s]: any[] = (await w.svc.forGround('g1', reader('u-kwame'), NOW)).suggestions;
    expect(s.facts).toBe(FACTS);
    expect(s.caughtUp).toBe(FOR_KWAME);
    const [mine]: any[] = await w.svc.aboutYou(reader('u-kwame'));
    expect(mine.caughtUp).toBe(FOR_KWAME);
  });

  it('Aisha, a colleague, reads nothing about it', async () => {
    const w = await caughtUpOnThe1st();
    expect((await w.svc.forGround('g1', reader('u-aisha'), NOW)).suggestions).toEqual([]);
  });

  it('Grace, an admin, reads it once it is appealed, with the same sentence the lead read', async () => {
    const w = await caughtUpOnThe1st();
    expect((await w.svc.forGround('g1', reader('u-grace'), NOW)).suggestions).toEqual([]);
    await w.svc.decide('s-1', reader('u-wairimu'), { decision: 'Extra support for the next six weeks', reasons: 'The stock delay was not his doing.' });
    await w.svc.appeal('s-1', reader('u-kwame'), { why: 'I have caught up already.' });
    const { appeals } = await w.svc.appealsToDecide(reader('u-grace'));
    expect(appeals[0].caughtUp).toBe(FOR_THE_LEAD);
  });

  it('a suggestion where he has not caught up says nothing about it', async () => {
    const w = world();
    await w.svc.reachFromTheRecord('g1', w.kwame(2, 8), new Date('2026-09-20T09:00:00Z'));
    await w.svc.reachFromTheRecord('g1', w.kwame(3, 8), new Date('2026-10-01T12:00:00Z'));
    const [s]: any[] = (await w.svc.forGround('g1', reader('u-wairimu'), NOW)).suggestions;
    expect(s.caughtUp).toBeNull();
  });

  it('the mark comes off if he falls below the line again before anyone decides', async () => {
    const w = await caughtUpOnThe1st();
    await w.svc.reachFromTheRecord('g1', w.kwame(3, 9), new Date('2026-10-04T12:00:00Z'));
    const [s]: any[] = (await w.svc.forGround('g1', reader('u-kwame'), NOW)).suggestions;
    expect(s.caughtUp).toBeNull();
    expect(s.facts).toBe(FACTS);
  });

  it('too few settled commitments to tell changes nothing', async () => {
    const w = await caughtUpOnThe1st();
    await w.svc.reachFromTheRecord('g1', w.kwame(0, 2), new Date('2026-10-04T12:00:00Z'));
    expect(w.rows[0].caughtUpAt).toEqual(new Date('2026-10-01T12:00:00Z'));
  });

  it('once decided, the mark is never changed again', async () => {
    const w = world();
    await w.svc.reachFromTheRecord('g1', w.kwame(2, 8), new Date('2026-09-20T09:00:00Z'));
    await w.svc.decide('s-1', reader('u-wairimu'), { decision: 'Extra support', reasons: 'Stock was late.' });
    await w.svc.reachFromTheRecord('g1', w.kwame(6, 8), new Date('2026-10-01T12:00:00Z'));
    expect(w.rows[0].caughtUpAt).toBeNull();
  });
});
