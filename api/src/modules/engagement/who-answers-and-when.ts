/**
 * WHO HAS ANSWERED TODAY, BY THEIR USUAL TIME, AND WHO KEEPS ANSWERING ON TIME (nudges that get answers; Hafsah, 20 October 2026; behind
 * `organizations.direct_morning_on`, organisation/the-direct-morning-switch.ts, wherever it changes what somebody reads).
 *
 * Read from the check-ins on record and nothing else: when each session opened, and when it was answered. Never from what anybody said.
 *
 * THEIR USUAL TIME. The middle (median) time of day at which they answered, over their last 10 sessions that they answered on the day those
 * opened, read in the organisation's own zone. It needs at least 3 such answers. Somebody is "late today" once an hour has passed after
 * their usual time and today's session is still not answered.
 *   Where there are fewer than 3, the check-in's own opening is used instead: three hours after today's session opened (a check-in that
 *   opens at 8am is late at 11am). Which of the two was used is kept with the answer (`from`), so a sentence can say it.
 *
 * ON TIME. A session answered on the day it opened, by their usual time and its hour (or, with no usual time yet, within three hours of
 * its opening). "Days running" is the number of their latest sessions, one after another, each answered on time.
 *
 * MISSED DAYS. A day after the last day they checked in, before today, on which a session of theirs opened and was not answered that day.
 * Two or more in a row is when the lead is told to call them, and when the same opening or reminder is not sent to them again.
 *
 * FACTS ONLY. Nothing here is a label on a person: a sentence built from it says what happened and on which day.
 */

export const AN_HOUR_AFTER_THEIR_USUAL_TIME = 60;
export const THREE_HOURS_AFTER_IT_OPENED = 180;
export const SESSIONS_READ = 10;
export const ANSWERS_FOR_A_USUAL_TIME = 3;

export interface ASessionOnRecord {
  id?: string;
  participantId: string;
  sessionNumber?: number | null;
  status: string;
  isSetup?: boolean | null;
  completedAt?: Date | string | null;
  availableFrom?: Date | string | null;
  createdAt?: Date | string | null;
  closedReason?: string | null;
}

export interface TheirDay {
  participantId: string;
  /** A session of theirs is open today (it opened today or before, and was not answered before today). */
  dueToday: boolean;
  answeredToday: boolean;
  /** Today's session answered by their usual time. */
  answeredOnTimeToday: boolean;
  /** The time of day they are late after, in minutes from midnight in the zone, and where it came from. Null with nothing due today. */
  lateAfter: { minutes: number; from: 'their usual time' | 'the opening' } | null;
  /** Due today, not answered, and past `lateAfter`. */
  lateToday: boolean;
  /** The day (YYYY-MM-DD, in the zone) they last checked in, or null. */
  lastCheckedIn: string | null;
  /** Days before today, after the last day they checked in, on which a session opened and was not answered that day, oldest first. */
  missedDays: string[];
  /** Their latest sessions answered on time, one after another. */
  onTimeRunning: number;
  /** The day of the latest of those, or null. */
  onTimeLastDay: string | null;
}

