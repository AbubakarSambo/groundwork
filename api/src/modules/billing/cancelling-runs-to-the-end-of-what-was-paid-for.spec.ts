import { BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';

/**
 * CANCELLING RUNS TO THE END OF WHAT WAS PAID FOR.
 *
 * cancelSubscription called Stripe's immediate cancel and nulled the plan, the status, the id and
 * the period end. A customer who cancelled on day two of a paid month lost twenty-eight days they
 * had paid for, with no refund and no notice. Now it schedules the end with Stripe and writes when;
 * the status stays `active` - isSubscribed reads `active` alone - and the deletion webhook writes
 * `cancelled` on the day. A scheduled end can be undone.
 */
const periodEnd = new Date('2026-09-30T00:00:00Z');
const svc = (org: any) => {
  const writes: any[] = [];
  const stripe: any = {
    cancelSubscriptionAtPeriodEnd: jest.fn(async () => ({ current_period_end: Math.floor(periodEnd.getTime() / 1000) })),
    stripe: { subscriptions: { cancel: jest.fn(), update: jest.fn(async () => ({})) } },
  };
  const s = Object.create(BillingService.prototype) as any;
  s.stripe = stripe;
  s.logger = { log: () => {}, warn: () => {} };
  s.prisma = {
    organization: {
      findUnique: jest.fn(async () => org),
      update: jest.fn(async (a: any) => { writes.push(a.data); return {}; }),
    },
  };
  return { s, stripe, writes };
};
const live = { subscriptionStripeId: 'sub_1', subscriptionPeriodEnd: periodEnd, subscriptionEndsAt: null };

describe('cancelling', () => {
  it('schedules the end at the period end rather than ending it now', async () => {
    const { s, stripe } = svc(live);
    await s.cancelSubscription('org');
    expect(stripe.cancelSubscriptionAtPeriodEnd).toHaveBeenCalledWith('sub_1');
    expect(stripe.stripe.subscriptions.cancel).not.toHaveBeenCalled();
  });

  it('writes when access stops and touches nothing else - not the plan, not the status, not the id', async () => {
    const { s, writes } = svc(live);
    const res = await s.cancelSubscription('org');
    expect(writes).toEqual([{ subscriptionEndsAt: periodEnd }]);
    expect(res).toEqual({ endsAt: periodEnd });
    for (const w of writes) {
      expect(w).not.toHaveProperty('subscriptionStatus');
      expect(w).not.toHaveProperty('subscriptionPlan');
      expect(w).not.toHaveProperty('subscriptionStripeId');
    }
  });
});

describe('keeping it', () => {
  it('undoes a scheduled end and clears the date', async () => {
    const { s, stripe, writes } = svc({ ...live, subscriptionEndsAt: periodEnd });
    await s.keepSubscription('org');
    expect(stripe.stripe.subscriptions.update).toHaveBeenCalledWith('sub_1', { cancel_at_period_end: false });
    expect(writes).toEqual([{ subscriptionEndsAt: null }]);
  });

  it('has nothing to keep when no end is scheduled', async () => {
    const { s, stripe } = svc(live);
    await expect(s.keepSubscription('org')).rejects.toBeInstanceOf(BadRequestException);
    expect(stripe.stripe.subscriptions.update).not.toHaveBeenCalled();
  });
});

describe('the record follows Stripe', () => {
  const handle = async (type: string, sub: any) => {
    const writes: any[] = [];
    const s = Object.create(BillingService.prototype) as any;
    s.logger = { log: () => {}, warn: () => {}, error: () => {} };
    s.email = { sendSubscriptionCancelled: jest.fn(async () => ({})) };
    s.prisma = {
      organization: {
        findUnique: jest.fn(async () => ({ email: 'a@b.c', subscriptionPlan: 'TEAM' })),
        update: jest.fn(async (a: any) => { writes.push(a.data); return {}; }),
      },
    };
    await s.handleStripeEvent({ type, data: { object: sub } });
    return writes;
  };
  const sub = { metadata: { organizationId: 'org', plan: 'TEAM' }, status: 'active', current_period_end: Math.floor(periodEnd.getTime() / 1000) };

  it('a cancellation scheduled or undone in the Stripe portal is mirrored on the update event', async () => {
    const scheduled = await handle('customer.subscription.updated', { ...sub, cancel_at_period_end: true });
    expect(scheduled[0]).toMatchObject({ subscriptionStatus: 'active', subscriptionEndsAt: periodEnd });
    const undone = await handle('customer.subscription.updated', { ...sub, cancel_at_period_end: false });
    expect(undone[0]).toMatchObject({ subscriptionEndsAt: null });
  });

  it('and the deletion, on the day, is what writes cancelled and clears the date', async () => {
    const writes = await handle('customer.subscription.deleted', sub);
    expect(writes[0]).toMatchObject({ subscriptionStatus: 'cancelled', subscriptionPlan: null, subscriptionEndsAt: null });
  });
});
