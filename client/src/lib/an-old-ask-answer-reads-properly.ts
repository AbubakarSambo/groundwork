/**
 * B-016: AN OLD ASK ANSWER, REOPENED, READ "...What can you help me with?.", a question mark run
 * straight into a full stop.
 *
 * Every live answer arrives as structured blocks (a sentence, then its own buttons), but the page
 * a person reopens only reads back `AskTurn.says` (api/src/api/ask.ts) - the flattened sentence
 * the server also writes for history, with the choices folded in as a clause rather than kept as
 * their own buttons. Restoring the real buttons needs the server to serve the structured choices
 * for a past turn, which it does not yet (see docs/requests-to-engine.md); this is the plain
 * sentence `the way it reads properly instead - cleaning up the mechanical seam double
 * punctuation leaves ("?." or "..") where a question mark or an ellipsis runs straight into the
 * sentence's own full stop.
 */
export function anOldAskAnswerReadsProperly(says: string): string {
  return says
    .replace(/([?!])\.(?!\.)/g, '$1')
    .replace(/\.{2,}/g, '.')
}