const DAY = 86_400_000;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const aDayIn = (d: Date, zone: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
export function minutesIn(d: Date, zone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return (h % 24) * 60 + m;
}
const noon = (key: string) => new Date(`${key}T12:00:00Z`);
const plus = (key: string, n: number) => new Date(noon(key).getTime() + n * DAY).toISOString().slice(0, 10);

/** "Monday 19 October". */
export function aDayByName(key: string): string {
  const [, m, d] = key.split('-').map(Number);
  return `${WEEKDAYS[noon(key).getUTCDay()]} ${d} ${MONTHS[m - 1]}`;
}
/** "today", "yesterday", "on Monday 19 October". */
export function whenTheyLastCheckedIn(key: string, today: string): string {
  if (key === today) return 'today';
  if (key === plus(today, -1)) return 'yesterday';
  return `on ${aDayByName(key)}`;
}
/** "10:40", in the zone. */
export function aTimeOfDay(d: Date, zone: string): string {
  const m = minutesIn(d, zone);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

const openedAt = (c: ASessionOnRecord): Date | null => (c.availableFrom ? new Date(c.availableFrom) : c.createdAt ? new Date(c.createdAt) : null);
/** Answered: finished by the person. A session the clock closed is not an answer. */
export const wasAnswered = (c: ASessionOnRecord): boolean =>
  String(c.status ?? '').toUpperCase() === 'COMPLETED' && !!c.completedAt && !/auto|expired|timed|missed/i.test(String(c.closedReason ?? ''));

/** Their usual time of day, from their own answers; null with fewer than three answered on the day they opened. */
export function theirUsualTime(sessions: ASessionOnRecord[], zone: string, beforeDay: string): number | null {
  const sameDay = sessions
    .filter((c) => !c.isSetup && wasAnswered(c) && openedAt(c) && aDayIn(new Date(c.completedAt as any), zone) < beforeDay)
    .filter((c) => aDayIn(new Date(c.completedAt as any), zone) === aDayIn(openedAt(c)!, zone))
    .sort((a, b) => new Date(b.completedAt as any).getTime() - new Date(a.completedAt as any).getTime())
    .slice(0, SESSIONS_READ)
    .map((c) => minutesIn(new Date(c.completedAt as any), zone))
    .sort((a, b) => a - b);
  if (sameDay.length < ANSWERS_FOR_A_USUAL_TIME) return null;
  const mid = Math.floor(sameDay.length / 2);
  return sameDay.length % 2 ? sameDay[mid] : Math.round((sameDay[mid - 1] + sameDay[mid]) / 2);
}

/** The time of day after which a session that opened at `opened` is late, for somebody whose usual time is `usual`. */
export function lateAfterFor(usual: number | null, opened: Date | null, zone: string): TheirDay['lateAfter'] {
  if (usual !== null) return { minutes: usual + AN_HOUR_AFTER_THEIR_USUAL_TIME, from: 'their usual time' };
  if (!opened) return null;
  return { minutes: minutesIn(opened, zone) + THREE_HOURS_AFTER_IT_OPENED, from: 'the opening' };
}

/** One person's day, from their own sessions. */
export function theirDay(participantId: string, all: ASessionOnRecord[], now: Date, zone: string): TheirDay {
  const today = aDayIn(now, zone);
  const nowMinutes = minutesIn(now, zone);
  const mine = all.filter((c) => c.participantId === participantId && !c.isSetup && openedAt(c) && openedAt(c)! <= now)
    .sort((a, b) => openedAt(a)!.getTime() - openedAt(b)!.getTime() || Number(a.sessionNumber ?? 0) - Number(b.sessionNumber ?? 0));
  const usual = theirUsualTime(mine, zone, today);
  const answeredOn = (c: ASessionOnRecord) => (wasAnswered(c) && new Date(c.completedAt as any) <= now ? aDayIn(new Date(c.completedAt as any), zone) : null);

  /* What is due today: a session open now, or answered today. */
  const answeredTodaySessions = mine.filter((c) => answeredOn(c) === today);
  const openNow = mine.filter((c) => !answeredOn(c) && !/auto|expired|timed|missed/i.test(String(c.closedReason ?? '')) && String(c.status ?? '').toUpperCase() !== 'COMPLETED');
  const todays = answeredTodaySessions[answeredTodaySessions.length - 1] ?? openNow[openNow.length - 1] ?? null;
  const dueToday = !!todays;
  const lateAfter = dueToday ? lateAfterFor(usual, openedAt(todays!), zone) : null;
  const onTimeFor = (c: ASessionOnRecord): boolean => {
    const day = answeredOn(c);
    const opened = openedAt(c);
    if (!day || !opened || day !== aDayIn(opened, zone)) return false;
    const by = lateAfterFor(usual, opened, zone);
    return !!by && minutesIn(new Date(c.completedAt as any), zone) <= by.minutes;
  };
  const answeredToday = answeredTodaySessions.length > 0;
  const answeredOnTimeToday = answeredTodaySessions.some(onTimeFor);
  const lateToday = dueToday && !answeredToday && !!lateAfter && nowMinutes > lateAfter.minutes;

  const days = mine.map(answeredOn).filter((k): k is string => !!k).sort();
  const lastCheckedIn = days.length ? days[days.length - 1] : null;

  /* Missed days: after the last day they checked in, before today, a session of theirs opened and was not answered that day. */
  const missed = new Set<string>();
  for (const c of mine) {
    const k = aDayIn(openedAt(c)!, zone);
    if (k >= today || (lastCheckedIn && k <= lastCheckedIn)) continue;
    if (answeredOn(c) === k) continue;
    missed.add(k);
  }
  const missedDays = [...missed].sort();

  /* On time, running: their latest sessions, newest first, skipping today's while it is still open and not late. */
  let onTimeRunning = 0;
  let onTimeLastDay: string | null = null;
  for (const c of [...mine].reverse()) {
    const opened = aDayIn(openedAt(c)!, zone);
    if (!answeredOn(c) && opened === today && !lateToday) continue;
    if (!onTimeFor(c)) break;
    onTimeRunning++;
    onTimeLastDay = onTimeLastDay ?? answeredOn(c);
  }
  return { participantId, dueToday, answeredToday, answeredOnTimeToday, lateAfter, lateToday, lastCheckedIn, missedDays, onTimeRunning, onTimeLastDay };
}

/** Whether the days follow one another, counting only the days the team works. */
export function oneAfterAnother(days: string[], workingDays: number[] | null | undefined): boolean {
  const works = (workingDays ?? []).length ? new Set(workingDays) : new Set([1, 2, 3, 4, 5]);
  for (let i = 1; i < days.length; i++) {
    let k = plus(days[i - 1], 1);
    for (let n = 0; n < 7 && !works.has(noon(k).getUTCDay()); n++) k = plus(k, 1);
    if (k !== days[i]) return false;
  }
  return true;
}

const listed = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] ?? '');

