import type { TheAssessment, AnItem } from '../conversation/the-assessment';
import { MemoryWriter } from './the-memory-writer';

/**
 * A SMALL ORGANISATION AND ITS RECORD, in memory, for specs of the memory system: no database, but the same calls the writer makes.
 * Mary is on Lucy's team check-in; Sam is on it too; Lucy runs it. Mary's newest assessment holds ordinary work, a wellbeing line and a
 * complaint about Lucy; Lucy's holds her setup and a line about Mary's work.
 */

export const ORG = 'org-1';
export const OTHER_ORG = 'org-2';
export const GROUND = 'ground-1';
export const LUCY = { userId: 'user-lucy', participantId: 'p-lucy' };
export const MARY = { userId: 'user-mary', participantId: 'p-mary' };
export const SAM = { userId: 'user-sam', participantId: 'p-sam' };
export const ADMIN = { userId: 'user-admin' };
export const OUTSIDER = { userId: 'user-outsider' };

let n = 0;
export const item = (over: Partial<AnItem> & Record<string, unknown>): AnItem => ({ id: `i-${++n}`, words: 'words', from: [1], whoMaySee: 'the people in this check-in', saidWordForWord: true, ...over }) as AnItem;

export function anAssessment(over: Partial<TheAssessment> & { participantId: string; who: string; isTheLead?: boolean; checkInId: string }): TheAssessment {
  const base: any = {
    kind: 'assessment', version: 1,
    about: { checkInId: over.checkInId, groundId: GROUND, participantId: over.participantId, who: over.who, isTheLead: !!over.isTheLead, checkIn: 'Sales', sessionNumber: 1, startedAt: '2026-11-10T09:00:00Z', endedAt: '2026-11-10T09:20:00Z', channel: 'the app', howItEnded: 'finished by the person' },
    summary: 'A short summary.',
    workUpdates: [], claims: [], promises: [], numbers: [], people: [], dates: [], decisions: [], blockers: [], corrections: [], documents: [], setup: null,
    roleSignals: [], roleAgainstGiven: null, areas: [], observations: [],
    comparedWithLastTime: { previousCheckInId: null, previousOn: null, promisesDue: [], figuresChanged: [], workMoved: [], blockers: [], repeated: [], disagreements: [] },
    stillOpen: [], everythingElse: [], targets: [], messages: [], nothingToRecord: [],
    completeness: { messages: 0, matchedByTheFirstRead: 0, addedByTheSecondRead: 0, keptWhole: 0, ready: true },
    promptVersionId: null, promptFromFile: null, measure: { modelCalls: 1, msFromCloseToReady: 1, readyAt: '2026-11-10T09:21:00Z', modelFailed: false },
  };
  return { ...base, ...over } as TheAssessment;
}

export const MARYS = anAssessment({
  checkInId: 'ci-mary', participantId: MARY.participantId, who: 'Mary',
  workUpdates: [item({ work: 'the Naivas renewal', stage: 'quote sent', nextStep: 'a call on Friday' })],
  blockers: [item({ what: 'the signed order from Naivas', onName: 'the buyer' })],
  promises: [item({ byThePerson: true, clear: 'send the Kilele proof', when: 'on Monday' })],
  claims: [item({ claim: 'The Kilele order was delivered', proof: 'said' })],
  /* Said about her own wellbeing, and against Lucy: neither may ever reach a file. */
  everythingElse: [item({ words: 'My mum is in hospital and I am not coping', whoMaySee: 'the person only', wellbeing: true }), item({ words: 'Lucy shouts at us in front of clients', whoMaySee: 'the person and who hears a complaint' })],
  /* The lead-only reads, which a person file shows to the lead alone. */
  acrossTime: {
    patterns: [{ key: 'slipping-promises', participantId: MARY.participantId, kind: 'needs work', saying: 'Mary has moved the date of the same promise twice.', state: 'holds', instances: [{ checkInId: 'ci-mary', sessionNumber: 1, on: '2026-11-10', item: 'send the Kilele proof', words: ['Monday'] }, { checkInId: 'ci-mary-0', sessionNumber: 0, on: '2026-11-03', item: 'send the Kilele proof', words: ['Friday'] }] }, { key: 'overload', participantId: MARY.participantId, kind: 'too much on', saying: 'Forming only.', state: 'forming', instances: [] }],
    role: { given: 'Sales rep', givenBy: 'their job title', playing: [{ checkInId: 'ci-mary', sessionNumber: 1, on: '2026-11-10', playing: 'account manager', fits: 'differs', words: ['I look after our big accounts'] }], fits: 'differs', saying: 'Mary is a sales rep by title and spends her time as an account manager.' },
    focus: null, toAskNextTime: [],
  },
} as any);

