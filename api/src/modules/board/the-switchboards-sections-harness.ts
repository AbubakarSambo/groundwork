import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';

/**
 * ONE BOARD, READ AS EACH PERSON, FOR THE SWITCHBOARD'S OWN SECTIONS (request 70).
 *
 * Amina runs the check-in, Rukia and Baraka check in, and Juma is an admin of the organisation who
 * only reads. Everything the record holds (commitments, handoffs, check-ins, lines) is given in
 * `Setup`; the answer is the board as that reader is served it.
 */
export const person = (id: string, userId: string, first: string, last: string, partyType: PartyType = PartyType.PARTICIPANT) => ({
  id, userId, partyType, email: `${id}@baridi.test`, roleAsDescribed: 'the team', nameGiven: null, organisationGiven: null,
  remitAsGiven: null, managingOnly: partyType === PartyType.INITIATOR, signedOffAt: null,
  createdAt: new Date(partyType === PartyType.INITIATOR ? '2026-09-01T09:00:00Z' : '2026-09-01T10:00:00Z'),
  user: { firstName: first, lastName: last },
});
export const PEOPLE = [
  person('p-amina', 'u-amina', 'Amina', 'Wanjiru', PartyType.INITIATOR),
  person('p-rukia', 'u-rukia', 'Rukia', 'Mwangi'),
  person('p-baraka', 'u-baraka', 'Baraka', 'Otieno'),
];

export const AMINA = ['u-amina', 'MEMBER'] as const;
export const RUKIA = ['u-rukia', 'MEMBER'] as const;
export const BARAKA = ['u-baraka', 'MEMBER'] as const;
export const JUMA = ['u-juma', 'ADMIN'] as const;
/** The admin who set the check-in up for its lead, and so reads it as the lead does. */
export const SETUP_ADMIN = ['u-setup', 'ADMIN'] as const;

export interface Setup {
  /**
   * Whether the waits are also answered where they are read on their own (what this session holds), by the
   * check-in that raised them. Off by default, so the specs written before it read the boards they always read.
   */
  waitsAreReadOnTheirOwn?: boolean;
  /** What the room is about, as the board listener stores it, with people's names, and the round it was read at. */
  room?: any;
  scenario?: GroundScenario;
  peersVisibleToEachOther?: boolean;
  commitments?: any[];
  dependencies?: any[];
  checkIns?: any[];
  lines?: any[];
  objectives?: any[];
  /** The lead's own goals for a person (PersonObjective), with whether the lead has told them. */
  personObjectives?: any[];
  closedAt?: Date | null;
  /** What people typed, as conversation turns the person wrote (role PERSON). */
  turns?: { checkInId: string; content: string }[];
  createdByUserId?: string;
  /** A stored report, where a spec reads the parts of the board that are built from it. */
  report?: any;
  /** Who may read the targets (the ground's own setting). */
  whoSeesTargets?: string;
  /** What the lead called the check-in. */
  label?: string;
  /** Other people than Amina, Rukia and Baraka, with the sign-in of whoever runs it. */
  people?: any[];
  initiatorId?: string;
  /** Each target's count at its first session (GroundObjectiveSnapshot), where it started. */
  snapshots?: { objectiveId: string; count: number }[];
  /** Rows of checkInGap: what a check-in asked twice and did not get (request 107 a). */
  gaps?: any[];
  /** The kind of work (request 76), and its records (WorkItem rows). */
  kindOfWork?: string | null;
  items?: any[];
  /** Numbers from another system about what this check-in is about (ProductMetric rows), and its subject. */
  metrics?: any[];
  subjectExternalId?: string | null;
  /** The documents on the check-in (GroundDocument rows). */
  documents?: any[];
  /** The check-in's clock (request 108): when it was made, starts and ends, how long it runs and how often. */
  clock?: { now?: Date; createdAt?: Date; startsAt?: Date | null; endsAt?: Date | null; timelineDays?: number; cadence?: string; runsUntilEnded?: boolean };
  /** Whether the lead has recorded how it ended (request 108 d). */
  status?: string;
  endState?: string | null;
  resolvedAt?: Date | null;
  /** The lines a record came from, read by id (RecordEntry rows with their mark's fields), where a spec reads each record's mark. */
  recordLines?: any[];
  /** What the lead wrote down on the Context page (GroundContextItem rows: kind, audience, text). */
  contextItems?: { id?: string; kind: string; audience?: string; text: string; closedAt?: Date | null }[];
  /** A colleague naming somebody's work (WorkMention rows: sourceParticipantId, aboutParticipantId, kind, text). */
  mentions?: any[];
  /** Stored patterns (PatternDetection rows), as the detector keeps them. */
  patterns?: any[];
  /** Whole models a spec supplies itself (for example `platformSetting` or `groundParticipant`), replacing the empty ones. */
  prismaExtras?: Record<string, any>;
  /** Anything else the ground row holds (for example `startedFrom: 'anchor'`). */
  groundRow?: Record<string, any>;
}

