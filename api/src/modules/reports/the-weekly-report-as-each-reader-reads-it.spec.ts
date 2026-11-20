import { NotFoundException } from '@nestjs/common';
import { TheWeeklyReportService } from './the-weekly-report.service';
import { theWeeksHeading, aTargetThisWeek, theCheckInsMade } from './the-weekly-report';

/**
 * THE WEEKLY REPORT, AS EACH READER READS IT (week 12b, screens request 9 part d, decisions 7, 38, 43,
 * 58 and 69). The prototype's page is B4-reports-and-sharing/weekly-report.txt. Every part is built
 * from the record when a check-in comes in, kept without names, and worded for one reader when it is
 * opened. These tests read what each person is served: the lead, a person in the check-in, another
 * person in it, and an admin of the organisation who does not run it.
 */

const party = (id: string, userId: string | null, partyType: string, first: string, t: number) => ({
  id, userId, partyType, createdAt: new Date(2026, 8, 1, 0, t), email: null, nameGiven: null, organisationGiven: null, roleAsDescribed: null,
  user: { firstName: first, lastName: null, email: null },
});
const PARTIES = [
  party('p-lead', 'u-lead', 'INITIATOR', 'Wairimu', 0),
  party('p-aisha', 'u-aisha', 'RESPONDENT', 'Aisha', 1),
  party('p-baraka', 'u-baraka', 'RESPONDENT', 'Baraka', 2),
  party('p-chidi', 'u-chidi', 'RESPONDENT', 'Chidi', 3),
];

const AT = new Date('2026-09-23T10:00:00Z'); // Wednesday; the week began Monday 21 September in Lagos
const CHECK_INS = [
  { id: 'c-a5', participantId: 'p-aisha', sessionNumber: 5, status: 'COMPLETED', completedAt: new Date('2026-09-22T09:00:00Z'), availableFrom: new Date('2026-09-21T06:00:00Z'), createdAt: new Date('2026-09-20T06:00:00Z'), isSetup: false },
  { id: 'c-b5', participantId: 'p-baraka', sessionNumber: 5, status: 'COMPLETED', completedAt: new Date('2026-09-23T08:00:00Z'), availableFrom: new Date('2026-09-21T06:00:00Z'), createdAt: new Date('2026-09-20T06:00:00Z'), isSetup: false },
  { id: 'c-c5', participantId: 'p-chidi', sessionNumber: 5, status: 'NOT_STARTED', completedAt: null, availableFrom: new Date('2026-09-21T06:00:00Z'), createdAt: new Date('2026-09-20T06:00:00Z'), isSetup: false },
  { id: 'c-b4', participantId: 'p-baraka', sessionNumber: 4, status: 'COMPLETED', completedAt: new Date('2026-09-15T08:00:00Z'), availableFrom: new Date('2026-09-14T06:00:00Z'), createdAt: new Date('2026-09-13T06:00:00Z'), isSetup: false },
];
const ROWS = [
  { participantId: 'p-aisha', type: 'PROGRESS', text: 'I met Green Mart and they want a quote.', anchoredDocumentId: null, recallBased: true },
  { participantId: 'p-aisha', type: 'PROGRESS', text: 'Nyama Choma Palace bought 12 freezers.', anchoredDocumentId: 'doc-1', recallBased: false },
  { participantId: 'p-aisha', type: 'COMMITMENT', text: 'I will send the quote on Friday.', anchoredDocumentId: null, recallBased: true },
  { participantId: 'p-baraka', type: 'PROGRESS', text: 'Green Mart asked about the price, maybe 30 units.', anchoredDocumentId: null, recallBased: true },
  { participantId: 'p-baraka', type: 'PROGRESS', text: 'We sold 5 units at the market.', anchoredDocumentId: null, recallBased: true },
];
/* The same five things, as the people's assessments hold them: what each person said reaches the week through the one reader of the
   assessments (conversation/the-facts-on-record.ts, 1 November 2026). An item noted for the lead never does. */
