import { ReportsService } from '../reports.service';

/* A cohort, and the real reports service over it, for the specs that read the session report, the rounds and the against-success read. */
export const LEADS_LINE_ABOUT_LOLA = 'Lola is behind on outbound and I keep hearing about the list quality rather than calls made.';
export const LEADS_LINE_ABOUT_THE_PLAN = 'I want twelve shops signed by June.';
export const LOLAS_OWN_WORDS = 'I am two instalments behind and I lost 220 birds in month two.';
export const LOLAS_DEFINITION_OF_SUCCESS = 'Success for me is clearing the two instalments I am behind on.';
export const KWAMES_OWN_DEFINITION_OF_SUCCESS = 'Success for me is eight repayments made on time.';
export const KWAMES_OWN_WORDS = 'Sometimes the roads are bad. And the weather.';


export function person(id: string, userId: string, partyType: string, firstName: string, lastName: string, minute: number) {
  return {
    id, userId, partyType, email: `${firstName.toLowerCase()}@test.com`, managingOnly: false, roleAsDescribed: null, remitAsGiven: null,
    nameGiven: null, organisationGiven: null, createdAt: new Date(`2026-09-01T09:0${minute}:00Z`), user: { firstName, lastName },
    detectedFunction: null, detectedFunctionConfidence: null,
  };
}

export function theCohort(scenario = 'COHORT_CHECK') {
  return {
    id: 'g1', organizationId: 'org-1', initiatorId: 'user-lead', createdByUserId: null, scenario, cadence: 'WEEKLY', timelineDays: 90,
    brief: 'Check in on how the cohort is going.', peersVisibleToEachOther: false, objectives: [],
    report: { agreements: [], divergences: [], centralQuestion: null, releasedAt: new Date('2026-09-23T17:00:00Z'), releasedSessions: [1], findings: [], sharedAs: null },
    participants: [
      person('lead', 'user-lead', 'INITIATOR', 'Tunde', 'Alabi', 0),
      person('kwame', 'user-kwame', 'PARTICIPANT', 'Kwame', 'Mensah', 1),
      person('lola', 'user-lola', 'PARTICIPANT', 'Lola', 'Adeyemi', 2),
      person('seyi', 'user-seyi', 'PARTICIPANT', 'Seyi', 'Okon', 3),
    ],
  };
}

export function entry(id: string, type: string, text: string, participantId: string) {
  return { id, type, text, recallBased: false, anchoredOrigin: null, dimensionThreadKey: null, participantId, confirmedAt: null, anchoredDocumentId: null };
}

export function makeService(ground: any, opts: { userRole?: string; awaitingSeat?: boolean; rounds?: any[] } = {}) {
  const clone = () => structuredClone(ground);
  const entries = [
    entry('e1', 'PROGRESS', LEADS_LINE_ABOUT_LOLA, 'lead'),
    entry('e2', 'COMMITMENT', LEADS_LINE_ABOUT_THE_PLAN, 'lead'),
    entry('e3', 'PROGRESS', LOLAS_OWN_WORDS, 'lola'),
    entry('e4', 'PROGRESS', KWAMES_OWN_WORDS, 'kwame'),
    entry('e5', 'SUCCESS_DEFINITION', LOLAS_DEFINITION_OF_SUCCESS, 'lola'),
    entry('e6', 'SUCCESS_DEFINITION', KWAMES_OWN_DEFINITION_OF_SUCCESS, 'kwame'),
  ];
  const checkIns = ground.participants.map((p: any, i: number) => ({ id: `c${i}`, participantId: p.id, sessionNumber: 1, status: 'COMPLETED' }));
  const prisma: any = new Proxy({
    ground: { findUnique: jest.fn(async () => clone()) },
    user: {
      findUnique: jest.fn(async ({ select }: any) => {
        if (select && ('awaitingOrgApproval' in select || 'awaitingSeat' in select)) return { awaitingOrgApproval: false, awaitingSeat: !!opts.awaitingSeat };
        return { role: opts.userRole ?? 'MEMBER', organizationId: 'org-1' };
      }),
    },
    groundParticipant: {
      findMany: jest.fn(async () => ground.participants.map((p: any) => ({ id: p.id, checkIns: checkIns.filter((c: any) => c.participantId === p.id).map((c: any) => ({ status: c.status })) }))),
      findFirst: jest.fn(async ({ where }: any) => ground.participants.find((p: any) => !where?.userId || p.userId === where.userId) ?? null),
      findUnique: jest.fn(async () => null),
    },
    recordEntry: { findMany: jest.fn(async () => entries), count: jest.fn(async () => entries.length) },
    checkIn: {
      findMany: jest.fn(async () => checkIns.map((c: any) => ({ participantId: c.participantId }))),
      findFirst: jest.fn(async () => ({ specificityLevel: null })),
      count: jest.fn(async () => 1),
    },
    reportRound: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => opts.rounds ?? []) },
    reportActivation: { findMany: jest.fn(async () => []) },
    groundDocument: { findMany: jest.fn(async () => []) },
    groundBaseline: {
      findFirst: jest.fn(async () => ({ successLooksLike: 'Every borrower repays on time.', version: 1, conditions: [] })),
    },
    groundBaselineEntry: { findFirst: jest.fn(async () => null) },
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) {
        target[prop] = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0) };
      }
      return target[prop];
    },
  });
  const email: any = {};
  const config: any = { get: () => 'http://localhost:5173' };
  const grounds: any = { getSessionProgress: jest.fn(async () => null) };
  return new ReportsService(prisma, {} as any, {} as any, email, config, { emit: () => Promise.resolve() } as any, grounds, { tell: async () => [] } as any);
}

