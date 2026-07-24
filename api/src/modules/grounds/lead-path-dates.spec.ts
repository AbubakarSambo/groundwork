import { GroundsService } from './grounds.service';

/**
 * LEAD-PATH DATES tripwire. An admin's chosen start/end date for a lead's
 * ground was collected on the client (EntryChatPage) and silently discarded:
 * CreateGroundForLeadDto had no startsAt/endsAt fields at all, so
 * createForLead never stored them on the Ground, and confirmLead (which
 * creates the lead's own session-1 check-in) had no gate for it - unlike the
 * self-serve create() path, which always did.
 */
function makeService(ground: any) {
  const checkInCreate = jest.fn(async (a: any) => ({ id: 'ci1', ...a.data }));
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ground), update: jest.fn(async (a: any) => ({ ...ground, ...a.data })) },
    groundParticipant: {
      findFirst: jest.fn(async () => ({ id: 'p-lead' })),
      count: jest.fn(async () => 0),
    },
    checkIn: { create: checkInCreate },
    $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
  };
  const service = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any);
  return { service, checkInCreate };
}

describe('confirmLead: the lead\'s own check-in respects Ground.startsAt', () => {
  it('gates availableFrom to the admin-chosen start date when one was set', async () => {
    const startsAt = new Date('2026-08-01T00:00:00.000Z');
    const { service, checkInCreate } = makeService({ id: 'g1', initiatorId: 'lead1', status: 'AWAITING_LEAD', startsAt });
    await service.confirmLead('g1', 'lead1', {});
    expect(checkInCreate.mock.calls[0][0].data.availableFrom).toEqual(startsAt);
  });

  it('leaves availableFrom null when no start date was set (unchanged default)', async () => {
    const { service, checkInCreate } = makeService({ id: 'g1', initiatorId: 'lead1', status: 'AWAITING_LEAD', startsAt: null });
    await service.confirmLead('g1', 'lead1', {});
    expect(checkInCreate.mock.calls[0][0].data.availableFrom).toBeNull();
  });
});
