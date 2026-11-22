/**
 * THE QUESTIONS PEOPLE ASK ABOUT THEIR OWN LEAVE, THEIR OWN REQUESTS AND WHAT IS DUE (Ask Groundwork).
 *
 * "How many days of leave do I have left?", "Where is my request to spend?", "What is waiting for me
 * to approve?", "Who approves expenses?", "What is due?" and "Who is off next week?" used to be answered
 * "I cannot answer that one yet", although every one of them is answered by something the product
 * already holds. These patterns send each to the lane that reads it; the answer is composed in plain
 * sentences from the record, for the person who asked and for nobody else. The router is the fast
 * path: a question these patterns miss still reaches the model-first reading of the setup lanes, and
 * is never answered with a made-up number.
 */
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { saidAsADay } from '../suites/who-is-away';
import { aPromiseAsASentence } from './a-promise-as-a-sentence';

/* ------------------------------------------------------------------ what the router sees */

const ABOUT_LEAVE = '(?:leave|holiday|holidays|vacation|time\\s+off|days?\\s+off|annual\\s+leave|sick\\s+leave)';
const MY_REQUEST = '(?:request|requests|leave|spending|spend|expenses?|claims?|reimbursements?|payment|purchase|hours|time\\s*sheets?)';

/** Days left, where a request stands, and what waits for this person to decide. */
export const YOUR_REQUESTS_PATTERNS: RegExp[] = [
  new RegExp(`\\bhow\\s+(?:many|much)\\b[^?]*\\b${ABOUT_LEAVE}\\b[^?]*\\b(?:left|remain\\w*|have|got|get|allowed|entitled|owe|do\\s+i\\s+have)\\b`, 'i'),
  new RegExp(`\\bhow\\s+(?:many|much)\\s+${ABOUT_LEAVE}\\b`, 'i'),
  new RegExp(`\\b(?:my\\s+)?${ABOUT_LEAVE}\\s+(?:balance|allowance|entitlement)\\b`, 'i'),
  new RegExp(`\\bwhere(?:'s|\\s+is|\\s+are)\\s+(?:my|the)\\s+(?:\\w+\\s+)?${MY_REQUEST}\\b`, 'i'),
  new RegExp(`\\bwhat(?:'s|\\s+is|\\s+was)\\s+(?:happened\\s+to|happening\\s+(?:with|to)|the\\s+(?:state|status)\\s+of|going\\s+on\\s+with)\\s+my\\s+(?:\\w+\\s+)?${MY_REQUEST}\\b`, 'i'),
  new RegExp(`\\bwhat\\s+happened\\s+(?:to|with)\\s+my\\s+(?:\\w+\\s+)?${MY_REQUEST}\\b`, 'i'),
  new RegExp(`\\b(?:has|have|was|were|is|are)\\s+my\\s+(?:\\w+\\s+)?${MY_REQUEST}\\b[^?]*\\b(?:approved|declined|decided|seen|paid|sent|waiting|answered)\\b`, 'i'),
  new RegExp(`\\b(?:status|state)\\s+of\\s+my\\s+(?:\\w+\\s+)?${MY_REQUEST}\\b`, 'i'),
  /* "What leave have I asked for, and what was decided?" (WhatsApp journeys, run oct5c: it read "I cannot answer that one yet"). */
  new RegExp(`\\bwhat\\s+${MY_REQUEST}\\s+(?:have|did)\\s+i\\s+(?:asked\\s+for|ask\\s+for|requested|request|put\\s+in|made|make|sent|send)\\b`, 'i'),
  /\bwhat(?:'s|\s+is|\s+are)\s+(?:waiting|pending|outstanding)\s+(?:for\s+me\s+)?(?:to\s+)?(?:approve|approval|sign\s*off|be\s+approved)\b/i,
  /\bwaiting\s+(?:for\s+me\s+)?to\s+(?:approve|be\s+approved|sign\s*off)\b/i,
  /\bwhat\s+(?:do\s+i|should\s+i|must\s+i|have\s+i\s+got\s+to)\s+(?:need\s+to\s+)?(?:approve|sign\s*off)\b/i,
  /\bwhat\s+needs\s+my\s+(?:approval|sign[-\s]?off)\b/i,
  /* A bare "What is waiting?" (B-144). */
  /^\s*what(?:'s|\s+is|\s+are)\s+(?:waiting|pending)(?:\s+for\s+me)?\s*[?.!]*\s*$/i,
  /\b(?:anything|any\s+requests?)\s+(?:waiting\s+)?(?:for\s+me\s+)?to\s+approve\b/i,
  /\bwhat\s+(?:requests?|leave|spending|expenses?)\s+(?:is|are)\s+waiting\s+for\s+me\b/i,
];

export const WHO_APPROVES_PATTERNS: RegExp[] = [
  /\bwho\s+(?:approves|signs\s+off(?:\s+on)?|has\s+to\s+approve|must\s+approve|needs\s+to\s+approve|can\s+approve|decides(?:\s+on)?|authori[sz]es)\b[^?]*\b(?:expenses?|spending|spend|money|purchases?|buying|leave|holiday|holidays|time\s+off|days?\s+off|hours|time\s*sheets?|requests?|claims?|budget)\b/i,
  /\bwho\s+(?:do\s+i|should\s+i|would\s+i|can\s+i)\s+(?:ask|go\s+to|send\s+(?:it|this|that)\s+to)\b[^?]*\b(?:approv\w+|sign\s*off)\b/i,
  /\bwho\s+(?:approves|signs\s+off)\s+(?:it|this|that|them|mine|my)\b/i,
];

export const WHAT_IS_DUE_PATTERNS: RegExp[] = [
  /\bwhat(?:'s|\s+is|\s+are)\s+(?:due|overdue|coming\s+due|due\s+soon)\b/i,
  /\bwhat\s+do\s+i\s+have\s+due\b/i,
  /\bwhat\s+deadlines?\s+do\s+i\s+have\b/i,
  /\bwhat\s+(?:is|are)\s+(?:my\s+)?(?:deadlines?|due\s+dates?)\b/i,
];

/** Who is away. A group captures what follows, so "next week" travels as the subject. */
export const WHO_IS_AWAY_PATTERNS: RegExp[] = [
  /\bwho(?:'s|\s+is|\s+are|\s+will\s+be)\s+(?:off|away|out(?:\s+of\s+(?:the\s+)?office)?|on\s+(?:leave|holiday|vacation))\b\s*(.*)$/i,
  /\bwho\s+is\s+not\s+(?:in|at\s+work|working)\b\s*(.*)$/i,
  /\bis\s+(?:anyone|anybody|someone|somebody)\s+(?:off|away|out|on\s+leave|on\s+holiday)\b\s*(.*)$/i,
  /\bwho\s+(?:has|have)\s+(?:booked|taken)\s+(?:leave|time\s+off|holiday|days?\s+off)\b\s*(.*)$/i,
];

export type YourRequestsQuestion = 'days_left' | 'where_a_request_is' | 'waiting_for_you';

/** Which of the three it is, so the answer reads the right part of the record. */
export function whichOfYourRequests(message: string): YourRequestsQuestion {
  const t = message ?? '';
  if (/\b(?:waiting|pending|outstanding)\b[^?]*\bapprov|\bapprov\w*\b[^?]*\bwaiting|\bwhat\s+needs\s+my\b|\bwhat\s+(?:do|should|must)\s+i\b[^?]*\b(?:approve|sign)|\bany(?:thing|\s+requests?)\b[^?]*\bapprove\b|\bwaiting\s+for\s+me\b/i.test(t)) return 'waiting_for_you';
  if (new RegExp(`\\bhow\\s+(?:many|much)\\b|\\b${ABOUT_LEAVE}\\s+(?:balance|allowance|entitlement)\\b`, 'i').test(t)) return 'days_left';
  return 'where_a_request_is';
}

/** Which suite a question about a request or an approver is about. Null when it does not say. */
export function whichSuite(message: string): 'leave' | 'spend' | 'time' | null {
  const t = message ?? '';
  if (new RegExp(`\\b${ABOUT_LEAVE}\\b`, 'i').test(t)) return 'leave';
  if (/\b(?:hours|time\s*sheets?)\b/i.test(t)) return 'time';
  if (/\b(?:spend\w*|expenses?|money|purchases?|buy\w*|budget|claims?|reimburse\w*|payments?)\b/i.test(t)) return 'spend';
  return null;
}

/* ------------------------------------------------------------------ what is said */

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;
const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

export const LEAVE_IS_OFF_FOR_YOUR_QUESTION = 'Leave requests are not switched on in your organisation, so there are no leave days to count. An admin can switch them on under Suites.';
export const SPENDING_IS_OFF_FOR_YOUR_QUESTION = 'Spending requests are not switched on in your organisation, so there are none to look at. An admin can switch them on under Suites.';
export const HOURS_ARE_OFF_FOR_YOUR_QUESTION = 'Time sheets are not switched on in your organisation, so there is no one to approve hours. An admin can switch them on under Suites.';
export const NEITHER_SUITE_IS_ON = 'Neither leave requests nor spending requests are switched on in your organisation, so there is no request of yours to look at. An admin can switch them on under Suites.';
export const NO_SIGN_IN_FOR_YOUR_QUESTION = 'I cannot find your sign-in in this organisation, so I cannot read your own leave or requests.';
export const NOBODY_ASKED_YET = 'You have not asked for any leave or to spend anything, so there is no request of yours to look at. Tell me what you need and I will ask the person who decides.';
export const NOTHING_WAITS_FOR_YOU = 'Nothing is waiting for you to approve or decline.';

/**
 * WHY A SUITE WOULD NOT ANSWER, in the words the suite itself uses: a refusal ("Only people in this
 * organisation can ask for leave here.", for a guest) is its own sentence and is passed on as it is. A
 * suite that is switched off is null here, and the caller says so.
 */
export function theSuiteRefusal(err: unknown): string | null {
  const e = err as { name?: string; status?: number; message?: unknown } | null;
  if (!e || e.name === 'NotFoundException' || e.status === 404) return null;
  return typeof e.message === 'string' && /^[A-Z].*[.?!]$/.test(e.message) ? e.message : null;
}

/**
 * `speaker` is who says it: Ask Groundwork speaks as "I", and the leave page, which nobody speaks on, says "Groundwork"
 * (request 162, item 4: "so Groundwork cannot say how many you have left").
 */
export function daysOfLeaveLeftSaid(
  mine: { perYear: number | null; daysLeft: number | null; kinds: { key?: string; name: string; perYear: number | null; daysLeft: number | null; eachTime?: number }[] },
  speaker: 'I' | 'Groundwork' = 'I',
  /** The type of leave asked about ("how many sick days do I have left"), as the model read it. That one is said, and nothing else. */
  asked?: string | null,
): string {
  const theOne = asked ? mine.kinds.find((k) => k.key === asked) : undefined;
  if (theOne) {
    if (theOne.daysLeft != null) return `You have ${days(Math.max(0, theOne.daysLeft))} of ${lowerFirst(theOne.name)} left this year${theOne.perYear != null ? `, out of ${theOne.perYear}` : ''}.`;
    if (theOne.eachTime != null) return `${theOne.name} is up to ${days(theOne.eachTime)} each time it is taken, so there is no number left for the year.`;
    return `Your organisation has not set a number of days of ${lowerFirst(theOne.name)}, so ${speaker} cannot say how many you have left.`;
  }
  const withDays = mine.kinds.filter((k) => k.daysLeft != null);
  if (withDays.length > 1) {
    const parts = withDays.map((k) => `${days(Math.max(0, k.daysLeft as number))} of ${lowerFirst(k.name)}`);
    return `This year you have ${parts.slice(0, -1).join(', ')}${parts.length > 2 ? ',' : ''} and ${parts[parts.length - 1]} left.`;
  }
  const one = withDays[0];
  if (one) return `You have ${days(Math.max(0, one.daysLeft as number))} of ${lowerFirst(one.name)} left this year${one.perYear != null ? `, out of ${one.perYear}` : ''}.`;
  if (mine.daysLeft == null) return `Your organisation has not set how many days of leave each person has in a year, so ${speaker} cannot say how many you have left.`;
  return `You have ${days(Math.max(0, mine.daysLeft))} of leave left this year${mine.perYear != null ? `, out of ${mine.perYear}` : ''}.`;
}

/** Where each of the person's own requests stands, newest first, using the sentences the boards serve them. */
export function whereYourRequestsAre(wheres: string[]): string {
  if (!wheres.length) return NOBODY_ASKED_YET;
  const shown = wheres.slice(0, 4);
  const more = wheres.length - shown.length;
  return [...shown, ...(more > 0 ? [`You have ${more} older ${more === 1 ? 'request' : 'requests'} besides these.`] : [])].join('\n');
}

export function whatWaitsForYouSaid(things: string[]): string {
  if (!things.length) return NOTHING_WAITS_FOR_YOU;
  const head = things.length === 1 ? 'One request is waiting for you to approve or decline.' : `${things.length} requests are waiting for you to approve or decline.`;
  const body = things.map((t) => `${t.charAt(0).toUpperCase()}${t.slice(1)} is waiting for you.`);
  return `${head}\n${body.join('\n')}\nSay "approve" or "decline" and I will say back what you are deciding before anything happens.`;
}

export interface WhoApprovesFacts {
  suite: 'leave' | 'spend' | 'time';
  /** The first step, as a first name, or null when an admin approves. */
  firstName: string | null;
  /** Spending only: the amount above which a different rule applies, who decides it, and who decides after. */
  over?: number | null;
  currency?: string | null;
  aboveFirstName?: string | null;
  thenTo?: string[];
  /** Whether the reader is an admin, who is then the one an admin-approved request goes to. */
  readerIsAdmin?: boolean;
}

export function whoApprovesSaid(f: WhoApprovesFacts): string {
  const what = f.suite === 'leave' ? 'Your leave requests' : f.suite === 'time' ? 'Your hours' : 'Your requests to spend';
  const first = f.firstName
    ? `${what} go to ${f.firstName} to approve.`
    : `${what} go to an admin to approve, because nobody is set as the person who approves them for you${f.readerIsAdmin ? ', and you are an admin yourself' : ''}.`;
  if (f.suite !== 'spend' || f.over == null) return first;
  const then = (f.thenTo ?? []).filter(Boolean);
  const amount = `${f.currency ? `${f.currency} ` : ''}${f.over.toLocaleString('en-US')}`;
  return `${first} Anything over ${amount} goes to ${f.aboveFirstName ?? 'an admin'} to approve${then.length ? `, and then to ${then.join(', and then to ')}` : ''}.`;
}

export interface DueFacts {
  commitments: { text: string; dueAt: Date | null; dueSaid: string | null }[];
  toDos: { text: string; dueAt: Date | null; dueSaid: string | null }[];
  /** What they said they would do in their check-ins and is still open, as My work lists it (thePromisesOf), with the day in their own words. */
  saidInCheckIns?: { text: string; whenSaid: string | null; checkIn: string | null }[];
  waitingToDecide: number;
  now: Date;
}

const quoted = (s: string) => `“${s.trim().replace(/[.!?]+$/, '')}”`;

export function whatIsDueSaid(f: DueFacts): string {
  const dated = (x: { dueAt: Date | null }) => !!x.dueAt;
  const lines: string[] = [];
  const passed = f.commitments.filter((c) => dated(c) && (c.dueAt as Date) < f.now).sort((a, b) => +a.dueAt! - +b.dueAt!);
  const coming = [
    ...f.commitments.filter((c) => dated(c) && (c.dueAt as Date) >= f.now).map((c) => ({ ...c, kind: 'commitment' as const })),
    ...f.toDos.filter(dated).map((t) => ({ ...t, kind: 'todo' as const })),
  ].sort((a, b) => +a.dueAt! - +b.dueAt!);
  for (const c of passed) lines.push(`You said you would do ${quoted(c.text)} by ${whenItWas(c.dueAt, 'dayAndMonthLong')}, and that date has passed.`);
  for (const c of coming.slice(0, 6)) lines.push(`${c.kind === 'commitment' ? `You said you would do ${quoted(c.text)}` : `Your to-do ${quoted(c.text)} is on your list`} by ${whenItWas(c.dueAt, 'dayAndMonthLong')}.`);
  for (const c of f.saidInCheckIns ?? []) lines.push(aPromiseAsASentence(c.text, c.whenSaid, c.checkIn));
  const undated = f.commitments.filter((c) => !dated(c)).length + f.toDos.filter((t) => !dated(t)).length;
  if (f.waitingToDecide > 0) lines.push(`${f.waitingToDecide === 1 ? 'One request is' : `${f.waitingToDecide} requests are`} waiting for you to approve or decline.`);
  if (!lines.length && !undated) return 'Nothing is due. You have no open commitments or to-dos with a date, and nothing is waiting for you to decide.';
  if (undated) lines.push(`${undated === 1 ? 'One more thing on your list has' : `${undated} more things on your list have`} no date. Ask me what is on your list to see ${undated === 1 ? 'it' : 'them'}.`);
  return lines.join('\n');
}

/* ------------------------------------------------------------------ who is away */

export interface AwayWindow { from: Date; to: Date; said: string }

const DAY = 86_400_000;
const atMidnight = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** The days a "who is away" question is about. Nothing said means this week and next. */
export function theDaysAskedAbout(subject: string, today: Date): AwayWindow {
  const t = atMidnight(today);
  const s = (subject ?? '').toLowerCase();
  const mondayThis = new Date(t.getTime() - ((t.getUTCDay() + 6) % 7) * DAY);
  if (/\bnext\s+week\b/.test(s)) { const from = new Date(mondayThis.getTime() + 7 * DAY); return { from, to: new Date(from.getTime() + 6 * DAY), said: 'next week' }; }
  if (/\bthis\s+week\b/.test(s)) return { from: t, to: new Date(mondayThis.getTime() + 6 * DAY), said: 'this week' };
  if (/\btomorrow\b/.test(s)) { const d = new Date(t.getTime() + DAY); return { from: d, to: d, said: 'tomorrow' }; }
  if (/\btoday\b|\bright\s+now\b|\bnow\b/.test(s)) return { from: t, to: t, said: 'today' };
  return { from: t, to: new Date(t.getTime() + 13 * DAY), said: 'in the next two weeks' };
}

export interface AwayRow { name: string; startsOn: string; endsOn: string }

export const ONLY_AN_ADMIN_OR_A_LEAD_SEES_OTHERS = 'I can only tell you about other people’s leave if you are an admin or a lead.';

/** A member whose staff-directory entry has no department has no team, so there is no one else's leave to show (privacy sweep finding 6, decision 93 row 25). */
export const A_MEMBER_WITH_NO_TEAM_SEES_NO_ONE_ELSES = 'You are not in a department yet, so you have no team, and there is no one else’s leave for me to show you.';

export function whoIsAwaySaid(rows: AwayRow[], window: AwayWindow, scope: 'everyone' | 'your team' | 'you' | 'no team'): string {
  const closing = scope === 'you' ? ` ${ONLY_AN_ADMIN_OR_A_LEAD_SEES_OTHERS}` : scope === 'no team' ? ` ${A_MEMBER_WITH_NO_TEAM_SEES_NO_ONE_ELSES}` : '';
  if (!rows.length) {
    return scope === 'you' || scope === 'no team'
      ? `You are not on approved leave ${window.said}.${closing}`
      : `Nobody ${scope === 'your team' ? 'in your team ' : ''}is off ${window.said}, as far as approved leave goes.`;
  }
  const lines = rows.map((r) => {
    const mine = r.name === 'You';
    return r.startsOn === r.endsOn
      ? `${mine ? 'You are' : `${r.name} is`} off on ${saidAsADay(r.startsOn)}.`
      : `${mine ? 'You are' : `${r.name} is`} off from ${saidAsADay(r.startsOn)} to ${saidAsADay(r.endsOn)}.`;
  });
  return `${rows.length === 1 ? 'One person is' : `${rows.length} people are`} off ${window.said}, from approved leave.\n${lines.join('\n')}${closing ? `\n${closing.trim()}` : ''}`;
}
