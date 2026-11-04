import { theOrganisationsZone } from '../../common/the-organisations-own-day';
import { A_GROUND_NO_MESSAGE_IS_ABOUT } from '../grounds/a-ground-that-has-ended';
import { isAWorkingDay } from '../grounds/which-days-this-team-works';
import { leaveOfThePeopleOn, awayUntilOn, theirApprovedLeave } from '../suites/who-is-away';
import { formsOfTheSameNumber } from '../whatsapp/a-number-whatsapp-can-reach';
import { NOT_TURNED_ON_QUIETLY, NOT_TODAY, OUTSIDE_THE_WINDOW, THEY_SAID_NOT_NOW, THEY_SAID_STOP } from '../whatsapp/a-message-outside-the-window';
import { FIRST_CONTACT_NOT_APPROVED } from '../whatsapp/the-first-message-to-a-number';
import { THEIR_KEYS_CANNOT_BE_OPENED } from '../whatsapp/an-organisations-own-keys';
import { BY_EMAIL_NOTICE, BY_EMAIL_ROUTINE, THE_OPENING_EMAILS } from '../whatsapp/by-email-instead';
import { ROUTINE_EMAILS, aRoutineWhatsApp } from './one-routine-message-a-day';
import { SKIPPED } from './never-the-same-words-twice';
/* The lead's own nudge on WhatsApp (the-leads-own-nudge.ts, NUDGE_KIND), named here so this read-only alert does not load the sender. */
const NUDGE_KIND = 'lead-nudge';

/**
 * THE DAILY DELIVERY ALERT: GROUNDWORK'S OWN MORNING EMAIL ABOUT WHAT DID NOT GO OUT YESTERDAY (19 October).
 *
 * In the Drop Access runs, openings, reminders and the lead's morning summary were written down as "not sent" and nobody heard. This reads
 * the send records each morning, for every client organisation, and emails one platform address a plain list of what went wrong the day
 * before (yesterday is the Nairobi day, East Africa Time, so Hafsah reads it before the team's day starts):
 *   - a check-in that opened and whose opening reached the person on no channel: no WhatsApp message for that check-in went, and no opening
 *     email went to them either;
 *   - a reminder that was tried and did not go, with the reason WhatsApp or the email service gave, unless the same message went by email;
 *   - a lead who runs a check-in with people in it, whose morning summary did not go on WhatsApp or by email (a day the lead was sent
 *     another of the morning's messages instead is not a miss: that message is the lead's one for the day);
 *   - a check-in that opened and that nobody answered.
 * For each organisation with a problem, each person's answers over the last seven days come after, in a small table.
 *
 * Nothing is written to the database and nothing is sent to a client. It is read only from the send records, the check-ins and who is in
 * them. Whether a person answered is read from whether any of their turns exists, never from what they said. Nothing is sent on a day when
 * nothing went wrong, or while no address is set (DELIVERY_ALERT_KEY in the back office, else the server setting DELIVERY_ALERT_EMAIL).
 */

export const DELIVERY_ALERT_KEY = 'delivery_alert_email';
export const DELIVERY_ALERT_ENV = 'DELIVERY_ALERT_EMAIL';
export const DELIVERY_ALERT_SENDER = 'sendTheDailyDeliveryAlert';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Lagos is one hour ahead of UTC all year. */
const LAGOS_OFFSET = HOUR;
/** Nairobi (East Africa Time) is three hours ahead of UTC all year. */
const NAIROBI_OFFSET = 3 * HOUR;

export function anEmailAddress(raw: unknown): string | null {
  const s = typeof raw === 'string' ? raw.trim() : '';
  return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(s) ? s : null;
}

/** Where the alert goes: the address saved in the back office, else the server setting, else nowhere. */
export async function theDeliveryAlertAddress(prisma: any, env: Record<string, string | undefined> = process.env): Promise<{ email: string | null; from: 'here' | 'server' | null }> {
  const row = await Promise.resolve(prisma?.platformSetting?.findUnique?.({ where: { key: DELIVERY_ALERT_KEY } })).catch(() => null);
  const saved = anEmailAddress(row?.value);
  if (saved) return { email: saved, from: 'here' };
  const server = anEmailAddress(env[DELIVERY_ALERT_ENV]);
  if (server) return { email: server, from: 'server' };
  return { email: null, from: null };
}

