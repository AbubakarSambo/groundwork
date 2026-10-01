import { VERDICTS, type Verdict } from './a-suggestion-told-like-a-signal';

/**
 * THE THRESHOLDS FOR A SUGGESTION (decision 33, and decision 53's "Week 10 is built the more
 * private way"). Decision 33: "the thresholds for verdicts are decided later, when that work
 * starts." Week 10 is that work, so it is built so that a suggestion can be reached only once a
 * threshold for that verdict is set. Decision 61 set the first one, for extra support, from the
 * start: see DEFAULT_SUGGESTION_THRESHOLDS and thresholdsInForce below.
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

/**
 * Decision 61 (30 September 2026): the first threshold is set from the start, not left for Hafsah
 * to switch on later. Extra support is suggested once a person has kept fewer than half of their
 * commitments, with at least 6 settled (kept or not). Keep, reward, a plan and exit stay empty
 * until each has its own reading of the record, built and tested - decision 33 still governs them.
 *
 * This is the value the migration `20260930110000_the_first_threshold_for_extra_support` writes
 * into the `suggestions.thresholds` row when that row does not already exist, and the value the
 * admin read (admin.service.ts, getSuggestionThresholds) falls back to if the row is ever missing.
 * It is never used to overwrite a row somebody has already set.
 */
export const DEFAULT_SUGGESTION_THRESHOLDS: SuggestionThresholds = {
  support: { keptBelow: 0.5, overPeriods: 6 },
};

/**
 * Plain labels for the admin page (decision 61: "'over periods' is called 'at least this many
 * settled commitments'"). `overPeriods` itself is an API contract the screens already use, so the
 * field name stays; this is served alongside the values so the admin page can show the plain words
 * instead of the field name.
 */
export const SUGGESTION_THRESHOLD_LABELS: Record<keyof AThreshold, string> = {
  keptBelow: 'Suggest extra support when fewer than this share of commitments were kept',
  overPeriods: 'At least this many settled commitments',
};

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

/**
 * THE THRESHOLDS IN FORCE, FROM THE STORED ROW (decision 61). One rule for every reader of the row, so
 * the admin page and the engine can never disagree: a database with no row at all has decision 61's
 * first threshold (the migration writes the same value), and a row that exists - even one an admin
 * emptied - is read exactly as stored. Before this, the admin page showed decision 61's values on a
 * database with no row while the engine read `{}` there and reached nothing for anybody.
 */
export function thresholdsInForce(row: { value: unknown } | null | undefined): SuggestionThresholds {
  return row ? readSuggestionThresholds(row.value) : DEFAULT_SUGGESTION_THRESHOLDS;
}

/** The threshold for one verdict, or null when none is set - the only case a suggestion is not reached from a plain "no threshold" reading. */
export function thresholdFor(thresholds: SuggestionThresholds | null | undefined, verdict: Verdict): AThreshold | null {
  return thresholds?.[verdict] ?? null;
}

/**
 * Strict validation for the admin write path. `readSuggestionThresholds` is deliberately forgiving
 * (a bad row is read as "nothing set", never a guess); a write is not - an admin who sends the
 * wrong shape should be told so in a plain sentence, not have it silently dropped.
 */
export function isValidSuggestionThresholds(v: unknown): v is SuggestionThresholds {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  for (const key of Object.keys(v as Record<string, unknown>)) {
    if (!(VERDICTS as readonly string[]).includes(key)) return false;
    if (!isAThreshold((v as Record<string, unknown>)[key])) return false;
  }
  return true;
}