/**
 * A REPORT THAT HAS BEEN RELEASED TO THE PEOPLE IN THE CHECK-IN. A person who checks in reads the team's
 * picture (the quick read, where people differ, the forecast) only once it is shared (request 105).
 */
export const A_RELEASED_REPORT = {
  releasedAt: new Date('2026-09-23T17:00:00Z'), sharedAs: null, theOpening: 'Everybody has checked in.', networkPicture: null,
  sharedPicture: 'Everybody has checked in.', agreements: [], divergences: [], centralQuestion: null, engagement: {}, findings: [],
  createdAt: new Date('2026-09-20T09:00:00Z'), updatedAt: new Date('2026-09-23T15:02:00Z'),
};

export const commitment = (id: string, participantId: string | null, text: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', participantId, text, outcome: null, whenSaid: null, explicit: true, status: 'UNKNOWN', source: 'CHECK_IN',
  authorUserId: null, statedInSession: 1, saidWordForWord: false, whenSaidWordForWord: false, saidAgainIn: [],
  settledAt: null, settledInCheckInId: null, settledBy: null, createdAt: new Date('2026-09-02T16:00:00Z'), updatedAt: new Date('2026-09-02T16:00:00Z'), ...more,
});

export const handoff = (id: string, from: string, what: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', fromParticipantId: from, onParticipantId: null, onLabel: null, what, status: 'BLOCKING', then: null,
  triedSaid: null, escalatedAt: null, dueSaid: null, dueOn: null, clearedAt: null, namedTheThing: true,
  createdAt: new Date('2026-09-03T09:00:00Z'), updatedAt: new Date('2026-09-03T09:00:00Z'), ...more,
});

export const answered = (participantId: string, n: number, on = '2026-09-02T16:00:00Z') => ({
  id: `c${n}-${participantId}`, participantId, sessionNumber: n, status: 'COMPLETED', isSetup: false,
  completedAt: new Date(on), specificityLevel: 'specific', specificityDimensions: { checkable: 'specific' },
});