/* ------------------------------------------------------------------------------------------------------------------------- */
/* The sentences the lead reads                                                                                                */
/* ------------------------------------------------------------------------------------------------------------------------- */

/** "Peter hasn't checked in for 2 days, on Monday 19 October and Tuesday 20 October. Call Peter." Null under two missed days. */
export function twoMissedDaysSaid(who: string, d: TheirDay, workingDays: number[] | null | undefined): string | null {
  const n = d.missedDays.length;
  if (n < 2) return null;
  const names = d.missedDays.map(aDayByName);
  if (oneAfterAnother(d.missedDays, workingDays)) {
    return n === 2
      ? `${who} hasn't checked in for 2 days, on ${listed(names)}. Call ${who}.`
      : `${who} hasn't checked in for ${n} days, since ${names[0]}. Call ${who}.`;
  }
  return `${who} hasn't checked in the last ${n} times the check-in opened, on ${listed(names)}. Call ${who}.`;
}

/** "Peter hasn't checked in today, and last checked in on Monday 19 October." Null unless they are late today. */
export function notInTodaySaid(who: string, d: TheirDay, today: string): string | null {
  if (!d.lateToday) return null;
  return d.lastCheckedIn
    ? `${who} hasn't checked in today, and last checked in ${whenTheyLastCheckedIn(d.lastCheckedIn, today)}.`
    : `${who} hasn't checked in today, and has not checked in yet.`;
}

/** "Kevin checked in on time 5 days running." / "Kevin checked in on time today." Null with nothing to credit. */
export function onTimeSaid(who: string, d: TheirDay, today: string): string | null {
  if (d.onTimeRunning >= 2) return `${who} checked in on time ${d.onTimeRunning} days running.`;
  if (d.onTimeRunning === 1 && d.onTimeLastDay === today) return `${who} checked in on time today.`;
  return null;
}

/** To the person, on their own page: "You checked in on time today, 5 days running." Null with nothing to credit. */
export function onTimeSaidToYou(d: TheirDay, today: string): string | null {
  if (!d.onTimeRunning || !d.onTimeLastDay) return null;
  const when = d.onTimeLastDay === today ? 'today' : whenTheyLastCheckedIn(d.onTimeLastDay, today);
  return d.onTimeRunning >= 2 ? `You checked in on time ${when}, ${d.onTimeRunning} days running.` : `You checked in on time ${when}.`;
}

/** Whether the lead may nudge them today: their session is open and not answered, and they are late today or missed a day before it. */
export const mayBeNudged = (d: TheirDay) => d.dueToday && !d.answeredToday && (d.lateToday || d.missedDays.length > 0);
