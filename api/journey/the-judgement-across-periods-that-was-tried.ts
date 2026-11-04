/**
 * TRIED AND NOT KEPT, 2 October 2026: kept here only so the measurement can be run again
 * (JUDGE=1 and JUDGED_WALK=1 in the-detector-read-twice.ts). The product does not run this. Measured on
 * six-a and six-b, it was no steadier (72% of shown pairs the same, before and after), fewer people were
 * shown exactly the same (62% to 56%), and it showed far more beyond the real patterns (47 to 169). See
 * the morning report.
 *
 * FOUR PATTERNS THAT CAN ONLY SHOW OVER TIME ARE JUDGED ONCE, ACROSS THEIR PERIODS
 * (decision 75, item 42, 2 October 2026).
 *
 * WHY. "Promise made again" (E2), "confident reporting beside undelivered work" (B2), "the same
 * problem raised and never fixed" (K3) and "problems put down to things outside the team" (B11) are
 * about a person over time. Each period was decided on its own: five reads of this check-in, three
 * to agree. The same conversations read twice then counted these in different periods, and what a
 * person was shown flipped on the three-period line. Their deciding periods were kept by about half
 * of thirty reads, so more reads of one period could not make them steady.
 *
 * WHAT THIS DOES. For these four codes only, and only while the pattern is not yet shown, the
 * detector makes one judgement over the person's own record across the periods it can see: this
 * period's whole check-in and the two earlier periods of their own record, exactly the text the
 * detector is already given. It is read five times at the steady setting. For each code, each
 * period counts when most of the reads say the pattern shows there. The periods it can see are then
 * set to what the judgement found, so the judgement can confirm a period or drop one.
 *
 * WHAT IT DOES NOT CHANGE. The three-period rule (a pattern is shown once it holds in three periods),
 * who reads a pattern (decision 74), every other code, the codes, names, coaching and probes. A
 * pattern already shown stays shown and is decided period by period as before. A tie goes the way
 * the period was already counted. The same filters still apply to what the judgement says: a
 * pattern never rests on a record nobody holds, and K3 and B11 are never written about somebody who
 * is waiting on another person here.
 */
import { BAD_FAITH_CODES, POSITIVE_CODES, CARRYING_CODES, PATTERN_DETECTION_PROMPT } from '../src/modules/patterns/pattern-library';
import { restsOnARecordNobodyHolds } from '../src/modules/patterns/a-pattern-does-not-rest-on-a-record-nobody-holds';
import { periodOf } from '../src/modules/patterns/period-of';
import { MOST_EARLIER_LINES } from '../src/modules/patterns/the-detector-reads-their-own-earlier-record';

/** The four codes decided once across their periods. */
export const JUDGED_ONCE_CODES = ['E2', 'B2', 'K3', 'B11'] as const;
export const isJudgedOnce = (code: string) => (JUDGED_ONCE_CODES as readonly string[]).includes(code);

/** How many times the judgement is read, and how many of those must come back for it to decide anything. */
export const JUDGEMENT_READS = 5;
export const JUDGEMENTS_THAT_MUST_COME_BACK = 3;

/** How the model names each period it can see; this period first, then the earlier ones, newest first. */
export const PERIOD_LABELS = ['THIS_PERIOD', 'ONE_PERIOD_BEFORE', 'TWO_PERIODS_BEFORE'] as const;

/**
 * Which of the periods it can see the judgement decides. All of them: the earliest one is judged with
 * the later evidence in view too. (Measured against deciding only the two newest; see the morning report.)
 */
export const PERIODS_THE_JUDGEMENT_DECIDES = 3;

/** The periods the judgement can see, this period first, then the earlier ones newest first. */
export function thePeriodsItCanSee(thisPeriod: number, earlierPeriods: number[]): number[] {
  return [thisPeriod, ...earlierPeriods.filter((p) => p < thisPeriod).sort((a, b) => b - a)].slice(0, PERIOD_LABELS.length);
}

/** The periods whose counting the judgement may change. */
export function thePeriodsItDecides(window: number[]): number[] {
  return window.slice(0, PERIODS_THE_JUDGEMENT_DECIDES);
}

/*
 * A model instruction, read by the detector only. It is the detector's own instruction, every code and
 * every rule on what counts, so the line of what counts is the detector's line. Only the task differs:
 * the detector sees the periods together and says, for each code, in which of them it shows. A first
 * version asked about the four codes alone, and it found them far more often than the detector's own
 * reads did, on the same record (2 October 2026, see the morning report).
 */
const THE_DETECTORS_RULES_AND_CODES = PATTERN_DETECTION_PROMPT.slice(PATTERN_DETECTION_PROMPT.indexOf('Hard rules:'));

