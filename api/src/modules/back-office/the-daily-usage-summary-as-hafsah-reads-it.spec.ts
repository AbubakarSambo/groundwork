import { theCountedRecord, readTheRows, isATestOrDemoOrganisation, isAStaffAddress, isInternal } from './who-the-usage-counts';
import { theUsage, theUsageEmail, sendTheDailyUsageSummary, theSettingIn, DAILY_USAGE_KEY, DAILY_USAGE_DEFAULT, DAILY_USAGE_SENDER } from './the-daily-usage-summary';
import { TheDailyUsageSummaryCron } from './the-daily-usage-summary.cron';
import { whatThisMailIs } from '../email/nothing-goes-out-that-was-turned-off';
import { whatIsNotPlainIn } from '../reports/a-product-sentence-is-plain';
import { AdminService } from '../admin/admin.service';

/**
 * THE DAILY USAGE SUMMARY, AS HAFSAH READS IT. Tuesday 3 November 2026, eight in the morning in Lagos.
 *
 * Counted: Drop Access, a client on its free month, where Wanjiru leads Peter and Mercy (Peter has done five sessions); Coamana Field Team,
 * Coamana's own, which signed up last night, where Ade and Peter each did one; and Lipa Kiosks, which pays and has made no check-in yet.
 * Left out: Drop Access (test), the seed's Demo Organisation, Jumare Ventures (only Hafsah's own account) and Kijani Repairs (a .test
 * address). Hafsah's own session at Drop Access, Wanjiru's setup conversation, a session the clock closed with nothing said, and a session in
 * one of the three demo check-ins are left out too.
 */
const NOW = new Date('2026-11-03T07:00:00Z');
const D = (s: string) => new Date(s);

const org = (id: string, name: string, createdAt: string, over: Record<string, any> = {}) => ({
  id, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), email: `admin@${id}.co`, isInternal: false, createdAt: D(createdAt),
  subscriptionPlan: null, subscriptionStatus: null, subscriptionStripeId: null, freeUntil: null, freePlan: null, freeTrialStartedAt: null, ...over,
});
const ci = (id: string, groundId: string, participantId: string, sessionNumber: number, status: string, at: string | null, over: Record<string, any> = {}) => ({
  id, groundId, participantId, sessionNumber, status, closedReason: null, isSetup: false,
  startedAt: at ? D(at) : null, completedAt: status === 'COMPLETED' && at ? D(at) : null, createdAt: D('2026-10-01T08:00:00Z'), personTurns: 3, ...over,
});

