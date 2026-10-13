import { GroundStatus } from '@prisma/client';
import { GroundsCron } from './grounds.cron';
import { GroundsService } from './grounds.service';

/**
 * NOBODY IS WRITTEN TO BEFORE AN ADMIN ACCEPTS A CHECK-IN, BY ANY DOOR (known issue B5, reviewer's audit 7 October).
 *
 * Nandi names Wanjiku while her check-in waits for Grace. Four other doors could still have reached Wanjiku: the 6 am sweep for people who
 * start today, the release of anybody waiting for a seat, the address heal that links an account to a row by its email, and the approval's
 * own send (which skipped a colleague who already had an account). Read as Wanjiku: she is written to once, after Grace accepts, and
 * never when the check-in waits or was declined.
 */
const lock = async (_k: number, fn: () => Promise<void>) => { await fn(); return true; };
const filtering = (rows: any[]) => jest.fn(async (args: any) => {
  const through: string[] | undefined = args.where?.ground?.status?.notIn;
  return rows.filter((r) => !through?.includes(r.ground?.status));
});
const held = (status: string) => ({ id: `p-${status}`, email: 'wanjiku@x.test', inviteToken: 't', groundId: `g-${status}`, awaitingSeat: true, ground: { status, label: 'Kilimani', scenario: 'NEW_PROJECT', brief: null, initiator: { firstName: 'Nandi' } } });

describe('the 6 am sweep for people who start today', () => {
  const sent = async (status: string) => {
    const email = { sendTheInviteThisGroundSends: jest.fn(async () => ({})) };
    const prisma: any = {
      withAdvisoryLock: lock,
      groundParticipant: { findMany: filtering([held(status)]), update: jest.fn(async () => ({})) },
    };
    const cron = new GroundsCron(prisma, email as any, {} as any, { emit: jest.fn() } as any, {} as any, {} as any, {} as any);
    await cron.inviteJoinersWhoStartToday();
    return email.sendTheInviteThisGroundSends.mock.calls.length;
  };

  it('does not write to somebody on a check-in that waits for an admin, or one an admin declined', async () => {
    expect(await sent(GroundStatus.AWAITING_APPROVAL)).toBe(0);
    expect(await sent(GroundStatus.CLOSED)).toBe(0);
  });

  it('still writes to somebody whose check-in is open, as it always did', async () => {
    expect(await sent(GroundStatus.OPEN)).toBe(1);
  });
});

describe('the release of people waiting for a seat', () => {
  const released = async (status: string) => {
    const email = { sendTheInviteThisGroundSends: jest.fn(async () => ({})) };
    const prisma: any = {
      groundParticipant: { findMany: filtering([held(status)]), update: jest.fn(async () => ({})) },
      organizationMembership: { updateMany: jest.fn(async () => ({ count: 0 })) },
    };
    const service: any = new GroundsService(prisma, email as any, { seatsLeft: async () => null } as any, { emit: () => undefined } as any, { emit: async () => undefined } as any, { get: () => '' } as any, { respond: async () => '' } as any);
    const out = await service.releaseAnyoneWaitingForASeat('org1');
    return { sent: out.sent, mails: email.sendTheInviteThisGroundSends.mock.calls.length };
  };

  it('does not invite somebody on a check-in that waits for an admin, or one an admin declined, though a seat is free', async () => {
    expect(await released(GroundStatus.AWAITING_APPROVAL)).toEqual({ sent: 0, mails: 0 });
    expect(await released(GroundStatus.CLOSED)).toEqual({ sent: 0, mails: 0 });
  });

  it('still invites somebody on an open check-in once a seat is free', async () => {
    expect(await released(GroundStatus.OPEN)).toEqual({ sent: 1, mails: 1 });
  });
});

describe('the address heal, and the approval for a colleague who already has an account', () => {
  it('does not link an account to a row on a check-in that waits for an admin', async () => {
    const calls: any[] = [];
    const prisma: any = new Proxy({
      groundParticipant: { updateMany: jest.fn(async (a: any) => { calls.push(a); return { count: 0 }; }), findMany: jest.fn(async () => []) },
      ground: { findMany: jest.fn(async () => []) },
      user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org1' })) },
      organizationMembership: { findMany: jest.fn(async () => []) },
    }, { get: (t: any, p: string) => (p in t ? t[p] : typeof p === 'string' && !p.startsWith('$') && p !== 'then' ? { findMany: async () => [], findFirst: async () => null, findUnique: async () => null, count: async () => 0 } : undefined) });
    const service: any = new GroundsService(prisma, {} as any, {} as any, { emit: () => undefined } as any, { emit: async () => undefined } as any, { get: () => '' } as any, { respond: async () => '' } as any);
    await service.list('org1', 'u-colleague', 'wanjiku@x.test', 'MEMBER').catch(() => undefined);
    const heal = calls.find((c) => c.where?.userId === null);
    expect(heal.where.ground).toEqual({ status: { not: GroundStatus.AWAITING_APPROVAL } });
  });
});
