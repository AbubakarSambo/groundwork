import { VERDICTS, type Verdict } from './a-suggestion-told-like-a-signal';

/**
 * THE THRESHOLDS FOR A SUGGESTION (decision 33, and decision 53's "Week 10 is built the more
 * private way"). Decision 33: "the thresholds for verdicts are decided later, when that work
 * starts." Week 10 is that work, so it is built so that a suggestion can be reached only once a
 * threshold for that verdict is set, and no threshold is set by default - the settings row starts
 * empty, and stays empty until Hafsah sets one.
 *
 * One row, in `platform_settings` beside the free-ground limit and the WhatsApp toggle
 * (billing/pricing.service.ts, whatsapp/whatsapp.service.ts): this is a platform-wide setting, not
 * an organisation's own, because nobody has asked for it to vary by organisation yet - if that is
 * ever wanted, decision 33 is the place to raise it.
 *
 * THE SHAPE. One entry per verdict Groundwork may suggest (a-suggestion-told-like-a-signal.ts,
 * VERDICTS), each with:
 *   - `keptBelow`: a fraction from 0 to 1. Below this share of commitments kept, over the window,
 *     the verdict is worth reaching.
 *   - `overPeriods`: how many settled commitments (kept or not done, keptLately's "of") must exist
 *     before the ratio means anything. Fewer than this, and there is nothing to reach a suggestion
 *     from yet, whatever the ratio says.
 *
 * `{ support: { keptBelow: 0.6, overPeriods: 4 } }` reaches a "support" suggestion once a person has
 * settled at least 4 commitments in the window and kept fewer than 6 in 10 of them. Nothing here
 * decides what counts as "kept": that is keptLately in grounds/your-board.ts, already built for the
 * person's own board (decision 24, week 9), reused rather than duplicated.
 */
export interface AThreshold {
  /** A fraction from 0 to 1: below this share kept, the verdict is worth reaching. */
  keptBelow: number;
  /** How many settled commitments must exist in the window before the ratio is used at all. */
  overPeriods: number;
}

export type SuggestionThresholds = Partial<Record<Verdict, AThreshold>>;

export const SUGGESTION_THRESHOLDS_KEY = 'suggestions.thresholds';

/** Decision 33: nothing is set until Hafsah sets it. With nothing set, no suggestion is reached. */
export const DEFAULT_SUGGESTION_THRESHOLDS: SuggestionThresholds = {};

function isAThreshold(v: unknown): v is AThreshold {
  const t = v as AThreshold;
  return (
    !!t &&
    typeof t.keptBelow === 'number' && t.keptBelow > 0 && t.keptBelow <= 1 &&
    typeof t.overPeriods === 'number' && Number.isInteger(t.overPeriods) && t.overPeriods > 0
  );
}

/**
 * Reads the stored value defensively: a row written by hand, or half-written, must mean "nothing
 * set for that verdict", never a made-up threshold that could reach a suggestion nobody asked for.
 */
export function readSuggestionThresholds(stored: unknown): SuggestionThresholds {
  if (!stored || typeof stored !== 'object') return {};
  const out: SuggestionThresholds = {};
  for (const verdict of VERDICTS) {
    const t = (stored as Record<string, unknown>)[verdict];
    if (isAThreshold(t)) out[verdict] = { keptBelow: t.keptBelow, overPeriods: t.overPeriods };
  }
  return out;
}

/** The threshold for one verdict, or null when none is set - the only case a suggestion is not reached from a plain "no threshold" reading. */
export function thresholdFor(thresholds: SuggestionThresholds | null | undefined, verdict: Verdict): AThreshold | null {
  return thresholds?.[verdict] ?? null;
}
