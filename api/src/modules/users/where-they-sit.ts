/**
 * WHERE SOMEBODY SITS IN THE ORGANISATION (U.4): their level, their team, and who they report to.
 *
 * The prototype's People page ("Who reports to whom") and one person's page ("Where they sit"), with
 * the line under it: "This describes the organisation. What Miriam can do still comes only from their
 * role and their access to each check-in." So nothing here is read by any access rule, and nothing in
 * this file grants anything. Stored on the membership, because one person sits differently in each
 * organisation they belong to.
 *
 * Pure functions, so the rules can be tested without a database.
 */

/** A typed value, tidied: spaces trimmed and collapsed, and a blank box means "not set". */
export function aLineOrNothing(value: string | null | undefined): string | null {
  if (value == null) return null;
  const tidy = value.replace(/\s+/g, ' ').trim();
  return tidy ? tidy : null;
}

/**
 * Would making `personId` report to `managerId` close a loop?
 *
 * `reportsTo` maps each person to whom they report now. Walks up from the new manager; if it reaches
 * the person, the line would go round in a circle and the tree could never be drawn. Stops after as
 * many steps as there are people, so a loop already in the data cannot hang the check.
 */
export function wouldMakeALoop(personId: string, managerId: string, reportsTo: Map<string, string | null>): boolean {
  if (personId === managerId) return true;
  let at: string | null | undefined = managerId;
  for (let steps = 0; at && steps <= reportsTo.size; steps += 1) {
    if (at === personId) return true;
    at = reportsTo.get(at) ?? null;
  }
  return false;
}

/** The sentences the server refuses with, which the page shows as they are. */
export const CANNOT_REPORT_TO_THEMSELVES = 'Someone cannot report to themselves.';
export const THAT_WOULD_MAKE_A_LOOP = 'That would make a loop, because that person already reports to them, directly or through someone else.';
export const NOT_IN_THIS_ORGANISATION = 'That person is not in this organisation.';
