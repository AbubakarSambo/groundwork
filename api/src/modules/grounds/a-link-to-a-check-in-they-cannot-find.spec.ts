import { GroundsService } from './grounds.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

/**
 * "I NEVER GOT THE EMAIL" DID NOT STOP AT THE INVITE.
 *
 * Every recovery action on the roster is gated on `!p.userId` - copy the invite link, resend the
 * invite, fix a bounced address. The moment somebody accepts, all of them go quiet, and from that
 * point the address of their open check-in existed in exactly one place: a string built inside the
 * reminder cron. Nothing else in the product could produce one. So a person whose "your check-in is
 * open" mail went to spam could not reach their own check-in, and the lead had nothing to send them
 * - the only recovery was waiting for the next nudge to fire.
 *
 * Driven through the service rather than read off its source, because the branches are the point.
 */

const OPEN_CHECK_IN = { id: 'ci-open' };

function serviceWith(over: {
  ground?: unknown;
  participant?: unknown;
  checkIn?: unknown;
} = {}) {
  const prisma = {
    ground: { findFirst: async () => ('ground' in over ? over.ground : { id: 'g1' }) },
    groundParticipant: {
      findFirst: async () =>
        'participant' in over ? over.participant : { id: 'p1', userId: 'u1' },
    },
    checkIn: {
      findFirst: async () => ('checkIn' in over ? over.checkIn : OPEN_CHECK_IN),
    },
  } as never;
  const email = { buildCheckInUrl: (id: string) => `https://app.example.test/checkin/${id}` } as never;
  return new GroundsService(prisma, email, {} as never, {} as never, {} as never, {} as never,
    { respond: async () => '' } as never);
}

const call = (s: GroundsService) => s.getParticipantCheckInUrl('g1', 'p1', 'lead');

describe('a link to a check-in they cannot find', () => {
  it('gives the initiator the address of the open check-in', async () => {
    await expect(call(serviceWith())).resolves.toEqual({
      checkInUrl: 'https://app.example.test/checkin/ci-open',
    });
  });

  it('refuses anybody who is not the initiator of this ground', async () => {
    /* A check-in address is enough to open somebody's session. */
    await expect(call(serviceWith({ ground: null }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses a participant who is not on this ground', async () => {
    await expect(call(serviceWith({ participant: null }))).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sends the lead to the invite link when they have not accepted yet', async () => {
    /* Two different problems needing two different things from the lead, so they get two
       different sentences rather than one shrug. */
    const p = call(serviceWith({ participant: { id: 'p1', userId: null } }));
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow(/invite link/i);
  });

  it('says so plainly when nothing is open, rather than linking a finished check-in', async () => {
    /* Copying a link to a completed check-in sends somebody to a page that asks them nothing. */
    const p = call(serviceWith({ checkIn: null }));
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow(/no check-in open/i);
  });

  it('asks only for a check-in that is open, and takes the newest', async () => {
    const seen: Record<string, unknown>[] = [];
    const prisma = {
      ground: { findFirst: async () => ({ id: 'g1' }) },
      groundParticipant: { findFirst: async () => ({ id: 'p1', userId: 'u1' }) },
      checkIn: {
        findFirst: async (args: Record<string, unknown>) => { seen.push(args); return OPEN_CHECK_IN; },
      },
    } as never;
    const email = { buildCheckInUrl: (id: string) => id } as never;
    const service = new GroundsService(prisma, email, {} as never, {} as never, {} as never,
      {} as never, { respond: async () => '' } as never);
    await service.getParticipantCheckInUrl('g1', 'p1', 'lead');
    const where = seen[0].where as { status: { in: string[] } };
    expect(where.status.in.sort()).toEqual(['IN_PROGRESS', 'NOT_STARTED']);
    expect(where.status.in).not.toContain('COMPLETED');
    expect(seen[0].orderBy).toEqual({ createdAt: 'desc' });
  });

  it('mints nothing - it reads where the check-in already is', async () => {
    /* No token created, no invite reissued: a link somebody already has must keep working. */
    const writes: string[] = [];
    const prisma = {
      ground: { findFirst: async () => ({ id: 'g1' }) },
      groundParticipant: {
        findFirst: async () => ({ id: 'p1', userId: 'u1' }),
        update: async () => { writes.push('participant.update'); },
      },
      checkIn: {
        findFirst: async () => OPEN_CHECK_IN,
        create: async () => { writes.push('checkIn.create'); },
        update: async () => { writes.push('checkIn.update'); },
      },
    } as never;
    const email = { buildCheckInUrl: (id: string) => id } as never;
    const service = new GroundsService(prisma, email, {} as never, {} as never, {} as never,
      {} as never, { respond: async () => '' } as never);
    await service.getParticipantCheckInUrl('g1', 'p1', 'lead');
    expect(writes).toEqual([]);
  });
});
