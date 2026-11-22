import { aNumberPeopleCanRead } from './an-aim-is-a-sentence-about-somebody';
import { theWordsSayItIsALimit, aDeadlineIsDone, type TargetDirection } from './a-measure-that-goes-down-is-still-going-well';
import { theDayInWords } from './the-day-in-words';
import { theSalesAnswer, type ACountFromTheDeals } from './a-sales-aim-is-counted-from-the-deals';

/** The direction a target is read in: the lead's, or a limit where its words say so, or not said. */
export function theDirectionToReadIn(said: TargetDirection | null, name: string | null | undefined): TargetDirection | null {
  return said ?? (theWordsSayItIsALimit(name) ? 'LIMIT' : null);
}

/**
 * THE HEADLINE QUESTION, AND WHERE EACH TARGET STANDS (request 108, parts a and b).
 *
 * The prototype's boards open on one question in the largest type ("Will we reach 25 sales by 30
 * September?", "Deliver the major release by 30 September?"), a one-line answer and a bar, and then
 * "Where each target stands", each target with one short word: "Met", "Close", "Behind", "Within",
 * "Over limit", "Not settled" (docs/prototype/screens/G1-example-check-ins/*.txt).
 *
 * NEVER INVENTED. The question is built only from the check-in's own team aim (a target with nobody's
 * name on it), in the lead's own words for what is counted, with its number and the check-in's own
 * deadline. Where there is no team aim with a number, or with a deadline, no question is made. The
 * answer and the bar are the count the board already serves. The word for each target is read off the
 * pace the record shows against the check-in's last session, with the thresholds below.
 *
 * ABOUT A TARGET, NEVER A PERSON. Only a team target gets a word: a target with somebody's name on it
 * is about one person, and a word on it would be a label on them, the same reason the forecast leaves
 * it out. Nothing here is built on an evaluation check-in.
 */

export type AStandingWord = 'Met' | 'On time' | 'Close' | 'Behind' | 'Within' | 'Over limit' | 'Not settled';

/**
 * THE THRESHOLDS, STATED ONCE (also in docs/answers-from-engine.md, request 108 b).
 *
 * For an aim to reach, with a count from at least two sessions and a planned last session: the pace
 * between the first and the latest count is carried forward to the last session, in a straight line,
 * exactly as the forecast does.
 *  - "Met": the count has reached the aim.
 *  - "On time": at that pace it reaches the aim by the last session.
 *  - "Close": at that pace it covers at least 90% of the way from where it started to the aim.
 *  - "Behind": at that pace it covers less than 90% of the way.
 * Once the last session has been counted, the count itself is where it ends: 90% of the way or more is
 * "Close", less is "Behind".
 * For a limit not to go over: "Within" while the count is at or under the limit, "Over limit" above it.
 * "Not settled": the lead has written down that what this number counts is not settled.
 * No word at all: fewer than two sessions counted, no planned last session, or nobody has said which way
 * the number should go. A sentence says why.
 */
export const CLOSE_MEANS_AT_LEAST = 0.9;

export interface AStanding {
  word: AStandingWord | null;
  says: string;
}

export interface ATargetToStand {
  id: string;
  target: number | null;
  count: number;
  /** Where it started: the count at its first stored session, or null. */
  start: number | null;
  /** The lead's kind for it (decision 69 and decision 75 item 17), or a limit where its words say so. */
  direction: TargetDirection | null;
  /** The journey's own reading: "down" for a measure that should fall, "unknown" where nothing says. */
  journeyDirection: 'up' | 'down' | 'unknown';
  notSettled: string | null;
  /** For a date to meet: the day it is due, in words, and whether it has passed. */
  dueDay?: string | null;
  isPast?: boolean;
  /** Its count is read from a record now (the deals, the bills), so a 0 is a count and not the absence of one. */
  countedFromARecord?: boolean;
}

const read = aNumberPeopleCanRead;

