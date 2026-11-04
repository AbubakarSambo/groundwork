import { EmailService } from '../email/email.service';
import { PricingService } from './pricing.service';
import { BillingService } from './billing.service';
import { TheFreeMonthEmails } from './the-free-month-emails';
import { forgetTheOrganisationsZone } from '../../common/the-organisations-own-day';

/**
 * THE FREE MONTH'S EMAILS, AND THE FOUR WEEKS AFTER IT, AS GRACE, OTIENO, WANJIRU AND JUMA READ THEM (Hafsah, 15 October and
 * 2 November 2026). Grace and Otieno are admins, Wanjiru is a lead, Juma is a team member and is sent nothing.
 *
 * Baridi Appliances is in Nairobi and on its free month on Small Team ($90 for 20 seats). It has 23 people, so 3 extra
 * seats at $5, and 3 people used WhatsApp this month at $4 each. Its free month ends at 22:30 UTC on 18 October, which is
 * 01:30 on 19 October in Nairobi. Grace Achieng and Otieno are its admins. The real sweep, the real billing arithmetic and
 * the real email door run; only the database is a stand-in and nothing is delivered.
 */
const UNTIL = new Date('2026-10-18T22:30:00Z');

/* The mailer reads the clock for "today" when it applies the one-a-day rule, so the clock is set to each run's moment. */
beforeAll(() => jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask', 'clearTimeout', 'clearInterval', 'clearImmediate'] }));
afterAll(() => jest.useRealTimers());
let orgSeq = 0;

function world(opts: { trialOn?: boolean; createdAt?: Date; whatsAppPeople?: number } = {}) {
  const orgId = `org-baridi-${++orgSeq}`;
  forgetTheOrganisationsZone(orgId);
  const settings = new Map<string, any>();
  settings.set('pricing.freeTrial', { on: opts.trialOn ?? true, teamsUnder: 20, months: 1, onSince: '2026-10-15T00:00:00Z' });
  settings.set('pricing.trialGrace', { weeks: 4, dailyForTheLastDays: 7, fromHour: 9, onSince: '2026-10-15T00:00:00Z' });
  const notifications: any[] = [];
  const delivered: Array<{ to: string; subject: string; html: string }> = [];
  const org = {
    id: orgId, name: 'Baridi Appliances', timeZone: 'Africa/Nairobi', createdAt: opts.createdAt ?? new Date('2026-09-01T09:00:00Z'),
    freeUntil: UNTIL, freePlan: 'SMALL_TEAM', freeTrialStartedAt: null, freeMonthOfReleaseAt: new Date('2026-09-18T22:30:00Z'),
    subscriptionPlan: null, subscriptionStatus: null, careFeeStatus: 'NONE',
  };
  const admins = [
    { id: 'u-grace', email: 'grace@baridi.test', firstName: 'Grace', lastName: 'Achieng', role: 'ADMIN' },
    { id: 'u-otieno', email: 'otieno@baridi.test', firstName: 'Otieno', lastName: null, role: 'ADMIN' },
  ];
  /* The rule for who is told about paying is the database's (TOLD_ABOUT_PAYING): admins and leads. Juma, a member, is not in it. */
  const lead = { id: 'u-wanjiru', email: 'wanjiru@baridi.test', firstName: 'Wanjiru', lastName: 'Kamau', role: 'LEAD' };
  const prisma: any = {
    platformSetting: {
      findUnique: jest.fn(async ({ where }: any) => (settings.has(where.key) ? { key: where.key, value: settings.get(where.key) } : null)),
      create: jest.fn(async ({ data }: any) => { if (settings.has(data.key)) throw new Error('exists'); settings.set(data.key, data.value); return data; }),
      update: jest.fn(async ({ where, data }: any) => { settings.set(where.key, data.value); return data; }),
    },
    pricingPlan: {
      findMany: jest.fn(async () => [
        { plan: 'SMALL_TEAM', amountCents: 9000, memberCap: 20, extraSeatCents: 500, whatsappPersonCents: 400 },
        { plan: 'GROWTH', amountCents: 40000, memberCap: 100, extraSeatCents: 500, whatsappPersonCents: 400 },
      ]),
    },
    organization: {
      findMany: jest.fn(async () => [org]),
      findUnique: jest.fn(async () => org),
    },
    user: {
      findMany: jest.fn(async ({ where }: any) => (where?.role ? admins : where?.organizationId && where?.OR ? [...admins, lead] : [])),
      findUnique: jest.fn(async () => null),
      count: jest.fn(async () => 23),
    },
    person: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
    notification: {
      create: jest.fn(async ({ data }: any) => { const row = { createdAt: new Date(), ...data }; notifications.push(row); return row; }),
      findMany: jest.fn(async ({ where }: any) => notifications.filter((n) => n.channel === 'email' && n.outcome === where.outcome && where.toAddress.in.includes(n.toAddress) && where.sender.in.includes(n.sender) && n.createdAt >= where.createdAt.gte)),
      findFirst: jest.fn(async () => null),
    },
    whatsAppSend: { findMany: jest.fn(async () => []) },
    scheduledEmail: { findFirst: jest.fn(async () => null), create: jest.fn(async () => ({})) },
    emailPreference: { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => null) },
    emailAddressPreference: { findUnique: jest.fn(async () => null) },
    emailDelivery: { findFirst: jest.fn(async () => null) },
    groundParticipant: { findUnique: jest.fn(async () => null) },
  };
  const email: any = new EmailService({ get: (k: string) => (k === 'resend.frontendUrl' ? 'https://myground.work' : undefined) } as any, {} as any, prisma);
  email.deliverNow = jest.fn(async (o: any, _c: any, sender: string) => { delivered.push(o); await email.writeItDown(o, sender, 'sent', null); });
  email.holdForTheMorning = jest.fn(async () => false);
  const pricing = new PricingService(prisma, {} as any);
  const whatsapp: any = { standing: jest.fn(async () => ({ addOnOn: true, inTheFreeWhatsAppMonth: true, peopleUsedIt: opts.whatsAppPeople ?? 3, charged: false, flatKept: false, addOnCents: null })) };
  const billing = new BillingService(prisma, {} as any, pricing, { get: () => undefined } as any, email, {} as any, whatsapp);
  const sweep = new TheFreeMonthEmails(prisma, pricing, billing, email);
  /* What a person reads: the mail's own text, one paragraph a line. */
  const read = (i: number) => delivered[i].html.replace(/<\/p>/g, '\n').replace(/<[^>]+>/g, '').replace(/\n+/g, '\n').trim();
  const run = (iso: string) => { jest.setSystemTime(new Date(iso)); return sweep.sweep(new Date(iso)); };
  return { sweep: { sweep: (d: Date) => run(d.toISOString()), email }, delivered, notifications, read, org, routineEarlier: (to: string, at: Date) => notifications.push({ channel: 'email', outcome: 'sent', toAddress: to, sender: 'sendYourWeek', createdAt: at }) };
}

