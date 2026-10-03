/**
 * THE REST OF THE WEEKLY REPORT (week 12b, screens request 9 part d, decision 43).
 *
 * The prototype's weekly report (docs/prototype/screens/B4-reports-and-sharing/weekly-report.txt and
 * weekly-report-operations.txt) has, under its heading "This week, 21 to 23 Sep, so far":
 *
 *   The week in numbers                          a few figures, each with what it is of
 *   What this week shows                         a sentence about each person, and what came up across the team
 *   Things that happened in three check-ins in a row
 *   What people said, and what the proof shows
 *   What changed                                 Moved, Dropped, Adapted, Result
 *   For you to do next week                      each with why, and "This comes from ..."
 *
 * TWO STEPS, AS EVERY OTHER REPORT HERE. When a check-in comes in, the service reads the week's record
 * and keeps the FACTS (counts, who said what by report label, which commitments settled, which targets
 * moved). Nothing about a reader is decided then, and no name is kept: every person is a report label.
 * When the page is opened, nothing is rebuilt: the kept facts are worded for that one reader, and only
 * the facts that reader may read are used. Every sentence then goes through `withNames`, the wrapper
 * that swaps names in, so a copy without names and a copy with names come from the same words.
 *
 * NO MODEL. Every sentence is written by the product from the record, so nothing can be invented and no
 * prompt or PromptVersion is involved. The prototype's opening line ("People are busy, but some sales
 * move forward much more than others.") compares people, which a sentence written from counts cannot do
 * honestly, so it is not written. See docs/answers-from-engine.md.
 *
 * NOTHING HERE IS A RATING OR A LABEL ON A PERSON. Counts are counts of things said or done, never a
 * proportion of a person shown to somebody else. How anybody's answers were rated is never read.
 */

import { aNumberPeopleCanRead, theNumbersPeopleCanRead, theAimItself, yourOwnAimIsYours, THE_NAME_TO_DO } from '../board/an-aim-is-a-sentence-about-somebody';
import { asADirection, whatTheWordsSuggest } from '../board/an-aim-or-a-limit';
import { aDeadlineIsDone } from '../board/a-measure-that-goes-down-is-still-going-well';
import { aCountThatMovedSaid, theMoneyItCountsIn } from './a-count-that-moved-is-one-sentence';
import { inOurVoice } from './what-the-record-shows-over-time';
import { theWeekOf } from './the-weekly-sentence-about-each-person';

/* ------------------------------------------------------------------------------------------------
 * WHAT IS KEPT WHEN A CHECK-IN COMES IN. Report labels, never names.
 * ---------------------------------------------------------------------------------------------- */

export interface AWeeksTarget {
  id: string;
  name: string;
  target: number | null;
  direction: 'AIM' | 'LIMIT' | 'RATE' | 'DEADLINE' | 'ZERO' | null;
  ownerParticipantId: string | null;
  isADecisionAboutAPerson: boolean;
  count: number;
  /** The count before the week's first check-in, where there is one to compare with. */
  from: number | null;
  /** The person who holds it set it themselves (decision 75, item 37). Absent on a week kept before. */
  setByTheHolder?: boolean;
}

export interface AWeeksCommitment {
  participantId: string | null;
  /** What was committed to, as the end of a sentence in our voice ("call Green Mart by Friday"), or null. */
  clause: string | null;
  status: 'DONE' | 'NOT_DONE' | 'DROPPED' | 'UNKNOWN';
  whenSaid: string | null;
}

export interface AWeeksHandoff {
  fromParticipantId: string;
  onParticipantId: string | null;
  onLabel: string | null;
  what: string;
}

export interface AWeeksCount {
  participantId: string;
  /** Things the person said this week (not what good looks like, not disputed). */
  said: number;
  /** Of those, with a photo or document behind them. */
  documented: number;
  /** Numbers given as an estimate, in their own words. */
  estimated: number;
  /** Numbers given from memory, with nothing attached. */
  fromMemory: number;
}

export type WhereItComesFrom = 'a blocker' | 'a disagreement' | 'something that kept happening' | 'the plan' | 'your own notes';

export interface AThingForTheLead {
  do: string;
  why: string;
  changes?: string;
  from: WhereItComesFrom;
}

