import { PLAN_LABELS } from '../billing/pricing.service';
import { readTheRows, theCountedRecord, TheCountedRecord } from './who-the-usage-counts';
import { theBackOfficeRoster, recipients } from './the-team-is-told';

/**
 * THE DAILY USAGE SUMMARY (Hafsah, 2 November 2026: "lets just have the tool email daily use summaries to hjumare@gmail.com, it already
 * sends her new sign-ups, but sends, sign-ups (all and their usage)").
 *
 * Once a day, at the hour set at Admin, System, it goes to the same people the new sign-up email goes to: everybody on the back-office
 * roster with a connected account (the-team-is-told.ts, one owner). It lists every organisation that has signed up, newest first, with its
 * usage, and the totals. What is counted, and who is left out, is who-the-usage-counts.ts, which agrees with the production SQL.
 *
 * Counts and organisation names only. No conversation content, and no member's name, address or phone number: the rows it reads hold none
 * of what anybody said, and the people are only ever keys.
 */

export const DAILY_USAGE_KEY = 'daily_usage_summary';
export const DAILY_USAGE_SENDER = 'sendTheDailyUsageSummary';
export const DAILY_USAGE_JOB = 'daily-usage-summary';

/** On, at eight in the morning in Lagos, until somebody changes it at Admin, System. */
export const DAILY_USAGE_DEFAULT = { on: true, hour: 8 } as const;
export interface DailyUsageSetting { on: boolean; hour: number }

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Lagos is one hour ahead of UTC all year. */
const LAGOS_OFFSET = HOUR;

export function isAnHour(h: unknown): h is number {
  return typeof h === 'number' && Number.isInteger(h) && h >= 0 && h <= 23;
}

/** The setting as saved, with the default for anything not saved or not readable. */
export function theSettingIn(value: unknown): DailyUsageSetting {
  const v = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return {
    on: typeof v.on === 'boolean' ? v.on : DAILY_USAGE_DEFAULT.on,
    hour: isAnHour(v.hour) ? v.hour : DAILY_USAGE_DEFAULT.hour,
  };
}

export async function theDailyUsageSetting(prisma: any): Promise<DailyUsageSetting> {
  const row = await Promise.resolve(prisma?.platformSetting?.findUnique?.({ where: { key: DAILY_USAGE_KEY } })).catch(() => null);
  return theSettingIn(row?.value);
}

/** The hour it is in Lagos, 0 to 23. */
export function theHourInLagos(now: Date): number {
  return new Date(now.getTime() + LAGOS_OFFSET).getUTCHours();
}

/** The day it is in Lagos, "2026-11-03": the slot the job claims, so it goes once a Lagos day. */
export function theDayInLagos(now: Date): string {
  return new Date(now.getTime() + LAGOS_OFFSET).toISOString().slice(0, 10);
}

/** "8 in the morning", "1 in the afternoon", "midnight": how an hour is said on the page and in the email. */
export function theHourSaid(h: number): string {
  if (h === 0) return 'midnight';
  if (h === 12) return 'midday';
  if (h < 12) return `${h} in the morning`;
  if (h < 17) return `${h - 12} in the afternoon`;
  return `${h - 12} in the evening`;
}

const theDate = (d: Date) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' }).format(d);
const theDay = (d: Date) => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Lagos' }).format(d);

/** The Monday that starts this week, in UTC, as the production SQL's weeks are. */
export function thisWeekStarts(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}

interface TwoSides { all: number; internal: number; external: number }
const twoSides = (xs: { side: 'internal' | 'external' }[]): TwoSides =>
  ({ all: xs.length, internal: xs.filter((x) => x.side === 'internal').length, external: xs.filter((x) => x.side === 'external').length });
const distinct = <T>(xs: T[], key: (x: T) => string) => [...new Map(xs.map((x) => [key(x), x])).values()];

