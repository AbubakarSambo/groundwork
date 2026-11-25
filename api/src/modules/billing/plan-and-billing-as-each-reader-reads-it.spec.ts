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
  /* The free extension's route went with the free plan, 22 November 2026. */
  'cancelAccount', 'createSubscription', 'cancelSubscription', 'keepSubscription',
  'changeSubscriptionPlan', 'pauseSubscription', 'resumeSubscription', 'applyContributorCode',
  'purchaseSession', 'redeemContributorCode', 'disableCode', 'getShareCard', 'listContributorCodes', 'portal',
  /* Turning the WhatsApp add-on on or off (decision 78). */
  'turnWhatsApp',
];
/* Groundwork's own staff only, whatever their role in an organisation. */
const STAFF_ONLY = ['generateContributorCode', 'sendContributorCodeToEmail', 'platformAdminStats', 'creditSession', 'stripeFailures'];
/* Read by anybody signed in, because the People and check-in pages warn about a full plan. */
/* The WhatsApp read is served to everybody, cut down for anybody but an admin (decision 78). */
const ANYBODY_SIGNED_IN = ['status', 'canCreateGround', 'whatsapp'];
/* Before there is an account, or from Stripe itself (checked by Stripe's own signature). */
const PUBLIC = ['onTheHouse', 'getPricing', 'webhook'];
/* Anybody in the organisation, never a guest from outside: "Remind them" on a paused check-in (upgrade.txt). */
/* And "This adds a seat: +$5 a month" before an invitation (fix list item 6). */
const IN_THE_ORGANISATION = ['remindTheAdmins', 'nextSeat'];

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
    expect([...routes].sort()).toEqual([...ADMIN_ONLY, ...STAFF_ONLY, ...ANYBODY_SIGNED_IN, ...PUBLIC, ...IN_THE_ORGANISATION].sort());
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

describe('the invoices on Plan and billing', () => {
  function billing() {
    const asked: any[] = [];
    const prisma: any = {
      organization: {
        findUnique: async () => ({
          stripeCustomerId: null, defaultPaymentMethodId: null, subscriptionPlan: 'GROWTH', subscriptionStatus: 'active',
          subscriptionPeriodEnd: new Date('2026-10-01'), subscriptionEndsAt: null, freeExtensionUsed: false,
          freeUntil: null, freePlan: null, freeTrialStartedAt: null,
        }),
      },
      user: { count: async () => 27 },
      ground: { count: async () => 0, findMany: async () => [] },
      report: { count: async () => 0 },
      groundParticipant: { findMany: async () => [] },
      billingEvent: {
        findMany: jest.fn(async (q: any) => {
          asked.push(q);
          return [{ periodStart: new Date('2026-09-01'), amountCents: 40000, currency: 'USD' }];
        }),
      },
    };
    const pricing: any = { memberCapFor: async () => 100, getFreeMemberLimit: async () => 5 };
    const { BillingService } = require('./billing.service');
    return { svc: new BillingService(prisma, { stripe: {} } as any, pricing, {} as any, {} as any, {} as any), asked };
  }

  it('Grace, an admin, reads this organisation’s paid subscription invoices, newest first', async () => {
    const { svc, asked } = billing();
    const status = await svc.getStatus('org-baridi', true);
    expect(status.invoices).toEqual([{ paidOn: new Date('2026-09-01'), amountCents: 40000, currency: 'USD' }]);
    expect(asked[0].where).toEqual({ organizationId: 'org-baridi', type: 'SUBSCRIPTION_FEE', status: 'PAID' });
  });

  it('nobody else is even looked up for', async () => {
    const { svc, asked } = billing();
    const status = await svc.getStatus('org-baridi', false);
    expect(status.invoices).toBeUndefined();
    expect(asked).toEqual([]);
  });
});

