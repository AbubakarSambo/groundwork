import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BillingController } from './billing.controller';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';

/**
 * E3 authz tripwire. GET /billing/admin/stats returned platform-wide billing
 * data (every org, code, redemption) to any authenticated user with no role
 * check at all. Pins both halves of the fix: the guard itself refuses a
 * non-platform-admin, and the route method still actually carries
 * @UseGuards(PlatformAdminGuard) - the class of regression where someone
 * removes the decorator later while the guard implementation stays innocent.
 */
describe('BillingController - admin/stats authz (E3)', () => {
  it('PlatformAdminGuard refuses a non-platform-admin user', () => {
    const guard = new PlatformAdminGuard();
    const context: any = {
      switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u1', isPlatformAdmin: false } }) }),
    };
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('PlatformAdminGuard refuses a request with no user on it', () => {
    const guard = new PlatformAdminGuard();
    const context: any = { switchToHttp: () => ({ getRequest: () => ({}) }) };
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('PlatformAdminGuard allows a platform admin', () => {
    const guard = new PlatformAdminGuard();
    const context: any = {
      switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u1', isPlatformAdmin: true } }) }),
    };
    expect(guard.canActivate(context)).toBe(true);
  });

  it('platformAdminStats route still carries @UseGuards(PlatformAdminGuard)', () => {
    const reflector = new Reflector();
    const guards = reflector.get('__guards__', BillingController.prototype.platformAdminStats);
    expect(guards).toBeDefined();
    expect(guards).toContain(PlatformAdminGuard);
  });
});
