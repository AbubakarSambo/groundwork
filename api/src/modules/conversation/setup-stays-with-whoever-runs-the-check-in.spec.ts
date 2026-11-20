import { assessTheConversation } from './assess-the-conversation';
import { theRecordLinesIn } from './the-record-from-the-assessment';
import { theFactsIn, type TheReader } from './the-facts-on-record';
import { boardAs, answered, A_RELEASED_REPORT, BARAKA, RUKIA, AMINA } from '../board/the-switchboards-sections-harness';
import { ReportsService } from '../reports/reports.service';
import { theRecordTheyMayRead } from '../assistant/a-question-is-answered-from-the-documents';
import { readMyWork } from '../board/my-work';

/**
 * SETUP STAYS WITH WHOEVER RUNS THE CHECK-IN, AND A PERSON'S WORDS ABOUT THEIR TARGET FOLLOW THE TARGET SETTING (Hafsah, 4 November
 * 2026; docs/fix-plan.md, group 1; issues 28 and 30).
 *
 * Round 38: the setup chat was copied into the lead's session 1 as check-in turns, so its assessment read every setup sentence as said
 * in a check-in, and the record took them. A team member read the lead's "I do not know what he is working on. That is what I want to
 * find out from these check-ins." on their board, and Mercy's "This month, hitting my sales targets means closing at least 20 unit
 * sales" reached a colleague on a check-in where each person sees only their own target.
 *
 * Amina runs "The team, Q3". She set it up in one conversation: what it is for, a note about Baraka, the targets, and, asked where
 * things stand today, her own update. Rukia then checked in and said what hitting her target means. Each reader is served through the
 * real code, from Amina's assessment as the real assessment writes it, and the record lines the real writer takes from it: Baraka on
 * his board, My work, his session report and his own report before release, the "Against the target" band, the synthesis the shared
 * report is written from, and Ask. Amina, who runs it, reads everything.
 */
const SET_UP = 'We sell water filters to offices in Nairobi, and this check-in is for the sales team.';
const ABOUT_BARAKA = 'I do not know what Baraka is working on. That is what I want to find out from these check-ins.';
const THE_TARGETS = 'Rukia has to sell 20 units this month and Baraka 15.';
const HER_UPDATE = 'As far as I know, Kilele Hotel is still waiting on our quote.';
const RUKIAS_TARGET = 'This month, hitting my sales targets means closing at least 20 unit sales.';
const RUKIAS_WORK = 'I visited Choma Zone butchery and the owner is still deciding.';
/* Words of Amina's setup, and of Rukia's target, that no team member but Rukia may read. */
const SETUP_WORDS = /water filters to offices|do not know what Baraka|want to find out from these|has to sell 20 units|Baraka 15/;
const RUKIAS_TARGET_WORDS = /hitting my sales targets|at least 20 unit sales/;

/* What the read gave back for Amina's setup: the worst case, where it also put her note under everything else and her targets under numbers. */
const THE_READ_OF_HER_SETUP = {
  summary: 'Amina set up the sales team and gave her own update.',
  nothingToRecord: [],
  herUpdate: [4],
  setup: {
    objective: [{ words: SET_UP, from: [1], objective: 'Sell water filters to offices.' }],
    privateNotes: [{ words: ABOUT_BARAKA, from: [2], about: 'Baraka', note: 'She does not know what Baraka is working on.' }],
  },
  everythingElse: [{ words: ABOUT_BARAKA, from: [2], what: 'What she wants to find out.' }],
  targets: [{ words: THE_TARGETS, from: [3], aim: 'Rukia is aiming to sell 20 units this month.', target: 20, unit: 'units', whose: 'Rukia' }],
  numbers: [{ words: THE_TARGETS, from: [3], figure: '20', measures: 'units' }],
  workUpdates: [{ words: HER_UPDATE, from: [4], work: 'The Kilele Hotel quote', stage: 'waiting on the quote' }],
};

