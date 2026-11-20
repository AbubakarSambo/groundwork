import { SESSION_CLOSE_MARKER } from './prompt-library';

/**
 * A TYPED "THAT'S RIGHT, FINISH" IS A FINISH (end-to-end check of 16 November, M-5; fix plan 17 November, group E).
 *
 * After the closing message the person is shown a summary of what they said, with a button "That's right, finish". The summary is on the
 * screen and is not in the transcript, so a person who typed "That's right, finish." was answered "I am not sure what you mean ... Which
 * line or number are you talking about?" by a model that did not know a summary had been shown (Joel needed four turns). Nothing here
 * matches their words: the model is told what is on the screen and reads what they mean (fix rule 4).
 */
export const THE_SUMMARY_IS_ON_THE_SCREEN = [
  'WHAT THE PERSON IS LOOKING AT.',
  'You have just closed this check-in, and they are now reading a summary of what they said, with a button that says "That\u2019s right, finish". The summary is not in this conversation.',
  `If what they write means the summary is right, that nothing is wrong, or that they want to finish, reply in one short sentence that asks nothing, and write ${SESSION_CLOSE_MARKER} at the very end. "No" or "No, that is right" to "Is anything wrong?" means it is right.`,
  'If what they write changes or adds something, take it and say plainly what you changed, and do not write the marker: they will be shown the summary again. If it is about a line of the summary and you cannot tell which one, ask which line they mean; never say you cannot see it.',
].join('\n');

/**
 * READ LAST, ON EVERY TURN (run 4, 18 November). The rule was said once, far up a very long prompt, and on WhatsApp the model took
 * "That's right, finish." for a fact to follow up ("Understood. What will exist at the end ...?"), and "No, that is right." to
 * "Is anything wrong?" for a statement it could not place. It is said here once, in the part of the prompt read last, and nowhere else:
 * the same sentence the engine's rules and the lean conversation used to carry is gone from both.
 */
export const THE_PERSON_MAY_BE_DONE = [
  'IF WHAT THEY JUST WROTE MEANS THEY ARE DONE.',
  `Read their last message for what it means. If it means they are finished, that this is all, that there is nothing to add, or that what you have is right, in any words, including the words of the button "That\u2019s right, finish.", reply in one short sentence that asks nothing and write ${SESSION_CLOSE_MARKER} at the very end. Do not ask what they mean, and do not ask another question.`,
  'A "No" in answer to "Is anything wrong?", "Is anything in the way?" or "Anything else?" means the same: nothing is wrong and there is nothing to add. It is not a line of a summary to place, and not a fact to follow up.',
  'Where the same message also adds or changes a fact, take that first and do not close.',
].join('\n');