/** The pace from the counts stored when each session closed, carried to the last session (as the forecast). */
function whereThePaceEnds(counts: { sessionNumber: number; count: number }[], totalSessions: number | null): { ends: number; atTheEnd: boolean; from: number; to: number } | null {
  if (!totalSessions) return null;
  const mine = [...counts].sort((a, b) => a.sessionNumber - b.sessionNumber);
  if (!mine.length) return null;
  const first = mine[0];
  const last = mine[mine.length - 1];
  if (last.sessionNumber >= totalSessions) return { ends: last.count, atTheEnd: true, from: first.sessionNumber, to: last.sessionNumber };
  if (mine.length < 2 || last.sessionNumber <= first.sessionNumber) return null;
  const pace = (last.count - first.count) / (last.sessionNumber - first.sessionNumber);
  return { ends: last.count + pace * (totalSessions - last.sessionNumber), atTheEnd: false, from: first.sessionNumber, to: last.sessionNumber };
}

export function whereThisTargetStands(
  t: ATargetToStand,
  counts: { sessionNumber: number; count: number }[],
  totalSessions: number | null,
): AStanding | null {
  if (t.direction === 'DEADLINE') {
    /* A date to meet: met, late, or not yet due. No pace: a date is met or it is not. */
    if (t.notSettled) return { word: 'Not settled', says: 'What this counts is not settled yet, so how it stands cannot be said.' };
    if (aDeadlineIsDone(t.count, t.target)) return { word: 'Met', says: t.dueDay ? `It is done. It was due by ${t.dueDay}.` : 'It is done.' };
    if (!t.dueDay) return { word: null, says: 'Nobody has set the date this is due, so how it stands cannot be said.' };
    return t.isPast
      ? { word: 'Behind', says: `It was due by ${t.dueDay}, and it is not done yet.` }
      : { word: null, says: `It is due by ${t.dueDay}, and it is not done yet.` };
  }
  if (typeof t.target !== 'number' && t.direction !== 'ZERO') return null;
  if (t.notSettled) return { word: 'Not settled', says: 'What this number counts is not settled yet, so how it stands cannot be said.' };
  /*
   * NOTHING COUNTED IS NOT "WITHIN" (re-test, 22 November evening, R-12). A new distribution board read "0 of ≤ 2. Within" and "0 of ≤ 850.
   * Within": nothing had been measured, and the stored 0 was read as a count that keeps both limits. With no count kept at any check-in,
   * none read from a record, and the stored number still 0, nothing has been counted, and the board says that rather than a word.
   */
  if (!t.countedFromARecord && t.count === 0 && counts.length === 0) {
    return { word: null, says: 'Nothing has been counted against this yet, so how it stands cannot be said.' };
  }
  if (t.direction === 'ZERO') {
    /* A count to keep at zero: none is met, any at all is a breach. */
    return t.count === 0
      ? { word: 'Met', says: 'There have been none, which is where it should stay.' }
      : { word: 'Over limit', says: `There ${t.count === 1 ? 'has been 1' : `have been ${read(t.count)}`}, and this should stay at zero, so any at all is a breach.` };
  }
  if (typeof t.target !== 'number') return null;
  if (t.direction === 'RATE') {
    /* A share over a period is read where it is now, against its number. It is not carried forward like a count. */
    const pc = (n: number) => `${read(n)}%`;
    if (t.count >= t.target) return { word: 'Met', says: `It is ${pc(t.count)}, which meets the aim of ${pc(t.target)} or more.` };
    return t.count >= t.target * CLOSE_MEANS_AT_LEAST
      ? { word: 'Close', says: `It is ${pc(t.count)}, close to the aim of ${pc(t.target)} or more.` }
      : { word: 'Behind', says: `It is ${pc(t.count)}, below the aim of ${pc(t.target)} or more.` };
  }
  const limit = t.direction === 'LIMIT';
  if (limit) {
    return t.count > t.target
      ? { word: 'Over limit', says: `It is ${read(t.count)}, which is over the limit of ${read(t.target)}.` }
      : { word: 'Within', says: `It is ${read(t.count)}, within the limit of ${read(t.target)}.` };
  }
  if (t.direction == null && t.journeyDirection === 'unknown') {
    return { word: null, says: `Nobody has said whether ${read(t.target)} is something to reach or a limit not to go over, so how it stands cannot be said.` };
  }
  const goesDown = t.journeyDirection === 'down';
  const reached = goesDown ? t.count <= t.target : t.count >= t.target;
  if (reached) return { word: 'Met', says: `It is ${read(t.count)}, so the aim of ${read(t.target)} has been reached.` };
  const pace = whereThePaceEnds(counts, totalSessions);
  if (!pace) {
    return {
      word: null,
      says: totalSessions
        ? 'It needs a count from two check-ins before its pace can be read, so how it stands cannot be said yet.'
        : 'This check-in has no planned last check-in, so its pace cannot be read against one.',
    };
  }
  const start = t.start ?? (counts.length ? [...counts].sort((a, b) => a.sessionNumber - b.sessionNumber)[0].count : 0);
  const way = t.target - start;
  const covered = way === 0 ? 1 : (pace.ends - start) / way;
  const ends = Math.max(0, Math.round(pace.ends));
  if (pace.atTheEnd) {
    return covered >= CLOSE_MEANS_AT_LEAST
      ? { word: 'Close', says: `The last check-in has been counted, and it is ${read(t.count)}, close to the aim of ${read(t.target)}.` }
      : { word: 'Behind', says: `The last check-in has been counted, and it is ${read(t.count)}, short of the aim of ${read(t.target)}.` };
  }
  const at = `At the pace it has kept since check-in ${pace.from}, it would be about ${read(ends)} by the last check-in`;
  if (covered >= 1) return { word: 'On time', says: `${at}, which reaches the aim of ${read(t.target)}.` };
  if (covered >= CLOSE_MEANS_AT_LEAST) return { word: 'Close', says: `${at}, close to the aim of ${read(t.target)}.` };
  return { word: 'Behind', says: `${at}, short of the aim of ${read(t.target)}.` };
}

