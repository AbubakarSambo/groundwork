import { Logger } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import {
  isThisSessionReleased, releasedSessionsOf, theLatestReleasedSession, withThisSessionReleased,
  whatReleasingThisSessionDoes, thisSessionIsNotSharedYet, youAreReadingAnEarlierSession,
} from './each-sessions-picture-is-released-on-its-own';

/**
 * DECISION 76, ITEM 4 (2 October 2026): EACH SESSION'S TEAM PICTURE IS RELEASED ON ITS OWN.
 *
 * Found by the review of "Sales team, Q3": the report was released once, for the whole check-in, so
 * Amani kept reading it as it grew into session 2 while session 2 had not been shared. Here two
 * sessions have been answered and only the first is released. Every reader reads the report, each
 * session's report and the rounds, as served; then the lead releases session 2 and they read again.
 *
 * What the team's picture of each session says is marked TEAM-ONE and TEAM-TWO; a person's own line
 * from session 2 is marked AMANI-OWN-TWO, which is hers to read whatever is released.
 */

const at = (d: string) => new Date(`2026-09-${d}T18:00:00Z`);

function aCheckIn(kind: 'sales' | 'review') {
  const sales = kind === 'sales';
  const participants = sales
    ? [
      { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', managingOnly: false, email: 'wairimu@sales.test', createdAt: at('01'), nameGiven: null, organisationGiven: null, roleAsDescribed: null, remitAsGiven: null, soloArtifact: null, user: { firstName: 'Wairimu', lastName: 'Kamau', email: 'wairimu@sales.test' } },
      { id: 'p-amani', userId: 'u-amani', partyType: 'PARTICIPANT', managingOnly: false, email: 'amani@sales.test', createdAt: at('02'), nameGiven: null, organisationGiven: null, roleAsDescribed: null, remitAsGiven: null, soloArtifact: null, user: { firstName: 'Amani', lastName: 'Otieno', email: 'amani@sales.test' } },
      { id: 'p-brian', userId: 'u-brian', partyType: 'PARTICIPANT', managingOnly: false, email: 'brian@sales.test', createdAt: at('03'), nameGiven: null, organisationGiven: null, roleAsDescribed: null, remitAsGiven: null, soloArtifact: null, user: { firstName: 'Brian', lastName: 'Mwangi', email: 'brian@sales.test' } },
    ]
    : [
      { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', managingOnly: false, email: 'wairimu@sales.test', createdAt: at('01'), nameGiven: null, organisationGiven: null, roleAsDescribed: null, remitAsGiven: null, soloArtifact: null, user: { firstName: 'Wairimu', lastName: 'Kamau', email: 'wairimu@sales.test' } },
      { id: 'p-amani', userId: 'u-amani', partyType: 'PARTICIPANT', managingOnly: false, email: 'amani@sales.test', createdAt: at('02'), nameGiven: null, organisationGiven: null, roleAsDescribed: null, remitAsGiven: null, soloArtifact: null, user: { firstName: 'Amani', lastName: 'Otieno', email: 'amani@sales.test' } },
    ];
  const report: any = {
    id: 'r1', groundId: 'g1', createdAt: at('15'), updatedAt: at('29'),
    sharedPicture: 'TEAM-TWO-PICTURE The Tuskys order slipped a week.',
    theOpening: 'TEAM-TWO-OPENING Two shops are signed.',
    agreements: ['TEAM-TWO-AGREED Two shops are signed.'],
    divergences: [{ topic: 'TEAM-TWO-DIFFERENCE When the fridge arrives.', positions: [] }],
    centralQuestion: 'TEAM-TWO-QUESTION What would bring the fridge forward?',
    findings: [{ text: 'TEAM-TWO-FINDING The fridge is late.' }],
    engagement: null, inferences: null, finalSynthesis: null, overTime: null, theJudgement: null, direction: null,
    releasedAt: at('15'), releasedSessions: [1],
  };
  const rounds: Record<number, any> = {
    1: { sessionNumber: 1, sharedPicture: 'TEAM-ONE-PICTURE Nothing is signed yet.', agreements: ['TEAM-ONE-AGREED The target is 12 shops.'], divergences: [], centralQuestion: 'TEAM-ONE-QUESTION Which shops come first?', takenAt: at('15'), amendedAt: null, amendedNote: null, finding: null },
    2: { sessionNumber: 2, sharedPicture: 'TEAM-TWO-PICTURE The Tuskys order slipped a week.', agreements: ['TEAM-TWO-AGREED Two shops are signed.'], divergences: [{ topic: 'TEAM-TWO-DIFFERENCE When the fridge arrives.', positions: [] }], centralQuestion: 'TEAM-TWO-QUESTION What would bring the fridge forward?', takenAt: at('29'), amendedAt: null, amendedNote: null, finding: null },
  };
  const ground: any = {
    id: 'g1', organizationId: 'org1', initiatorId: 'u-lead', createdByUserId: 'u-grace',
    scenario: sales ? 'OKR_ALIGNMENT' : 'PIP', cadence: 'WEEKLY', brief: null, label: sales ? 'Sales team, Q3' : 'Amani, the next 60 days',
    status: 'ACTIVE', approvedById: null, peersVisibleToEachOther: null, whoSeesTargets: 'EVERYBODY', timelineDays: 84, runsUntilEnded: false,
    groundAuditLog: null, participants, report, objectives: [],
  };
  const checkIns = participants.filter((p) => p.id !== 'p-lead').flatMap((p) => [1, 2].map((n) => ({
    id: `c-${p.id}-${n}`, participantId: p.id, sessionNumber: n, status: 'COMPLETED', isSetup: false, completedAt: at(n === 1 ? '15' : '29'),
  })));
  const entries = [
    { participantId: 'p-amani', session: 1, text: 'AMANI-OWN-ONE I visited four shops.' },
    { participantId: 'p-amani', session: 2, text: 'AMANI-OWN-TWO I signed Tuskys Westgate.' },
    ...(sales ? [
      { participantId: 'p-brian', session: 1, text: 'BRIAN-ONE I called Naivas.' },
      { participantId: 'p-brian', session: 2, text: 'BRIAN-TWO Naivas Karen wants a sample fridge.' },
    ] : []),
  ].map((e) => ({ ...e, type: 'PROGRESS', disputedAt: null, recallBased: false, anchoredOrigin: null, dimensionThreadKey: null, confirmedAt: null, anchoredDocumentId: null, checkIn: { sessionNumber: e.session } }));
  return { ground, report, rounds, checkIns, entries };
}

/** Whether a row matches the parts of a `where` this read uses. */
function matches(e: any, where: any): boolean {
  if (!where) return true;
  if (where.OR) return where.OR.some((w: any) => matches(e, w)) && matches(e, { ...where, OR: undefined });
  if (where.participantId?.in && !where.participantId.in.includes(e.participantId)) return false;
  if (typeof where.participantId === 'string' && where.participantId !== e.participantId) return false;
  const s = where.checkIn?.sessionNumber;
  if (typeof s === 'number' && e.session !== s) return false;
  if (s?.lte !== undefined && !(e.session <= s.lte)) return false;
  if (s?.in && !s.in.includes(e.session)) return false;
  return true;
}

function serviceFor(kind: 'sales' | 'review') {
  const w = aCheckIn(kind);
  const none = { findMany: async () => [], findFirst: async () => null, findUnique: async () => null, count: async () => 0, aggregate: async () => ({ _max: {} }), update: async () => null, updateMany: async () => ({ count: 0 }), create: async () => null, upsert: async () => null };
  const users: Record<string, any> = {
    'u-lead': { id: 'u-lead', role: 'ADMIN', organizationId: 'org1', isActive: true, firstName: 'Wairimu', lastName: 'Kamau' },
    'u-amani': { id: 'u-amani', role: 'MEMBER', organizationId: 'org1', isActive: true },
    'u-brian': { id: 'u-brian', role: 'MEMBER', organizationId: 'org1', isActive: true },
    /* An admin who only reads, and the admin who set the check-in up for Wairimu. */
    'u-juma': { id: 'u-juma', role: 'ADMIN', organizationId: 'org1', isActive: true },
    'u-grace': { id: 'u-grace', role: 'ADMIN', organizationId: 'org1', isActive: true },
  };
  const prisma: any = new Proxy({
    /* A fresh copy on every read, as the database gives one: a read must not change what the next reads. */
    ground: { ...none, findUnique: async () => structuredClone({ ...w.ground, report: w.report }), findFirst: async ({ where }: any) => (where?.id === 'g1' && (!where.organizationId || where.organizationId === 'org1') ? structuredClone({ ...w.ground, report: w.report }) : null), update: async ({ data }: any) => Object.assign(w.ground, data) },
    report: { ...none, findUnique: async () => w.report, update: jest.fn(async ({ data }: any) => Object.assign(w.report, data)) },
    reportRound: {
      ...none,
      findUnique: async ({ where }: any) => w.rounds[where.groundId_sessionNumber.sessionNumber] ?? null,
      findMany: async () => Object.values(w.rounds),
    },
    checkIn: {
      ...none,
      findMany: async ({ where }: any = {}) => w.checkIns.filter((c) => !where?.participantId || c.participantId === where.participantId),
      count: async () => 1,
      aggregate: async () => ({ _max: { sessionNumber: 2 } }),
    },
    recordEntry: { ...none, findMany: async ({ where }: any) => w.entries.filter((e) => matches(e, where)) },
    user: { ...none, findUnique: async ({ where }: any) => users[where.id] ?? null },
  } as any, { get: (t: any, k: string) => (typeof k === 'string' && !k.startsWith('$') ? (t[k] ??= { ...none }) : t[k]) });
  const svc = Object.create(ReportsService.prototype) as any;
  svc.prisma = prisma;
  svc.logger = new Logger('test');
  svc.config = { get: () => false };
  svc.grounds = {
    getSessionProgress: async () => ({ completed: 2, total: 2, missingParticipantIds: [], declinedParticipantIds: [] }),
    isSessionReadyForReport: async () => true,
  };
  svc.usage = { emit: async () => undefined };
  svc.tellThemTheReportIsReady = jest.fn(async () => ({ attempted: 0, failed: 0 }));
  svc.wordTheReadsFor = jest.fn(async () => []);
  svc.generatePostReportGuides = jest.fn(async () => undefined);
  return { svc: svc as ReportsService, controller: new ReportsController(svc), w };
}

/** Everything one reader is sent: the whole report, each session's report, and the rounds. */
async function everythingSentTo(svc: ReportsService, userId: string) {
  const tryIt = async (f: () => Promise<any>) => { try { return await f(); } catch (e: any) { return { refused: e?.constructor?.name ?? 'Error' }; } };
  const whole: any = await tryIt(() => svc.get('g1', userId, 'org1'));
  const one: any = await tryIt(() => svc.sessionReport('g1', 1, userId, 'org1'));
  const two: any = await tryIt(() => svc.sessionReport('g1', 2, userId, 'org1'));
  const rounds: any = await tryIt(() => svc.rounds('g1', userId, 'org1'));
  return { whole, one, two, rounds, all: JSON.stringify({ whole, one, two, rounds }) };
}

const SESSION_TWO_OF_THE_TEAM = /TEAM-TWO|BRIAN-TWO/;

describe('the rule, as plain functions', () => {
  it('a session is released only once it is in the list, and an old row with no list reads as before', () => {
    const r = { releasedAt: at('15'), releasedSessions: [1] };
    expect(isThisSessionReleased(r, 1)).toBe(true);
    expect(isThisSessionReleased(r, 2)).toBe(false);
    expect(isThisSessionReleased({ releasedAt: null, releasedSessions: [] }, 1)).toBe(false);
    expect(isThisSessionReleased({ releasedAt: at('15') }, 2)).toBe(true);
    expect(theLatestReleasedSession(r, 2)).toBe(1);
    expect(withThisSessionReleased(r, 2)).toEqual([1, 2]);
    expect(releasedSessionsOf({ releasedAt: at('15'), releasedSessions: [2, 1, 2] })).toEqual([1, 2]);
  });

  it('says plainly what is released and what is not', () => {
    expect(whatReleasingThisSessionDoes(2)).toBe("This shares the team's picture of check-in 2 with everyone in the check-in.");
    expect(thisSessionIsNotSharedYet(2)).toBe("The team's picture of check-in 2 is not shared yet.");
    expect(youAreReadingAnEarlierSession(1, 2)).toBe("You are reading the team's picture of check-in 1. The team's picture of check-in 2 is not shared yet.");
  });
});

describe('a sales check-in, two sessions answered, only session 1 released', () => {
  it('Amani, a participant, reads session 1’s picture and nothing of session 2’s, and her own session 2 line', async () => {
    const { svc } = serviceFor('sales');
    const read = await everythingSentTo(svc, 'u-amani');
    expect(read.all).not.toMatch(SESSION_TWO_OF_THE_TEAM);
    expect(read.whole.sharedPicture).toBe('TEAM-ONE-PICTURE Nothing is signed yet.');
    expect(read.whole.agreements).toEqual(['TEAM-ONE-AGREED The target is 12 shops.']);
    expect(read.whole.readingSession).toEqual({ sessionNumber: 1, saying: "You are reading the team's picture of check-in 1. The team's picture of check-in 2 is not shared yet." });
    expect(read.whole.teamPicture).toEqual({ shared: false, sessionNumber: 2, says: "The team's picture of check-in 2 is not shared yet." });
    expect(read.whole.releasedSessions).toEqual([1]);
    expect(read.whole).not.toHaveProperty('releaseThisSession');
    /* Session 1's own report, in full. */
    expect(read.one.released).toBe(true);
    expect(read.one.writtenPicture).toBe('TEAM-ONE-PICTURE Nothing is signed yet.');
    expect(JSON.stringify(read.one)).toMatch(/BRIAN-ONE/);
    /* Session 2's: her own words, and the plain sentence, nothing of the team's. */
    expect(read.two.released).toBe(false);
    expect(read.two.teamPicture).toEqual({ shared: false, sessionNumber: 2, says: "The team's picture of check-in 2 is not shared yet." });
    expect(JSON.stringify(read.two)).toMatch(/AMANI-OWN-TWO/);
    expect(read.two.writtenPicture).toBeFalsy();
    expect(read.rounds.rounds.map((r: any) => r.sessionNumber)).toEqual([1]);
  });

  it('Wairimu, the lead, reads everything as before, and is told what releasing would share', async () => {
    const { svc } = serviceFor('sales');
    const read = await everythingSentTo(svc, 'u-lead');
    expect(read.whole.sharedPicture).toBe('TEAM-TWO-PICTURE The Tuskys order slipped a week.');
    expect(read.whole.releaseThisSession).toEqual({ sessionNumber: 2, saying: "This shares the team's picture of check-in 2 with everyone in the check-in." });
    expect(read.whole).not.toHaveProperty('readingSession');
    expect(read.two.writtenPicture).toBe('TEAM-TWO-PICTURE The Tuskys order slipped a week.');
    expect(JSON.stringify(read.two)).toMatch(/BRIAN-TWO/);
    expect(read.two.releaseThisSession).toEqual({ sessionNumber: 2, saying: "This shares the team's picture of check-in 2 with everyone in the check-in." });
    expect(read.rounds.rounds.map((r: any) => r.sessionNumber)).toEqual([1, 2]);
  });

  it.each([['Juma, an admin who only reads', 'u-juma'], ['Grace, the admin who set it up', 'u-grace']])('%s reads as before', async (_who, userId) => {
    const { svc } = serviceFor('sales');
    const read = await everythingSentTo(svc, userId);
    expect(read.whole.sharedPicture).toBe('TEAM-TWO-PICTURE The Tuskys order slipped a week.');
    expect(read.two.writtenPicture).toBe('TEAM-TWO-PICTURE The Tuskys order slipped a week.');
    expect(read.rounds.rounds.map((r: any) => r.sessionNumber)).toEqual([1, 2]);
    /* Only the lead releases, so only the lead is told what releasing would share. */
    expect(read.whole).not.toHaveProperty('releaseThisSession');
  });

  it('after Wairimu releases session 2, Amani reads both, and the lead is told what was shared', async () => {
    const { svc, controller, w } = serviceFor('sales');
    const said = await controller.release('g1', 'u-lead', 'org1');
    expect(said).toEqual({
      groundId: 'g1', releasedAt: at('15'), releasedSessions: [1, 2], sessionNumber: 2,
      saying: "This shares the team's picture of check-in 2 with everyone in the check-in.",
    });
    /* The first release's moment stays; only the session is added. */
    expect(w.report.releasedAt).toEqual(at('15'));
    const read = await everythingSentTo(svc, 'u-amani');
    expect(read.whole.sharedPicture).toBe('TEAM-TWO-PICTURE The Tuskys order slipped a week.');
    expect(read.whole).not.toHaveProperty('readingSession');
    expect(read.whole).not.toHaveProperty('teamPicture');
    expect(read.one.writtenPicture).toBe('TEAM-ONE-PICTURE Nothing is signed yet.');
    expect(read.two.released).toBe(true);
    expect(read.two.writtenPicture).toBe('TEAM-TWO-PICTURE The Tuskys order slipped a week.');
    expect(read.two.whereThingsStand.open).toEqual(['TEAM-TWO-DIFFERENCE When the fridge arrives.']);
    expect(JSON.stringify(read.two)).toMatch(/BRIAN-TWO/);
    expect(read.rounds.rounds.map((r: any) => r.sessionNumber)).toEqual([1, 2]);
    /* And releasing it again changes nothing. */
    await controller.release('g1', 'u-lead', 'org1');
    expect(w.report.releasedSessions).toEqual([1, 2]);
  });

  it('a participant cannot release it', async () => {
    const { controller, w } = serviceFor('sales');
    await expect(controller.release('g1', 'u-brian', 'org1')).rejects.toBeTruthy();
    expect(w.report.releasedSessions).toEqual([1]);
  });
});

describe('an evaluation check-in (a performance plan), the same two sessions, only session 1 released', () => {
  it('Amani, the person reviewed, reads session 1’s picture and nothing of session 2’s, then both once it is released', async () => {
    const { svc, controller } = serviceFor('review');
    const before = await everythingSentTo(svc, 'u-amani');
    expect(before.all).not.toMatch(SESSION_TWO_OF_THE_TEAM);
    expect(before.whole.sharedPicture).toMatch(/TEAM-ONE-PICTURE/);
    expect(before.two.teamPicture.says).toBe("The team's picture of check-in 2 is not shared yet.");
    expect(before.rounds.rounds.map((r: any) => r.sessionNumber)).toEqual([1]);

    await controller.release('g1', 'u-lead', 'org1');
    const after = await everythingSentTo(svc, 'u-amani');
    expect(after.whole.sharedPicture).toMatch(/TEAM-TWO-PICTURE/);
    expect(after.rounds.rounds.map((r: any) => r.sessionNumber)).toEqual([1, 2]);
  });

  it('the lead and the admin who set it up read session 2 before it is released, as before', async () => {
    const { svc } = serviceFor('review');
    for (const userId of ['u-lead', 'u-grace']) {
      const read = await everythingSentTo(svc, userId);
      expect(read.whole.sharedPicture).toMatch(/TEAM-TWO-PICTURE/);
      expect(read.rounds.rounds.map((r: any) => r.sessionNumber)).toEqual([1, 2]);
    }
  });

  it('an admin who was not given access reads nothing of it, before or after', async () => {
    const { svc, controller } = serviceFor('review');
    const before = await everythingSentTo(svc, 'u-juma');
    expect(before.all).not.toMatch(/TEAM-ONE|TEAM-TWO|AMANI-OWN/);
    await controller.release('g1', 'u-lead', 'org1');
    const after = await everythingSentTo(svc, 'u-juma');
    expect(after.all).not.toMatch(/TEAM-ONE|TEAM-TWO|AMANI-OWN/);
  });
});

describe('nothing released yet', () => {
  it('a participant who has answered is told the picture is not shared yet, and keeps their own things', async () => {
    const { svc, w } = serviceFor('sales');
    w.report.releasedAt = null;
    w.report.releasedSessions = [];
    const read = await everythingSentTo(svc, 'u-amani');
    expect(read.all).not.toMatch(/TEAM-ONE|TEAM-TWO|BRIAN-/);
    expect(read.whole.saying).toBe("The team's picture of check-in 2 is not shared yet.");
    expect(read.whole).toHaveProperty('myRows');
    expect(read.rounds.rounds).toEqual([]);
  });
});