export interface AnOrganisationsUsage {
  name: string;
  side: 'internal' | 'external';
  signedUpAt: Date;
  isNew: boolean;
  plan: string;
  people: number;
  checkIns: number;
  completed: number;
  lastActivity: Date | null;
  reachedAFifthSession: boolean;
}

export interface TheUsage {
  now: Date;
  weekStarts: Date;
  since: { signUps: number; completed: number };
  /** Each total's change since this time yesterday: the same count, on the record as it stood then. */
  change: { signedUp: number; started: number; fifth: number; completed: number; people: number; twice: number; fiveTimes: number };
  completed: TwoSides;
  notFinished: { all: number; openNow: number; declinedAfterStarting: number; closedByTheClockAfterAnswering: number };
  people: { once: TwoSides; twice: number; fiveTimes: number };
  thisWeek: { people: number; checkIns: number; organisations: number };
  /** Of the people whose first completed session was at least 4 (or 8) weeks ago, how many completed another 4 (or 8) weeks or more after it. */
  stillHere: { after4: { of: number; back: number }; after8: { of: number; back: number } };
  signedUp: TwoSides;
  /** Organisations with a first completed session, and with a fifth. */
  started: number;
  fifth: number;
  billing: { paying: number; freeNow: number; paidSaid: string | null };
  organisations: AnOrganisationsUsage[];
  leftOut: string[];
}

/** What an organisation's plan and free time are, as a sentence that follows "It signed up on 1 October 2026 and". */
export function itsPlan(o: TheCountedRecord['organisations'][number], now: Date): string {
  const label = (p: string | null) => (p && (PLAN_LABELS as Record<string, string>)[p]) || p || 'a';
  if (o.subscriptionStatus) {
    const plan = `the ${label(o.subscriptionPlan)} plan`;
    if (o.subscriptionStatus === 'active') return `pays for ${plan}`;
    if (o.subscriptionStatus === 'trialing') return `is on a paid trial of ${plan}`;
    if (o.subscriptionStatus === 'past_due' || o.subscriptionStatus === 'unpaid') return `has a payment for ${plan} that did not go through`;
    if (o.subscriptionStatus === 'canceled') return `cancelled ${plan}`;
    return `has ${plan}, which Stripe marks as ${o.subscriptionStatus.replace(/_/g, ' ')}`;
  }
  const free = o.freeTrialStartedAt ? 'a free trial' : 'free time';
  if (o.freeUntil && o.freeUntil > now) return `has ${free} on the ${label(o.freePlan)} plan until ${theDate(o.freeUntil)}`;
  if (o.freeUntil) return `had ${free} that ended on ${theDate(o.freeUntil)}, and has not paid`;
  return 'has not chosen a plan or paid';
}

/** The record as it stood at a moment: the organisations signed up by then, and the sessions that had happened by then. */
export function theRecordAsItWas(record: TheCountedRecord, at: Date): TheCountedRecord {
  const there = new Set(record.organisations.filter((o) => o.createdAt <= at).map((o) => o.id));
  return { ...record, organisations: record.organisations.filter((o) => there.has(o.id)), sessions: record.sessions.filter((s) => there.has(s.organizationId) && s.at <= at) };
}

/** Everything the email says, counted from the rows: the totals from the first day, and each one's change since this time yesterday. */
export function theUsage(record: TheCountedRecord, now: Date): TheUsage {
  const today = theTotals(record, now);
  const then = theTotals(theRecordAsItWas(record, new Date(now.getTime() - DAY)), new Date(now.getTime() - DAY));
  const change = {
    signedUp: today.signedUp.all - then.signedUp.all, started: today.started - then.started, fifth: today.fifth - then.fifth,
    completed: today.completed.all - then.completed.all, people: today.people.once.all - then.people.once.all,
    twice: today.people.twice - then.people.twice, fiveTimes: today.people.fiveTimes - then.people.fiveTimes,
  };
  return { ...today, change, since: { signUps: change.signedUp, completed: change.completed } };
}

