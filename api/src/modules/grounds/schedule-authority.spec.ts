import { ForbiddenException } from '@nestjs/common';
import { GroundsService } from './grounds.service';

/**
 * WHO DECIDES HOW LONG A GROUND RUNS.
 *
 * Any party could change the timeline and the cadence. On an onboarding that
 * doubles as a probation, that means the person being assessed could shorten or
 * extend their own assessment period, and there is nothing on the ground that
 * would make that visible to the lead.
 *
 * Adding context stays open to everyone. That is an account of the work, which
 * is the thing the product exists to collect. Changing the schedule is not.
 */

function makeService(ground: any) {
  const prisma: any = {
    ground: {
      findUnique: jest.fn(async () => ground),
      update: jest.fn(async (args: any) => ({ ...ground, ...args.data })),
    },
    /**
     * `updateTimeline` now asks who the caller is, because an admin in the same organisation may
     * change the schedule - they could already release the report and close the check-in. A MEMBER
     * here, so these suites keep testing the rule they were written for: the schedule is the lead's,
     * not every party's.
     */
    user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org1' })) },
    groundParticipant: {
      findFirst: jest.fn(async ({ where }: any) => (where.userId === 'participant' ? { id: 'p1', userId: 'participant' } : null)),
    },
    checkIn: { findMany: jest.fn(async () => []), updateMany: jest.fn(async () => ({ count: 0 })), create: jest.fn(async () => ({})) },
    auditLog: { create: jest.fn(async () => ({})) },
    groundContextNote: { create: jest.fn(async () => ({})) },
  };
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any,
      // 7th dep: the model, for the context chat (G37/G23). Unused here.
      { respond: async () => '' } as any,
    ) as any;
}

const GROUND = { id: 'g1', initiatorId: 'lead', mode: 'SHARED', timelineDays: 30, cadence: 'WEEKLY', status: 'OPEN' };

describe('changing how long a ground runs', () => {
  it('refuses a participant who tries to change the timeline', async () => {
    const svc = makeService(GROUND);
    await expect(svc.updateTimeline('g1', 'participant', { timelineWeeks: 4 })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses a participant who tries to change the cadence', async () => {
    const svc = makeService(GROUND);
    await expect(svc.updateTimeline('g1', 'participant', { cadence: 'MONTHLY' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('tells them who to ask, rather than just saying no', async () => {
    const svc = makeService(GROUND);
    await svc.updateTimeline('g1', 'participant', { timelineWeeks: 4 }).catch((e: any) => {
      /* Decision 119, H10: the one plain refusal every set-up change gives. */
      expect(e.message).toBe('Only the person who runs this check-in can change how it is set up. An admin can only do that once that person has left the organisation. Nothing was changed.');
    });
  });

  it('still lets a participant add context, which is an account of the work', async () => {
    const svc = makeService(GROUND);
    await expect(svc.updateTimeline('g1', 'participant', { contextNote: 'The licence came through' })).resolves.toBeTruthy();
  });

  it('lets the lead change it, because it is theirs to change', async () => {
    const svc = makeService(GROUND);
    await expect(svc.updateTimeline('g1', 'lead', { timelineWeeks: 13, cadence: 'WEEKLY' })).resolves.toBeTruthy();
  });

  it('still refuses someone who is not on the ground at all', async () => {
    const svc = makeService(GROUND);
    await expect(svc.updateTimeline('g1', 'stranger', { timelineWeeks: 4 })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
