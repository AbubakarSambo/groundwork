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
const person = (id: string, userId: string, first: string, last: string, partyType: PartyType = PartyType.PARTICIPANT) => ({
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
  scenario?: GroundScenario;
  peersVisibleToEachOther?: boolean;
  commitments?: any[];
  dependencies?: any[];
  checkIns?: any[];
  lines?: any[];
  objectives?: any[];
  closedAt?: Date | null;
  createdByUserId?: string;
  /** A stored report, where a spec reads the parts of the board that are built from it. */
  report?: any;
  /** Who may read the targets (the ground's own setting). */
  whoSeesTargets?: string;
}

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
    initiatorId: 'u-amina', createdByUserId: setup.createdByUserId ?? 'u-amina', organizationId: 'org-1',
    peopleWorkTogether: true, peersVisibleToEachOther: setup.peersVisibleToEachOther ?? true, timelineDays: 28, cadence: 'WEEKLY',
    whoSeesTargets: setup.whoSeesTargets ?? 'THEIR_OWN', label: 'The team, Q3', participants: PEOPLE, checkIns, report: setup.report ?? null,
    dependencies: setup.dependencies ?? [], poll: null, objectives: setup.objectives ?? [], closedAt: setup.closedAt ?? null,
    kindOfWork: null, workStages: null,
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
    checkIn: model({ findMany: jest.fn(async () => clone(checkIns)) }),
    groundCommitment: model({ findMany: jest.fn(async () => clone(setup.commitments ?? [])) }),
    recordEntry: model({ findMany: jest.fn(async (args: any) => {
      if (args?.where?.id?.in) return [];
      return clone(setup.lines ?? []);
    }) }),
  } as any, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
  const reports = Object.create(ReportsService.prototype) as ReportsService;
  return new BoardService(prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports)
    .get('g-1', userId) as Promise<any>;
}