const herTurns: any[] = [];
async function hersAsWritten(): Promise<any> {
  let stored: any = null;
  const prisma: any = {
    conversationTurn: { create: jest.fn(async ({ data }: any) => { herTurns.push(data); return { id: `t${herTurns.length}`, ...data }; }) },
    checkIn: {
      findUnique: jest.fn(async () => ({
        id: 'c1-p-amina', groundId: 'g-1', participantId: 'p-amina', sessionNumber: 1, startedAt: new Date('2026-09-01T09:00:00Z'), completedAt: new Date('2026-09-01T09:30:00Z'),
        whatWeHave: null, sessionReport: null,
        /* Setup is no longer copied into her turns: her session 1 has none. */
        turns: [],
        participant: { partyType: 'INITIATOR', nameGiven: null, roleAsDescribed: null, user: { firstName: 'Amina', lastName: 'Wanjiru', jobTitle: 'Sales lead' } },
        ground: { label: 'The team, Q3', initiator: { firstName: 'Amina', lastName: 'Wanjiru' } },
      })),
      findMany: jest.fn(async () => []),
      update: jest.fn(async ({ data }: any) => { stored = data.sessionReport; return {}; }),
    },
    groundObjective: { findMany: jest.fn(async () => []) },
    groundCommitment: { findMany: jest.fn(async () => []) },
    groundDocument: { findMany: jest.fn(async () => []) },
  };
  const anthropic = { extract: jest.fn(async () => THE_READ_OF_HER_SETUP as any) };
  await assessTheConversation({ prisma, anthropic: anthropic as any }, 'c1-p-amina', {
    howItEnded: 'setup saved', closedAt: new Date('2026-09-01T09:30:00Z'),
    setup: {
      words: [SET_UP, ABOUT_BARAKA, THE_TARGETS, HER_UPDATE],
      asked: [null, 'Who is on the team?', 'What is each person aiming at?', 'Where do things stand today, as far as you know?'],
      given: ['How often: WEEKLY'],
    },
  });
  return stored;
}

const RUKIAS_ASSESSMENT = {
  kind: 'assessment', version: 1, summary: '', setup: null, comparedWithLastTime: {},
  about: { checkInId: 'c1-p-rukia', groundId: 'g-1', participantId: 'p-rukia', who: 'Rukia Mwangi', isTheLead: false, sessionNumber: 1, endedAt: '2026-09-02T16:00:00Z' },
  messages: [{ n: 1, turnId: 't1', where: 'check-in', at: null }, { n: 2, turnId: 't2', where: 'check-in', at: null }],
  targets: [{ id: 'r1.targets.0', words: RUKIAS_TARGET, from: [1], whoMaySee: 'the people in this check-in', saidWordForWord: true, aim: 'Rukia is aiming to close 20 unit sales this month.', target: 20, unit: 'unit sales', whose: 'Rukia' }],
  numbers: [{ id: 'r1.numbers.0', words: RUKIAS_TARGET, from: [1], whoMaySee: 'the people in this check-in', saidWordForWord: true, figure: '20' }],
  workUpdates: [{ id: 'r1.workUpdates.0', words: RUKIAS_WORK, from: [2], whoMaySee: 'the people in this check-in', saidWordForWord: true, work: 'Choma Zone butchery' }],
};

/* The record as the one writer writes it from each assessment. */
function theRecordFrom(assessments: any[]): any[] {
  return assessments.flatMap((a) => theRecordLinesIn(a, () => true).map((l, i) => ({
    id: `${a.about.participantId}-${i}`, participantId: a.about.participantId, checkInId: a.about.checkInId, type: l.type, text: l.text,
    recallBased: true, anchoredOrigin: null, dimensionThreadKey: null, confirmedAt: null, anchoredDocumentId: null, verifiability: l.verifiability,
    disputedAt: null, createdAt: new Date(a.about.endedAt), checkIn: { sessionNumber: a.about.sessionNumber },
  })));
}

const read = (x: unknown) => JSON.stringify(x);

let amina: any;
let lines: any[];
beforeAll(async () => {
  amina = await hersAsWritten();
  lines = theRecordFrom([amina, RUKIAS_ASSESSMENT]);
});

