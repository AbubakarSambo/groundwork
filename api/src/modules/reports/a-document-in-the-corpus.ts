/**
 * A DOCUMENT THE WHOLE CHECK-IN CAN SEE, NAMED IN THE CORPUS.
 *
 * Sixteen documents were attached across a hundred audited journeys and one report of a hundred and
 * forty-five mentioned a document at all. The reason is in the assembly: the synthesis prompt is
 * handed `docStatus.total`, a COUNT, and nothing else. Claims extracted from a document do reach
 * the corpus as record entries, so the content is not invisible — but nothing says which document
 * anything came from, so the report cannot refer to one, and somebody who attached a contract and
 * answered questions about it reads a record that never acknowledges it exists.
 *
 * ONLY OPEN DOCUMENTS ARE NAMED HERE, and that is the whole of the privacy reasoning:
 *
 * The corpus produces ONE shared picture that every party reads. A document with OWN visibility is
 * a party's own evidence for their own account — naming it in the shared record would disclose to
 * the other side that it exists and what it is called, which is a decision they did not make when
 * they attached it. `what-this-record-rests-on.ts` handles their own view of their own files, per
 * reader, through `canSeeDocument`. An OPEN document is different by definition: it was attached so
 * that everybody on the check-in works from it.
 *
 * AND WHAT IS SAID ABOUT IT IS THE ENGINE'S READING, NOT THE DOCUMENT. The assessment is what was
 * taken from the file when it arrived, and it is labelled as such, so the model weighs it as
 * evidence somebody supplied rather than as a party's own words — the same rule as lead-supplied
 * context.
 */

export interface AnOpenDocument {
  fileName: string;
  /** The label of the party who attached it, from the report's own naming map. */
  attachedBy: string;
  /** What the engine read from it when it arrived, if anything. */
  suggests?: string[];
  /** What the person said as they attached it, in their own words. */
  uploaderNote?: string | null;
}

export function documentsSection(docs: readonly AnOpenDocument[]): string {
  if (!docs.length) return '';
  const lines = docs.map((d) => {
    const read = d.suggests?.length ? ` What was read from it: ${d.suggests.join('; ')}.` : ' Nothing was read from it.';
    const said = d.uploaderNote?.trim() ? ` They said as they attached it: "${d.uploaderNote.trim()}".` : '';
    return `- "${d.fileName}", attached by ${d.attachedBy}.${read}${said}`;
  });
  return (
    'DOCUMENTS EVERYBODY ON THIS CHECK-IN CAN SEE (evidence the parties supplied, NOT their own ' +
    'words. You may refer to a document by name where it bears on what somebody said. Never quote ' +
    'it as a party speaking, and never treat what a document asserts as established fact - a ' +
    'document is what somebody wrote down, which is exactly what the accounts are being weighed ' +
    "against):\n" +
    lines.join('\n') +
    '\n\n'
  );
}
