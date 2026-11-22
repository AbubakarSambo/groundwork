import { whereTheTrialStands, whatCoversThem, type TheGrace } from '../../common/subscription';
import { theGraceInForce, theGraceSettingFrom, thisOrganisationIsPaused, theOrganisationsPausedNow, DEFAULT_GRACE_WORDS } from './the-trial-grace';
import { EmailService } from '../email/email.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { BillingService, PAUSED_UNTIL_THEY_SUBSCRIBE, NO_PLAN_TO_OPEN } from './billing.service';
import { PricingService } from './pricing.service';
import { shouldSayWhatGroundworkIs } from '../email/what-groundwork-is';
import { whilePayingIsPossible } from './paying-is-possible-for-specs';

/* Paying is possible in this file, so the pause and the no-plan refusals apply as built (23 November 2026). */
whilePayingIsPossible();

/**
 * FOUR WEEKS AFTER A FREE TRIAL, THEN GROUNDWORK PAUSES UNTIL THEY PAY (Hafsah, 2 November 2026).
 *
 * The one answer every door reads (common/subscription.ts, whereTheTrialStands), and the doors themselves: the email door, the
 * WhatsApp door, the gate that opens a check-in and the gate that makes one. Baridi Appliances' free month ends on 18 October at
 * 22:30 UTC; with four weeks it pauses on 15 November at 22:30 UTC. The rule came in on 15 October.
 */
const ENDS = new Date('2026-10-18T22:30:00Z');
const PAUSES = new Date('2026-11-15T22:30:00Z');
const GRACE: TheGrace = { weeks: 4, notBefore: new Date('2026-10-15T00:00:00Z') };
const trialOrg = (o: any = {}) => ({
  subscriptionPlan: null, subscriptionStatus: null, careFeeStatus: 'NONE',
  freeUntil: ENDS, freePlan: 'SMALL_TEAM', freeTrialStartedAt: new Date('2026-09-18T22:30:00Z'), freeMonthOfReleaseAt: null, ...o,
});

