import { chunk } from '../knowledge/a-document-is-not-a-card';
import { WHAT_IS_IN_IT_PROMPT, aReadableTitle } from '../knowledge/the-desk';
import { askName, theAssistant, isAMadeUpWorkspaceName } from './ask-name';

/**
 * AN ADMIN OR A LEAD ADDS A DOCUMENT FOR THE WHOLE ORGANISATION THROUGH ASK (S7, 20 November 2026: leads too, and it goes
 * on the Desk with its summary, the same way a document added on the Desk does)
 *
 * AN ADMIN ADDS A DOCUMENT FOR THE WHOLE ORGANISATION THROUGH ASK (Hafsah's fix list, item 3, 14 October 2026:
 * "Give admins the same 'add a document' in Ask that leads have, said back before anything is kept").
 *
 * A lead's document goes on a check-in they run. An admin who runs none was told "You have none open, so there is
 * nowhere to put one yet ... whoever set Groundwork up can add it", and the admin is that person. So an admin's
 * document goes where the prototype puts one: the organisation's handbook ("An admin uploads the full handbook
 * once", B2, company context), which Ask answers from and check-ins are read with.
 *
 * SAID BACK BEFORE ANYTHING IS KEPT. The file is read, and what it holds is said back with a yes and a no. Only the
 * yes adds it (KnowledgeService.ingestDocument, the same split into cards the developer API uses). A no, or
 * changing the subject, keeps nothing: the words held while the question waits are taken off the waiting row.
 * Only an admin or a lead of the organisation may do this (the-desk.ts, `mayAddToTheDesk`), checked on the server when the
 * file arrives and again at the yes.
 */

export const ORGANISATION_DOCUMENT_KIND = 'organisation_document';

/** The picker's target in the `next_step` block: not a check-in's id. */
export const FOR_THE_ORGANISATION = 'organisation';

/** Words that say the document is for everybody, not for one check-in. */
export const SAYS_IT_IS_FOR_THE_ORGANISATION = /\b(?:whole\s+)?(?:organi[sz]ation|company|everyone|everybody|handbook|policy|policies)\b/i;

/**
 * SAID PLAINLY FOR THE WHOLE ORGANISATION, EVEN INSIDE A CHECK-IN'S SETUP CONVERSATION (local test of staging, 15 October).
 * Narrower than the test above, which also takes "everyone" or "policy": inside a check-in those can mean its own people.
 * "The whole organisation", "the entire company", "for the organisation" cannot.
 */
export const SAYS_IT_IS_FOR_THE_WHOLE_ORGANISATION = /\b(?:whole|entire)\s+(?:organi[sz]ation|company)\b|\bfor\s+the\s+(?:organi[sz]ation|company)\b/i;

/** "Msingi Foods", or "your organisation" when there is no real name yet. */
export function theOrganisation(name?: string | null): string {
  const n = (name ?? '').replace(/\s+/g, ' ').trim();
  return n && !isAMadeUpWorkspaceName(n) ? n : 'your organisation';
}

/** "Msingi Foods' Desk", "Kijani's Desk", "your organisation's Desk". */
export function itsDesk(name?: string | null): string {
  const n = theOrganisation(name);
  return `${n}${/s$/i.test(n) ? "'" : "'s"} Desk`;
}

export const OFFER_FOR_THE_ORGANISATION = (name?: string | null): string =>
  `It will be for the whole of ${theOrganisation(name)}. When you choose the file, I will read it and tell you what is in it. Nothing is added until you say yes.`;

export const NOT_YOURS_TO_ADD = (name?: string | null): string =>
  `Only an admin or a lead of ${theOrganisation(name)} can add a document for the whole organisation.`;

export const NO_WORDS_IN_IT = (title: string): string =>
  `I could not find any words in ${title}, so there is nothing to add. If it is a scan, try a copy that has the text in it.`;

/** The title a person reads: the file's name without its ending. */
export function aTitleFor(fileName: string): string {
  /* Readable, not the file's slug: "msingi-leave-policy.pdf" is "Msingi leave policy" (round 2, T4). One maker, in the-desk.ts. */
  return aReadableTitle(fileName);
}

function inAList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** The parts it would be kept in, by their headings, the same split the yes writes. */
export function itsParts(title: string, text: string): { count: number; headings: string[] } {
  const pieces = chunk(title, text);
  const headings: string[] = [];
  for (const p of pieces) {
    const h = p.heading.trim();
    if (h && h !== title.trim() && !headings.includes(h)) headings.push(h);
  }
  return { count: pieces.length, headings };
}

/** What the admin reads after the file is read, before anything is kept. */
/* What is in it, said in two or three plain sentences by the model before anything else (26 October 2026: it said only how many parts).
   Kept with the document as its summary on the Desk; the prompt lives with the Desk (the-desk.ts). */
export { WHAT_IS_IN_IT_PROMPT };

export function whatTheDocumentSays(title: string, text: string, name?: string | null, whatIsInIt?: string | null): { body: string; summary: string } {
  const { count, headings } = itsParts(title, text);
  const shown = headings.slice(0, 6);
  const more = headings.length - shown.length;
  const parts = count <= 1
    ? 'It is short, so it would be kept as one part.'
    : headings.length
      ? `It has ${count} parts. They cover ${inAList(more > 0 ? [...shown, `${more} more`] : shown)}.`
      : `It has ${count} parts.`;
  const inIt = String(whatIsInIt ?? '').replace(/\s+/g, ' ').trim().slice(0, 600);
  const body = `I have read ${title}. ${inIt ? `${inIt} ` : ''}${parts}\n\nNothing is added yet. If you say yes, it goes on ${itsDesk(name)}, where everyone in ${theOrganisation(name)} can read it. ${theAssistant()} answers from it, and check-ins read it when it applies. If you say no, nothing from it is kept.`;
  return { body, summary: `Add ${title} to ${itsDesk(name)}?` };
}

export const ADDED_TO_THE_DESK = (title: string, parts: number, name?: string | null): string =>
  `I have added ${title} to ${itsDesk(name)}, ${parts === 1 ? 'as one part' : `in ${parts} parts`}. ${theAssistant()} answers from it from now on, and check-ins read it when it applies.`;

export const NOT_ADDED = (title: string): string => `I have not added ${title}. Nothing from it was kept.`;