export const JUDGED_ONCE_PROMPT = `You analyse ONE party's own record across the periods you can see, and identify whether any behavioural pattern signals are present in it, and in which periods. You are looking at the record, not judging the person. Some of these signals are good news and some are not, and both matter equally.

The text names the periods you can see. THIS_PERIOD has the whole check-in. ONE_PERIOD_BEFORE and TWO_PERIODS_BEFORE, when they are there, are the lines this person recorded then, in the section headed "WHAT THIS PERSON THEMSELVES RECORDED IN THE LAST TWO PERIODS". Judge the periods together, once, as one picture of the same person over time: use the earlier periods to tell a repeat from a first time, and the later ones to tell whether something was ever done or fixed. Every rule below applies to each period on its own terms: a code shows in a period only when its signal is genuinely present in that period's evidence. The earliest period you can see may repeat something from before it that you cannot see; judge it only on what you can see.

${THE_DETECTORS_RULES_AND_CODES}

For each code you return, say in which of the periods you can see it shows (showsIn), and write the one-sentence observation about the latest of those periods.`;

/** Every code the detector may name, as in its own schema; only the four judged once are used. */
const EVERY_CODE = [...BAD_FAITH_CODES, ...POSITIVE_CODES, ...CARRYING_CODES].map((c) => c.code);

export function judgedOnceSchema(labels: string[]) {
  return {
    name: 'say_where_each_pattern_shows',
    description: 'Emit the behavioural pattern signals present in these periods, good and bad, each with the periods it shows in. Empty is a normal record and the commonest answer.',
    input_schema: {
      type: 'object',
      properties: {
        patterns: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              code: { type: 'string', enum: EVERY_CODE, description: 'The pattern code. M, C and R3 are good news; A codes say somebody is carrying something; the rest are not.' },
              showsIn: { type: 'array', items: { type: 'string', enum: labels }, description: 'Every period you can see in which this signal is genuinely present in that period\'s own evidence.' },
              observation: { type: 'string', description: 'Plain-language, pattern-level description of what happened in the latest period it shows in. Do NOT open with "The record shows/describes/contains". Never names the person; never a verdict.' },
            },
            required: ['code', 'showsIn', 'observation'],
          },
        },
      },
      required: ['patterns'],
    },
  };
}

/** The text the judgement reads: the detector's own text, with the periods named at the top. */
export function theJudgementReads(content: string, window: number[]): string {
  const names = window.map((p, i) => `${PERIOD_LABELS[i]} is ${i === 0 ? 'the check-in below' : p < 10000 ? `Period ${p} in their earlier record` : i === 1 ? 'the most recent earlier period in their earlier record' : 'the period before that in their earlier record'}.`);
  return `THE PERIODS YOU CAN SEE. ${names.join(' ')}\n\n${content}`;
}

export type AJudgementRead = Map<string, { periods: number[]; observation: string }>;

/** What one read of the judgement says, with each label turned back into its period number. Unknown codes and labels are ignored. */
export function whatOneJudgementSays(result: any, window: number[], codes: string[]): AJudgementRead {
  const out: AJudgementRead = new Map();
  for (const p of result?.patterns ?? []) {
    if (!codes.includes(p?.code) || out.has(p.code)) continue;
    const periods = [...new Set((p.showsIn ?? []).map((l: string) => window[PERIOD_LABELS.indexOf(l as any)]).filter((n: any) => Number.isFinite(n)))] as number[];
    if (!periods.length) continue;
    out.set(p.code, { periods: periods.sort((a, b) => a - b), observation: String(p.observation ?? '').trim() });
  }
  return out;
}

export interface WhereACodeShows {
  /** The periods it decides that it shows in, oldest first. */
  showsIn: number[];
  /** For each period it decides, how many reads said it shows there. */
  votes: Record<number, number>;
  reads: number;
  /** It shows in more than one of the periods it can see. */
  holds: boolean;
  /** From the first read, in order, that put it in the newest period it shows in. */
  observation: string;
}

/**
 * The majority over the reads, period by period, for each code. A period counts when more than half
 * the reads put the code there; exactly half keeps what was counted before, so a tie never moves anything.
 */
export function whereEachCodeShows(
  reads: AJudgementRead[],
  window: number[],
  codes: string[],
  countedBefore: Map<string, number[]>,
): Map<string, WhereACodeShows> {
  const out = new Map<string, WhereACodeShows>();
  const decides = thePeriodsItDecides(window);
  for (const code of codes) {
    const votes: Record<number, number> = {};
    const showsIn: number[] = [];
    for (const p of decides) {
      const n = reads.filter((r) => r.get(code)?.periods.includes(p)).length;
      votes[p] = n;
      const before = (countedBefore.get(code) ?? []).includes(p);
      if (2 * n > reads.length || (2 * n === reads.length && before)) showsIn.push(p);
    }
    showsIn.sort((a, b) => a - b);
    const newest = showsIn[showsIn.length - 1];
    const observation = newest === undefined ? '' : reads.find((r) => r.get(code)?.periods.includes(newest) && r.get(code)!.observation)?.get(code)?.observation ?? '';
    out.set(code, { showsIn, votes, reads: reads.length, holds: showsIn.length >= 2, observation });
  }
  return out;
}

