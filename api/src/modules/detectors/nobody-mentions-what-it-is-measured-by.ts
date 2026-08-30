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

/**
 * A FIGURE A CUSTOMER'S OWN SYSTEM IS PUSHING FOR THIS OBJECTIVE.
 *
 * Arrives through `PUT /evidence` and lands on `lastSeenState`. It exists here for one reason: it
 * settles a question this detector could not previously answer.
 */
export interface TheirFigure {
  subjectExternalId: string;
  /** Their words for the state. Counts and short labels; never prose. */
  state: string;
  /**
   * Their observation time, not ours. Null where they sent none.
   *
   * NOT DEFAULTED TO NOW, and not to the epoch either. Both put a date in a customer's face that
   * nobody observed - one of them a lie about freshness, the other 1970 in a sentence about their
   * pipeline. Where there is no time, the finding says the figure and not when.
   */
  observedAt: Date | null;
}

export interface MeasureGap {
  subjectExternalId: string;
  title: string;
  measure: string;
  target: string | null;
  mentions: number;
  /** The last time anybody talked about it, so the finding can be checked against the record. */
  lastMentionedAt: Date;
  /**
   * THE FIGURE THEIR SYSTEM IS PUSHING, WHERE ONE IS ARRIVING. Null where nothing is.
   *
   * This is the whole point of the CRM path. Without it the finding has to hedge between two
   * readings - the measure is wrong, or the work drifted. A number arriving nightly kills the
   * first reading outright: nobody wires up a feed for a measure they do not believe in.
   */
  theirFigure: TheirFigure | null;
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


export function findMeasureGaps(
  subjects: MeasuredSubject[],
  mentions: Mention[],
  figures: TheirFigure[] = [],
): MeasureGap[] {
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
      /*
       * The freshest, where several arrived. A nightly push writes one row and replaces it, so in
       * practice this is one - but the argument is a list and picking arbitrarily from a list is
       * how a finding ends up quoting a figure from three weeks ago as though it were now.
       */
      theirFigure: figures
        .filter((f) => f.subjectExternalId === s.externalId)
        .reduce<TheirFigure | null>(
          (a, b) => (a && a.observedAt && (!b.observedAt || a.observedAt > b.observedAt) ? a : b),
          null,
        ),
    });
  }
  return out;
}

/**
 * WHAT IT SAYS, AND THE READING IT ONLY SOMETIMES HAS TO HEDGE.
 *
 * With nothing but conversation to go on, either the measure is the wrong one or the work has
 * drifted from it. It cannot tell them apart, so it says both and asks, rather than picking the one
 * that sounds more like a problem with a person.
 *
 * A figure arriving from their own system removes the first reading, and then hedging would be a
 * lie rather than caution - see the branch below.
 *
 * Nobody is named. The gap is between a system's field and a room's conversation, which is not
 * anybody's fault and must not be written as though it were.
 */
export function sayIt(g: MeasureGap): string {
  const target = g.target ? ` with a target of ${g.target}` : '';

  /*
   * THE READING CHANGES WHEN A NUMBER IS ARRIVING, so the sentence has to.
   *
   * Telling somebody "maybe this is not really how it is judged" about a metric their own system
   * pushes every night is not a hedge, it is wrong, and it is the kind of wrong that teaches people
   * to stop reading these. What is left is the sharper finding: the number is known, it is on
   * record, and it has never entered the room. That is not a measurement problem any more.
   *
   * The figure is quoted because it is theirs and short by construction - the API refuses anything
   * over 40 characters, precisely so a finding can say it out loud. Their observation time is used
   * rather than ours, so a stale feed reads as stale instead of as now.
   */
  if (g.theirFigure) {
    const seen = g.theirFigure.observedAt ? `, last seen ${asADay(g.theirFigure.observedAt)}` : '';
    return `Your systems are tracking ${g.title} at ${readable(g.theirFigure.state)}${target}${seen}. It has `
      + `come up in ${g.mentions} check-ins and that number has not. The measure is not the problem `
      + `here - it is being kept and not discussed. Worth putting it in front of the people doing `
      + `the work.`;
  }

  return `Your systems say ${g.title} is measured by ${g.measure}${target}. It has come up in `
    + `${g.mentions} check-ins and that has not been mentioned once. Either it is not really how `
    + `this is judged, or the work has moved away from it - both are worth ten minutes.`;
}

/**
 * THEIR STATE, IN A SENTENCE A PERSON READS.
 *
 * Evidence arrives as an object because that is the honest shape for it, and this used to drop the
 * raw JSON straight into the finding: `tracking Grow the pipeline at {"committed":"1.1m"}`. Found
 * by reading the finding the live API produced, not by reading this function - it looked fine here.
 *
 * Their keys and their values, unchanged and in their order. Renaming a key would be us editing
 * their record, and both are short by construction because the API refuses anything longer.
 *
 * Anything that is not an object of plain values is printed as it came. A guess at the shape is how
 * a finding ends up rendering "[object Object]" at somebody.
 */
function readable(state: string): string {
  try {
    const o = JSON.parse(state);
    if (!o || typeof o !== 'object' || Array.isArray(o)) return state;
    const parts = Object.entries(o)
      .filter(([, v]) => v !== null && typeof v !== 'object')
      .map(([k, v]) => `${k} ${v}`);
    return parts.length ? parts.join(', ') : state;
  } catch {
    /* Not JSON at all. Plenty of systems send a bare "1.1m", which needs nothing done to it. */
    return state;
  }
}

/** Their date, written the way a person writes one. */
function asADay(d: Date): string {
  return d.toISOString().slice(0, 10);
}