function aWorld() {
  return {
    organizations: [
      org('o1', 'Drop Access', '2026-10-01T09:00:00Z', { subscriptionPlan: null, freePlan: 'SMALL_TEAM', freeUntil: D('2026-11-30T09:00:00Z'), freeTrialStartedAt: D('2026-10-01T09:00:00Z') }),
      org('o2', 'Coamana Field Team', '2026-11-02T20:00:00Z'),
      org('o3', 'Lipa Kiosks', '2026-09-01T09:00:00Z', { subscriptionPlan: 'STARTER', subscriptionStatus: 'active', subscriptionStripeId: 'sub_lipa' }),
      org('o4', 'Drop Access (test)', '2026-10-15T09:00:00Z'),
      org('o5', 'Demo Organisation', '2026-08-01T09:00:00Z', { slug: 'demo' }),
      org('o6', 'Jumare Ventures', '2026-10-20T09:00:00Z'),
      org('o7', 'Kijani Repairs', '2026-10-05T09:00:00Z', { email: 'wanjiru@kijani.test' }),
    ],
    users: [
      { id: 'u-wanjiru', organizationId: 'o1', email: 'wanjiru@dropaccess.co', isPlatformAdmin: false },
      { id: 'u-peter', organizationId: 'o1', email: 'peter@dropaccess.co', isPlatformAdmin: false },
      { id: 'u-ade', organizationId: 'o2', email: 'ade@coamana.com', isPlatformAdmin: false },
      { id: 'u-lipa', organizationId: 'o3', email: 'amina@lipa.co', isPlatformAdmin: false },
      { id: 'u-test', organizationId: 'o4', email: 'grace@drop.test', isPlatformAdmin: false },
      { id: 'u-demo', organizationId: 'o5', email: 'founder@demo.co', isPlatformAdmin: false },
      { id: 'u-hafsah', organizationId: 'o6', email: 'hjumare@coamana.com', isPlatformAdmin: false },
      { id: 'u-gmail', organizationId: 'o6', email: 'hjumare@gmail.com', isPlatformAdmin: true },
      { id: 'u-kijani', organizationId: 'o7', email: 'wanjiru@kijani.test', isPlatformAdmin: false },
    ],
    grounds: [
      { id: 'g1', organizationId: 'o1', label: 'Sales team, Q4' },
      { id: 'g9', organizationId: 'o1', label: 'Agent Network: weekly read' },
      { id: 'g2', organizationId: 'o2', label: 'Field visits' },
      { id: 'g4', organizationId: 'o4', label: 'Sales team, Q4' },
    ],
    participants: [
      { id: 'p-wanjiru', groundId: 'g1', userId: 'u-wanjiru', email: 'wanjiru@dropaccess.co' },
      { id: 'p-peter', groundId: 'g1', userId: 'u-peter', email: 'peter@dropaccess.co' },
      /* Mercy has no account; the roster person stands for her. */
      { id: 'p-mercy', groundId: 'g1', userId: null, email: 'mercy@dropaccess.co' },
      { id: 'p-hafsah', groundId: 'g1', userId: null, email: 'hjumare@gmail.com' },
      { id: 'p-peter-demo', groundId: 'g9', userId: 'u-peter', email: 'peter@dropaccess.co' },
      { id: 'p-ade', groundId: 'g2', userId: 'u-ade', email: 'ade@coamana.com' },
      /* Peter again, at Coamana's own, invited by address only: the same person. */
      { id: 'p-peter-2', groundId: 'g2', userId: null, email: 'Peter@DropAccess.co' },
      { id: 'p-grace', groundId: 'g4', userId: 'u-test', email: 'grace@drop.test' },
    ],
    people: [
      { id: 'r-mercy', organizationId: 'o1', email: 'mercy@dropaccess.co', linkedUserId: null, createdAt: D('2026-10-01T09:00:00Z') },
    ],
    checkIns: [
      ci('c-p1', 'g1', 'p-peter', 1, 'COMPLETED', '2026-10-05T09:00:00Z'),
      ci('c-p2', 'g1', 'p-peter', 2, 'COMPLETED', '2026-10-13T09:00:00Z'),
      ci('c-p3', 'g1', 'p-peter', 3, 'COMPLETED', '2026-10-20T09:00:00Z'),
      ci('c-p4', 'g1', 'p-peter', 4, 'COMPLETED', '2026-10-27T09:00:00Z'),
      ci('c-p5', 'g1', 'p-peter', 5, 'COMPLETED', '2026-11-02T10:00:00Z'),
      ci('c-m1', 'g1', 'p-mercy', 1, 'COMPLETED', '2026-10-06T10:00:00Z'),
      ci('c-m2', 'g1', 'p-mercy', 2, 'COMPLETED', '2026-10-13T10:00:00Z'),
      /* A quiet close: the clock closed it and Mercy said nothing. Not a session. */
      ci('c-m4', 'g1', 'p-mercy', 4, 'COMPLETED', '2026-10-27T10:00:00Z', { closedReason: 'auto_closed', personTurns: 0 }),
      ci('c-m3', 'g1', 'p-mercy', 3, 'IN_PROGRESS', '2026-11-01T10:00:00Z'),
      /* Wanjiru answered part of it and the clock closed it: completed, and also started and not finished. */
      ci('c-w1', 'g1', 'p-wanjiru', 1, 'COMPLETED', '2026-10-20T11:00:00Z', { closedReason: 'auto_closed', personTurns: 2 }),
      ci('c-w2', 'g1', 'p-wanjiru', 2, 'DECLINED', '2026-10-27T11:00:00Z'),
      ci('c-wsetup', 'g1', 'p-wanjiru', 0, 'COMPLETED', '2026-10-01T10:00:00Z', { isSetup: true }),
      ci('c-h1', 'g1', 'p-hafsah', 1, 'COMPLETED', '2026-10-06T12:00:00Z'),
      ci('c-demo', 'g9', 'p-peter-demo', 1, 'COMPLETED', '2026-10-30T09:00:00Z'),
      ci('c-a1', 'g2', 'p-ade', 1, 'COMPLETED', '2026-11-02T21:00:00Z'),
      ci('c-p21', 'g2', 'p-peter-2', 1, 'COMPLETED', '2026-11-02T22:00:00Z'),
      ci('c-g1', 'g4', 'p-grace', 1, 'COMPLETED', '2026-10-20T09:00:00Z'),
    ],
    paid: [
      { organizationId: 'o3', amountCents: 2500, currency: 'USD' },
      /* A test organisation's payment is left out with it. */
      { organizationId: 'o4', amountCents: 5000, currency: 'USD' },
    ],
  };
}

