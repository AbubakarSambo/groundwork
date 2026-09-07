/**
 * WHAT THEY ARE LOOKING AT, WHICH THE HOST PAGE ALREADY TELLS US AND NOTHING READ.
 *
 * The loader exposes `groundwork.context({ subjectExternalId })` so a customer's page can say what
 * the person is on — an objective, a project, a decision. The panel received that message and put
 * it on `window.__gwContext`, and NOTHING has ever read that property. So the documented promise —
 * the panel "opens grounded rather than cold" — did nothing at all: a person on a specific
 * objective got the same generic greeting as somebody who opened the panel from a dashboard.
 *
 * This is a READ and deliberately nothing more. It changes what the panel says first; it does not
 * put a subject into anybody's record, and it does not put words in their mouth — a chat message
 * is what the person typed, and a page's idea of context has no business in it.
 *
 * The id comes from the customer's own page, so it is treated as a claim to be checked rather than
 * a fact: only a subject in this organisation, still present, can be opened on.
 */

export interface ASubjectTheyAreOn {
  externalId: string;
  title: string;
  kind: string | null;
}

/** What the panel says when the host has told us what the person is looking at. */
export function openingAbout(
  subject: ASubjectTheyAreOn,
  firstName: string,
  waitingOnThem: number,
): { line: string; source: string; suggestions: string[] } {
  const kind = (subject.kind ?? 'this').toLowerCase();
  const line = waitingOnThem > 0
    ? `${firstName} — you are on ${subject.title}. There ${waitingOnThem === 1 ? 'is one thing' : `are ${waitingOnThem} things`} waiting on you here.`
    : `${firstName} — you are on ${subject.title}. Ask me anything about it.`;
  return {
    line,
    source: 'what_they_are_looking_at',
    suggestions: [
      `Where is ${subject.title} up to?`,
      `Who is waiting on me on ${subject.title}?`,
      `What changed on this ${kind}?`,
    ],
  };
}