function theTotals(record: TheCountedRecord, now: Date): Omit<TheUsage, 'change' | 'since'> {
  const yesterday = new Date(now.getTime() - DAY);
  const weekStarts = thisWeekStarts(now);
  const done = record.sessions.filter((s) => s.completed);
  const byPerson = new Map<string, number>();
  for (const s of done) byPerson.set(s.personKey, (byPerson.get(s.personKey) ?? 0) + 1);
  const thisWeek = done.filter((s) => s.at >= weekStarts);
  const openNow = record.sessions.filter((s) => s.status === 'IN_PROGRESS').length;
  const declinedAfterStarting = record.sessions.filter((s) => s.status === 'DECLINED' && s.startedAt).length;
  const closedByTheClockAfterAnswering = done.filter((s) => s.closedReason === 'auto_closed').length;

  const organisations = record.organisations.map((o) => {
    const mine = record.sessions.filter((s) => s.organizationId === o.id);
    const theirs = mine.filter((s) => s.completed);
    const touched = mine.filter((s) => s.completed || s.startedAt).map((s) => s.at.getTime());
    return {
      name: o.name,
      side: o.side,
      signedUpAt: o.createdAt,
      isNew: o.createdAt > yesterday,
      plan: itsPlan(o, now),
      people: new Set(record.participants.filter((p) => p.organizationId === o.id).map((p) => p.personKey)).size,
      checkIns: record.grounds.filter((g) => g.organizationId === o.id).length,
      completed: theirs.length,
      lastActivity: touched.length ? new Date(Math.max(...touched)) : null,
      reachedAFifthSession: theirs.some((s) => s.sessionNumber >= 5),
    };
  });

  const firstOf = new Map<string, number>();
  for (const s of done) firstOf.set(s.personKey, Math.min(firstOf.get(s.personKey) ?? Infinity, s.at.getTime()));
  const stillHere = (days: number) => {
    const of = [...firstOf].filter(([, first]) => first <= now.getTime() - days * DAY);
    return { of: of.length, back: of.filter(([key, first]) => done.some((s) => s.personKey === key && s.at.getTime() >= first + days * DAY)).length };
  };
  const paidOrgs = new Set(record.paid.map((b) => b.organizationId));
  const cents = new Map<string, number>();
  for (const b of record.paid) cents.set(b.currency.toUpperCase(), (cents.get(b.currency.toUpperCase()) ?? 0) + b.amountCents);
  const money = (c: number, cur: string) => cur === 'USD'
    ? `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`;

  return {
    now,
    weekStarts,
    stillHere: { after4: stillHere(28), after8: stillHere(56) },
    signedUp: twoSides(record.organisations),
    started: organisations.filter((o) => o.completed > 0).length,
    fifth: organisations.filter((o) => o.reachedAFifthSession).length,
    billing: {
      paying: record.organisations.filter((o) => (o.subscriptionStatus === 'active' && o.subscriptionStripeId) || paidOrgs.has(o.id)).length,
      freeNow: record.organisations.filter((o) => !o.subscriptionStatus && o.freeUntil && o.freeUntil > now).length,
      paidSaid: cents.size ? andList([...cents].map(([cur, c]) => money(c, cur))) : null,
    },
    completed: twoSides(done),
    notFinished: { all: openNow + declinedAfterStarting + closedByTheClockAfterAnswering, openNow, declinedAfterStarting, closedByTheClockAfterAnswering },
    people: {
      once: { ...twoSides(distinct(done, (s) => `${s.side}|${s.personKey}`)), all: byPerson.size },
      twice: [...byPerson.values()].filter((n) => n >= 2).length,
      fiveTimes: [...byPerson.values()].filter((n) => n >= 5).length,
    },
    thisWeek: {
      people: new Set(thisWeek.map((s) => s.personKey)).size,
      checkIns: new Set(thisWeek.map((s) => s.groundId)).size,
      organisations: new Set(thisWeek.map((s) => s.organizationId)).size,
    },
    organisations,
    leftOut: record.leftOut,
  };
}

