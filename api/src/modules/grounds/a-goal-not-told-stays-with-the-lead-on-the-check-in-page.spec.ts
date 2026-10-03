import { GroundsService } from './grounds.service';
import { PartyType } from '@prisma/client';

/**
 * REQUEST 125, ITEM 1 (decisions 48 and 56). The board hid Tobi's target that Amina had not told him
 * about; `GET /grounds/:id` sent it to him in full under `objectives`. Read here as the lead (Amina),
 * the new hire (Tobi) and an admin who only reads, on the check-in page.
 */
const AMINA = 'u-amina';
const TOBI = 'u-tobi';
const ADMIN = 'u-admin';
const UNTOLD = 'Manage the renewal process for at least one of the clients.';
/* The lead's stored goal and the objective the engine wrote from it are in different words, as in the running product. */
const UNTOLD_AS_THE_LEAD_WROTE_IT = 'Take the renewals over from Amina.';
const TOLD = 'Lead the client conversations fully.';
const WEEK_AGO_PLUS = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

const people = () => [
  { id: 'p-amina', userId: AMINA, email: 'a@x.test', partyType: PartyType.INITIATOR, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: true, invitedAt: new Date('2026-09-01T09:00:00Z'), notifiedAt: new Date('2026-09-01T09:05:00Z'), soloArtifactAt: null, soloArtifactShared: false, createdAt: new Date('2026-09-01'), user: { firstName: 'Dr', lastName: 'Amina Bello' } },
  { id: 'p-tobi', userId: TOBI, email: 't@x.test', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: false, invitedAt: new Date('2026-09-02T09:00:00Z'), notifiedAt: new Date('2026-09-02T09:05:00Z'), soloArtifactAt: null, soloArtifactShared: false, createdAt: new Date('2026-09-02'), user: { firstName: 'Tobi', lastName: 'Adewale' } },
];
const GOALS = [
  { id: 'o1', groundId: 'g1', participantId: 'p-tobi', text: UNTOLD_AS_THE_LEAD_WROTE_IT, kind: 'GOAL', status: 'OPEN', authoredBy: 'lead', seenBySubject: false, awareness: 'NOT_TOLD', awarenessDetail: null, dueSaid: null, createdAt: WEEK_AGO_PLUS, updatedAt: WEEK_AGO_PLUS },
  { id: 'o2', groundId: 'g1', participantId: 'p-tobi', text: TOLD, kind: 'GOAL', status: 'OPEN', authoredBy: 'lead', seenBySubject: false, awareness: 'TOLD', awarenessDetail: null, dueSaid: null, createdAt: new Date('2026-09-04'), updatedAt: new Date('2026-09-04') },
];

function pageFor(userId: string, role: string, goals: any[] = GOALS) {
  const ground: any = {
    id: 'g1', organizationId: 'org1', scenario: 'OKR_ALIGNMENT', initiatorId: AMINA, createdAt: new Date('2026-09-20T09:00:00Z'), timelineDays: null,
    restrictExternalVisibility: true, peersVisibleToEachOther: true, whoSeesTargets: 'EVERYBODY',
    participants: people(), checkIns: [], resolution: null, patternDetections: [],
    objectives: [
      { id: 'go1', name: UNTOLD, target: null, ownerParticipantId: 'p-tobi', assumes: null, isADecisionAboutAPerson: false },
      { id: 'go2', name: TOLD, target: null, ownerParticipantId: 'p-tobi', assumes: null, isADecisionAboutAPerson: false },
      { id: 'go3', name: 'Keep the team on one calendar.', target: null, ownerParticipantId: null, assumes: null, isADecisionAboutAPerson: false },
    ],
    report: null,
  };
  const reads = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })) };
  const own: any = {
    patternDetection: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => JSON.parse(JSON.stringify(goals))) },
    wordedLine: { findUnique: async () => ({ text: 'the renewals' }), findFirst: async () => ({ text: 'the renewals' }) },
    ground: { findFirst: async () => ground, findUnique: async () => ground },
    user: { findUnique: jest.fn(async () => ({ role, organizationId: 'org1' })) },
    groundParticipant: { findFirst: async () => null, findMany: async () => [] },
    organization: { findUnique: async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false }) },
    leadContextNote: { findMany: async () => [] },
  };
  const prisma: any = new Proxy(own, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$') && prop !== 'then') target[prop] = { ...reads };
      return target[prop];
    },
  });
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any)
    .get('g1', 'org1', userId) as Promise<any>;
}