export function boardAs(setup: Setup, userId: string, role: string): Promise<any> {
  const checkIns = setup.checkIns ?? [answered('p-rukia', 1), answered('p-baraka', 1)];
  const ground: any = {
    id: 'g-1', scenario: setup.scenario ?? GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED,
    initiatorId: setup.initiatorId ?? 'u-amina', createdByUserId: setup.createdByUserId ?? setup.initiatorId ?? 'u-amina', organizationId: 'org-1',
    peopleWorkTogether: true, peersVisibleToEachOther: setup.peersVisibleToEachOther ?? true, timelineDays: 28, cadence: 'WEEKLY',
    whoSeesTargets: setup.whoSeesTargets ?? 'THEIR_OWN', label: setup.label ?? 'The team, Q3', participants: setup.people ?? PEOPLE, checkIns, report: setup.report ?? null,
    dependencies: setup.dependencies ?? [], poll: null, objectives: setup.objectives ?? [], closedAt: setup.closedAt ?? null,
    kindOfWork: setup.kindOfWork ?? null, workStages: null, subjectExternalId: setup.subjectExternalId ?? null,
    ...(({ now: _now, ...rest }) => rest)(setup.clock ?? {}),
    ...(setup.room ? { whatTheRoomIsAbout: setup.room, whatTheRoomIsAboutSession: 2 } : {}),
    ...(setup.groundRow ?? {}),
    ...(setup.status ? { status: setup.status } : {}),
    ...(setup.endState !== undefined ? { endState: setup.endState } : {}),
    ...(setup.resolvedAt !== undefined ? { resolvedAt: setup.resolvedAt } : {}),
  };
  const reads = {
    findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })),
  };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own });
  const clone = (v: any) => structuredClone(v);
  const prisma = new Proxy({
    ground: model({ findUnique: jest.fn(async () => clone(ground)) }),
    user: model({ findUnique: jest.fn(async () => ({ role, organizationId: 'org-1' })) }),
    /* The session the stored report holds now is the highest anybody has finished (decision 76, item 4). */
    checkIn: model({
      findMany: jest.fn(async () => clone(checkIns)),
      aggregate: jest.fn(async () => ({ _max: { sessionNumber: Math.max(1, ...checkIns.filter((c: any) => c.status === 'COMPLETED' && !c.isSetup).map((c: any) => c.sessionNumber ?? 1)) } })),
    }),
    groundObjectiveSnapshot: model({ findMany: jest.fn(async () => clone(setup.snapshots ?? [])) }),
    /* The targets, read on their own too (what this session holds), as the database would give them. */
    groundObjective: model({ findMany: jest.fn(async () => clone(setup.objectives ?? [])) }),
    conversationTurn: model({ findMany: jest.fn(async (args: any) => clone((setup.turns ?? []).filter((t) => (args?.where?.checkInId?.in ?? []).includes(t.checkInId)))) }),
    personObjective: model({ findMany: jest.fn(async (args: any) => clone((setup.personObjectives ?? []).filter((o: any) => !args?.where?.awareness || o.awareness === args.where.awareness))) }),
    groundCommitment: model({ findMany: jest.fn(async () => clone(setup.commitments ?? [])) }),
    ...(setup.waitsAreReadOnTheirOwn ? {
      groundDependency: model({ findMany: jest.fn(async (args: any) => clone((setup.dependencies ?? [])
        .filter((d: any) => !args?.where?.sourceCheckInId?.in || args.where.sourceCheckInId.in.includes(d.sourceCheckInId))
        .filter((d: any) => !args?.where?.status?.in || args.where.status.in.includes(d.status))
        .filter((d: any) => !(args?.where && 'clearedAt' in args.where) || !d.clearedAt))) }),
    } : {}),
    checkInGap: model({ findMany: jest.fn(async () => clone(setup.gaps ?? [])) }),
    workMention: model({ findMany: jest.fn(async () => clone(setup.mentions ?? [])) }),
    patternDetection: model({ findMany: jest.fn(async () => clone(setup.patterns ?? [])) }),
    workItem: model({ findMany: jest.fn(async () => clone(setup.items ?? [])) }),
    groundDocument: model({ findMany: jest.fn(async (args: any) => clone((setup.documents ?? []).filter((d: any) => !args?.where?.id?.in || args.where.id.in.includes(d.id)))) }),
    productMetric: model({ findMany: jest.fn(async (args: any) => clone((setup.metrics ?? []).filter((m: any) => !args?.where?.subjectExternalId || m.subjectExternalId === args.where.subjectExternalId))) }),
    groundContextItem: model({ findMany: jest.fn(async (args: any) => clone((setup.contextItems ?? [])
      .filter((c) => !c.closedAt)
      .filter((c) => !args?.where?.kind || c.kind === args.where.kind)
      .filter((c) => !args?.where?.audience || (c.audience ?? 'EVERYONE') === args.where.audience)
      .map((c) => ({ ...(c.id ? { id: c.id } : {}), text: c.text })))) }),
    recordEntry: model({ findMany: jest.fn(async (args: any) => {
      if (args?.where?.id?.in) return clone((setup.recordLines ?? []).filter((l: any) => args.where.id.in.includes(l.id)).map((l: any) => ({ disputedAt: null, type: 'PROGRESS', ...l })));
      return clone(setup.lines ?? []);
    }) }),
    ...(setup.prismaExtras ?? {}),
  } as any, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
  const reports = Object.create(ReportsService.prototype) as ReportsService;
  return new BoardService(prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports)
    .get('g-1', userId, undefined, { now: setup.clock?.now ?? THE_BOARDS_CLOCK }) as Promise<any>;
}

