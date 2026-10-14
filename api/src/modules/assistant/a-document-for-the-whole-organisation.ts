import { chunk } from '../knowledge/a-document-is-not-a-card';
import { askName, isAMadeUpWorkspaceName } from './ask-name';

/**
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
 * Only an admin of the organisation may do this, checked on the server when the file arrives and again at the yes.
 */

export const ORGANISATION_DOCUMENT_KIND = 'organisation_document';

/** The picker's target in the `next_step` block: not a check-in's id. */
export const FOR_THE_ORGANISATION = 'organisation';

/** Words that say the document is for everybody, not for one check-in. */
export const SAYS_IT_IS_FOR_THE_ORGANISATION = /\b(?:whole\s+)?(?:organi[sz]ation|company|everyone|everybody|handbook|policy|policies)\b/i;

/** "Msingi Foods", or "your organisation" when there is no real name yet. */
export function theOrganisation(name?: string | null): string {
  const n = (name ?? '').replace(/\s+/g, ' ').trim();
  return n && !isAMadeUpWorkspaceName(n) ? n : 'your organisation';
}

/** "Msingi Foods' handbook", "Baridi Appliances' handbook", "Kijani's handbook", "your organisation's handbook". */
export function itsHandbook(name?: string | null): string {
  const n = theOrganisation(name);
  return `${n}${/s$/i.test(n) ? "'" : "'s"} handbook`;
}

export const OFFER_FOR_THE_ORGANISATION = (name?: string | null): string =>
  `It will be for the whole of ${theOrganisation(name)}. When you choose the file, I will read it and tell you what is in it. Nothing is added until you say yes.`;

export const ONLY_AN_ADMIN_ADDS_ONE = (name?: string | null): string =>
  `Only an admin of ${theOrganisation(name)} can add a document for the whole organisation.`;

export const NO_WORDS_IN_IT = (title: string): string =>
  `I could not find any words in ${title}, so there is nothing to add. If it is a scan, try a copy that has the text in it.`;

/** The title a person reads: the file's name without its ending. */
export function aTitleFor(fileName: string): string {
  return (fileName ?? '').replace(/\.[a-z0-9]{1,5}$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim() || 'The document';
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
export function whatTheDocumentSays(title: string, text: string, name?: string | null): { body: string; summary: string } {
  const { count, headings } = itsParts(title, text);
  const shown = headings.slice(0, 6);
  const more = headings.length - shown.length;
  const parts = count <= 1
    ? 'It is short, so it would be kept as one part.'
    : headings.length
      ? `It has ${count} parts. They cover ${inAList(more > 0 ? [...shown, `${more} more`] : shown)}.`
      : `It has ${count} parts.`;
  const body = `I have read ${title}. ${parts}\n\nNothing is added yet. If you say yes, it becomes part of ${itsHandbook(name)}. ${askName(name)} answers from it, and check-ins are read with it in mind. If you say no, nothing from it is kept.`;
  return { body, summary: `Add ${title} to ${itsHandbook(name)}?` };
}

export const ADDED_TO_THE_HANDBOOK = (title: string, parts: number, name?: string | null): string =>
  `I have added ${title} to ${itsHandbook(name)}, ${parts === 1 ? 'as one part' : `in ${parts} parts`}. ${askName(name)} answers from it from now on.`;

export const NOT_ADDED = (title: string): string => `I have not added ${title}. Nothing from it was kept.`;
