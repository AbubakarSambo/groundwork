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
  /**
   * THE PEOPLE ALREADY IN THEIR ORGANISATION, as any member sees them on People: a name, a role and a team, nothing more (the one reader,
   * common/colleagues.ts). Round 6: the family business and clinic admins added their team on People first, then said "my team" in setup,
   * and setup knew only the names said again in the conversation, so Ben Juma, Diana Omondi and Emeka Obi were left off.
   */
  people?: { name: string; role: string; team: string | null }[];
}

/** How many of the organisation's people are worth naming. Past this the lead names who they mean, and the model asks which. */
export const ENOUGH_PEOPLE_TO_RECOGNISE = 30;

/**
 * Who is already in the organisation, said for the setup conversation and for the reading of it, so "my team" or "the four I just added"
 * is understood as these people, confirmed in one question, and never asked for again by name or email.
 */
export function thePeopleAlreadyHere(theirs?: WhatTheyAlreadyHaveHere | null): string {
  const people = (theirs?.people ?? []).slice(0, ENOUGH_PEOPLE_TO_RECOGNISE);
  if (!people.length) return '';
  const more = (theirs?.people?.length ?? 0) - people.length;
  return [
    'PEOPLE ALREADY IN THEIR ORGANISATION. They added these people on People, so their emails and numbers are already known:',
    ...people.map((p) => `- ${p.name}${p.team ? `, ${p.team}` : ''}`),
    ...(more > 0 ? [`- and ${more} more`] : []),
    'When they speak of their team, or of people they added, work out which of these they mean from what they said, and say who you',
    'take it to be in one question so they can confirm it. Never ask for the name, email or number of somebody on this list. Not',
    'everybody here is on every check-in: their words decide who is.',
  ].join('\n');
}

/** How many of their existing check-ins are worth naming. More than a handful is a list, not context. */
export const ENOUGH_TO_RECOGNISE_THEM = 5;

export function whatTheyAlreadyHave(theirs?: WhatTheyAlreadyHaveHere | null): string {
  if (!theirs) return '';
  const rows = (theirs.theirCheckIns ?? []).slice(0, ENOUGH_TO_RECOGNISE_THEM);
  if (!rows.length && !theirs.jobTitle && !theirs.people?.length) return '';

  const lines = [
    'WHO YOU ARE TALKING TO. They are signed in, and the product already knows this much about them.',
    'Most of it will have nothing to do with what they are setting up today, and that is fine - it is',
    'here so you do not ask for something they have already told you, and so you can recognise a',
    'situation they have been in before. Never read it back as a summary, and never assume this new',
    'situation is one of these.',
    '',
  ];
  if (theirs.jobTitle) lines.push(`- What they do: ${theirs.jobTitle}`);
  if (rows.length) {
    lines.push('- Check-ins they have already set up:');
    for (const r of rows) lines.push(`  - ${r.label}${r.about ? ` (${r.about})` : ''}`);
  }
  const people = thePeopleAlreadyHere(theirs);
  if (people) lines.push('', people);
  return lines.join('\n');
}
