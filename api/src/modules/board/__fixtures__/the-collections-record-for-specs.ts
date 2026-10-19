import { MUCHEMI_ORG, MUCHEMI_PEOPLE, MUCHEMI_FEE_NOTES, MUCHEMI_EVIDENCE, muchemiFeeNoteItems, muchemiCheckIns, muchemiLines } from '../../grounds/__fixtures__/muchemi-and-co';
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
}

const asParticipants = (people: Record<string, any>, groundId: string, initiatorUserId: string) => Object.values(people).map((p: any) => ({
  id: p.participantId, userId: p.userId, groundId, nameGiven: null, partyType: p.partyType ?? (p.userId === initiatorUserId ? 'INITIATOR' : 'PARTICIPANT'),
  managingOnly: false, createdAt: new Date('2026-09-01T09:00:00.000Z'), email: p.email, roleAsDescribed: p.jobTitle,
  user: { firstName: p.firstName, lastName: p.lastName, email: p.email },
}));

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
    ground: { findUnique: jest.fn(async ({ where }: any) => world.grounds.find((g) => g.id === where.id) ?? null) },
    user: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    workItem: {
      findMany: jest.fn(async ({ where }: any) => world.items.filter((i) => i.groundId === where.groundId && inList(i.kind, where.kind) && inList(i.ownerParticipantId, where.ownerParticipantId))),
      create: jest.fn(async ({ data }: any) => { const made = { id: `w-${world.items.length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...data }; world.items.push(made); return made; }),
      update: jest.fn(async ({ where, data }: any) => { const i = world.items.find((x) => x.id === where.id); Object.assign(i, data); return i; }),
    },
    itemEvidence: {
      findMany: jest.fn(async ({ where }: any) => world.evidence.filter((e) => e.groundId === where.groundId && inList(e.workItemId, where.workItemId) && (where.countsAsProof === undefined || e.countsAsProof === where.countsAsProof))),
    },
    recordEntry: {
      findMany: jest.fn(async ({ where }: any) => world.lines.filter((l) => (where.checkInId ? l.checkInId === where.checkInId : true)
        && (where.participant?.groundId ? groundOfParticipant(l.participantId) === where.participant.groundId : true)
        && (where.createdAt ? inList(l.createdAt, where.createdAt) : true))),
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
