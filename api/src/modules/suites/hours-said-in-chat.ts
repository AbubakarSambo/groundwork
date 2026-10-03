import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';

/**
 * HOURS SAID IN CHAT GO TO THE TIME SHEETS SUITE, FOR BILLING ONLY (week 21, request 22, decision 10).
 *
 * "I did 6 hours on Atlas today" is read by rules, never by a model, because a day or a project nobody
 * named is the worst way to be wrong here. It is said back with the real date and the project, and it
 * is written and sent to the approver only after a yes. Nothing about it is a check-in's record, a
 * report, a pattern or a remark on how well or how much anybody works: the say-back repeats the hours
 * the person gave and says nothing about them. Whatever cannot be read for certain is asked again.
 */

export const HOURS_SUITE_OFF = 'Time sheets are not switched on in your organisation, so I have not sent or kept these hours. An admin can switch them on under Suites.';
export const HOURS_NOT_SENT = 'I have not sent it. Nothing was kept.';
export const HOURS_NOTHING_WAITING = 'There are no hours waiting to be sent. Tell me the hours again and I will ask.';

export interface HoursEntry { client: string; hours: number }
export interface HoursSaid {
  onDay: string;
  entries: HoursEntry[];
  /** Billable or not, as the person said of these hours, only when the time sheet rules say what is billable (build step 11). */
  billable?: boolean;
}

export type HoursRead =
  | { kind: 'none' }
  | { kind: 'ask'; say: string }
  | { kind: 'ok'; said: HoursSaid };

const DAY_MS = 86_400_000;
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTH_RE = `(${MONTHS.join('|')}|${MONTHS.map((m) => m.slice(0, 3)).join('|')})`;
const WEEKDAY_RE = `(${WEEKDAYS.join('|')})`;

const HOURS_UNIT = '(?:hours?|hrs?|h)';
/* "6 hours", "1.5 hours", "6 hours 30 minutes", "half an hour", "an hour". */
const AMOUNT = new RegExp(
  `\\b(?:(\\d+(?:[.,]\\d+)?)\\s*${HOURS_UNIT}(?:\\s*(?:and\\s*)?(\\d{1,2})\\s*(?:minutes?|mins?))?\\b|(half an hour)|(an hour)|(\\d{1,3})\\s*(?:minutes?|mins?)\\b)`,
  'gi',
);
/*
 * How hours are said, in the ways people say them (found in the 4 October review): "I did", "I've put in",
 * "I just worked", "Spent 2 hours on Lakeside this morning" with no "I", "Log", "Add" and "Enter".
 */
