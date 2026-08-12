/**
 * WHAT A NOTE WRITTEN BETWEEN SESSIONS SAYS TO THE ENGINE.
 *
 * A ground reads like a channel, and a channel invites you to type. Between
 * sessions there is no check-in to type into, so the composer takes a private note
 * instead of showing a dead input. This is how that note reaches the next session.
 *
 * IT IS A QUESTION TO ASK, NOT A FACT TO ACCEPT, and the wording is the whole
 * mechanism. "They noted this" invites the engine to treat it as established, and
 * the record would then hold a claim nobody ever tested - which is the failure
 * this product exists to prevent. So the block says what a note actually is:
 * unexamined, written alone, unprompted.
 *
 * A note is never a RecordEntry. That table is the record, the shared report reads
 * it, and the other party's context reads theirs - see a-note-is-not-the-record.
 *
 * In its own file so the assembled text can be tested as text. The rule here is
 * one I have broken before: prove it at the prompt, not at the code that builds
 * the prompt.
 */

export interface BetweenSessionNote {
  text: string;
}

export function buildNotesBlock(notes: BetweenSessionNote[]): string {
  const real = notes.map((n) => (n.text ?? '').trim()).filter(Boolean);
  if (real.length === 0) return '';

  return [
    'BETWEEN SESSIONS THEY WROTE THESE DOWN FOR THEMSELVES:',
    '',
    ...real.map((t) => `- "${t}"`),
    '',
    'These are notes, not answers. Nobody asked for them and nothing in them has been checked.',
    'Do not put any of it on record as established. Do not read it back as though they told you.',
    'Raise what is relevant as a question, in your own words, at the point it fits - for example',
    '"you made a note about the deadline, what is going on there?" - and let what they say under',
    'questioning be the record. If a note turns out not to matter, let it go.',
  ].join('\n');
}