/** A stand-in database: the rows above, the roster, the settings, and the once-a-day claim. */
function aDatabase(w = aWorld(), settings: Record<string, any> = {}, roster: { userId: string | null; accounts: { userId: string }[] }[] = [{ userId: 'u-gmail', accounts: [] }]) {
  const claims = new Map<string, string>();
  const strip = ({ personTurns, ...c }: any) => ({ ...c, _count: { turns: personTurns } });
  return {
    settings,
    organization: { findMany: async () => w.organizations },
    user: { findMany: async (a: any) => (a?.where?.id?.in ? w.users.filter((u) => a.where.id.in.includes(u.id)).map((u) => ({ email: u.email, organizationId: u.organizationId })) : w.users) },
    ground: { findMany: async () => w.grounds },
    groundParticipant: { findMany: async () => w.participants },
    person: { findMany: async () => w.people },
    checkIn: { findMany: async () => w.checkIns.map(strip) },
    opsPerson: { findMany: async () => roster },
    billingEvent: { findMany: async () => w.paid },
    platformSetting: {
      findUnique: async ({ where }: any) => (where.key in settings ? { key: where.key, value: settings[where.key] } : null),
      upsert: async ({ where, create, update }: any) => { settings[where.key] = (where.key in settings ? update : create).value; return {}; },
    },
    $executeRaw: async (_s: TemplateStringsArray, key: string, value: string) => {
      if (claims.get(key) === value) return 0;
      claims.set(key, value);
      return 1;
    },
    withAdvisoryLock: async (_k: number, fn: () => Promise<void>) => { await fn(); return true; },
  };
}

function aMailer() {
  const sent: { to: string; subject: string; html: string; text: string }[] = [];
  return { sent, sendTheDailyUsageSummary: async (to: string, subject: string, html: string, text: string) => { sent.push({ to, subject, html, text }); return { sent: true }; } };
}

async function theEmail() {
  const usage = theUsage(theCountedRecord(await readTheRows(aDatabase())), NOW);
  return { usage, mail: theUsageEmail(usage, 8) };
}

