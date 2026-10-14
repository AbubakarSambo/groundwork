/**
 * A TARGET WHOSE NAME ALREADY SAYS "TARGET" (reviewer, 14 October).
 *
 * A sheet's column "Q4 target (units)" was read back as "For everyone in this check-in, the target for Q4 target (units)
 * is 300." The name is said once, with its unit after the number: "For everyone in this check-in, the Q4 target is 300
 * units." and "Kevin Omondi's Q4 target is 120 units." A name without the word "target" reads as before.
 */
export function theTargetSaid(what: string, value: string): { subject: string; value: string } | null {
  const raw = (what ?? '').trim();
  const withUnit = /^(.*?)\s*\(([^()]{1,30})\)\s*$/.exec(raw);
  const base = (withUnit ? withUnit[1] : raw).trim();
  if (!/\btargets?\b/i.test(base)) return null;
  const unit = withUnit?.[2]?.trim() ?? '';
  /* Only a bare number takes the unit: "300" becomes "300 units"; "KSh 300,000" is left as written. */
  const bare = /^[\d.,]+$/.test(value.trim());
  return { subject: base, value: unit && bare ? `${value.trim()} ${unit}` : value };
}

/** "the Q4 target is 300 units" or "the target for sales is 300". */
export function theTargetForEveryone(what: string, value: string): string {
  const t = theTargetSaid(what, value);
  return t ? `the ${t.subject} is ${t.value}` : `the target for ${what} is ${value}`;
}

/** "Kevin Omondi's Q4 target is 120 units" or "Kevin Omondi's target for sales is 120". */
export function theirTarget(whose: string, what: string, value: string): string {
  const t = theTargetSaid(what, value);
  return t ? `${whose} ${t.subject} is ${t.value}` : `${whose} target for ${what} is ${value}`;
}
