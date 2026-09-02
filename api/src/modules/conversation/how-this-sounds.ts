/**
 * WHAT THE CHAT SOUNDS LIKE, AS NUMBERS.
 *
 * "It sounds like an examiner" is a real complaint and an unfalsifiable one, so this counts the
 * habits that produce the feeling. Measured across the 79 AI turns on the local database before any
 * of this changed:
 *
 *   opens by judging the answer   ~7 in 10     "That's a specific example, which is helpful."
 *   ends with a question          10 in 10     nothing ever lands and stops
 *   says "the record" to a person  26 turns    "Let's get your version on the record."
 *   carries an opinion              0 turns    no view offered anywhere
 *
 * The first three are habits to remove. The fourth is a habit to grow, and it is the reason this
 * counts opinions at all: strip the grading out and you can end up with something merely neutral,
 * which is not the goal. Neutral is what a form sounds like.
 *
 * WHY THESE ARE COUNTED AND NOT JUST BANNED. Two of them cannot be enforced - you cannot make a
 * model have a view, and a detector that demanded one would produce fake ones. So the bans handle
 * what is mechanical and these counts show whether the character took, which is the part no rule
 * can do.
 */
export type VoiceReading = {
  turns: number;
  judgesTheAnswer: number;
  endsOnAQuestion: number;
  saysTheRecord: number;
  offersAView: number;
};

/**
 * "That's a specific example", "That is a really important distinction", "Eighteen percent is a
 * clear and specific impact. Thank you for starting with that."
 *
 * Grading is an OPENING habit, so this reads the first sentence or two rather than the whole turn -
 * a later "that is helpful" about somebody's suggestion is a different act from marking their
 * answer. And it turns on the adjective, not on "that": "that is the whole problem" is a view and
 * must survive, "that is a clear example" is a mark and must not.
 */
const GRADING_ADJECTIVE =
  '(?:specific|clear|crisp|helpful|useful|important|good|great|strong|excellent|valuable|significant|striking|thorough|detailed)';
export const JUDGES_THE_ANSWER = new RegExp(
  `(?:\\bis\\s+(?:a\\s+|an\\s+)?(?:really\\s+|very\\s+|quite\\s+)?(?:\\w+\\s+and\\s+)?${GRADING_ADJECTIVE}\\b` +
    `|^\\s*(?:and\\s+)?that(?:'s| is)\\s+(?:a\\s+|an\\s+)?(?:really\\s+|very\\s+|quite\\s+)?${GRADING_ADJECTIVE}\\b` +
    `|\\bthank you for\\b|\\bwell put\\b|\\bnicely put\\b)`,
  'i',
);

/** Grading is an opener, so only the first couple of sentences are read for it. */
function theOpening(turn: string): string {
  return turn.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
}

/** The courtroom noun, spoken to the person whose work it is. */
export const SAYS_THE_RECORD = /\b(?:the|your)\s+record\b|\bon record\b/i;

/**
 * A VIEW, NOT A QUESTION AND NOT A SUMMARY. Deliberately narrow: these are the shapes the sketch
 * asks for - naming what something IS, or what it stops being, or what it would look like to
 * somebody else. It will undercount, which is the safer direction for a number nobody should be
 * able to game by writing "I think" more often.
 *
 * It undercounted on the very first live turn it was pointed at: the model wrote "the kind of
 * FAILURE that shows up in a report as a sales problem" and this only knew "the kind of thing
 * that". A ruler that misses what it was built to see is worse than none, because it reports
 * that the change did not work.
 */
export const OFFERS_A_VIEW =
  /\b(?:(?:is|'s) the (?:whole|real|actual)\b|stops being\b|is its own\b|the (?:kind|sort) of \w+ that\b|(?:is|'s) not (?:a|the)\b|which is not\b|worth more than\b|i(?:'d| would) still\b|says more about\b)/i;

export function howThisSounds(turns: string[]): VoiceReading {
  const said = turns.map((t) => (t ?? '').trim()).filter(Boolean);
  return {
    turns: said.length,
    judgesTheAnswer: said.filter((t) => JUDGES_THE_ANSWER.test(theOpening(t))).length,
    endsOnAQuestion: said.filter((t) => /\?\s*$/.test(t)).length,
    saysTheRecord: said.filter((t) => SAYS_THE_RECORD.test(t)).length,
    offersAView: said.filter((t) => OFFERS_A_VIEW.test(t)).length,
  };
}