/* ------------------------------------------------------------------------------------------------
 * THE HEADLINE QUESTION
 * ---------------------------------------------------------------------------------------------- */

export interface AHeadlineBar {
  objectiveId: string;
  /** "aim" fills towards the number (a share too, towards its number); "limit" fills towards the ceiling. */
  kind: 'aim' | 'limit';
  now: number;
  target: number;
  /** How far along the bar is filled, 0 to 100. */
  filled: number;
  /** The word from "where each target stands", where there is one. */
  word: AStandingWord | null;
}

export interface AHeadline {
  question: string;
  /** One line under it, from the counts the board already serves. Null where the aim has no number. */
  answer: string | null;
  bars: AHeadlineBar[];
  /**
   * ONE QUESTION, ONE TARGET (Hafsah's quality pass, 18 October, B-1): on a sales check-in the question asks only the sales aim, and
   * a count of new leads is its own line: "6 new leads this week, of the 30 you asked for."
   */
  besides?: { objectiveId: string; count: number; target: number; says: string }[];
}

export interface ATeamAim {
  id: string;
  /** The lead's own words for the aim, as stored. */
  name: string;
  target: number | null;
  count: number;
  start: number | null;
  direction: TargetDirection | null;
  journeyDirection: 'up' | 'down' | 'unknown';
  word: AStandingWord | null;
  /** For a date to meet: the day it is due, in words. */
  dueDay?: string | null;
  /** On a sales check-in, where the count is the deals on record (a-sales-aim-is-counted-from-the-deals). */
  fromTheDeals?: ACountFromTheDeals | null;
  /** What the deals under "Likely" hold, in the same measure. */
  likely?: number;
}

export { theDayInWords } from './the-day-in-words';

/** A time already said in the aim's own words, at its end: "this quarter", "in Q3", "by the end of the year". */
const A_TIME_AT_THE_END = /\s+((?:this|next) (?:quarter|month|year|week|financial year|half)|(?:in|for|during) (?:Q[1-4]|the (?:quarter|year|month))(?: \d{4})?|by (?:the end of )?[\w ,]+)$/i;

/** Words that start an aim said as something to do: "Close 100 sales", "Replace the payments integration". */
const STARTS_WITH_A_DOING_WORD = /^(reach|hit|close|sell|sign|train|deliver|launch|ship|release|replace|rebuild|finish|complete|roll out|move|migrate|build|hire|recruit|onboard|open|raise|win|get|set up|publish|submit|file|disburse|approve|collect|cut|reduce|keep|grow|increase|bring|resolve|dispatch|serve|visit|enrol|register|install|deploy|fix)\b/i;

/** An aim stored as a sentence about somebody ("They want to get 12 shops onboarded.") is not a phrase to ask with. */
const SAID_AS_A_SENTENCE = /^(i|we|they|he|she|you|our|my|the team|everybody|everyone)\b|[.!]$|\b(is aiming|are aiming|wants?|would like)\b/i;

const lowerFirst = (s: string): string => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

