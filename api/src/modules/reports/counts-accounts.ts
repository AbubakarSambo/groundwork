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

const TALLY = [
  // "two of the three", "3 of 4", "two out of three"
  /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:of|out of)\s+(?:the\s+)?(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i,
  // "most people said", "the majority felt", "several accounts describe"
  /\b(?:most|the majority of|several|multiple|a number of|many)\s+(?:people|parties|accounts|participants|colleagues|of them|others)\b/i,
  /\bthe majority\b/i,
  // "everyone except", "all but one"
  /\b(?:everyone|everybody|all parties|all accounts)\s+(?:except|but|other than)\b/i,
  /\ball but (?:one|two|\d+)\b/i,
  // "both colleagues said", "all three describe" - counting who, then reporting it
  /\b(?:both|all)\s+(?:the\s+)?(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)?\s*(?:colleagues|participants|teammates|reports|reviewers)\b/i,
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

/** Every place in a report where a tally could hide. */
export function tallyInReport(report: {
  sharedPicture?: string;
  centralQuestion?: string;
  agreements?: unknown;
  divergences?: unknown;
}): { field: string; phrase: string } | null {
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
