import { KINDS_THAT_ARE_NOT_WORK } from '../board/the-kind-of-work';
import type { PrismaService } from '../prisma/prisma.service';
import { hoursAsRead } from './hours-said-in-chat';
import { lagosDay, lagosMonday, type TimeRules } from './the-time-sheet-rules';

/**
 * A WEEK OF HOURS DRAFTED FROM THE RECORD (decision 85, item 3; build step 11).
 *
 * Groundwork reads what is already on the person's own record this week, and only theirs:
 *   - the check-in sessions they took part in;
 *   - the commitments they kept;
 *   - the work-plan items and the Subject items (objectives and the like) they own that changed.
 * Each one is matched to a client or project on the time sheets list when its words name exactly one.
 * Nothing on the record says how long anything took, so the hours come from the organisation's own
 * rule, the hours asked a week: each working day gets its share, divided equally between what the
 * record shows that day, and the person is told exactly that. With no such rule there is no draft of
 * hours, only what was found. Days the person already gave hours for are left as they are.
 *
 * ONLY THE PERSON CONFIRMS IT. The draft is said back in Ask Groundwork and parked; nothing is kept as
 * hours, and nothing goes to the approver, without the person's yes. They can change any line first.
 *
 * HOURS ARE FOR BILLING ONLY (decision 10). The draft reads the record into the time sheet, never the
 * other way: nothing here is written to a check-in, a report, a pattern or a review, and nothing here
 * says anything about how much or how well the person works. A test keeps this file out of every
 * module but the suites and Ask Groundwork. The manager's "hours against what was delivered" is not
 * built: it waits for Hafsah, against decision 10.
 */
export const HOURS_WEEK_DRAFT_KIND = 'hours_week_draft';

export interface AFoundItem {
  day: string;
  /** In a full sentence's middle: `your check-in "Naivas Ngong Road"`. */
  what: string;
  /** The client or project on the list its words name, or null when none or more than one. */
  client: string | null;
}

export interface ADraftEntry { client: string; onDay: string; hours: number }

export interface AWeekDrafted {
  weekOf: string;
  found: AFoundItem[];
  entries: ADraftEntry[];
  /** Days the person already gave hours for, left as they are. */
  alreadyGiven: string[];
  /** The hours a working day, from the rules, or null when no hours are asked a week. */
  hoursADay: number | null;
  hoursAWeek: number | null;
}

const words = (s: string) => ` ${(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `;

/** The one client or project these words name, by its whole name. Null for none, or for more than one. */
export function theClientNamedIn(texts: (string | null | undefined)[], clients: string[]): string | null {
  for (const t of texts) {
    if (!t) continue;
    const w = words(t);
    const named = clients.filter((c) => { const k = words(c).trim(); return !!k && w.includes(` ${k} `); });
    if (named.length === 1) return named[0];
    if (named.length > 1) return null;
  }
  return null;
}

/**
 * What the person's own record holds this week, from Monday in Lagos to now. Read only for this
 * person: their own check-in sessions, their own kept commitments, and the items they own.
 */
export async function readTheWeeksRecord(
  prisma: PrismaService,
  input: { organizationId: string; userId: string; externalId: string | null; clients: string[]; now: Date },
): Promise<AFoundItem[]> {
  const p = prisma as any;
  const monday = lagosMonday(input.now);
  const from = new Date(`${monday}T00:00:00.000+01:00`);
  const range = { gte: from, lt: input.now };
  const out: AFoundItem[] = [];
  const add = (at: Date | null | undefined, what: string, texts: (string | null | undefined)[]) => {
    if (!at) return;
    out.push({ day: lagosDay(new Date(at)), what, client: theClientNamedIn(texts, input.clients) });
  };

  const sessions: any[] = await p.checkIn?.findMany?.({
    where: { participant: { userId: input.userId }, ground: { organizationId: input.organizationId }, isSetup: false, OR: [{ startedAt: range }, { completedAt: range }] },
    select: { startedAt: true, completedAt: true, ground: { select: { label: true } } },
  }).catch(() => []) ?? [];
  for (const s of sessions) add(s.completedAt ?? s.startedAt, `your check-in "${s.ground?.label ?? 'a check-in'}"`, [s.ground?.label]);

  if (input.externalId) {
    const kept: any[] = await p.commitment?.findMany?.({
      where: { organizationId: input.organizationId, personExternalId: input.externalId, state: 'KEPT', resolvedAt: range },
      select: { text: true, resolvedAt: true, subjectExternalId: true },
    }).catch(() => []) ?? [];
    const subjectIds = [...new Set(kept.map((c) => c.subjectExternalId).filter(Boolean))];
    const titles: any[] = subjectIds.length
      ? await p.subject?.findMany?.({ where: { organizationId: input.organizationId, externalId: { in: subjectIds } }, select: { externalId: true, title: true } }).catch(() => []) ?? []
      : [];
    const titleOf = new Map(titles.map((t) => [t.externalId, t.title]));
    for (const c of kept) add(c.resolvedAt, `the commitment you kept, "${c.text}"`, [c.text, titleOf.get(c.subjectExternalId)]);

    const owned: any[] = await p.subject?.findMany?.({
      where: { organizationId: input.organizationId, ownerExternalId: input.externalId, sourceDeletedAt: null, updatedAt: range },
      select: { title: true, updatedAt: true },
    }).catch(() => []) ?? [];
    for (const s of owned) add(s.updatedAt, `"${s.title}", which you own`, [s.title]);
  }

  const mine: any[] = await p.groundParticipant?.findMany?.({
    where: { userId: input.userId, ground: { organizationId: input.organizationId } },
    select: { id: true },
  }).catch(() => []) ?? [];
  if (mine.length) {
    const items: any[] = await p.workItem?.findMany?.({
      /* Never an idea or an offer: they are not work anybody owns (KINDS_THAT_ARE_NOT_WORK). */
      where: { ownerParticipantId: { in: mine.map((m) => m.id) }, updatedAt: range, kind: { notIn: KINDS_THAT_ARE_NOT_WORK } },
      select: { name: true, updatedAt: true, kind: true, ground: { select: { label: true } } },
    }).catch(() => []) ?? [];
    for (const w of items) if (!KINDS_THAT_ARE_NOT_WORK.includes(w.kind)) add(w.updatedAt, `the work you own, "${w.name}"`, [w.name, w.ground?.label]);
  }
  return out.sort((a, b) => a.day.localeCompare(b.day));
}