describe('three days before the free month ends, counted in Nairobi', () => {
  it('is not sent four days before in Nairobi, even when it is only three days before in UTC', async () => {
    const w = world();
    /* 15 October, 13:00 in Nairobi; the month ends on 19 October there (18 October in UTC). */
    expect(await w.sweep.sweep(new Date('2026-10-15T10:00:00Z'))).toEqual({ endsSoon: 0, pausesSoon: 0 });
    expect(w.delivered).toEqual([]);
  });

  it('is not sent in the night in Nairobi, and is sent at nine in the morning, three days before', async () => {
    const w = world();
    expect(await w.sweep.sweep(new Date('2026-10-16T03:00:00Z'))).toEqual({ endsSoon: 0, pausesSoon: 0 });
    expect(await w.sweep.sweep(new Date('2026-10-16T06:00:00Z'))).toEqual({ endsSoon: 1, pausesSoon: 0 });
    expect(w.delivered.map((d) => d.to)).toEqual(['grace@baridi.test', 'otieno@baridi.test']);
  });

  it('says, to Grace by name, what Baridi will pay from then, line by line, and links to Plan and billing', async () => {
    const w = world();
    await w.sweep.sweep(new Date('2026-10-16T06:00:00Z'));
    expect(w.delivered[0].subject).toBe('Your free month ends on 19 October');
    expect(w.read(0)).toBe([
      'Hello Grace,',
      'Your free month at Baridi Appliances ends on 19 October, in 3 days.',
      'To keep everything running from then, this is what you will pay each month.',
      'Baridi Appliances has 23 people. The Small Team plan is $90 a month, and it includes 20 seats.',
      'You have 3 seats more than that, at $5 each, which is $15 a month.',
      'WhatsApp is $4 a month for each person who uses it. 3 people have used it this month, which is $12.',
      'That is $117 a month in all.',
      'Nothing is charged until you choose a plan. If you do not choose a plan by then, everything at Baridi Appliances keeps working for 4 weeks after that, and then Groundwork pauses until you do. Nothing is deleted.',
      'You can choose a plan, and see every plan, on Plan and billing.',
      'Open Plan and billing',
    ].join('\n'));
    expect(w.delivered[0].html).toContain('href="https://myground.work/billing"');
    expect(w.read(1)).toMatch(/^Hello Otieno,/);
  });

  it('is sent once for the free month, however many times the sweep runs', async () => {
    const w = world();
    await w.sweep.sweep(new Date('2026-10-16T06:00:00Z'));
    await w.sweep.sweep(new Date('2026-10-16T07:00:00Z'));
    await w.sweep.sweep(new Date('2026-10-17T06:00:00Z'));
    expect(w.delivered.map((d) => d.to)).toEqual(['grace@baridi.test', 'otieno@baridi.test']);
  });
});