/** Yesterday, as a day in Nairobi, and the seven days that end with it. */
export function yesterdayInNairobi(now: Date): { from: Date; to: Date; weekFrom: Date } {
  const nairobi = new Date(now.getTime() + NAIROBI_OFFSET);
  const todayStarts = Date.UTC(nairobi.getUTCFullYear(), nairobi.getUTCMonth(), nairobi.getUTCDate()) - NAIROBI_OFFSET;
  return { from: new Date(todayStarts - DAY), to: new Date(todayStarts), weekFrom: new Date(todayStarts - 7 * DAY) };
}

/** "Monday 19 October". */
export function theDayItWas(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Nairobi' }).format(d);
}

/** What WhatsApp gave as the reason, said as the end of a sentence that starts "WhatsApp did not send it". */
export function whatWhatsAppSaid(error: string | null | undefined, kind?: string | null): string {
  const e = String(error ?? '').trim();
  if (e === OUTSIDE_THE_WINDOW) return 'because it was outside the 24-hour window and there is no approved template for this message';
  if (e === FIRST_CONTACT_NOT_APPROVED) return 'because it was the first message to this number and the first-contact template is not approved yet';
  if (e === THEY_SAID_STOP) return 'because the person had said STOP on WhatsApp';
  if (e === NOT_TURNED_ON_QUIETLY) return 'because the organisation has not turned WhatsApp on';
  if (e === NOT_TODAY) return 'because Groundwork had already written to them as often as it may that day';
  if (e === THEY_SAID_NOT_NOW) return 'because the person had replied "Not now" that day';
  if (e === THEIR_KEYS_CANNOT_BE_OPENED) return "because the organisation's own WhatsApp key cannot be opened on this server";
  if (/:held$/.test(kind ?? '')) return e ? `because it was held back, and the reason written down was "${e.replace(/[.\s]+$/, '')}"` : 'because it was held back';
  return e ? `and the reason written down was "${e.replace(/[.\s]+$/, '')}"` : 'and no reason was written down';
}

/** What became of an email that was tried and did not go, as a whole sentence. */
export function whatTheEmailSaid(row: { outcome?: string | null; because?: string | null }): string {
  const why = String(row.because ?? '').trim().replace(/[.\s]+$/, '');
  if (row.outcome === 'failed') return why ? `The email service refused the email and said "${why}".` : 'The email service refused the email.';
  if (row.outcome === 'held') return why ? `The email was held back and had not gone by this morning. The reason written down was "${why}".` : 'The email was held back and had not gone by this morning.';
  return why ? `The email was not sent. The reason written down was "${why}".` : 'The email was not sent.';
}

/** The WhatsApp reminders and nudges, and what each one is, as a person would say it. */
const WHAT_A_REMINDER_IS: Record<string, (c: string) => string> = {
  'due-tomorrow': (c) => `reminder that ${c} is due tomorrow`,
  overdue: (c) => `reminder that ${c} is late`,
  'opens-soon': (c) => `notice that ${c} opens soon`,
  'closes-soon': (c) => `warning that ${c} closes soon`,
  'closes-in-half-an-hour': (c) => `warning that ${c} closes in half an hour`,
  'team-almost-in': (c) => `reminder that most of the team has answered ${c}`,
  'your-view-matters': (c) => `reminder that their answer to ${c} is still needed`,
  'carry-on': (c) => `reminder to finish ${c}`,
  'checkin-catch-up': (c) => `second try at the opening of ${c}`,
  'anchor-follow-up': (c) => `follow-up reminder about ${c}`,
};
/** Held back by the person's own word or by the one-a-day rule: Groundwork working as it should, not a message that failed. */
const HELD_ON_PURPOSE = new Set([NOT_TODAY, THEY_SAID_NOT_NOW, THEY_SAID_STOP]);
/** The reminder emails whose failure is reported under reminders. */
const REMINDER_EMAILS = new Set([...ROUTINE_EMAILS, 'sendTimeRunningOut', BY_EMAIL_NOTICE].filter((s) => s !== 'sendTheLeadsDailyNudge'));
const OPENING_EMAILS = new Set([...THE_OPENING_EMAILS, BY_EMAIL_NOTICE]);
const SUMMARY_SENDER = 'sendTheLeadsDailyNudge';

