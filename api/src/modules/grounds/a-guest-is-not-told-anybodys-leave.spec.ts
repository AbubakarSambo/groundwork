import { GroundsService } from './grounds.service';
import { whatNeedsYou } from './what-needs-you';
import { awayUntilAsServed, isFromOutside, theAwayLinesFor } from '../suites/who-is-away';

/**
 * SOMEBODY FROM OUTSIDE THE ORGANISATION IS NEVER TOLD A COLLEAGUE'S LEAVE (1 October 2026, the more
 * private choice, decision 36). Found live on item 6 (journey/memory-requests-and-being-away-live.ts):
 * Peter, a guest from Ouma Agencies on Wairimu's check-in at Baridi Foods, read "Amani is away until
 * Friday 2 October." He now reads nothing about Amani's absence, and the round's count he sees still
 * leaves her out without saying why. People inside the organisation read what they read before.
 *
 * Wairimu runs "Sales team, Q4". Amani is on approved leave until Friday 2 October. Chidi is a
 * colleague in Baridi Foods. Peter is a guest.
 */
const NOW = new Date('2026-10-01T09:00:00Z');
const roles: Record<string, string> = { uWairimu: 'LEAD', uAmani: 'MEMBER', uChidi: 'MEMBER', uPeter: 'GUEST' };
const participants = [
  { id: 'pW', userId: 'uWairimu', email: 'w@baridi.test', partyType: 'INITIATOR', roleAsDescribed: null, managingOnly: false, user: { firstName: 'Wairimu', lastName: 'Njoroge' }, createdAt: new Date('2026-09-01') },
  { id: 'pA', userId: 'uAmani', email: 'a@baridi.test', partyType: 'PARTICIPANT', roleAsDescribed: null, managingOnly: false, user: { firstName: 'Amani', lastName: 'Wekesa' }, createdAt: new Date('2026-09-02') },
  { id: 'pC', userId: 'uChidi', email: 'c@baridi.test', partyType: 'PARTICIPANT', roleAsDescribed: null, managingOnly: false, user: { firstName: 'Chidi', lastName: 'Okeke' }, createdAt: new Date('2026-09-03') },
  { id: 'pP', userId: 'uPeter', email: 'p@ouma.test', partyType: 'PARTICIPANT', roleAsDescribed: null, managingOnly: false, user: { firstName: 'Peter', lastName: 'Ouma' }, createdAt: new Date('2026-09-04') },
];
const checkIns = participants.map((p) => ({ id: `c${p.id}`, participantId: p.id, sessionNumber: 1, status: 'NOT_STARTED', availableFrom: new Date('2026-09-30T06:00:00Z') }));

function aService() {
  const ground: any = {
    id: 'g1', organizationId: 'baridi', initiatorId: 'uWairimu', createdAt: new Date(), scenario: 'OKR_ALIGNMENT', label: 'Sales team, Q4',
    peersVisibleToEachOther: true, timelineDays: 84, cadence: 'WEEKLY', restrictExternalVisibility: false,
    participants, checkIns, resolution: null, patternDetections: [], report: null,
  };
  const prisma: any = {
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => []) },
    ground: { findFirst: async () => ground, findUnique: async () => ground },
    user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'baridi' })) },
    groundParticipant: {
      findFirst: async () => null,
      findMany: async () => participants.map((p) => ({ id: p.id, userId: p.userId, checkIns: [], ground: { organizationId: 'baridi' } })),
    },
    leaveRequest: { findMany: async () => [{ userId: 'uAmani', organizationId: 'baridi', startsOn: new Date('2026-09-29T00:00:00Z'), endsOn: new Date('2026-10-02T00:00:00Z') }] },
    organizationMembership: { findUnique: async ({ where }: any) => (roles[where.userId_organizationId.userId] ? { role: roles[where.userId_organizationId.userId] } : null) },
    organization: { findUnique: async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false }) },
    leadContextNote: { findMany: async () => [] },
    checkIn: { aggregate: async () => ({ _max: { sessionNumber: 1 } }), findMany: async () => [], count: async () => 0 },
  };
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any, undefined);
}

