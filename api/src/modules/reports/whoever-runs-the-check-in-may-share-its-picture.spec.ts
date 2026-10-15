import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ReportsController } from './reports.controller';
import { ONLY_THE_LEAD_RELEASES } from './only-the-lead-releases';

/**
 * The person who runs a check-in with the role "Can open check-ins" was refused when sharing the team's
 * picture: "This action requires one of the following roles: ADMIN" (the user journeys, 4 October 2026).
 * Decision 76: the lead releases each session's picture. The guard that runs before the route is the real
 * one; the service already refuses everybody who is not the lead.
 */
const contextFor = (role: string): ExecutionContext => ({
  getHandler: () => ReportsController.prototype.release,
  getClass: () => ReportsController,
  switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u-wairimu', role } }) }),
} as any);

describe('sharing the team\'s picture', () => {
  const guard = new RolesGuard(new Reflector());

  it.each(['MEMBER', 'ADMIN', 'MANAGER'])('is let through the role check for a person whose role is %s', (role) => {
    expect(guard.canActivate(contextFor(role))).toBe(true);
  });

  it('and somebody who is not the lead is still told, in a sentence, that only the lead shares it', async () => {
    const { ReportsService } = await import('./reports.service');
    const prisma: any = {
      ground: { findFirst: async () => ({ initiatorId: 'u-grace' }) },
      user: { findUnique: async () => ({ isActive: true, firstName: 'Grace', lastName: 'Okoye' }) },
    };
    const svc: any = Object.create(ReportsService.prototype);
    svc.prisma = prisma;
    await expect(svc.releaseAsTheLead('g1', 'u-amani', 'o1')).rejects.toThrow(ONLY_THE_LEAD_RELEASES);
  });
});
