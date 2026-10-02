import { aNumberPeopleCanRead } from './an-aim-is-a-sentence-about-somebody';
import { theWordsSayItIsALimit } from './a-measure-that-goes-down-is-still-going-well';

/** The direction a target is read in: the lead's, or a limit where its words say so, or not said. */
export function theDirectionToReadIn(said: 'AIM' | 'LIMIT' | null, name: string | null | undefined): 'AIM' | 'LIMIT' | null {
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
  /** The lead's direction, or what the words of the name suggest where nobody has set one. */
  direction: 'AIM' | 'LIMIT' | null;
  /** The journey's own reading: "down" for a measure that should fall, "unknown" where nothing says. */
  journeyDirection: 'up' | 'down' | 'unknown';
  notSettled: string | null;
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
  if (typeof t.target !== 'number') return null;
  if (t.notSettled) return { word: 'Not settled', says: 'What this number counts is not settled yet, so how it stands cannot be said.' };
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
        ? 'It needs a count from two sessions before its pace can be read, so how it stands cannot be said yet.'
        : 'This check-in has no planned last session, so its pace cannot be read against one.',
    };
  }
  const start = t.start ?? (counts.length ? [...counts].sort((a, b) => a.sessionNumber - b.sessionNumber)[0].count : 0);
  const way = t.target - start;
  const covered = way === 0 ? 1 : (pace.ends - start) / way;
  const ends = Math.max(0, Math.round(pace.ends));
  if (pace.atTheEnd) {
    return covered >= CLOSE_MEANS_AT_LEAST
      ? { word: 'Close', says: `The last session has been counted, and it is ${read(t.count)}, close to the aim of ${read(t.target)}.` }
      : { word: 'Behind', says: `The last session has been counted, and it is ${read(t.count)}, short of the aim of ${read(t.target)}.` };
  }
  const at = `At the pace it has kept since session ${pace.from}, it would be about ${read(ends)} by the last session`;
  if (covered >= 1) return { word: 'On time', says: `${at}, which reaches the aim of ${read(t.target)}.` };
  if (covered >= CLOSE_MEANS_AT_LEAST) return { word: 'Close', says: `${at}, close to the aim of ${read(t.target)}.` };
  return { word: 'Behind', says: `${at}, short of the aim of ${read(t.target)}.` };
}

/* ------------------------------------------------------------------------------------------------
 * THE HEADLINE QUESTION
 * ---------------------------------------------------------------------------------------------- */

export interface AHeadlineBar {
  objectiveId: string;
  /** "aim" fills towards the number; "limit" fills towards the ceiling. */
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
}

export interface ATeamAim {
  id: string;
  /** The lead's own words for the aim, as stored. */
  name: string;
  target: number | null;
  count: number;
  start: number | null;
  direction: 'AIM' | 'LIMIT' | null;
  journeyDirection: 'up' | 'down' | 'unknown';
  word: AStandingWord | null;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "30 September", in Lagos time, with the year only where it is not this one. */
export function theDayInWords(d: Date, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d).split('-').map(Number);
  const [y, m, day] = parts;
  const thisYear = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric' }).format(now));
  return `${day} ${MONTHS[m - 1]}${y === thisYear ? '' : ` ${y}`}`;
}

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

interface APhrase { verbPhrase: string; thing: string | null; tail: string | null; aim: ATeamAim }

function aPhraseFor(aim: ATeamAim): APhrase | null {
  const raw = (aim.name ?? '').trim().replace(/[.!?;:]+$/, '').replace(/\s+/g, ' ');
  if (!raw || raw.split(' ').length > 14 || SAID_AS_A_SENTENCE.test(aim.name.trim())) return null;
  const tailMatch = raw.match(A_TIME_AT_THE_END);
  const tail = tailMatch ? tailMatch[1] : null;
  const body = tailMatch ? raw.slice(0, tailMatch.index).trim() : raw;
  if (!body) return null;
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
  if (aim.journeyDirection === 'down') return { verbPhrase: `bring ${thing} down to ${read(aim.target)}`, thing, tail, aim };
  return { verbPhrase: `reach ${read(aim.target)} ${thing}`, thing, tail, aim };
}

function aBar(aim: ATeamAim): AHeadlineBar | null {
  if (typeof aim.target !== 'number' || aim.target <= 0 && aim.direction !== 'LIMIT') return null;
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  if (aim.direction === 'LIMIT') {
    return { objectiveId: aim.id, kind: 'limit', now: aim.count, target: aim.target, filled: aim.target > 0 ? clamp((aim.count / aim.target) * 100) : 100, word: aim.word };
  }
  const start = aim.journeyDirection === 'down' ? (aim.start ?? aim.count) : (aim.start ?? 0);
  const way = aim.target - start;
  const filled = way === 0 ? 100 : clamp(((aim.count - start) / way) * 100);
  return { objectiveId: aim.id, kind: 'aim', now: aim.count, target: aim.target, filled, word: aim.word };
}

function anAnswerFor(p: APhrase, when: string | null): string {
  const a = p.aim;
  const target = a.target as number;
  if (a.direction === 'LIMIT') {
    return a.count > target
      ? `So far it is ${read(a.count)}, which is ${read(a.count - target)} over the limit of ${read(target)}.`
      : `So far it is ${read(a.count)}, within the limit of ${read(target)}.`;
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
export function theHeadlineQuestion(aims: ATeamAim[], deadline: Date | null, now: Date = new Date()): AHeadline | null {
  const phrases = aims.map(aPhraseFor).filter((p): p is APhrase => !!p);
  const counted = phrases.filter((p) => typeof p.aim.target === 'number').slice(0, 2);
  const byDate = deadline ? `by ${theDayInWords(deadline, now)}` : null;
  if (counted.length) {
    const tails = [...new Set(counted.map((p) => p.tail?.toLowerCase() ?? ''))];
    const oneTail = tails.length === 1 ? counted[0].tail : null;
    const parts = counted.map((p) => (oneTail || !p.tail ? p.verbPhrase : `${p.verbPhrase} ${p.tail}`));
    const joined = parts.length === 2 && parts[0].startsWith('reach ') && parts[1].startsWith('reach ')
      ? `reach ${parts[0].slice(6)} and ${parts[1].slice(6)}`
      : parts.join(' and ');
    const when = oneTail ?? (counted.some((p) => p.tail) ? null : byDate);
    const question = `Will we ${joined}${when ? ` ${when}` : ''}?`;
    const answer = counted.map((p) => anAnswerFor(p, counted.length === 1 ? (p.tail ?? byDate) : null)).join(' ');
    return { question, answer, bars: counted.map((p) => aBar(p.aim)).filter((b): b is AHeadlineBar => !!b) };
  }
  const words = phrases.find((p) => p.aim.target == null);
  if (!words || !(words.tail || byDate)) return null;
  return { question: `Will we ${words.verbPhrase} ${words.tail ?? byDate}?`, answer: null, bars: [] };
}
