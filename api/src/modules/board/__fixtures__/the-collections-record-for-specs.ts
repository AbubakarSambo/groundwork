import {
  MUCHEMI_ORG, MUCHEMI_PEOPLE, MUCHEMI_FEE_NOTES, MUCHEMI_EVIDENCE, muchemiFeeNoteItems, muchemiCheckIns, muchemiLines,
  MUCHEMI_LITIGATION, MUCHEMI_LITIGATION_PID, muchemiLitigationCheckIns, muchemiLitigationLines, muchemiLitigationDeadlines, muchemiLitigationWaits,
} from '../../grounds/__fixtures__/muchemi-and-co';
import { LENDER_ORG, LENDER_PEOPLE, LENDER_LOANS, LENDER_EVIDENCE, lenderLoanItems, lenderCheckIns, lenderLines } from '../../grounds/__fixtures__/a-small-lender';

/**
 * A STAND-IN DATABASE FOR THE COLLECTIONS SPECS (Release 2, pull request 2 of 3), holding Muchemi & Co (test) and the small lender
 * (test) exactly as the hand-written fixtures give them. Only the reads the collections board and its reports make are answered,
 * by the same filters the real queries use. No real database, no model.
 */
export interface ACollectionsWorld {
  orgs: any[];
  grounds: any[];
  items: any[];
  evidence: any[];
  checkIns: any[];
  lines: any[];
  ways: any[];
  weekly: any[];
  /** The litigation daily's waits (Release 2, pull request 3 of 3). */
  waits: any[];
}

const asParticipants = (people: Record<string, any>, groundId: string, initiatorUserId: string) => Object.values(people).map((p: any) => ({
  id: p.participantId, userId: p.userId, groundId, nameGiven: null, partyType: p.partyType ?? (p.userId === initiatorUserId ? 'INITIATOR' : 'PARTICIPANT'),
  managingOnly: false, createdAt: new Date('2026-09-01T09:00:00.000Z'), email: p.email, roleAsDescribed: p.jobTitle,
  user: { firstName: p.firstName, lastName: p.lastName, email: p.email },
}));

/**
 * WITH THE LITIGATION DAILY (Release 2, pull request 3 of 3): Muchemi & Co's litigation check-in, its people in their own places
 * (l-wanjiru, l-brian, l-aisha, l-david), its check-ins, lines, deadlines and waits, as the hand-written fixture gives them. Its lines
 * have not been read for the events yet: a spec reads them (fileTheFeeNotesDueOnAnEvent) in the order they were said.
 */
export function theWorldWithTheLitigationDaily(opts: { release2On?: boolean } = {}): ACollectionsWorld {
  const world = theCollectionsWorld({ release2On: opts.release2On });
  const people = Object.fromEntries(Object.entries(MUCHEMI_PEOPLE).filter(([k]) => ['partner', 'brian', 'aisha', 'david'].includes(k)));
  const asHere = Object.fromEntries(Object.entries(people).map(([k, p]: [string, any]) => [k, { ...p, participantId: MUCHEMI_LITIGATION_PID[k === 'partner' ? 'wanjiru' : k] }]));
  world.grounds.push({
    ...MUCHEMI_LITIGATION, createdByUserId: MUCHEMI_LITIGATION.initiatorId, status: 'ACTIVE',
    participants: asParticipants(asHere, MUCHEMI_LITIGATION.id, MUCHEMI_LITIGATION.initiatorId),
  });
  world.checkIns.push(...muchemiLitigationCheckIns());
  world.lines.push(...muchemiLitigationLines());
  world.items.push(...muchemiLitigationDeadlines());
  world.waits.push(...muchemiLitigationWaits());
  return world;
}

export function theCollectionsWorld(opts: { release2On?: boolean; muchemiTypeConfirmed?: boolean } = {}): ACollectionsWorld {
  const on = opts.release2On !== false;
  const muchemiPeople = Object.fromEntries(Object.entries(MUCHEMI_PEOPLE).filter(([k]) => ['partner', 'brian', 'aisha', 'njeri'].includes(k)));
  return {
    orgs: [
      { ...MUCHEMI_ORG, release2CollectionsOn: on, timeZone: 'Africa/Nairobi' },
      { ...LENDER_ORG, release2CollectionsOn: on, timeZone: 'Africa/Nairobi' },
    ],
    grounds: [
      {
        ...MUCHEMI_FEE_NOTES,
        ...(opts.muchemiTypeConfirmed !== false ? { checkInType: 'invoices or fee notes', checkInTypeConfirmedAt: new Date('2026-10-05T08:00:00.000Z') } : {}),
        createdByUserId: MUCHEMI_FEE_NOTES.initiatorId, status: 'ACTIVE',
        participants: asParticipants(muchemiPeople, MUCHEMI_FEE_NOTES.id, MUCHEMI_FEE_NOTES.initiatorId),
      },
      { ...LENDER_LOANS, createdByUserId: LENDER_LOANS.initiatorId, status: 'ACTIVE', participants: asParticipants(LENDER_PEOPLE, LENDER_LOANS.id, LENDER_LOANS.initiatorId) },
    ],
    items: [...muchemiFeeNoteItems(), ...lenderLoanItems()],
    evidence: [...MUCHEMI_EVIDENCE, ...LENDER_EVIDENCE],
    checkIns: [...muchemiCheckIns(), ...lenderCheckIns()],
    lines: [...muchemiLines().map((l) => ({ ...l, groundId: MUCHEMI_FEE_NOTES.id })), ...lenderLines().map((l) => ({ ...l, groundId: LENDER_LOANS.id }))],
    ways: [],
    weekly: [],
    waits: [],
  };
}