describe('who the usage counts (the same rules as the production SQL)', () => {
  it('leaves out test, demo, sandbox, example, Groundwork and test-address organisations by their own name, slug or address', () => {
    expect(isATestOrDemoOrganisation({ name: 'Drop Access (test)', slug: 'drop-access-test', email: 'a@b.co' })).toBe(true);
    expect(isATestOrDemoOrganisation({ name: 'Demo Organisation', slug: 'demo', email: 'a@b.co' })).toBe(true);
    expect(isATestOrDemoOrganisation({ name: 'Pilot sandbox', slug: 'pilot', email: 'a@b.co' })).toBe(true);
    expect(isATestOrDemoOrganisation({ name: 'Groundwork', slug: 'groundwork', email: 'a@b.co' })).toBe(true);
    expect(isATestOrDemoOrganisation({ name: 'Kijani Repairs', slug: 'kijani', email: 'w@kijani.test' })).toBe(true);
    expect(isATestOrDemoOrganisation({ name: 'Drop Access', slug: 'drop-access', email: 'ops@dropaccess.co' })).toBe(false);
    expect(isATestOrDemoOrganisation({ name: 'Contest Kitchens', slug: 'contest-kitchens', email: 'a@b.co' })).toBe(false);
  });

  it("counts Hafsah's own addresses, Groundwork's addresses and test addresses as staff, and Coamana's by name or by the mark as internal", () => {
    for (const e of ['hjumare@gmail.com', 'HJumare@Coamana.com', 'hafsah.jumare@coamana.com', 'ops@myground.work', 'x@groundwork.example', 'a@b.invalid', 'a@example.org'])
      expect(isAStaffAddress(e)).toBe(true);
    expect(isAStaffAddress('ade@coamana.com')).toBe(false);
    expect(isInternal({ name: 'MarketView Field', isInternal: false })).toBe(true);
    expect(isInternal({ name: 'Ours', isInternal: true })).toBe(true);
    expect(isInternal({ name: 'Drop Access', isInternal: false })).toBe(false);
  });

  it('lists the counted organisations newest first, and names the ones left out', async () => {
    const r = theCountedRecord(await readTheRows(aDatabase()));
    expect(r.organisations.map((o) => `${o.name} (${o.side})`)).toEqual(['Coamana Field Team (internal)', 'Drop Access (external)', 'Lipa Kiosks (external)']);
    expect(r.leftOut).toEqual(['Jumare Ventures', 'Drop Access (test)', 'Kijani Repairs', 'Demo Organisation']);
  });

  it("counts completed sessions, people once, repeats, the week and what was not finished, without staff, setup, quiet closes or the demos", async () => {
    const { usage } = await theEmail();
    expect(usage.completed).toEqual({ all: 10, external: 8, internal: 2 });
    expect(usage.notFinished).toEqual({ all: 3, openNow: 1, declinedAfterStarting: 1, closedByTheClockAfterAnswering: 1 });
    /* Peter is at both: once on each side, and once in the total. */
    expect(usage.people).toEqual({ once: { all: 4, external: 3, internal: 2 }, twice: 2, fiveTimes: 1 });
    expect(usage.thisWeek).toEqual({ people: 2, checkIns: 2, organisations: 2 });
    expect(usage.since).toEqual({ signUps: 1, completed: 3 });
    /* Each total beside its change since this time yesterday: the same count on the record as it stood 24 hours ago. */
    expect(usage.change).toEqual({ signedUp: 1, started: 1, fifth: 1, completed: 3, people: 1, twice: 0, fiveTimes: 1 });
    expect(usage.stillHere).toEqual({ after4: { of: 1, back: 1 }, after8: { of: 0, back: 0 } });
    expect(usage.signedUp).toEqual({ all: 3, external: 2, internal: 1 });
    expect({ started: usage.started, fifth: usage.fifth }).toEqual({ started: 2, fifth: 1 });
    expect(usage.billing).toEqual({ paying: 1, freeNow: 1, paidSaid: '$25.00' });
    const drop = usage.organisations.find((o) => o.name === 'Drop Access')!;
    expect(drop).toMatchObject({ people: 3, checkIns: 1, completed: 8, reachedAFifthSession: true });
    expect(usage.organisations.find((o) => o.name === 'Coamana Field Team')).toMatchObject({ isNew: true, people: 2, checkIns: 1, completed: 2, reachedAFifthSession: false });
  });
});