function theNumberIsInIt(name: string, target: number): boolean {
  const flat = name.replace(/,/g, '');
  if (new RegExp(`(?<![\\d.])${target}(?![\\d])`).test(flat)) return true;
  const said = read(target);
  return said !== String(target) && name.toLowerCase().includes(said.toLowerCase());
}

/* `subject`: set where the aim is a finished state of something ("All 100 tasks for the release are deployed to production."),
   asked as "Will all 100 tasks for the release be deployed to production by 30 September?" (requests 127, 129). */
interface APhrase { verbPhrase: string; thing: string | null; tail: string | null; aim: ATeamAim; subject?: string }

const A_THING_IN_A_STATE = /^(?!(?:i|we|they|he|she|you|our|my|the team)\b)((?:\S+\s+){0,9}?\S+)\s+(?:is|are)\s+((?:\w+ed|\w+en|done|live|complete|met|sent|built|paid|made|set|open|closed|signed)\b.*)$/i;

function aPhraseFor(aim: ATeamAim): APhrase | null {
  const raw = (aim.name ?? '').trim().replace(/[.!?;:]+$/, '').replace(/\s+/g, ' ');
  /* A full stop alone does not make an instruction a sentence about somebody: "Sign 12 shops for kitchen appliances
     in Nairobi." was the team's aim, and its headline had no answer and no bar (request 117, part 2). */
  const inAState = raw.split(' ').length <= 16 ? raw.match(A_THING_IN_A_STATE) : null;
  if (inAState && aim.direction !== 'DEADLINE' && aim.direction !== 'ZERO' && aim.direction !== 'LIMIT' && aim.direction !== 'RATE') {
    const tailMatch = inAState[2].match(A_TIME_AT_THE_END);
    const rest = (tailMatch ? inAState[2].slice(0, tailMatch.index) : inAState[2]).trim();
    const tail = tailMatch ? tailMatch[1] : (aim.dueDay ? `by ${aim.dueDay}` : null);
    return { verbPhrase: `be ${rest}`, thing: null, tail, aim, subject: lowerFirst(inAState[1].trim()) };
  }
  const aSentence = SAID_AS_A_SENTENCE.test(aim.name.trim()) && !(STARTS_WITH_A_DOING_WORD.test(raw) && !SAID_AS_A_SENTENCE.test(raw));
  if (!raw || raw.split(' ').length > 14 || aSentence) return null;
  const tailMatch = raw.match(A_TIME_AT_THE_END);
  /* The aim's own day, where the lead gave one, before the check-in's: the board asked "by 13 December" of an
     aim the lead had said was due by 20 December (request 111 b). */
  const tail = tailMatch ? tailMatch[1] : (aim.dueDay ? `by ${aim.dueDay}` : null);
  const body = tailMatch ? raw.slice(0, tailMatch.index).trim() : raw;
  if (!body) return null;
  if (aim.direction === 'DEADLINE') {
    /* A date to meet is asked by its own date: "Will we launch the new market by 1 December?" */
    if (!aim.dueDay) return null;
    const what = STARTS_WITH_A_DOING_WORD.test(body) ? lowerFirst(body) : `finish ${lowerFirst(body)}`;
    return { verbPhrase: what, thing: null, tail: `by ${aim.dueDay}`, aim };
  }
  if (aim.direction === 'ZERO') {
    if (STARTS_WITH_A_DOING_WORD.test(body)) return null;
    return { verbPhrase: `keep ${lowerFirst(body)} at zero`, thing: lowerFirst(body), tail, aim };
  }
  if (aim.target == null) {
    /* An aim with no number is asked only where it is said as something to do. */
    if (!STARTS_WITH_A_DOING_WORD.test(body)) return null;
    return { verbPhrase: lowerFirst(body), thing: null, tail, aim };
  }
  if (theNumberIsInIt(body, aim.target)) {
    return { verbPhrase: STARTS_WITH_A_DOING_WORD.test(body) ? lowerFirst(body) : `reach ${lowerFirst(body)}`, thing: null, tail, aim };
  }
  if (STARTS_WITH_A_DOING_WORD.test(body)) return null;
  const thing = lowerFirst(body);
  if (aim.direction === 'LIMIT') return { verbPhrase: `keep ${thing} within ${read(aim.target)}`, thing, tail, aim };
  if (aim.direction === 'RATE') return { verbPhrase: `keep ${thing} at ${read(aim.target)}% or more`, thing, tail, aim };
  if (aim.journeyDirection === 'down') return { verbPhrase: `bring ${thing} down to ${read(aim.target)}`, thing, tail, aim };
  return { verbPhrase: `reach ${read(aim.target)} ${thing}`, thing, tail, aim };
}