const inList = (v: any, cond: any) => (cond === undefined ? true : cond && typeof cond === 'object' && !(cond instanceof Date)
  ? ((cond.in ? cond.in.includes(v) : true) && (cond.notIn ? !cond.notIn.includes(v) : true) && (cond.gte ? v >= cond.gte : true) && (cond.lte ? v <= cond.lte : true) && ('not' in cond ? v !== cond.not : true))
  : v === cond);

/** The stand-in prisma client over a world. */
export function thePrismaFor(world: ACollectionsWorld): any {
  const groundOfCheckIn = (id: string) => world.checkIns.find((c) => c.id === id)?.groundId;
  const groundOfParticipant = (pid: string) => world.grounds.find((g) => g.participants.some((p: any) => p.id === pid))?.id;
  return {
    organization: { findUnique: jest.fn(async ({ where }: any) => world.orgs.find((o) => o.id === where.id) ?? null) },
    ground: {
      findUnique: jest.fn(async ({ where }: any) => world.grounds.find((g) => g.id === where.id) ?? null),
      findMany: jest.fn(async ({ where }: any) => world.grounds.filter((g) => (where?.organizationId === undefined || g.organizationId === where.organizationId) && (where?.scenario === undefined || g.scenario === where.scenario))),
    },
    groundDependency: { findMany: jest.fn(async ({ where }: any) => world.waits.filter((w) => w.groundId === where.groundId && w.status !== 'CLEARED')) },
    groundDocument: { findMany: jest.fn(async () => []) },
    user: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    workItem: {
      findMany: jest.fn(async ({ where }: any) => world.items.filter((i) => i.groundId === where.groundId && inList(i.kind, where.kind) && inList(i.ownerParticipantId, where.ownerParticipantId))),
      create: jest.fn(async ({ data }: any) => { const made = { id: `w-${world.items.length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...data }; world.items.push(made); return made; }),
      update: jest.fn(async ({ where, data }: any) => { const i = world.items.find((x) => x.id === where.id); Object.assign(i, data); return i; }),
      findFirst: jest.fn(async ({ where }: any) => world.items.find((i) => i.id === where.id && (where.groundId === undefined || i.groundId === where.groundId) && (where.kind === undefined || i.kind === where.kind)) ?? null),
    },
    itemEvidence: {
      findMany: jest.fn(async ({ where }: any) => world.evidence.filter((e) => e.groundId === where.groundId && inList(e.workItemId, where.workItemId) && (where.countsAsProof === undefined || e.countsAsProof === where.countsAsProof))),
    },
    recordEntry: {
      findMany: jest.fn(async ({ where }: any) => world.lines.filter((l) => (where.checkInId ? l.checkInId === where.checkInId : true)
        && (where.participant?.groundId ? groundOfParticipant(l.participantId) === where.participant.groundId : true)
        && (where.participantId !== undefined ? l.participantId === where.participantId : true)
        && (where.createdAt ? inList(l.createdAt, where.createdAt) : true))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())),
    },
    checkIn: {
      findMany: jest.fn(async ({ where }: any) => world.checkIns.filter((c) => c.groundId === where.groundId && inList(c.status, where.status) && inList(c.participantId, where.participantId) && inList(c.sessionNumber, where.sessionNumber)
        && (where.isSetup === undefined || c.isSetup === where.isSetup) && (where.completedAt ? inList(c.completedAt, where.completedAt) : true))),
    },
    groundContextItem: { findMany: jest.fn(async ({ where }: any) => world.ways.filter((w) => w.groundId === where.groundId)) },
    _groundOfCheckIn: groundOfCheckIn,
  };
}

export const WANJIRU = { runsIt: true, participantId: 'p-wanjiru' };
export const BRIAN = { runsIt: false, participantId: 'p-brian' };
export const AISHA = { runsIt: false, participantId: 'p-aisha' };
export const NJERI = { runsIt: false, participantId: 'p-njeri' };
export const HALIMA = { runsIt: true, participantId: 'p-halima' };
export const MUSA = { runsIt: false, participantId: 'p-musa' };
export const PETER = { runsIt: false, participantId: 'p-peter' };
export const ACHIENG = { runsIt: false, participantId: 'p-achieng' };

/** Each person in the litigation daily, as a reader there. Wanjiru runs it. */
export const LIT_WANJIRU = { runsIt: true, participantId: 'l-wanjiru', userId: 'u-wanjiru' };
export const LIT_BRIAN = { runsIt: false, participantId: 'l-brian', userId: 'u-brian' };
export const LIT_AISHA = { runsIt: false, participantId: 'l-aisha', userId: 'u-aisha' };
export const LIT_DAVID = { runsIt: false, participantId: 'l-david', userId: 'u-david' };
