/**
 * WHETHER ANYTHING THAT JUDGES A PERSON IS BUILT AND SERVED, A SWITCH PER ORGANISATION (production truth, 19 October 2026).
 *
 * WHERE IT IS KEPT. `Organization.personJudgementsOn`, true for every organisation, as it has always been. It is set off for one
 * organisation at a time by `scripts/the-person-judgements.ts <organisation id> off --yes` (docs/deploy.md: Abubakar sets it off for
 * Drop Access in production).
 *
 * WHAT IT HOLDS BACK, OFF, AND ONLY THAT. Everything that judges a person, never built and never served for that organisation:
 *  - My work's behaviours (strengths and needs work), its focus line, the coaching from a person's patterns and the strengths to keep,
 *    the lead's coaching note about one person, and the check-in quality counts about the person (on time, specific);
 *  - the patterns found about a person, and the lines served from them on the board, in the reports and in the check-in;
 *  - the detectors' verdicts about a person;
 *  - the coaching about a person, in the check-in and anywhere it is served;
 *  - a suggestion about a person, and a role gap note about a person.
 * The board, the summaries and the reports still go ahead: they say what happened, never what somebody is.
 *
 * READ ONCE PER CALL. A database with no such row (a test, a script) reads as on, as every organisation has been. A row that cannot be
 * read for any other reason reads as off: nothing that judges a person goes out on a guess.
 */
export const THE_PERSON_JUDGEMENTS = 'personJudgementsOn';

type Reader = { organization?: { findUnique?: (a: any) => Promise<any> } } | any;

export async function thePersonJudgementsAreOn(prisma: Reader, organizationId: string | null | undefined): Promise<boolean> {
  if (!organizationId) return true;
  const find = prisma?.organization?.findUnique;
  if (typeof find !== 'function') return true;
  try {
    const org = await find.call(prisma.organization, { where: { id: organizationId }, select: { personJudgementsOn: true } });
    return org?.personJudgementsOn !== false;
  } catch {
    return false;
  }
}

/** The same, for the organisation a check-in belongs to. */
export async function thePersonJudgementsAreOnFor(prisma: Reader, groundId: string | null | undefined): Promise<boolean> {
  if (!groundId) return true;
  const find = prisma?.ground?.findUnique;
  if (typeof find !== 'function') return true;
  try {
    const g = await find.call(prisma.ground, { where: { id: groundId }, select: { organizationId: true } });
    return thePersonJudgementsAreOn(prisma, g?.organizationId ?? null);
  } catch {
    return false;
  }
}

/** The sentence a reader reads where a judgement would have been, in plain words, never a label. */
export const NOT_SHOWN_IN_THIS_ORGANISATION = 'This part is turned off for your organisation.';