describe('where an organisation stands, every case the brief names', () => {
  const at = (iso: string, o: any = {}) => whereTheTrialStands(trialOrg(o), GRACE, new Date(iso));

  it('its trial is still running', () => {
    expect(at('2026-10-10T09:00:00Z').stands).toBe('in its trial');
    expect(whatCoversThem(trialOrg(), new Date('2026-10-10T09:00:00Z'), GRACE)).toMatchObject({ covers: 'on the house', plan: 'SMALL_TEAM', until: ENDS });
  });

  it('its trial has just ended: the four weeks start, and everything is still covered on the trial\'s plan until the pause', () => {
    expect(at('2026-10-18T22:31:00Z')).toEqual({ stands: 'after its trial', trialEnded: ENDS, pausesAt: PAUSES });
    expect(whatCoversThem(trialOrg(), new Date('2026-10-18T22:31:00Z'), GRACE)).toMatchObject({ covers: 'on the house', plan: 'SMALL_TEAM', until: PAUSES, afterItsTrial: true });
  });

  it('three weeks into the four, and in the last week, it is still in its four weeks', () => {
    expect(at('2026-11-08T09:00:00Z').stands).toBe('after its trial');
    expect(at('2026-11-15T22:29:00Z').stands).toBe('after its trial');
  });

  it('past the four weeks it is paused, and nothing covers it', () => {
    expect(at('2026-11-15T22:30:00Z').stands).toBe('paused');
    expect(whatCoversThem(trialOrg(), new Date('2026-12-01T09:00:00Z'), GRACE).covers).toBe('free tier');
  });

  it('once it pays it is a customer, at once, and nothing about the trial applies again', () => {
    const paid = { subscriptionPlan: 'SMALL_TEAM', subscriptionStatus: 'active' };
    expect(at('2026-12-01T09:00:00Z', paid).stands).toBe('a customer');
    expect(whatCoversThem(trialOrg(paid), new Date('2026-12-01T09:00:00Z'), GRACE).covers).toBe('paid');
  });

  it('an organisation that has paid before, or pays a care fee, is unchanged, whatever its dates say', () => {
    expect(at('2026-12-01T09:00:00Z', { subscriptionStatus: 'cancelled' }).stands).toBe('a customer');
    expect(at('2026-12-01T09:00:00Z', { subscriptionStatus: 'past_due', subscriptionPlan: 'GROWTH' }).stands).toBe('a customer');
    expect(at('2026-12-01T09:00:00Z', { careFeeStatus: 'ACTIVE' }).stands).toBe('a customer');
  });

  it('a free run given by hand, with no free month, is not a trial and never pauses', () => {
    expect(at('2026-12-01T09:00:00Z', { freeTrialStartedAt: null, freeMonthOfReleaseAt: null }).stands).toBe('not on a trial');
  });

  it('the month every organisation already here was given is a free month too', () => {
    expect(at('2026-12-01T09:00:00Z', { freeTrialStartedAt: null, freeMonthOfReleaseAt: new Date('2026-09-18T22:30:00Z') }).stands).toBe('paused');
  });

  it('while the free trial\'s switch is off nobody is paused (no grace in force)', () => {
    expect(whereTheTrialStands(trialOrg(), null, new Date('2026-12-01T09:00:00Z')).stands).toBe('not on a trial');
  });

  it('a free month that ended before the rule came in gets its four weeks from the day the rule came in', () => {
    const r = at('2026-11-01T09:00:00Z', { freeUntil: new Date('2026-08-01T00:00:00Z') });
    expect(r).toEqual({ stands: 'after its trial', trialEnded: new Date('2026-08-01T00:00:00Z'), pausesAt: new Date('2026-11-12T00:00:00Z') });
  });

  it('a longer setting moves the day for everybody at once: six weeks pause on 29 November', () => {
    expect(whereTheTrialStands(trialOrg(), { ...GRACE, weeks: 6 }, new Date('2026-11-20T09:00:00Z')).pausesAt).toEqual(new Date('2026-11-29T22:30:00Z'));
  });
});

describe('the organisations the opener leaves alone', () => {
  it('are the paused ones only: not those in their weeks, in their trial, paying or never on a trial', async () => {
    const orgs = [
      { id: 'kimya', ...trialOrg() },
      { id: 'pwani', ...trialOrg({ freeUntil: new Date('2026-11-10T00:00:00Z') }) },
      { id: 'tayari', ...trialOrg({ subscriptionPlan: 'SMALL_TEAM', subscriptionStatus: 'active' }) },
      { id: 'byhand', ...trialOrg({ freeTrialStartedAt: null }) },
    ];
    const settings: Record<string, unknown> = { 'pricing.freeTrial': { on: true, onSince: '2026-10-15T00:00:00Z' }, 'pricing.trialGrace': { weeks: 4, onSince: '2026-10-15T00:00:00Z' } };
    const prisma = {
      platformSetting: { findUnique: async ({ where }: any) => (where.key in settings ? { value: settings[where.key] } : null) },
      organization: { findMany: async () => orgs },
    };
    expect(await theOrganisationsPausedNow(prisma, new Date('2026-11-20T09:00:00Z'))).toEqual(['kimya']);
    settings['pricing.freeTrial'] = { on: false };
    expect(await theOrganisationsPausedNow(prisma, new Date('2026-11-20T09:00:00Z'))).toEqual([]);
  });
});

describe('the emails about paying', () => {
  /* Found on the test bed (2 November): the countdown went out with "The people in this check-in, including your manager, can see what you
     say in it." under it, which is about a check-in's answers and not true of a mail about paying. */
  it('carry no paragraph about who sees what somebody says in a check-in', () => {
    for (const sender of ['sendGroundworkPausesSoon', 'sendFreeMonthEndsSoon', 'sendPaymentFailed', 'sendSubscriptionConfirmed']) expect(shouldSayWhatGroundworkIs(sender)).toBe(false);
    expect(shouldSayWhatGroundworkIs('sendNudge')).toBe(true);
  });
});