describe('setup is stored in two parts', () => {
  it('her setup messages stay setup, and the message the read named as her own update is her first check-in', () => {
    expect(amina.messages.map((m: any) => [m.n, m.where])).toEqual([[1, 'setup'], [2, 'setup'], [3, 'setup'], [4, 'check-in']]);
  });

  it('her update is written onto session 1 as her first check-in, after the question it answered, and nothing of setup is', () => {
    expect(herTurns.map((t) => [t.role, t.content])).toEqual([
      ['AI', 'Where do things stand today, as far as you know?'],
      ['PERSON', HER_UPDATE],
    ]);
    expect(amina.messages.find((m: any) => m.n === 4).turnId).toBe('t2');
    expect(amina.messages.filter((m: any) => m.n !== 4).every((m: any) => m.turnId === null)).toBe(true);
  });

  it('every part of setup is hers alone, not only her notes on people', () => {
    expect(amina.setup.objective[0].whoMaySee).toBe('the lead only');
    expect(amina.setup.privateNotes[0].whoMaySee).toBe('the lead only');
  });

  it('her record holds her own update and nothing she said to set it up', () => {
    expect(lines.filter((l) => l.participantId === 'p-amina').map((l) => l.text)).toEqual([HER_UPDATE]);
  });
});

describe('the facts each reader may read from her assessment', () => {
  const words = (reader: TheReader, setting: 'THEIR_OWN' | 'EVERYBODY' = 'THEIR_OWN') => theFactsIn(amina, reader, setting).map((f) => f.words);

  it('what is shared with everybody in the check-in is her update only', () => {
    expect(words({ kind: 'everybody in the check-in' })).toEqual([HER_UPDATE]);
    expect(words({ kind: 'everybody in the check-in' }, 'EVERYBODY')).toEqual([HER_UPDATE]);
  });

  it('Amina, who runs it, reads all of it', () => {
    expect(words({ kind: 'the lead', judgements: false })).toEqual(expect.arrayContaining([SET_UP, ABOUT_BARAKA, THE_TARGETS, HER_UPDATE]));
  });

  it('Baraka reads none of it as his own', () => {
    expect(words({ kind: 'the person', participantId: 'p-baraka' })).toEqual([]);
  });
});

describe("Rukia's words about her target follow the target setting", () => {
  const words = (reader: TheReader, setting: 'THEIR_OWN' | 'EVERYBODY') => theFactsIn(RUKIAS_ASSESSMENT as any, reader, setting).map((f) => f.words);

  it('where each person sees only their own target, only Rukia and Amina read them, even in a shared report', () => {
    expect(words({ kind: 'everybody in the check-in' }, 'THEIR_OWN')).toEqual([RUKIAS_WORK]);
    expect(words({ kind: 'the person', participantId: 'p-rukia' }, 'THEIR_OWN')).toContain(RUKIAS_TARGET);
    expect(words({ kind: 'the lead', judgements: false }, 'THEIR_OWN')).toContain(RUKIAS_TARGET);
  });

  it('where everybody sees the targets, everybody reads them', () => {
    expect(words({ kind: 'everybody in the check-in' }, 'EVERYBODY')).toContain(RUKIAS_TARGET);
  });
});

/* ---------------------------------------------------------------------------------------------------------------------------------
 * EACH READER, THROUGH THE REAL CODE.
 * ------------------------------------------------------------------------------------------------------------------------------- */

const checkInsWithTheirAssessments = (): any[] => [
  { ...answered('p-amina', 1, '2026-09-01T09:30:00Z'), sessionReport: amina },
  { ...answered('p-rukia', 1), sessionReport: RUKIAS_ASSESSMENT },
  answered('p-baraka', 1),
];

