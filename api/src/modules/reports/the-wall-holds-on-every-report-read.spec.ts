import { ReportsService } from './reports.service';
import { reportAsText } from '../public-api/a-whatsapp-message-is-routed';

/**
 * DECISION 75 ITEM 14 ON EVERY REPORT READ (privacy sweep, 5 October 2026, finding 1).
 *
 * "In a check-in where people do not see each other, one person's circumstances never reach another."
 * Only GET /report applied that wall. The session report, the rounds and the against-success read served a
 * colleague, in a cohort, the lead's lines about named colleagues and each colleague's own circumstances, and
 * the phone report is built from the session report. These tests read all four through the real service, as the
 * people the sweep named, and check what each person actually reads.
 */

const LEADS_LINE_ABOUT_LOLA = 'Lola is behind on outbound and I keep hearing about the list quality rather than calls made.';
const LEADS_LINE_ABOUT_THE_PLAN = 'I want twelve shops signed by June.';
const LOLAS_OWN_WORDS = 'I am two instalments behind and I lost 220 birds in month two.';
const LOLAS_DEFINITION_OF_SUCCESS = 'Success for me is clearing the two instalments I am behind on.';
const KWAMES_OWN_DEFINITION_OF_SUCCESS = 'Success for me is eight repayments made on time.';
const KWAMES_OWN_WORDS = 'Sometimes the roads are bad. And the weather.';

function person(id: string, userId: string, partyType: string, firstName: string, lastName: string, minute: number) {
  return {
    id, userId, partyType, email: `${firstName.toLowerCase()}@test.com`, managingOnly: false, roleAsDescribed: null, remitAsGiven: null,
    nameGiven: null, organisationGiven: null, createdAt: new Date(`2026-09-01T09:0${minute}:00Z`), user: { firstName, lastName },
    detectedFunction: null, detectedFunctionConfidence: null,
  };
}

function theCohort(scenario = 'COHORT_CHECK') {
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

function entry(id: string, type: string, text: string, participantId: string) {
  return { id, type, text, recallBased: false, anchoredOrigin: null, dimensionThreadKey: null, participantId, confirmedAt: null, anchoredDocumentId: null };
}

function makeService(ground: any, opts: { userRole?: string; awaitingSeat?: boolean; rounds?: any[] } = {}) {
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

const read = (x: unknown) => JSON.stringify(x);

describe('a colleague in a cohort where people do not see each other, on every report read', () => {
  it('the session report holds no sentence about one colleague, from the lead or from a colleague', async () => {
    const served = await makeService(theCohort()).sessionReport('g1', 1, 'user-kwame', 'org-1');
    const text = read(served);
    expect(text).not.toContain('Lola');
    expect(text).not.toContain('Seyi');
    expect(text).not.toContain('instalments behind');
    expect(text).not.toContain('220 birds');
    expect(text).not.toContain('behind on outbound');
  });

  it('the session report keeps what the lead says of the plan, and the reader\'s own words, word for word', async () => {
    const served: any = await makeService(theCohort()).sessionReport('g1', 1, 'user-kwame', 'org-1');
    const lines = (served.whatEachPersonSaid ?? []).flatMap((r: any) => r.lines ?? []);
    expect(lines).toContain(LEADS_LINE_ABOUT_THE_PLAN);
    expect(lines).toContain(KWAMES_OWN_WORDS);
  });

  it('the lead reads every line whole, as before', async () => {
    const served: any = await makeService(theCohort()).sessionReport('g1', 1, 'user-lead', 'org-1');
    const lines = (served.whatEachPersonSaid ?? []).flatMap((r: any) => r.lines ?? []);
    expect(lines).toContain(LEADS_LINE_ABOUT_LOLA);
    expect(lines).toContain(LOLAS_OWN_WORDS);
  });

  it('the phone report, built from the session report, holds none of it either', async () => {
    const served = await makeService(theCohort()).sessionReport('g1', 1, 'user-kwame', 'org-1');
    const phone = reportAsText(served as any, 'Sales cohort, first quarter');
    expect(phone).not.toContain('Lola');
    expect(phone).not.toContain('Seyi');
    expect(phone).not.toContain('instalments behind');
    expect(phone).not.toContain('behind on outbound');
  });

  it('the against-success read holds no colleague\'s circumstances', async () => {
    const served = await makeService(theCohort()).whereAgainstSuccess('g1', 'user-kwame', 'org-1');
    const text = read(served);
    expect(text).not.toContain('Lola');
    expect(text).not.toContain('instalments');
    expect(text).toContain(KWAMES_OWN_DEFINITION_OF_SUCCESS);
  });

  it('the rounds hold no sentence about one colleague, in the picture or its lists', async () => {
    const rounds = [{
      sessionNumber: 1,
      sharedPicture: 'Five of the six people said the weather slowed them. Lola is two instalments behind. Seyi tells me partnerships are close.',
      agreements: ['Lola lost 220 birds in month two.', 'Most people want a later due date.'],
      divergences: [], centralQuestion: null, takenAt: new Date('2026-09-23T17:00:00Z'), amendedAt: null, amendedNote: null,
    }];
    const served: any = await makeService(theCohort(), { rounds }).rounds('g1', 'user-kwame', 'org-1');
    const text = read(served);
    expect(text).not.toContain('Lola');
    expect(text).not.toContain('Seyi');
    expect(text).not.toContain('instalments');
    expect(text).not.toContain('220 birds');
    expect(text).not.toContain('partnerships are close');
    expect(text).toContain('Five of the six people said the weather slowed them.');
    expect(text).toContain('Most people want a later due date.');
  });

  it('the lead reads the rounds whole', async () => {
    const rounds = [{
      sessionNumber: 1, sharedPicture: 'Lola is two instalments behind.', agreements: [], divergences: [], centralQuestion: null,
      takenAt: new Date('2026-09-23T17:00:00Z'), amendedAt: null, amendedNote: null,
    }];
    const served: any = await makeService(theCohort(), { rounds }).rounds('g1', 'user-lead', 'org-1');
    expect(read(served)).toContain('Lola is two instalments behind.');
  });
});

describe('control: a check-in where people do see each other is unchanged', () => {
  it('a colleague still reads the lead\'s line about Lola', async () => {
    const ground = theCohort('OKR_ALIGNMENT');
    ground.peersVisibleToEachOther = true;
    const served: any = await makeService(ground).sessionReport('g1', 1, 'user-kwame', 'org-1');
    const lines = (served.whatEachPersonSaid ?? []).flatMap((r: any) => r.lines ?? []);
    expect(lines).toContain(LEADS_LINE_ABOUT_LOLA);
  });
});
