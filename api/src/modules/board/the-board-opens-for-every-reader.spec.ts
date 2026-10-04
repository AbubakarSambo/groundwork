import { NotFoundException } from '@nestjs/common';
import { EVALUATION_SCENARIOS } from '../reports/is-this-an-evaluation-check-in';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';

/**
 * THE BOARD OPENS FOR EVERY READER, ON EVERY KIND OF CHECK-IN. Reported 27 September 2026: the
 * board crashed for participants when people see only themselves.
 *
 * The cause, reproduced here first: on a delivery check-in with people hidden from each other, the
 * wall handed the coverage section, which is `{ scope, reads }` and not a list, to a filter for
 * lists, and it threw "rows.filter is not a function". Every delivery situation (a new project, a
 * handover, a new cofounder, objectives, a workplan, a board strategy) with peers hidden was an
 * error for every participant, whatever else was on it.
 *
 * So this opens the board through `BoardService.get` for every situation, with people shown, hidden
 * and never set, as the lead, a participant, a second participant, an admin of the organisation who
 * is not in it, and a participant who joined from another organisation, on a report shared named
 * and one shared without names, and with no report yet, with one person, with a handoff between two
 * of them, and with somebody who has no name. None of it may throw. The one refusal is somebody who
 * is in neither the check-in nor the organisation, and that is a refusal, not a crash.
 */

const LEAD = {
  id: 'p-lead', userId: 'u-lead', partyType: PartyType.INITIATOR, email: 'l@x.test',
  roleAsDescribed: 'runs it', nameGiven: null, organisationGiven: null, managingOnly: true,
  createdAt: new Date('2026-09-01T09:00:00Z'), user: { firstName: 'Wairimu', lastName: 'Kamau' },
};
const MIRIAM = {
  id: 'p-miriam', userId: 'u-miriam', partyType: PartyType.PARTICIPANT, email: 'm@x.test',
  roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null, managingOnly: false,
  createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: 'Miriam', lastName: 'Wanjiku' },
};
const AISHA = {
  id: 'p-aisha', userId: 'u-aisha', partyType: PartyType.PARTICIPANT, email: 'a@x.test',
  roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null, managingOnly: false,
  createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: 'Aisha', lastName: 'Otieno' },
};
const GUEST = {
  id: 'p-guest', userId: 'u-guest', partyType: PartyType.PARTICIPANT, email: 'g@elsewhere.test',
  roleAsDescribed: 'the supplier', nameGiven: null, organisationGiven: 'Harbor Foods', managingOnly: false,
  createdAt: new Date('2026-09-01T11:00:00Z'), user: { firstName: 'Kofi', lastName: 'Asante' },
};

const checkInsFor = (people: any[]) => [1, 2].flatMap((n) => people.filter((p) => !p.managingOnly).map((p) => ({
  id: `${p.id}-${n}`, participantId: p.id, sessionNumber: n, status: 'COMPLETED', isSetup: false,
  completedAt: new Date(`2026-09-0${n + 2}T16:00:00Z`), specificityLevel: 'specific', specificityDimensions: {},
})));

function aGround(o: { scenario: GroundScenario; peers: boolean | null; sharedAs: string | null }) {
  return {
    id: 'g1', scenario: o.scenario, mode: GroundMode.SHARED,
    initiatorId: 'u-lead', createdByUserId: 'u-lead', organizationId: 'org-1',
    peopleWorkTogether: true, peersVisibleToEachOther: o.peers, timelineDays: 90, cadence: 'WEEKLY',
    whoSeesTargets: 'THEIR_OWN', label: 'Sales team, Q3',
    participants: [LEAD, MIRIAM, AISHA, GUEST],
    report: {
      releasedAt: new Date('2026-09-04T17:00:00Z'), sharedAs: o.sharedAs, theOpening: null, networkPicture: null,
      sharedPicture: 'Everybody has checked in twice.', agreements: ['The price list is right.'],
      divergences: [{ topic: 'Whether a range is a budget', positions: [
        { participantLabel: 'Participant A', view: 'A range is a budget.' },
        { participantLabel: 'Participant B', view: 'Only a figure is a budget.' },
      ] }],
      centralQuestion: 'Is a range a budget?', engagement: {}, findings: [], leadershipGaps: [],
      createdAt: new Date('2026-09-02T09:00:00Z'), updatedAt: new Date('2026-09-04T17:00:00Z'),
    },
    objectives: [
      { id: 'o1', name: 'Sales', target: 25, count: 21, prevCount: 20, ownerParticipantId: null, sortOrder: 0, assumes: [], createdAt: new Date('2026-09-01'), updatedAt: new Date('2026-09-02') },
      { id: 'o2', name: 'Aisha’s sales', target: 5, count: 4, prevCount: 4, ownerParticipantId: 'p-aisha', sortOrder: 1, assumes: [], createdAt: new Date('2026-09-01'), updatedAt: new Date('2026-09-02') },
    ],
    dependencies: [] as any[],
    poll: null,
  };
}

