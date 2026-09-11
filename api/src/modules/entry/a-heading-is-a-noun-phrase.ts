/**
 * A HEADING IS A NOUN PHRASE, OR IT IS NOT A HEADING.
 *
 * Live reports produced these as card titles, in a column beside each other:
 *
 *   "expect not shared"
 *   "expect not yet shared"
 *   "Feedback channel is undefined"
 *
 * The third is fine. The first two are fragments lifted out of the middle of a sentence, rendered
 * in bold at the top of a card, and they read as a fault in the page rather than as a finding. The
 * schema now asks for a noun phrase and the model still produced one of them, which is the usual
 * result of asking: a description is a request.
 *
 * SO THE CARD LOSES ITS HEADING, NOT ITS CONTENT. Everything under the title - what we noticed, why
 * it matters, what to do next - is untouched and is the part the reader needs. A card with three
 * full paragraphs and no heading reads as a finding. The same card headed "expect not shared" reads
 * as broken software. This is a presentation decision about one line, and it deletes nothing.
 *
 * THE TEST IS NARROW on purpose. A heading that opens with a lowercase letter was not written as a
 * heading, and a heading that opens with a bare verb is a clause. Everything else is kept, because
 * a title we merely dislike is still the model's read and not ours to overrule.
 */
const OPENS_WITH_A_VERB =
  /^(expect|expects|expected|need|needs|needed|want|wants|wanted|told|tell|said|say|says|gave|give|gives|has|have|had|is|are|was|were|do|does|did|make|makes|made|get|gets|got|keep|keeps|kept|take|takes|took|put|puts)\b/i;

export function aHeadingOrNothing(title: unknown): string | null {
  const t = typeof title === 'string' ? title.trim() : '';
  if (!t) return null;
  /* Written as a heading by somebody who meant it as one. */
  if (!/^[A-Z0-9"']/.test(t)) return null;
  if (OPENS_WITH_A_VERB.test(t)) return null;
  /* One word is a label, not a heading, unless it is a proper noun - and we cannot tell, so it goes. */
  if (!/\s/.test(t)) return null;
  return t;
}

/** The same, over a list of cards, keeping every other field. */
export function withHeadingsThatReadAsHeadings<T extends { title?: unknown }>(cards: T[]): T[] {
  return (cards ?? []).map((c) => ({ ...c, title: aHeadingOrNothing(c.title) ?? undefined }));
}