const said = (words: string, extra: Record<string, unknown> = {}, whoMaySee = 'the people in this check-in') => ({ id: words.slice(0, 6), words, from: [1], whoMaySee, saidWordForWord: true, ...extra });
const anAssessment = (participantId: string, who: string, endedAt: string, parts: Record<string, unknown>) => ({
  kind: 'assessment', version: 1,
  about: { checkInId: `c-${participantId}`, groundId: 'g1', participantId, who, isTheLead: false, sessionNumber: 5, endedAt },
  summary: '', setup: null, comparedWithLastTime: {}, ...parts,
});
const ASSESSED: Record<string, unknown> = {
  'c-a5': anAssessment('p-aisha', 'Aisha', '2026-09-22T09:00:00Z', {
    workUpdates: [said('I met Green Mart and they want a quote.')],
    claims: [said('Nyama Choma Palace bought 12 freezers.', { proof: 'proved' })],
    promises: [said('I will send the quote on Friday.')],
    observations: [said('I think the week went fine.', {}, 'the lead only')],
  }),
  'c-b5': anAssessment('p-baraka', 'Baraka', '2026-09-23T08:00:00Z', {
    numbers: [said('Green Mart asked about the price, maybe 30 units.')],
    claims: [said('We sold 5 units at the market.', { proof: 'said' })],
  }),
};
const OBJECTIVES = [
  { id: 'o-sold', name: 'Freezers sold', target: 40, count: 17, prevCount: 12, direction: 'AIM', ownerParticipantId: null, setByParticipantId: null, sortOrder: 0, isADecisionAboutAPerson: false },
  { id: 'o-spend', name: 'Spending this quarter', target: 180000, count: 254000, prevCount: 200000, direction: 'LIMIT', ownerParticipantId: null, setByParticipantId: null, sortOrder: 1, isADecisionAboutAPerson: false },
  { id: 'o-visits', name: 'Visits made', target: 20, count: 9, prevCount: 9, direction: null, ownerParticipantId: 'p-aisha', setByParticipantId: null, sortOrder: 2, isADecisionAboutAPerson: false },
  { id: 'o-decide', name: 'Probation reviews finished', target: 1, count: 0, prevCount: 0, direction: null, ownerParticipantId: null, setByParticipantId: null, sortOrder: 3, isADecisionAboutAPerson: true },
];
const SNAPSHOTS = [
  { objectiveId: 'o-sold', sessionNumber: 4, count: 12, takenAt: new Date('2026-09-15T09:00:00Z') },
  { objectiveId: 'o-spend', sessionNumber: 4, count: 200000, takenAt: new Date('2026-09-15T09:00:00Z') },
  { objectiveId: 'o-visits', sessionNumber: 4, count: 9, takenAt: new Date('2026-09-15T09:00:00Z') },
  { objectiveId: 'o-decide', sessionNumber: 4, count: 0, takenAt: new Date('2026-09-15T09:00:00Z') },
];
const COMMITMENTS = [
  { participantId: 'p-aisha', text: 'I will call Mama Fresh by Thursday.', status: 'DONE', whenSaid: 'by Thursday', settledAt: new Date('2026-09-22T09:00:00Z'), createdAt: new Date('2026-09-15T09:00:00Z') },
  { participantId: 'p-baraka', text: 'I will visit Kwik Stores.', status: 'DROPPED', whenSaid: null, settledAt: new Date('2026-09-23T08:00:00Z'), createdAt: new Date('2026-09-15T09:00:00Z') },
  { participantId: 'p-baraka', text: 'I will send Green Mart the price list on Monday.', status: 'UNKNOWN', whenSaid: 'on Monday', settledAt: null, createdAt: new Date('2026-09-23T08:00:00Z') },
  { participantId: 'p-aisha', text: 'I will send the quote on Friday.', status: 'UNKNOWN', whenSaid: 'on Friday', settledAt: null, createdAt: new Date('2026-09-22T09:00:00Z') },
];
/* Aisha cannot move until Wairimu decides; Baraka stopped waiting on Wairimu for the price list. */
const OPEN_DEPENDENCIES = [
  { id: 'd-1', fromParticipantId: 'p-aisha', onParticipantId: 'p-lead', onLabel: null, what: 'whether a price range counts as a budget', status: 'WAITING', blockerKind: 'DECISION', then: null, createdAt: new Date('2026-09-22T09:00:00Z'), clearedAt: null },
];
const CLEARED = [
  { fromParticipantId: 'p-baraka', onParticipantId: 'p-lead', onLabel: null, what: 'the price list', status: 'CLEARED', clearedAt: new Date('2026-09-22T12:00:00Z') },
];
const PATTERNS = [
  /* Baraka's, seen three times, the last this week, and his turn has passed: the lead reads it. */
  { id: 'pat-1', participantId: 'p-baraka', code: 'B10', observationText: null, seenInSessions: [3, 4, 5], periodsObserved: 3, readyAt: new Date('2026-09-10T00:00:00Z'), shownToPersonAt: new Date('2026-09-11T00:00:00Z'), personAnswer: null, personAnsweredAt: null, leadMark: 'RIGHT', talkedAboutAt: null, talkedAboutAtPeriod: null, evidenceSource: 'both' },
  /* Baraka's, just reached three periods this week: he sees it first, nobody else yet. */
  { id: 'pat-2', participantId: 'p-baraka', code: 'B5', observationText: null, seenInSessions: [3, 4, 5], periodsObserved: 3, readyAt: new Date('2026-09-23T08:00:00Z'), shownToPersonAt: null, personAnswer: null, personAnsweredAt: null, leadMark: null, talkedAboutAt: null, talkedAboutAtPeriod: null, evidenceSource: null },
  /* Aisha's, only two periods: nobody reads it. */
  { id: 'pat-3', participantId: 'p-aisha', code: 'D1', observationText: null, seenInSessions: [4, 5], periodsObserved: 2, readyAt: null, shownToPersonAt: null, personAnswer: null, personAnsweredAt: null, leadMark: null, talkedAboutAt: null, talkedAboutAtPeriod: null, evidenceSource: null },
];
const LEADS_PRIVATE_NOTE = { id: 'n-1', text: 'Whether to hire a second driver', kind: 'DECISION', closedAt: null };

function aCheckIn(scenario = 'SALES_TEAM_CHECK', leave: { userId: string; startsOn: Date; endsOn: Date }[] | null = null) {
  let stored: any = null;
  const ground = {
    id: 'g1', organizationId: 'org', initiatorId: 'u-lead', createdByUserId: 'u-lead', scenario, peersVisibleToEachOther: true,
    whoSeesTargets: null, cadence: 'WEEKLY', participants: PARTIES, objectives: OBJECTIVES, dependencies: OPEN_DEPENDENCIES, personObjectives: [],
  };
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ground) },
    checkIn: {
      findMany: jest.fn(async ({ where, select }: any) =>
        select?.sessionReport
          ? CHECK_INS.filter((c) => c.completedAt && c.completedAt >= where.completedAt.gte && c.completedAt <= where.completedAt.lte).map((c) => ({ sessionReport: ASSESSED[c.id] ?? null }))
          : where?.status === 'COMPLETED' && where?.completedAt
          ? CHECK_INS.filter((c) => c.status === 'COMPLETED' && c.completedAt! >= where.completedAt.gte)
          : CHECK_INS),
    },
    recordEntry: { findMany: jest.fn(async () => ROWS) },
    groundObjectiveSnapshot: { findMany: jest.fn(async () => SNAPSHOTS) },
    groundCommitment: { findMany: jest.fn(async () => COMMITMENTS) },
    groundDependency: { findMany: jest.fn(async () => CLEARED) },
    report: { findUnique: jest.fn(async () => ({ divergences: [] })) },
    patternDetection: { findMany: jest.fn(async () => PATTERNS) },
    groundContextItem: { findMany: jest.fn(async () => [LEADS_PRIVATE_NOTE]) },
    ...(leave ? {
      groundParticipant: { findMany: jest.fn(async () => PARTIES.filter((p) => p.userId).map((p) => ({ id: p.id, userId: p.userId, ground: { organizationId: 'org' } }))) },
      leaveRequest: { findMany: jest.fn(async () => leave.map((l) => ({ ...l, organizationId: 'org' }))) },
    } : {}),
    weeklyReport: {
      upsert: jest.fn(async ({ create, update }: any) => { stored = { ...(stored ?? create), ...(update ?? {}), weekStart: create.weekStart, builtAt: new Date() }; return stored; }),
      findFirst: jest.fn(async () => stored),
    },
  };
  return { svc: new TheWeeklyReportService(prisma), prisma, stored: () => stored };
}