type Variant = [string, (g: any) => any];
const VARIANTS: Variant[] = [
  ['everything on it', (g) => g],
  ['no report yet', (g) => ({ ...g, report: null })],
  ['one person besides the lead', (g) => ({ ...g, participants: [LEAD, MIRIAM] })],
  ['a handoff between two of them, and one outside', (g) => ({ ...g, dependencies: [
    { id: 'd1', what: 'the pricing sheet', fromParticipantId: 'p-miriam', onParticipantId: 'p-aisha', onLabel: null, status: 'WAITING', createdAt: new Date('2026-09-03'), updatedAt: new Date('2026-09-03'), escalatedAt: null, blockerKind: null, then: null },
    { id: 'd2', what: 'the approvals', fromParticipantId: 'p-aisha', onParticipantId: null, onLabel: 'the credit committee', status: 'BLOCKING', createdAt: new Date('2026-09-03'), updatedAt: new Date('2026-09-03'), escalatedAt: null, blockerKind: null, then: null },
  ] })],
  ['somebody with no name', (g) => ({ ...g, participants: g.participants.map((p: any) => (p.id === 'p-aisha' ? { ...p, user: null, nameGiven: null } : p)) })],
];

/* Who is reading, and what the database says about them. */
const READERS: [string, string, { role: string; organizationId: string }][] = [
  ['the lead', 'u-lead', { role: 'MEMBER', organizationId: 'org-1' }],
  ['a participant', 'u-miriam', { role: 'MEMBER', organizationId: 'org-1' }],
  ['a second participant', 'u-aisha', { role: 'MEMBER', organizationId: 'org-1' }],
  ['an admin who is not in it', 'u-admin', { role: 'ADMIN', organizationId: 'org-1' }],
  ['a participant from another organisation', 'u-guest', { role: 'ADMIN', organizationId: 'org-2' }],
];