describe('the setting', () => {
  it('reads as the default, field by field, wherever it is missing or wrong', () => {
    expect(theGraceSettingFrom(null)).toEqual({ weeks: 4, dailyForTheLastDays: 7, fromHour: 9, words: DEFAULT_GRACE_WORDS });
    const s = theGraceSettingFrom({ weeks: 'four', dailyForTheLastDays: 3, words: { daySubject: 'Only {days} days left', weekSubject: '' } });
    expect(s.weeks).toBe(4);
    expect(s.dailyForTheLastDays).toBe(3);
    expect(s.words.daySubject).toBe('Only {days} days left');
    expect(s.words.weekSubject).toBe(DEFAULT_GRACE_WORDS.weekSubject);
  });

  it('is in force only while the free trial is on, from the later of the two moments', async () => {
    const prisma = (trial: any) => ({ platformSetting: { findUnique: async ({ where }: any) => (where.key === 'pricing.freeTrial' ? { value: trial } : { value: { weeks: 5, onSince: '2026-10-20T00:00:00Z' } }) } });
    expect(await theGraceInForce(prisma({ on: false }))).toBeNull();
    expect(await theGraceInForce(prisma({ on: true, onSince: '2026-11-01T00:00:00Z' }))).toEqual({ weeks: 5, notBefore: new Date('2026-11-01T00:00:00Z'), payingIsPossible: true });
  });
});

/* A database with Baridi in it, its admin Grace, its member Juma, and one check-in. Only what the doors read. */
function baridi(stand: 'in its weeks' | 'paused' | 'paid') {
  const org: any = trialOrg(stand === 'paid' ? { subscriptionPlan: 'SMALL_TEAM', subscriptionStatus: 'active' } : {});
  const now = stand === 'in its weeks' ? new Date('2026-11-08T09:00:00Z') : new Date('2026-11-20T09:00:00Z');
  const settings: Record<string, unknown> = {
    'pricing.freeTrial': { on: true, teamsUnder: 20, months: 1, onSince: '2026-10-15T00:00:00Z' },
    'pricing.trialGrace': { weeks: 4, dailyForTheLastDays: 7, fromHour: 9, onSince: '2026-10-15T00:00:00Z' },
  };
  const whatsappRows: any[] = [];
  const notifications: any[] = [];
  const prisma: any = {
    platformSetting: { findUnique: async ({ where }: any) => (where.key in settings ? { key: where.key, value: settings[where.key] } : null) },
    organization: { findUnique: async () => ({ id: 'org-baridi', name: 'Baridi Appliances', createdAt: new Date('2026-09-01T00:00:00Z'), ...org }) },
    ground: {
      findUnique: async () => ({ organizationId: 'org-baridi', sessionsBalance: 0, isFreeGround: true }),
      count: async () => 0,
    },
    user: { findFirst: async () => ({ organizationId: 'org-baridi' }), findUnique: async () => null, findMany: async () => [] },
    person: { findFirst: async () => null, findMany: async () => [] },
    groundParticipant: { findUnique: async () => ({ groundId: 'g-sales', remindersStoppedAt: null }) },
    emailDelivery: { findFirst: async () => null },
    emailAddressPreference: { findUnique: async () => null },
    emailPreference: { findMany: async () => [], findUnique: async () => null },
    notification: { create: async ({ data }: any) => { notifications.push(data); return data; }, findMany: async () => [], findFirst: async () => null },
    whatsAppSend: { create: async ({ data }: any) => { whatsappRows.push(data); return data; }, findMany: async () => [] },
    scheduledEmail: { findFirst: async () => null, create: async () => ({}) },
    contributorCode: { findFirst: async () => null },
  };
  const email: any = new EmailService({ get: (k: string) => (k === 'resend.frontendUrl' ? 'https://myground.work' : undefined) } as any, {} as any, prisma);
  const delivered: string[] = [];
  email.deliverNow = jest.fn(async (o: any, _c: any, sender: string) => { delivered.push(sender); });
  email.holdForTheMorning = jest.fn(async () => false);
  email.waitForTheLeadsSummary = jest.fn(async () => false);
  const pricing = new PricingService(prisma, {} as any);
  const billing = new BillingService(prisma, {} as any, pricing, { get: () => undefined } as any, email, {} as any);
  const whatsapp = new WhatsAppService({ get: () => undefined } as any, prisma, { mayWeSend: async () => ({ send: true }) } as any);
  return { prisma, email, billing, whatsapp, delivered, whatsappRows, notifications, now };
}

