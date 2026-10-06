import { NotFoundException } from '@nestjs/common';
import { BoardService } from '../board/board.service';
import { ReportsService } from './reports.service';

/**
 * PRIVACY SWEEP 5 OCTOBER 2026, FINDING 7 (GW-PRI-04, decision 5).
 *
 * An admin who was not given access to a performance plan or a first-90-days check-in read "You are not a participant in this
 * check-in" on its board and its report, which tells them the check-in is real. Every other route answers "Check-in not found".
 * The board and the report now do too, for every scenario, and the admin who was given access (the one who set it up) still reads.
 */
const person = (id: string, userId: string, partyType: string, first: string, createdAt: string, managingOnly = false) => ({
  id, userId, partyType, email: `${first}@x.test`, managingOnly, roleAsDescribed: null, remitAsGiven: null, nameGiven: null, organisationGiven: null,
  createdAt: new Date(createdAt), user: { firstName: first, lastName: 'Test', email: `${first}@x.test` },
});

const ground = (scenario: string) => ({
  id: 'g1', organizationId: 'org1', initiatorId: 'u-lead', createdByUserId: 'u-setter', scenario, status: 'ACTIVE', approvedById: null, cadence: 'WEEKLY',
  peersVisibleToEachOther: null, label: 'Review', objectives: [], dependencies: [], timelineDays: 90,
  participants: [person('p-lead', 'u-lead', 'INITIATOR', 'Funmi', '2026-09-01', true), person('p-tobi', 'u-tobi', 'PARTICIPANT', 'Tobi', '2026-09-02')],
  report: { id: 'r1', releasedAt: new Date('2026-09-23'), releasedSessions: [1], findings: [], agreements: [], divergences: [], sharedAs: null },
});

function prismaFor(scenario: string) {
  const g = ground(scenario);
  const reads = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({})) };
  const own: any = {
    ground: { findUnique: jest.fn(async () => structuredClone(g)), findFirst: jest.fn(async () => structuredClone(g)) },
    user: { findUnique: jest.fn(async () => ({ role: 'ADMIN', organizationId: 'org1', awaitingOrgApproval: false })) },
    groundParticipant: { findFirst: jest.fn(async () => null), findMany: async () => [] },
  };
  return new Proxy(own, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$') && prop !== 'then') target[prop] = { ...reads };
      return target[prop];
    },
  });
}
const reports = (p: any) => new ReportsService(p, {} as any, {} as any, {} as any, { get: () => 'http://localhost' } as any, { emit: () => Promise.resolve() } as any, { getSessionProgress: async () => null } as any, { tell: async () => [] } as any);

describe.each(['PIP', 'NEW_HIRE', 'CONTRACT_RENEWAL', 'OKR_ALIGNMENT'])('an admin of the organisation who is in none of %s, and was given no access', (scenario) => {
  it('is told the check-in is not found on its board', async () => {
    const p = prismaFor(scenario);
    const err: any = await new BoardService(p, { respond: async () => null } as any, { getSessionProgress: async () => null } as any, reports(p)).get('g1', 'u-other-admin').then(() => null, (e) => e);
    if (scenario === 'OKR_ALIGNMENT') { /* an ordinary check-in: an admin of the organisation reads it */ expect(err).toBeNull(); return; }
    expect(err).toBeInstanceOf(NotFoundException);
    expect(err.message).toBe('Check-in not found');
  });

  it('is told the check-in is not found on its report', async () => {
    const p = prismaFor(scenario);
    const err: any = await reports(p).get('g1', 'u-other-admin', 'org1').then(() => null, (e) => e);
    if (scenario === 'OKR_ALIGNMENT') { expect(err?.message ?? '').not.toBe('You are not a participant in this check-in'); return; }
    expect(err).toBeInstanceOf(NotFoundException);
    expect(err.message).toBe('Check-in not found');
  });
});

describe('a stranger to the organisation', () => {
  it('is told the same on the board and the report', async () => {
    const p = prismaFor('OKR_ALIGNMENT');
    p.user.findUnique = jest.fn(async () => ({ role: 'ADMIN', organizationId: 'org-elsewhere', awaitingOrgApproval: false }));
    const board: any = await new BoardService(p, { respond: async () => null } as any, { getSessionProgress: async () => null } as any, reports(p)).get('g1', 'u-stranger').then(() => null, (e) => e);
    const report: any = await reports(p).get('g1', 'u-stranger', 'org-elsewhere').then(() => null, (e) => e);
    expect(board.message).toBe('Check-in not found');
    expect(report.message).toBe('Check-in not found');
  });
});
