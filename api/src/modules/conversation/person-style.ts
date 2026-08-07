/**
 * What the product remembers about HOW to talk to someone, across grounds.
 *
 * Style, never substance. The functions here read a person's own turns and
 * decide three things: did they need the vocabulary explained, do they answer in
 * a line, have they asked who reads this. Nothing about what they said, what the
 * ground was for, or how it went.
 *
 * That boundary is not a nicety. A ground is a closed container - somebody's
 * account to two colleagues must not surface in front of seven, and a
 * performance plan in March must not follow them into a cohort in June. The
 * moment this remembers content, the product stops being able to make that
 * promise. Everything it does remember could be shown to the person it describes
 * without embarrassment, which is the test each field has to pass.
 */

/** Asking what one of our own words means. */
const ASKED_WHAT_A_TERM_MEANS =
  /\b(what (is|do you mean by) (a |an |the )?(ground|check-?in|alignment|encroachment|divergence|remit)|when you say ".{0,24}"|not sure what (you mean|that means)|do you mean this conversation)/i;

/** Asking who will read this before answering. */
const ASKED_WHO_READS_IT =
  /\b(who (reads|sees|will see|can see) (this|it)|is this (private|confidential|shared)|what is (this|it) (being )?used for|does (my|the) (manager|boss|lead) see)/i;

/** Short enough that one question at a time is the right way to ask. */
const BRIEF_ANSWER_CHARS = 60;

/**
 * Turns that are short for everyone, and so say nothing about a person's style.
 *
 * A live run flagged the most articulate person in the org as brief. Her four
 * turns were 116, 52, 12 and 19 characters - and the two short ones were "Not
 * blocked." and "That is it from me." Every check-in ends with a sign-off, and
 * most contain a one-word answer to the blocker question, so counting them makes
 * nearly everybody look terse and the signal stops meaning anything.
 *
 * Judged on what someone says when they are actually answering.
 */
const STRUCTURALLY_SHORT =
  /^(that'?s (it|me|all)|that is (it|me|all)( from me)?|no|nope|none|not blocked|nothing( else| to add)?|n\/a|no blockers?|all good|done|yes|yep|ok(ay)?)[.! ]*$/i;

export interface StyleObservation {
  needsPlainLanguage: boolean;
  answersBriefly: boolean;
  asksWhoReadsThis: boolean;
}

/** Read one session's worth of a person's own turns. */
export function observeStyle(personTurns: string[]): StyleObservation {
  const said = personTurns.join(' \n ');
  const substantive = personTurns
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !STRUCTURALLY_SHORT.test(t));
  const shortOnes = substantive.filter((t) => t.length <= BRIEF_ANSWER_CHARS).length;
  const allTurns = personTurns.map((t) => t.trim()).filter(Boolean);
  // Someone whose every turn was a sign-off or a one-word "no" has not given a
  // single real answer. There is nothing left to measure, and that is itself the
  // clearest possible case of answering briefly.
  const nothingButBoilerplate = substantive.length === 0 && allTurns.length >= 3;
  return {
    needsPlainLanguage: ASKED_WHAT_A_TERM_MEANS.test(said),
    // Most of what they said was short. One long answer among five brief ones
    // does not make someone verbose.
    // Needs at least two turns overall to say anything - one answer is not a
    // habit. Beyond that it is the proportion of REAL answers that were short,
    // so one terse reply among several full ones does not count.
    answersBriefly:
      allTurns.length >= 2 &&
      (nothingButBoilerplate || (substantive.length >= 1 && shortOnes / substantive.length > 0.6)),
    asksWhoReadsThis: ASKED_WHO_READS_IT.test(said),
  };
}

/**
 * Observations only ever turn a flag ON.
 *
 * Someone who needed "ground" explained in March has not stopped needing it
 * because they did not ask again in June - they may simply have given up asking.
 * Turning the flag off on one quiet session would take the help away from
 * exactly the person it was added for. The cost of it staying on is that a
 * confident user gets one plain sentence they did not need.
 */
export function mergeStyle(existing: StyleObservation | null, seen: StyleObservation): StyleObservation {
  return {
    needsPlainLanguage: !!existing?.needsPlainLanguage || seen.needsPlainLanguage,
    answersBriefly: !!existing?.answersBriefly || seen.answersBriefly,
    asksWhoReadsThis: !!existing?.asksWhoReadsThis || seen.asksWhoReadsThis,
  };
}

/**
 * The block handed to the engine. Guidance on manner, never a description of the
 * person - "prefers plain language" is help; "this user is basic" is a label,
 * and a label in a prompt becomes a tone the person can feel.
 */
export function styleGuidance(s: StyleObservation | null, groundsSeen: number): string {
  if (!s) return '';
  const lines: string[] = [];
  if (groundsSeen > 0) {
    lines.push(
      `This person has used Groundwork before in this organisation (${groundsSeen} ground${groundsSeen === 1 ? '' : 's'}). Do not re-explain what a check-in is from scratch. You know nothing about what they discussed - those records are separate - so never imply you do, and never refer to another ground.`,
    );
  }
  if (s.needsPlainLanguage) {
    lines.push(
      'They have asked before what our terms mean. Use plain words: "this conversation" rather than "this ground", "what you are answerable for" rather than "your remit". If you must use a product word, define it in the same sentence, once, without making a point of it.',
    );
  }
  if (s.answersBriefly) {
    lines.push(
      'They answer in a line or two. Ask one thing at a time and accept a short answer as an answer - pressing a brief person for length gets padding, not substance. Ask for one concrete detail instead.',
    );
  }
  if (s.asksWhoReadsThis) {
    lines.push(
      'They have asked before who reads this. Say plainly in your opening who sees this record and who does not, before they have to ask again.',
    );
  }
  if (!lines.length) return '';
  return `HOW TO TALK TO THIS PERSON (from how they have answered before, not from anything they said):\n${lines.map((l) => `- ${l}`).join('\n')}\n\n`;
}