function aBar(aim: ATeamAim): AHeadlineBar | null {
  /* A date is met or not, and zero has nothing to fill: neither has a bar. */
  if (aim.direction === 'DEADLINE' || aim.direction === 'ZERO') return null;
  if (typeof aim.target !== 'number' || aim.target <= 0 && aim.direction !== 'LIMIT') return null;
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  if (aim.direction === 'LIMIT') {
    return { objectiveId: aim.id, kind: 'limit', now: aim.count, target: aim.target, filled: aim.target > 0 ? clamp((aim.count / aim.target) * 100) : 100, word: aim.word };
  }
  const start = aim.journeyDirection === 'down' ? (aim.start ?? aim.count) : (aim.start ?? 0);
  const way = aim.target - start;
  const filled = aim.direction === 'RATE' ? clamp((aim.count / aim.target) * 100) : way === 0 ? 100 : clamp(((aim.count - start) / way) * 100);
  return { objectiveId: aim.id, kind: 'aim', now: aim.count, target: aim.target, filled, word: aim.word };
}

function anAnswerFor(p: APhrase, when: string | null): string {
  const a = p.aim;
  if (a.direction === 'DEADLINE') {
    return aDeadlineIsDone(a.count, a.target) ? 'Yes. It is done.' : `It is not done yet, and it is due by ${a.dueDay}.`;
  }
  if (a.direction === 'ZERO') {
    return a.count === 0
      ? 'So far there have been none.'
      : `So far there ${a.count === 1 ? 'has been 1' : `have been ${read(a.count)}`}, and any at all is a breach.`;
  }
  const target = a.target as number;
  if (a.direction === 'RATE') {
    return a.count >= target
      ? `Yes. It is ${read(a.count)}%, which meets the aim of ${read(target)}% or more.`
      : `So far it is ${read(a.count)}%, below the aim of ${read(target)}% or more.`;
  }
  if (a.direction === 'LIMIT') {
    return a.count > target
      ? `So far it is ${read(a.count)}, which is ${read(a.count - target)} over the limit of ${read(target)}.`
      : `So far it is ${read(a.count)}, within the limit of ${read(target)}.`;
  }
  /*
   * AN AIM COUNTED FROM THE DEALS IS ANSWERED IN THE PROTOTYPE'S SHAPE (board-as-lead.txt: "Not yet. 21 freezers are sold and
   * 2 more are likely. That makes 23 of the 25 needed."). New leads keep the plain count below.
   */
  if (a.fromTheDeals && a.fromTheDeals.counts !== 'new leads' && a.journeyDirection !== 'down') {
    return theSalesAnswer(a.fromTheDeals, target, a.likely ?? 0);
  }
  const goesDown = a.journeyDirection === 'down';
  const reached = goesDown ? a.count <= target : a.count >= target;
  const of = p.thing ? `${read(a.count)} of the ${read(target)} ${p.thing}` : `${read(a.count)} of ${read(target)}`;
  if (reached) return p.thing ? `Yes. The aim of ${read(target)} ${p.thing} has been reached, at ${read(a.count)}.` : `Yes. The aim of ${read(target)} has been reached, at ${read(a.count)}.`;
  if (goesDown) return `It is ${read(a.count)} so far, and the aim is to bring it down to ${read(target)}${when ? ` ${when}` : ''}.`;
  const gap = target - a.count;
  const more = `${read(gap)} more ${gap === 1 ? 'is' : 'are'} needed${when ? ` ${when}` : ''}.`;
  return a.count === 0 && a.start == null ? `Nothing has been counted yet. ${more}` : `So far it is ${of}. ${more}`;
}

/**
 * The question, from the first two team aims that can be asked plainly. A time in the aim's own words
 * ("this quarter") is kept; otherwise the check-in's deadline is added ("by 30 November"). An aim with no
 * number is asked only where there is a deadline and no aim with a number.
 */
