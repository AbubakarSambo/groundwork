import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ONLY_THE_LEAD_RELEASES } from './only-the-lead-releases';

/**
 * REQUEST 57: ONLY THE LEAD RELEASES A CHECK-IN'S REPORT.
 *
 * `POST /grounds/:id/report/release` was guarded only by the admin role. Rukia runs the check-in;
 * Chidi is another admin of the same organisation. The lead's Sessions tab tells Chidi that sharing
 * the report is Rukia's to decide, and the route let him do it anyway. These tests call the route as
 * each person and read what they are served, and whether the report was actually marked released.
 */

function world(leadIsActive = true) {
  const report = { id: 'r1', groundId: 'g1', releasedAt: null as Date | null };
  const ground: any = {
    id: 'g1', organizationId: 'org1', initiatorId: 'rukia', scenario: 'NEW_PROJECT', groundAuditLog: null,
    participants: [
      { id: 'p-lead', userId: 'rukia', user: { passwordHash: 'x' } },
      { id: 'p-1', userId: 'daniel', user: { passwordHash: 'x' } },
    ],
    report,
  };
  /* Rukia (the lead) and Grace (another admin, only used in decision 53's tests below). Whether
     Rukia is active is the one thing that changes between the two describe blocks. */
  const users: Record<string, any> = {
    rukia: { id: 'rukia', firstName: 'Rukia', lastName: 'Mwangi', isActive: leadIsActive, role: 'ADMIN', organizationId: 'org1' },
    grace: { id: 'grace', firstName: 'Grace', lastName: 'Otieno', isActive: true, role: 'ADMIN', organizationId: 'org1' },
    chidi: { id: 'chidi', firstName: 'Chidi', lastName: 'Eze', isActive: true, role: 'ADMIN', organizationId: 'org1' },
    daniel: { id: 'daniel', firstName: 'Daniel', lastName: 'Kimani', isActive: true, role: 'MEMBER', organizationId: 'org1' },
  };
  const prisma: any = {
    ground: {
      findFirst: jest.fn(async ({ where }: any) => (where.id === 'g1' && where.organizationId === 'org1' ? ground : null)),
      update: jest.fn(async ({ data }: any) => { Object.assign(ground, data); return ground; }),
    },
    user: { findUnique: jest.fn(async ({ where }: any) => users[where.id] ?? null) },
    report: { update: jest.fn(async ({ data }: any) => { Object.assign(report, data); report.releasedAt = new Date('2026-09-29T10:00:00Z'); return { ...report, sharedPicture: 'private rows', ratings: { daniel: 2 } }; }) },
    checkIn: { aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })) },
  };
  const service = new ReportsService(prisma, {} as any, {} as any, {} as any, { get: () => false } as any, {} as any, {} as any, { tell: async () => [] } as any);
  (service as any).tellThemTheReportIsReady = jest.fn(async () => ({ attempted: 0, failed: 0 }));
  (service as any).usage = { emit: jest.fn(async () => undefined) };
  return { controller: new ReportsController(service), prisma, report, ground };
}

describe('another admin of the organisation', () => {
  it('is refused, in a plain sentence, and the report stays unshared', async () => {
    const { controller, prisma, report } = world();
    const refused = await controller.release('g1', 'chidi', 'org1').catch((e) => e);
    expect(refused).toBeInstanceOf(ForbiddenException);
    expect(refused.message).toBe(
      'Only the person who runs this check-in can share its report. Ask them to share it when they are ready.',
    );
    expect(refused.message).toBe(ONLY_THE_LEAD_RELEASES);
    expect(prisma.report.update).not.toHaveBeenCalled();
    expect(report.releasedAt).toBeNull();
  });

  it('a participant of the check-in, even one holding the admin role, is refused too', async () => {
    const { controller, prisma } = world();
    await expect(controller.release('g1', 'daniel', 'org1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.report.update).not.toHaveBeenCalled();
  });

  it('an admin of another organisation is told there is no such check-in', async () => {
    const { controller, prisma } = world();
    await expect(controller.release('g1', 'rukia', 'org2')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.report.update).not.toHaveBeenCalled();
  });
});

describe('the lead', () => {
  it('shares it, and is handed back only when it was shared', async () => {
    const { controller, prisma } = world();
    const served = await controller.release('g1', 'rukia', 'org1');
    expect(prisma.report.update).toHaveBeenCalledTimes(1);
    expect(served).toEqual({
      groundId: 'g1', releasedAt: new Date('2026-09-29T10:00:00Z'),
      /* Decision 76, item 4: each session's picture is released on its own, and the lead is told which. */
      releasedSessions: [1], sessionNumber: 1,
      saying: "This shares the team's picture of check-in 1 with everyone in the check-in.",
    });
  });
});

describe('decision 53 (29 September 2026): the lead has left the organisation', () => {
  it('another admin is still refused while the lead is present, even a day before they leave', async () => {
    const { controller, prisma } = world(true);
    await expect(controller.release('g1', 'chidi', 'org1')).rejects.toThrow(ONLY_THE_LEAD_RELEASES);
    expect(prisma.report.update).not.toHaveBeenCalled();
  });

  it('an admin may share it once the lead has left, and the report says who shared it and why', async () => {
    const { controller, prisma, ground } = world(false);
    const served = await controller.release('g1', 'grace', 'org1');
    expect(prisma.report.update).toHaveBeenCalledTimes(1);
    expect(served).toEqual({
      groundId: 'g1', releasedAt: new Date('2026-09-29T10:00:00Z'),
      /* Decision 76, item 4: each session's picture is released on its own, and the lead is told which. */
      releasedSessions: [1], sessionNumber: 1,
      saying: "This shares the team's picture of check-in 1 with everyone in the check-in.",
    });

    /* Kept on the ground's own audit log (no schema change - see who-shared-it-because-the-lead-left.ts),
       so a later reader of the report is told the same thing this release just decided. */
    expect(prisma.ground.update).toHaveBeenCalledTimes(1);
    expect(ground.groundAuditLog.sharedBecauseLeadLeft).toMatchObject({
      byUserId: 'grace', byName: 'Grace Otieno', leadName: 'Rukia Mwangi',
      sentence: 'Grace Otieno shared this report, because Rukia Mwangi has left the organisation.',
    });

    /* And the notification mail carries the same sentence. */
    const service = (controller as any).reports;
    expect(service.tellThemTheReportIsReady).toHaveBeenCalledWith(
      'g1', 1, undefined, 'Grace Otieno shared this report, because Rukia Mwangi has left the organisation.',
    );
  });

  it('a departed lead cannot release it themselves either - there is nobody left to sign in as them, but the door is refused the same way', async () => {
    const { controller, prisma } = world(false);
    /* Rukia's own account is gone; nothing calls release() as 'rukia' any more in practice, but the
       route itself still only trusts initiatorId === userId for "is the lead", so this documents
       that the exception is for ANOTHER admin, never a wider hole. */
    const refused = await controller.release('g1', 'daniel', 'org1').catch((e) => e);
    expect(refused).toBeInstanceOf(ForbiddenException);
    expect(prisma.report.update).not.toHaveBeenCalled();
  });
});
