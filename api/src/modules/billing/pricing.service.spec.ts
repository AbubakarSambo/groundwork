import { BadRequestException } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import {
  PricingService,
  DEFAULT_PLAN_PRICES_CENTS,
  DEFAULT_FREE_GROUND_LIMIT,
  PRICING_SETTING_KEY,
  MIN_PLAN_CENTS,
  MAX_PLAN_CENTS,
} from './pricing.service';

/**
 * PRICES THAT A PLATFORM ADMIN CAN EDIT, AND THE THINGS THAT MUST NOT HAPPEN.
 *
 * This is the code path between a text field and a charge on somebody's card, so the tests that
 * matter here are the refusals, not the happy path. A bad stored row must degrade to the last
 * shipped price, never to zero and never to a crash; and a typo in the admin form must be refused
 * with a sentence rather than rounded into a real subscription.
 */
function makeService(storedValue?: unknown, opts: { throws?: boolean } = {}) {
  const upsert = jest.fn(async ({ create, update }: any) => ({
    updatedAt: new Date('2026-08-17T00:00:00Z'),
    updatedBy: (update ?? create).updatedBy,
    value: (update ?? create).value,
  }));
  const findUnique = jest.fn(async () => {
    if (opts.throws) throw new Error('database is down');
    return storedValue === undefined
      ? null
      : { key: PRICING_SETTING_KEY, value: storedValue, updatedAt: new Date('2026-08-01T00:00:00Z'), updatedBy: 'admin-1' };
  });
  const prisma: any = { platformSetting: { findUnique, upsert } };
  return { svc: new PricingService(prisma), upsert, findUnique };
}

describe('with nothing stored, the code defaults are the prices', () => {
  it('returns every default', async () => {
    const { svc } = makeService();
    const snap = await svc.getSnapshot();
    expect(snap.planPricesCents).toEqual(DEFAULT_PLAN_PRICES_CENTS);
    expect(snap.freeGroundLimit).toBe(DEFAULT_FREE_GROUND_LIMIT);
  });

  it('and reports that nobody has changed anything', async () => {
    /** The admin screen says "never changed" off this, rather than inventing a date. */
    const { svc } = makeService();
    const snap = await svc.getSnapshot();
    expect(snap.updatedAt).toBeNull();
    expect(snap.updatedBy).toBeNull();
  });
});

describe('a stored row that has gone bad falls back rather than charging wrong', () => {
  it.each([
    ['zero', 0],
    ['negative', -500],
    ['a string', '2500'],
    ['null', null],
    ['absurdly large', MAX_PLAN_CENTS + 1],
    ['below what Stripe accepts', MIN_PLAN_CENTS - 1],
    ['not a number at all', Number.NaN],
  ])('%s falls back to the shipped price for that plan', async (_label, bad) => {
    const { svc } = makeService({ planPricesCents: { [SubscriptionPlan.STARTER]: bad } });
    const snap = await svc.getSnapshot();
    expect(snap.planPricesCents[SubscriptionPlan.STARTER]).toBe(DEFAULT_PLAN_PRICES_CENTS[SubscriptionPlan.STARTER]);
  });

  it('a partial row leaves the other plans at their defaults', async () => {
    /** An admin who edits one plan must not silently zero out the other four. */
    const { svc } = makeService({ planPricesCents: { [SubscriptionPlan.GROWTH]: 12500 } });
    const snap = await svc.getSnapshot();
    expect(snap.planPricesCents[SubscriptionPlan.GROWTH]).toBe(12500);
    expect(snap.planPricesCents[SubscriptionPlan.STARTER]).toBe(DEFAULT_PLAN_PRICES_CENTS[SubscriptionPlan.STARTER]);
  });

  it('and a database that will not answer still yields usable prices', async () => {
    /**
     * The one that decides whether a Postgres blip takes checkout down or merely serves last
     * week's price. It must never throw out of here.
     */
    const { svc } = makeService(undefined, { throws: true });
    const snap = await svc.getSnapshot();
    expect(snap.planPricesCents).toEqual(DEFAULT_PLAN_PRICES_CENTS);
  });
});

describe('reading a single plan for a charge', () => {
  it('returns the stored price when there is a good one', async () => {
    const { svc } = makeService({ planPricesCents: { [SubscriptionPlan.SCALE]: 45000 } });
    expect(await svc.getPlanPriceCents(SubscriptionPlan.SCALE)).toBe(45000);
  });

  it('and returns nothing for a plan nobody can buy', async () => {
    /** The caller turns this into a refusal. Undefined must never reach Stripe as an amount. */
    const { svc } = makeService();
    expect(await svc.getPlanPriceCents(SubscriptionPlan.ENTERPRISE)).toBeUndefined();
  });
});