const SAYS_HOURS = /\b(?:i|we)(?:['’]ve|\s+have)?\s+(?:(?:just|also|then|already)\s+)?(?:did|done|worked|spent|put in|logged|clocked)\b|^\s*(?:spent|worked|did|done|logged|clocked|put in)\s+(?:\d|half an hour|an hour)|\b(?:log|record|put down|add|enter)\s+(?:\d|half an hour|an hour)/i;

export function soundsLikeHours(message: string): boolean {
  const t = message ?? '';
  const hasAmount = new RegExp(AMOUNT.source, 'i').test(t);
  return hasAmount && SAYS_HOURS.test(t);
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const midnight = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const monthNo = (m: string) => MONTHS.findIndex((x) => x === m || x.slice(0, 3) === m.slice(0, 3));
const longDay = (d: string) => whenItWas(new Date(`${d}T00:00:00.000Z`), 'weekdayAndDay', 'UTC');

/** "6 hours", "1 hour", "6 hours 30 minutes", "45 minutes". */
export function hoursAsRead(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const hp = `${h} ${h === 1 ? 'hour' : 'hours'}`;
  const mp = `${m} ${m === 1 ? 'minute' : 'minutes'}`;
  return h && m ? `${hp} ${mp}` : h ? hp : mp;
}

/** The day the hours were on: said by name, never guessed. `null` when none was said, `'many'` when more than one was. */
function readTheDay(t: string, today: Date): string | null | 'many' {
  const days = new Set<string>();
  const now = midnight(today);
  if (/\btoday\b|\bthis (?:morning|afternoon|evening)\b|\bjust now\b|\bearlier\b/.test(t)) days.add(iso(now));
  if (/\byesterday\b/.test(t)) days.add(iso(new Date(now.getTime() - DAY_MS)));
  for (const m of t.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) days.add(`${m[1]}-${m[2]}-${m[3]}`);
  for (const m of t.matchAll(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_RE}(?:\\s+(\\d{4}))?|\\b${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+(\\d{4}))?`, 'g'))) {
    const day = +(m[1] ?? m[5]);
    const month = monthNo(m[2] ?? m[4]);
    const given = m[3] ?? m[6];
    const y = given ? +given : now.getUTCFullYear();
    const d = new Date(Date.UTC(y, month, day));
    if (d.getUTCMonth() !== month) continue;
    /* No year said: this year, so a date still to come is refused rather than moved back a year. */
    days.add(iso(d));
  }
  for (const m of t.matchAll(new RegExp(`\\b(?:(last|on)\\s+)?${WEEKDAY_RE}\\b`, 'g'))) {
    const want = WEEKDAYS.indexOf(m[2]);
    let back = (now.getUTCDay() - want + 7) % 7;
    if (m[1] === 'last' && back === 0) back = 7;
    days.add(iso(new Date(now.getTime() - back * DAY_MS)));
  }
  if (days.size === 0) return null;
  return days.size > 1 ? 'many' : [...days][0];
}

const ASK_DAY = 'Which day was that? Tell me the day, for example today, yesterday or a date, and I will ask again.';
const ASK_HOURS = 'I could not tell how many hours that was. Tell me the number of hours and the project, for example 6 hours on Atlas, and I will ask again.';

/**
 * What a message says about hours: the project from the admin's list, the hours and the day. Anything
 * that is not certain becomes a question, never a guess.
 */
export function readHours(message: string, clients: string[], today: Date = new Date()): HoursRead {
  const raw = (message ?? '').trim();
  if (!soundsLikeHours(raw)) return { kind: 'none' };
  const shown = clients.map((c) => c.trim()).filter(Boolean);
  const list = [...shown].sort((a, b) => b.length - a.length);
  const listed = shown.length ? ` The ones I have are ${shown.slice(0, -1).join(', ')}${shown.length > 1 ? ' and ' : ''}${shown[shown.length - 1]}.` : '';

  const found = [...raw.matchAll(AMOUNT)];
  const entries: HoursEntry[] = [];
  for (let i = 0; i < found.length; i++) {
    const m = found[i];
    let hours: number;
    if (m[1] !== undefined) hours = +m[1].replace(',', '.') + (m[2] ? +m[2] / 60 : 0);
    else if (m[3]) hours = 0.5;
    else if (m[4]) hours = 1;
    else hours = +m[5] / 60;
    if (!Number.isFinite(hours) || hours < 0.25 || hours > 24) return { kind: 'ask', say: ASK_HOURS };

    const after = raw.slice((m.index ?? 0) + m[0].length, found[i + 1]?.index ?? raw.length);
    const tail = /^\s*(?:on|at|for|with|in|of|to)\s+(?:the\s+)?(.*)$/i.exec(after);
    if (!tail) return { kind: 'ask', say: `Which project or client was ${hoursAsRead(hours)} on? Tell me which one and I will ask again.${listed}` };
    const wanted = tail[1].toLowerCase();
    const client = list.find((c) => wanted.startsWith(c.toLowerCase()) && !/[a-z0-9]/i.test(wanted.charAt(c.length) || ' '));
    if (!client) {
      const said = tail[1].split(/[,.;]|\b(?:today|yesterday|and|on)\b/i)[0].trim();
      return {
        kind: 'ask',
        say: said
          ? `I do not have ${said} on the list of clients and projects. Which one did you mean?${listed}`
          : `Which project or client was ${hoursAsRead(hours)} on? Tell me which one and I will ask again.${listed}`,
      };
    }
    entries.push({ client, hours });
  }

  /* One line per project, and a day never holds more than a day. */
  const merged: HoursEntry[] = [];
  for (const e of entries) {
    const same = merged.find((x) => x.client === e.client);
    if (same) same.hours += e.hours; else merged.push({ ...e });
  }
  if (merged.reduce((n, e) => n + e.hours, 0) > 24) return { kind: 'ask', say: ASK_HOURS };

  /* A project called "March campaign" is not a day. */
  let forTheDay = raw.toLowerCase();
  for (const c of list) forTheDay = forTheDay.split(c.toLowerCase()).join(' ');
  const day = readTheDay(forTheDay, today);
  if (day === null || day === 'many') return { kind: 'ask', say: ASK_DAY };
  if (day > iso(midnight(today))) return { kind: 'ask', say: `${longDay(day)} has not come yet. Tell me the day the hours were on, and I will ask again.` };
  return { kind: 'ok', said: { onDay: day, entries: merged } };
}

const theHours = (entries: HoursEntry[]) => {
  const parts = entries.map((e) => `${hoursAsRead(e.hours)} on ${e.client}`);
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
};

/**
 * The say-back. It repeats what the person gave and says nothing about it. `notes` are the sentences
 * about billable hours under the time sheet rules ("The hours on Internal are not billable."), only
 * when the rules say what is billable; with none, the say-back is exactly as it was.
 */
export function hoursSaidBack(said: HoursSaid, approverFirstName: string | null, notes: string[] = []): string {
  return [`Shall I log ${theHours(said.entries)} for ${longDay(said.onDay)} and send it to ${approverFirstName ?? 'an admin'} to approve?`, ...notes].join(' ');
}

/** "how many hours have I logged", "my hours this week", "my time sheet": the person asking where they stand. */
export function asksWhereMyHoursStand(message: string): boolean {
  const t = message ?? '';
  if (soundsLikeHours(t) || /\b(draft|fill (?:in|out)|prepare|put together|write up)\b/i.test(t)) return false;
  return /\b(how many hours|my hours|my time ?sheet|hours (?:have|did) i (?:log|logged|record|recorded|put|send|sent)|hours do i (?:still )?(?:need|owe|have left))\b/i.test(t);
}

/** Said after where the person stands, when they asked in Ask Groundwork. */
export const HOURS_CAN_BE_TOLD_HERE = 'You can tell me your hours here at any time, for example "I spent 3 hours on a client today".';

export function hoursSent(said: HoursSaid, approverFirstName: string | null): string {
  return `I have logged ${theHours(said.entries)} for ${longDay(said.onDay)} and sent it to ${approverFirstName ?? 'an admin'} to approve. It is not approved until they decide, and you will see it under your hours.`;
}