export interface TheWeeksFacts {
  version: 2;
  cadence: string | null;
  /** When the last check-in of the week came in, so the heading can say "21 to 23 Sep". */
  lastAt: string | null;
  /** The periods the week's check-ins belong to, as pattern rows count them (period-of.ts). */
  periods: number[];
  eachPerson: { participantId: string; says: string }[];
  checkIns: { due: number; made: number };
  counts: AWeeksCount[];
  targets: AWeeksTarget[];
  /** Things two or more people named this week, with who named each. */
  namedByMoreThanOne: { name: string; who: string[] }[];
  settled: AWeeksCommitment[];
  /** What people said this week they would do, still open. */
  open: AWeeksCommitment[];
  cleared: AWeeksHandoff[];
  /** For the person who runs the check-in only, written by report label. */
  forTheLead: AThingForTheLead[];
}

/** The row as stored: the first version kept only the array of sentences. */
export function theFactsIn(stored: unknown): TheWeeksFacts | null {
  if (stored && typeof stored === 'object' && !Array.isArray(stored) && (stored as any).version === 2) return stored as TheWeeksFacts;
  return null;
}

export function theSentencesIn(stored: unknown): { participantId: string; says: string }[] {
  if (Array.isArray(stored)) return stored as any[];
  return theFactsIn(stored)?.eachPerson ?? [];
}

/* ------------------------------------------------------------------------------------------------
 * THE HEADING
 * ---------------------------------------------------------------------------------------------- */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A day in Lagos, as the heading says it: its day of the month and its month. */
function aDayInLagos(d: Date): { day: number; month: string; key: string } {
  const lagos = new Date(d.getTime() + 60 * 60 * 1000);
  return { day: lagos.getUTCDate(), month: MONTHS[lagos.getUTCMonth()], key: lagos.toISOString().slice(0, 10) };
}

/**
 * "This week, 21 to 23 Sep, so far", as the prototype heads it, while the week is still going. A week
 * that has ended reads "The week of 21 to 25 Sep". The last day is the day the last check-in came in.
 */
export function theWeeksHeading(weekStart: string, lastAt: Date | string | null, now: Date = new Date()): string {
  const start = aDayInLagos(new Date(`${weekStart}T00:00:00+01:00`));
  const end = lastAt ? aDayInLagos(new Date(lastAt)) : start;
  const range = end.key <= start.key
    ? `${start.day} ${start.month}`
    : start.month === end.month ? `${start.day} to ${end.day} ${end.month}` : `${start.day} ${start.month} to ${end.day} ${end.month}`;
  return theWeekOf(now).key === weekStart ? `This week, ${range}, so far` : `The week of ${range}`;
}

/** The sentence under the heading, from the prototype. A check-in that is not daily has no daily reports. */
export function whatThisReportIs(cadence: string | null): string {
  const first = cadence === 'DAILY' ? 'The daily reports show each day.' : 'The report for each check-in shows that check-in.';
  return `${first} This weekly report shows what kept happening for three check-ins in a row or more.`;
}

/* ------------------------------------------------------------------------------------------------
 * THE WEEK IN NUMBERS
 * ---------------------------------------------------------------------------------------------- */

export interface AFigure {
  /** "96%", "14", "254,000". */
  figure: string;
  /** What the figure is of, as the prototype's tile says it: "of check-ins made this week". */
  of: string;
  /** The same, as a full sentence. */
  says: string;
}

const were = (n: number) => (n === 1 ? 'was' : 'were');

export function theCheckInsMade(due: number, made: number): AFigure | null {
  if (due <= 0) return null;
  const m = Math.min(made, due);
  const says = due === 1
    ? m === 1 ? 'The one check-in due this week was made.' : 'The one check-in due this week has not been made yet.'
    /* Two is "both" and "neither", never "all 2"; none is "none", never "0 of the 3" (the reviewer's read, as on the You board). */
    : due === 2 && m === 2 ? 'Both check-ins due this week were made.'
    : due === 2 && m === 0 ? 'Neither of the two check-ins due this week has been made yet.'
    : m === due ? `All ${due} check-ins due this week were made.`
    : m === 0 ? `None of the ${due} check-ins due this week has been made yet.`
    : `${m} of the ${due} check-ins due this week ${were(m)} made.`;
  return { figure: `${Math.round((m / due) * 100)}%`, of: 'of check-ins made this week', says };
}