describe('Baraka, on his team, reads none of her setup and none of Rukia\'s target words', () => {
  it('on the board', async () => {
    const board = await boardAs({ checkIns: checkInsWithTheirAssessments(), lines, report: A_RELEASED_REPORT, whoSeesTargets: 'THEIR_OWN' }, ...BARAKA);
    expect(read(board)).not.toMatch(SETUP_WORDS);
    expect(read(board)).not.toMatch(RUKIAS_TARGET_WORDS);
  });

  it('Rukia reads none of Amina\'s setup on her board', async () => {
    const board = await boardAs({ checkIns: checkInsWithTheirAssessments(), lines, report: A_RELEASED_REPORT, whoSeesTargets: 'THEIR_OWN' }, ...RUKIA);
    expect(read(board)).not.toMatch(SETUP_WORDS);
  });

  it('on My work', async () => {
    const page = await readMyWork(myWorkDatabase(), null, { groundId: 'g-1', userId: 'u-baraka' }, new Date('2026-10-02T12:00:00Z'));
    expect(read(page)).not.toMatch(SETUP_WORDS);
    expect(read(page)).not.toMatch(RUKIAS_TARGET_WORDS);
  });

  it('on the shared session report, once it is released', async () => {
    const served = await theReports().sessionReport('g-1', 1, 'u-baraka', 'org-1');
    expect(read(served)).not.toMatch(SETUP_WORDS);
    expect(read(served)).not.toMatch(RUKIAS_TARGET_WORDS);
  });

  it('on his own report, before it is released', async () => {
    const served = await theReports({ released: false }).sessionReport('g-1', 1, 'u-baraka', 'org-1');
    expect(read(served)).not.toMatch(SETUP_WORDS);
    expect(read(served)).not.toMatch(RUKIAS_TARGET_WORDS);
  });

  it('on the "Against the target" band', async () => {
    const served = await theReports().whereAgainstSuccess('g-1', 'u-baraka', 'org-1');
    expect(read(served)).not.toMatch(SETUP_WORDS);
    expect(read(served)).not.toMatch(RUKIAS_TARGET_WORDS);
  });

  it('in Ask', async () => {
    const [doc] = await theRecordTheyMayRead(askDatabase(), { organizationId: 'org-1', userId: 'u-baraka' }, new Date('2026-10-02T12:00:00Z'));
    expect(doc.content).not.toMatch(SETUP_WORDS);
    expect(doc.content).not.toMatch(RUKIAS_TARGET_WORDS);
  });
});

describe('the readers who may read it still do', () => {
  it('Rukia reads her own words about her target on the "Against the target" band', async () => {
    const served = await theReports().whereAgainstSuccess('g-1', 'u-rukia', 'org-1');
    expect(read(served)).toContain(RUKIAS_TARGET.replace(/\.$/, ''));
  });

  it('Amina reads Rukia\'s target words on the band, and her own setup in Ask', async () => {
    expect(read(await theReports().whereAgainstSuccess('g-1', 'u-amina', 'org-1'))).toContain(RUKIAS_TARGET.replace(/\.$/, ''));
    const [doc] = await theRecordTheyMayRead(askDatabase(), { organizationId: 'org-1', userId: 'u-amina' }, new Date('2026-10-02T12:00:00Z'));
    expect(doc.content).toContain(ABOUT_BARAKA);
    expect(doc.content).toContain(HER_UPDATE);
  });

  it('where everybody sees the targets, Baraka reads Rukia\'s words about hers', async () => {
    const served = await theReports({ whoSeesTargets: 'EVERYBODY' }).whereAgainstSuccess('g-1', 'u-baraka', 'org-1');
    expect(read(served)).toContain(RUKIAS_TARGET.replace(/\.$/, ''));
    expect(read(served)).not.toMatch(SETUP_WORDS);
  });
});

/* ---------------------------------------------------------------------------------------------------------------------------------
 * THE DATABASES THE READERS ARE GIVEN.
 * ------------------------------------------------------------------------------------------------------------------------------- */