/*
 * AN AIM WITH A TRAILING CLAUSE TAKES A COMMA BEFORE ITS DAY (reviewer, 5 October 2026). "Will we train
 * 10,000 market traders in financial skills, at least 60% of them women by 28 February 2027?" read as if
 * the women were due by that day. Where the aim already has a comma between words in it (not one inside a number such as 10,000), the day follows a comma.
 */
const beforeTheDay = (phrase: string): string => (/,\s/.test(phrase) ? ', ' : ' ');

export function theHeadlineQuestion(aims: ATeamAim[], deadline: Date | null, now: Date = new Date(), opts: { askedBy?: string | null } = {}): AHeadline | null {
  /* An aim the lead already put as a question ("Is the cohort repaying, and why not where it isn't?") is the question (request 133). */
  const alreadyAsked = aims.find((a) => a.target == null && /\?\s*$/.test(a.name ?? '') && (a.name ?? '').trim().split(/\s+/).length <= 20);
  if (alreadyAsked) return { question: alreadyAsked.name.trim().replace(/\s+/g, ' '), answer: null, bars: [] };
  /* A sales aim counted from the deals is the one question; new leads are said on their own line (B-1). */
  const aSale = aims.some((a) => a.fromTheDeals && a.fromTheDeals.counts !== 'new leads' && typeof a.target === 'number');
  const leadsApart = aSale ? aims.filter((a) => a.fromTheDeals?.counts === 'new leads' && typeof a.target === 'number') : [];
  const besides = leadsApart.map((a) => {
    const week = a.fromTheDeals?.window === 'week' ? ' this week' : '';
    const who = opts.askedBy === 'you' ? 'you asked for' : opts.askedBy ? `${opts.askedBy} asked for` : 'aimed for';
    const lead = a.count === 1 ? '1 new lead' : `${read(a.count)} new leads`;
    return { objectiveId: a.id, count: a.count, target: a.target as number, says: `${lead}${week}, of the ${read(a.target as number)} ${who}.` };
  });
  const asked = aims.filter((a) => !leadsApart.includes(a));
  const withBesides = (h: AHeadline | null): AHeadline | null => (h && besides.length ? { ...h, besides } : h);
  return withBesides(theQuestionOf(asked, deadline, now));
}

function theQuestionOf(aims: ATeamAim[], deadline: Date | null, now: Date): AHeadline | null {
  const phrases = aims.map(aPhraseFor).filter((p): p is APhrase => !!p);
  const counted = phrases.filter((p) => typeof p.aim.target === 'number' || p.aim.direction === 'DEADLINE' || p.aim.direction === 'ZERO').slice(0, 2);
  const byDate = deadline ? `by ${theDayInWords(deadline, now)}` : null;
  if (counted.length) {
    const tails = [...new Set(counted.map((p) => p.tail?.toLowerCase() ?? ''))];
    const oneTail = tails.length === 1 ? counted[0].tail : null;
    const parts = counted.map((p) => (oneTail || !p.tail ? p.verbPhrase : `${p.verbPhrase} ${p.tail}`));
    const joined = parts.length === 2 && parts[0].startsWith('reach ') && parts[1].startsWith('reach ')
      ? `reach ${parts[0].slice(6)} and ${parts[1].slice(6)}`
      : parts.join(' and ');
    const when = oneTail ?? (counted.some((p) => p.tail) ? null : byDate);
    const question = counted.length === 1 && counted[0].subject
      ? `Will ${counted[0].subject} ${counted[0].verbPhrase}${when ? `${beforeTheDay(counted[0].verbPhrase)}${when}` : ''}?`
      : `Will we ${joined}${when ? `${beforeTheDay(joined)}${when}` : ''}?`;
    const answer = counted.map((p) => anAnswerFor(p, counted.length === 1 ? (p.tail ?? byDate) : null)).join(' ');
    return { question, answer, bars: counted.map((p) => aBar(p.aim)).filter((b): b is AHeadlineBar => !!b) };
  }
  const words = phrases.find((p) => p.aim.target == null);
  if (!words) return null;
  /* No day is made up: a support desk or a depot has no deadline, and the prototype asks it without one
     ("Resolve customer issues within a day, without reopening them?"). */
  const day = words.tail ?? byDate;
  const asked = words.subject ? `Will ${words.subject} ${words.verbPhrase}` : `Will we ${words.verbPhrase}`;
  return { question: `${asked}${day ? `${beforeTheDay(asked)}${day}` : ''}?`, answer: null, bars: [] };
}
