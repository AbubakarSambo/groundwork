import { GroundsService } from './grounds.service';
import { totalSessionsFor } from './session-count';

/**
 * "GIVE IT MORE TIME" COUNTS THE SESSIONS THE WAY SETUP DOES (journey test, 12 October 2026).
 *
 * The page turned the new end date into calendar days, and the count was those days over the rhythm's
 * gap; the stored end did not move. Weekly on Mondays, made "Now" on Sunday 11 October, moved to end on
 * Sunday 29 November: setup lists 11 Oct, then Mondays 19 Oct to 23 Nov, seven sessions (the same case
 * as the-chosen-end-sets-how-long-it-runs.spec.ts). 49 calendar days over 7 said seven by luck here;
 * to Saturday 28 November (48 days) it said six.
 */
function makeService() {
  const g = {
    id: 'g1', organizationId: 'org1', scenario: 'NEW_PROJECT', initiatorId: 'u-lead', label: 'Sales team, weekly',
    timelineDays: 28, timelineWeeks: 4, cadence: 'WEEKLY', cadenceAnchorDay: 1, workingDays: [], startsAt: null,
    endsAt: new Date(2026, 10, 8), createdAt: new Date(2026, 9, 11, 15, 0), mode: 'SHARED', status: 'ACTIVE', groundAuditLog: null,
  };
  const updated = jest.fn(async (args: any) => ({ ...g, ...args.data }));
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => g), update: updated },
    groundParticipant: { findFirst: jest.fn(async () => ({ id: 'p1' })) },
    user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org1', isActive: true, firstName: 'Lena', lastName: 'Lead' })) },
    checkIn: { findFirst: jest.fn(async () => null) },
  };
  const service = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  return { service, updated };
}

describe('moving the end later', () => {
  it('counts the rounds up to the new end and stores the end', async () => {
    const { service, updated } = makeService();
    await service.updateTimeline('g1', 'u-lead', { endsOn: '2026-11-28', timelineDays: 48 } as any);
    const data = updated.mock.calls[0][0].data;
    expect(totalSessionsFor(data.timelineDays, 'WEEKLY' as any)).toBe(7);
    expect(new Date(data.endsAt).toISOString().slice(0, 10)).toBe('2026-11-28');
  });

  it('keeps the old way for a caller that sends only days', async () => {
    const { service, updated } = makeService();
    await service.updateTimeline('g1', 'u-lead', { timelineDays: 48 });
    expect(updated.mock.calls[0][0].data.timelineDays).toBe(48);
  });
});
