import { CLOSED_BY_THE_CLOCK } from '../../common/closed-by-the-clock';
import { theWeekOf } from './the-leads-weekly-letter';

/**
 * N48. The lead's weekly letter counted a round closed with nothing said as a miss even when the person was on approved leave that day,
 * while every other count of misses (missed-check-ins.ts) leaves leave out. Jared was away on Tuesday 27 October and never opened the
 * round; Hassan was not away and never opened it either.
 */
const person = (id: string, first: string, extra: any = {}) => ({ id, userId: `u-${id}`, email: `${id}@lakeshore.test`, managingOnly: false, partyType: 'PARTICIPANT', nameGiven: null, lastNudgedAt: null, joinedAt: new Date('2026-10-01T09:00:00Z'), user: { firstName: first, lastName: 'Test', awaitingOrgApproval: false }, ...extra });
const people = [person('esther', 'Esther', { partyType: 'INITIATOR' }), person('jared', 'Jared'), person('hassan', 'Hassan')];
const at = new Date('2026-10-30T09:00:00Z');
const quiet = (participantId: string) => ({ participantId, sessionNumber: 2, status: 'COMPLETED', isSetup: false, optional: false, availableFrom: new Date('2026-10-27T07:00:00Z'), createdAt: new Date('2026-10-27T07:00:00Z'), completedAt: new Date('2026-10-28T00:00:00Z'), closedReason: CLOSED_BY_THE_CLOCK, turns: [] });
const earlier = (participantId: string) => ({ participantId, sessionNumber: 1, status: 'COMPLETED', isSetup: false, optional: false, availableFrom: new Date('2026-10-20T07:00:00Z'), createdAt: new Date('2026-10-20T07:00:00Z'), completedAt: new Date('2026-10-20T09:00:00Z'), closedReason: null, turns: [{ id: 't', createdAt: new Date('2026-10-20T08:00:00Z') }] });
const sessions = [earlier('jared'), earlier('hassan'), quiet('jared'), quiet('hassan')];

const prisma = (leave: any[]): any => ({
  groundParticipant: { findMany: async ({ select }: any) => (select?.ground ? people.map((p) => ({ ...p, ground: { organizationId: null } })) : people) },
  checkIn: { findMany: async ({ where }: any) => (where?.AND ? [] : sessions) },
  leaveRequest: { findMany: async () => leave },
  groundCommitment: { findMany: async () => [], count: async () => 0 },
  groundDependency: { findMany: async () => [], count: async () => 0 },
});

describe('the lead letter and approved leave', () => {
  it('counts a quiet round as a miss for somebody who was not away', async () => {
    const w = await theWeekOf(prisma([]), { id: 'g1', label: 'Lakeshore sales', initiatorId: 'u-esther' }, at);
    expect((w.missedBy ?? []).map((m) => m.name).sort()).toEqual(['Hassan', 'Jared']);
  });
  it('leaves out the round that opened on the day somebody was on approved leave', async () => {
    const w = await theWeekOf(prisma([{ userId: 'u-jared', organizationId: 'o1', status: 'approved', startsOn: new Date('2026-10-27T00:00:00Z'), endsOn: new Date('2026-10-27T00:00:00Z') }]), { id: 'g1', label: 'Lakeshore sales', initiatorId: 'u-esther' }, at);
    expect((w.missedBy ?? []).map((m) => m.name)).toEqual(['Hassan']);
  });
});
