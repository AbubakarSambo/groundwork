import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { BillingController, theStatusAsTheyMayReadIt } from './billing.controller';

/**
 * PLAN AND BILLING, AS EACH PERSON IS SERVED IT (F2, U.19).
 *
 * Baridi Appliances. Grace is an admin; Wairimu a lead; Miriam takes part; Tomas is a guest.
 *
 * "Plan and billing" is the admin's door, and only an admin manages billing. That is held by the
 * server, whatever the screen shows: every route that changes the plan, pays, pauses, cancels, opens
 * the card and invoices, or reads the access codes refuses a lead, a member and a guest.
 */

const ADMIN_ONLY = [
  'cancelAccount', 'claimFreeExtension', 'createSubscription', 'cancelSubscription', 'keepSubscription',
  'changeSubscriptionPlan', 'pauseSubscription', 'resumeSubscription', 'applyContributorCode',
  'purchaseSession', 'redeemContributorCode', 'disableCode', 'getShareCard', 'listContributorCodes', 'portal',
];
/* Groundwork's own staff only, whatever their role in an organisation. */
const STAFF_ONLY = ['generateContributorCode', 'sendContributorCodeToEmail', 'platformAdminStats', 'creditSession', 'stripeFailures'];
/* Read by anybody signed in, because the People and check-in pages warn about a full plan. */
const ANYBODY_SIGNED_IN = ['status', 'canCreateGround'];
/* Before there is an account, or from Stripe itself (checked by Stripe's own signature). */
const PUBLIC = ['onTheHouse', 'getPricing', 'webhook'];

function contextFor(handler: string, role: string) {
  return {
    getHandler: () => (BillingController.prototype as any)[handler],
    getClass: () => BillingController,
    switchToHttp: () => ({ getRequest: () => ({ user: { id: `u-${role}`, organizationId: 'org-baridi', role } }) }),
  } as any;
}

describe('every billing route is sorted into who may use it', () => {
  it('and none is left out, so a new route has to be placed on purpose', () => {
    const routes = Object.getOwnPropertyNames(BillingController.prototype)
      .filter((n) => n !== 'constructor' && Reflect.getMetadata('path', (BillingController.prototype as any)[n]) !== undefined);
    expect([...routes].sort()).toEqual([...ADMIN_ONLY, ...STAFF_ONLY, ...ANYBODY_SIGNED_IN, ...PUBLIC].sort());
  });
});

describe('only an admin manages billing, held by the server', () => {
  const guard = new RolesGuard(new Reflector());

  it('Grace, an admin, reaches every route that manages billing', () => {
    for (const h of ADMIN_ONLY) expect(guard.canActivate(contextFor(h, 'ADMIN'))).toBe(true);
  });

  for (const [who, role] of [['Wairimu, a lead', 'LEAD'], ['Miriam, who takes part', 'MEMBER'], ['Tomas, a guest', 'GUEST']]) {
    it(`${who} is refused every route that manages billing`, () => {
      for (const h of ADMIN_ONLY) expect(() => guard.canActivate(contextFor(h, role))).toThrow(ForbiddenException);
    });
  }

  it('the codes and the credits are for Groundwork’s own staff, not for an organisation’s admin', () => {
    const reflector = new Reflector();
    for (const h of STAFF_ONLY) {
      expect(reflector.get('__guards__', (BillingController.prototype as any)[h])).toContain(PlatformAdminGuard);
    }
  });
});

describe('what GET /billing/status serves each reader', () => {
  const FULL = {
    subscription: { plan: 'GROWTH', status: 'active', periodEnd: new Date('2026-10-01'), endsAt: null, freeExtensionUsed: false },
    people: { count: 27, cap: 100 },
    onTheHouse: null,
    usage: { checkIns: 38, reportsReleased: 12, peopleTakingPart: 25 },
    activeGrounds: [{ groundId: 'g-1', label: 'Leadership, Q3', startedAt: null, sessionsBalance: 0 }],
    card: { brand: 'visa', last4: '4417' },
  } as any;

  it('Grace, an admin, is served all of it', () => {
    expect(theStatusAsTheyMayReadIt(FULL, 'ADMIN')).toBe(FULL);
  });

  for (const [who, role] of [['Wairimu, a lead', 'LEAD'], ['Miriam, who takes part', 'MEMBER']]) {
    it(`${who} is served the seat count and the plan, and nothing about the money`, () => {
      const got = theStatusAsTheyMayReadIt(FULL, role);
      expect(got).toEqual({ subscription: { plan: 'GROWTH', status: 'active' }, people: { count: 27, cap: 100 }, onTheHouse: null });
      expect(JSON.stringify(got)).not.toMatch(/4417|visa|periodEnd|usage|Leadership/);
    });
  }

  it('a free run’s plan and end reach a lead, so the full-plan warning is true, but not whether it is the trial', () => {
    const until = new Date('2026-12-27');
    const got: any = theStatusAsTheyMayReadIt({ ...FULL, onTheHouse: { plan: 'SMALL_TEAM', until, freeTrial: true } }, 'LEAD');
    expect(got.onTheHouse).toEqual({ plan: 'SMALL_TEAM', until });
  });

  it('Tomas, a guest from outside, is served nothing', () => {
    expect(theStatusAsTheyMayReadIt(FULL, 'GUEST')).toEqual({});
  });
});
