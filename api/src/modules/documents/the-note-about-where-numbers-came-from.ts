/**
 * THE NOTE THAT SAYS WHERE THE NUMBERS CAME FROM, WRITTEN ONCE, AND SAID BACK BEFORE IT IS WRITTEN.
 *
 * Everyone on the check-in reads it (audience EVERYONE). It names the file only when everyone may
 * open that file (request 46), and it never says "when it was set up", because a document can be
 * added at any time (request 92, point 2).
 */
export function theNoteAboutWhereTheNumbersCameFrom(fileName: string, documentVisibility?: string | null): string {
  return documentVisibility === 'OPEN'
    ? `The numbers on this check-in come from ${fileName}.`
    : 'The numbers on this check-in come from a document the person running it added.';
}

/** The sentence said before the yes, so nobody is asked to agree to a note they were never shown. */
export function aboutTheNoteBeforeTheYes(fileName: string, documentVisibility?: string | null): string {
  return `If you say yes, I will also add a note that everyone on this check-in can read. The note will read “${theNoteAboutWhereTheNumbersCameFrom(fileName, documentVisibility)}”`;
}
