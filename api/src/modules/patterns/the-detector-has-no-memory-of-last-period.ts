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
 *
 * WHY THE WINDOW IS THREE PERIODS AND NO LONGER ONE. Measured on a live three-month engagement,
 * 24 September 2026. A consultant made a future-tense promise and did not complete it in every
 * single fortnight of six. E2, Intro Evasion, is that behaviour by name. It was detected in
 * fortnight two, and then in fortnight six, and the lead was told nothing in three months.
 *
 * One period of memory is what did it. Miss a period - and thirty codes with overlapping signals
 * means missing one is ordinary - and the row's lastPeriodNumber falls behind, the exact-match
 * lookup stops finding it, the detector loses the words it used last time, and the next period is
 * likelier to miss it too. The hole feeds itself. The original reasoning was sound on its own
 * terms: a gap reset the streak, so an older detection could not extend anything, and showing it
 * would invite re-reporting something the rule had discarded. What changed is the rule. A gap no
 * longer discards anything (see `seenInSessions` in patterns.service) - three periods count whether
 * they are consecutive or not - so recognising a thing seen two periods ago is no longer a way
 * round anything. It is the same behaviour, named the same way, which is all this file ever did.
 */

export interface SeenLastPeriod {
  code: string;
  observationText: string | null;
  lastPeriodNumber: number | null;
}

/**
 * THE STEER RECOGNISED THE THING AND MISLABELLED IT ANYWAY.
 *
 * Found live: Femi's K5 ("Tasks are described without saying what they are for") was served the
 * sentence "The response to delays is to increase the frequency of follow-ups, rather than
 * changing the approach to resolve the underlying problem" - which is K3's own signal, Reporting
 * Without Intervention, not K5's. `lastPeriodBlockFor` had shown the model K3's own words from a
 * recent period so a genuinely continuing behaviour would be recognised; the model recognised it,
 * and wrote it up under K5 instead of K3. The block's own instruction ("recognise the same thing")
 * gives no instruction about which code to write it under if it does.
 *
 * So a detection is refused, not stored, when its observation is really another code's steer read
 * back: near enough to what a DIFFERENT code's recent evidence said that it is that code's words,
 * not a fresh reading of this period. `observe`'s unique key is (participantId, code), so this is
 * checked before that write, never after - a wrongly-coded row would otherwise sit in the table
 * under its own id forever, however good the model's next answer is.
 */
export function evidenceBorrowedFromAnotherCode(observation: string, code: string, recent: SeenLastPeriod[]): string | null {
  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const mine = normalise(observation);
  if (!mine) return null;
  for (const r of recent) {
    if (r.code === code || !r.observationText) continue;
    const theirs = normalise(r.observationText);
    if (!theirs) continue;
    if (mine === theirs || mine.includes(theirs) || theirs.includes(mine)) return r.code;
  }
  return null;
}

/** How far back a detection is still worth recognising by name. Three periods, and no further. */
export const HOW_FAR_BACK = 3;

/**
 * The recent periods, most recent first, never the whole history.
 *
 * Bounded for the same reason it was once bounded to one: a list of everything ever seen about
 * somebody, put in front of a labeller, stops being a way to recognise a thing and becomes a
 * suggestion of what to find. Three periods is the same number as the rule it serves.
 */
export function whatWasSeenLastPeriod(rows: SeenLastPeriod[], thisPeriod: number, howFarBack = HOW_FAR_BACK): SeenLastPeriod[] {
  return rows
    .filter((r) => {
      const seen = r.lastPeriodNumber;
      if (seen === null || seen === undefined) return false;
      return seen <= thisPeriod - 1 && seen >= thisPeriod - howFarBack && !!(r.observationText ?? '').trim();
    })
    .sort((a, b) => (b.lastPeriodNumber ?? 0) - (a.lastPeriodNumber ?? 0) || a.code.localeCompare(b.code))
    .slice(0, 5);
}

/** "last period", or "two periods ago" - so the model knows how old each line is. */
function howLongAgo(seen: number | null, thisPeriod: number): string {
  const back = thisPeriod - (seen ?? thisPeriod);
  if (back <= 1) return 'last period';
  return `${back} periods ago`;
}

export function lastPeriodBlockFor(rows: SeenLastPeriod[], thisPeriod?: number): string {
  if (!rows.length) return '';
  const when = (r: SeenLastPeriod) => (thisPeriod ? ` (${howLongAgo(r.lastPeriodNumber, thisPeriod)})` : '');
  return `

WHAT WAS OBSERVED IN THIS PERSON'S RECENT PERIODS

Use this ONLY to recognise the same thing if it is here again, so that a behaviour which genuinely
continued is not relabelled as something else.

It is not evidence about this period and it is never the reason. If this period's record does not
show it then the answer is still none - saying nothing is the correct and common answer.

Do not assume any of it continued. Most will not have.
${rows.map((r) => `- ${r.code}${when(r)}: ${r.observationText!.trim()}`).join('\n')}`;
}
