import { EmailService } from '../email/email.service';
import { PricingService } from './pricing.service';
import { BillingService } from './billing.service';
import { TheFreeMonthEmails } from './the-free-month-emails';
import { forgetTheOrganisationsZone } from '../../common/the-organisations-own-day';

/**
 * THE FREE MONTH'S TWO EMAILS, AS GRACE AND OTIENO READ THEM (Hafsah, 15 October 2026).
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
  const notifications: any[] = [];
  const delivered: Array<{ to: string; subject: string; html: string }> = [];
  const org = {
    id: orgId, name: 'Baridi Appliances', timeZone: 'Africa/Nairobi', createdAt: opts.createdAt ?? new Date('2026-09-01T09:00:00Z'),
    freeUntil: UNTIL, freePlan: 'SMALL_TEAM', freeTrialStartedAt: null, freeMonthOfReleaseAt: new Date('2026-09-18T22:30:00Z'),
    subscriptionPlan: null, subscriptionStatus: null,
  };
  const admins = [
    { id: 'u-grace', email: 'grace@baridi.test', firstName: 'Grace' },
    { id: 'u-otieno', email: 'otieno@baridi.test', firstName: 'Otieno' },
  ];
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
      findMany: jest.fn(async ({ where }: any) => (where?.role ? admins : [])),
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
    expect(await w.sweep.sweep(new Date('2026-10-15T10:00:00Z'))).toEqual({ endsSoon: 0, ended: 0 });
    expect(w.delivered).toEqual([]);
  });

  it('is not sent in the night in Nairobi, and is sent at nine in the morning, three days before', async () => {
    const w = world();
    expect(await w.sweep.sweep(new Date('2026-10-16T03:00:00Z'))).toEqual({ endsSoon: 0, ended: 0 });
    expect(await w.sweep.sweep(new Date('2026-10-16T06:00:00Z'))).toEqual({ endsSoon: 1, ended: 0 });
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
      'Nothing is charged until you choose a plan. If you do not choose a plan by then, Baridi Appliances moves to the free plan, which is for teams of 5 or fewer people. Baridi Appliances has 23 people, which is more than the free plan covers, so choose a plan for all of them.',
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

describe('once the free month has ended', () => {
  it('tells each admin once what happens now, with the link', async () => {
    const w = world();
    await w.sweep.sweep(new Date('2026-10-19T07:00:00Z'));
    await w.sweep.sweep(new Date('2026-10-19T08:00:00Z'));
    expect(w.delivered.map((d) => [d.to, d.subject])).toEqual([
      ['grace@baridi.test', 'Your free month at Baridi Appliances has ended'],
      ['otieno@baridi.test', 'Your free month at Baridi Appliances has ended'],
    ]);
    expect(w.read(0)).toBe([
      'Hello Grace,',
      'Your free month at Baridi Appliances ended on 19 October. Nothing has been charged.',
      'Baridi Appliances is on the free plan now, which is for teams of 5 or fewer people. Baridi Appliances has 23 people, which is more than the free plan covers, so choose a plan for all of them.',
      'This is what you will pay each month when you choose a plan.',
      'Baridi Appliances has 23 people. The Small Team plan is $90 a month, and it includes 20 seats.',
      'You have 3 seats more than that, at $5 each, which is $15 a month.',
      'WhatsApp is $4 a month for each person who uses it. 3 people have used it this month, which is $12.',
      'That is $117 a month in all.',
      'You can choose a plan, and see every plan, on Plan and billing.',
      'Open Plan and billing',
    ].join('\n'));
  });

  it('for a team that came after the trial was switched on, says its check-ins are paused until a plan is chosen', async () => {
    const w = world({ createdAt: new Date('2026-10-16T00:00:00Z') });
    await w.sweep.sweep(new Date('2026-10-19T07:00:00Z'));
    expect(w.read(0)).toContain('Check-ins at Baridi Appliances are paused until you choose a plan. Nothing is deleted, and every record stays readable.');
  });

  it('is not sent for a free month that ended more than a week ago', async () => {
    const w = world();
    await w.sweep.sweep(new Date('2026-10-27T07:00:00Z'));
    expect(w.delivered).toEqual([]);
  });

  it('and nothing is sent to a team that has subscribed', async () => {
    const w = world();
    Object.assign(w.org, { subscriptionPlan: 'SMALL_TEAM', subscriptionStatus: 'active' });
    await w.sweep.sweep(new Date('2026-10-16T06:00:00Z'));
    await w.sweep.sweep(new Date('2026-10-19T07:00:00Z'));
    expect(w.delivered).toEqual([]);
  });
});

describe('nothing is sent while the free trial is switched off', () => {
  it('neither email, at any time', async () => {
    const w = world({ trialOn: false });
    for (const at of ['2026-10-16T06:00:00Z', '2026-10-17T06:00:00Z', '2026-10-19T07:00:00Z']) {
      expect(await w.sweep.sweep(new Date(at))).toEqual({ endsSoon: 0, ended: 0 });
    }
    expect(w.delivered).toEqual([]);
  });
});