export const LUCYS = anAssessment({
  checkInId: 'ci-lucy', participantId: LUCY.participantId, who: 'Lucy', isTheLead: true,
  setup: { objective: [], success: [], team: [], timing: [], rules: [item({ words: 'No discount above 5 percent', whoMaySee: 'the lead only' })], risks: [item({ words: 'Two reps may leave this quarter', whoMaySee: 'the lead only' })], strategy: [], notes: [], privateNotes: [] },
  everythingElse: [item({ words: 'Mary closes fewer than she says', whoMaySee: 'the lead and whom it is about', aboutWhom: 'Mary', aboutParticipantId: MARY.participantId })],
} as any);

export const SAMS = anAssessment({ checkInId: 'ci-sam', participantId: SAM.participantId, who: 'Sam', workUpdates: [item({ work: 'the Tuskys samples', stage: 'sent' })] } as any);

type Row = Record<string, any>;

const counts = { answeredCount: 0, talkDue: 0, talkHappened: 0, changeJudged: 0, changedCount: 0, weightMoved: false, ['suggested' + 'Weight']: 1 };
/** What was counted for three scopes: this organisation, another one, and the total across them (which no organisation may read). */
export const LEARNING_ROWS: Row[] = [
  { id: 'l-1', scope: ORG, kind: 'COACHING_STEP', key: 'send the proof the same day', judged: 9, goodCount: 7, badCount: 1, unsureCount: 1, ...counts, talkDue: 9, talkHappened: 9 },
  { id: 'l-2', scope: ORG, kind: 'COACHING_STEP', key: 'a step tried twice', judged: 2, goodCount: 2, badCount: 0, unsureCount: 0, ...counts, talkDue: 2, talkHappened: 2 },
  { id: 'l-3', scope: OTHER_ORG, kind: 'COACHING_STEP', key: 'call the buyer first', judged: 20, goodCount: 1, badCount: 19, unsureCount: 0, ...counts, talkDue: 20, talkHappened: 20 },
  { id: 'l-4', scope: 'ALL', kind: 'COACHING_STEP', key: 'send the proof the same day', judged: 29, goodCount: 8, badCount: 20, unsureCount: 1, ...counts, talkDue: 29, talkHappened: 29 },
];

