/**
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
import { BAD_FAITH_CODES, WHAT_COUNTS_BY_CODE } from './pattern-library';

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

const describe = (code: string) => {
  const c = BAD_FAITH_CODES.find((x) => x.code === code);
  return `- ${code} (${c?.name ?? code}): ${c?.signal ?? ''}${WHAT_COUNTS_BY_CODE[code] ? ` ${WHAT_COUNTS_BY_CODE[code]}` : ''}`;
};

/* A model instruction, read by the detector only. */
export const JUDGED_ONCE_PROMPT = `You read ONE person's own record across the periods you can see, and decide, for each pattern below, in which of those periods it shows. You are looking at the record, not judging the person.

The text names the periods you can see. THIS_PERIOD has the whole check-in. ONE_PERIOD_BEFORE and TWO_PERIODS_BEFORE, when they are there, have the lines this person recorded then. Judge them together, once, as one picture of the same person over time: use the earlier periods to tell a repeat from a first time, and use the later ones to tell whether something was ever done or fixed.

Hard rules:
- A pattern shows in a period only when that period's own evidence holds it, read with the other periods in view. Name a period only when you can point to what in that period shows it.
- Follow the lines on what counts for each pattern. A first promise, a problem raised for the first time, one period of confident talk, or one outside cause named fairly does not count.
- The earliest period you can see may repeat something from before it that you cannot see. Judge it only on what you can see, and do not count it as a repeat unless something you can see shows it was one.
- Leave out any pattern that shows in no period. That is the commonest answer, and a normal record.
- Do not infer intent. Never name the person. For each pattern you return, write one plain sentence about what happened in the latest period it shows in. Say the thing directly, without opening with "The record shows".

The patterns:
${JUDGED_ONCE_CODES.map(describe).join('\n')}`;

export function judgedOnceSchema(codes: string[], labels: string[]) {
  return {
    name: 'say_where_each_pattern_shows',
    description: 'For each pattern that shows in at least one of the periods, say which periods it shows in. Leave out patterns that show in none.',
    input_schema: {
      type: 'object',
      properties: {
        patterns: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              code: { type: 'string', enum: codes },
              showsIn: { type: 'array', items: { type: 'string', enum: labels } },
              observation: { type: 'string', description: 'One plain sentence about what happened in the latest period it shows in. Never names the person; never a verdict.' },
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