describe('the email, as Hafsah reads it', () => {
  it('reads like this', async () => {
    const { mail } = await theEmail();
    expect(mail.subject).toBe('Groundwork usage on Tuesday 3 November, with 1 new sign-up and 3 sessions completed since yesterday');
    expect(mail.text).toMatchSnapshot();
  });

  it('says each total and each organisation in a plain sentence', async () => {
    const { mail } = await theEmail();
    for (const line of [
      "3 organisations have signed up so far (1 more since yesterday), 2 at client organisations and 1 at Coamana's own.",
      '2 of them have completed a first session (1 more since yesterday), and 1 has reached a fifth session (1 more since yesterday).',
      "1 organisation pays, as far as Groundwork's own records say, and 1 is on a free trial or free time now. $25.00 has been recorded as paid so far. Stripe is the full record of money.",
      'Of the 1 person whose first session was at least 4 weeks ago, 1 completed another session 4 weeks or more after it.',
      "Nobody's first session was 8 weeks ago or more yet.",
      "10 sessions have been completed so far (3 more since yesterday), 8 at client organisations and 2 at Coamana's own.",
      '3 sessions were started and not finished. 1 is still open, 1 was declined after it began, and 1 was closed by the clock after the person had answered part of it. The ones closed by the clock are also counted as completed, as the product counts them.',
      "4 people have completed a check-in (1 more since yesterday), 3 at client organisations and 2 at Coamana's own. Somebody at both is counted once in the total.",
      'Of them, 2 people have completed two or more sessions (no change since yesterday), and 1 person has completed five or more (1 more since yesterday).',
      'This week, since Monday 2 November, 2 people completed a session, in 2 check-ins at 2 organisations.',
      'This is a client organisation. It signed up on 1 October 2026 and has a free trial on the Small Team plan until 30 November 2026.',
      'It has 1 check-in with 3 people on them, and 8 sessions have been completed.',
      'It has reached a fifth session.',
      "This organisation is new since yesterday. This is one of Coamana's own organisations. It signed up on 2 November 2026 and has not chosen a plan or paid.",
      'This is a client organisation. It signed up on 1 September 2026 and pays for the Starter plan.',
      'It has not made a check-in yet.',
    ]) expect(mail.text.split('\n')).toContain(line);
    const headings = new Set(['Organisations', 'Sessions and people', 'Coamana Field Team', 'Drop Access', 'Lipa Kiosks', 'Every organisation that has signed up, newest first (3)']);
    const faults = mail.text.split('\n').filter((l) => l && !headings.has(l)).flatMap((l) => whatIsNotPlainIn(l, { whole: true }).map((f) => `${f.rule}: ${f.found} in "${l}"`));
    expect(faults).toEqual([]);
  });

  it("holds no member's name, address or phone number, and nothing anybody said", async () => {
    const { mail } = await theEmail();
    for (const s of [mail.text, mail.html]) {
      for (const who of ['Peter', 'Mercy', 'Wanjiru', 'Ade', 'Amina', 'Grace', 'Hafsah', 'jumare', '@']) expect(s).not.toContain(who);
    }
  });

  it('is Groundwork’s own operational mail, so no preference or quiet hour holds it back', () => {
    expect(whatThisMailIs(DAILY_USAGE_SENDER)).toBe('operational');
  });
});

describe('the job', () => {
  it('sends one email a day, at the hour set, to the back-office roster (the people told about each new sign-up)', async () => {
    const db = aDatabase();
    const mailer = aMailer();
    const cron = new TheDailyUsageSummaryCron(db as any, mailer as any);
    /* Every hour of two Lagos days, each one run twice, as a second copy of the API would. */
    for (let h = 0; h < 48; h++) for (const copy of [1, 2]) await cron.everyHour(new Date(Date.UTC(2026, 10, 2, 23 + h, 0, copy)));
    expect(mailer.sent.map((m) => m.to)).toEqual(['hjumare@gmail.com', 'hjumare@gmail.com']);
    expect(mailer.sent.map((m) => m.subject.slice(0, 33))).toEqual(['Groundwork usage on Tuesday 3 Nov', 'Groundwork usage on Wednesday 4 N']);
  });

  it('goes at the hour chosen, and not at all when turned off', async () => {
    const at10 = aDatabase(aWorld(), { [DAILY_USAGE_KEY]: { on: true, hour: 10 } });
    const mailer = aMailer();
    const cron = new TheDailyUsageSummaryCron(at10 as any, mailer as any);
    expect(await cron.everyHour(new Date('2026-11-03T07:00:00Z'))).toBe(false);
    expect(await cron.everyHour(new Date('2026-11-03T09:00:00Z'))).toBe(true);
    expect(mailer.sent).toHaveLength(1);

    const off = aDatabase(aWorld(), { [DAILY_USAGE_KEY]: { on: false, hour: 8 } });
    const none = aMailer();
    expect(await new TheDailyUsageSummaryCron(off as any, none as any).everyHour(new Date('2026-11-03T07:00:00Z'))).toBe(false);
    expect((await sendTheDailyUsageSummary({ prisma: off, email: none }, NOW)).why).toBe('The daily usage summary is turned off.');
    expect(none.sent).toHaveLength(0);
  });

  it('tells nobody, and says so, while nobody on the roster has a connected account', async () => {
    const db = aDatabase(aWorld(), {}, []);
    expect(await sendTheDailyUsageSummary({ prisma: db, email: aMailer() }, NOW)).toEqual({ sent: 0, to: [], why: 'Nobody on the back-office roster has a connected account.' });
  });
});