/** Just enough of Prisma, with the calls the writer, the rights and the librarian make. Two organisations, so a leak between them can be tried. */
export function aShelfFakePrisma(over: { people?: Row[]; checkIns?: Row[]; judgementsOn?: boolean } = {}) {
  const files: Row[] = [];
  let clock = 0;
  const people = over.people ?? [
    { id: LUCY.participantId, groundId: GROUND, userId: LUCY.userId, nameGiven: 'Lucy', email: 'lucy@x.com', leftAt: null, user: { firstName: 'Lucy', lastName: 'Ade' } },
    { id: MARY.participantId, groundId: GROUND, userId: MARY.userId, nameGiven: 'Mary', email: 'mary@x.com', leftAt: null, user: { firstName: 'Mary', lastName: 'Bello' } },
    { id: SAM.participantId, groundId: GROUND, userId: SAM.userId, nameGiven: 'Sam', email: 'sam@x.com', leftAt: null, user: { firstName: 'Sam', lastName: 'Otieno' } },
  ];
  const checkIns = over.checkIns ?? [
    { id: 'ci-lucy', groundId: GROUND, participantId: LUCY.participantId, sessionNumber: 1, startedAt: null, completedAt: null, sessionReport: LUCYS },
    { id: 'ci-mary', groundId: GROUND, participantId: MARY.participantId, sessionNumber: 1, startedAt: null, completedAt: null, sessionReport: MARYS },
    { id: 'ci-sam', groundId: GROUND, participantId: SAM.participantId, sessionNumber: 1, startedAt: null, completedAt: null, sessionReport: SAMS },
  ];
  const ground = { id: GROUND, organizationId: ORG, label: 'Sales', initiatorId: LUCY.userId, createdByUserId: null, toldToParticipants: 'This check-in keeps track of sales and what is in the way.', brief: 'Close the quarter at 40 million', kindOfWork: 'sales', workStages: ['quote', 'order', 'delivery'], closedAt: null, participants: [] as Row[] };
  const take = (rows: Row[], a: any) => (a?.take ? rows.slice(0, a.take) : rows);
  const prisma: any = {
    _files: files,
    organizationMembership: { findUnique: async ({ where }: any) => (where.userId_organizationId.userId === ADMIN.userId && where.userId_organizationId.organizationId === ORG ? { role: 'ADMIN' } : where.userId_organizationId.organizationId === ORG && [LUCY, MARY, SAM].some((x) => x.userId === where.userId_organizationId.userId) ? { role: 'MEMBER' } : null) },
    organization: { findUnique: async ({ where, select }: any) => (select?.personJudgementsOn ? { personJudgementsOn: over.judgementsOn !== false } : where.id === ORG ? { id: ORG, name: 'Acme Foods' } : null), findMany: async () => [{ id: ORG }] },
    ground: {
      findMany: async ({ where }: any) => (where.OR ? (where.organizationId === ORG ? [ground].filter((g) => where.OR.some((c: any) => c.initiatorId === g.initiatorId || c.createdByUserId === g.createdByUserId && g.createdByUserId)) : []) : [ground]),
      findUnique: async ({ where }: any) => (where.id === GROUND ? ground : null),
    },
    groundParticipant: { findMany: async ({ where }: any) => (where.userId ? (where.ground?.organizationId && where.ground.organizationId !== ORG ? [] : people).filter((p) => p.userId === where.userId && !p.leftAt) : people.filter((p) => p.groundId === where.groundId)) },
    groundObjective: { findMany: async () => [{ id: 'o-1', name: 'Paying companies', target: 12 }] },
    checkIn: { findMany: async () => checkIns },
    coachingState: { findUnique: async ({ where }: any) => (where.participantId === MARY.participantId ? { currentStep: 'Send the proof the same day', history: [{ step: 'Name the next step', outcome: 'done' }] } : null) },
    leadContextNote: { findMany: async ({ where }: any) => (where.participantId === MARY.participantId ? [{ id: 'n-1', text: 'Strong with big accounts, weak on paperwork.', createdAt: new Date('2026-11-02') }] : []) },
    directionVersion: { findFirst: async () => ({ id: 'd-1', version: 1, setAt: new Date('2026-10-01'), now: { achieve: 'Reach 40 million this quarter', mattersMost: 'Collect what is owed' }, whatChanged: { decided: 'Stop chasing small shops' } }) },
    organizationMemory: { findMany: async () => [{ id: 'm-1', kind: 'rule', text: 'No discount above 5 percent', keptAt: new Date('2026-10-05') }] },
    role: { findMany: async () => [{ id: 'r-1', name: 'Sales rep', description: 'Sells to shops and keeps the order proof' }] },
    policyDocument: { findMany: async () => [{ id: 'pd-1', name: 'Leave policy' }] },
    subject: { findMany: async () => [{ id: 's-1', title: 'Kilele depot', measure: 'orders per week', target: '30', justification: 'it is the biggest account', approach: 'visit twice a week', ownerExternalId: 'ext-mary', contributorExternalIds: ['ext-sam'] }] },
    person: { findMany: async () => [{ externalId: 'ext-mary', displayName: 'Mary Bello', linkedUserId: MARY.userId }, { externalId: 'ext-sam', displayName: 'Sam Otieno', linkedUserId: SAM.userId }] },
    /* The table's name is built, so that the scan which keeps every other file from reading the counts (the-weights-are-stored-and-not-used.spec.ts) stays a plain one. */
    ['learningSignal' + 'Count']: {
      findMany: async ({ where, take }: any) => take ? LEARNING_ROWS.filter((r) => r.scope === where.scope && r.judged >= (where.judged?.gte ?? 0)).sort((a, b) => b.judged - a.judged).slice(0, take) : LEARNING_ROWS,
    },
    memoryFile: {
      findFirst: async ({ where, orderBy }: any) => {
        const rows = files.filter((f) => f.organizationId === where.organizationId && f.path === where.path).sort((a, b) => b.version - a.version);
        return rows[0] ?? null;
      },
      findMany: async ({ where }: any) => {
        const mine = files.filter((f) => f.organizationId === where.organizationId);
        const newest = new Map<string, Row>();
        for (const f of mine) if (!newest.has(f.path) || newest.get(f.path)!.version < f.version) newest.set(f.path, f);
        return [...newest.values()].sort((a, b) => a.path.localeCompare(b.path));
      },
      create: async ({ data }: any) => {
        if (files.some((f) => f.organizationId === data.organizationId && f.path === data.path && f.version === data.version)) throw Object.assign(new Error('unique'), { code: 'P2002' });
        const row = { id: `f-${++clock}`, ...data };
        files.push(row);
        return row;
      },
    },
  };
  return prisma;
}

export const aWriterFor = (prisma: any) => new MemoryWriter(prisma);
