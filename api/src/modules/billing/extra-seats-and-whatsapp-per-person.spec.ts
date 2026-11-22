import { BillingService } from './billing.service';
import { PricingService, EXTRA_SEAT_KIND, WHATSAPP_ADD_ON_KIND, aLiveKeyIsRefusedHere } from './pricing.service';
import { WhatsAppAddOnService, theMonthStarted } from './whatsapp-add-on.service';
import { thisMonth, aCheaperPlan, seatsCost, thisAddsASeat, whatsappPeopleCharged, type APlansPrices } from './what-a-month-costs';
import { theStatusAsTheyMayReadIt } from './billing.controller';
import { AdminController } from '../admin/admin.controller';
import { whilePayingIsPossible } from './paying-is-possible-for-specs';

/* Paying is possible in this file, so the pause and the no-plan refusals apply as built (23 November 2026). */
whilePayingIsPossible();

// The services under test read the real clock, and this file is written as of 15 October 2026 (see NOW):
// the "free month" in it ends 14 November. Freeze the date only, or it starts failing once that passes.
beforeAll(() => {
  jest.useFakeTimers({
    now: new Date('2026-10-15T10:00:00Z'),
    doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'queueMicrotask', 'performance', 'hrtime'],
  });
});
afterAll(() => jest.useRealTimers());

/**
 * THE NEW PRICING (fix list item 6, Hafsah, 15 October 2026).
 *
 * Baridi Appliances: Grace is its admin, Wairimu leads a check-in, Miriam takes part. The plans keep their prices and seats;
 * any plan adds seats at +$5 a month; WhatsApp is $4 a month for each person who used it, never more than the seats.
 * Read as Grace (Plan and billing), as Wairimu inviting somebody, and as Stripe (test mode). Today is 15 October 2026.
 */
const NOW = new Date('2026-10-15T10:00:00Z');
const ON = { on: true, teamsUnder: 20, months: 1, onSince: '2026-09-01T00:00:00Z' };
const OFF = { on: false, teamsUnder: 20, months: 1 };

const PLANS = (): any[] => [
  { plan: 'STARTER', amountCents: 2500, memberCap: 5, extraSeatCents: 500, whatsappPersonCents: 400, whatsappAddOnCents: 2000, whatsappMonthlyLimit: null },
  { plan: 'SMALL_TEAM', amountCents: 9000, memberCap: 20, extraSeatCents: 500, whatsappPersonCents: 400, whatsappAddOnCents: 7200, whatsappMonthlyLimit: null },
  { plan: 'GROWTH', amountCents: 40000, memberCap: 100, extraSeatCents: 500, whatsappPersonCents: 400, whatsappAddOnCents: 32000, whatsappMonthlyLimit: null },
  { plan: 'BUSINESS', amountCents: 90000, memberCap: 250, extraSeatCents: 500, whatsappPersonCents: 400, whatsappAddOnCents: 72000, whatsappMonthlyLimit: null },
  { plan: 'SCALE', amountCents: 165000, memberCap: 500, extraSeatCents: 500, whatsappPersonCents: 400, whatsappAddOnCents: 132000, whatsappMonthlyLimit: null },
  { plan: 'ENTERPRISE', amountCents: null, memberCap: null, extraSeatCents: null, whatsappPersonCents: null, whatsappAddOnCents: null, whatsappMonthlyLimit: null },
];

const PAYING_SMALL_TEAM = {
  name: 'Baridi Appliances', email: 'grace@baridi.test', createdAt: new Date('2026-08-01T09:00:00Z'),
  subscriptionPlan: 'SMALL_TEAM', subscriptionStatus: 'active', subscriptionStripeId: 'sub_test_baridi',
  subscriptionPeriodEnd: new Date('2026-11-01T00:00:00Z'), subscriptionEndsAt: null, freeUntil: null, freePlan: null, freeTrialStartedAt: null,
  whatsappAddOnOn: false, whatsappAddOnItemId: null, whatsappFreeUntil: new Date('2026-09-01T00:00:00Z'), whatsappPeopleItemId: null,
  whatsappFlatAddOnKept: false, extraSeatsItemId: null, freeExtensionUsed: false, stripeCustomerId: 'cus_test', defaultPaymentMethodId: null,
};

