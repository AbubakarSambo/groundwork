/**
 * A DOCUMENT WE COULD NOT READ IS NOT A SOURCE.
 *
 * When text cannot be extracted - a scanned PDF, a spreadsheet that will not parse, a file type
 * with no reader - the content column is filled with a sentence saying so: "[Attached: budget.xlsx
 * - could not parse spreadsheet.]". That is the right thing to store. The document IS on record,
 * the person did attach it, and saying nothing would lose that.
 *
 * What it must never be is evidence. The sentence is ours, not theirs, and it describes a failure
 * on our side. Three readers already stepped around it one at a time - the assessment, the origin
 * decision, the description check - each with its own inline `startsWith('[Attached:')`. The fourth
 * did not exist when those were written: the anchoring pass hands every document to the model and
 * asks which record lines they back.
 *
 * That is the one that hurts. An anchored line is marked as backed by a document, and a backed line
 * is what makes a report say the evidence behind it is strong. So an apology for a file we could
 * not open could raise the confidence of a report about somebody's work.
 *
 * One name, so the fifth reader cannot forget. Held by a spec that fails when a reader of document
 * content does not ask it.
 */

/** The prefix every could-not-read placeholder carries. Written by the extractors in documents.service. */
export const WE_COULD_NOT_READ_IT = '[Attached:';

/** Is this content the document's own words, or our note that we could not read it? */
export function weCouldNotReadIt(content: string | null | undefined): boolean {
  return (content ?? '').trimStart().startsWith(WE_COULD_NOT_READ_IT);
}

/** The documents that can actually back something. Anything else is on record and carries no weight. */
export function onlyWhatWeCouldRead<T extends { content?: string | null }>(documents: T[]): T[] {
  return documents.filter((d) => !weCouldNotReadIt(d.content));
}
