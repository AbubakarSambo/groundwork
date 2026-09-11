/**
 * THE SAME THING, TWICE, HAS TO BE RECOGNISABLE AS THE SAME THING.
 *
 * The three-period rule is not gating noise. It is gating everything, and the reason is upstream of
 * it: the detector reads ONE period in isolation, is told "one data point is not a pattern", and is
 * never told what it saw last time. So it labels fresh every period from a list of thirty codes
 * with overlapping signals, and a behaviour that genuinely persisted comes back under a different
 * code - which resets the streak to one.
 *
 * The numbers say it plainly. Across the whole database, every behavioural detection sits at
 * periodsObserved = 1, with last periods running as high as 20. The one code that does reach three
 * and beyond - twelve consecutive periods in places - is the deterministic specificity scorer,
 * which cannot relabel itself because it is not a label, it is a measurement.
 *
 * SO THIS IS NOT LOWERING THE BAR. Three consecutive periods stays exactly where it is, and it
 * stays for the reason it was written: a candidate is one or two periods of something that may be
 * nothing, and putting it to somebody as settled is the accusation this product refuses to make.
 * All this does is let a thing that recurred be seen to have recurred.
 *
 * THE GUARDRAIL IS THE ONE ALREADY USED TWICE HERE. The lead's note steers which behaviour to look
 * at first and never becomes the reason; the coaching steer does the same with surfaced patterns.
 * Same rule: it says where to look, and if THIS period's evidence does not show it, the answer is
 * still none. The independent confirmation call that already runs on every candidate never sees
 * this block, so a code that survives anchoring still has to survive a reader that was not told.
 */

export interface SeenLastPeriod {
  code: string;
  observationText: string | null;
  lastPeriodNumber: number | null;
}

/**
 * Only the period immediately before this one.
 *
 * A gap already resets the streak, so a detection last seen three periods ago cannot extend
 * anything - showing it would be inviting the model to re-report something the rule has already
 * discarded, which is how a steer turns into a way round the rule.
 */
export function whatWasSeenLastPeriod(rows: SeenLastPeriod[], thisPeriod: number): SeenLastPeriod[] {
  return rows
    .filter((r) => r.lastPeriodNumber === thisPeriod - 1 && (r.observationText ?? '').trim())
    .sort((a, b) => a.code.localeCompare(b.code))
    .slice(0, 5);
}

export function lastPeriodBlockFor(rows: SeenLastPeriod[]): string {
  if (!rows.length) return '';
  return `

WHAT WAS OBSERVED IN THE PERIOD IMMEDIATELY BEFORE THIS ONE

Use this ONLY to recognise the same thing if it is here again, so that a behaviour which genuinely
continued is not relabelled as something else.

It is not evidence about this period and it is never the reason. If this period's record does not
show it then the answer is still none - saying nothing is the correct and common answer.

Do not assume any of it continued. Most will not have.
${rows.map((r) => `- ${r.code}: ${r.observationText!.trim()}`).join('\n')}`;
}
