/**
 * THE OBJECTIVE IS DISCUSSED. THE THING IT IS JUDGED BY IS NOT.
 *
 * Asked as: "how can our tool auto detect what they measure and help, or do we need their devs to
 * tell us when they are setting up the api?" Both, and this is the half nobody had built.
 *
 * We cannot infer a measure out of nothing - we only ever see what a customer sends. But the moment
 * they send one we can do something better than store it: compare what they said this is judged by
 * against what people actually talk about when they talk about it. When those two come apart, one
 * of them is wrong, and which one is a conversation rather than a finding.
 *
 * IT IS NOT `objective_unmentioned`. That one fires when nobody has said a word about an objective
 * at all. This is the opposite situation and a more uncomfortable one: it is being worked on, it is
 * being discussed, and the number on it has never come up. An objective everybody talks about and
 * nobody measures is how a team ends up busy and behind at the same time.
 *
 * WHY IT NEEDS SEVERAL MENTIONS. One check-in that did not happen to name the metric is a normal
 * conversation. The finding is about a pattern of the measure never coming up, and firing on a
 * single mention would make it noise on the day somebody first talks about their work.
 */
import { meaningfulWords } from './describing-the-same-goal-differently';

export interface MeasuredSubject {
  externalId: string;
  title: string;
  /** What the customer's own system says this is judged by. Null means there is nothing to check. */
  measure: string | null;
  target: string | null;
}

export interface Mention {
  subjectExternalId: string;
  /** What was actually said. Never quoted out of here - see `sayIt`. */
  text: string;
  at: Date;
}

/**
 * How many times an objective has to have come up before its silence about the measure means
 * anything. Below this it is a quiet fortnight, not a pattern.
 */
export const MENTIONS_BEFORE_IT_MEANS_ANYTHING = 3;

export interface MeasureGap {
  subjectExternalId: string;
  title: string;
  measure: string;
  target: string | null;
  mentions: number;
  /** The last time anybody talked about it, so the finding can be checked against the record. */
  lastMentionedAt: Date;
}

/**
 * Does anything said about this objective touch the words of its measure?
 *
 * Word overlap, not meaning - the same blunt instrument `overlap` uses and for the same reason. A
 * judgement about whether somebody "really" discussed the metric is exactly the kind of inference
 * that must not sit behind a finding about people's work.
 *
 * A NUMBER COUNTS AS THE MEASURE COMING UP even when the words do not match: an objective measured
 * by "pipeline value in dollars" is being measured when somebody says "we are at 240k". Insisting
 * on the words would fire on the teams doing this best.
 */
export function measureCameUp(measure: string, said: string, title = ''): boolean {
  /*
   * WORDS THE MEASURE DOES NOT SHARE WITH THE TITLE. Found by running it: an objective called
   * "Grow the pipeline" measured by "pipeline value" could never fire, because saying the
   * objective's name counted as saying its measure. Every mention matched and the gap was
   * invisible on exactly the objectives whose measure is a restatement of their name.
   */
  const inTitle = meaningfulWords(title);
  const words = new Set([...meaningfulWords(measure)].filter((w) => !inTitle.has(w)));

  /*
   * A measure that is only the title again tells us nothing either way, so this says nothing. It is
   * a real gap - "measured by pipeline" on "Grow the pipeline" is not a measure - but it is
   * `unowned_gap`'s kind of gap, about the record, and inventing a second finding for it here
   * would have two detectors arguing about the same objective.
   */
  if (!words.size) return true;

  const lower = said.toLowerCase();
  for (const w of words) if (lower.includes(w)) return true;
  return A_QUANTITY.test(said);
}

/**
 * A number that is being used as a measurement, rather than any digit in a sentence.
 *
 * "we are at 240k" and "down to 300ms" are somebody measuring. "we shipped 3 things" is not, and
 * counting it would suppress the finding on exactly the teams that need it.
 *
 * The unit may be glued to the number - 300ms, 2m, 95% - which is what a trailing \b got wrong in
 * the first version: there is no word boundary between "0" and "m", so every number with a unit
 * stuck to it failed to match and the check fell through to false.
 */
const A_QUANTITY = /(?:[£$€]\s*\d)|(?:\d[\d,.]*\s*(?:k|m|bn|%|percent|per cent|ms|hrs?|hours?|days?|weeks?|months?)\b)|(?:\d{1,3}(?:,\d{3})+)/i;


export function findMeasureGaps(subjects: MeasuredSubject[], mentions: Mention[], ): MeasureGap[] {
  const out: MeasureGap[] = [];

  for (const s of subjects) {
    const measure = s.measure?.trim();
    if (!measure) continue; /* Nothing declared. `unowned_gap` already covers that. */

    const its = mentions.filter((m) => m.subjectExternalId === s.externalId);
    if (its.length < MENTIONS_BEFORE_IT_MEANS_ANYTHING) continue;
    if (its.some((m) => measureCameUp(measure, m.text, s.title))) continue;

    out.push({
      subjectExternalId: s.externalId,
      title: s.title,
      measure,
      target: s.target?.trim() || null,
      mentions: its.length,
      lastMentionedAt: its.reduce((a, b) => (a.at > b.at ? a : b)).at,
    });
  }
  return out;
}

/**
 * WHAT IT SAYS, AND THE TWO READINGS IT REFUSES TO CHOOSE BETWEEN.
 *
 * Either the measure is the wrong one, or the work has drifted from it. Both are worth a
 * conversation and this cannot tell them apart - so it says both and asks, rather than picking the
 * one that sounds more like a problem with a person.
 *
 * Nobody is named. The gap is between a system's field and a room's conversation, which is not
 * anybody's fault and must not be written as though it were.
 */
export function sayIt(g: MeasureGap): string {
  const target = g.target ? ` with a target of ${g.target}` : '';
  return `Your systems say ${g.title} is measured by ${g.measure}${target}. It has come up in `
    + `${g.mentions} check-ins and that has not been mentioned once. Either it is not really how `
    + `this is judged, or the work has moved away from it - both are worth ten minutes.`;
}