export function theThingsWithProof(said: number, documented: number, yours: boolean): AFigure | null {
  if (said <= 0) return null;
  const things = yours ? 'things you said' : 'things people said';
  const has = documented === 1 ? 'has' : 'have';
  const says = documented === 0
    ? `None of the ${said} ${things} this week ${said === 1 ? 'has' : 'have'} a photo or document behind ${said === 1 ? 'it' : 'them'} yet.`
    : documented === said
      ? said === 1 ? `The one thing ${yours ? 'you' : 'people'} said this week has a photo or document behind it.` : `All ${said} ${things} this week have a photo or document behind them.`
      : `${documented} of the ${said} ${things} this week ${has} a photo or document behind ${documented === 1 ? 'it' : 'them'}.`;
  return { figure: String(documented), of: `${things} this week with a photo or document behind them`, says };
}

/** Whose a target is, for this reader: the team's, the reader's own, or somebody's by report label. */
export type Whose = 'team' | 'you' | { label: string };

const lowerFirst = (s: string) => (/^\p{Lu}\p{Ll}/u.test(s) && !/^\p{Lu}\p{Ll}+\s+\p{Lu}/u.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/**
 * ONE TARGET, AS THE WEEK MOVED IT. The aim or limit itself, and whether it has been reached or gone
 * over, only where `againstTheAim` (the person who runs the check-in, as everywhere else). The
 * direction is the one the lead set; where none is set, the words of the name are read, as on the
 * board (decision 69).
 */
export function aTargetThisWeek(t: AWeeksTarget, whose: Whose, againstTheAim: boolean): AFigure | null {
  const name = (t.name ?? '').trim();
  if (!name) return null;
  const readable = theNumbersPeopleCanRead(name).replace(/[.]+$/, '');
  const money = theMoneyItCountsIn(readable);
  const direction = asADirection(t.direction) ?? whatTheWordsSuggest(name, t.target);
  /* A share is said with its "%" (decision 75, item 17). */
  const n = (x: number) => (direction === 'RATE' ? `${aNumberPeopleCanRead(x)}%` : `${aNumberPeopleCanRead(x)}${money && x !== 0 ? ` ${money}` : ''}`);
  /* A person's own aim is said as theirs, never as a number somebody set for them (decision 75, item 37). */
  const whoseWords = whose === 'team' ? ''
    /* "3 shops in Kilimani, your own aim" and ", Amani Wekesa's own aim" (request 117, part 11). */
    : t.setByTheHolder ? (whose === 'you' ? ', your own aim' : `, ${whose.label}'s own aim`)
      : whose === 'you' ? ', your own number' : `, ${whose.label}'s number`;
  /* "Tobi to close 8 renewals per quarter" is what is counted, "close 8 renewals per quarter", with whose it is after it. */
  const whatIsDone = THE_NAME_TO_DO.exec(readable)?.[2];
  const of = `${(t.setByTheHolder && whose !== 'team' ? theAimItself(name, null) : null) ?? lowerFirst(whatIsDone ?? readable)}${whoseWords}`;

  let says: string;
  if (t.from != null && t.from !== t.count) {
    says = aCountThatMovedSaid(
      { name, target: t.target, count: t.count, prevCount: t.from, direction },
      {
        whose: whose === 'team' ? 'team' : whose === 'you' ? 'you' : { name: whose.label },
        againstTheAim,
        about: {
          speaker: null,
          /* The reader's own aim is written about "You", then made theirs: "You set yourself an aim of ...". */
          holder: typeof whose === 'object' ? whose.label : whose === 'you' && t.setByTheHolder ? 'You' : null,
          setByTheHolder: !!t.setByTheHolder,
        },
      },
    ) ?? `It went from ${n(t.from)} to ${n(t.count)} this week.`;
    says = yourOwnAimIsYours(says);
    const moved = `went from ${n(t.from)} to ${n(t.count)}`;
    says = says.includes(moved) ? says.replace(moved, `${moved} this week`) : says.replace(/\.$/, ' this week.');
  } else if (t.from != null) {
    says = direction === 'ZERO' && t.count === 0 ? 'There were none again this week, which is where it should stay.' : `It stayed at ${n(t.count)} this week.`;
  } else {
    says = `It is at ${n(t.count)}, and there is no earlier count this week to compare it with.`;
  }
  /* Each of the other kinds says what it is, to whoever reads the figure (decision 75, item 17). */
  if (direction === 'ZERO' && t.count > 0) says += /should stay at zero/.test(says) ? ' Any at all is a breach.' : ' This should stay at zero, so any at all is a breach.';
  if (direction === 'DEADLINE') {
    /* A date is met or not: the figure says which, never a count of 0 or 1. */
    const done = aDeadlineIsDone(t.count, t.target);
    const doneThisWeek = done && t.from != null && !aDeadlineIsDone(t.from, t.target);
    return { figure: done ? 'Done' : 'Not done yet', of, says: doneThisWeek ? 'It was done this week.' : done ? 'It is done.' : 'It is a date to meet, and it is not done yet.' };
  }
  if (againstTheAim && typeof t.target === 'number') {
    /* The limit or the aim is said once: where the sentence already gave it, it is not repeated. */
    const ofIt = says.includes(n(t.target)) ? '' : ` of ${n(t.target)}`;
    if (direction === 'LIMIT' && t.count > t.target) says += ` That is ${n(t.count - t.target)} over the limit${ofIt}.`;
    else if (direction === 'AIM' && t.count >= t.target && t.target > 0) says += ` The aim${ofIt} has been reached.`;
    else if (direction === 'RATE') {
      says += ofIt
        ? (t.count >= t.target ? ` That meets the aim${ofIt} or more.` : ` That is below the aim${ofIt} or more.`)
        : (t.count >= t.target ? ' That meets it.' : ' That is below it.');
    }
  }
  return { figure: n(t.count), of, says };
}

/** Whether the target moved this week, for "What changed". */
export const movedThisWeek = (t: AWeeksTarget) => t.from != null && t.from !== t.count;

/* ------------------------------------------------------------------------------------------------
 * WHAT THIS WEEK SHOWS, ACROSS THE TEAM
 * ---------------------------------------------------------------------------------------------- */

const andList = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** "Green Mart came up in what Participant A and Participant B said this week." Labels, named when served. */
export function whatCameUpAcrossTheTeam(shared: { name: string; who: string[] }[]): string[] {
  return shared.slice(0, 3).map((s) =>
    s.who.length > 2
      ? `${s.name} came up in what ${s.who.length} people said this week, ${andList(s.who)}.`
      : `${s.name} came up in what ${andList(s.who)} said this week.`,
  );
}

/* ------------------------------------------------------------------------------------------------
 * WHAT PEOPLE SAID, AND WHAT THE PROOF SHOWS
 * ---------------------------------------------------------------------------------------------- */

/** Totals only: a count of things said, never a proportion of one person shown to somebody else. */
export function whatWasSaidAndWhatTheProofShows(c: Omit<AWeeksCount, 'participantId'>, yours: boolean): string | null {
  if (c.said <= 0) return null;
  const parts: string[] = [];
  parts.push(yours
    ? `This week, you said ${c.said} ${c.said === 1 ? 'thing' : 'things'} in your check-ins.`
    : `This week, people said ${c.said} ${c.said === 1 ? 'thing' : 'things'} in their check-ins.`);
  if (c.documented === 0) parts.push(c.said === 1 ? 'It has no photo or document behind it yet.' : 'None of them has a photo or document behind it yet.');
  else if (c.documented === c.said) parts.push(c.said === 1 ? 'It has a photo or document behind it.' : 'All of them have a photo or document behind them.');
  else parts.push(`${c.documented} of them ${c.documented === 1 ? 'has' : 'have'} a photo or document behind ${c.documented === 1 ? 'it' : 'them'}.`);
  const est = c.estimated;
  const mem = c.fromMemory;
  if (est || mem) {
    const e = est ? `${est} ${est === 1 ? 'number was' : 'numbers were'} given as an estimate` : '';
    const m = mem ? `${mem} ${mem === 1 ? 'number was' : 'numbers were'} given from memory with nothing attached` : '';
    const both = e && m ? `${e}, and ${m}` : e || m;
    parts.push(`${both.charAt(0).toUpperCase()}${both.slice(1)}, so ${est + mem === 1 ? 'it cannot' : 'they cannot'} be checked yet.`);
    parts.push(`It is worth confirming ${est + mem === 1 ? 'it' : 'them'} before acting on ${est + mem === 1 ? 'it' : 'them'}.`);
  }
  return parts.join(' ');
}

/* ------------------------------------------------------------------------------------------------
 * WHAT CHANGED
 * ---------------------------------------------------------------------------------------------- */

export interface WhatChanged {
  moved: string[];
  dropped: string[];
  result: string[];
}

export const NOTHING_MOVED = 'Nothing was marked as done this week yet.';
export const NOTHING_DROPPED = 'Nothing was dropped this week.';
export const NO_RESULT = 'No number was recorded as moving this week.';

/** Who did it, by label, or "You" for the reader. */
export function aCommitmentThatSettled(c: AWeeksCommitment, who: string): string | null {
  const isYou = who === 'You';
  if (c.status === 'DONE') {
    return c.clause ? `${who} committed to ${c.clause}, and it is now done.` : `${isYou ? 'One of your commitments' : `One of ${who}'s commitments`} is now done.`;
  }
  if (c.status === 'DROPPED') {
    return c.clause ? `${who} committed to ${c.clause}, and it has been dropped.` : `${isYou ? 'One of your commitments' : `One of ${who}'s commitments`} has been dropped.`;
  }
  if (c.status === 'NOT_DONE') {
    return c.clause ? `${who} committed to ${c.clause}, and it was not done.` : `${isYou ? 'One of your commitments' : `One of ${who}'s commitments`} was not done.`;
  }
  return null;
}

const inASentence = (phrase: string): string => {
  const t = (phrase ?? '').trim().replace(/[.!?]+$/, '');
  return /^(The|A|An|Whether|What|How|Who|When|Where|Which|Why|If|This|That|Our|Their|His|Her|Its)\b/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
};

/** "Participant A is no longer waiting on Participant B for the price list." */
export function aHandoffThatCleared(d: AWeeksHandoff, who: string, onWhom: string | null): string {
  const what = inASentence(d.what);
  const forWhat = /^(whether|how|what|which|who|when|where|if)\b/i.test(what) ? `for a decision on ${what}` : `for ${what}`;
  return `${who} ${who === 'You' ? 'are' : 'is'} no longer waiting${onWhom ? ` on ${onWhom}` : ''} ${forWhat}.`;
}

/* ------------------------------------------------------------------------------------------------
 * FOR YOU TO DO NEXT WEEK
 * ---------------------------------------------------------------------------------------------- */

export interface AThingToDo {
  do: string;
  why: string;
  /** "This comes from a blocker.", as the prototype says it. */
  comesFrom: string;
}

export const COMES_FROM: Record<WhereItComesFrom | 'what you said you would do', string> = {
  'a blocker': 'This comes from a blocker.',
  'a disagreement': 'This comes from a disagreement in the team.',
  'something that kept happening': 'This comes from something that kept happening.',
  'the plan': 'This comes from the plan.',
  'your own notes': 'This comes from something you wrote down to decide.',
  'what you said you would do': 'This comes from what you said you would do.',
};

/** Where one of Today's "what only the lead can settle" items comes from, read off its id. */
export function whereItComesFrom(id: string): WhereItComesFrom {
  if (id.startsWith('handoff-')) return 'a blocker';
  if (id.startsWith('difference-')) return 'a disagreement';
  if (id.startsWith('pattern-talk-')) return 'something that kept happening';
  if (id.startsWith('note-')) return 'your own notes';
  return 'the plan';
}

export function forTheLeadToDo(t: AThingForTheLead): AThingToDo {
  /* A note written as a question ("Whether to hire a second driver") is something to decide. */
  const d = (t.do ?? '').trim();
  const doIt = /^(whether|how|what|which|who|when|where|if)\b/i.test(d) ? `Decide ${d.charAt(0).toLowerCase()}${d.slice(1)}` : d;
  return { do: doIt, why: [t.why, t.changes].filter(Boolean).join(' '), comesFrom: COMES_FROM[t.from] };
}

/** A person's own open commitment from this week, as something for them to do next week. */
export function yourOwnToDo(c: AWeeksCommitment): AThingToDo | null {
  if (!c.clause) return null;
  return {
    do: `${c.clause.charAt(0).toUpperCase()}${c.clause.slice(1)}.`,
    why: 'You said this week that you would do this, and it is still open.',
    comesFrom: COMES_FROM['what you said you would do'],
  };
}

export const ourVoice = inOurVoice;