const PEOPLE = [
  { id: 'p-amina', userId: 'u-amina', partyType: 'INITIATOR', email: 'amina@x.test', managingOnly: false, roleAsDescribed: null, remitAsGiven: null, nameGiven: null, organisationGiven: null, createdAt: new Date('2026-09-01T09:00:00Z'), user: { firstName: 'Amina', lastName: 'Wanjiru' }, detectedFunction: null, detectedFunctionConfidence: null },
  { id: 'p-rukia', userId: 'u-rukia', partyType: 'PARTICIPANT', email: 'rukia@x.test', managingOnly: false, roleAsDescribed: null, remitAsGiven: null, nameGiven: null, organisationGiven: null, createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: 'Rukia', lastName: 'Mwangi' }, detectedFunction: null, detectedFunctionConfidence: null },
  { id: 'p-baraka', userId: 'u-baraka', partyType: 'PARTICIPANT', email: 'baraka@x.test', managingOnly: false, roleAsDescribed: null, remitAsGiven: null, nameGiven: null, organisationGiven: null, createdAt: new Date('2026-09-01T10:01:00Z'), user: { firstName: 'Baraka', lastName: 'Otieno' }, detectedFunction: null, detectedFunctionConfidence: null },
];

/* The record lines a query asks for: by person, by session, and without a colleague's target words where the query leaves them out. */
function theLinesAskedFor(where: any): any[] {
  const matches = (l: any, w: any): boolean => {
    if (!w) return true;
    if (w.OR && !w.OR.some((o: any) => matches(l, o))) return false;
    /* Prisma takes NOT as one clause or a list; a line about somebody, or one that cannot be true, is read as Prisma reads it. */
    if (w.NOT && [].concat(w.NOT).some((n: any) => matches(l, n))) return false;
    if (w.aboutParticipantId !== undefined && (w.aboutParticipantId?.not === null ? !l.aboutParticipantId || (w.aboutParticipantId.notIn ?? []).includes(l.aboutParticipantId) : false)) return false;
    if (w.standing !== undefined && l.standing !== w.standing?.equals) return false;
    if (w.type && l.type !== w.type) return false;
    if (w.participantId?.in && !w.participantId.in.includes(l.participantId)) return false;
    if (typeof w.participantId === 'string' && l.participantId !== w.participantId) return false;
    if (w.participantId?.not && l.participantId === w.participantId.not) return false;
    if (w.checkInId && l.checkInId !== w.checkInId) return false;
    const n = w.checkIn?.sessionNumber;
    if (typeof n === 'number' && l.checkIn.sessionNumber !== n) return false;
    if (n?.in && !n.in.includes(l.checkIn.sessionNumber)) return false;
    if (n?.lte && l.checkIn.sessionNumber > n.lte) return false;
    return true;
  };
  return structuredClone(lines.filter((l) => matches(l, where)));
}

const emptyModel = () => ({ findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), groupBy: jest.fn(async () => []) });
const withEmptyModels = (target: any) => new Proxy(target, {
  get(t: any, prop: string) {
    if (!(prop in t) && typeof prop === 'string' && !prop.startsWith('$') && prop !== 'then') t[prop] = emptyModel();
    return t[prop];
  },
});
const assessmentsAskedFor = (where: any) => checkInsWithTheirAssessments()
  .filter((c) => c.sessionReport && (!where?.participantId?.in || where.participantId.in.includes(c.participantId)))
  .map((c) => ({ ...c, sessionReport: structuredClone(c.sessionReport) }));