/**
 * The draft: each day the record shows and the person has not given hours for, its share of the
 * hours asked a week (a fifth), divided equally between the clients or projects found that day, in
 * quarter hours. No hours asked a week: no entries, only what was found.
 */
export function draftTheWeek(found: AFoundItem[], rules: TimeRules, alreadyGivenDays: Set<string>, weekOf: string): AWeekDrafted {
  const hoursAWeek = rules.hoursAWeek ?? null;
  const hoursADay = hoursAWeek ? hoursAWeek / 5 : null;
  const entries: ADraftEntry[] = [];
  const days = [...new Set(found.map((f) => f.day))].sort();
  const alreadyGiven = days.filter((d) => alreadyGivenDays.has(d));
  if (hoursADay) {
    for (const day of days) {
      if (alreadyGivenDays.has(day)) continue;
      const clients = [...new Set(found.filter((f) => f.day === day && f.client).map((f) => f.client!))];
      if (!clients.length) continue;
      const share = Math.floor((hoursADay / clients.length) * 4) / 4;
      clients.forEach((client, i) => {
        const hours = i === clients.length - 1 ? hoursADay - share * (clients.length - 1) : share;
        if (hours >= 0.25) entries.push({ client, onDay: day, hours });
      });
    }
  }
  return { weekOf, found, entries, alreadyGiven, hoursADay, hoursAWeek };
}

// ------------------------------------------------ in words ------------------------------------------------

const WEEKDAY = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const aDayInWords = (day: string) =>
  `${WEEKDAY[(new Date(`${day}T00:00:00.000Z`).getUTCDay() + 6) % 7]} ${Number(day.slice(8, 10))} ${MONTH[Number(day.slice(5, 7)) - 1]}`;
const listed = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** "On Monday 5 October, you took part in your check-in "Naivas Ngong Road", and ..." for each day. */
function whatWasFound(found: AFoundItem[]): string[] {
  const out: string[] = [];
  for (const day of [...new Set(found.map((f) => f.day))].sort()) {
    const items = found.filter((f) => f.day === day).map((f) => f.what);
    out.push(`On ${aDayInWords(day)}, the record shows ${listed([...new Set(items)])}.`);
  }
  return out;
}

/** "I put 4 hours on Naivas and 4 hours on Lakeside for Tuesday 6 October." for each day of the draft. */
export function theDraftLines(entries: ADraftEntry[]): string[] {
  const out: string[] = [];
  for (const day of [...new Set(entries.map((e) => e.onDay))].sort()) {
    const parts = entries.filter((e) => e.onDay === day).map((e) => `${hoursAsRead(e.hours)} on ${e.client}`);
    out.push(`I put ${listed(parts)} for ${aDayInWords(day)}.`);
  }
  return out;
}

export const DRAFT_NOTHING_FOUND = 'I could not find anything on your record for this week to draft your hours from. Tell me your hours instead, for example "I spent 3 hours on a client today", and I will say them back before anything is sent.';

/**
 * The draft said back to the person, before their yes. With nothing to put in hours, it says what was
 * found and asks for the hours instead, and nothing is parked.
 */
