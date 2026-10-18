/**
 * A REPORT SHARES ITSELF AT ITS SET TIME, UNLESS THE LEAD HOLDS IT (Hafsah's answers 1 and 5, 16 October 2026).
 *
 * "Team members read the team report only once it is shared (or shares itself at its set time)." and "Reports share
 * themselves at their set time unless the lead holds them ("Hold it")." The board's picture says it in the lead's words:
 * "Today’s report shares itself at 6:30pm. Read it first if you like, or share it now." with "Share now" and "Hold it".
 *
 * Before this, a session's team report was shared the moment everyone had checked in, and never if somebody did not. Now
 * a check-in that repeats shares each session's team report at its set time (the check-in's own `reportSharesAt`, or
 * 18:30 in the organisation's own day), once anybody has checked in to it, unless the lead has held that session. A
 * held session waits until she shares it herself. A one-time check-in has no set time: it shares when everyone has
 * checked in, as it always did, so a two-person conversation's reports still go to both at once.
 *
 * Who may read a session's team picture before it is shared is decided where it is served (reports.service, decision 76
 * item 4): the lead and an admin read it, a team member does not. Nothing here widens or narrows that; it only decides
 * when the share happens.
 */

export const THE_DEFAULT_SHARE_TIME = '18:30';

export type ASharingCheckIn = { cadence?: string | null; reportSharesAt?: string | null };
export type AHoldableReport = { heldSessions?: number[] | null } | null | undefined;

/** "18:30" when it is a real time of day, else null. */
export function aTimeOfDay(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(v.trim());
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
}

/** The time of day this check-in's session reports share themselves, or null when it shares once everyone has checked in. */
export function theTimeItSharesItself(g: ASharingCheckIn | null | undefined): string | null {
  if (!g) return null;
  if (g.cadence === 'ONE_TIME') return null;
  return aTimeOfDay(g.reportSharesAt) ?? THE_DEFAULT_SHARE_TIME;
}

/** Whether the lead held this session ("Hold it"). */
export function isThisSessionHeld(report: AHoldableReport, sessionNumber: number): boolean {
  const list = (report as any)?.heldSessions;
  return Array.isArray(list) && list.includes(sessionNumber);
}

export function withThisSessionHeld(report: AHoldableReport, sessionNumber: number): number[] {
  const list: number[] = Array.isArray((report as any)?.heldSessions) ? [...(report as any).heldSessions] : [];
  if (!list.includes(sessionNumber)) list.push(sessionNumber);
  return list.sort((a, b) => a - b);
}

export function withThisSessionNoLongerHeld(report: AHoldableReport, sessionNumber: number): number[] {
  const list: number[] = Array.isArray((report as any)?.heldSessions) ? (report as any).heldSessions : [];
  return list.filter((n) => n !== sessionNumber);
}

/** "6:30pm", "7pm": a time of day as the prototype writes it. */
export function asTheClockSaysIt(hhmm: string): string {
  const t = aTimeOfDay(hhmm) ?? THE_DEFAULT_SHARE_TIME;
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}

/** The wall-clock parts of an instant in a zone. */
function partsIn(at: Date, zone: string): { y: number; mo: number; d: number; h: number; mi: number } {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(at)) p[x.type] = x.value;
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute };
}

/** The instant a wall-clock time on a given local day happens in a zone. */
function theInstant(y: number, mo: number, d: number, h: number, mi: number, zone: string): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const seen = partsIn(new Date(guess), zone);
  const offset = Date.UTC(seen.y, seen.mo - 1, seen.d, seen.h, seen.mi) - guess;
  return new Date(guess - offset);
}

/**
 * WHEN A SESSION'S REPORT SHARES ITSELF: the first time the set time comes round at or after the first check-in of the
 * session, in the organisation's own day. A session first answered at 4pm shares at 6:30pm that day; one first answered
 * at 9pm shares at 6:30pm the next day, so the lead always has the chance to read it and hold it first.
 */
export function whenItSharesItself(firstAnswerAt: Date, hhmm: string, zone: string): Date {
  const t = aTimeOfDay(hhmm) ?? THE_DEFAULT_SHARE_TIME;
  const [h, m] = t.split(':').map(Number);
  const day = partsIn(firstAnswerAt, zone);
  let at = theInstant(day.y, day.mo, day.d, h, m, zone);
  if (at.getTime() < firstAnswerAt.getTime()) {
    const next = new Date(Date.UTC(day.y, day.mo - 1, day.d + 1));
    at = theInstant(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), h, m, zone);
  }
  return at;
}

/**
 * WHAT THE LEAD AND A TEAM MEMBER ARE TOLD ABOUT WHEN TODAY'S REPORT IS SHARED. Plain sentences, the reader is "you",
 * people by name. The lead reads the board's words ("Today’s report shares itself at 6:30pm."); a team member reads
 * when it will reach them, and never anything of the report itself.
 */
export type HowItIsShared = {
  sessionNumber: number;
  shared: boolean;
  held: boolean;
  /** "6:30pm", or null for a one-time check-in. */
  at: string | null;
  /** The lead's sentence, or the team member's. */
  says: string;
};

export function whatTheLeadIsToldAboutSharing(sessionNumber: number, shared: boolean, held: boolean, hhmm: string | null): HowItIsShared {
  const at = hhmm ? asTheClockSaysIt(hhmm) : null;
  const says = shared
    ? 'Today’s report is shared with the team.'
    : held
      ? 'You are holding today’s report. Nobody in the team sees it until you share it.'
      : at
        ? `Today’s report shares itself at ${at}.`
        : 'Today’s report is shared with the team once everyone has checked in.';
  return { sessionNumber, shared, held, at, says };
}

export function whatATeamMemberIsToldAboutSharing(sessionNumber: number, shared: boolean, held: boolean, hhmm: string | null, leadFirstName: string): HowItIsShared {
  const at = hhmm ? asTheClockSaysIt(hhmm) : null;
  const lead = (leadFirstName || '').trim() || 'The person who runs this check-in';
  const says = shared
    ? 'The team’s report is shared.'
    : held
      ? `${lead} is reading it first. You’ll get an email when ${lead} shares it.`
      : at
        ? `It is usually shared by ${at}. You’ll get an email when it is.`
        : 'It is shared once everyone has checked in. You’ll get an email when it is.';
  /* A team member is told when, never whether the lead held it: "held" is served to the lead only. */
  return { sessionNumber, shared, held: false, at, says };
}
