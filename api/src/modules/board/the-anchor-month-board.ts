import type { TheMonthBoard, TheLens, APersonHelpingThingsMove } from '../entry/the-anchor-served-shapes';
import type { TheMonthRecord } from './the-anchor-month-record';

/**
 * THE LEAD'S MONTH BOARD, "Are we moving together?" (docs/anchor-scenario.md, section 24; decisions 11, 94 and 96
 * item 14; request 149). Built from the record, with no model call, in plain sentences. Never a score, never a
 * number out of ten, and no label on anybody.
 *
 * THE WEEK. It is read from the record's own clock (the newest thing the board is built from), never from the
 * moment it is opened, so the board reads the same until something new comes in (decision 7).
 *
 * PATTERNS. In weeks one and two "What's still getting in the way" uses what people said is in their way and the
 * differences between accounts. Patterns appear from week three, in the same words the board already serves them.
 *
 * WHAT STAYS EMPTY. Ideas and the people helping things move need records that are not built yet (ideas, piece 19;
 * hidden contributors, piece 22). Ideas say none has been captured. The people list is empty.
 */
const NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export const aNumber = (n: number) => (n <= 10 ? NUMBERS[n] : String(n));
export const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const DAY = 86_400_000;
export function theWeekOfTheMonth(startedOn: Date | null, clock: Date | null): 1 | 2 | 3 | 4 {
  if (!startedOn || !clock) return 1;
  const weeks = Math.floor((clock.getTime() - startedOn.getTime()) / (7 * DAY)) + 1;
  return Math.min(4, Math.max(1, weeks)) as 1 | 2 | 3 | 4;
}

/** One handoff, said as a sentence: who is waiting, on whom, and for what. */
export function aWaitInAWords(w: { from: string; on: string | null; what: string | null }): string {
  const what = (w.what ?? '').trim().replace(/[.\s]+$/, '');
  const forWhat = what && what.length <= 120 ? ` for ${what}` : '';
  return `${w.from} is waiting on ${w.on ?? 'someone outside this check-in'}${forWhat}.`;
}

/** "You and Amani see this differently." with the topic said in quotation marks, so no colon joins the two. */
export function aDifferenceInAWords(d: { topic?: string | null; whoSeesIt?: string | null }): string | null {
  const topic = (d.topic ?? '').trim().replace(/[.\s]+$/, '');
  const who = (d.whoSeesIt ?? '').trim();
  if (!topic) return who || null;
  if (who.endsWith('see this differently.')) return `${who.slice(0, -'see this differently.'.length)}see "${topic}" differently.`;
  return `${who || 'People see this differently.'} It is about "${topic}".`;
}

const THE_QUESTIONS = {
  understanding: 'Do people see the bigger picture?',
  ownership: 'Are they carrying outcomes rather than only assigned tasks?',
  contribution: 'Are they bringing ideas, insights and help?',
  action: 'Is understanding translating into actual movement?',
} as const;

export const NO_IDEA_YET = 'No idea from your team has been captured yet.';

/** How many ideas the team has captured (piece 19), as a sentence. Never who raised the most. */
export function ideasSaid(r: { ideas?: unknown[] }): string {
  const n = (r.ideas ?? []).length;
  return n ? `${capital(aNumber(n))} ${n === 1 ? 'idea' : 'ideas'} from your team ${n === 1 ? 'has' : 'have'} been captured.` : NO_IDEA_YET;
}

export function theLenses(r: TheMonthRecord, differences: string[]): TheLens[] {
  const heard = r.checkedIn === 0
    ? 'Nobody has given Groundwork an account yet, so there is nothing to compare with what you said.'
    : `Groundwork has heard from ${aNumber(r.checkedIn)} of ${aNumber(r.ofHowMany)} ${plural(r.ofHowMany, 'person', 'people')}.${differences.length ? ` ${capital(aNumber(differences.length))} ${plural(differences.length, 'thing is', 'things are')} seen differently by different people.` : ''}`;
  const owns = r.saidWhatTheyWillDo === 0
    ? 'Nobody has said yet what they will do themselves.'
    : `${capital(aNumber(r.saidWhatTheyWillDo))} of ${aNumber(r.ofHowMany)} ${plural(r.ofHowMany, 'person has', 'people have')} said what they will do themselves.`;
  const moved = r.commitmentsDone + r.commitmentsOpen + r.waiting.length + r.handoffsCleared === 0
    ? 'Nobody has said they would do anything yet, so there is no movement to read yet.'
    : `${capital(aNumber(r.commitmentsDone))} of the things people said they would do ${plural(r.commitmentsDone, 'is', 'are')} done and ${aNumber(r.commitmentsOpen)} ${plural(r.commitmentsOpen, 'is', 'are')} still open. ${capital(aNumber(r.waiting.length))} ${plural(r.waiting.length, 'handoff is', 'handoffs are')} still waiting on someone.`;
  return [
    { key: 'understanding', heading: 'Understanding', question: THE_QUESTIONS.understanding, reading: heard },
    { key: 'ownership', heading: 'Ownership', question: THE_QUESTIONS.ownership, reading: owns },
    { key: 'contribution', heading: 'Contribution', question: THE_QUESTIONS.contribution, reading: ideasSaid(r) },
    { key: 'action', heading: 'Action', question: THE_QUESTIONS.action, reading: moved },
  ];
}

