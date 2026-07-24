import { BadRequestException } from '@nestjs/common';
import { GroundsService } from './grounds.service';
import { Cadence, CheckInStatus } from '@prisma/client';

/**
 * Item 3 decision: ONE_TIME's whole guarantee is "a single check-in, full
 * stop" - decided by whether session 1 has actually completed, not by
 * whatever the cadence field says at that instant. Converting cadence
 * to/from ONE_TIME after session 1 has already completed for anyone on the
 * ground would be silently inconsistent either direction (see the inline
 * comment in updateTimeline()), so it's blocked outright once any session 1
 * has completed. Before that point, conversion is unrestricted, same as any
 * other cadence change.
 */

function makeService(ground: any, session1Completed: boolean) {
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ground), update: jest.fn(async (args: any) => ({ ...ground, ...args.data })) },
    groundParticipant: { findFirst: jest.fn(async () => ({ id: 'p1' })) },
    checkIn: { findFirst: jest.fn(async () => (session1Completed ? { id: 'ci1' } : null)) },
  };
  return new GroundsService(prisma, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any, {} as any);
}

const BASE_GROUND = { id: 'g1', initiatorId: 'admin', cadence: Cadence.FORTNIGHTLY, timelineWeeks: 12, groundAuditLog: null };

describe('cadence conversion to/from ONE_TIME is locked after session 1 completes', () => {
  it('blocks converting a recurring ground TO ONE_TIME once session 1 has completed', async () => {
    const service = makeService(BASE_GROUND, true);
    await expect(
      service.updateTimeline('g1', 'admin', { cadence: 'ONE_TIME' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks converting a ONE_TIME ground TO a recurring cadence once session 1 has completed', async () => {
    const service = makeService({ ...BASE_GROUND, cadence: Cadence.ONE_TIME }, true);
    await expect(
      service.updateTimeline('g1', 'admin', { cadence: 'FORTNIGHTLY' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows converting TO ONE_TIME before any session 1 has completed', async () => {
    const service = makeService(BASE_GROUND, false);
    await expect(service.updateTimeline('g1', 'admin', { cadence: 'ONE_TIME' })).resolves.toBeDefined();
  });

  it('allows an unrelated cadence change (neither side is ONE_TIME) even after session 1 completes', async () => {
    const service = makeService(BASE_GROUND, true);
    await expect(service.updateTimeline('g1', 'admin', { cadence: 'WEEKLY' })).resolves.toBeDefined();
  });
});
