import { BadRequestException } from '@nestjs/common';
import { GroundStatus } from '@prisma/client';
import { EntryService } from './entry.service';
import { GroundsService } from '../grounds/grounds.service';

/**
 * A FINISHED CHECK-IN CANNOT BE JOINED, AND NEITHER CAN A HELD ONE.
 *
 * A join link has no expiry of its own, so it outlives the check-in it was made for. Neither the
 * preview, the ask nor the confirm read the ground's status: a link shared in week one still signed
 * people up in month four, made them an account and a participant row, and gave them a session on
 * a ground that was CLOSED. The two error strings on that path both claimed an expiry the link
 * never had.
 *
 * Three doors, one question each, asked before anything is made - and the reason given is the real
 * one: how it ended, or that it is on hold.
 */
const grounds = (ground: any) => {
  const prisma: any = { ground: { findUnique: jest.fn(async () => ground) } };
  return new GroundsService(prisma, {} as any, {} as any, { emit: jest.fn() } as any, {} as any, {} as any, {} as any);
};

const entry = (ground: any) => {
  const prisma: any = {
    $transaction: async (fn: any) => fn(prisma),
    ground: { findUnique: jest.fn(async () => ground) },
    organization: { findUnique: jest.fn(async () => ({ subscriptionPlan: null, subscriptionStatus: null })) },
    organizationMembership: { findUnique: jest.fn(async () => null), upsert: jest.fn(async () => ({})) },
    membershipRequest: { upsert: jest.fn(async () => ({})) },
    pendingJoin: {
      create: jest.fn(), updateMany: jest.fn(async () => ({ count: 0 })),
      findUnique: jest.fn(async () => ({ id: 'pj', joinToken: 'jt', email: 'a@b.c', token: 't', expiresAt: new Date(Date.now() + 60_000), usedAt: null })),
      update: jest.fn(),
    },
    user: { findUnique: jest.fn(async () => null), create: jest.fn(), update: jest.fn(), findMany: jest.fn(async () => []) },
    groundParticipant: { findUnique: jest.fn(async () => null), create: jest.fn() },
    checkIn: { findFirst: jest.fn(async () => null), create: jest.fn() },
  };
  const email: any = { sendJoinConfirmation: jest.fn(async () => ({})), sendAddPasswordEmail: jest.fn(async () => ({})) };
  const svc = new EntryService({} as any, prisma, {} as any, { sign: () => 'jwt' } as any, email, {} as any, {} as any);
  return { svc, prisma, email };
};

const closed = { id: 'g', organizationId: 'org', label: 'L', scenario: 'NEW_HIRE', status: GroundStatus.CLOSED, endState: 'KEEP', initiator: { firstName: 'A' }, initiatorId: 'lead', isFreeGround: false, freeParticipantCap: 5 };
const held = { ...closed, status: GroundStatus.PAUSED, endState: null };
const live = { ...closed, status: GroundStatus.ACTIVE, endState: null };
/* Reviewed on the server, 7 October: a check-in waiting for an admin to accept it took joins through its link. */
const waiting = { ...closed, status: GroundStatus.AWAITING_APPROVAL, endState: null };

describe('the preview', () => {
  it('refuses a closed ground in the words of the decision that closed it', async () => {
    /* It used to read "This check-in ended: keep.", the stored value after a colon. The ending is now
       its own sentence (decision 75, item 48). */
    await expect(grounds(closed).getJoinPreview('jt')).rejects.toThrow('This check-in has ended. The person stays in the role.'); /* Changed 5 Oct 2026: the KEEP ending's neutral form. */
  });
  it('refuses a held ground as on hold', async () => {
    await expect(grounds(held).getJoinPreview('jt')).rejects.toThrow(/on hold/);
  });
  it('refuses one waiting for an admin, and says so', async () => {
    await expect(grounds(waiting).getJoinPreview('jt')).rejects.toThrow('This check-in is waiting for an admin to accept it. The link will work as soon as they do.');
  });
  it('still previews a live one', async () => {
    await expect(grounds(live).getJoinPreview('jt')).resolves.toMatchObject({ groundId: 'g', groundLabel: 'L' });
  });
});

describe('the ask', () => {
  it.each([['closed', closed, /ended/], ['held', held, /on hold/], ['waiting', waiting, /waiting for an admin/]])('a %s ground mails nobody a way in', async (_n, g, says) => {
    const { svc, prisma, email } = entry(g);
    await expect(svc.askToJoin({ joinToken: 'jt', email: 'a@b.c' })).rejects.toThrow(says);
    expect(prisma.pendingJoin.create).not.toHaveBeenCalled();
    expect(email.sendJoinConfirmation).not.toHaveBeenCalled();
  });
});

describe('the confirm', () => {
  it.each([['closed', closed], ['held', held], ['waiting', waiting]])('a %s ground makes no account, no participant and no session', async (_n, g) => {
    const { svc, prisma } = entry(g);
    await expect(svc.joinConfirm('t')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.groundParticipant.create).not.toHaveBeenCalled();
    expect(prisma.checkIn.create).not.toHaveBeenCalled();
    /* And the link is not burned by a refusal: the person can come back once it is resumed. */
    expect(prisma.pendingJoin.update).not.toHaveBeenCalled();
  });

  it('a live ground still lets the person in', async () => {
    const { svc, prisma } = entry(live);
    prisma.user.create = jest.fn(async (a: any) => ({ id: 'u', ...a.data }));
    prisma.emailVerificationToken = { create: jest.fn(async () => ({})) };
    prisma.groundParticipant.create = jest.fn(async (a: any) => ({ id: 'p', ...a.data }));
    prisma.checkIn.create = jest.fn(async (a: any) => ({ id: 'ci', ...a.data }));
    await expect(svc.joinConfirm('t')).resolves.toMatchObject({ groundId: 'g', checkInId: 'ci' });
  });
});
