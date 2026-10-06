import { GroundsService } from './grounds.service';
import { boardAs, person, PEOPLE, AMINA } from '../board/the-switchboards-sections-harness';

/**
 * REQUEST 101 (f): ONE COUNT FOR THE SESSIONS, FROM THE BOARD'S OWN CLOCK.
 *
 * The lead's header read "Session 1 of 12. ... It went back to session 1, because somebody new was added."
 * while the Report tab listed session 2, because the screen counted the header on its own. GET /grounds/:id
 * now serves `sessionClock`, the board's count: the open round among the people who check in, capped at the
 * last planned session, with the header's sentence and the line for a later session somebody has started.
 * Rukia and Baraka have done sessions 1 and 2; Zawadi was added and has not done session 1.
 */
const LEAD = 'u-amina';
const at = (d: string) => new Date(`2026-09-${d}T16:00:00Z`);
const row = (participantId: string, sessionNumber: number, status: string, day?: string) => ({
  id: `c${sessionNumber}-${participantId}`, participantId, sessionNumber, status,
  completedAt: status === 'COMPLETED' && day ? at(day) : null, startedAt: status !== 'NOT_STARTED' && day ? at(day) : null,
  availableFrom: null, isSetup: false,
});
const CHECK_INS = [
  row('p-rukia', 1, 'COMPLETED', '15'), row('p-baraka', 1, 'COMPLETED', '16'),
  row('p-rukia', 2, 'COMPLETED', '29'), row('p-baraka', 2, 'IN_PROGRESS', '30'),
  row('p-zawadi', 1, 'NOT_STARTED'),
];
const ZAWADI = person('p-zawadi', 'u-zawadi', 'Zawadi', 'Njeri');

function getAs(userId: string, role: string, over: any = {}) {
  const ground: any = {
    id: 'g-1', organizationId: 'org-1', scenario: 'OKR_ALIGNMENT', initiatorId: LEAD, createdByUserId: 'u-setup', createdAt: new Date('2026-09-01'),
    timelineDays: 84, cadence: 'WEEKLY', restrictExternalVisibility: false, peersVisibleToEachOther: true, whoSeesTargets: 'THEIR_OWN',
    brief: 'The team, Q3.', toldToParticipants: null, groundAuditLog: null,
    participants: [...PEOPLE, ZAWADI], checkIns: CHECK_INS, resolution: null, patternDetections: [], objectives: [],
    report: { id: 'r1', releasedAt: new Date(), sharedPicture: null, createdAt: new Date() },
    ...over,
  };
  const prisma: any = {
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => []) },
    ground: { findFirst: async () => ground, findUnique: async () => ground },
    user: { findUnique: jest.fn(async () => ({ role, organizationId: 'org-1', isActive: true, firstName: 'X', lastName: 'Y' })) },
    groundParticipant: { findFirst: async () => null, findMany: async () => [] },
    organization: { findUnique: async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false }) },
    leadContextNote: { findMany: async () => [] },
    leadSetupWords: { findUnique: jest.fn(async () => null) },
  };
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any)
    .get('g-1', 'org-1', userId) as Promise<any>;
}

const THE_CLOCK = {
  currentSession: 1,
  plannedSessions: 12,
  says: 'Session 1 of 12.',
  whileOpen: 'Session 2 has started for some people, while session 1 is still open.',
};

describe('request 101 (f): the check-in\'s header counts with the board\'s clock', () => {
  it.each([
    ['Amina, the lead', LEAD, 'MEMBER'],
    ['the admin who set it up', 'u-setup', 'ADMIN'],
    ['Juma, an admin who only reads', 'u-juma', 'ADMIN'],
    ['Rukia, who checks in', 'u-rukia', 'MEMBER'],
    ['Zawadi, who was added', 'u-zawadi', 'MEMBER'],
  ])('%s is sent one count, and no "went back"', async (_who, userId, role) => {
    const got = await getAs(userId, role);
    expect(got.sessionClock).toEqual(THE_CLOCK);
    expect(JSON.stringify(got.sessionClock)).not.toMatch(/went back|somebody new/);
  });

  it('the person reviewed on an evaluation check-in, who sees only themselves, reads the same count', async () => {
    const got = await getAs('u-rukia', 'MEMBER', { scenario: 'PIP', peersVisibleToEachOther: false });
    expect(got.sessionClock).toEqual(THE_CLOCK);
  });

  it('and it is the board\'s own count, for the same rows', async () => {
    const board = await boardAs({ people: [...PEOPLE, ZAWADI], checkIns: CHECK_INS, clock: { timelineDays: 84, cadence: 'WEEKLY' } } as any, ...AMINA);
    expect(board.phaseSpine.currentSession).toBe(THE_CLOCK.currentSession);
    expect(board.phaseSpine.plannedSessions).toBe(THE_CLOCK.plannedSessions);
    expect(board.phaseSpine.sessions.find((s: any) => s.n === 2).says).toBe(THE_CLOCK.whileOpen);
  });

  it('once Zawadi has done session 1, the header moves on and the second line goes', async () => {
    const caughtUp = CHECK_INS.map((c) => (c.participantId === 'p-zawadi' ? row('p-zawadi', 1, 'COMPLETED', '30') : c));
    const got = await getAs(LEAD, 'MEMBER', { checkIns: caughtUp });
    expect(got.sessionClock).toEqual({ currentSession: 2, plannedSessions: 12, says: 'Session 2 of 12.', whileOpen: null });
  });
});
