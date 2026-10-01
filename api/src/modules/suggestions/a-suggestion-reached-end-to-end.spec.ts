import { SuggestionsService } from './suggestions.service';
import { SUGGESTION_THRESHOLDS_KEY } from './thresholds';

/**
 * WEEK 10, END TO END: a threshold is set, the record crosses it, the engine reaches a suggestion,
 * and each reader is served what decision 53 says they may read.
 *
 * Atlas Logistics. Wairimu runs "Tobi, the next few weeks", with Tobi in it. Miriam is a colleague
 * on a different check-in Tobi is not part of. Grace is an admin.
 */
const ORG = 'org-atlas';
const people = {
  wairimu: { userId: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' },
  tobi: { userId: 'u-tobi', firstName: 'Tobi', role: 'MEMBER' },
  miriam: { userId: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' },
  grace: { userId: 'u-grace', firstName: 'Grace', role: 'ADMIN' },
};
type Who = keyof typeof people;

const party = (id: string, who: Who, partyType: string, at: number) => ({
  id, userId: people[who].userId, partyType, roleAsDescribed: null, email: `${who}@atlas.test`,
  createdAt: new Date(2026, 8, at),
  user: { firstName: people[who].firstName, lastName: 'X', email: `${who}@atlas.test` },
});

const ground = {
  id: 'g-tobi', label: 'Tobi, the next few weeks', organizationId: ORG, initiatorId: 'u-wairimu',
  scenario: 'PIP', peersVisibleToEachOther: null,
  participants: [party('p-w', 'wairimu', 'INITIATOR', 1), party('p-t', 'tobi', 'PARTICIPANT', 2)],
};

function setup(thresholdRow: any) {
  const suggestions: any[] = [];
  let n = 0;
  const matches = (row: any, where: any): boolean =>
    Object.entries(where ?? {}).every(([k, v]: [string, any]) => {
      if (k === 'about') {
        const p = ground.participants.find((x: any) => x.id === row.aboutParticipantId);
        return p?.userId === v.userId;
      }
      return (row[k] ?? null) === (v ?? null);
    });
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ground) },
    groundParticipant: {
      findFirst: jest.fn(async ({ where }: any) => ground.participants.find((p: any) => p.id === where.id) ?? null),
    },
    organizationMembership: {
      findUnique: jest.fn(async ({ where }: any) => {
        const who = Object.values(people).find((p) => p.userId === where.userId_organizationId.userId);
        return who && where.userId_organizationId.organizationId === ORG ? { role: who.role } : null;
      }),
    },
    user: { findMany: jest.fn(async () => []) },
    platformSetting: {
      findUnique: jest.fn(async ({ where }: any) => (where.key === SUGGESTION_THRESHOLDS_KEY ? thresholdRow : null)),
    },
    suggestion: {
      create: jest.fn(async ({ data }: any) => {
        const row = {
          id: `s-${++n}`, decision: null, decisionReason: null, decidedById: null, decidedAt: null,
          theirSide: null, theirSideAt: null, appeal: null, appealedAt: null, appealOutcome: null,
          appealReason: null, appealDecidedById: null, appealDecidedAt: null, createdAt: new Date(2026, 8, 1), ...data,
        };
        suggestions.push(row);
        return { id: row.id };
      }),
      findMany: jest.fn(async ({ where }: any) => suggestions.filter((r) => matches(r, where))),
      findFirst: jest.fn(async ({ where }: any) => suggestions.find((r) => matches(r, where)) ?? null),
      findUnique: jest.fn(async ({ where }: any) => {
        const r = suggestions.find((x) => x.id === where.id);
        return r ? { ...r, about: { userId: 'u-tobi' } } : null;
      }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(suggestions.find((x) => x.id === where.id), data)),
    },
  };
  const svc = new SuggestionsService(prisma);
  const as = (who: Who) => ({ userId: people[who].userId, organizationId: ORG });
  return { svc, prisma, as, suggestions };
}

const record = { aboutParticipantId: 'p-t', aboutLabel: 'Tobi X', commitmentsSettledRecently: { kept: 2, of: 8 }, ownWords: 'Most of my time has gone on the new routes.' };