export type ProblemKind = 'opening' | 'reminder' | 'summary' | 'nobody-answered' | 'not-sent-on-purpose';
export interface AProblem { kind: ProblemKind; sentence: string }
export interface AResponseRate { name: string; opened: number; answered: number; notAnswered: number; percent: number }
export interface AnOrganisationsDay { organizationId: string; name: string; problems: AProblem[]; rates: AResponseRate[] }
export interface WhatWentWrong { day: string; organisations: AnOrganisationsDay[] }

const lower = (s: string | null | undefined) => String(s ?? '').trim().toLowerCase();
const firstOfAName = (name: string) => name.split(/\s+/)[0] || name;
const within = (d: Date | string | null | undefined, from: Date, to: Date) => {
  if (!d) return false;
  const t = new Date(d).getTime();
  return t >= from.getTime() && t < to.getTime();
};
const listed = (names: string[]) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

/** A person's whole name, for Groundwork's own staff. Never an address in place of a name. */
export function theirWholeName(p: { nameGiven?: string | null; user?: { firstName?: string | null; lastName?: string | null } | null } | null | undefined, fallback?: string | null): string {
  const clean = (t: string | null | undefined) => { const s = String(t ?? '').trim(); return s && !s.includes('@') ? s : ''; };
  const whole = [clean(p?.user?.firstName), clean(p?.user?.lastName)].filter(Boolean).join(' ');
  return whole || clean(p?.nameGiven) || clean(fallback) || 'Someone with no name on record';
}

const openedAt = (ci: any): Date => new Date(ci.availableFrom ?? ci.createdAt);
/** Somebody this check-in is really for: not only watching, not waiting for a seat, not erased, not gone before it opened. */
const forARealPerson = (ci: any) => {
  const p = ci.participant ?? {};
  if (p.managingOnly || p.awaitingSeat || p.erasedFrom) return false;
  if (p.leftAt && new Date(p.leftAt).getTime() <= openedAt(ci).getTime()) return false;
  return true;
};

/**
 * WHAT WENT WRONG YESTERDAY, organisation by organisation. Only organisations with a problem are returned.
 */
