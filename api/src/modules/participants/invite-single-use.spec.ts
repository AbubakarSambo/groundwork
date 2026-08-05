import { ParticipantsService } from './participants.service';
import { BadRequestException } from '@nestjs/common';

/**
 * GW-INVITE-SINGLE-USE tripwire.
 *
 * An invite link used to mint a fresh access token EVERY time it was presented,
 * and the token was never cleared from the row. That made the emailed link a
 * permanent bearer credential: anyone who ever saw it - a forwarded email, a
 * screenshot, a shared inbox, an old archive - could sign in as that person and
 * read their private account, indefinitely.
 *
 * Found by replaying a used invite token against the live API, which returned a
 * valid accessToken for a participant who had accepted hours earlier.
 *
 * Everyone gets a password-setup email on first accept, so refusing the second
 * use costs nothing.
 */
function makeService(participant: any) {
  const update = jest.fn(async (a: any) => a);
  const prisma: any = {
    groundParticipant: { findUnique: jest.fn(async () => participant), findFirst: jest.fn(async () => participant), update },
    ground: { findUnique: jest.fn(async () => ({ id: 'g1', organizationId: 'org1' })) },
    user: { findUnique: jest.fn(async () => null), create: jest.fn(async () => ({ id: 'u1', email: participant.email, firstName: 'A', lastName: 'B', role: 'MEMBER', organizationId: 'org1', passwordHash: 'x' })) },
    checkIn: { findFirst: jest.fn(async () => ({ id: 'ci1' })) },
    emailVerificationToken: { create: jest.fn(async () => ({})) },
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
  };
  const svc = new ParticipantsService(
    prisma,
    { sign: () => 'jwt' } as any,
    { sendAddPasswordEmail: async () => undefined } as any,
  );
  return { svc, prisma, update };
}

describe('GW-INVITE-SINGLE-USE: an invite link cannot sign you in twice', () => {
  it('refuses a token whose participant has already accepted (tripwire)', async () => {
    const { svc } = makeService({ id: 'p1', groundId: 'g1', email: 'k@x.test', userId: 'already-here', inviteToken: 'tok' });
    await expect(svc.accept('tok')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('tells them what to do instead, rather than just failing', async () => {
    const { svc } = makeService({ id: 'p1', groundId: 'g1', email: 'k@x.test', userId: 'already-here', inviteToken: 'tok' });
    await expect(svc.accept('tok')).rejects.toThrow(/sign in|password link/i);
  });

  it('clears the token on first accept, so the emailed link stops working', async () => {
    const { svc, update } = makeService({ id: 'p1', groundId: 'g1', email: 'k@x.test', userId: null, inviteToken: 'tok' });
    await svc.accept('tok', { firstName: 'K', lastName: 'B' });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ inviteToken: null, inviteTokenExpiresAt: null }) }),
    );
  });
});
