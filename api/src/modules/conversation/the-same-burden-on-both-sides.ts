/**
 * ASKING ONE PERSON TO PROVE THEMSELVES AND THE OTHER TO REFLECT.
 *
 * Driven on a real two-party conflict, same check-in, same session number, two engineers:
 *
 *   Eli  - "What did you do, or not do, that helped get the situation to this point?"
 *   Fay  - "What's in the screenshots you're taking?"
 *        - "Is there anything written down that PROVES the environment variable was missing?"
 *        - "How many PRs are currently waiting, and for how long?"
 *
 * One person was invited to examine himself. The other was put on the stand three times. Neither
 * turn is wrong on its own - Fay made falsifiable claims and asking for evidence is the product
 * doing its job - but the pattern across a session is that the person who makes checkable
 * statements gets audited and the person who makes vague ones gets sympathy. On the scenario whose
 * entire promise is impartiality, that is the promise broken, and neither party can see it
 * happening because neither reads the other's session.
 *
 * WHAT THIS IS NOT. It does not stop the session asking for evidence, and it never asks for less of
 * anybody. It notices when the two sides of a two-party check-in have been treated differently and
 * says so, once, for the turn - the same shape as the anti-loop guard and the document citation,
 * both of which are code because prose could not hold them.
 *
 * MEASURED ACROSS THE GROUND, NOT THE SESSION. A single session is too short to say anything: three
 * evidence asks in a row can simply be where the conversation went. It is the standing difference
 * between two people, over everything either of them has been asked, that means something.
 */

/** What a turn asked of somebody, as far as its wording can say. */
export type WhatItAskedFor = 'evidence' | 'reflection' | 'neither';

/**
 * Demands to produce something checkable. Deliberately the phrasings that put somebody on the
 * stand - "prove", "what proves", "is there anything written down", "how many", "what is the
 * number" - rather than every mention of a document. "Is there a brief you could share?" is an
 * offer; "is there anything written down that proves it" is a challenge, and the difference is
 * what this counts.
 */
const ASKS_THEM_TO_PROVE = [
  /\bprove[sd]?\b/i,
  /\banything (written down|in writing|documented)\b/i,
  /\bwhat (evidence|proof)\b/i,
  /\bcan you (show|point to|evidence)\b/i,
  /\bhow many\b/i,
  /\bwhat (is|was) the (number|figure|count)\b/i,
  /\bwhere is that (written|recorded|documented)\b/i,
  /\bis there (a )?(log|ticket|record|timestamp|screenshot)\b/i,
];

/**
 * Invitations to examine their own part. The move that is generous to the person receiving it, and
 * the one Eli got three times more often than Fay.
 */
const ASKS_THEM_TO_REFLECT = [
  /\bwhat (did|do) you do,? or not do\b/i,
  /\byour (own )?part in\b/i,
  /\bwhat part,? if any,? (did|do) you\b/i,
  /\bwhat could you have done\b/i,
  /\bhow did you contribute\b/i,
  /\bwhat would you do differently\b/i,
];

/** What to store on the row: the kind, or null where the turn asked for neither. */
export function stampWhatItAskedFor(turn: string): string | null {
  const kind = whatThisTurnAskedFor(turn);
  return kind === 'neither' ? null : kind;
}

export function whatThisTurnAskedFor(turn: string): WhatItAskedFor {
  const said = turn ?? '';
  /* Reflection first: "what did you do or not do that got us here" also contains "do", and a turn
     that does both is the generous reading of it. */
  if (ASKS_THEM_TO_REFLECT.some((re) => re.test(said))) return 'reflection';
  if (ASKS_THEM_TO_PROVE.some((re) => re.test(said))) return 'evidence';
  return 'neither';
}

export interface HowEachSideHasBeenAsked {
  /** The person about to be replied to. */
  thisPerson: { evidence: number; reflection: number };
  /** Everybody else on the check-in, added together. */
  theOthers: { evidence: number; reflection: number };
}

/**
 * COUNTED FROM STAMPS, NEVER FROM TEXT.
 *
 * The first version read every AI turn on the check-in and classified them here. An existing guard
 * refused it, and was right: an AI turn carries the person's own words reflected back at them, so
 * loading Fay's turns while answering Eli is loading Fay's account into Eli's session. That the
 * text never reached the prompt is not the point - the rule is that content-bearing turn loads stay
 * scoped to one check-in, precisely so a later change cannot quietly make it reach.
 *
 * Each turn is classified when it is written and the kind stored on the row. This takes the tallies
 * and never sees a word.
 */
export function countWhatWasAsked(
  stamps: { participantId: string; askedFor: string | null }[],
  meParticipantId: string,
): HowEachSideHasBeenAsked {
  const tally = { thisPerson: { evidence: 0, reflection: 0 }, theOthers: { evidence: 0, reflection: 0 } };
  for (const row of stamps) {
    if (row.askedFor !== 'evidence' && row.askedFor !== 'reflection') continue;
    const bucket = row.participantId === meParticipantId ? tally.thisPerson : tally.theOthers;
    bucket[row.askedFor] += 1;
  }
  return tally;
}

/**
 * The directive, when the two sides have plainly been treated differently.
 *
 * TWO CLEAR of a difference, and at least two asks on the heavier side.
 *
 * THE THRESHOLD WAS THREE AND THAT MADE THIS INERT ON THE CASE IT WAS BUILT FOR. Replayed against
 * the real conflict transcripts: Fay was asked for evidence twice and to reflect never; Eli was
 * asked to reflect once and for evidence never. A clean two-nil split, exactly the pattern - and
 * the guard said nothing, because I had picked three out of caution and never checked it against
 * the data. Found by running it over the transcripts rather than over a fixture I wrote myself.
 *
 * Two against nought is not noise. One against nought is.
 *
 * It corrects by ADDING, never by asking less: the fix for one person being under-examined is to
 * examine them, not to stop examining the other. Otherwise the balance is bought by making the
 * record worse.
 */
export function aDirectiveAboutTheBurden(seen: HowEachSideHasBeenAsked): string {
  const mine = seen.thisPerson;
  const theirs = seen.theOthers;

  const provedMore = mine.evidence - theirs.evidence;
  const reflectedLess = theirs.reflection - mine.reflection;

  if (mine.evidence >= 2 && provedMore >= 2) {
    return `THE BURDEN HAS NOT BEEN EVEN. Across this check-in you have asked THIS person to produce `
      + `evidence ${mine.evidence} times and the other side ${theirs.evidence}. Whatever the reason - `
      + 'usually that this person makes checkable statements and the other makes vague ones - the '
      + 'effect is that the specific one gets audited and the vague one gets sympathy. Neither of '
      + 'them can see it happening, because neither reads the other\'s session.\n\n'
      + 'This turn, do not ask this person for another document, number or proof. Ask them the '
      + 'question the other side has been getting: what part they played, or what they would do '
      + 'differently. Go back to evidence next turn.';
  }

  if (reflectedLess >= 2 && theirs.reflection >= 2) {
    return 'THE BURDEN HAS NOT BEEN EVEN. The other side of this check-in has been asked to examine '
      + `their own part ${theirs.reflection} times and this person ${mine.reflection}. Being asked `
      + 'what you contributed to a situation is generous - it treats somebody as an actor rather '
      + 'than a suspect - and it has been going mostly one way.\n\n'
      + 'At a natural point this turn, ask this person what part they played in getting here. Not '
      + 'as an accusation and not instead of anything else you were going to ask.';
  }

  return '';
}
