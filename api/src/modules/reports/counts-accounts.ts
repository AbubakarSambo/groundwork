/**
 * A SHARED PICTURE TURNING INTO A VERDICT BY ARITHMETIC.
 *
 * With two people in a ground, a divergence is obviously a gap between two
 * accounts. Add a third and a fourth and there is a new way for the report to go
 * wrong that nobody asked for: "three of the four described the same delay"
 * reads as a finding about a person, established by counting, rather than a gap
 * named in the work and supported by the record.
 *
 * That is the difference between a shared picture and a case file. A gap is real
 * because the record supports it, not because a number of people mentioned it.
 * If several accounts point the same way, that belongs in the evidence, never in
 * the claim.
 *
 * The synthesis prompt is told this. This is the check that it held.
 *
 * DETECT, DO NOT REWRITE. The voice fix strips an opener because removing "the
 * record shows" cannot change what a sentence means. A tally cannot be removed
 * that way - cutting "two of the three" out of a sentence leaves something that
 * says a different thing, and quietly altering a claim inside an accountability
 * record is far worse than a badly phrased one. So this reports; a human decides.
 */

/**
 * Numbers as people write them. It stopped at ten, so "nine of the fourteen"
 * walked straight past the detector - on shared work as well as on a cohort,
 * which is the case the rule exists for. Found by a test written for the cohort
 * exception, which is the only reason anybody looked at a fourteen-person tally.
 *
 * Teams are frequently larger than ten, and a rule that quietly stops applying
 * at eleven is worse than no rule: it holds for the small grounds where a
 * headcount matters least.
 */
const NUMBER = '(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|\\d+)';

const TALLY = [
  // "two of the three", "3 of 4", "nine out of fourteen"
  new RegExp(`\\b${NUMBER}\\s+(?:of|out of)\\s+(?:the\\s+)?${NUMBER}\\b`, 'i'),
  // "most people said", "the majority felt", "several accounts describe"
  /\b(?:most|the majority of|several|multiple|a number of|many)\s+(?:people|parties|accounts|participants|colleagues|of them|others)\b/i,
  /\bthe majority\b/i,
  // "everyone except", "all but one"
  /\b(?:everyone|everybody|all parties|all accounts)\s+(?:except|but|other than)\b/i,
  new RegExp(`\\ball but ${NUMBER}\\b`, 'i'),
  // "both colleagues said", "all three describe" - counting who, then reporting it
  new RegExp(`\\b(?:both|all)\\s+(?:the\\s+)?${NUMBER}?\\s*(?:colleagues|participants|teammates|reports|reviewers)\\b`, 'i'),
];

/**
 * Does this text establish something by counting who said it?
 *
 * Returns the offending phrase so a warning can name it, rather than saying
 * "something somewhere in this report" and leaving someone to hunt.
 */
export function countsAccounts(text: string): string | null {
  if (!text) return null;
  for (const pattern of TALLY) {
    const hit = text.match(pattern);
    if (hit) return hit[0];
  }
  return null;
}

/**
 * Every place in a report where a tally could hide.
 *
 * A COHORT IS THE ONE CASE WHERE COUNTING IS THE FINDING.
 *
 * On shared work, "four of the six described the same delay" turns a headcount
 * into a verdict: the six are describing one thing they all saw, so agreement
 * between them is not independent evidence of anything.
 *
 * On a cohort it is the opposite, and the difference is not a matter of degree.
 * Fourteen people in fourteen districts who have never met, given the same
 * induction, and nine of them describe the same rule the same wrong way - the
 * count IS the diagnosis, and it points at the briefing rather than at anybody
 * in it. Nine independent accounts converging is exactly the evidence that
 * fourteen accounts of one shared event can never be.
 *
 * Told apart by the ground's own peopleWorkTogether flag, which reads.ts already
 * uses for the same distinction: "nobody else on this ground sees this person's
 * work". Where nobody can corroborate anybody, a tally is the only corroboration
 * available, and refusing it would throw away the finding a cohort exists to
 * produce.
 *
 * Kept narrow on purpose: this permits counting only where people genuinely
 * cannot see each other's work. Everywhere else the rule is absolute.
 */
export function tallyInReport(report: {
  sharedPicture?: string;
  centralQuestion?: string;
  agreements?: unknown;
  divergences?: unknown;
}, peopleWorkTogether = true): { field: string; phrase: string } | null {
  if (!peopleWorkTogether) return null;
  const check = (field: string, value: unknown): { field: string; phrase: string } | null => {
    if (typeof value === 'string') {
      const phrase = countsAccounts(value);
      return phrase ? { field, phrase } : null;
    }
    if (Array.isArray(value)) {
      for (const [i, v] of value.entries()) {
        const found = check(`${field}[${i}]`, v);
        if (found) return found;
      }
      return null;
    }
    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        const found = check(`${field}.${k}`, v);
        if (found) return found;
      }
      return null;
    }
    return null;
  };

  return (
    check('sharedPicture', report.sharedPicture) ??
    check('centralQuestion', report.centralQuestion) ??
    check('agreements', report.agreements) ??
    check('divergences', report.divergences)
  );
}
