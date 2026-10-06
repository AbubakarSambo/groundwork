/**
 * A DOCUMENT THAT READS DIFFERENTLY FROM THE RECORD IS ASKED ABOUT ONCE (week 14, request 6c).
 *
 * Anchoring notes when a document the person can see says something differently from a line of
 * theirs (`RecordEntry.documentSays`). The check-in then put it to them - and "do not raise it
 * twice" was only a sentence in the prompt. The rows it read were every such line, every turn, in
 * every check-in after, so nothing in the code stopped it being asked again and again.
 *
 * Now the turn that raises it is stamped, on the field every AI turn already has for saying what it
 * asked (`ConversationTurn.askedFor`), as "reads differently:" and the line's id. A line with a
 * stamp is never put to the model again, in this check-in or any later one. The person's answer is
 * their next turn, kept like every other answer; their line keeps their own words, and the document
 * is never ruled right.
 *
 * WHETHER A REPLY RAISED IT is read from the reply, not assumed from the prompt: the reply has to
 * put the document's words to them - its number, where it has one, or its words - and ask.
 */
import { theNumbersIn } from './yes-but-a-new-number';

export const READS_DIFFERENTLY = 'reads differently:';

export interface ALineADocumentReadsDifferently {
  id: string;
  text: string;
  documentSays: string | null;
}

/** The lines already put to this person, from the stamps on the turns that asked them. */
export function alreadyAsked(stamps: (string | null | undefined)[]): Set<string> {
  return new Set(stamps.filter((s): s is string => !!s && s.startsWith(READS_DIFFERENTLY)).map((s) => s.slice(READS_DIFFERENTLY.length)));
}

/** Whether this reply put the document's side of this line to them as a question. */
export function thisReplyRaisesIt(reply: string, line: ALineADocumentReadsDifferently): boolean {
  const said = reply ?? '';
  const doc = (line.documentSays ?? '').trim();
  if (!doc || !said.includes('?')) return false;
  const numbers = theNumbersIn(doc);
  if (numbers.length) {
    const inReply = new Set(theNumbersIn(said));
    return numbers.every((n) => inReply.has(n));
  }
  const lower = said.toLowerCase();
  return lower.includes(doc.toLowerCase().slice(0, 40));
}

/** The stamp for the first of these lines this reply raised, or null. */
export function theStampForWhatItRaised(reply: string, lines: ALineADocumentReadsDifferently[]): string | null {
  const hit = lines.find((l) => thisReplyRaisesIt(reply, l));
  return hit ? `${READS_DIFFERENTLY}${hit.id}` : null;
}