export async function whatWentWrongYesterday(prisma: any, now: Date = new Date()): Promise<WhatWentWrong> {
  const { from, to, weekFrom } = yesterdayInNairobi(now);
  const day = theDayItWas(from);
  const orgs: { id: string; name: string }[] = await Promise.resolve(prisma.organization.findMany({ where: { isInternal: false }, select: { id: true, name: true } })).catch(() => []);
  if (!orgs.length) return { day, organisations: [] };
  const orgIds = orgs.map((o) => o.id);

  const ciSelect = {
    id: true, groundId: true, sessionNumber: true, status: true, availableFrom: true, createdAt: true, isSetup: true,
    participant: { select: { id: true, email: true, nameGiven: true, userId: true, managingOnly: true, awaitingSeat: true, erasedFrom: true, leftAt: true, user: { select: { firstName: true, lastName: true, phoneNumber: true } } } },
    ground: { select: { id: true, label: true, organizationId: true, status: true } },
  };
  const theWeek: any[] = (await Promise.resolve(prisma.checkIn.findMany({
    where: { isSetup: false, ground: { organizationId: { in: orgIds } }, OR: [{ availableFrom: { gte: weekFrom, lt: to } }, { availableFrom: null, createdAt: { gte: weekFrom, lt: to } }] },
    select: ciSelect,
  })).catch(() => [])).filter((ci: any) => !ci.isSetup && orgIds.includes(ci.ground?.organizationId) && within(openedAt(ci), weekFrom, to) && forARealPerson(ci));
  const ids = theWeek.map((c) => c.id);

  /* Whether they answered: a turn of theirs exists (Hafsah, 3 November 2026: started is their first reply). A session the clock closed
     with nothing of theirs in it is not answered. Only the check-in's id is read, never what was said. */
  const turns: { checkInId: string }[] = ids.length ? await Promise.resolve(prisma.conversationTurn.findMany({ where: { checkInId: { in: ids }, role: 'PERSON' }, select: { checkInId: true }, distinct: ['checkInId'] })).catch(() => []) : [];
  const theyAnswered = new Set(turns.map((t) => t.checkInId));
  const answered = (ci: any) => theyAnswered.has(ci.id);

  const sends: any[] = await Promise.resolve(prisma.whatsAppSend.findMany({
    where: { OR: [...(ids.length ? [{ checkInId: { in: ids } }] : []), { organizationId: { in: orgIds }, createdAt: { gte: from, lt: to } }] },
    select: { organizationId: true, phone: true, checkInId: true, kind: true, sentAt: true, failedAt: true, error: true, createdAt: true },
  })).catch(() => []);
  const mail: any[] = await Promise.resolve(prisma.notification.findMany({
    where: { channel: 'email', createdAt: { gte: new Date(from.getTime() - 7 * DAY), lte: now } },
    select: { toAddress: true, sender: true, subject: true, outcome: true, because: true, createdAt: true },
  })).catch(() => []);
  const mailTo = (emails: string[]) => { const set = new Set(emails.map(lower).filter(Boolean)); return mail.filter((m) => set.has(lower(m.toAddress))); };
  /*
   * NOT SENT ON PURPOSE (nudges that get answers, 20 October): after two missed days the same opening or reminder is not sent again
   * (never-the-same-words-twice.ts). Written down as `skipped`, on either channel, and reported as that choice, never as a message that
   * did not go out.
   */
  const skipped: any[] = (await Promise.resolve(prisma.notification.findMany({
    where: { outcome: SKIPPED, createdAt: { gte: from, lt: to } },
    select: { channel: true, toAddress: true, sender: true, outcome: true, because: true, createdAt: true },
  })).catch(() => [])).filter((m: any) => m.outcome === SKIPPED && within(m.createdAt, from, to));
  const skippedFor = (email: string | null | undefined) => skipped.filter((m) => lower(m.toAddress) === lower(email));
  const toldAboutTheSkip = new Set<any>();

  const people: any[] = await Promise.resolve(prisma.person?.findMany?.({ where: { organizationId: { in: orgIds } }, select: { organizationId: true, email: true, phone: true, displayName: true } }) ?? []).catch(() => []);
  const leave = await leaveOfThePeopleOn(prisma, [...new Set(theWeek.map((c) => c.groundId))]).catch(() => new Map());

  const report = new Map<string, AnOrganisationsDay>();
  const forOrg = (id: string): AnOrganisationsDay => {
    let r = report.get(id);
    if (!r) { r = { organizationId: id, name: orgs.find((o) => o.id === id)?.name ?? 'An organisation with no name', problems: [], rates: [] }; report.set(id, r); }
    return r;
  };

  /* 1. OPENINGS THAT REACHED NOBODY. */
  const yesterdays = theWeek.filter((ci) => within(openedAt(ci), from, to) && !A_GROUND_NO_MESSAGE_IS_ABOUT.includes(ci.ground?.status));
  const onLeave = (ci: any) => !!awayUntilOn(leave.get(ci.participant?.id), openedAt(ci));
  for (const ci of yesterdays) {
    if (answered(ci) || onLeave(ci)) continue;
    /* The lead's own nudge is not the opening: it never counts as the opening having reached them (the-leads-own-nudge.ts). */
    const mine = sends.filter((s) => s.checkInId === ci.id && !String(s.kind ?? '').startsWith(NUDGE_KIND));
    if (mine.some((s) => s.sentAt)) continue;
    const since = openedAt(ci).getTime() - DAY;
    const emails = mailTo([ci.participant?.email]).filter((m) => OPENING_EMAILS.has(m.sender) && new Date(m.createdAt).getTime() >= since);
    if (emails.some((m) => m.outcome === 'sent')) continue;
    const name = theirWholeName(ci.participant);
    const onPurpose = skippedFor(ci.participant?.email).find((m) => /^(?:checkin-open|checkin-catch-up|sendSessionReady)(?::|$)/.test(m.sender ?? ''));
    if (onPurpose) {
      toldAboutTheSkip.add(onPurpose);
      forOrg(ci.ground.organizationId).problems.push({ kind: 'not-sent-on-purpose', sentence: `Groundwork did not send ${name}'s opening for ${ci.ground.label} on ${theDayItWas(openedAt(ci))}, on purpose. ${firstOfAName(name)} had not checked in for 2 days or more, and it would have said the same words as the last message ${firstOfAName(name)} was sent.` });
      continue;
    }
    const triedOnWhatsApp = mine.filter((s) => /^(checkin-open|checkin-catch-up)(?::|$)/.test(s.kind ?? '') && !s.sentAt);
    const whatsapp = triedOnWhatsApp.length ? ` WhatsApp did not send it ${whatWhatsAppSaid(triedOnWhatsApp[triedOnWhatsApp.length - 1].error, triedOnWhatsApp[triedOnWhatsApp.length - 1].kind)}.` : ' Nothing was tried on WhatsApp.';
    const tried = emails.filter((m) => m.outcome !== 'sent').pop();
    const email = tried ? ` ${whatTheEmailSaid(tried)}` : triedOnWhatsApp.length ? ' No email went instead.' : ' No email was sent either.';
    forOrg(ci.ground.organizationId).problems.push({ kind: 'opening', sentence: `${name}'s opening for ${ci.ground.label} did not go out on ${theDayItWas(openedAt(ci))}.${whatsapp}${email}` });
  }

  /* 2. REMINDERS THAT WERE TRIED AND DID NOT GO. */
  const reminderSends = sends.filter((s) => !s.sentAt && within(s.createdAt, from, to) && WHAT_A_REMINDER_IS[(s.kind ?? '').split(':')[0]] && !HELD_ON_PURPOSE.has(String(s.error ?? '').trim()));
  const otherCheckInIds = [...new Set(reminderSends.map((s) => s.checkInId).filter((id) => id && !ids.includes(id)))];
  const others: any[] = otherCheckInIds.length ? await Promise.resolve(prisma.checkIn.findMany({ where: { id: { in: otherCheckInIds } }, select: ciSelect })).catch(() => []) : [];
  const checkInById = new Map<string, any>([...theWeek, ...others].map((c) => [c.id, c]));
  const seen = new Set<string>();
  for (const s of reminderSends) {
    const base = (s.kind ?? '').split(':')[0];
    const key = `${s.phone}|${base}|${s.checkInId ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const ci = s.checkInId ? checkInById.get(s.checkInId) : null;
    const forms = formsOfTheSameNumber(s.phone ?? '');
    const person = people.find((p) => p.organizationId === s.organizationId && p.phone && formsOfTheSameNumber(p.phone).some((f) => forms.includes(f)));
    const theirEmails = [ci?.participant?.email, person?.email].filter(Boolean) as string[];
    const byEmail = mailTo(theirEmails).some((m) => m.outcome === 'sent' && (m.sender === BY_EMAIL_NOTICE || m.sender === BY_EMAIL_ROUTINE) && new Date(m.createdAt).getTime() >= new Date(s.createdAt).getTime() - 60_000);
    if (byEmail) continue;
    const name = ci ? theirWholeName(ci.participant, person?.displayName) : theirWholeName(null, person?.displayName);
    const what = WHAT_A_REMINDER_IS[base](ci?.ground?.label ? `the check-in for ${ci.ground.label}` : 'their check-in');
    const org = s.organizationId ?? ci?.ground?.organizationId;
    if (!org || !orgIds.includes(org)) continue;
    forOrg(org).problems.push({ kind: 'reminder', sentence: `${name}'s ${what} did not go out on ${theDayItWas(new Date(s.createdAt))}. WhatsApp did not send it ${whatWhatsAppSaid(s.error, s.kind)}. No email went instead.` });
  }
  /* Reminder emails the email service refused, to somebody in the organisation. */
  const addressesOf = new Map<string, Set<string>>();
  const addTo = (org: string, email: string | null | undefined, name: string) => {
    if (!org || !lower(email)) return;
    if (!addressesOf.has(org)) addressesOf.set(org, new Set());
    addressesOf.get(org)!.add(`${lower(email)}|${name}`);
  };
  for (const ci of theWeek) addTo(ci.ground.organizationId, ci.participant?.email, theirWholeName(ci.participant));
  for (const p of people) addTo(p.organizationId, p.email, theirWholeName(null, p.displayName));
  for (const m of mail) {
    if (m.outcome !== 'failed' || !REMINDER_EMAILS.has(m.sender) || !within(m.createdAt, from, to)) continue;
    for (const [org, set] of addressesOf) {
      const hit = [...set].find((e) => e.startsWith(`${lower(m.toAddress)}|`));
      if (!hit) continue;
      const name = hit.split('|')[1];
      const subject = String(m.subject ?? '').trim();
      forOrg(org).problems.push({ kind: 'reminder', sentence: `${name}'s email${subject ? ` "${subject}"` : ''} did not go out on ${theDayItWas(new Date(m.createdAt))}. ${whatTheEmailSaid(m)}` });
    }
  }

  /* Every other message not sent on purpose: a reminder after two missed days, said as that choice. */
  for (const m of skipped) {
    if (toldAboutTheSkip.has(m)) continue;
    for (const [org, set] of addressesOf) {
      const hit = [...set].find((e) => e.startsWith(`${lower(m.toAddress)}|`));
      if (!hit) continue;
      const name = hit.split('|')[1];
      const base = String(m.sender ?? '').split(':')[0];
      const what = WHAT_A_REMINDER_IS[base] ? WHAT_A_REMINDER_IS[base]('their check-in') : base === 'sendSessionReady' || base === 'checkin-open' ? 'opening' : 'reminder email';
      forOrg(org).problems.push({ kind: 'not-sent-on-purpose', sentence: `Groundwork did not send ${name}'s ${what} on ${theDayItWas(new Date(m.createdAt))}, on purpose. ${firstOfAName(name)} had not checked in for 2 days or more, and it would have said the same words as the last message ${firstOfAName(name)} was sent.` });
      break;
    }
  }

  /* 3. THE LEAD'S MORNING SUMMARY. The summary goes at nine in Lagos; a check-in started after that had no summary to miss. */
  const summaryAt = new Date(from.getTime() + NAIROBI_OFFSET + 9 * HOUR - LAGOS_OFFSET);
  const grounds: any[] = await Promise.resolve(prisma.ground.findMany({
    where: { organizationId: { in: orgIds }, status: { notIn: A_GROUND_NO_MESSAGE_IS_ABOUT }, createdAt: { lt: summaryAt } },
    select: { id: true, label: true, organizationId: true, initiatorId: true, workingDays: true, status: true, createdAt: true,
      initiator: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, deletedAt: true, isActive: true } },
      participants: { select: { partyType: true, leftAt: true, erasedFrom: true, managingOnly: true } } },
  })).catch(() => []);
  const leads = new Map<string, { organizationId: string; user: any; grounds: any[] }>();
  for (const g of grounds) {
    if (!orgIds.includes(g.organizationId) || A_GROUND_NO_MESSAGE_IS_ABOUT.includes(g.status)) continue;
    if (g.createdAt && new Date(g.createdAt).getTime() >= summaryAt.getTime()) continue;
    const withPeople = (g.participants ?? []).some((p: any) => p.partyType === 'PARTICIPANT' && !p.leftAt && !p.erasedFrom && !p.managingOnly);
    if (!withPeople || !g.initiator) continue;
    const key = `${g.organizationId}|${g.initiatorId}`;
    if (!leads.has(key)) leads.set(key, { organizationId: g.organizationId, user: g.initiator, grounds: [] });
    leads.get(key)!.grounds.push(g);
  }
  for (const lead of leads.values()) {
    const u = lead.user;
    if (u.deletedAt || u.isActive === false) continue;
    /* Only on a day one of their check-ins works, where their organisation is (one calendar for each check-in, 29 October). */
    const zoneHere = await theOrganisationsZone(prisma, lead.organizationId).catch(() => null);
    if (!lead.grounds.some((g) => isAWorkingDay(summaryAt, g.workingDays, zoneHere))) continue;
    const away = await theirApprovedLeave(prisma, u.id, lead.organizationId).catch(() => []);
    if (away.some((s: any) => summaryAt >= s.from && summaryAt <= s.to)) continue;
    const phones = new Set<string>([
      ...formsOfTheSameNumber(u.phoneNumber ?? ''),
      ...people.filter((p) => p.organizationId === lead.organizationId && lower(p.email) === lower(u.email) && p.phone).flatMap((p) => formsOfTheSameNumber(p.phone)),
    ]);
    const toThem = sends.filter((s) => phones.has(s.phone) && within(s.createdAt, from, to));
    const theirMail = mailTo([u.email]).filter((m) => within(m.createdAt, from, to));
    const went = toThem.some((s) => s.sentAt && (/^lead-summary(?::|$)/.test(s.kind ?? '') || aRoutineWhatsApp(s.kind)))
      || theirMail.some((m) => m.outcome === 'sent' && (m.sender === SUMMARY_SENDER || ROUTINE_EMAILS.has(m.sender)));
    if (went) continue;
    const name = theirWholeName({ user: u });
    const failed = toThem.filter((s) => /^lead-summary(?::|$)/.test(s.kind ?? '') && !s.sentAt).pop();
    const emailTried = theirMail.filter((m) => m.sender === SUMMARY_SENDER && m.outcome !== 'sent').pop();
    let why: string;
    if (failed) why = ` WhatsApp did not send it ${whatWhatsAppSaid(failed.error, failed.kind)}.${emailTried ? ` ${whatTheEmailSaid(emailTried)}` : ' No email went instead.'}`;
    else if (emailTried) why = ` ${whatTheEmailSaid(emailTried)}`;
    else why = ' Groundwork did not try to send it, so either it found nothing to tell them or the morning job did not run.';
    const which = listed(lead.grounds.map((g) => g.label));
    forOrg(lead.organizationId).problems.push({ kind: 'summary', sentence: `${name}'s morning summary for ${which} did not go out on ${theDayItWas(summaryAt)}.${why}` });
  }

  /* 4. A CHECK-IN THAT OPENED AND THAT NOBODY ANSWERED. Grouped by check-in and the day it opened. */
  const rounds = new Map<string, any[]>();
  for (const ci of yesterdays) {
    if (onLeave(ci)) continue;
    const key = `${ci.groundId}|${theDayItWas(openedAt(ci))}`;
    if (!rounds.has(key)) rounds.set(key, []);
    rounds.get(key)!.push(ci);
  }
  for (const cis of rounds.values()) {
    if (cis.some(answered)) continue;
    const g = cis[0].ground;
    const names = [...new Set(cis.map((c) => theirWholeName(c.participant)))];
    const who = names.length <= 3 ? listed(names) : `${names.length} people`;
    forOrg(g.organizationId).problems.push({ kind: 'nobody-answered', sentence: `Nobody answered the check-in for ${g.label} that opened on ${theDayItWas(openedAt(cis[0]))}. It went to ${who}.` });
  }

  /* 5. EACH PERSON'S ANSWERS OVER THE LAST SEVEN DAYS, for the organisations with a problem. */
  for (const r of report.values()) {
    const byPerson = new Map<string, { name: string; opened: number; answered: number }>();
    for (const ci of theWeek) {
      if (ci.ground.organizationId !== r.organizationId) continue;
      const key = lower(ci.participant?.email) || ci.participant?.id;
      const row = byPerson.get(key) ?? { name: theirWholeName(ci.participant), opened: 0, answered: 0 };
      row.opened += 1;
      if (answered(ci)) row.answered += 1;
      byPerson.set(key, row);
    }
    r.rates = [...byPerson.values()]
      .map((p) => ({ ...p, notAnswered: p.opened - p.answered, percent: Math.round((100 * p.answered) / p.opened) }))
      .sort((a, b) => a.percent - b.percent || a.name.localeCompare(b.name));
  }

  const order: ProblemKind[] = ['opening', 'reminder', 'summary', 'nobody-answered', 'not-sent-on-purpose'];
  const organisations = [...report.values()]
    .filter((r) => r.problems.length)
    .map((r) => ({ ...r, problems: [...r.problems].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind)) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { day, organisations };
}

