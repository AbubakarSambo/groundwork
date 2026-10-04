import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';

/**
 * RUN-29, LOANS: the board asked "That call has been open a while - what is the decision, and when?", a probe written for a founder, while
 * the report it sits beside asked about the period before the first repayment. The board's question is the report's, for the lead, a
 * participant and an admin, in plain words.
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
      centralQuestion: 'For a new loan recipient, what should the period be between receiving their asset and their first repayment being due, and what makes that period the right one?', engagement: {}, findings: [], leadershipGaps: [],
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


const REPORTS_QUESTION = 'For a new loan recipient, what should the period be between receiving their asset and their first repayment being due, and what makes that period the right one?';

describe('the board asks the question the report asks', () => {
  it.each([
    ['the lead', 'u-lead', { role: 'MEMBER', organizationId: 'org-1' }],
    ['a participant', 'u-miriam', { role: 'MEMBER', organizationId: 'org-1' }],
    ['an admin of the organisation', 'u-admin', { role: 'ADMIN', organizationId: 'org-1' }],
  ])('%s reads the report\'s central question on the board', async (_who, userId, viewer) => {
    for (const peers of [true, false]) {
      const b = await openTheBoard(aGround({ scenario: GroundScenario.OKR_ALIGNMENT, peers, sharedAs: null }), userId as string, viewer as any);
      expect(b.divergence.centralQuestion).toBe(REPORTS_QUESTION);
    }
  });

  it('without a report question yet, no question is made of a role probe with a hyphen in it', async () => {
    const g = aGround({ scenario: GroundScenario.OKR_ALIGNMENT, peers: true, sharedAs: null });
    (g.report as any).centralQuestion = null;
    const b = await openTheBoard(g, 'u-miriam', { role: 'MEMBER', organizationId: 'org-1' });
    expect(String(b.divergence.centralQuestion ?? '')).not.toMatch(/ - /);
  });
});