const names = (page: any): string[] => (page.objectives ?? []).map((o: any) => o.name);

describe('a goal not told stays with the lead, on the check-in page', () => {
  it('Amina reads every target, the one not told included', async () => {
    expect(names(await pageFor(AMINA, 'MEMBER'))).toEqual(expect.arrayContaining([UNTOLD, TOLD]));
  });

  it('Tobi reads the team\'s targets, and never the one Amina has not told him about', async () => {
    const page = await pageFor(TOBI, 'MEMBER');
    expect(names(page)).not.toContain(UNTOLD);
    expect(JSON.stringify(page)).not.toContain(UNTOLD);
    expect(names(page)).toContain('Keep the team on one calendar.');
  });

  it('an admin of the organisation reads it: admins read every board and report, and it is hidden from the person only (decisions 5, 48, 56 and 86)', async () => {
    const page = await pageFor(ADMIN, 'ADMIN');
    expect(names(page)).toContain(UNTOLD);
  });
});

/*
 * THE SAME RULE ON EVERY OTHER PATH THAT SERVES A GOAL TO A PERSON. The report is what WhatsApp's
 * "your report" message and the API's report routes serve (both end in the reports service's
 * `whatTheLeadHasNotShared`), so the report is tested here once for all three.
 */
import { ReportsService } from '../reports/reports.service';
import { YourBoardService } from './your-board.service';
import { sinceLastFrom } from '../reports/what-today-reads-from-the-record';
import { AssistantService } from '../assistant/assistant.service';

const SAID_IN_THE_REPORT = `${UNTOLD} Both have answered.`;

describe('the report, which WhatsApp and the API serve as well', () => {
  const reportAs = (userId: string, role: string) => {
    const prisma: any = {
      patternDetection: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
      ground: { findUnique: jest.fn(async () => ({ initiatorId: AMINA, organizationId: 'org1', whoSeesTargets: 'EVERYBODY', scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: true, participants: people(), objectives: [{ name: UNTOLD, ownerParticipantId: 'p-tobi', target: null }] })) },
      user: { findUnique: jest.fn(async () => ({ role, organizationId: 'org1' })), findFirst: jest.fn(async () => null) },
      groundDocument: { findMany: jest.fn(async () => []) },
      personObjective: { findMany: jest.fn(async (q: any) => GOALS.filter((g) => !q?.where?.awareness || g.awareness === q.where.awareness)) },
    };
    const svc = Object.create(ReportsService.prototype) as any;
    svc.prisma = prisma;
    svc.logger = { warn: () => undefined, log: () => undefined };
    return svc.whatTheLeadHasNotShared('g1', userId, 'org1', { sharedPicture: SAID_IN_THE_REPORT }) as Promise<any>;
  };

  it('Amina and an admin of the organisation read the sentence, Tobi does not', async () => {
    expect((await reportAs(AMINA, 'MEMBER')).sharedPicture).toContain('renewal process');
    expect(JSON.stringify(await reportAs(TOBI, 'MEMBER'))).not.toContain('renewal process');
    expect(JSON.stringify(await reportAs(ADMIN, 'ADMIN'))).toContain('renewal process');
  });
});