const HEADINGS: Record<ProblemKind, string> = {
  opening: 'Openings that did not go out',
  reminder: 'Reminders that did not go out',
  summary: 'Morning summaries that did not go out',
  'nobody-answered': 'Check-ins nobody answered',
  'not-sent-on-purpose': 'Messages not sent on purpose',
};

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** One person's week, as a sentence. */
export function theirWeek(r: AResponseRate): string {
  const sent = `${r.name} was sent ${r.opened} ${r.opened === 1 ? 'check-in' : 'check-ins'}`;
  if (r.notAnswered === 0) return r.opened === 1 ? `${sent} and answered it.` : `${sent} and answered all of them.`;
  if (r.answered === 0) return r.opened === 1 ? `${sent} and did not answer it.` : `${sent} and answered none of them.`;
  return `${sent} and answered ${r.answered}, so ${r.notAnswered} ${r.notAnswered === 1 ? 'was' : 'were'} not answered (${r.percent} percent answered).`;
}

/** The email, as subject, plain text and HTML. Null when nothing went wrong. */
export function theAlertEmail(found: WhatWentWrong): { subject: string; text: string; html: string } | null {
  if (!found.organisations.length) return null;
  const delivery = found.organisations.filter((o) => o.problems.some((p) => p.kind !== 'nobody-answered' && p.kind !== 'not-sent-on-purpose')).length;
  const unanswered = found.organisations.filter((o) => o.problems.some((p) => p.kind === 'nobody-answered')).length;
  const n = delivery || unanswered || found.organisations.length;
  const clients = `${n} ${n === 1 ? 'client' : 'clients'}`;
  const subject = delivery
    ? `Groundwork: ${clients} had messages that did not go out yesterday`
    : unanswered
      ? `Groundwork: ${clients} had a check-in nobody answered yesterday`
      : `Groundwork: ${clients} had messages not sent on purpose yesterday`;
  const opening = `This is what went wrong yesterday, ${found.day}, for Groundwork's clients. Only the organisations with a problem are listed.`;
  const closing = 'This email goes to the delivery alert address set in the back office, under Admin and then System. It is sent only on a day when something went wrong.';
  const text: string[] = [opening, ''];
  const html: string[] = [`<p>${esc(opening)}</p>`];
  for (const o of found.organisations) {
    text.push(o.name, '');
    html.push(`<h2 style="font-size:17px;margin:24px 0 8px">${esc(o.name)}</h2>`);
    for (const kind of Object.keys(HEADINGS) as ProblemKind[]) {
      const lines = o.problems.filter((p) => p.kind === kind);
      if (!lines.length) continue;
      text.push(HEADINGS[kind], ...lines.map((l) => `- ${l.sentence}`), '');
      html.push(`<h3 style="font-size:14px;margin:16px 0 6px">${esc(HEADINGS[kind])}</h3><ul style="margin:0;padding-left:20px">${lines.map((l) => `<li style="margin:0 0 6px">${esc(l.sentence)}</li>`).join('')}</ul>`);
    }
    if (o.rates.length) {
      const heading = `How each person at ${o.name} answered in the last 7 days`;
      text.push(heading, ...o.rates.map((r) => `- ${theirWeek(r)}`), '');
      const th = 'text-align:left;padding:4px 10px 4px 0;border-bottom:1px solid #EDE5D6;font-size:13px';
      const td = 'padding:4px 10px 4px 0;border-bottom:1px solid #F7F1E5;font-size:13px';
      html.push(
        `<h3 style="font-size:14px;margin:16px 0 6px">${esc(heading)}</h3>`
        + `<table style="border-collapse:collapse"><thead><tr><th style="${th}">Person</th><th style="${th}">Opened</th><th style="${th}">Answered</th><th style="${th}">Not answered</th><th style="${th}">Answered (percent)</th></tr></thead><tbody>`
        + o.rates.map((r) => `<tr><td style="${td}">${esc(r.name)}</td><td style="${td}">${r.opened}</td><td style="${td}">${r.answered}</td><td style="${td}">${r.notAnswered}</td><td style="${td}">${r.percent}</td></tr>`).join('')
        + '</tbody></table>',
      );
    }
  }
  text.push(closing);
  html.push(`<p style="margin-top:24px;color:#4E4236">${esc(closing)}</p>`);
  return { subject, text: text.join('\n'), html: html.join('') };
}

export interface TheAlertDoors {
  prisma: any;
  email: { sendTheDailyDeliveryAlert(to: string, subject: string, html: string, text: string): Promise<{ sent: boolean }> };
  env?: Record<string, string | undefined>;
}

/** Reads yesterday, and sends the email only when there is an address and something went wrong. */
export async function sendTheDailyDeliveryAlert(doors: TheAlertDoors, now: Date = new Date()): Promise<{ sent: boolean; to: string | null; organisations: number; why?: string }> {
  const { email: to } = await theDeliveryAlertAddress(doors.prisma, doors.env ?? process.env);
  if (!to) return { sent: false, to: null, organisations: 0, why: 'No delivery alert address is set.' };
  const found = await whatWentWrongYesterday(doors.prisma, now);
  const mail = theAlertEmail(found);
  if (!mail) return { sent: false, to, organisations: 0, why: 'Nothing went wrong yesterday.' };
  const result = await doors.email.sendTheDailyDeliveryAlert(to, mail.subject, mail.html, mail.text);
  return { sent: !!result?.sent, to, organisations: found.organisations.length };
}