describe('it is the admin\'s one routine message that day', () => {
  it('Grace, who has had one today, is not sent it today and is sent it the next day; Otieno is sent it today', async () => {
    const w = world();
    w.routineEarlier('grace@baridi.test', new Date('2026-10-16T05:00:00Z'));
    await w.sweep.sweep(new Date('2026-10-16T06:00:00Z'));
    expect(w.delivered.map((d) => d.to)).toEqual(['otieno@baridi.test']);
    await w.sweep.sweep(new Date('2026-10-17T06:00:00Z'));
    expect(w.delivered.map((d) => d.to)).toEqual(['otieno@baridi.test', 'grace@baridi.test']);
    expect(w.read(1)).toContain('Your free month at Baridi Appliances ends on 19 October, in 2 days.');
  });

  it('and once it has gone, it counts: the next routine email to Grace that day is held back', async () => {
    const w = world();
    await w.sweep.sweep(new Date('2026-10-16T06:00:00Z'));
    const email: EmailService = w.sweep.email;
    await email.sendHeresWhatIsNew('grace@baridi.test', 'New', ['Hello.'], 'Go', 'https://x.test');
    expect(w.notifications.filter((n) => n.toAddress === 'grace@baridi.test').map((n) => [n.sender, n.outcome])).toEqual([
      ['sendFreeMonthEndsSoon', 'sent'], ['sendHeresWhatIsNew', 'suppressed'],
    ]);
  });
});

/*
 * THE FOUR WEEKS (2 November 2026). Baridi's free month ended on 19 October in Nairobi, so Groundwork pauses there on 16 November.
 * Changed from the two "once the free month has ended" tests of 15 October: that email said check-ins were paused, or that Baridi
 * was on the free plan, from the day the month ended. Neither is true any more; the first of the four weeks' emails replaces it.
 */
const ALL = ['grace@baridi.test', 'otieno@baridi.test', 'wanjiru@baridi.test'];
async function aDayInNairobi(w: ReturnType<typeof world>, day: string) {
  /* Every working hour of that day in Nairobi (9 in the morning to 6 in the evening is 06:00 to 15:00 UTC). */
  for (let h = 5; h <= 16; h++) await w.sweep.sweep(new Date(`${day}T${String(h).padStart(2, '0')}:00:00Z`));
}