/* A Stripe test key, so paying is possible here (payingIsPossibleHere) and the pause applies as built. Restored after. */
const A_TEST_KEY = 'sk_test_51abcdefghijklmnopqrstuvwxyz0123456789';
const withAKey = () => {
  let before: string | undefined;
  beforeAll(() => { before = process.env.STRIPE_SECRET_KEY; process.env.STRIPE_SECRET_KEY = A_TEST_KEY; });
  afterAll(() => { if (before === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = before; });
};

describe('the doors, for an organisation in its four weeks, paused, and then paying', () => {
  withAKey();
  beforeAll(() => jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask', 'clearTimeout', 'clearInterval', 'clearImmediate'] }));
  afterAll(() => jest.useRealTimers());

  for (const stand of ['in its weeks', 'paused', 'paid'] as const) {
    const stops = stand === 'paused';
    it(`${stand}: reminders and reports ${stops ? 'do not go' : 'go'}; paying and signing in always do`, async () => {
      const w = baridi(stand);
      jest.setSystemTime(w.now);
      expect(await thisOrganisationIsPaused(w.prisma, 'org-baridi', w.now)).toBe(stops);
      await w.email.sendNudge('juma@baridi.test', 'Sales team', 'https://x/checkin/1', undefined, false, null, 'p-juma');
      await w.email.sendReportReady('juma@baridi.test', 'Sales team', 'https://x/report/1', undefined, 'g-sales');
      await w.email.sendPaymentFailed('grace@baridi.test', 'Baridi Appliances');
      await w.email.sendSignInLinkEmail('grace@baridi.test', 'Grace', 'token');
      expect(w.delivered).toEqual(stops
        ? ['sendPaymentFailed', 'sendSignInLinkEmail']
        : ['sendNudge', 'sendReportReady', 'sendPaymentFailed', 'sendSignInLinkEmail']);
      if (stops) expect(w.notifications.filter((n) => n.outcome === 'suppressed').map((n) => n.because)).toEqual([
        'Nothing about the work goes out while Groundwork is paused here. It stays paused until the organisation chooses a plan.',
        'Nothing about the work goes out while Groundwork is paused here. It stays paused until the organisation chooses a plan.',
      ]);
    });

    it(`${stand}: a check-in opening on WhatsApp is ${stops ? 'held, silently' : 'let through'}; a reply to somebody who wrote is let through`, async () => {
      const w = baridi(stand);
      jest.setSystemTime(w.now);
      const opening = await (w.whatsapp as any).heldFor('org-baridi', '+254700000001', { kind: 'checkin-open' });
      const reply = await (w.whatsapp as any).heldFor('org-baridi', '+254700000001', { kind: 'reply' });
      expect(opening).toEqual(stops ? { sent: false, error: 'Nothing about the work goes out while Groundwork is paused here. It stays paused until the organisation chooses a plan.' } : null);
      expect(reply).toBeNull();
      expect(w.whatsappRows.map((r) => r.kind)).toEqual(stops ? ['checkin-open:paused'] : []);
    });

    it(`${stand}: a check-in ${stops ? 'does not open, and no new one can be made' : 'opens, and a new one can be made'}`, async () => {
      const w = baridi(stand);
      jest.setSystemTime(w.now);
      const open = await w.billing.canStartSession('g-sales');
      const make = await w.billing.canCreateGround('org-baridi');
      if (stops) {
        expect(open).toEqual({ allowed: false, reason: PAUSED_UNTIL_THEY_SUBSCRIBE, sessionsBalance: 0 });
        expect(make).toEqual({ allowed: false, reason: NO_PLAN_TO_OPEN, noPlan: true });
      } else {
        expect(open.allowed).toBe(true);
        expect(make.allowed).toBe(true);
      }
    });
  }

  it('paused: Plan and billing tells the admin it is paused and is not the free plan; a team member is served nothing about it', async () => {
    const w = baridi('paused');
    jest.setSystemTime(w.now);
    w.prisma.ground.findMany = async () => [];
    w.prisma.report = { count: async () => 3 };
    w.prisma.groundParticipant.findMany = async () => [];
    w.prisma.groundParticipant.count = async () => 0;
    w.prisma.user.count = async () => 4;
    w.prisma.pricingPlan = { findUnique: async () => ({ memberCap: 20, extraSeatCents: 500 }), findMany: async () => [] };
    const forTheAdmin = await w.billing.getStatus('org-baridi', true).catch((e: any) => ({ error: e?.message } as any));
    console.log(`GRACE READS ON PLAN AND BILLING: ${forTheAdmin.afterTheTrial}`);
    expect(forTheAdmin.afterTheTrial).toBe('Groundwork is paused at Baridi Appliances until you choose a plan. No check-ins open and no messages go out. Everything is kept, and you can still read it all.');
    /* There is no free plan any more (23 November 2026), so nothing says it. */
    expect(forTheAdmin).not.toHaveProperty('onTheFreePlan');
    expect(forTheAdmin.onTheHouse).toBeNull();
    const forJuma = await w.billing.getStatus('org-baridi', false).catch((e: any) => ({ error: e?.message } as any));
    expect(forJuma.afterTheTrial).toBeNull();
  });
});

/*
 * WHILE PAYING IS NOT WIRED, NOBODY IS PAUSED (Hafsah, 23 November 2026: "Yes"). With no Stripe key there is no plan anybody could
 * choose, so the four weeks after the trial never run out: no "no plan" refusal, no pause, nothing said about paying. The same
 * Baridi, on the same day it would have been paused.
 */
describe('while paying is not wired (no Stripe key)', () => {
  let before: string | undefined;
  beforeAll(() => { before = process.env.STRIPE_SECRET_KEY; delete process.env.STRIPE_SECRET_KEY; jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask', 'clearTimeout', 'clearInterval', 'clearImmediate'] }); });
  afterAll(() => { if (before !== undefined) process.env.STRIPE_SECRET_KEY = before; jest.useRealTimers(); });

  it('the day it would have paused, it is not paused: a check-in opens, a new one can be made, and nothing asks it to pay', async () => {
    const w = baridi('paused');
    jest.setSystemTime(w.now);
    expect((await w.billing.canStartSession('g-sales')).allowed).toBe(true);
    expect(await w.billing.canCreateGround('org-baridi')).toEqual({ allowed: true });
    expect(await theOrganisationsPausedNow(w.prisma, w.now)).toEqual([]);
  });

  it('the rule follows the key alone: none or a placeholder means paying is not possible, a test key means it is', () => {
    const { payingIsPossibleHere } = require('./what-kind-of-stripe-key');
    expect(payingIsPossibleHere(undefined, 'production')).toBe(false);
    expect(payingIsPossibleHere('sk_test_xxx', 'development')).toBe(false);
    expect(payingIsPossibleHere(A_TEST_KEY, 'development')).toBe(true);
  });
});
