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

function world() {
  const report = { id: 'r1', groundId: 'g1', releasedAt: null as Date | null };
  const ground = {
    id: 'g1', organizationId: 'org1', initiatorId: 'rukia', scenario: 'NEW_PROJECT',
    participants: [
      { id: 'p-lead', userId: 'rukia', user: { passwordHash: 'x' } },
      { id: 'p-1', userId: 'daniel', user: { passwordHash: 'x' } },
    ],
    report,
  };
  const prisma: any = {
    ground: { findFirst: jest.fn(async ({ where }: any) => (where.id === 'g1' && where.organizationId === 'org1' ? ground : null)) },
    report: { update: jest.fn(async () => { report.releasedAt = new Date('2026-09-29T10:00:00Z'); return { ...report, sharedPicture: 'private rows', ratings: { daniel: 2 } }; }) },
    checkIn: { aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })) },
  };
  const service = new ReportsService(prisma, {} as any, {} as any, {} as any, { get: () => false } as any, {} as any, {} as any, { tell: async () => [] } as any);
  (service as any).tellThemTheReportIsReady = jest.fn(async () => ({ attempted: 0, failed: 0 }));
  (service as any).usage = { emit: jest.fn(async () => undefined) };
  return { controller: new ReportsController(service), prisma, report };
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
    expect(served).toEqual({ groundId: 'g1', releasedAt: new Date('2026-09-29T10:00:00Z') });
  });
});
