import { whatToAskAbout } from '../patterns/pattern-library';

/**
 * A PATTERN THAT KEEPS SHOWING UP BECOMES A QUESTION IN THE NEXT CHECK-IN.
 *
 * The pattern library was written with a `probe` on every code - the ordinary question to ask about
 * the work when that thing keeps happening - and `whatToAskAbout` reached exactly one caller: the
 * board, where it renders as a suggestion to a lead. So the person it is actually about was never
 * asked anything, and the one surface in the product that could have asked naturally, in the moment,
 * with their own words still on the screen, was the one surface that never saw it.
 *
 * THE SAME GATES AS THE PRIVATE NOTE, AND FOR THE SAME REASONS.
 *
 * SURFACED, never CANDIDATE: a candidate is the engine's first read, and putting a candidate to
 * somebody as a settled thing about them is the accusation this product refuses to make.
 *
 * The real recurrence floor is THREE consecutive periods, and it is carried by the status rather
 * than by a number here: `patterns.service` flips CANDIDATE to SURFACED only at three. The count
 * below is a second, weaker guard for a direct caller that passes rows it fetched itself - it is
 * redundant under SURFACED, and it is not the rule. The rule is three, and it lives in one place.
 *
 * The alignment-feed-only codes are excluded by `whatToAskAbout` itself, by construction rather
 * than by anybody remembering - those exist precisely because naming them to the person would do
 * harm.
 *
 * AND THE PATTERN IS NEVER NAMED. The same rule the role probes already hold: ask about the work,
 * never about the shape. "You keep committing to things and not coming back to them" is a verdict
 * delivered by a machine. The probe is a question about a specific piece of work, and how somebody
 * answers it is the signal - ours to read, not theirs to be told.
 */

export interface Recurring {
  code: string;
  periodsObserved: number;
  /** The engine's own plain-language observation. Used to pick, never to quote at anybody. */
  observationText?: string | null;
  /**
   * WHETHER SOMEBODY HAS ALREADY SAID THIS READ WAS WRONG.
   *
   * `false` means a person with the standing to know rated it inaccurate. Asking about it anyway is
   * the product ignoring a correction it asked for - the same fault as a report that keeps counting
   * a line somebody unsaid. `null` is not yet rated and is the ordinary case.
   */
  accuracyRating?: boolean | null;
}

/** A belt-and-braces floor for a caller that did not filter on SURFACED. The real rule is three
 *  consecutive periods and it is enforced by the status, not here. */
export const A_PATTERN_IS_NOT_A_PATTERN_IN = 1;

/**
 * At most one. Two questions about two recurring things in one check-in is an interrogation, and
 * the check-in is not for this - it is for what the person did. The longest-running one wins,
 * because that is the one least likely to be noise and most likely to be worth the single ask.
 */
export function theOneWorthAsking(rows: Recurring[]): { code: string; probe: string } | null {
  const eligible = rows
    .filter((r) => r.periodsObserved > A_PATTERN_IS_NOT_A_PATTERN_IN)
    .filter((r) => r.accuracyRating !== false)
    .map((r) => ({ ...r, probe: whatToAskAbout(r.code) }))
    .filter((r): r is Recurring & { probe: string } => !!r.probe)
    .sort((a, b) => b.periodsObserved - a.periodsObserved || a.code.localeCompare(b.code));
  const top = eligible[0];
  return top ? { code: top.code, probe: top.probe } : null;
}

/**
 * What goes into the prompt, or nothing.
 *
 * "When it genuinely fits" is not politeness. A question asked because a machine had one queued,
 * dropped into a conversation it does not belong in, is how a check-in starts feeling like a form -
 * and the whole reason this is a conversation is that a form was not getting honest answers.
 */
export function askAboutItBlockFor(one: { probe: string } | null): string {
  if (!one) return '';
  return `SOMETHING THAT HAS COME UP MORE THAN ONCE

Ask this when it genuinely fits what they are telling you, in your own words, as an ordinary
question about the work:
- ${one.probe}

NEVER say that it keeps happening, and never name the pattern. Do not tell them they have a habit,
a tendency, or a recurring anything. Ask about the work; how they answer is the signal, and it is
yours to read, not theirs to be told. If it does not fit this conversation, leave it - it will
still be true next time.`;
}
