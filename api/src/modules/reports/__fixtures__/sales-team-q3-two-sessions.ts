import { Logger } from '@nestjs/common';
import { ReportsService } from '../reports.service';

/**
 * "SALES TEAM, Q3", AS THE REVIEW OF 1 OCTOBER READ IT (screens requests 101 and 102).
 *
 * Rukia Otieno runs it and checks in herself. Amani Wekesa, Baraka Mwangi and Neema Achieng check in.
 * Faraji Odhiambo was added, and an admin has not let him in (request 85), so he has never checked
 * in. Nobody's role was written down, so the coverage read says the role was never clearly defined
 * for everybody. Session 1 closed on 27 September and was released; session 2 is answered.
 *
 * Juma Mwangi is an admin who only reads; Grace Njeri set the check-in up for Rukia.
 *
 * `kind: 'review'` is a performance plan about Amani instead, run by Rukia, with Baraka giving a view.
 */
export const at = (d: string) => new Date(`2026-09-${d}T18:00:00Z`);

const person = (id: string, userId: string, first: string, last: string, partyType = 'PARTICIPANT', created = '02', extra: any = {}) => ({
  id, userId, partyType, managingOnly: false, email: `${first.toLowerCase()}@sales.test`, createdAt: at(created),
  nameGiven: null, organisationGiven: null, roleAsDescribed: null, remitAsGiven: null, soloArtifact: null,
  detectedFunction: null, detectedFunctionConfidence: null,
  user: { firstName: first, lastName: last, email: `${first.toLowerCase()}@sales.test`, ...extra },
});

export function salesTeamQ3(kind: 'sales' | 'review' = 'sales') {
  const sales = kind === 'sales';
  const participants = [
    person('p-rukia', 'u-rukia', 'Rukia', 'Otieno', 'INITIATOR', '01'),
    person('p-amani', 'u-amani', 'Amani', 'Wekesa', 'PARTICIPANT', '02'),
    person('p-baraka', 'u-baraka', 'Baraka', 'Mwangi', 'PARTICIPANT', '03'),
    ...(sales ? [
      person('p-neema', 'u-neema', 'Neema', 'Achieng', 'PARTICIPANT', '04'),
      person('p-faraji', 'u-faraji', 'Faraji', 'Odhiambo', 'PARTICIPANT', '05', { awaitingOrgApproval: true }),
    ] : []),
  ];
  /* What each session's synthesis concluded. Session 1's were kept when session 2's were written. */
  const report: any = {
    id: 'r1', groundId: 'g1', createdAt: at('20'), updatedAt: at('29'),
    sharedPicture: 'Two shops are signed.',
    theOpening: null,
    agreements: ['The target is 12 shops.'],
    divergences: [{
      topic: 'Who decides the discount',
      positions: [
        { participantLabel: 'the initiator', view: 'The discount is for the shops to ask for.' },
        { participantLabel: 'Participant B', view: 'The discount needs deciding before I can sell.' },
      ],
      atStake: 'The Kilimani shops wait on the price.',
      settledBy: 'The initiator makes a decision on the discount.',
    }],
    centralQuestion: 'What would bring the price list forward?',
    findings: null, engagement: null, finalSynthesis: null, overTime: null, theJudgement: null, direction: null,
    inferences: [
      { id: 'i1', text: 'SESSION-ONE-INFERENCE Nobody has priced the cookers yet.', participantLabel: 'Participant A', reason: 'Read across two accounts.', sessionNumber: 1 },
      { id: 'i1-2', text: 'SESSION-TWO-INFERENCE The Tuskys order slipped because of the price list.', participantLabel: 'Participant B', reason: 'Drawn from the dates.', sessionNumber: 2 },
    ],
    releasedAt: at('27'), releasedSessions: [1],
  };
  const rounds: Record<number, any> = {
    1: { sessionNumber: 1, sharedPicture: 'Nothing is signed yet.', agreements: ['The target is 12 shops.'], divergences: report.divergences, centralQuestion: 'Which shops come first?', takenAt: at('27'), amendedAt: null, amendedNote: null, finding: null },
  };
  const ground: any = {
    id: 'g1', organizationId: 'org1', initiatorId: 'u-rukia', createdByUserId: 'u-grace',
    scenario: sales ? 'OKR_ALIGNMENT' : 'PIP', cadence: 'WEEKLY', brief: null, label: sales ? 'Sales team, Q3' : 'Amani, the next 60 days',
    status: 'ACTIVE', approvedById: null, peersVisibleToEachOther: null, whoSeesTargets: 'EVERYBODY', timelineDays: 84, runsUntilEnded: false,
    groundAuditLog: null, participants, report, objectives: [], expectThemToUnblock: true,
  };
  const answering = participants.filter((p) => p.id !== 'p-faraji');
  /* Session 1 closed on 27 September, session 2 on the 30th. */
  const checkIns = answering.flatMap((p) => [1, 2].map((n) => ({
    id: `c-${p.id}-${n}`, groundId: 'g1', participantId: p.id, sessionNumber: n, status: 'COMPLETED', isSetup: false, isFinal: false, completedAt: at(n === 1 ? '26' : '30'),
  })));
  const entries = [
    { participantId: 'p-amani', session: 1, text: 'AMANI-ONE I visited four shops in Kilimani.' },
    { participantId: 'p-amani', session: 2, text: 'AMANI-TWO I signed Tuskys Westgate on 29 September.' },
    { participantId: 'p-baraka', session: 1, text: 'BARAKA-ONE I called Naivas Karen.' },
    { participantId: 'p-baraka', session: 2, text: 'BARAKA-TWO Naivas Karen wants a sample cooker.' },
    { participantId: 'p-neema', session: 1, text: 'NEEMA-ONE I mapped the Kilimani shops.' },
    { participantId: 'p-neema', session: 2, text: 'NEEMA-TWO I sent the shop list to Rukia.' },
    { participantId: 'p-rukia', session: 1, text: 'RUKIA-ONE The price list is with finance.' },
    { participantId: 'p-rukia', session: 2, text: 'RUKIA-TWO Finance signed the price list.' },
  ].filter((e) => answering.some((p) => p.id === e.participantId))
    .map((e) => ({
      ...e, type: 'PROGRESS', disputedAt: null, recallBased: false, saidWordForWord: true, anchoredOrigin: null, dimensionThreadKey: null,
      confirmedAt: null, anchoredDocumentId: null, checkInId: `c-${e.participantId}-${e.session}`, createdAt: at(e.session === 1 ? '26' : '30'),
      checkIn: { sessionNumber: e.session, groundId: 'g1' },
    }));
  /* In session 1 Baraka waited on Rukia for a decision on the discount; it was cleared on the 29th. In
     session 2 Amani waits on Rukia for the price list. */
  const dependencies = [
    { id: 'd1', groundId: 'g1', fromParticipantId: 'p-baraka', onParticipantId: 'p-rukia', onLabel: null, what: 'SESSION-ONE-WAIT a decision on the discount', status: 'CLEARED', createdAt: at('24'), clearedAt: at('29'), escalatedAt: null, triedSaid: null, blockerKind: null, sourceCheckInId: 'c-p-baraka-1', namedTheThing: true },
    ...(sales ? [{ id: 'd2', groundId: 'g1', fromParticipantId: 'p-amani', onParticipantId: 'p-rukia', onLabel: null, what: 'SESSION-TWO-WAIT the price list', status: 'WAITING', createdAt: at('29'), clearedAt: null, escalatedAt: null, triedSaid: null, blockerKind: null, sourceCheckInId: 'c-p-amani-2', namedTheThing: true }] : []),
  ];
  return { ground, report, rounds, checkIns, entries, dependencies };
}

