/**
 * THE HALF THE CONTEXT CHAT WAS MISSING: what it heard, and what may be done with it. Stage 3.
 *
 * `the-context-chat.ts` works out what setup did not capture and asks about it, and its own rules say
 * "it does not decide. It asks and it recommends. What gets saved is what the lead confirms."
 *
 * Nothing was ever saved. `contextChat` called the model and returned the reply; not one write. So a
 * lead could be asked how long this runs, answer "about three months", and the ground would still
 * have no duration - and because the gap was still open, the next turn asked again. A conversation
 * that cannot close what it opens is the same defect G37 was written for, moved one screen along:
 * the ground made from one sentence stays a ground made from one sentence.
 *
 * WHY EXTRACTION IS ITS OWN FILE, and pure. The failure mode of "the AI updated your ground" is that
 * a stray sentence rewrites how long somebody's onboarding runs. So the model's only job is to read
 * a number or a phrase out of what the lead actually typed. Everything about whether that is
 * allowed to touch the ground is decided here, in code, against rules that can be tested without a
 * model in the loop.
 *
 * THE RULES.
 *
 * 1. NOTHING IS WRITTEN WITHOUT CONFIRMATION. The chat proposes ("I will set this to twelve weeks")
 *    and the lead presses the thing that says yes. G24's fourth rule: extraction is confirmed rather
 *    than adopted.
 * 2. ONLY THE FIELD THE QUESTION WAS ABOUT. An answer to "how long" cannot change the cadence, even
 *    if the lead mentioned it in passing. The open gap decides what is writable, so a model that
 *    over-reads cannot reach anything it was not asked about.
 * 3. IMPLAUSIBLE VALUES ARE REFUSED, NOT CLAMPED. A silent clamp to the nearest legal value is a
 *    ground quietly running for a length nobody chose. Out of range means ask again.
 * 4. NOTHING ABOUT A PERSON IS EVER WRITTEN HERE. The one field that takes prose is what doing well
 *    looks like, and it is about the work. Anything naming an individual belongs in a closed context
 *    note, where the product already says who can read it.
 */

/** The gap keys `contextGaps` produces. Only these can be closed, and only one at a time. */
export type ClosableGap = 'timeline' | 'cadence' | 'success';

/** The cadences the schema allows. Anything else is a refusal, never a nearest match. */
export const CADENCES = ['DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'ONE_TIME'] as const;
export type Cadence = (typeof CADENCES)[number];

export interface Heard {
  /** Days, as the ground stores it. */
  timelineDays?: number | null;
  cadence?: string | null;
  /** What doing well looks like, in the lead's own words. */
  success?: string | null;
}

export type Proposal =
  | { kind: 'none'; why: string }
  | { kind: 'timeline'; days: number; say: string }
  | { kind: 'cadence'; cadence: Cadence; say: string }
  | { kind: 'success'; text: string; say: string };

/**
 * A day count somebody would actually choose. Below a week there is nothing to check in against;
 * above two years this is not a ground, it is a filing cabinet.
 */
const MIN_DAYS = 7;
const MAX_DAYS = 730;
/** Long enough to be a statement rather than a shrug, short enough not to be an essay. */
const MIN_SUCCESS = 12;
const MAX_SUCCESS = 600;

/**
 * What may be written, given the gap that was open and what the model read out of the answer.
 *
 * Returns a PROPOSAL, never a write. The caller shows `say` and does nothing until the lead confirms,
 * which is the difference between a product that helps and one that edits your record while you talk
 * to it.
 */
export function proposalFrom(gap: string | null, heard: Heard): Proposal {
  if (!gap) return { kind: 'none', why: 'There is no open question for this to answer.' };

  if (gap === 'timeline') {
    const days = heard.timelineDays;
    if (days == null || !Number.isFinite(days)) {
      return { kind: 'none', why: 'No length in that answer.' };
    }
    const whole = Math.round(days);
    if (whole < MIN_DAYS || whole > MAX_DAYS) {
      /** Refused rather than clamped: rule 3. */
      return {
        kind: 'none',
        why: `${whole} days is outside what a ground can run for, so nothing was changed. Anything from a week to about two years works.`,
      };
    }
    const weeks = Math.round(whole / 7);
    return {
      kind: 'timeline',
      days: whole,
      say: weeks >= 4 && whole % 7 === 0
        ? `I will set this to run for ${weeks} weeks.`
        : `I will set this to run for ${whole} days.`,
    };
  }

  if (gap === 'cadence') {
    const c = (heard.cadence ?? '').toUpperCase().trim();
    if (!CADENCES.includes(c as Cadence)) {
      return { kind: 'none', why: 'No rhythm in that answer that maps to how often people can check in.' };
    }
    const words: Record<Cadence, string> = {
      DAILY: 'every day', WEEKLY: 'once a week', FORTNIGHTLY: 'every two weeks',
      MONTHLY: 'once a month', ONE_TIME: 'once, at the end',
    };
    return { kind: 'cadence', cadence: c as Cadence, say: `I will set people to check in ${words[c as Cadence]}.` };
  }

  if (gap === 'success') {
    const text = (heard.success ?? '').trim();
    if (text.length < MIN_SUCCESS) return { kind: 'none', why: 'That is too short to stand as what doing well looks like.' };
    if (text.length > MAX_SUCCESS) {
      return { kind: 'none', why: 'That is longer than this field holds. The short version is the useful one.' };
    }
    return { kind: 'success', text, say: `I will record that as what doing well looks like: "${text}"` };
  }

  /**
   * `parties`, `objectives` and `documents` are asked about and deliberately not written from here.
   * Adding a person, setting somebody's objective and sharing a document each already have their own
   * screen, each with its own consequences - an invite email, a visible objective, a file everybody
   * can read. A chat quietly doing any of those is the version of this feature nobody asked for.
   */
  return { kind: 'none', why: 'That one is not something this conversation changes on its own.' };
}

/** The tool the model fills in. One gap's worth of fields, nothing else reachable. */
export function extractionToolFor(gap: string) {
  const props: Record<string, any> = {};
  if (gap === 'timeline') {
    props.timelineDays = {
      type: 'number',
      description: 'How many DAYS the person said this should run for. Convert weeks and months yourself: three months is 90, six weeks is 42. Omit if they did not say.',
    };
  }
  if (gap === 'cadence') {
    props.cadence = {
      type: 'string',
      enum: [...CADENCES],
      description: 'How often people should check in, from what they said. ONE_TIME means a single session at the end. Omit if they did not say.',
    };
  }
  if (gap === 'success') {
    props.success = {
      type: 'string',
      description: 'What doing well looks like, in THEIR words, trimmed to the statement itself. About the work, never about a named person. Omit if they did not say.',
    };
  }
  return {
    name: 'record_what_they_said',
    description: 'Record only what the person just said about the one thing they were asked. Omit anything they did not say. Never infer, never fill in a sensible default.',
    input_schema: { type: 'object', properties: props },
  };
}