describe('the switch at Admin, System', () => {
  it('is on at eight in the morning until somebody changes it, and keeps what was not sent', async () => {
    expect(theSettingIn(undefined)).toEqual(DAILY_USAGE_DEFAULT);
    expect(theSettingIn({ on: false })).toEqual({ on: false, hour: 8 });
    const db = aDatabase();
    const admin = new AdminService(db as any, {} as any, {} as any);
    const before = await admin.getDailyUsage();
    expect(before).toMatchObject({ on: true, hour: 8, to: ['hjumare@gmail.com'] });
    expect(before.hours[8]).toBe('8 in the morning');
    expect(await admin.setDailyUsage({ hour: 7 }, 'u-gmail')).toMatchObject({ on: true, hour: 7 });
    expect(await admin.setDailyUsage({ on: false }, 'u-gmail')).toMatchObject({ on: false, hour: 7 });
    await expect(admin.setDailyUsage({ hour: 24 }, 'u-gmail')).rejects.toThrow('The hour is a whole number from 0 to 23, in Lagos time.');
  });
});

/*
 * THE ASSUMPTIONS MADE FOR THIS EMAIL (Hafsah, 2 November: "make your best assumptions on the daily mail based on what we need to know as a
 * business"). Each can be changed in the-daily-usage-summary.ts or who-the-usage-counts.ts.
 *   1. It goes to the same people as the new sign-up email: everybody on the back-office roster with a connected account, read on every send.
 *      There is no separate address to set; Hafsah receives it at hjumare@gmail.com when that account is connected to her on the roster.
 *   2. On by default, at 8 in the morning, Lagos time, once a Lagos day. Admin, System turns it off or moves the hour.
 *   3. Who is counted is the production SQL's shared exclusions, word for word: tests, demos, sandboxes, examples, Groundwork's own and
 *      staff-only organisations are left out, and named at the end so a wrongly left-out one can be seen; staff are left out as people.
 *   4. Growth is every counted sign-up, newest first, and those since this time yesterday. Activation is an organisation with a first
 *      completed session; depth is a fifth session, the point at which payment starts.
 *   5. Engagement is completed sessions, people who completed a session (2 or more, 5 or more), and this week's active people, check-ins and
 *      organisations, the week starting on Monday in UTC as the SQL's weeks do. Retention is the SQL's 4 and 8 weeks after a first session.
 *   6. Started and not finished is the SQL's strict reading: still open, declined after starting, and closed by the clock after a partial
 *      answer (the last also counted as completed, as the product counts it).
 *   7. Paying is the SQL's "paying per database": an active Stripe subscription, or a payment recorded as paid. Amounts are the recorded
 *      payments only. Stripe is the ledger, and the email says so.
 *   8. Last activity is the latest session anybody started or finished. Web, phone and WhatsApp are not split: the product does not record
 *      web against phone.
 *   9. Counts and organisation names only. No member's name, address or phone number, and nothing anybody said.
 */