describe('the four weeks after the free month, as each reader reads them', () => {
  it('the day it ends: one email to each admin and lead, saying how long is left and how to pay; nothing to Juma', async () => {
    const w = world();
    await aDayInNairobi(w, '2026-10-19');
    expect(w.delivered.map((d) => [d.to, d.subject])).toEqual(ALL.map((to) => [to, 'Groundwork pauses at Baridi Appliances on 16 November']));
    expect(w.read(0)).toBe([
      'Hello Grace,',
      'Your free month at Baridi Appliances ended on 19 October. Everything keeps working until 16 November, which is 4 weeks from today.',
      'While Groundwork is paused, no check-ins open and no messages go out. Nothing is deleted, and everyone can still sign in and read what is there.',
      'To keep everything running, choose a plan on Plan and billing. Everything starts again as soon as you do.',
      'Open Plan and billing',
    ].join('\n'));
    expect(w.delivered[0].html).toContain('href="https://myground.work/billing"');
    /* Wanjiru leads, and cannot pay: she is told who can. */
    expect(w.read(2)).toBe([
      'Hello Wanjiru,',
      'Your free month at Baridi Appliances ended on 19 October. Everything keeps working until 16 November, which is 4 weeks from today.',
      'While Groundwork is paused, no check-ins open and no messages go out. Nothing is deleted, and everyone can still sign in and read what is there.',
      'Only an admin can choose a plan. Grace Achieng and Otieno can do it on Plan and billing, and everything starts again as soon as they do.',
      'Open Plan and billing',
    ].join('\n'));
    expect(w.delivered.some((d) => /juma/i.test(d.to))).toBe(false);
  });

  it('one a week at the start of weeks 1 to 3, then one a day in the last week counting down, then nothing once it has paused', async () => {
    const w = world();
    const days: string[] = [];
    for (let t = Date.parse('2026-10-19T00:00:00Z'); t <= Date.parse('2026-11-20T00:00:00Z'); t += 86400000) days.push(new Date(t).toISOString().slice(0, 10));
    for (const day of days) await aDayInNairobi(w, day);
    const toGrace = w.delivered.filter((d) => d.to === 'grace@baridi.test').map((d) => d.subject);
    expect(toGrace).toEqual([
      'Groundwork pauses at Baridi Appliances on 16 November',
      'Groundwork pauses at Baridi Appliances on 16 November',
      'Groundwork pauses at Baridi Appliances on 16 November',
      'Groundwork pauses in 7 days', 'Groundwork pauses in 6 days', 'Groundwork pauses in 5 days', 'Groundwork pauses in 4 days',
      'Groundwork pauses in 3 days', 'Groundwork pauses in 2 days',
      'Groundwork pauses tomorrow',
    ]);
    /* The weeks' emails went on 19 October, 26 October and 2 November: 4 weeks, 3 weeks and 2 weeks from today. */
    const weekly = w.delivered.filter((d) => d.to === 'grace@baridi.test').slice(0, 3).map((d) => /which is (.+) from today/.exec(d.html)?.[1]);
    expect(weekly).toEqual(['4 weeks', '3 weeks', '2 weeks']);
    const last = w.delivered.filter((d) => d.to === 'grace@baridi.test').pop()!;
    expect(last.html).toContain('Groundwork pauses at Baridi Appliances tomorrow, 16 November. Today is the last day everything runs.');
    /* The same for Otieno and Wanjiru, and nothing at all to anybody else. */
    expect(w.delivered.filter((d) => d.to === 'otieno@baridi.test')).toHaveLength(10);
    expect(w.delivered.filter((d) => d.to === 'wanjiru@baridi.test')).toHaveLength(10);
    expect(new Set(w.delivered.map((d) => d.to))).toEqual(new Set(ALL));
  });

  it('a day\'s email that could not go that day does not go the next day with the wrong number', async () => {
    const w = world();
    await aDayInNairobi(w, '2026-11-11');
    expect(w.delivered.map((d) => d.subject)).toEqual(['Groundwork pauses in 5 days', 'Groundwork pauses in 5 days', 'Groundwork pauses in 5 days']);
    await aDayInNairobi(w, '2026-11-12');
    expect(w.delivered.slice(3).map((d) => d.subject)).toEqual(['Groundwork pauses in 4 days', 'Groundwork pauses in 4 days', 'Groundwork pauses in 4 days']);
  });

  it('is not the day\'s one routine message: Grace, who had one this morning, is still told', async () => {
    const w = world();
    w.routineEarlier('grace@baridi.test', new Date('2026-10-19T05:00:00Z'));
    await w.sweep.sweep(new Date('2026-10-19T07:00:00Z'));
    expect(w.delivered.map((d) => d.to)).toEqual(ALL);
  });

  it('and nothing is sent to a team that has subscribed', async () => {
    const w = world();
    Object.assign(w.org, { subscriptionPlan: 'SMALL_TEAM', subscriptionStatus: 'active' });
    await w.sweep.sweep(new Date('2026-10-16T06:00:00Z'));
    await aDayInNairobi(w, '2026-10-19');
    await aDayInNairobi(w, '2026-11-12');
    expect(w.delivered).toEqual([]);
  });

  it('a free month that ended long before the rule came in gets its four weeks from the day the rule came in', async () => {
    const w = world();
    w.org.freeUntil = new Date('2026-08-01T09:00:00Z');
    /* The rule came in on 15 October, so Baridi pauses on 12 November, and is told so from 15 October. */
    await aDayInNairobi(w, '2026-10-15');
    expect(w.delivered[0].subject).toBe('Groundwork pauses at Baridi Appliances on 12 November');
  });
});

describe('nothing is sent while the free trial is switched off', () => {
  it('neither email, at any time', async () => {
    const w = world({ trialOn: false });
    for (const at of ['2026-10-16T06:00:00Z', '2026-10-17T06:00:00Z', '2026-10-19T07:00:00Z']) {
      expect(await w.sweep.sweep(new Date(at))).toEqual({ endsSoon: 0, pausesSoon: 0 });
    }
    expect(w.delivered).toEqual([]);
  });
});