const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
const sides = (t: TwoSides) => `${t.external} at client organisations and ${t.internal} at Coamana's own`;
/** A total's change since yesterday, said after it: " (1 more since yesterday)". */
const sinceYesterday = (k: number) => ` (${k > 0 ? `${k} more` : k < 0 ? `${-k} fewer` : 'no change'} since yesterday)`;
const andList = (xs: string[]) => xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

/** One organisation, as the sentences under its name. */
export function itsUsage(o: AnOrganisationsUsage): string[] {
  const lines = [`${o.isNew ? 'This organisation is new since yesterday. ' : ''}${o.side === 'internal' ? "This is one of Coamana's own organisations." : 'This is a client organisation.'} It signed up on ${theDate(o.signedUpAt)} and ${o.plan}.`];
  if (!o.checkIns) {
    lines.push('It has not made a check-in yet.');
    return lines;
  }
  lines.push(`It has ${n(o.checkIns, 'check-in', 'check-ins')} with ${n(o.people, 'person', 'people')} on them, and ${n(o.completed, 'session has', 'sessions have')} been completed.`);
  lines.push(o.lastActivity ? `The last session was on ${theDate(o.lastActivity)}.` : 'Nobody has started a session yet.');
  if (o.completed) lines.push(o.reachedAFifthSession ? 'It has reached a fifth session.' : 'It has not reached a fifth session yet.');
  return lines;
}

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The email, as subject, plain text and HTML. */
export function theUsageEmail(u: TheUsage, hour: number): { subject: string; text: string; html: string } {
  const subject = `Groundwork usage on ${theDay(u.now)}, with ${n(u.since.signUps, 'new sign-up', 'new sign-ups')} and ${n(u.since.completed, 'session', 'sessions')} completed since yesterday`;
  const opening = `This is how Groundwork has been used, up to ${theHourSaid(hour)} on ${theDay(u.now)}, Lagos time.`;
  const growth = [
    `${n(u.signedUp.all, 'organisation has', 'organisations have')} signed up so far${sinceYesterday(u.change.signedUp)}, ${sides(u.signedUp)}.`,
    `${n(u.started, 'of them has', 'of them have')} completed a first session${sinceYesterday(u.change.started)}, and ${n(u.fifth, 'has', 'have')} reached a fifth session${sinceYesterday(u.change.fifth)}.`,
    `${n(u.billing.paying, 'organisation pays', 'organisations pay')}, as far as Groundwork's own records say, and ${n(u.billing.freeNow, 'is', 'are')} on a free trial or free time now. ${u.billing.paidSaid ? `${u.billing.paidSaid} has been recorded as paid so far.` : 'No payment has been recorded yet.'} Stripe is the full record of money.`,
  ];
  const keptOn = (w: number, x: { of: number; back: number }) => x.of
    ? `Of the ${n(x.of, 'person', 'people')} whose first session was at least ${w} weeks ago, ${x.back} completed another session ${w} weeks or more after it.`
    : `Nobody's first session was ${w} weeks ago or more yet.`;
  const totals = [
    `${n(u.completed.all, 'session has', 'sessions have')} been completed so far${sinceYesterday(u.change.completed)}, ${sides(u.completed)}.`,
    u.notFinished.all
      ? `${n(u.notFinished.all, 'session was', 'sessions were')} started and not finished. ${n(u.notFinished.openNow, 'is', 'are')} still open, ${n(u.notFinished.declinedAfterStarting, 'was', 'were')} declined after it began, and ${n(u.notFinished.closedByTheClockAfterAnswering, 'was', 'were')} closed by the clock after the person had answered part of it. The ones closed by the clock are also counted as completed, as the product counts them.`
      : 'No session was started and left unfinished.',
    `${n(u.people.once.all, 'person has', 'people have')} completed a check-in${sinceYesterday(u.change.people)}, ${sides(u.people.once)}. Somebody at both is counted once in the total.`,
    `Of them, ${n(u.people.twice, 'person has', 'people have')} completed two or more sessions${sinceYesterday(u.change.twice)}, and ${n(u.people.fiveTimes, 'person has', 'people have')} completed five or more${sinceYesterday(u.change.fiveTimes)}.`,
    `This week, since ${theDay(u.weekStarts)}, ${n(u.thisWeek.people, 'person', 'people')} completed a session, in ${n(u.thisWeek.checkIns, 'check-in', 'check-ins')} at ${n(u.thisWeek.organisations, 'organisation', 'organisations')}.`,
    keptOn(4, u.stillHere.after4),
    keptOn(8, u.stillHere.after8),
  ];
  const listHeading = `Every organisation that has signed up, newest first (${u.organisations.length})`;
  const leftOut = u.leftOut.length
    ? `${n(u.leftOut.length, 'organisation is', 'organisations are')} left out of everything above, because ${u.leftOut.length === 1 ? 'it is' : 'they are'} for tests or demos or ${u.leftOut.length === 1 ? 'is' : 'are'} Groundwork's own. ${u.leftOut.length === 1 ? 'It is' : 'They are'} ${andList(u.leftOut)}. Groundwork's own team are also left out as people wherever they took part.`
    : "Groundwork's own team are left out as people wherever they took part.";
  const closing = 'This email goes to everybody on the back-office team with a connected account, the same people who are told about each new sign-up. It holds counts and organisation names only, and nothing anybody said. To turn it off or change the hour, go to Admin, then System, then Daily usage summary.';

  const text: string[] = [opening, '', 'Organisations', ...growth, '', 'Sessions and people', ...totals, '', listHeading, ''];
  const html: string[] = [`<p>${esc(opening)}</p>`,
    '<h2 style="font-size:17px;margin:24px 0 8px">Organisations</h2>', ...growth.map((t) => `<p style="margin:0 0 8px">${esc(t)}</p>`),
    '<h2 style="font-size:17px;margin:24px 0 8px">Sessions and people</h2>', ...totals.map((t) => `<p style="margin:0 0 8px">${esc(t)}</p>`),
    `<h2 style="font-size:17px;margin:24px 0 8px">${esc(listHeading)}</h2>`];
  for (const o of u.organisations) {
    const lines = itsUsage(o);
    text.push(o.name, ...lines, '');
    html.push(`<h3 style="font-size:14px;margin:16px 0 4px">${esc(o.name)}</h3>`, `<p style="margin:0 0 8px">${esc(lines.join(' '))}</p>`);
  }
  if (!u.organisations.length) { text.push('No organisation has signed up yet.', ''); html.push('<p>No organisation has signed up yet.</p>'); }
  text.push(leftOut, '', closing);
  html.push(`<p style="margin-top:24px">${esc(leftOut)}</p>`, `<p style="margin-top:16px;color:#4E4236">${esc(closing)}</p>`);
  return { subject, text: text.join('\n'), html: html.join('') };
}

export interface TheUsageDoors {
  prisma: any;
  email: { sendTheDailyUsageSummary(to: string, subject: string, html: string, text: string): Promise<{ sent: boolean }> };
}

/** Counts the record and sends the email to each person on the roster. Nothing is written but the email's own record. */
export async function sendTheDailyUsageSummary(doors: TheUsageDoors, now: Date = new Date()): Promise<{ sent: number; to: string[]; why?: string }> {
  const setting = await theDailyUsageSetting(doors.prisma);
  if (!setting.on) return { sent: 0, to: [], why: 'The daily usage summary is turned off.' };
  const to = recipients(await theBackOfficeRoster(doors.prisma));
  if (!to.length) return { sent: 0, to, why: 'Nobody on the back-office roster has a connected account.' };
  const mail = theUsageEmail(theUsage(theCountedRecord(await readTheRows(doors.prisma)), now), setting.hour);
  let sent = 0;
  for (const address of to) if ((await doors.email.sendTheDailyUsageSummary(address, mail.subject, mail.html, mail.text))?.sent) sent += 1;
  return { sent, to };
}
