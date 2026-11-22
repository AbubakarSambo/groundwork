import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { GroundStatus, CheckInStatus } from '@prisma/client';
import { GroundsCron } from './grounds.cron';
import { GroundsService } from './grounds.service';
import { ReportsListener } from '../reports/reports.listener';
/* Changed 1 November 2026: the report is written when the check-in's assessment is ready (onTheAssessmentReady), not on the completion itself; the same release logic, checked the same way. */

/**
 * A HOLD IS A HOLD UNTIL SOMEBODY LIFTS IT.
 *
 * PAUSED had one writer and no reader that mattered. Four things moved a paused ground on without
 * anybody asking: the 3 AM stall sweep wrote it STALLED, releasing a report wrote it ACTIVE, adding
 * a participant wrote it AWAITING_PARTIES, and `activate` wrote ACTIVE with no guard at all. Two
 * more kept its clock running: the auto-close and the closing warning read no ground status. And
 * nothing at all wrote it back out - the docstring promised "transitioning back to the prior
 * status" and the prior status was never recorded.
 *
 * One paused ground, run against every writer. Each leaves it as it found it. Then the one thing
 * that may lift it does, and puts it back where it was.
 */

const LONG_AGO = new Date(Date.now() - 400 * 24 * 3600 * 1000);
const paused = {
  id: 'g-held', organizationId: 'org', status: GroundStatus.PAUSED, pausedAt: new Date(), pausedFromStatus: GroundStatus.AWAITING_PARTIES,
  createdAt: LONG_AGO, startsAt: null, timelineDays: 1,
};

/** A findMany that honours a `status: { notIn }` filter, at the ground or through `ground:`. */
const filtering = (rows: any[]) => jest.fn(async (args: any) => {
  const own: string[] | undefined = args.where?.status?.notIn;
  const through: string[] | undefined = args.where?.ground?.status?.notIn;
  return rows.filter((r) => !(own?.includes(r.status) || through?.includes(r.ground?.status)));
});

const lock = async (_k: number, fn: () => Promise<void>) => { await fn(); return true; };

describe('the cron sweeps leave a held ground alone', () => {
  it('the stall sweep does not write STALLED on a paused ground that is past its deadline', async () => {
    const prisma: any = {
      withAdvisoryLock: lock,
      ground: { findMany: filtering([paused]), updateMany: jest.fn() },
    };
    const cron = new GroundsCron(prisma, {} as any, {} as any, { emit: jest.fn() } as any, {} as any, {} as any, {} as any);
    await cron.stallOverdueGrounds();
    expect(prisma.ground.updateMany).not.toHaveBeenCalled();
  });

  it('the deferred-invite sweep does not invite into a paused ground', async () => {
    const email = { sendParticipantInvite: jest.fn() };
    const prisma: any = {
      withAdvisoryLock: lock,
      groundParticipant: {
        findMany: filtering([{ id: 'p1', email: 'a@b.c', inviteToken: 't', groundId: paused.id, ground: { status: paused.status, label: 'x', initiator: {} } }]),
        update: jest.fn(),
      },
    };
    const cron = new GroundsCron(prisma, email as any, {} as any, { emit: jest.fn() } as any, {} as any, {} as any, {} as any);
    await cron.inviteJoinersWhoStartToday();
    expect(email.sendParticipantInvite).not.toHaveBeenCalled();
  });

  it.each([
    ['autoCloseStaleCheckIns'],
    ['fireSessionClosingWarnings'],
  ] as const)('%s does not touch an in-progress session on a paused ground', async (sweep) => {
    const prisma: any = {
      withAdvisoryLock: lock,
      checkIn: {
        findMany: filtering([{ id: 'ci', groundId: paused.id, status: CheckInStatus.IN_PROGRESS, warningFiredAt: null, ground: { status: paused.status } }]),
        update: jest.fn(),
      },
      conversationTurn: { findFirst: jest.fn(), create: jest.fn() },
    };
    const cron = new GroundsCron(prisma, {} as any, {} as any, { emit: jest.fn() } as any, {} as any, {} as any, {} as any);
    await (cron as any)[sweep]();
    expect(prisma.conversationTurn.findFirst).not.toHaveBeenCalled();
    expect(prisma.checkIn.update).not.toHaveBeenCalled();
  });
});

describe('releasing a report leaves a held ground alone', () => {
  const listener = (status: GroundStatus) => {
    /* A one-time check-in, which still shares the moment everyone is in: a check-in that repeats waits for its set time (Hafsah's answer 5, 16 October 2026; a-report-shares-itself.spec). */
    const prisma: any = { ground: { findUnique: jest.fn(async () => ({ organizationId: 'org', status, cadence: 'ONE_TIME' })), update: jest.fn() } };
    const grounds: any = { isSessionReadyForReport: jest.fn(async () => true) };
    const reports: any = { synthesize: jest.fn(), release: jest.fn(), tellThemTheReportIsReady: jest.fn(async () => ({ attempted: 0, failed: 0 })) };
    const l = new ReportsListener(prisma, grounds, reports, {} as any, { get: () => undefined } as any);
    return { l, prisma, reports };
  };

  it('releases the report and does not set a PAUSED ground ACTIVE', async () => {
    const { l, prisma, reports } = listener(GroundStatus.PAUSED);
    await l.onTheAssessmentReady({ groundId: paused.id, sessionNumber: 1 } as any);
    expect(reports.release).toHaveBeenCalled();
    expect(prisma.ground.update).not.toHaveBeenCalled();
  });

  it('still sets a live ground ACTIVE, which is what release normally means', async () => {
    const { l, prisma } = listener(GroundStatus.AWAITING_PARTIES);
    await l.onTheAssessmentReady({ groundId: 'g-live', sessionNumber: 1 } as any);
    expect(prisma.ground.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: GroundStatus.ACTIVE } }));
  });
});