describe('the You board', () => {
  const youBoardAs = (userId: string, role: string) => {
    const ground = { id: 'g1', label: 'Engagement Director, first 90 days', status: 'ACTIVE', organizationId: 'org1', initiatorId: AMINA, closedAt: null, resolvedAt: null, participants: people().map((p) => ({ id: p.id, userId: p.userId, nameGiven: p.nameGiven, user: p.user })), checkIns: [] };
    const table = (rows: any[]) => ({ findMany: jest.fn(async ({ where }: any) => rows.filter((r) => (!where?.participantId?.in || where.participantId.in.includes(r.participantId ?? r.ownerParticipantId)) && (!where?.awareness || r.awareness === where.awareness))), findFirst: jest.fn(async () => null) });
    const targets = [{ id: 'go1', groundId: 'g1', name: UNTOLD, target: 1, count: 0, ownerParticipantId: 'p-tobi', isADecisionAboutAPerson: false }, { id: 'go2', groundId: 'g1', name: TOLD, target: 1, count: 0, ownerParticipantId: 'p-amina', isADecisionAboutAPerson: false }];
    const prisma: any = {
      patternDetection: { findMany: async () => [], updateMany: async () => ({ count: 0 }) }, personObjective: table(GOALS), groundObjective: table(targets), groundCommitment: table([]), coachingState: table([]), person: table([]), todo: table([]), groundDependency: table([]),
    };
    const grounds: any = { list: jest.fn(async () => [ground]) };
    return new YourBoardService(prisma, grounds).forReader({ userId, email: `${userId}@x.test`, role, organizationId: 'org1' } as any);
  };

  it('Tobi does not read the target he has not been told about; an admin has none of their own', async () => {
    expect(JSON.stringify(await youBoardAs(TOBI, 'MEMBER'))).not.toContain(UNTOLD);
    expect(JSON.stringify(await youBoardAs(ADMIN, 'ADMIN'))).not.toContain(UNTOLD);
  });
});

describe('Today, "Since the last round"', () => {
  const ground = () => ({
    initiatorId: AMINA, whoSeesTargets: 'EVERYBODY', peersVisibleToEachOther: true, participants: people(), dependencies: [],
    objectives: [{ id: 'go1', name: UNTOLD, target: 4, count: 3, prevCount: 1, ownerParticipantId: 'p-tobi', sortOrder: 1 }],
    personObjectives: GOALS,
  });
  const prisma: any = {
    groundObjectiveSnapshot: { findMany: async (q: any) => [{ objectiveId: 'go1', count: q.where.sessionNumber === 1 ? 1 : 3 }] },
  };
  const checkIns = [{ id: 'c1', participantId: 'p-tobi', sessionNumber: 1, status: 'COMPLETED', completedAt: new Date('2026-09-10'), isSetup: false }, { id: 'c2', participantId: 'p-tobi', sessionNumber: 2, status: 'COMPLETED', completedAt: new Date('2026-09-17'), isSetup: false }];
  const readAs = async (userId: string, isAdmin: boolean) => {
    const g = ground();
    return JSON.stringify(await sinceLastFrom(prisma, 'g1', { ground: g, participants: g.participants, checkIns, nameOf: (pid: string) => (pid === 'p-tobi' ? 'Tobi' : 'Amina') } as any, { userId, isAdmin }));
  };

  it('Amina and an admin of the organisation read the count that moved on it; Tobi does not', async () => {
    expect(await readAs(AMINA, false)).toContain('renewal process');
    expect(await readAs(TOBI, false)).not.toContain('renewal process');
    expect(await readAs(ADMIN, true)).toContain('renewal process');
  });
});