describe('week 10: no threshold, no suggestion (decision 33), and decision 61 from the start', () => {
  /*
   * CHANGED 1 October: this test read a missing row as "nothing set", which was the rule before
   * decision 61. Decision 61 sets the first threshold from the start, and the admin page already read
   * a missing row as decision 61's value, so the two disagreed on a database with no row. A missing
   * row now reads as decision 61's threshold for both; a row an admin emptied still reaches nothing.
   */
  it('reaches decision 61\'s suggestion when there is no settings row at all', async () => {
    const { svc, suggestions } = setup(null);
    const out = await svc.reachFromTheRecord('g-tobi', record);
    expect(out).not.toBeNull();
    expect(suggestions).toHaveLength(1);
  });

  it('reaches nothing when an admin has emptied the settings row', async () => {
    const { svc, suggestions } = setup({ value: {} });
    const out = await svc.reachFromTheRecord('g-tobi', record);
    expect(out).toBeNull();
    expect(suggestions).toHaveLength(0);
  });

  it('reaches nothing when the settings row holds thresholds for other verdicts only', async () => {
    const { svc, suggestions } = setup({ value: { plan: { keptBelow: 0.5, overPeriods: 4 } } });
    const out = await svc.reachFromTheRecord('g-tobi', record);
    expect(out).toBeNull();
    expect(suggestions).toHaveLength(0);
  });
});

describe('week 10: a threshold is set, the record crosses it', () => {
  const thresholdRow = { value: { support: { keptBelow: 0.6, overPeriods: 4 } } };

  it('reaches one suggestion, and does not replace it with a second one nobody has decided (confirmed item 17)', async () => {
    const { svc, suggestions } = setup(thresholdRow);
    const first = await svc.reachFromTheRecord('g-tobi', record);
    expect(first).not.toBeNull();
    expect(suggestions).toHaveLength(1);

    const second = await svc.reachFromTheRecord('g-tobi', record);
    expect(second!.id).toBe(first!.id);
    expect(suggestions).toHaveLength(1);
  });

  it('Tobi, the person, sees it first: the facts, a count, and a place to answer', async () => {
    const { svc, as } = setup(thresholdRow);
    await svc.reachFromTheRecord('g-tobi', record);
    const { suggestions } = await svc.forGround('g-tobi', as('tobi'));
    expect(suggestions).toHaveLength(1);
    const s: any = suggestions[0];
    expect(s.facts).toContain('you kept two of your eight commitments in this check-in.');
    expect(s.decision).toBeNull();
    for (const hidden of ['headline', 'why', 'verdict']) expect(s).not.toHaveProperty(hidden);
  });

  it('Wairimu, the manager, sees nothing until Tobi has had his turn, then only a plain line with no count', async () => {
    const { svc, as } = setup(thresholdRow);
    const { id } = (await svc.reachFromTheRecord('g-tobi', record))!;

    const justReached = new Date(2026, 8, 1);
    expect((await svc.forGround('g-tobi', as('wairimu'), justReached)).suggestions).toEqual([]);

    await svc.addSide(id!, as('tobi'), { side: 'Most of my time has gone on the new routes.' });
    const { suggestions } = await svc.forGround('g-tobi', as('wairimu'), justReached);
    expect(suggestions).toHaveLength(1);
    const s: any = suggestions[0];
    expect(s.headline).toBe('Groundwork suggests extra support for Tobi X');
    expect(s.theirSide).toBe('Most of my time has gone on the new routes.');
    /* Never "kept 11 of 20", or any count at all, for the manager (decision 53 over decision 43). */
    const servedText = JSON.stringify(s);
    expect(servedText).not.toMatch(/\bof 8\b/);
    expect(servedText).not.toMatch(/\bkept 2\b/);
  });

  it('Miriam, a colleague not in this check-in, reads nothing about Tobi', async () => {
    const { svc, as } = setup(thresholdRow);
    await svc.reachFromTheRecord('g-tobi', record);
    await expect(svc.forGround('g-tobi', as('miriam'))).rejects.toThrow();
  });

  it('Grace, an admin, reads it only once appealed, and never a count (decision 5)', async () => {
    const { svc, as } = setup(thresholdRow);
    const { id } = (await svc.reachFromTheRecord('g-tobi', record))!;
    expect((await svc.forGround('g-tobi', as('grace'))).suggestions).toEqual([]);

    await svc.decide(id!, as('wairimu'), { decision: 'Extra support agreed.', reasons: 'The routes have taken more time than planned.' });
    await svc.appeal(id!, as('tobi'), { why: 'The new routes were assigned to me.' });

    const { suggestions } = await svc.forGround('g-tobi', as('grace'));
    expect(suggestions).toHaveLength(1);
    const s: any = suggestions[0];
    expect(s.headline).toBe('Groundwork suggests extra support for Tobi X');
    const servedText = JSON.stringify(s);
    expect(servedText).not.toMatch(/\bof 8\b/);
    expect(servedText).not.toMatch(/\bkept 2\b/);
  });
});