describe('the size the team started with (settings-billing.txt, "Free trial")', () => {
  const { theSizeItStartedWith } = require('./billing.service');

  it('says what was answered when the organisation was made, in a full sentence', () => {
    expect(theSizeItStartedWith({ name: 'Baridi Appliances', teamSizeSaid: 'more', teamSizeLine: 20 })).toEqual({
      said: 'more', line: 20, says: 'When Baridi Appliances was set up, it had 20 or more people.',
    });
    expect(theSizeItStartedWith({ name: 'Kijani Repairs', teamSizeSaid: 'fewer', teamSizeLine: 20 })!.says).toBe('When Kijani Repairs was set up, it had fewer than 20 people.');
    expect(theSizeItStartedWith({ name: 'Baridi Appliances', teamSizeSaid: null, teamSizeLine: null })).toBeNull();
  });

  it('Grace, an admin, is served it; Wairimu, a lead, and Miriam, who takes part, are not', () => {
    const startedWith = { said: 'more', line: 20, says: 'When Baridi Appliances was set up, it had 20 or more people.' };
    const full: any = { subscription: { plan: 'GROWTH', status: 'active' }, people: { count: 27, cap: 100 }, onTheHouse: null, startedWith };
    expect((theStatusAsTheyMayReadIt(full, 'ADMIN') as any).startedWith).toEqual(startedWith);
    for (const role of ['LEAD', 'MEMBER', 'GUEST']) expect(JSON.stringify(theStatusAsTheyMayReadIt(full, role))).not.toContain('set up');
  });
});

describe('"Remind them", when a check-in is paused until the team subscribes (upgrade.txt)', () => {
  const guard = new RolesGuard(new Reflector());
  it('Grace, Wairimu and Miriam may press it; Tomas, a guest from outside, may not', () => {
    for (const role of ['ADMIN', 'LEAD', 'MEMBER']) expect(guard.canActivate(contextFor('remindTheAdmins', role))).toBe(true);
    expect(() => guard.canActivate(contextFor('remindTheAdmins', 'GUEST'))).toThrow(ForbiddenException);
  });

  function world(o: { allowed?: boolean; admins?: string[]; slot?: number[] } = {}) {
    const sent: string[] = [];
    const slots = [...(o.slot ?? [1])];
    const prisma: any = {
      ground: { findUnique: async () => ({ organizationId: 'org-baridi', organization: { name: 'Baridi Appliances' } }) },
      user: { findMany: async () => (o.admins ?? ['grace@baridi.test']).map((email) => ({ email })) },
      $executeRaw: jest.fn(async () => slots.shift() ?? 0),
    };
    const email: any = { sendPaymentRequestEmail: jest.fn(async (to: string) => { sent.push(to); }) };
    const { BillingService } = require('./billing.service');
    const svc = new BillingService(prisma, { stripe: {} } as any, {} as any, {} as any, email, {} as any);
    svc.canStartSession = async () => ({ allowed: o.allowed ?? false, sessionsBalance: 0 });
    return { svc, sent };
  }

  it('Miriam reminds the admins once, and reads that she can do it again tomorrow', async () => {
    const { svc, sent } = world({ slot: [1, 0] });
    expect(await svc.remindTheAdmins('org-baridi', 'u-miriam', 'g-1')).toEqual({ reminded: true, says: 'We have reminded your admins that you are waiting. You can remind them again tomorrow.' });
    expect(sent).toEqual(['grace@baridi.test']);
    expect(await svc.remindTheAdmins('org-baridi', 'u-miriam', 'g-1')).toEqual({ reminded: false, says: 'You already reminded your admins today. You can remind them again tomorrow.' });
    expect(sent).toEqual(['grace@baridi.test']);
  });

  it('nobody is reminded when the check-in is not paused, or when there is no admin', async () => {
    const open = world({ allowed: true });
    expect(await open.svc.remindTheAdmins('org-baridi', 'u-miriam', 'g-1')).toEqual({ reminded: false, says: 'This check-in is not paused, so there is nobody to remind.' });
    expect(open.sent).toEqual([]);
    const none = world({ admins: [] });
    expect((await none.svc.remindTheAdmins('org-baridi', 'u-miriam', 'g-1')).says).toBe('Your organisation has no admin to remind yet. Tell the person who runs this check-in.');
  });
});
