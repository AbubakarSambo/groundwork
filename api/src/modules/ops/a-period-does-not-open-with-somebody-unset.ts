/**
 * THE QUARTER GATE.
 *
 * A period cannot be opened while somebody active has no objective in it.
 *
 * The rule exists because of what happens without it, which we have already
 * watched happen: a quarter starts, three people have objectives, three do not,
 * and nobody notices until the quarter is being reviewed - at which point the
 * three without one are measured against something written afterwards, or
 * against nothing, and both are worse than either of them would have accepted
 * on day one. The moment to agree what somebody is measured on is BEFORE the
 * period, and there is exactly one moment that is reliably before it.
 *
 * It is a REFUSAL rather than a warning on purpose. A warning at the top of a
 * page is read once and then becomes furniture, and this one would appear on
 * the busiest day of the quarter. The refusal names the people, so the thing
 * standing between the company and its quarter is a list of names rather than
 * an error.
 *
 * WHAT IT DELIBERATELY DOES NOT CHECK: whether the objective is any good.
 * `an-objective-is-not-a-note.ts` already refuses an objective with no
 * justification and no alternative, at the point of writing it. Re-checking
 * quality here would make opening a quarter a review of six people's work by
 * whoever happened to press the button.
 */

export interface SomebodyActive {
  personId: string;
  displayName: string;
}

/**
 * Null when the period may open. Otherwise the sentence that says why not.
 *
 * `ownerIds` is every person who owns at least one objective in the period -
 * passed in rather than looked up, so this file can be read and tested without
 * a database and cannot quietly start counting something else.
 */
export function whyThisPeriodCannotOpenYet(input: {
  periodName: string;
  active: SomebodyActive[];
  ownerIds: Set<string>;
}): string | null {
  /*
   * NOBODY ACTIVE IS NOT A PASS.
   *
   * An empty team passes "everybody has an objective" on a technicality, and
   * the technicality is how a period opens against a team that has not been
   * set up. Said separately because it needs a different fix.
   */
  if (input.active.length === 0) {
    return `There is nobody active on the team, so there is nobody for ${input.periodName} to be a period for. Add the team before opening it.`;
  }

  const unset = input.active.filter((p) => !input.ownerIds.has(p.personId));
  if (unset.length === 0) return null;

  const names = unset.map((p) => p.displayName).sort((a, b) => a.localeCompare(b));

  return (
    `${names.join(', ')} ${names.length === 1 ? 'has' : 'have'} no objective in ${input.periodName}. ` +
    'A period opens once everybody active has agreed what they are measured on - after it opens, an objective written for somebody is a target they did not get to argue with.'
  );
}

/**
 * What the gate would say right now, without opening anything.
 *
 * The same computation, offered as a question rather than as a refusal, so the
 * quarter page can show what is outstanding while it is still fixable. One
 * function would have been one fewer, and it would have meant the page calling
 * the thing that opens the period in order to find out whether it could.
 */
export function whatStandsBetweenUsAndOpening(input: {
  periodName: string;
  active: SomebodyActive[];
  ownerIds: Set<string>;
}): { ready: boolean; says: string; waitingOn: string[] } {
  const refusal = whyThisPeriodCannotOpenYet(input);
  const waitingOn = input.active
    .filter((p) => !input.ownerIds.has(p.personId))
    .map((p) => p.displayName)
    .sort((a, b) => a.localeCompare(b));

  return {
    ready: refusal === null,
    says: refusal ?? `Everybody active has an objective in ${input.periodName}. It can be opened.`,
    waitingOn,
  };
}