export function whatIsMoving(r: TheMonthRecord): string[] {
  const out: string[] = [];
  if (r.commitmentsDone > 0) out.push(`${capital(aNumber(r.commitmentsDone))} of the things people said they would do ${plural(r.commitmentsDone, 'is', 'are')} done.`);
  if (r.handoffsCleared > 0) out.push(`${capital(aNumber(r.handoffsCleared))} ${plural(r.handoffsCleared, 'handoff that was', 'handoffs that were')} waiting on someone ${plural(r.handoffsCleared, 'has', 'have')} been cleared.`);
  if (r.saidWhatTheyWillDo > 0) out.push(`${capital(aNumber(r.saidWhatTheyWillDo))} ${plural(r.saidWhatTheyWillDo, 'person has', 'people have')} said what they will do themselves.`);
  return out.length ? out : ['Nothing has moved yet that the record can show.'];
}

export function whatGroundworkIsWorkingOn(r: TheMonthRecord): string[] {
  const out: string[] = [];
  if (r.notYetThisRound > 0) out.push(`Groundwork is checking in with the ${aNumber(r.notYetThisRound)} ${plural(r.notYetThisRound, 'person who has', 'people who have')} not yet answered this round.`);
  if (r.commitmentsOpen > 0) out.push(`Groundwork will ask about the ${aNumber(r.commitmentsOpen)} ${plural(r.commitmentsOpen, 'thing', 'things')} people said they would do that ${plural(r.commitmentsOpen, 'is', 'are')} still open.`);
  if (r.waiting.length > 0) out.push(`Groundwork will ask about the ${aNumber(r.waiting.length)} ${plural(r.waiting.length, 'handoff', 'handoffs')} still waiting on someone.`);
  return out.length ? out : ['Groundwork is waiting for the first check-ins to come in.'];
}

/**
 * THE RECOGNITION SENTENCE (piece 22; decision 96 item 9: a person sees the same sentence the lead sees about their
 * contribution). What they did, from what they said they would do, in a sentence. No grade, no count, no label.
 */
export function aContributionSaid(name: string | null, clause: string, settledBy?: string | null): string {
  const what = clause.trim().replace(/[.!?]+$/, '');
  const who = name ?? 'You';
  const mid = name ?? 'you';
  /*
   * AND HOW IT IS KNOWN, as the commitment line over time says it (review of piece 22). SAID, or not said: their own
   * word. PROVEN: a document they added. CONFIRMED: the colleague who was waiting on it, who is not named, because the
   * record keeps that it was confirmed and not by whom.
   */
  const how = String(settledBy ?? '').toUpperCase();
  const known = how === 'PROVEN' ? `a document ${mid} added shows it is done`
    : how === 'CONFIRMED' ? 'the colleague who was waiting on it confirmed it is done'
      : name ? `${name} says it is done` : 'you say it is done';
  return `${who} committed to ${what}, and ${known}.`;
}

export function theMonthBoard(input: {
  record: TheMonthRecord;
  /** The record's own clock: when the board last changed. */
  clock: Date | null;
  /** Where people differ, already said as sentences. */
  differences: string[];
  /** What keeps coming up, as the board already serves it to the lead. Used from week three only. */
  patterns: string[];
}): TheMonthBoard {
  const { record: r } = input;
  const week = theWeekOfTheMonth(r.startedOn, input.clock);
  const inTheWay = [...r.waiting.map(aWaitInAWords), ...(week >= 3 ? input.patterns : [])];
  /* Hidden contributors (piece 22): one specific thing each person did, from their own promise, said as a fact. */
  const people: APersonHelpingThingsMove[] = (r.doneByPerson ?? []).map((d) => ({ name: d.name, sentence: aContributionSaid(d.name, d.clause, d.settledBy) }));
  return {
    question: 'Are we moving together?',
    weekOfTheMonth: week,
    lenses: theLenses(r, input.differences),
    whatIsMoving: whatIsMoving(r),
    whatTheTeamIsContributing: [ideasSaid(r)],
    peopleHelpingThingsMove: people,
    wherePerspectivesDiffer: input.differences.length
      ? input.differences
      : [r.checkedIn < 2 ? 'Groundwork needs at least two accounts before it can show where they differ.' : 'No two people have described the same thing differently so far.'],
    whatIsStillGettingInTheWay: inTheWay.length ? inTheWay : ['Nobody has said that anything is in their way.'],
    whatGroundworkIsWorkingOnNext: whatGroundworkIsWorkingOn(r),
  };
}