function theReports(over: { released?: boolean; whoSeesTargets?: string } = {}) {
  const ground = {
    id: 'g-1', organizationId: 'org-1', initiatorId: 'u-amina', createdByUserId: 'u-amina', scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY', timelineDays: 28,
    brief: null, peersVisibleToEachOther: true, whoSeesTargets: over.whoSeesTargets ?? 'THEIR_OWN', startedFrom: null, label: 'The team, Q3',
    objectives: [{ name: 'Unit sales', ownerParticipantId: 'p-rukia', target: 20 }],
    report: over.released === false
      ? { agreements: [], divergences: [], centralQuestion: null, releasedAt: null, releasedSessions: [], findings: [], sharedAs: null }
      : { agreements: [], divergences: [], centralQuestion: null, releasedAt: new Date('2026-09-03T17:00:00Z'), releasedSessions: [1], findings: [], sharedAs: null },
    participants: PEOPLE,
  };
  const prisma: any = withEmptyModels({
    ground: { findUnique: jest.fn(async () => structuredClone(ground)), findFirst: jest.fn(async () => structuredClone(ground)) },
    user: { findUnique: jest.fn(async ({ select }: any) => (select && ('awaitingOrgApproval' in select || 'awaitingSeat' in select) ? { awaitingOrgApproval: false, awaitingSeat: false } : { role: 'MEMBER', organizationId: 'org-1' })) },
    groundParticipant: {
      findMany: jest.fn(async () => PEOPLE.map((p) => ({ ...p, checkIns: [{ status: 'COMPLETED' }] }))),
      findFirst: jest.fn(async ({ where }: any) => PEOPLE.find((p) => !where?.userId || p.userId === where.userId) ?? null),
      findUnique: jest.fn(async () => null),
    },
    recordEntry: { findMany: jest.fn(async ({ where }: any = {}) => theLinesAskedFor(where)), count: jest.fn(async () => lines.length) },
    checkIn: {
      findMany: jest.fn(async ({ where, select }: any = {}) => (select?.sessionReport ? assessmentsAskedFor(where) : checkInsWithTheirAssessments().map((c) => ({ ...c, sessionReport: undefined })))),
      findFirst: jest.fn(async () => ({ specificityLevel: null, sessionNumber: 1 })),
      count: jest.fn(async () => 3),
    },
    groundBaseline: { findFirst: jest.fn(async () => null) },
  });
  return new ReportsService(prisma, {} as any, {} as any, {} as any, { get: () => 'http://localhost:5173' } as any, { emit: () => Promise.resolve() } as any, { getSessionProgress: jest.fn(async () => null) } as any, { tell: async () => [] } as any);
}

function myWorkDatabase(): any {
  const ground = {
    id: 'g-1', label: 'The team, Q3', organizationId: 'org-1', initiatorId: 'u-amina', scenario: 'OKR_ALIGNMENT', kindOfWork: 'sales team', peersVisibleToEachOther: true,
    whoSeesTargets: 'THEIR_OWN', initiator: { firstName: 'Amina', lastName: 'Wanjiru' }, organization: { timeZone: 'Africa/Nairobi' }, participants: PEOPLE,
  };
  return withEmptyModels({
    organization: { findUnique: jest.fn(async () => ({ release1bTabsOn: true, personJudgementsOn: true })) },
    ground: { findFirst: jest.fn(async () => structuredClone(ground)), findUnique: jest.fn(async () => structuredClone(ground)) },
    recordEntry: { findMany: jest.fn(async ({ where }: any = {}) => theLinesAskedFor(where)) },
    checkIn: { findMany: jest.fn(async ({ where }: any = {}) => checkInsWithTheirAssessments().filter((c) => !where?.participantId || c.participantId === where.participantId || where.participantId?.in?.includes(c.participantId))) },
  });
}

function askDatabase(): any {
  return withEmptyModels({
    organization: { findUnique: jest.fn(async () => ({ personJudgementsOn: true })) },
    ground: { findMany: jest.fn(async () => [{ id: 'g-1', label: 'The team, Q3', initiatorId: 'u-amina', cadence: 'WEEKLY', cadenceDays: [1], cadenceAnchorDay: 1, workingDays: [1, 2, 3, 4, 5] }]), findUnique: jest.fn(async () => ({ whoSeesTargets: 'THEIR_OWN' })) },
    groundParticipant: { findMany: jest.fn(async ({ where }: any) => PEOPLE.filter((p) => !where?.userId || p.userId === where.userId).map((p) => ({ id: p.id, groundId: 'g-1', userId: p.userId, email: p.email, nameGiven: null }))) },
    user: { findMany: jest.fn(async ({ where }: any) => PEOPLE.filter((p) => where.id.in.includes(p.userId)).map((p) => ({ id: p.userId, ...p.user }))) },
    checkIn: { findMany: jest.fn(async ({ where }: any) => assessmentsAskedFor(where)) },
  });
}