describe('Ask Groundwork, recalling what came of a check-in', () => {
  const recallAs = async (linkedUserId: string, participantId: string) => {
    const prisma: any = {
      person: { findFirst: jest.fn(async () => ({ id: 'p1', externalId: linkedUserId, email: `${linkedUserId}@x.test`, active: true, linkedUserId })) },
      groundParticipant: {
        findMany: jest.fn(async () => [{
          id: participantId,
          ground: {
            id: 'g1', label: 'Engagement Director, first 90 days', initiatorId: AMINA, whoSeesTargets: 'EVERYBODY',
            objectives: [{ name: UNTOLD, ownerParticipantId: 'p-tobi', target: null }],
            personObjectives: GOALS.filter((g) => g.awareness === 'NOT_TOLD'),
            participants: people().map((p) => ({ id: p.id, nameGiven: null, roleAsDescribed: null, remitAsGiven: null, partyType: p.partyType, user: p.user })),
            report: { releasedAt: new Date(Date.now() - 3 * 86_400_000), centralQuestion: 'Can the renewals move to Tobi?', agreements: [SAID_IN_THE_REPORT, 'Everybody agreed to meet every Friday.'], divergences: [] },
          },
        }]),
      },
      assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
      assistantProposal: { findFirst: jest.fn(async () => null), create: jest.fn(async () => ({})), update: jest.fn(async () => ({})) },
    };
    const service = new AssistantService(
      prisma, { respond: jest.fn(async () => { throw new Error('model off'); }) } as any,
      { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) } as any, { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any,
      { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any, { pendingFor: async () => [], decide: async () => { throw new Error('n/a'); } } as any,
      { start: async () => { throw new Error('n/a'); } } as any, { forPerson: async () => { throw new Error('n/a'); } } as any,
      { read: async () => ({ read: false, because: 'n/a' }) } as any, { sendRoundDigest: async () => { throw new Error('n/a'); } } as any,
      { create: async () => { throw new Error('n/a'); }, addParticipant: async () => { throw new Error('n/a'); } } as any,
    );
    const r: any = await service.respond('org1', 'p1', 'what did we agree?');
    return r.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n');
  };

  it('Amina is reminded of it; Tobi is not, and still reads the rest', async () => {
    expect(await recallAs(AMINA, 'p-amina')).toContain('renewal process');
    const tobi = await recallAs(TOBI, 'p-tobi');
    expect(tobi).not.toContain('renewal process');
    expect(tobi).toContain('Everybody agreed to meet every Friday.');
  });
});

import { BoardService } from '../board/board.service';
import { GroundMode, GroundScenario } from '@prisma/client';

describe('the board', () => {
  const boardAs = (userId: string, role: string) => {
    const ground: any = {
      id: 'g1', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED, initiatorId: AMINA, createdByUserId: AMINA,
      organizationId: 'org1', peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'WEEKLY',
      whoSeesTargets: 'EVERYBODY', label: 'Engagement Director, first 90 days', participants: people(), checkIns: [],
      report: { releasedAt: new Date('2026-09-23T17:00:00Z'), sharedAs: null, theOpening: null, networkPicture: null, sharedPicture: SAID_IN_THE_REPORT, agreements: [], divergences: [], centralQuestion: 'Can Tobi take on the renewals?', engagement: {}, findings: [], createdAt: new Date('2026-09-20T09:00:00Z'), updatedAt: new Date('2026-09-23T15:02:00Z') },
      objectives: [{ id: 'go1', name: UNTOLD, target: null, count: 0, prevCount: 0, ownerParticipantId: 'p-tobi', sortOrder: 1, isADecisionAboutAPerson: false }],
      dependencies: [], poll: null,
    };
    const reads = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })) };
    const model = (o: Record<string, any> = {}) => ({ ...reads, ...o });
    const prisma: any = new Proxy({
      patternDetection: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
      ground: model({ findUnique: jest.fn(async () => {
        const g = JSON.parse(JSON.stringify(ground));
        for (const k of ['releasedAt', 'createdAt', 'updatedAt']) g.report[k] = new Date(g.report[k]);
        return g;
      }) }),
      user: model({ findUnique: jest.fn(async () => ({ role, organizationId: 'org1' })) }),
      personObjective: model({ findMany: jest.fn(async (q: any) => GOALS.filter((g) => !q?.where?.awareness || g.awareness === q.where.awareness)) }),
    }, {
      get(target: any, prop: string) {
        if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
        return target[prop];
      },
    });
    const reports = Object.create(ReportsService.prototype) as ReportsService;
    return new BoardService(prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports)
      .get('g1', userId) as Promise<any>;
  };

  it('Amina and an admin of the organisation read the target; Tobi reads neither it nor a sentence that gives it', async () => {
    expect(JSON.stringify(await boardAs(AMINA, 'MEMBER'))).toContain('renewal process');
    expect(JSON.stringify(await boardAs(TOBI, 'MEMBER'))).not.toContain('renewal process');
    expect(JSON.stringify(await boardAs(ADMIN, 'ADMIN'))).toContain('renewal process');
  });
});


describe('a title is not a first name (request 125, item 2)', () => {
  const OLD = [{ ...GOALS[0], createdAt: new Date(Date.now() - 10 * 86_400_000), updatedAt: new Date(Date.now() - 10 * 86_400_000) }];

  it('Tobi reads that Amina, not Dr, has set a goal and will talk it through with him', async () => {
    const page = await pageFor(TOBI, 'MEMBER', OLD);
    const all = JSON.stringify(page);
    expect(all).toContain('Amina has set a goal about');
    expect(all).not.toMatch(/"Dr has set/);
    expect(page.leadFirstName).toBe('Amina');
  });
});