/** The clock every board in these tests is read at, unless a spec gives its own, so a date reads the same every year. */
export const THE_BOARDS_CLOCK = new Date('2026-10-02T12:00:00Z');

/*
 * THE SALES RUN (api/journey/all-24/re-f/sales.json, "Credit sales against this quarter target"). Bisi
 * Adeyemi runs it; Femi Okonkwo, Ngozi Eze and Kwame Mensah check in. Every commitment's words below are
 * word for word what that person typed in the run; the waits are what they said they were waiting for.
 */
export const SALES_PEOPLE = [
  person('p-bisi', 'u-bisi', 'Bisi', 'Adeyemi', PartyType.INITIATOR),
  person('p-femi', 'u-femi', 'Femi', 'Okonkwo'),
  person('p-ngozi', 'u-ngozi', 'Ngozi', 'Eze'),
  person('p-kwame', 'u-kwame', 'Kwame', 'Mensah'),
];
export const BISI = ['u-bisi', 'MEMBER'] as const;
export const FEMI = ['u-femi', 'MEMBER'] as const;
export const NGOZI = ['u-ngozi', 'MEMBER'] as const;
export const KWAME = ['u-kwame', 'MEMBER'] as const;

export const SALES_RUN: Setup = {
  people: SALES_PEOPLE,
  initiatorId: 'u-bisi',
  label: 'Credit sales against this quarter target',
  checkIns: [
    answered('p-femi', 1, '2026-09-02T16:00:00Z'), answered('p-ngozi', 1, '2026-09-02T17:00:00Z'), answered('p-kwame', 1, '2026-09-02T18:00:00Z'),
    answered('p-femi', 2, '2026-09-16T16:00:00Z'), answered('p-ngozi', 2, '2026-09-16T17:00:00Z'), answered('p-kwame', 2, '2026-09-16T18:00:00Z'),
  ],
  turns: [
    { checkInId: 'c2-p-ngozi', content: 'I don\'t have a date. I\'m waiting for Mr. Adebayo.' },
    { checkInId: 'c2-p-femi', content: 'Nothing has changed with the 31 applications. They\'re still waiting for the bank statements.' },
  ],
  commitments: [
    commitment('k-bisi', 'p-bisi', 'I\'ll follow up directly with the committee members.', { statedInSession: 2, saidWordForWord: true, createdAt: new Date('2026-09-16T15:00:00Z') }),
    commitment('k-femi', 'p-femi', 'I will visit a few of them again this week to see if I can collect the statements myself.', { statedInSession: 2, whenSaid: 'this week', saidWordForWord: true, whenSaidWordForWord: true, createdAt: new Date('2026-09-16T16:00:00Z') }),
    commitment('k-ngozi', 'p-ngozi', 'I will continue to follow up with the Head of Credit.', { statedInSession: 2, whenSaid: 'tomorrow', saidWordForWord: true, whenSaidWordForWord: true, createdAt: new Date('2026-09-16T17:00:00Z') }),
    commitment('k-kwame', 'p-kwame', 'I\'ll be following up with each client directly over the next week to chase down the missing documents.', { statedInSession: 1, whenSaid: 'over the next week', saidWordForWord: true, status: 'DONE', settledBy: 'SAID', settledAt: new Date('2026-09-16T18:00:00Z'), createdAt: new Date('2026-09-02T18:00:00Z') }),
  ],
  dependencies: [
    handoff('d-ngozi', 'p-ngozi', 'a date for the credit decision', { onLabel: 'Mr. Adebayo', status: 'WAITING', dueSaid: null, sourceCheckInId: 'c2-p-ngozi', createdAt: new Date('2026-09-16T17:00:00Z') }),
    handoff('d-femi', 'p-femi', 'the bank statements', { status: 'BLOCKING', sourceCheckInId: 'c2-p-femi', createdAt: new Date('2026-09-16T16:00:00Z') }),
    handoff('d-kwame', 'p-kwame', 'the approval of five applications', { onParticipantId: 'p-bisi', status: 'WAITING', createdAt: new Date('2026-09-16T18:00:00Z') }),
  ],
};