function world(opts: { org?: any; seats: number; trial?: any; whatsappNumbers?: string[] }) {
  const org: any = { id: 'org-baridi', ...(opts.org ?? PAYING_SMALL_TEAM) };
  const plans = PLANS();
  const trial = opts.trial ?? ON;
  const prisma: any = {
    organization: {
      findUnique: jest.fn(async () => ({ ...org })),
      findMany: jest.fn(async () => [{ id: org.id }]),
      update: jest.fn(async (q: any) => { Object.assign(org, q.data); return org; }),
    },
    pricingPlan: {
      findMany: jest.fn(async () => plans),
      findUnique: jest.fn(async (q: any) => plans.find((p) => p.plan === q.where.plan)),
      update: jest.fn(async (q: any) => { Object.assign(plans.find((p) => p.plan === q.where.plan)!, q.data); return {}; }),
    },
    platformSetting: {
      findUnique: jest.fn(async (q: any) => {
        if (q.where.key === 'pricing.freeTrial') return { value: trial };
        if (q.where.key === 'pricing.freeMemberLimit') return { value: 5 };
        return null;
      }),
    },
    whatsAppMonthlyUse: { findUnique: jest.fn(async () => null) },
    whatsAppSend: { findMany: jest.fn(async () => (opts.whatsappNumbers ?? []).map((phone) => ({ phone }))) },
    user: { count: jest.fn(async () => opts.seats), findMany: jest.fn(async () => []) },
    ground: { count: jest.fn(async () => 0), findMany: jest.fn(async () => []) },
    report: { count: jest.fn(async () => 0) },
    groundParticipant: { findMany: jest.fn(async () => []) },
    billingEvent: { findMany: jest.fn(async () => []) },
  };
  const stripeCalls: any[] = [];
  const items: Record<string, any> = {};
  const stripe: any = {
    isConfigured: true,
    stripe: {
      products: { create: jest.fn(async () => ({ id: 'prod_test' })) },
      prices: { create: jest.fn(async (a: any) => { stripeCalls.push(['prices.create', a]); return { id: `price_test_${a.metadata.kind ?? 'plan'}_${a.metadata.plan}` }; }) },
      subscriptions: {
        retrieve: jest.fn(async () => ({ items: { data: [{ id: 'si_plan', price: { id: 'price_plan', metadata: { plan: org.subscriptionPlan } } }, ...Object.values(items)] }, current_period_end: 1793491200 })),
        update: jest.fn(async (id: string, a: any) => { stripeCalls.push(['subscriptions.update', id, a]); return { current_period_end: 1793491200 }; }),
      },
      subscriptionItems: {
        create: jest.fn(async (a: any) => { const id = `si_${a.metadata.kind}`; items[id] = { id, price: { id: a.price, metadata: { kind: a.metadata.kind } }, quantity: a.quantity }; stripeCalls.push(['items.create', a]); return { id }; }),
        retrieve: jest.fn(async (id: string) => items[id] ?? null),
        update: jest.fn(async (id: string, a: any) => { Object.assign(items[id], { quantity: a.quantity, price: { id: a.price } }); stripeCalls.push(['items.update', id, a]); return {}; }),
        del: jest.fn(async (id: string, a: any) => { delete items[id]; stripeCalls.push(['items.del', id, a]); return {}; }),
        createUsageRecord: jest.fn(async (id: string, a: any) => { stripeCalls.push(['usage', id, a]); return {}; }),
      },
      checkout: { sessions: { create: jest.fn(async (a: any, o: any) => { stripeCalls.push(['checkout', a, o]); return { url: 'https://checkout.stripe.test/s' }; }) } },
    },
    ensureCustomer: jest.fn(async () => 'cus_test'),
  };
  const emails: any[] = [];
  const email: any = {
    sendBillingChangeNotification: jest.fn(async (...a: any[]) => { emails.push(a); }),
    sendMemberCapWarning: jest.fn(async () => undefined),
  };
  const pricing = new PricingService(prisma, stripe);
  const addOn = new WhatsAppAddOnService(prisma, pricing, stripe, email);
  const billing = new BillingService(prisma, stripe, pricing, { get: () => undefined } as any, email, { emit: async () => undefined } as any, addOn);
  return { org, plans, prisma, stripe, stripeCalls, items, pricing, addOn, billing };
}