/** Every period the code counts in after the judgement: the ones it did not decide stay as they were. */
export function theirPeriodsAfterTheJudgement(countedBefore: number[], window: number[], showsIn: number[]): number[] {
  const decides = new Set(thePeriodsItDecides(window));
  return [...new Set([...(countedBefore ?? []).filter((p) => !decides.has(p)), ...showsIn])].sort((a, b) => a - b);
}

/** The consecutive run ending at the newest period, as `periodsObserved` keeps it. */
export function theRunEndingAtTheNewest(periods: number[]): number {
  const sorted = [...new Set(periods)].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  let run = 1;
  for (let i = sorted.length - 1; i > 0 && sorted[i] - sorted[i - 1] === 1; i--) run++;
  return run;
}

const listOf = (ps: number[]) => (ps.length <= 1 ? ps.join('') : `${ps.slice(0, -1).join(', ')} and ${ps[ps.length - 1]}`);

/**
 * One line per check-in, with no name in it, saying what the judgement decided for each of the four.
 * `notJudged` says why a code was decided as before: it is already shown, or it is not about this person.
 */
export function aLineForTheJudgement(
  checkInId: string,
  period: number,
  window: number[],
  decided: Map<string, WhereACodeShows & { before: number[]; after: number[] }>,
  notJudged: Map<string, 'shown' | 'waiting' | 'no reads'>,
): string {
  const parts: string[] = [];
  for (const code of JUDGED_ONCE_CODES) {
    const d = decided.get(code);
    if (d) {
      const where = d.showsIn.length ? `shows in period${d.showsIn.length === 1 ? '' : 's'} ${listOf(d.showsIn)}` : 'shows in none of them';
      const counts = `${d.after.length} period${d.after.length === 1 ? '' : 's'} counted in all, ${d.before.length} before`;
      parts.push(`${code} ${where}${d.holds ? ', so it holds across them' : ''} (${counts}).`);
      continue;
    }
    const why = notJudged.get(code);
    if (why === 'shown') parts.push(`${code} is already shown, so it is decided period by period as before.`);
    else if (why === 'waiting') parts.push(`${code} is not judged for this person, who is waiting on somebody here.`);
    else if (why === 'no reads') parts.push(`${code} could not be judged, because too few reads came back.`);
  }
  return `Check-in ${checkInId}, period ${period}: judged once across period${window.length === 1 ? '' : 's'} ${listOf([...window].sort((a, b) => a - b))}. ${parts.join(' ')}`;
}

/** The earlier periods theirOwnEarlierRecord shows, newest first: the two newest, within its cap on lines. */
export function theEarlierPeriodsItShows(lines: any[], thisPeriod: number): number[] {
  const kinds = new Set(['COMMITMENT', 'PROGRESS', 'ASK', 'INTENT', 'WORRY', 'TENSION']);
  const periods = (lines ?? [])
    .filter((l) => l?.checkIn && l.text?.trim() && kinds.has(l.type))
    .map((l) => periodOf({ sessionNumber: l.checkIn.sessionNumber, when: l.checkIn.completedAt ?? l.checkIn.startedAt ?? l.checkIn.createdAt }, l.checkIn.ground))
    .filter((p) => p < thisPeriod);
  const newest = [...new Set(periods)].sort((a, b) => b - a).slice(0, 2);
  const shown: number[] = [];
  let room = MOST_EARLIER_LINES;
  for (const p of newest) { if (room > 0) shown.push(p); room -= periods.filter((x) => x === p).length; }
  return shown;
}

/** One read of the judgement, as the tried product code made it: the steady setting, the record filter. */
export async function whatOneJudgementKeeps(model: any, steady: any, content: string, window: number[], codes: string[], whatThePersonSaid: string[] = []): Promise<AJudgementRead> {
  const labels = PERIOD_LABELS.slice(0, window.length) as unknown as string[];
  const result = await model.extract(JUDGED_ONCE_PROMPT, [{ role: 'user', content: theJudgementReads(content, window) }], judgedOnceSchema(labels), steady);
  const said = whatOneJudgementSays(result, window, codes);
  for (const [code, { observation }] of [...said]) if (!observation || restsOnARecordNobodyHolds(observation, whatThePersonSaid)) said.delete(code);
  return said;
}
