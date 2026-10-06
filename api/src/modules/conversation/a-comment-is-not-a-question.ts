/**
 * A COMMENT ON AN ANSWER IS NOT A QUESTION, AND NOTHING HERE CATCHES IT.
 *
 * Read in the 1 October review, in seven scenarios, in the words below. Every one is a sentence about the
 * answer rather than a step towards the next question, and the standard says so (points 5, 7 and 9: no
 * comment on a short answer, no praise, no put-down):
 *
 *   "That is noted, and it is the kind of thing that changes how you go about the conversation."  (seven scenarios)
 *   "That is a very specific thing to not know, given these are our five largest clients."
 *   "That is a real answer, as it stands."      "That kind of clarity helps the record."
 *   "That's the heart of it."                   "That is a lot."          "That sounds like a heavy weight."
 *   "That sounds like a recurring pattern."     "That is your read of it, rather than something that has been confirmed elsewhere yet."
 *   "That Sarah's replacement never took a call is a specific detail."
 *
 * WHY THE NETS DID NOT CATCH THEM. There were none. The rule is a paragraph in the prompt (see
 * nothing-here-is-pleased-with-you) and a prompt is a request. The first one came from the prompt itself:
 * its own "NEVER" block gave the model that stock sentence as the model answer for marking something. The
 * gate that screens the reply checks names and figures, and a comment has neither.
 *
 * THE RULE, IN CODE. A sentence that is only a comment on what they just said is taken out, and the turn
 * says the rest. It never leaves a turn empty: where the comment is all there is, it stands, because the
 * product's own filler is no better. The patterns are the shapes read, not a general judgement of tone, so
 * a sentence that carries a fact ("That is a lot of work to finish by Friday?") or a question is never touched.
 */

import { intoSentences } from './nothing-invented-reaches-them';

const AN_EVALUATION =
  '(?:specific|real|honest|clear|useful|important|helpful|interesting|good|great|fair|valid|serious|frustrating|heavy|big|long|slow|detailed|concrete|telling|revealing|notable|significant|common|known|real answer)';

const A_COMMENT: RegExp[] = [
  /* "That is noted, and it is the kind of thing that changes how you go about the conversation." */
  /^\s*(?:and\s+)?(?:that|this)(?:'s| is| has been)\s+noted\b[^?]*$/i,
  /\bthe kind of thing that changes how you\b[^?]*$/i,
  /^\s*noted,\s+and\b[^?]*$/i,
  /* "That is a very specific thing to not know..." "That is a real answer, as it stands." "That is a lot." "That is a long time." */
  new RegExp(`^\\s*(?:and\\s+)?(?:that|this|it)(?:'s| is| was)\\s+(?:a |an |such a |quite a |really a )?(?:very |really |quite |truly |genuinely |fairly |pretty |rather )?${AN_EVALUATION}\\b[^?]*$`, 'i'),
  /* "That is a lot." "That is a long time." - only when that is the whole sentence. */
  /^\s*(?:and\s+)?(?:that|this|it)(?:'s| is| was)\s+(?:a (?:lot|long time|big deal)|too much|a lot to carry)\s*[.!]*\s*$/i,
  /* "That kind of clarity helps the record." */
  /^\s*that kind of \w+(?: \w+)? (?:helps|matters|is useful|is what)\b[^?]*$/i,
  /* "That's the heart of it." "That is the thing that makes this a blocker." */
  /^\s*that(?:'s| is) the (?:heart|core|crux) of (?:it|the matter)\b[^?]*$/i,
  /^\s*that is the thing that makes\b[^?]*$/i,
  /* "That sounds like a heavy weight." "That sounds like a recurring pattern." "That sounds frustrating." */
  /^\s*(?:that|this) sounds\b[^?]*$/i,
  /* "That is your read of it, rather than something that has been confirmed elsewhere yet." "That is what you are saying." */
  /^\s*(?:that|this) is (?:just )?(?:your|only your) (?:read|view|take|version|opinion|perspective|account)\b[^?]*$/i,
  /^\s*(?:that|this) is what you are saying\b[^?]*$/i,
  /^\s*(?:that|this) is how (?:it|the [a-z ]{3,30}) is described\b[^?]*$/i,
  /* "That Sarah's replacement never took a call is a specific detail." */
  /^\s*(?:that|this) [^.?!]{3,90} (?:is|was) (?:a |an )?(?:very |really )?(?:specific|important|real|significant|telling|useful)(?: \w+)? (?:detail|thing|point|part|fact)\b[^?]*$/i,
];

export function isOnlyAComment(sentence: string): boolean {
  const s = sentence.trim();
  if (!s || /\?/.test(s)) return false;
  return A_COMMENT.some((rx) => rx.test(s));
}

export type CommentCut = { text: string; cut: string[] };

export function withoutCommentsOnTheAnswer(reply: string): CommentCut {
  const sentences = intoSentences(reply);
  const cut: string[] = [];
  const kept: string[] = [];
  for (const s of sentences) {
    if (isOnlyAComment(s)) cut.push(s.trim());
    else kept.push(s);
  }
  const text = kept.join('').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  /* Never leave a turn empty: where the comment is all there is, it stands. */
  return text ? { text, cut } : { text: reply, cut: [] };
}
