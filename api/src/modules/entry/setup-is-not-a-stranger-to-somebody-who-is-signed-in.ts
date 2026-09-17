/**
 * SETUP IS NOT A STRANGER TO SOMEBODY WHO IS SIGNED IN.
 *
 * `/entry/onboard` is a public route and took no user, so a lead with four check-ins already
 * running, a job title on file and notes they wrote themselves met a setup conversation that knew
 * none of it. Every time. The route is public for a good reason - somebody with no account can set
 * something up - and the fix is not to close it but to READ a session when one happens to exist,
 * which `@OptionalAuth()` already does elsewhere in the product.
 *
 * WHAT GOES IN, AND WHY IT IS SO LITTLE.
 *
 * Only what the LEAD THEMSELVES put there: the names of the check-ins they set up, what each was
 * about, and their own role. Nothing anybody else wrote. Participants' words are walled off from
 * every surface but their own report, and a setup conversation is the last place that wall should
 * get a door - so this reads labels and the lead's own aims, and stops.
 *
 * WHAT IT IS FOR. Two things a cold conversation cannot do: not asking for something they have
 * already told the product on a different screen, and being able to say "this looks like the one
 * you set up for the Q3 rollout" - which is the difference between a tool that knows them and a
 * form that does not.
 *
 * IT IS CONTEXT, NOT AN INSTRUCTION. It says what exists. It never says to mention it, and the
 * model is told plainly that most of it will be irrelevant to what this person is doing today.
 */

export interface WhatTheyAlreadyHaveHere {
  /** What they call themselves here, if the product knows. */
  jobTitle?: string | null;
  /** The check-ins this same person set up, newest first. Labels only, never anybody's words. */
  theirCheckIns: { label: string; about?: string | null }[];
}

/** How many of their existing check-ins are worth naming. More than a handful is a list, not context. */
export const ENOUGH_TO_RECOGNISE_THEM = 5;

export function whatTheyAlreadyHave(theirs?: WhatTheyAlreadyHaveHere | null): string {
  if (!theirs) return '';
  const rows = (theirs.theirCheckIns ?? []).slice(0, ENOUGH_TO_RECOGNISE_THEM);
  if (!rows.length && !theirs.jobTitle) return '';

  const lines = [
    'WHO YOU ARE TALKING TO. They are signed in, and the product already knows this much about them.',
    'Most of it will have nothing to do with what they are setting up today, and that is fine - it is',
    'here so you do not ask for something they have already told us, and so you can recognise a',
    'situation they have been in before. Never read it back as a summary, and never assume this new',
    'situation is one of these.',
    '',
  ];
  if (theirs.jobTitle) lines.push(`- What they do: ${theirs.jobTitle}`);
  if (rows.length) {
    lines.push('- Check-ins they have already set up:');
    for (const r of rows) lines.push(`  - ${r.label}${r.about ? ` (${r.about})` : ''}`);
  }
  return lines.join('\n');
}