describe('writing new prices', () => {
  it('stores a valid change and records who made it', async () => {
    const { svc, upsert } = makeService();
    const res = await svc.update({ planPricesCents: { [SubscriptionPlan.STARTER]: 3000 } }, 'admin-9');
    expect(res.planPricesCents[SubscriptionPlan.STARTER]).toBe(3000);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0].update.updatedBy).toBe('admin-9');
  });

  it('leaves untouched plans exactly as they were', async () => {
    const { svc } = makeService();
    const res = await svc.update({ planPricesCents: { [SubscriptionPlan.STARTER]: 3000 } }, 'admin-9');
    expect(res.planPricesCents[SubscriptionPlan.SCALE]).toBe(DEFAULT_PLAN_PRICES_CENTS[SubscriptionPlan.SCALE]);
  });

  it.each([
    ['zero', 0],
    ['negative', -100],
    ['under the Stripe minimum', MIN_PLAN_CENTS - 1],
    ['over the sanity ceiling', MAX_PLAN_CENTS + 1],
  ])('refuses %s and writes nothing', async (_label, bad) => {
    const { svc, upsert } = makeService();
    await expect(svc.update({ planPricesCents: { [SubscriptionPlan.STARTER]: bad } }, 'admin-9')).rejects.toThrow(
      BadRequestException,
    );
    expect(upsert).not.toHaveBeenCalled();
  });

  it('refuses a non-numeric price', async () => {
    const { svc } = makeService();
    await expect(
      svc.update({ planPricesCents: { [SubscriptionPlan.STARTER]: '25' as unknown as number } }, 'admin-9'),
    ).rejects.toThrow(/must be a number of cents/);
  });

  it('refuses to price ENTERPRISE, and says why', async () => {
    const { svc } = makeService();
    await expect(
      svc.update({ planPricesCents: { [SubscriptionPlan.ENTERPRISE]: 90000 } }, 'admin-9'),
    ).rejects.toThrow(/priced in conversation/);
  });

  it('refuses a plan name that is not a plan', async () => {
    const { svc } = makeService();
    await expect(svc.update({ planPricesCents: { PLATINUM: 90000 } }, 'admin-9')).rejects.toThrow(BadRequestException);
  });

  it('one bad field rejects the whole write, including the good fields beside it', async () => {
    /**
     * Saving half of a pricing change would leave the ladder incoherent - a Growth plan cheaper
     * than Starter - with no error to say so.
     */
    const { svc, upsert } = makeService();
    await expect(
      svc.update({ planPricesCents: { [SubscriptionPlan.STARTER]: 3000, [SubscriptionPlan.GROWTH]: 0 } }, 'admin-9'),
    ).rejects.toThrow(BadRequestException);
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe('the free ground limit', () => {
  it('can be changed on its own without restating prices', async () => {
    const { svc } = makeService();
    const res = await svc.update({ freeGroundLimit: 3 }, 'admin-9');
    expect(res.freeGroundLimit).toBe(3);
    expect(res.planPricesCents).toEqual(DEFAULT_PLAN_PRICES_CENTS);
  });

  it('can be zero, which is a real choice', async () => {
    /** "No free tier" is a decision a founder is allowed to make, unlike a negative limit. */
    const { svc } = makeService();
    expect((await svc.update({ freeGroundLimit: 0 }, 'admin-9')).freeGroundLimit).toBe(0);
  });

  it.each([['negative', -1], ['absurd', 100000], ['not a number', 'ten']])(
    'refuses %s',
    async (_label, bad) => {
      const { svc } = makeService();
      await expect(svc.update({ freeGroundLimit: bad as unknown as number }, 'admin-9')).rejects.toThrow(
        BadRequestException,
      );
    },
  );
});

describe('restoring the shipped prices', () => {
  it('writes the code defaults back over whatever was there', async () => {
    const { svc } = makeService({ planPricesCents: { [SubscriptionPlan.STARTER]: 9900 }, freeGroundLimit: 1 });
    const res = await svc.resetToDefaults('admin-9');
    expect(res.planPricesCents).toEqual(DEFAULT_PLAN_PRICES_CENTS);
    expect(res.freeGroundLimit).toBe(DEFAULT_FREE_GROUND_LIMIT);
  });
});