const LEAD = { userId: 'u-lead', role: 'LEAD', organizationId: 'org' };
const AISHA = { userId: 'u-aisha', role: 'MEMBER', organizationId: 'org' };
const BARAKA = { userId: 'u-baraka', role: 'MEMBER', organizationId: 'org' };
const ADMIN = { userId: 'u-admin', role: 'ADMIN', organizationId: 'org' };

/* The person-first clock is read against this week's Wednesday, wherever it is read. */
beforeAll(() => { jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }); jest.setSystemTime(AT); });
afterAll(() => { jest.useRealTimers(); });

async function served(reader: any, scenario?: string) {
  const c = aCheckIn(scenario);
  await c.svc.build('g1', AT);
  return { ...c, r: await c.svc.read('g1', reader, AT) };
}

describe('what is kept when a check-in comes in', () => {
  it('keeps no name of anybody in the check-in, and reads no rating', async () => {
    const { stored, prisma } = await served(LEAD);
    const json = JSON.stringify(stored().eachPerson);
    for (const n of ['Wairimu', 'Aisha', 'Baraka', 'Chidi']) expect(json).not.toContain(n);
    for (const call of prisma.recordEntry.findMany.mock.calls) expect(JSON.stringify(call[0])).not.toMatch(/verifiab|specificity/i);
    expect(json).not.toContain('I think the week went fine');
  });

  it('opening the page builds nothing and reads no record line', async () => {
    const c = aCheckIn();
    await c.svc.build('g1', AT);
    c.prisma.weeklyReport.upsert.mockClear();
    c.prisma.recordEntry.findMany.mockClear();
    c.prisma.groundCommitment.findMany.mockClear();
    await c.svc.read('g1', LEAD, AT);
    expect(c.prisma.weeklyReport.upsert).not.toHaveBeenCalled();
    expect(c.prisma.recordEntry.findMany).not.toHaveBeenCalled();
    expect(c.prisma.groundCommitment.findMany).not.toHaveBeenCalled();
  });
});

describe('the lead reads the whole week', () => {
  it('has the prototype heading and the sentence under it', async () => {
    const { r } = await served(LEAD);
    expect(r.heading).toBe('This week, 21 to 23 Sep, so far');
    expect(r.whatThisIs).toBe('The report for each check-in shows that check-in. This weekly report shows what kept happening for three check-ins in a row or more.');
  });

  it('reads the week in numbers, with the aim and the limit said the way the lead set them', async () => {
    const { r } = await served(LEAD);
    expect(r.inNumbers).toEqual([
      { figure: '67%', of: 'of check-ins made this week', says: '2 of the 3 check-ins due this week were made.' },
      { figure: '1', of: 'things people said this week with a photo or document behind them', says: '1 of the 5 things people said this week has a photo or document behind it.' },
      { figure: '17', of: 'freezers sold', says: "The team's freezers sold went from 12 to 17 this week, against the aim of 40." },
      { figure: '254,000', of: 'spending this quarter', says: 'The team\'s spending this quarter went from 200,000 to 254,000 this week, against the limit of 180,000. That is 74,000 over the limit.' },
      { figure: '9', of: "visits made, Aisha's number", says: 'It stayed at 9 this week.' },
      { figure: '0', of: 'probation reviews finished', says: 'It stayed at 0 this week.' },
    ]);
  });

  it('reads each person, and what came up across the team, by name', async () => {
    const { r } = await served(LEAD);
    expect(r.eachPerson.map((e) => `${e.who}. ${e.says}`)).toEqual([
      'Aisha. This week Aisha said “I will send the quote on Friday” and “I met Green Mart and they want a quote”. One more thing Aisha said is on the record. One thing Aisha said has proof behind it.',
      'Baraka. This week Baraka said “Green Mart asked about the price, maybe 30 units” and “We sold 5 units at the market”.',
      'Chidi. Chidi has not checked in this week, so there is nothing here yet about what Chidi is working on.',
    ]);
    expect(r.acrossTheTeam).toEqual(['Green Mart came up in what Aisha and Baraka said this week.']);
  });

  it('reads no stored pattern about anybody, even one whose person has had their turn', async () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    const { r } = await served(LEAD);
    expect(r.threeInARow).toEqual([]);
    expect(JSON.stringify(r)).not.toMatch(/The work stops until there is another call|RIGHT|Two separate reads|A lot of communicating/);
  });

  it('reads what was said and what the proof shows, as totals', async () => {
    const { r } = await served(LEAD);
    expect(r.saidAndProof).toBe(
      'This week, people said 5 things in their check-ins. 1 of them has a photo or document behind it. 1 number was given as an estimate, and 1 number was given from memory with nothing attached, so they cannot be checked yet.',
    );
  });

  it('reads what changed', async () => {
    const { r } = await served(LEAD);
    expect(r.whatChanged!.moved).toEqual([
      /* Settled on her word alone, so it is her claim (night quality run 1, problem 3). */
      'Aisha committed to call Mama Fresh by Thursday, and says it is done. Nothing has been shown to back it yet.',
      /* Change 4: Baraka's wait on the lead is his account; the lead never promised the price list (night quality run 1, problem 2). */
      'Baraka said the work was waiting on you for the price list, and it is no longer waiting.',
    ]);
    expect(r.whatChanged!.dropped).toEqual(['Baraka committed to visit Kwik Stores, and it has been dropped.']);
    expect(r.whatChanged!.result).toEqual([
      "The team's freezers sold went from 12 to 17 this week, against the aim of 40.",
      "The team's spending this quarter went from 200,000 to 254,000 this week, against the limit of 180,000. That is 74,000 over the limit.",
    ]);
  });

  it('reads what to do next week, each with where it comes from, and nothing from a stored pattern', async () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    const { r } = await served(LEAD);
    expect(r.forNextWeek).toEqual([
      { do: 'Decide whether a price range counts as a budget.', why: 'Aisha is waiting on you for it.', comesFrom: 'This comes from a blocker.' },
      { do: 'Decide whether to hire a second driver.', why: 'You wrote this down as still to decide.', comesFrom: 'Decision needed' },
    ]);
  });

  it('is never nudged about a stored pattern, whether or not the person has had their turn on it', async () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    const { r } = await served(LEAD);
    expect((r.forNextWeek ?? []).filter((f: any) => f.comesFrom === 'From a pattern')).toEqual([]);
    expect(JSON.stringify(r)).not.toContain('A lot of communicating');
    expect(JSON.stringify(r)).not.toContain('Talk with Baraka about');
  });

  it('never carries a label, a rating word, or a report label', async () => {
    const { r } = await served(LEAD);
    const all = JSON.stringify(r);
    expect(all).not.toMatch(/Participant [A-Z]|the initiator|\bscore|rating|at risk|underperform/i);
  });
});

