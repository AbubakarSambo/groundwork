/**
 * THE CONTEXT CHAT WAS HANDED A NUMBER WHERE THE DOCUMENTS SHOULD HAVE BEEN.
 *
 * It received `openDocumentCount` - how many files exist and nothing about what is in them. Two
 * consequences, and the second is worse than the first:
 *
 *   It could not tell somebody what their own document said, which is the thing they asked for.
 *   And at a count of zero it asks "is there anything in writing everybody should work from?",
 *     while at a count of one it stops asking - so attaching a document made the conversation
 *     quieter without making it better informed. The gap closed on the file existing rather than on
 *     anybody having read it.
 *
 * SAYING BACK WHAT IT READ IS THE POINT, NOT A COURTESY. Somebody who has just uploaded a
 * forty-page brief has no way to know whether the thing reading it got the right half. Two or three
 * lines of "here is what I have taken from this" is the only way to find out before the check-ins
 * start, and it is cheap: they can correct it in the same breath.
 *
 * WHAT IT MUST NOT DO. It may not treat a document as agreement. A brief is what one person wrote
 * down, usually before the other people arrived, and reading it aloud does not make it shared. The
 * chat can say what a document contains and offer it as context; it cannot say the team has agreed
 * to it, and it cannot record it as anybody's objective.
 */

export interface AttachedDocument {
  fileName: string;
  content: string;
  uploaderNote?: string | null;
}

/**
 * WHAT THE CHAT IS TOLD TO DO WITH THEM.
 *
 * Bounded by the caller before it reaches here - the same size rule the check-in uses - so this is
 * only the instruction, not the text.
 */
export const READ_THEM_BACK =
  'YOU HAVE READ WHAT THEY ATTACHED. Before anything else, say what is in it: two or three lines, '
  + 'plainly, naming the document. Say what you will use it for in the check-ins, and say what it '
  + 'does NOT settle - a brief is what one person wrote down, usually before the others arrived, and '
  + 'reading it does not make it agreed. Then ask them to correct anything you have wrong. '
  + 'Never quote it back at length, never treat it as somebody\'s objective, and never say the team '
  + 'has agreed to something because a document says it.';

export const NOTHING_ATTACHED =
  'NOTHING IS ATTACHED. Ask for whatever is already in writing - the brief, the plan, the scope, the '
  + 'grant terms, the message that started this. Ask once, take no for an answer, and do not ask '
  + 'again in this conversation.';

/** The block the prompt carries. Empty is a real answer and reads as "nothing attached". */
export function whatTheDocumentsSay(docs: AttachedDocument[], text: string): string {
  if (!docs.length) return NOTHING_ATTACHED;

  const named = docs.map((d) => d.fileName).join(', ');
  const asked = docs
    .map((d) => (d.uploaderNote?.trim() ? `For "${d.fileName}" they asked you to look for: ${d.uploaderNote.trim()}` : null))
    .filter(Boolean)
    .join('\n');

  return [
    `WHAT THEY HAVE ATTACHED: ${named}.`,
    asked,
    READ_THEM_BACK,
    '',
    text,
  ].filter(Boolean).join('\n');
}

/**
 * A DOCUMENT EXISTING IS NOT THE GAP BEING CLOSED.
 *
 * The gap list asked for something in writing and stopped asking as soon as a file existed. That is
 * the wrong test: the reason to want a document is that everybody works from the same one, and a
 * file nobody has read to the team closes nothing. The gap now closes when a document exists AND
 * the chat has read it, which is what the count could never express.
 */
export function stillNeedsSomethingInWriting(openDocumentCount: number, readAny: boolean): boolean {
  return openDocumentCount === 0 || !readAny;
}