describe('what a month costs, from the plan rows', () => {
  const rows: APlansPrices[] = PLANS();
  const growth = rows.find((p) => p.plan === 'GROWTH')!;

  it('27 people on Growth, WhatsApp used by 9: $400 and $36, no extra seats', () => {
    const m = thisMonth(growth, 27, { on: true, usedIt: 9 })!;
    expect([m.planCents, m.extraSeats, m.whatsappCents, m.totalCents]).toEqual([40000, 0, 3600, 43600]);
  });

  it('27 people on Small Team: $90 and 7 extra seats at $5', () => {
    expect(seatsCost(rows.find((p) => p.plan === 'SMALL_TEAM')!, 27)).toBe(9000 + 7 * 500);
  });

  it('WhatsApp is never charged for more people than there are seats', () => {
    expect(whatsappPeopleCharged(30, 27)).toBe(27);
    expect(thisMonth(growth, 27, { on: true, usedIt: 30 })!.whatsappCents).toBe(27 * 400);
  });

  it('switched off, or in the free month, WhatsApp costs nothing', () => {
    expect(thisMonth(growth, 27, { on: false, usedIt: 9 })!.whatsappCents).toBe(0);
    expect(thisMonth(growth, 27, { on: true, usedIt: 9, free: true })!.whatsappCents).toBe(0);
  });

  it('a cheaper plan is suggested when there is one, and never the plan already chosen', () => {
    /* 27 people on Business ($900): Small Team with 7 extra seats is $125. */
    expect(aCheaperPlan(rows, 'BUSINESS' as any, 27)).toEqual({ plan: 'SMALL_TEAM', cents: 12500, extraSeats: 7, insteadOf: 90000 });
    /* 27 people on Small Team ($125) is already the cheapest. */
    expect(aCheaperPlan(rows, 'SMALL_TEAM' as any, 27)).toBeNull();
  });

  it('"This adds a seat: +$5 a month", in Hafsah\'s own words', () => {
    expect(thisAddsASeat(500)).toBe('This adds a seat: +$5 a month');
  });
});

describe('Wairimu invites the 21st person to Baridi on Small Team (20 seats included)', () => {
  it('the invitation is allowed, as an extra seat, and the screen is told so before it sends', async () => {
    const { billing } = world({ seats: 20 });
    const res = await billing.canInviteMember('org-baridi');
    expect(res).toMatchObject({ allowed: true, addsASeat: true, says: 'This adds a seat: +$5 a month' });
    expect(await billing.theNextSeat('org-baridi')).toMatchObject({ addsASeat: true, says: 'This adds a seat: +$5 a month', included: 20, taken: 20 });
    expect(await billing.seatsLeft('org-baridi')).toBeNull();
    expect((await billing.whoIsOverThePlan('org-baridi')).over).toBe(0);
  });

  it('with a seat to spare, nothing is said', async () => {
    const { billing } = world({ seats: 12 });
    expect(await billing.theNextSeat('org-baridi')).toMatchObject({ addsASeat: false, says: null });
  });

  it('while the new pricing is switched off, the plan\'s seats are a limit, exactly as before', async () => {
    const { billing } = world({ seats: 20, trial: OFF });
    const res = await billing.canInviteMember('org-baridi');
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('20 people, including you');
    expect(await billing.theNextSeat('org-baridi')).toMatchObject({ addsASeat: false, says: null });
  });

  it('the free plan keeps its limit', async () => {
    const free = { ...PAYING_SMALL_TEAM, subscriptionPlan: null, subscriptionStatus: null, subscriptionStripeId: null, createdAt: new Date('2026-08-01T00:00:00Z') };
    const { billing } = world({ org: free, seats: 5 });
    expect((await billing.canInviteMember('org-baridi')).allowed).toBe(false);
  });

  it('in the free month, a seat past the plan is allowed, and nothing reaches Stripe', async () => {
    const house = { ...PAYING_SMALL_TEAM, subscriptionPlan: null, subscriptionStatus: null, subscriptionStripeId: null, freeUntil: new Date('2026-11-14T00:00:00Z'), freePlan: 'SMALL_TEAM' };
    const { billing, stripeCalls } = world({ org: house, seats: 20 });
    expect((await billing.canInviteMember('org-baridi')).allowed).toBe(true);
    expect(await billing.syncTheSeatLine('org-baridi')).toBe('unchanged');
    expect(stripeCalls).toEqual([]);
  });
});