export function theDraftSaidBack(d: AWeekDrafted, approverFirstName: string | null): { say: string; canSend: boolean } {
  if (!d.found.length) return { say: DRAFT_NOTHING_FOUND, canSend: false };
  const found = whatWasFound(d.found);
  const notPlaced = d.found.filter((f) => !f.client && !d.alreadyGiven.includes(f.day));
  const askInstead = 'Tell me the hours instead, for example "I spent 3 hours on a client on Monday", and I will say them back before anything is sent.';
  if (!d.entries.length) {
    const why = d.alreadyGiven.length && d.alreadyGiven.length === new Set(d.found.map((f) => f.day)).size
      ? 'You have already given hours for each of those days, so there is nothing more to draft.'
      : !d.hoursADay
        ? 'I cannot draft the hours. The record does not say how long anything took, and your organisation has not set the hours asked a week.'
        : 'I could not tell which client or project any of it was for, so I cannot draft the hours.';
    return { say: [`I found this on your record for this week, but not enough to draft your hours.`, ...found, why, askInstead].join('\n'), canSend: false };
  }
  const lines: string[] = ['I have enough to draft this week\'s hours. Here is what I found.', ...found, 'This is the draft.', ...theDraftLines(d.entries)];
  lines.push(`I gave each day ${hoursAsRead(d.hoursADay!)}, from the ${hoursAsRead(d.hoursAWeek!)} a week your organisation asks for, shared equally between the clients and projects the record shows that day. The record does not say how long anything took, so please check each line.`);
  if (d.alreadyGiven.length) lines.push(`You have already given hours for ${listed(d.alreadyGiven.map(aDayInWords))}, so I left ${d.alreadyGiven.length === 1 ? 'that day' : 'those days'} as ${d.alreadyGiven.length === 1 ? 'it is' : 'they are'}.`);
  if (notPlaced.length === 1) lines.push(`I could not tell which client or project ${notPlaced[0].what} on ${aDayInWords(notPlaced[0].day)} was for, so it is not in the draft.`);
  else if (notPlaced.length) lines.push(`I could not tell which client or project these were for, so they are not in the draft. They are ${listed(notPlaced.map((f) => `${f.what} on ${aDayInWords(f.day)}`))}.`);
  lines.push(`Change anything that is wrong before you send it. You can tell me, for example "6 hours on ${d.entries[0].client} on ${WEEKDAY[(new Date(`${d.entries[0].onDay}T00:00:00.000Z`).getUTCDay() + 6) % 7]}", or "remove ${d.entries[0].client} on ${WEEKDAY[(new Date(`${d.entries[0].onDay}T00:00:00.000Z`).getUTCDay() + 6) % 7]}".`);
  lines.push(`Shall I log these hours and send them to ${approverFirstName ?? 'an admin'} to approve?`);
  return { say: lines.join('\n'), canSend: true };
}

/** The draft said again after a change, before the yes. */
export function theDraftChanged(entries: ADraftEntry[], approverFirstName: string | null): string {
  if (!entries.length) return 'The draft is empty now, so there is nothing to send. Nothing was kept.';
  return ['I have changed the draft. This is it now.', ...theDraftLines(entries), `Shall I log these hours and send them to ${approverFirstName ?? 'an admin'} to approve?`].join('\n');
}

export function theDraftSent(entries: ADraftEntry[], approverFirstName: string | null): string {
  const total = entries.reduce((n, e) => n + e.hours, 0);
  return `I have logged ${hoursAsRead(total)} for this week and sent them to ${approverFirstName ?? 'an admin'} to approve. They are not approved until ${approverFirstName ?? 'an admin'} decides, and you will see them under your hours.`;
}

export const DRAFT_NOT_SENT = 'I have not sent the draft. Nothing was kept.';
export const DRAFT_CHANGE_NOT_READ = 'I could not tell which line to change. Tell me the hours, the client or project and the day, for example "6 hours on Naivas on Monday", or "remove Naivas on Monday". Or say yes to send the draft as it is, or no to leave it.';

/** "draft my hours", "fill in my time sheet for this week": the person asking for the draft. */
export function asksToDraftMyWeek(message: string): boolean {
  return /\b(draft|fill (?:in|out)|prepare|put together|write up|do)\b[^.?!]*\b(hours|time ?sheet)\b/i.test(message ?? '')
    && !/\b(?:i|we)\s+(?:did|spent|worked|logged)\b/i.test(message ?? '');
}

/** "remove Naivas on Monday": the client and the day to take out of the draft, or null. */
export function aLineRemoved(message: string, entries: ADraftEntry[]): { client: string; onDay: string } | null {
  if (!/\b(remove|take (?:off|out)|drop|delete|no hours)\b/i.test(message ?? '')) return null;
  const clients = [...new Set(entries.map((e) => e.client))];
  const client = theClientNamedIn([message], clients);
  if (!client) return null;
  const t = (message ?? '').toLowerCase();
  const days = [...new Set(entries.filter((e) => e.client === client).map((e) => e.onDay))];
  const named = days.filter((d) => t.includes(WEEKDAY[(new Date(`${d}T00:00:00.000Z`).getUTCDay() + 6) % 7].toLowerCase()));
  if (named.length === 1) return { client, onDay: named[0] };
  return days.length === 1 && !WEEKDAY.some((w) => t.includes(w.toLowerCase())) ? { client, onDay: days[0] } : null;
}