describe('a check-in still waiting is counted as due, from the record (night quality run 2)', () => {
  /* Amina's fourth check-in opened at midnight on Sunday in Nairobi (21:00 UTC), before Monday began in Lagos. */
  it('the lead and a member read that one of the three was not made, never "All 3 ... were made" or "100%"', async () => {
    const chidi = CHECK_INS.find((c) => c.id === 'c-c5')!;
    const was = chidi.availableFrom;
    chidi.availableFrom = new Date('2026-09-20T21:00:00Z');
    try {
      for (const reader of [LEAD, BARAKA]) {
        const { r } = await served(reader);
        expect(r.inNumbers![0]).toEqual({ figure: '67%', of: 'of check-ins made this week', says: '2 of the 3 check-ins due this week were made.' });
        expect(JSON.stringify(r)).not.toMatch(/100%|Both check-ins due this week were made|All \d+ check-ins due this week were made/);
      }
    } finally { chidi.availableFrom = was; }
  });
});

describe('a person reads only what is about them, and the team\'s own counts', () => {
  it('Baraka reads his own sentence, his own patterns first, and nothing of Aisha\'s', async () => {
    const { r } = await served(BARAKA);
    expect(r.eachPerson).toEqual([{ who: 'You', isYou: true, says: 'This week you said “Green Mart asked about the price, maybe 30 units” and “We sold 5 units at the market”.' }]);
    expect(r.inNumbers).toEqual([
      { figure: '67%', of: 'of check-ins made this week', says: '2 of the 3 check-ins due this week were made.' },
      { figure: '0', of: 'things you said this week with a photo or document behind them', says: 'None of the 2 things you said this week have a photo or document behind them yet.' },
      { figure: '17', of: 'freezers sold', says: "The team's freezers sold went from 12 to 17 this week." },
      { figure: '254,000', of: 'spending this quarter', says: "The team's spending this quarter went from 200,000 to 254,000 this week." },
    ]);
    expect(r.threeInARow!.map((p) => p.says)).toEqual([
      'The work stops until there is another call. This came up in 3 of your check-ins, in sessions 3, 4 and 5.',
      'A lot of communicating, nothing unblocked. This came up in 3 of your check-ins, in sessions 3, 4 and 5.',
    ]);
    expect(r.threeInARow!.every((p) => p.isYou && p.who === 'You')).toBe(true);
    expect(r.saidAndProof).toBe(
      'This week, you said 2 things in your check-ins. None of them has a photo or document behind it yet. 1 number was given as an estimate, and 1 number was given from memory with nothing attached, so they cannot be checked yet.',
    );
    expect(r.whatChanged).toEqual({
      moved: ['You said the work was waiting on Wairimu for the price list, and it is no longer waiting.'],
      dropped: ['You committed to visit Kwik Stores, and it has been dropped.'],
      result: [
        "The team's freezers sold went from 12 to 17 this week.",
        "The team's spending this quarter went from 200,000 to 254,000 this week.",
      ],
    });
    expect(r.forNextWeek).toEqual([
      { do: 'Send Green Mart the price list on Monday.', why: 'You said this week that you would do this, and it is still open.', comesFrom: 'From your commitments' },
    ]);
    expect(r.acrossTheTeam).toEqual([]);
    const all = JSON.stringify(r);
    /* Never a colleague's, never the aim or the limit, never the lead's judgement, notes or a decision about a person. */
    expect(all).not.toMatch(/Aisha|Nyama|Mama Fresh|Visits made|Probation|against the aim|over the limit|second driver|price range|RIGHT|Two separate reads|Participant [A-Z]|the initiator/);
  });

  it('Aisha reads her own number, as hers, and reads no pattern that has not come up three times', async () => {
    const { r } = await served(AISHA);
    expect(r.inNumbers!.find((f) => f.of.startsWith('visits made'))).toEqual({ figure: '9', of: 'visits made, your own number', says: 'It stayed at 9 this week.' });
    expect(r.threeInARow).toEqual([]);
    expect(r.whatChanged!.moved).toEqual(['You committed to call Mama Fresh by Thursday, and you say it is done. Nothing has been shown to back it yet.']);
    expect(r.whatChanged!.dropped).toEqual(['Nothing was dropped this week.']);
    expect(r.forNextWeek).toEqual([
      { do: 'Send the quote on Friday.', why: 'You said this week that you would do this, and it is still open.', comesFrom: 'From your commitments' },
    ]);
    expect(JSON.stringify(r)).not.toMatch(/Baraka|Kwik|The work stops|second driver|Chidi/);
  });
});