describe('the extra seats in Stripe (test mode): a quantity on its own line', () => {
  it('22 people on Small Team: one line, quantity 2, at $5; then 23, the same line at 3; then 20, removed', async () => {
    const w = world({ seats: 22 });
    expect(await w.billing.syncTheSeatLine('org-baridi')).toBe('added');
    expect(w.stripeCalls[0]).toEqual(['prices.create', expect.objectContaining({ unit_amount: 500, recurring: { interval: 'month', usage_type: 'licensed' }, metadata: { plan: 'SMALL_TEAM', kind: EXTRA_SEAT_KIND } })]);
    expect(w.stripeCalls[1]).toEqual(['items.create', expect.objectContaining({ subscription: 'sub_test_baridi', quantity: 2 })]);
    expect(w.org.extraSeatsItemId).toBe('si_extra-seat');

    w.prisma.user.count.mockImplementation(async () => 23);
    w.stripeCalls.length = 0;
    expect(await w.billing.syncTheSeatLine('org-baridi')).toBe('changed');
    expect(w.stripeCalls).toEqual([['items.update', 'si_extra-seat', expect.objectContaining({ quantity: 3 })]]);

    w.prisma.user.count.mockImplementation(async () => 20);
    w.stripeCalls.length = 0;
    expect(await w.billing.syncTheSeatLine('org-baridi')).toBe('removed');
    expect(w.stripeCalls[0][0]).toBe('items.del');
    expect(w.org.extraSeatsItemId).toBeNull();
  });

  it('checkout for a team of 27 choosing Small Team carries the 7 extra seats, so Stripe\'s page shows the whole price', async () => {
    const fresh = { ...PAYING_SMALL_TEAM, subscriptionPlan: null, subscriptionStatus: null, subscriptionStripeId: null };
    const w = world({ org: fresh, seats: 27 });
    await w.billing.createSubscription('org-baridi', 'SMALL_TEAM' as any);
    const checkout = w.stripeCalls.find((c) => c[0] === 'checkout');
    expect(checkout[1].line_items).toEqual([{ price: expect.any(String), quantity: 1 }, { price: 'price_test_extra-seat_SMALL_TEAM', quantity: 7 }]);
  });

  it('an organisation paying the old flat WhatsApp line moves to per person the moment it adds a seat', async () => {
    const kept = { ...PAYING_SMALL_TEAM, whatsappAddOnOn: true, whatsappAddOnItemId: 'si_flat', whatsappFlatAddOnKept: true };
    const w = world({ org: kept, seats: 21, whatsappNumbers: ['+254700000001'] });
    w.items.si_flat = { id: 'si_flat', price: { id: 'price_flat', metadata: { kind: WHATSAPP_ADD_ON_KIND } } };
    await w.billing.syncTheSeatLine('org-baridi');
    expect(w.org.whatsappFlatAddOnKept).toBe(false);
    expect(w.org.whatsappAddOnItemId).toBeNull();
    expect(w.org.whatsappPeopleItemId).toBe('si_whatsapp-per-person');
    expect(w.stripeCalls.find((c) => c[0] === 'usage')[2]).toMatchObject({ quantity: 1, action: 'set' });
  });

  it('an organisation paying the flat line that changes nothing keeps exactly what it pays', async () => {
    const kept = { ...PAYING_SMALL_TEAM, whatsappAddOnOn: true, whatsappAddOnItemId: 'si_flat', whatsappFlatAddOnKept: true };
    const w = world({ org: kept, seats: 12 });
    w.items.si_flat = { id: 'si_flat', price: { id: 'price_test_whatsapp-add-on_SMALL_TEAM' } };
    w.plans.find((p) => p.plan === 'SMALL_TEAM').whatsappAddOnStripePriceId = 'price_test_whatsapp-add-on_SMALL_TEAM';
    expect(await w.billing.syncTheSeatLine('org-baridi')).toBe('unchanged');
    expect(await w.addOn.syncTheStripeLine('org-baridi', NOW)).toBe('unchanged');
    expect(w.stripeCalls).toEqual([]);
  });

  it('a live key is refused for the new prices anywhere but production', () => {
    expect(aLiveKeyIsRefusedHere('sk_live_abcdefghijklmnopqrstuvwxyz', 'development')).toBe(true);
    expect(aLiveKeyIsRefusedHere('sk_live_abcdefghijklmnopqrstuvwxyz', 'production')).toBe(false);
    expect(aLiveKeyIsRefusedHere('sk_test_abcdefghijklmnopqrstuvwxyz', 'development')).toBe(false);
  });
});