function openTheBoard(ground: any, userId: string, viewer: { role: string; organizationId: string }) {
  const reads = {
    findMany: jest.fn(async () => []),
    findFirst: jest.fn(async () => null),
    findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0),
    aggregate: jest.fn(async () => ({ _max: { sessionNumber: 2 } })),
  };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own });
  const checkIns = checkInsFor(ground.participants);
  const prisma: any = new Proxy({
    ground: model({ findUnique: jest.fn(async () => structuredClone({ ...ground, checkIns })) }),
    user: model({ findUnique: jest.fn(async () => viewer) }),
    checkIn: model({ findMany: jest.fn(async () => structuredClone(checkIns)) }),
    recordEntry: model({ findMany: jest.fn(async () => ground.participants.filter((p: any) => !p.managingOnly).map((p: any) => ({
      participantId: p.id, type: 'PROGRESS', text: `${p.id} sold four units to Green Mart.`, recallBased: false, anchoredOrigin: null, dimensionThreadKey: null, checkIn: { sessionNumber: 2 },
    }))) }),
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
  const svc = new BoardService(prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, Object.create(ReportsService.prototype) as ReportsService);
  return svc.get('g1', userId, undefined) as Promise<any>;
}

const SCENARIOS = Object.values(GroundScenario) as GroundScenario[];

describe('the board opens for every reader, on every kind of check-in', () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario}: never throws, for anybody, with people shown, hidden or never set`, async () => {
      const failures: string[] = [];
      for (const peers of [true, false, null]) {
        for (const sharedAs of [null, 'ANONYMOUS']) {
          for (const [variant, vary] of VARIANTS) {
            for (const [reader, userId, viewer] of READERS) {
              const ground = vary(aGround({ scenario, peers, sharedAs }));
              /* Somebody this variant took out of the check-in is refused, which is right and is tested below. */
              const inIt = ground.participants.some((p: any) => p.userId === userId);
              if (!inIt && !(viewer.role === 'ADMIN' && viewer.organizationId === 'org-1')) continue;
              /* Changed with request 78: an admin who is not in a performance plan, a promotion or a renewal is
                 refused its board (proved in an-admin-does-not-read-an-evaluation-check-in-in-grounds-or-on-the-board). */
              /* And with decision 75, item 25: a probation (NEW_HIRE) is one of them, from the one list. */
              if (!inIt && EVALUATION_SCENARIOS.includes(scenario)) continue;
              try {
                const b = await openTheBoard(ground, userId, viewer);
                if (typeof b?.renders !== 'boolean') failures.push(`${reader}, peers ${peers}, ${variant}: no board came back`);
              } catch (e: any) {
                failures.push(`${reader}, peers ${peers}, shared ${sharedAs ?? 'named'}, ${variant}: ${e?.message}`);
              }
            }
          }
        }
      }
      expect(failures).toEqual([]);
    });
  }

  it('somebody in neither the check-in nor the organisation is refused, and it is a refusal', async () => {
    await expect(openTheBoard(aGround({ scenario: GroundScenario.OKR_ALIGNMENT, peers: false, sharedAs: null }), 'u-stranger', { role: 'MEMBER', organizationId: 'org-9' }))
      .rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('and where people see only themselves, the coverage section keeps its shape and holds only theirs', () => {
  it('a participant on a delivery check-in reads the coverage reads about themselves and nobody else', async () => {
    const b = await openTheBoard(aGround({ scenario: GroundScenario.OKR_ALIGNMENT, peers: false, sharedAs: null }), 'u-miriam', { role: 'MEMBER', organizationId: 'org-1' });
    expect(b.whyYouOnlySeeYourself).toBeTruthy();
    if (b.coverage) {
      expect(Array.isArray(b.coverage.reads)).toBe(true);
      expect(b.coverage.reads.every((r: any) => r.participantId === 'p-miriam')).toBe(true);
    }
    for (const row of b.contribution ?? []) expect(row.participantId).toBe('p-miriam');
    for (const row of b.checkInGrid?.rows ?? []) expect(row.participantId).toBe('p-miriam');
  });

  it('while the lead of the same check-in reads everybody', async () => {
    const b = await openTheBoard(aGround({ scenario: GroundScenario.OKR_ALIGNMENT, peers: false, sharedAs: null }), 'u-lead', { role: 'MEMBER', organizationId: 'org-1' });
    expect(b.whyYouOnlySeeYourself).toBeUndefined();
    expect((b.checkInGrid?.rows ?? []).length).toBeGreaterThan(1);
  });
});

/*
 * AND WHERE PEOPLE SEE ONLY THEMSELVES, NO COLLEAGUE IS NAMED TO A PARTICIPANT, ANYWHERE ON THE BOARD.
 *
 * Found on 27 September 2026: the board's own list of people carried every colleague's name to a
 * participant on a check-in whose whole rule is that people give their accounts without seeing each
 * other, and a handoff named whoever was waiting on the reader (screens request 19). So the whole
 * served board is searched, as each participant, for every other participant's first name, last
 * name, address and role, on every situation where the one rule (peersAreNamedOn) hides them.
 * The reader's own name and the lead's are theirs to read; the lead and an admin still read everyone.
 */
describe('where people see only themselves, a participant reads no colleague’s name, address or role', () => {
  const { peersAreNamedOn } = require('../reports/peers-are-named');
  const ROLES: Record<string, string> = { 'p-miriam': 'Key account manager for Nairobi', 'p-aisha': 'Head of modern trade', 'p-guest': 'Harbor Foods supplier liaison' };
  const withEverything = (g: any) => ({
    ...g,
    participants: g.participants.map((p: any) => (ROLES[p.id] ? { ...p, roleAsDescribed: ROLES[p.id] } : p)),
    dependencies: [
      { id: 'd1', what: 'the pricing sheet', fromParticipantId: 'p-miriam', onParticipantId: 'p-aisha', onLabel: null, status: 'WAITING', createdAt: new Date('2026-09-03'), updatedAt: new Date('2026-09-03'), escalatedAt: null, blockerKind: null, then: null },
      { id: 'd2', what: 'the stock count', fromParticipantId: 'p-aisha', onParticipantId: 'p-miriam', onLabel: null, status: 'WAITING', createdAt: new Date('2026-09-03'), updatedAt: new Date('2026-09-03'), escalatedAt: null, blockerKind: null, then: null },
      { id: 'd3', what: 'the delivery slots', fromParticipantId: 'p-guest', onParticipantId: 'p-aisha', onLabel: null, status: 'BLOCKING', createdAt: new Date('2026-09-03'), updatedAt: new Date('2026-09-03'), escalatedAt: null, blockerKind: null, then: null },
    ],
    poll: { id: 'poll1', question: 'When can everybody meet?', options: [{ id: 'o1', label: 'Tuesday', whoIds: ['p-miriam', 'p-aisha', 'p-guest'] }] },
  });
  const person = (id: string) => [LEAD, MIRIAM, AISHA, GUEST].find((p) => p.id === id)!;
  const giveaways = (id: string) => {
    const p: any = person(id);
    return [p.user.firstName, p.user.lastName, p.email, ROLES[id], p.organisationGiven].filter(Boolean) as string[];
  };
  const READING: [string, string, string[]][] = [
    ['Miriam', 'u-miriam', ['p-aisha', 'p-guest']],
    ['Aisha', 'u-aisha', ['p-miriam', 'p-guest']],
    ['Kofi, from another organisation', 'u-guest', ['p-miriam', 'p-aisha']],
  ];

  for (const scenario of SCENARIOS) {
    for (const peers of [false, null]) {
      if (peersAreNamedOn({ scenario, peersVisibleToEachOther: peers })) continue;
      it(`${scenario}, peers ${peers}: nothing on the board names a colleague`, async () => {
        const found: string[] = [];
        for (const sharedAs of [null, 'ANONYMOUS']) {
          for (const [reader, userId, colleagues] of READING) {
            const viewer = userId === 'u-guest' ? { role: 'ADMIN', organizationId: 'org-2' } : { role: 'MEMBER', organizationId: 'org-1' };
            const served = JSON.stringify(await openTheBoard(withEverything(aGround({ scenario, peers, sharedAs })), userId, viewer));
            for (const c of colleagues) for (const word of giveaways(c)) {
              /* Case matters: the ids are "p-miriam", and an id is not a name anybody reads. */
              if (new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(served)) found.push(`${reader} reads "${word}"`);
            }
          }
        }
        expect(found).toEqual([]);
      });
    }
  }

  it('the reader still reads their own name and the lead’s, and the lead reads everybody', async () => {
    const g = withEverything(aGround({ scenario: GroundScenario.PIP, peers: null, sharedAs: null }));
    const mine = JSON.stringify(await openTheBoard(g, 'u-miriam', { role: 'MEMBER', organizationId: 'org-1' }));
    expect(mine).toContain('Miriam');
    expect(mine).toContain('Wairimu');
    const leads = JSON.stringify(await openTheBoard(g, 'u-lead', { role: 'MEMBER', organizationId: 'org-1' }));
    for (const name of ['Miriam', 'Aisha', 'Kofi']) expect(leads).toContain(name);
    /* Changed with request 78: an admin who is not in a performance plan is refused its board. */
    await expect(openTheBoard(g, 'u-admin', { role: 'ADMIN', organizationId: 'org-1' })).rejects.toBeInstanceOf(NotFoundException);
    const team = withEverything(aGround({ scenario: GroundScenario.OKR_ALIGNMENT, peers: null, sharedAs: null }));
    const admins = JSON.stringify(await openTheBoard(team, 'u-admin', { role: 'ADMIN', organizationId: 'org-1' }));
    for (const name of ['Miriam', 'Aisha', 'Kofi']) expect(admins).toContain(name);
  });
});