const sessionOf = (e: any) => e.session ?? e.sessionNumber ?? e.checkIn?.sessionNumber;

/** Whether a row matches the parts of a `where` the report reads use. */
function matches(e: any, where: any): boolean {
  if (!where) return true;
  if (where.OR) return where.OR.some((w: any) => matches(e, w)) && matches(e, { ...where, OR: undefined });
  if (where.participantId?.in && !where.participantId.in.includes(e.participantId)) return false;
  if (typeof where.participantId === 'string' && where.participantId !== e.participantId) return false;
  const s = where.checkIn?.sessionNumber ?? where.sessionNumber;
  if (typeof s === 'number' && sessionOf(e) !== s) return false;
  if (s?.lte !== undefined && !(sessionOf(e) <= s.lte)) return false;
  if (s?.in && !s.in.includes(sessionOf(e))) return false;
  if (where.status?.in && !where.status.in.includes(e.status)) return false;
  if (typeof where.status === 'string' && where.status !== e.status) return false;
  if (typeof where.isFinal === 'boolean' && !!e.isFinal !== where.isFinal) return false;
  return true;
}

export function serviceFor(kind: 'sales' | 'review' = 'sales') {
  const w = salesTeamQ3(kind);
  const none = { findMany: async () => [], findFirst: async () => null, findUnique: async () => null, count: async () => 0, aggregate: async () => ({ _max: {}, _count: { _all: 0 } }), update: async () => null, updateMany: async () => ({ count: 0 }), create: async () => null, upsert: async () => null };
  const users: Record<string, any> = {
    'u-rukia': { id: 'u-rukia', role: 'MEMBER', organizationId: 'org1', isActive: true, firstName: 'Rukia', lastName: 'Otieno' },
    'u-amani': { id: 'u-amani', role: 'MEMBER', organizationId: 'org1', isActive: true },
    'u-baraka': { id: 'u-baraka', role: 'MEMBER', organizationId: 'org1', isActive: true },
    'u-neema': { id: 'u-neema', role: 'MEMBER', organizationId: 'org1', isActive: true },
    'u-faraji': { id: 'u-faraji', role: 'MEMBER', organizationId: 'org1', isActive: true, awaitingOrgApproval: true },
    'u-juma': { id: 'u-juma', role: 'ADMIN', organizationId: 'org1', isActive: true },
    'u-grace': { id: 'u-grace', role: 'ADMIN', organizationId: 'org1', isActive: true },
  };
  const prisma: any = new Proxy({
    ground: { ...none, findUnique: async () => structuredClone({ ...w.ground, report: w.report }), findFirst: async ({ where }: any) => (where?.id === 'g1' && (!where.organizationId || where.organizationId === 'org1') ? structuredClone({ ...w.ground, report: w.report }) : null) },
    report: { ...none, findUnique: async () => w.report },
    reportRound: {
      ...none,
      findUnique: async ({ where }: any) => w.rounds[where.groundId_sessionNumber.sessionNumber] ?? null,
      findMany: async ({ where }: any = {}) => Object.values(w.rounds).filter((r: any) => !where?.sessionNumber?.lte || r.sessionNumber <= where.sessionNumber.lte),
    },
    checkIn: {
      ...none,
      findMany: async ({ where }: any = {}) => w.checkIns.filter((c) => matches(c, where)),
      findFirst: async ({ where }: any = {}) => w.checkIns.find((c) => matches(c, where)) ?? null,
      count: async ({ where }: any = {}) => w.checkIns.filter((c) => matches(c, where)).length,
      aggregate: async ({ where }: any = {}) => ({ _max: { sessionNumber: Math.max(0, ...w.checkIns.filter((c) => matches(c, where)).map((c) => c.sessionNumber)) || null } }),
    },
    recordEntry: { ...none, findMany: async ({ where }: any = {}) => w.entries.filter((e) => matches(e, where)) },
    groundDependency: { ...none, findMany: async ({ where }: any = {}) => w.dependencies.filter((d) => matches(d, where)) },
    groundParticipant: {
      ...none,
      findMany: async (args: any = {}) => {
        const n = args?.select?.checkIns?.where?.sessionNumber;
        return w.ground.participants.map((p: any) => ({ ...p, checkIns: w.checkIns.filter((c) => c.participantId === p.id && (n === undefined || c.sessionNumber === n)) }));
      },
    },
    /* Each person is a member of the organisation with the role they have above, so a guest can be told from a member (decision 93, row 4). */
    organizationMembership: {
      ...none,
      findUnique: async ({ where }: any) => {
        const u = users[where?.userId_organizationId?.userId];
        return u && where.userId_organizationId.organizationId === u.organizationId ? { role: u.role } : null;
      },
    },
    user: {
      ...none,
      findUnique: async ({ where }: any) => users[where.id] ?? null,
      findMany: async ({ where }: any = {}) => Object.values(users).filter((u: any) => (!where?.id?.in || where.id.in.includes(u.id)) && (where?.awaitingOrgApproval === undefined || !!u.awaitingOrgApproval === where.awaitingOrgApproval)),
    },
  } as any, { get: (t: any, k: string) => (typeof k === 'string' && !k.startsWith('$') ? (t[k] ??= { ...none }) : t[k]) });
  const svc = Object.create(ReportsService.prototype) as any;
  svc.prisma = prisma;
  svc.logger = new Logger('test');
  svc.logger.warn = () => undefined;
  svc.config = { get: () => false };
  svc.grounds = {
    getSessionProgress: async () => ({ completed: 2, total: 2, missingParticipantIds: [], declinedParticipantIds: [] }),
    isSessionReadyForReport: async () => true,
  };
  svc.usage = { emit: async () => undefined };
  svc.tellThemTheReportIsReady = async () => ({ attempted: 0, failed: 0 });
  svc.wordTheReadsFor = async () => [];
  svc.generatePostReportGuides = async () => undefined;
  return { svc: svc as ReportsService, w };
}

/** What one reader is sent for one session's own report, or why they were refused. */
export async function theSessionReportAs(svc: ReportsService, userId: string, sessionNumber: number): Promise<any> {
  try {
    return await svc.sessionReport('g1', sessionNumber, userId, 'org1');
  } catch (e: any) {
    return { refused: e?.constructor?.name ?? "Error", why: String(e?.stack ?? e).slice(0, 800) };
  }
}

/** Every string anywhere in what was sent. */
export function everyString(v: any, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => everyString(x, out));
  else if (v && typeof v === 'object' && !(v instanceof Date)) Object.values(v).forEach((x) => everyString(x, out));
  return out;
}