describe('Plan and billing, as Grace reads it', () => {
  it('Small Team, 27 people, 9 on WhatsApp: the breakdown, the plans for 27, and no cheaper plan', async () => {
    const nine = Array.from({ length: 9 }, (_, i) => `+25470000000${i}`);
    const w = world({ org: { ...PAYING_SMALL_TEAM, whatsappAddOnOn: true }, seats: 27, whatsappNumbers: nine });
    const status = await w.billing.getStatus('org-baridi', true);
    const m = status.month!;
    expect(m.included).toBe('Small Team, 20 seats included, plus 7 extra at +$5 each');
    expect(m.lines).toEqual([
      { says: 'Small Team', amount: '$90' },
      { says: '7 extra seats × $5', amount: '$35' },
      { says: 'WhatsApp: 9 people used it × $4', amount: '$36' },
    ]);
    expect(m.total).toEqual({ says: 'This month', amount: '$161' });
    expect(m.peopleSays).toBe('Everyone with a Groundwork account at Baridi Appliances. Your plan includes a set number of seats; each extra seat is +$5 a month. You see the price before an invitation goes.');
    expect(m.priceChanges).toBe('Your price only changes when you add people, switch WhatsApp on, or move plan.');
    expect(m.whatsappRate).toBe('$4 per person who uses it, per month, on any plan');
    expect(m.plansNote).toBe('Any plan: +$5 per extra seat');
    expect(m.forHowMany).toBe('For 27');
    expect(m.plans.map((p) => [p.name, p.price, p.includes, p.extraSeats, p.whatsapp, p.forYou, p.yours])).toEqual([
      ['Starter', '$25/mo', '5 people', '+$5 each', '+$4 a person', '$135', false],
      ['Small Team', '$90/mo', '20 people', '+$5 each', '+$4 a person', '$125', true],
      ['Growth', '$400/mo', '100 people', '+$5 each', '+$4 a person', '$400', false],
      ['Business', '$900/mo', '250 people', '+$5 each', '+$4 a person', '$900', false],
      ['Scale', '$1,650/mo', '500 people', '+$5 each', '+$4 a person', '$1,650', false],
    ]);
    expect(m.cheaper).toBeNull();
  });

  it('on Growth with 12 people, Starter with 7 extra seats is suggested, never moved to', async () => {
    const w = world({ org: { ...PAYING_SMALL_TEAM, subscriptionPlan: 'GROWTH' }, seats: 12 });
    const m = (await w.billing.getStatus('org-baridi', true)).month!;
    expect(m.cheaper).toEqual({ plan: 'STARTER', says: 'Cheaper for 12 people: Starter with 7 extra seats, $60 a month instead of $400.', button: 'Switch to Starter' });
    expect(w.org.subscriptionPlan).toBe('GROWTH');
    expect(m.lines).toEqual([{ says: 'Growth', amount: '$400' }, { says: 'WhatsApp: switched off', amount: '$0' }]);
  });

  it('while the new pricing is switched off, the page is as before: no month is served', async () => {
    const w = world({ seats: 27, trial: OFF });
    expect((await w.billing.getStatus('org-baridi', true)).month).toBeUndefined();
  });

  it('a lead or a member is never served the month', async () => {
    const w = world({ seats: 27 });
    const status = await w.billing.getStatus('org-baridi', false);
    expect(status.month).toBeUndefined();
    expect(JSON.stringify(theStatusAsTheyMayReadIt(status, 'LEAD'))).not.toMatch(/month|\$/);
  });

  it('the month WhatsApp people are counted over is the billing month for a paying organisation', () => {
    expect(theMonthStarted({ subscriptionPlan: 'SMALL_TEAM', subscriptionStatus: 'active', subscriptionPeriodEnd: new Date('2026-11-01T00:00:00Z') }, NOW).toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(theMonthStarted({ subscriptionPlan: 'SMALL_TEAM', subscriptionStatus: 'active', subscriptionPeriodEnd: new Date('2026-11-07T00:00:00Z') }, NOW).toISOString()).toBe('2026-10-07T00:00:00.000Z');
    expect(theMonthStarted({ subscriptionStatus: null, subscriptionPeriodEnd: null }, NOW).toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });
});

describe('the hourly sweeps', () => {
  it('bring the seat line and the WhatsApp count up to date for every paying organisation', async () => {
    const w = world({ org: { ...PAYING_SMALL_TEAM, whatsappAddOnOn: true, whatsappPeopleItemId: 'si_whatsapp-per-person' }, seats: 22, whatsappNumbers: ['+254700000001'] });
    w.items['si_whatsapp-per-person'] = { id: 'si_whatsapp-per-person', price: { id: 'price_test_whatsapp-per-person_SMALL_TEAM' } };
    w.plans.find((p) => p.plan === 'SMALL_TEAM').whatsappPersonStripePriceId = 'price_test_whatsapp-per-person_SMALL_TEAM';
    await w.billing.hourlySeatLines();
    await w.addOn.hourly();
    expect(w.org.extraSeatsItemId).toBe('si_extra-seat');
    expect(w.stripeCalls.filter((c) => c[0] === 'usage').map((c) => c[2].quantity)).toEqual([1]);
  });
});

describe('the back office changes the extra-seat price and WhatsApp per person with no code', () => {
  it('a new price is kept and its cached Stripe price cleared; a nonsense price is refused in a sentence', async () => {
    const w = world({ seats: 1 });
    w.plans.find((p) => p.plan === 'GROWTH').extraSeatStripePriceId = 'price_old';
    const admin = new AdminController({} as any, {} as any, w.pricing as any, {} as any, {} as any, {} as any);
    await admin.setPricing('GROWTH', { extraSeatCents: 600, whatsappPersonCents: 300 });
    const growth = w.plans.find((p) => p.plan === 'GROWTH');
    expect([growth.extraSeatCents, growth.extraSeatStripePriceId, growth.whatsappPersonCents]).toEqual([600, null, 300]);
    await expect(admin.setPricing('GROWTH', { extraSeatCents: 10 })).rejects.toThrow('An extra seat must be empty, or a whole number of cents between 50 and 100000.');
  });
});