describe('an admin of the organisation who does not run the check-in', () => {
  /*
   * Decision 86 reverses decision 73 for admins, the chief executive included: an admin who only reads
   * now reads the aims and limits and every person's number, as the lead does. Still no pattern, none
   * of the lead's own list, and never the lead's decision about a person (decision 46). This test used
   * to pin "no aim" for the admin.
   */
  it('reads the whole week as a reader, with the aims and limits, and no pattern and nothing of the lead\'s to do', async () => {
    const { r } = await served(ADMIN);
    expect(r.eachPerson.map((e) => e.who)).toEqual(['Aisha', 'Baraka', 'Chidi']);
    expect(r.threeInARow).toEqual([]);
    expect(r.forNextWeek).toBeUndefined();
    expect(r.inNumbers).toEqual([
      { figure: '67%', of: 'of check-ins made this week', says: '2 of the 3 check-ins due this week were made.' },
      { figure: '1', of: 'things people said this week with a photo or document behind them', says: '1 of the 5 things people said this week has a photo or document behind it.' },
      { figure: '17', of: 'freezers sold', says: "The team's freezers sold went from 12 to 17 this week, against the aim of 40." },
      { figure: '254,000', of: 'spending this quarter', says: 'The team\'s spending this quarter went from 200,000 to 254,000 this week, against the limit of 180,000. That is 74,000 over the limit.' },
      { figure: '9', of: "visits made, Aisha's number", says: 'It stayed at 9 this week.' },
    ]);
    expect(JSON.stringify(r)).not.toMatch(/second driver|Probation|The work stops|A lot of communicating/);
  });

  it('reads nothing at all of an evaluation check-in they were not given', async () => {
    const c = aCheckIn('PIP');
    await c.svc.build('g1', AT);
    await expect(c.svc.read('g1', ADMIN, AT)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('the parts on their own', () => {
  it('says a week that has ended as the week it was', () => {
    expect(theWeeksHeading('2026-09-21', '2026-09-23T08:00:00Z', new Date('2026-09-23T10:00:00Z'))).toBe('This week, 21 to 23 Sep, so far');
    expect(theWeeksHeading('2026-09-28', '2026-10-02T08:00:00Z', new Date('2026-10-06T10:00:00Z'))).toBe('The week of 28 Sep to 2 Oct');
    expect(theWeeksHeading('2026-09-21', '2026-09-21T08:00:00Z', new Date('2026-09-21T10:00:00Z'))).toBe('This week, 21 Sep, so far');
    /* A week still going runs to today, whenever its last check-in was (screen match, 16 October). */
    expect(theWeeksHeading('2026-09-21', '2026-09-21T08:00:00Z', new Date('2026-09-23T10:00:00Z'))).toBe('This week, 21 to 23 Sep, so far');
  });

  it('says "maybe 30 units" as they said it, never as a date or a count of its own', () => {
    const { theSentenceAbout } = jest.requireActual('./the-weekly-sentence-about-each-person');
    expect(theSentenceAbout({ label: 'Participant A', checkedIn: true, lines: [{ text: 'Green Mart wants maybe 30 units.', type: 'numbers', documented: false, saidWordForWord: true }] }))
      .toBe('This week Participant A said “Green Mart wants maybe 30 units”.');
  });

  it('reads a target with no direction set by the words of its name (decision 69)', () => {
    const t = { id: 'x', name: 'Spending budget this quarter', target: 100, direction: null, ownerParticipantId: null, isADecisionAboutAPerson: false, count: 150, from: 120 };
    expect(aTargetThisWeek(t, 'team', true)!.says).toBe("The team's spending budget this quarter went from 120 to 150 this week, against the limit of 100. That is 50 over the limit.");
    const aim = { ...t, name: 'Pumps sold under the new scheme', count: 110 };
    expect(aTargetThisWeek(aim, 'team', true)!.says).toContain('has been reached.');
    expect(aTargetThisWeek(aim, 'team', false)!.says).not.toMatch(/aim|reached|100\b/);
  });
});

/*
 * DECISION 73 (Hafsah, 1 October). What a person in the check-in reads of aims and limits follows the
 * check-in's "who sees targets" setting, as on the board: THEIR_OWN, the counts only; EVERYBODY, the
 * aims and limits too. And every earlier week stays readable: a new week never overwrites an old one.
 */
describe('aims and limits follow the check-in\'s setting, for a person in it (decision 73)', () => {
  async function asBaraka(whoSeesTargets: string | null) {
    const c = aCheckIn();
    const ground = await c.prisma.ground.findUnique();
    c.prisma.ground.findUnique = jest.fn(async () => ({ ...ground, whoSeesTargets }));
    await c.svc.build('g1', AT);
    return (await c.svc.read('g1', BARAKA, AT)).inNumbers!.map((f: any) => f.says).join(' ');
  }
  it('THEIR_OWN: the team\'s count, with no aim and no limit', async () => {
    const says = await asBaraka('THEIR_OWN');
    expect(says).toContain('freezers sold went from 12 to 17 this week.');
    expect(says).not.toMatch(/against the (aim|limit)|over the limit/);
  });
  it('EVERYBODY: the aim and the limit too', async () => {
    const says = await asBaraka('EVERYBODY');
    expect(says).toContain('against the aim of 40');
    expect(says).toContain('against the limit of 180,000. That is 74,000 over the limit.');
  });
  /* Decision 86 reverses decision 73 for admins: this used to pin "the counts alone, whatever the setting". */
  it.each(['THEIR_OWN', 'EVERYBODY'])('an admin who only reads reads the aim and the limit too, with %s', async (whoSeesTargets) => {
    const c = aCheckIn();
    const ground = await c.prisma.ground.findUnique();
    c.prisma.ground.findUnique = jest.fn(async () => ({ ...ground, whoSeesTargets }));
    await c.svc.build('g1', AT);
    const says = (await c.svc.read('g1', ADMIN, AT)).inNumbers!.map((f: any) => f.says).join(' ');
    expect(says).toContain('against the aim of 40');
    expect(says).toContain('against the limit of 180,000. That is 74,000 over the limit.');
  });
});

describe('every earlier week stays readable, and a new week never overwrites an old one (decision 73)', () => {
  const NEXT_WEEK = new Date(AT.getTime() + 7 * 24 * 3600 * 1000);
  function withEveryWeekKept() {
    const c = aCheckIn();
    /* Baraka also checks in next week, so next week has something said in it (the week is built from what was said). */
    const thisWeeks = c.prisma.checkIn.findMany;
    c.prisma.checkIn.findMany = jest.fn(async (a: any) => {
      const got = await thisWeeks(a);
      const nextWeek = a?.where?.completedAt?.gte && a.where.completedAt.gte > AT;
      if (!nextWeek) return got;
      return a.select?.sessionReport
        ? [{ sessionReport: anAssessment('p-baraka', 'Baraka', NEXT_WEEK.toISOString(), { claims: [said('We sold 3 more units.')] }) }]
        : [{ participantId: 'p-baraka', sessionNumber: 6, completedAt: NEXT_WEEK, isSetup: false }];
    });
    const rows = new Map<string, any>();
    c.prisma.weeklyReport = {
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const k = where.groundId_weekStart.weekStart;
        const row = rows.has(k) ? { ...rows.get(k), ...update } : { ...create, builtAt: new Date() };
        rows.set(k, row);
        return row;
      }),
      findFirst: jest.fn(async () => [...rows.values()].sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0] ?? null),
      findUnique: jest.fn(async ({ where }: any) => rows.get(where.groundId_weekStart.weekStart) ?? null),
    };
    return { ...c, rows };
  }

  it('building next week adds a row and leaves this week\'s exactly as it was', async () => {
    const c = withEveryWeekKept();
    await c.svc.build('g1', AT);
    const [first] = [...c.rows.keys()];
    const before = JSON.stringify(c.rows.get(first));
    await c.svc.build('g1', NEXT_WEEK);
    expect(c.rows.size).toBe(2);
    expect(JSON.stringify(c.rows.get(first))).toBe(before);
  });

  it('the earlier week is read as it was kept, by the date of its Monday', async () => {
    const c = withEveryWeekKept();
    await c.svc.build('g1', AT);
    const [first] = [...c.rows.keys()];
    const thenRead = await c.svc.read('g1', LEAD, AT);
    await c.svc.build('g1', NEXT_WEEK);
    const latest = await c.svc.read('g1', LEAD, NEXT_WEEK);
    expect(latest.weekStart).not.toBe(first);
    const earlier = await c.svc.read('g1', LEAD, NEXT_WEEK, first);
    expect(earlier.weekStart).toBe(first);
    expect(earlier.eachPerson).toEqual(thenRead.eachPerson);
    expect(earlier.inNumbers).toEqual(thenRead.inNumbers);
  });

  it('a report kept in the earlier form, only the sentences about each person, still reads', async () => {
    const c = withEveryWeekKept();
    await c.svc.build('g1', AT);
    const [first] = [...c.rows.keys()];
    const sentences = (c.rows.get(first).eachPerson.eachPerson ?? c.rows.get(first).eachPerson.sentences ?? c.rows.get(first).eachPerson);
    c.rows.set('2026-09-07', { groundId: 'g1', weekStart: '2026-09-07', eachPerson: Array.isArray(sentences) ? sentences : [], builtAt: new Date('2026-09-09T10:00:00Z') });
    const old = await c.svc.read('g1', LEAD, NEXT_WEEK, '2026-09-07');
    expect(old.weekStart).toBe('2026-09-07');
    expect(Array.isArray(old.eachPerson)).toBe(true);
  });

  it('a week nobody has a report for says so, and a date that is not a Monday\'s form is refused', async () => {
    const c = withEveryWeekKept();
    expect((await c.svc.read('g1', LEAD, AT, '2026-08-03')).saying).toBe('There is no weekly report for that week.');
    await expect(c.svc.read('g1', LEAD, AT, 'last week')).rejects.toThrow(/date of its Monday/);
  });
});

/*
 * BEING AWAY IS NOT COUNTED AGAINST ANYBODY (week 23). Found live, 1 October 2026 (item 6,
 * journey/memory-requests-and-being-away-live.ts): with Amani on approved leave all week, the lead
 * read "1 of the 5 check-ins due this week was made" and "Amani Wekesa has not checked in this week",
 * and Amani read "You have not checked in this week". Here Chidi is on approved leave from Monday 21
 * to Friday 25 September, and his check-in that opened on the Monday is still not started.
 */
describe('somebody on leave this week, as each reader reads it', () => {
  const CHIDI_AWAY = [{ userId: 'u-chidi', startsOn: new Date('2026-09-21T00:00:00Z'), endsOn: new Date('2026-09-25T00:00:00Z') }];
  const CHIDI = { userId: 'u-chidi', role: 'MEMBER', organizationId: 'org' };
  async function servedWithLeave(reader: any) {
    const c = aCheckIn('SALES_TEAM_CHECK', CHIDI_AWAY);
    await c.svc.build('g1', AT);
    return c.svc.read('g1', reader, AT);
  }

  it('the lead reads that Chidi was on leave, not that he did not check in, and his check-in is not one of those due', async () => {
    const r = await servedWithLeave(LEAD);
    expect(r.eachPerson.find((e) => e.who === 'Chidi')?.says).toBe('Chidi has been on leave this week, so there is nothing here yet about what Chidi is working on. That is not counted against Chidi.');
    expect(r.inNumbers?.[0]).toEqual({ figure: '100%', of: 'of check-ins made this week', says: 'Both check-ins due this week were made.' });
    expect(JSON.stringify(r)).not.toMatch(/Chidi has not checked in/);
  });

  it('Chidi reads it about himself, as you', async () => {
    const r = await servedWithLeave(CHIDI);
    expect(r.eachPerson.map((e) => e.says)).toEqual(['You have been on leave this week, so there is nothing here yet about what you are working on. That is not counted against you.']);
  });

  it('leave that is not approved changes nothing', async () => {
    const r = await served(LEAD);
    expect(r.r.eachPerson.find((e) => e.who === 'Chidi')?.says).toBe('Chidi has not checked in this week, so there is nothing here yet about what Chidi is working on.');
  });
});

describe('the check-ins made, said the way a person says a count', () => {
  it.each([
    [2, 2, 'Both check-ins due this week were made.'],
    [2, 0, 'Neither of the two check-ins due this week has been made yet.'],
    [3, 0, 'None of the 3 check-ins due this week has been made yet.'],
    [3, 3, 'All 3 check-ins due this week were made.'],
    [3, 2, '2 of the 3 check-ins due this week were made.'],
  ])('%i due, %i made', (due, made, says) => {
    expect(theCheckInsMade(due, made)?.says).toBe(says);
  });
});

/*
 * DECISION 86 REVERSES DECISION 74, ITEM 2. This block was "with the person-only reach, the weekly
 * report carries a pattern only to the person it is about". There is no such reach now: with nothing
 * put in force, the lead reads Baraka's pattern once he has had his turn, and is nudged to talk it through.
 */
describe('with no setting at all, only Baraka reads Baraka’s pattern in the week (decision 86, then Hafsah, 2 November 2026)', () => {
  it('the lead reads neither the pattern Baraka has had his turn on nor a nudge to talk it through', async () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    const { r } = await served(LEAD);
    expect(JSON.stringify(r)).not.toContain('The work stops until there is another call');
    expect((r.forNextWeek ?? []).filter((f: any) => f.comesFrom === 'From a pattern')).toEqual([]);
  });

  it('an admin who does not run the check-in reads none', async () => {
    const { r } = await served(ADMIN);
    expect(JSON.stringify(r)).not.toContain('The work stops until there is another call');
  });

  it('Baraka reads both of his own, as his', async () => {
    const { r } = await served(BARAKA);
    expect(r.threeInARow!.map((p) => p.says)).toEqual([
      'The work stops until there is another call. This came up in 3 of your check-ins, in sessions 3, 4 and 5.',
      'A lot of communicating, nothing unblocked. This came up in 3 of your check-ins, in sessions 3, 4 and 5.',
    ]);
  });

  it('Aisha, a colleague, reads nothing of Baraka’s', async () => {
    const { r } = await served(AISHA);
    expect(r.threeInARow).toEqual([]);
    expect(JSON.stringify(r)).not.toContain('The work stops until there is another call');
  });
});

/*
 * DECISION 77 (2 October 2026): somebody an admin has not let in yet is not one of the check-ins due,
 * and is not written up as not having checked in. Here an admin has not let Chidi in yet.
 */
describe('somebody an admin has not let in yet, as the lead reads the week', () => {
  async function servedWithChidiHeld(held: boolean) {
    const c = aCheckIn();
    /* Everybody here has signed in once (decision 8 redone reads "joined" from that); only the hold differs. */
    c.prisma.user = { findMany: jest.fn(async (a: any) => (a?.where?.awaitingOrgApproval ? (held ? [{ id: 'u-chidi', awaitingOrgApproval: true }] : []) : ((a?.where?.id?.in ?? []) as string[]).map((id) => ({ id, passwordHash: 'set' })))) };
    await c.svc.build('g1', AT);
    return c.svc.read('g1', LEAD, AT);
  }

  it('reads "Both check-ins due this week were made." and nothing about Chidi not checking in', async () => {
    const r = await servedWithChidiHeld(true);
    expect(r.inNumbers?.[0]).toEqual({ figure: '100%', of: 'of check-ins made this week', says: 'Both check-ins due this week were made.' });
    expect(JSON.stringify(r)).not.toMatch(/Chidi has not checked in/);
  });

  /*
   * Night quality run 3 (decision 8 redone) left somebody invited and never joined out of the count. CHANGED 1 NOVEMBER 2026: Hafsah
   * approved counting everyone on the check-in, as the prototype does ("5 of 6 have checked in today; Omar hasn't yet"), and the week
   * reads the one count (how-many-have-answered.ts). So his check-in is due; he is still never written up as absent.
   */
  it('invited and never joined (never accepted, nothing opened): counted as due, and nothing about him not checking in', async () => {
    const c = aCheckIn();
    /* Joined means accepted the invitation (13 October): the week page reads that from its own read of the people, as the database returns it. A sign-in is not joining. */
    const ground = await c.prisma.ground.findUnique();
    c.prisma.ground.findUnique = jest.fn(async () => ({ ...ground, participants: PARTIES.map((p) => (p.id === 'p-chidi' ? { ...p, cameThroughTheLink: false, acceptedAt: null, checkIns: [] } : { ...p, cameThroughTheLink: false, acceptedAt: new Date('2026-09-01T09:00:00Z'), checkIns: [] })) }));
    c.prisma.user = { findMany: jest.fn(async (a: any) => (a?.where?.awaitingOrgApproval ? [] : ((a?.where?.id?.in ?? []) as string[]).filter((id) => id !== 'u-chidi').map((id) => ({ id, passwordHash: 'set' })))) };
    c.prisma.emailVerificationToken = { findMany: jest.fn(async () => []) };
    await c.svc.build('g1', AT);
    const r = await c.svc.read('g1', LEAD, AT);
    expect(r.inNumbers?.[0]?.says).toBe('2 of the 3 check-ins due this week were made.');
    expect(JSON.stringify(r)).not.toMatch(/Chidi has not checked in/);
  });

  it('once he is let in, his check-in is due again: "2 of the 3 check-ins due this week were made."', async () => {
    const r = await servedWithChidiHeld(false);
    expect(r.inNumbers?.[0]?.says).toBe('2 of the 3 check-ins due this week were made.');
    expect(r.eachPerson.find((e) => e.who === 'Chidi')?.says).toBe('Chidi has not checked in this week, so there is nothing here yet about what Chidi is working on.');
  });
});

/* Found in the anchor walk (8 October): the week in numbers read the lead's own aims aloud to every person in the team, in an anchor check-in, where they are hers alone (decision 96, item 8). */
describe('in an anchor check-in the lead\'s aims are not in a team member\'s week', () => {
  const aims = (r: any) => (r.inNumbers ?? []).filter((f: any) => !/check-ins made|photo or document/.test(f.of));
  it('Aisha reads the check-ins made and what has proof behind it, and no aim of the lead\'s', async () => {
    const { r } = await served(AISHA, 'HELP_TEAM_UNDERSTAND');
    expect(r.inNumbers!.length).toBeGreaterThan(0);
    expect(aims(r)).toEqual([]);
    expect(JSON.stringify(r)).not.toMatch(/Freezers sold|Spending this quarter/);
  });
  it('the lead still reads them whole, and another kind of check-in is unchanged for Aisha', async () => {
    expect(aims((await served(LEAD, 'HELP_TEAM_UNDERSTAND')).r).length).toBeGreaterThan(0);
    expect(aims((await served(AISHA, 'SALES_TEAM_CHECK')).r).length).toBeGreaterThan(0);
  });
});

/*
 * NIGHT QUALITY RUN 1, PROBLEM 4, ON THE WEEK PAGE. Jared Okoth's check-in was closed by the clock with nothing said, and every count
 * took it as made. Here Chidi is in Jared's place, and Wairimu, who runs it, has her own optional row she has not answered: his miss
 * stays in "due", her row is never due.
 */
describe('a check-in the clock closed with nothing said is due and not made, as the lead reads the week', () => {
  const { CLOSED_BY_THE_CLOCK } = jest.requireActual('../../common/closed-by-the-clock');
  async function servedWithChidiClosedByTheClock() {
    const c = aCheckIn();
    const rows = [
      ...CHECK_INS.filter((x) => x.id !== 'c-c5').map((x) => ({ ...x, closedReason: null, optional: false, turns: x.status === 'COMPLETED' ? [{ id: 't' }] : [] })),
      { id: 'c-c5', participantId: 'p-chidi', sessionNumber: 5, status: 'COMPLETED', completedAt: new Date('2026-09-22T23:00:00Z'), availableFrom: new Date('2026-09-21T06:00:00Z'), createdAt: new Date('2026-09-20T06:00:00Z'), isSetup: false, optional: false, closedReason: CLOSED_BY_THE_CLOCK, turns: [] },
      { id: 'c-l5', participantId: 'p-lead', sessionNumber: 5, status: 'NOT_STARTED', completedAt: null, availableFrom: new Date('2026-09-21T06:00:00Z'), createdAt: new Date('2026-09-20T06:00:00Z'), isSetup: false, optional: true, closedReason: null, turns: [] },
    ];
    const quiet = (x: any) => x.closedReason === CLOSED_BY_THE_CLOCK && !x.turns.length;
    c.prisma.checkIn.findMany = jest.fn(async ({ where }: any) =>
      where?.status === 'COMPLETED' && where?.completedAt
        ? rows.filter((x) => x.status === 'COMPLETED' && x.completedAt! >= where.completedAt.gte && !(where.AND && quiet(x)))
        : rows);
    await c.svc.build('g1', AT);
    return c.svc.read('g1', LEAD, AT);
  }

  it('reads "2 of the 3 check-ins due this week were made." and that Chidi has not checked in, and never counts the lead\'s own row', async () => {
    const r = await servedWithChidiClosedByTheClock();
    expect(r.inNumbers?.[0]?.says).toBe('2 of the 3 check-ins due this week were made.');
    expect(r.eachPerson.find((e) => e.who === 'Chidi')?.says).toBe('Chidi has not checked in this week, so there is nothing here yet about what Chidi is working on.');
    expect(JSON.stringify(r)).not.toMatch(/All 3 check-ins|Wairimu has not checked in|You have not checked in/);
  });
});

/*
 * THE WEEK'S "CHECK-INS MADE" READS THE ONE COUNT (Hafsah, 31 October 2026: "The weekly 'check-ins made this week' tile stays (my 18
 * October decision). Make it read the one server count like every other count."). A sales lead read "100% of check-ins made this
 * week" beside "1 of 3" on Today, the board and the check-in's page. The tile's due and made are now theCountOfASession for each of
 * the week's sessions, the rule the open session's count (the board, Today, the page, Ask) reads, so the two cannot disagree.
 */
import { theSessionAndItsCount } from '../grounds/this-sessions-count';

describe('the check-ins made this week, and the one count', () => {
  it('say the same people and the same number for the session this week', async () => {
    const { r } = await served(LEAD);
    const { count } = theSessionAndItsCount({ participants: PARTIES, checkIns: CHECK_INS, scenario: 'SALES_TEAM_CHECK', cadence: 'WEEKLY', timelineDays: null }, { now: AT });
    expect(count.session).toBe(5);
    expect([count.answered, count.ofPeople]).toEqual([2, 3]);
    expect(count.says).toBe('2 of 3 have checked in.'); /* F5: the approved journey's words */
    expect(r.inNumbers![0]).toEqual({ figure: '67%', of: 'of check-ins made this week', says: '2 of the 3 check-ins due this week were made.' });
  });

  it('counts somebody whose session has not opened for them yet, as the one count does, never "100%" over one', async () => {
    /* Round 3: Aisha (the lead) answered on Saturday; Sarah's and David's session opens on Monday. */
    const sat = new Date('2026-09-26T08:00:00Z');
    const rows = [
      { id: 'r1', participantId: 'p-lead', sessionNumber: 1, status: 'COMPLETED', completedAt: sat, availableFrom: sat, createdAt: sat, isSetup: false },
      { id: 'r2', participantId: 'p-aisha', sessionNumber: 1, status: 'NOT_STARTED', completedAt: null, availableFrom: new Date('2026-09-28T06:00:00Z'), createdAt: sat, isSetup: false },
      { id: 'r3', participantId: 'p-baraka', sessionNumber: 1, status: 'NOT_STARTED', completedAt: null, availableFrom: new Date('2026-09-28T06:00:00Z'), createdAt: sat, isSetup: false },
    ];
    const people = PARTIES.filter((p) => p.id !== 'p-chidi');
    const c = aCheckIn();
    c.prisma.checkIn.findMany = jest.fn(async () => rows);
    c.prisma.ground.findUnique = jest.fn(async () => ({ ...(await (aCheckIn().prisma.ground.findUnique())), participants: people }));
    await c.svc.build('g1', new Date('2026-09-26T10:00:00Z'));
    const week = await c.svc.read('g1', LEAD, new Date('2026-09-26T10:00:00Z'));
    const { count } = theSessionAndItsCount({ participants: people, checkIns: rows, scenario: 'SALES_TEAM_CHECK', cadence: 'WEEKLY', timelineDays: null }, { now: new Date('2026-09-26T10:00:00Z') });
    expect([count.answered, count.ofPeople]).toEqual([1, 3]);
    expect(week.inNumbers![0]).toEqual({ figure: '33%', of: 'of check-ins made this week', says: '1 of the 3 check-ins due this week was made.' });
  });
});
