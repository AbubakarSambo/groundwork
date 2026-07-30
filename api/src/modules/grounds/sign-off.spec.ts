import { GroundsService } from './grounds.service';
import { ForbiddenException } from '@nestjs/common';

/**
 * GW-SIGNOFF tripwire (Honest Corrections).
 *
 * signOff() must:
 *  - reject a caller who is not a party to the ground,
 *  - set GroundParticipant.signedOffAt to now on first call,
 *  - be idempotent: a second call for an already-signed-off participant must
 *    NOT re-write signedOffAt (return the existing timestamp, no update call).
 *
 * The idempotency case is the real tripwire - without it, re-signing off
 * would silently move the deadline forward each time it's called.
 */
function makeService(participant: any) {
  const update = jest.fn(async (a: any) => ({ signedOffAt: a.data.signedOffAt }));
  const prisma: any = {
    groundParticipant: {
      findFirst: jest.fn(async () => participant),
      update,
    },
  };
  const service = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any);
  return { service, prisma, update };
}

describe('GroundsService.signOff', () => {
  it('rejects a caller who is not a party to the ground', async () => {
    const { service } = makeService(null);
    await expect(service.signOff('g1', 'stranger')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sets signedOffAt on first call', async () => {
    const { service, update } = makeService({ id: 'p1', signedOffAt: null });
    const res = await service.signOff('g1', 'user1');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1' }, data: { signedOffAt: expect.any(Date) } }),
    );
    expect(res.signedOffAt).toBeInstanceOf(Date);
  });

  it('is idempotent: a second sign-off does not move the timestamp (tripwire)', async () => {
    const existing = new Date('2026-01-01T00:00:00Z');
    const { service, update } = makeService({ id: 'p1', signedOffAt: existing });
    const res = await service.signOff('g1', 'user1');
    expect(update).not.toHaveBeenCalled();
    expect(res.signedOffAt).toBe(existing);
  });
});