describe('the service writers refuse a held or ended ground', () => {
  const service = (ground: any) => {
    const prisma: any = {
      ground: {
        /* addParticipant asks first whether it is AWAITING_APPROVAL, then loads the ground. */
        findFirst: jest.fn(async (args: any) => (args.where?.status === GroundStatus.AWAITING_APPROVAL ? null : ground)),
        findUnique: jest.fn(async () => ground),
        update: jest.fn(async (args: any) => ({ ...ground, ...args.data })),
      },
      user: { findFirst: jest.fn(async () => ({ id: 'admin' })) },
      $transaction: jest.fn(),
    };
    const svc = new GroundsService(prisma, {} as any, {} as any, { emit: jest.fn() } as any, {} as any, {} as any, {} as any);
    return { svc, prisma };
  };

  it('addParticipant refuses a paused ground before any row is written, and says it is on hold', async () => {
    const { svc, prisma } = service(paused);
    await expect(svc.addParticipant(paused.id, 'org', 'lead', { email: 'x@y.z' } as any)).rejects.toThrow(/on hold/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('addParticipant refuses an ended ground and says it has ended', async () => {
    const { svc, prisma } = service({ ...paused, status: GroundStatus.CLOSED });
    await expect(svc.addParticipant(paused.id, 'org', 'lead', { email: 'x@y.z' } as any)).rejects.toThrow(/has ended/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([GroundStatus.PAUSED, GroundStatus.CLOSED, GroundStatus.STALLED])('activate refuses a %s ground', async (status) => {
    const { svc, prisma } = service({ ...paused, status });
    await expect(svc.activate(paused.id, 'org')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.ground.update).not.toHaveBeenCalled();
  });
});

describe('the one way out of a hold', () => {
  const service = (ground: any, member: boolean | 'member' = true) => {
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ground), update: jest.fn(async (args: any) => ({ ...ground, ...args.data })) },
      /* An admin of the organisation unless said otherwise (bug 35: the rule is its lead or an admin, not any member). */
      user: { findFirst: jest.fn(async () => (member === true ? { id: 'admin', role: 'ADMIN' } : member === 'member' ? { id: 'someone', role: 'MEMBER' } : null)) },
    };
    const svc = new GroundsService(prisma, {} as any, {} as any, { emit: jest.fn() } as any, {} as any, {} as any, {} as any);
    return { svc, prisma };
  };

  it('pausing records the status it was paused from', async () => {
    const { svc, prisma } = service({ ...paused, status: GroundStatus.AWAITING_PARTIES, pausedAt: null, pausedFromStatus: null });
    await svc.pauseGround(paused.id, 'admin', 'legal');
    expect(prisma.ground.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: GroundStatus.PAUSED, pausedFromStatus: GroundStatus.AWAITING_PARTIES }),
    }));
  });

  it('resuming returns the ground to the status it was paused from and clears the hold', async () => {
    const { svc, prisma } = service(paused);
    await svc.resumeGround(paused.id, 'admin', 'cleared');
    expect(prisma.ground.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: GroundStatus.AWAITING_PARTIES, pausedAt: null, pausedFromStatus: null },
    }));
  });

  it('a ground paused before the prior status was recorded goes back to ACTIVE', async () => {
    const { svc, prisma } = service({ ...paused, pausedFromStatus: null });
    await svc.resumeGround(paused.id, 'admin', 'cleared');
    expect(prisma.ground.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: GroundStatus.ACTIVE }) }));
  });

  it('refuses to resume anything that is not on hold', async () => {
    const { svc, prisma } = service({ ...paused, status: GroundStatus.ACTIVE });
    await expect(svc.resumeGround(paused.id, 'admin', 'x')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.ground.update).not.toHaveBeenCalled();
  });

  it('takes the same org-membership check as pausing', async () => {
    const { svc } = service(paused, false);
    await expect(svc.resumeGround(paused.id, 'stranger', 'x')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('the lead who runs it may pause and resume it without being an admin', async () => {
    const { svc, prisma } = service({ ...paused, status: GroundStatus.ACTIVE, initiatorId: 'u-lead' }, 'member');
    await svc.pauseGround(paused.id, 'u-lead', 'Paused by its lead');
    expect(prisma.ground.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: GroundStatus.PAUSED }) }));
    const again = service({ ...paused, initiatorId: 'u-lead' }, 'member');
    await again.svc.resumeGround(paused.id, 'u-lead', 'Resumed by its lead');
    expect(again.prisma.ground.update).toHaveBeenCalled();
  });

  it('a member who does not run it may neither pause nor resume it, and is told who can', async () => {
    const { svc, prisma } = service({ ...paused, status: GroundStatus.ACTIVE, initiatorId: 'u-lead' }, 'member');
    await expect(svc.pauseGround(paused.id, 'someone', 'x')).rejects.toThrow('Only the person running this check-in, or an admin here, can pause it, so ask one of them.');
    const held = service({ ...paused, initiatorId: 'u-lead' }, 'member');
    await expect(held.svc.resumeGround(paused.id, 'someone', 'x')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.ground.update).not.toHaveBeenCalled();
  });
});