describe('the check-in page, as each person reads who is away', () => {
  beforeAll(() => { jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }); jest.setSystemTime(NOW); });
  afterAll(() => jest.useRealTimers());
  const read = (userId: string) => aService().get('g1', 'baridi', userId) as Promise<any>;

  it('Peter, a guest from another organisation, reads nothing about Amani being away, and the count still leaves her out', async () => {
    const r = await read('uPeter');
    expect(r.whoIsAway).toEqual([]);
    expect(r.sessionProgress.awayUntil).toEqual({});
    expect(r.sessionProgress.total).toBe(3);
    expect(r.sessionProgress.missingParticipantIds).not.toContain('pA');
    expect(JSON.stringify(r)).not.toMatch(/2026-10-02|on leave|is away|2 October/i);
  });

  it('Chidi, a colleague inside Baridi Foods, reads what he read before', async () => {
    const r = await read('uChidi');
    expect(r.whoIsAway.map((w: any) => w.says)).toEqual(['Amani is away until Friday 2 October.']);
  });

  it('Wairimu, the lead, reads the decided sentence', async () => {
    const r = await read('uWairimu');
    expect(r.whoIsAway.map((w: any) => w.says)).toEqual(['Amani is on leave until Friday 2 October, so this round does not wait for Amani.']);
    expect(r.sessionProgress.awayUntil).toEqual({ pA: '2026-10-02' });
  });

  it('Amani reads her own', async () => {
    const r = await read('uAmani');
    expect(r.whoIsAway.map((w: any) => w.says)).toEqual(['You are on leave until Friday 2 October, so this round does not wait for you.']);
  });
});

/* The board builds its lines with the same function and the same reader flag (board.service.ts). */
describe('the board, as each person reads who is away', () => {
  const away = { pA: '2026-10-02' };
  const shown = participants.map((p) => ({ id: p.id, nameGiven: p.user.firstName, user: null }));
  it('Peter reads nothing; Chidi, Wairimu and Amani read what they read before', async () => {
    const prisma: any = { organizationMembership: { findUnique: async ({ where }: any) => ({ role: roles[where.userId_organizationId.userId] }) } };
    const line = async (userId: string, pid: string, runs: boolean) => theAwayLinesFor(away, shown, {
      viewerRunsThisGround: runs, myParticipantId: pid, fromOutside: !runs && await isFromOutside(prisma, userId, 'baridi'),
    }, true).map((l) => l.says);
    expect(await line('uPeter', 'pP', false)).toEqual([]);
    expect(await line('uChidi', 'pC', false)).toEqual(['Amani is away until Friday 2 October.']);
    expect(await line('uWairimu', 'pW', true)).toEqual(['Amani is on leave until Friday 2 October, so this round does not wait for Amani.']);
    expect(await line('uAmani', 'pA', false)).toEqual(['You are on leave until Friday 2 October, so this round does not wait for you.']);
  });

  it('somebody with no membership in the organisation counts as from outside; a guest keeps only their own', async () => {
    const prisma: any = { organizationMembership: { findUnique: async () => null } };
    expect(await isFromOutside(prisma, 'uStranger', 'baridi')).toBe(true);
    expect(awayUntilAsServed({ pA: '2026-10-02', pP: '2026-10-05' }, { fromOutside: true, myParticipantId: 'pP' })).toEqual({ pP: '2026-10-05' });
  });
});

/* Today never names anybody else's leave to anybody who only takes part; only the reader's own days. */
describe('Today, as each person reads it', () => {
  const list: any[] = [{
    id: 'g1', label: 'Sales team, Q4', status: 'ACTIVE', organizationId: 'baridi', initiatorId: 'uWairimu',
    participants: participants.map((p) => ({ id: p.id, userId: p.userId, user: { firstName: p.user.firstName } })),
    checkIns, reportWaitingForMe: false, glance: { progress: { roundsDone: 0, roundsPlanned: 12, openRound: 1 } },
  }];
  const today = (userId: string, awayUntil: string | null = null) => JSON.stringify(whatNeedsYou(list, { userId, role: roles[userId], organizationId: 'baridi', awayUntil }, [], NOW));

  it('Peter and Chidi read nothing of Amani’s leave', () => {
    for (const u of ['uPeter', 'uChidi']) expect(today(u)).not.toMatch(/Amani|leave|away|2 October/);
  });
  it('Amani reads her own, and Wairimu reads nothing of the dates', () => {
    expect(today('uAmani', '2026-10-02')).toContain('You are on leave until Friday 2 October, so this round does not wait for you.');
    expect(today('uWairimu')).not.toMatch(/leave|2 October/);
  });
});
