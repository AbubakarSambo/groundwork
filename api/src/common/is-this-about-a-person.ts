/**
 * IS THIS SENTENCE ABOUT A PERSON, OR ABOUT THE WORK?
 *
 * One question, asked in eight places, answered eight slightly different ways -
 * and four of those answers were wrong in the same sitting:
 *
 *   /\bweak\b/            caught "a weak basis for a decision"        the evidence
 *   /\bthey\b/            caught "They are not doing any work here"   the documents
 *   /\bthey are\b/        caught "lives with how they are made"       the decisions
 *   /\bclient\b/          caught "not delivering on client setup"     Daisy's job
 *
 * Every one was a blacklist asked to tell what a word was ABOUT, which a blacklist
 * cannot do. Each was fixed where it was found, independently, which is how eight
 * versions of one rule came to exist.
 *
 * SO THIS IS THE ONE PLACE, AND THE GROUPS ARE THE POINT. The lists differ on
 * purpose - a contribution record must refuse "strong on delivery" while a
 * confidence read must be allowed to say "a weak basis" - and that difference was
 * previously invisible, encoded in whichever patterns somebody happened to write.
 * Now a caller names the groups it means, so the difference is a decision on the
 * page rather than an accident in a regex.
 *
 * WHAT MAKES A PATTERN GOOD ENOUGH TO GO HERE. It has to name the thing it bans
 * rather than the word it contains. "poor" is a word; "a poor contribution" is a
 * judgement of somebody's work. The first is unusable and the second is exactly
 * what these are for.
 */

/** A quality word applied to a person or to their record. */
const QUALITY_OF_A_PERSON = [
  /\b(?:vague|poor|weak|thin|low|strong|excellent)\s+(?:account|record|contribution|answers?|input|performance|delivery)\b/i,
  /\bwas (?:vague|poor|weak|thin)\b/i,
  /\b(?:strong|weak|poor|excellent|developing|emerging)\s+(?:on|at|in)\b/i,
  /**
   * "Is a strong communicator" is the sentence this is for. And the FIFTH instance
   * of this exact fault turned up here, inside the module built to stop it: as
   * `\bis (?:a )?weak\b` it caught "it is a weak basis for a decision", which is
   * the very line the file's own regression list is built from.
   *
   * A quality word followed by a thing is about the thing. So the nouns that make
   * it about evidence rather than about somebody are named and excluded, and any
   * future one goes on the same list.
   */
  /\bis (?:a |an )?(?:good|strong|weak|poor|excellent)\b(?!\s+(?:basis|reason|case|argument|signal|evidence|indicator|proxy|foundation|ground)s?\b)/i,
  /\b(?:good|bad) at\b/i,
];

/** Character, disposition, and the vocabulary of what somebody IS. */
const CHARACTER = [
  /\b(?:shows?|demonstrates?|displays?|exhibits?)\b/i,
  /\b(?:attitude|mindset|willingness|eagerness|enthusiasm|initiative|proactive|proactivity)\b/i,
  /\b(?:hard[- ]working|reliable|dependable|committed|motivated|coachable|team player)\b/i,
  /\bfits? in\b/i,
  /\bthey are (?:just |simply |too |not )*(?:avoidant|lazy|weak|slow|difficult|disorganised|unreliable|passive|junior)\b/i,
  /\bpersonality\b/i,
];

/** What somebody can or cannot do, stated as a property of them. */
const CAPABILITY = [
  /\b(?:capable|competent|incompetent|able) (?:of|to)\b/i,
  /\bnot capable\b/i,
  /\bunable to\b/i,
  /\blacks (?:the )?(?:ability|confidence|drive|skill)\b/i,
  /\bneeds? to (?:improve|develop|work on)\b/i,
  /\b(?:strengths?|weakness(?:es)?|areas? for (?:growth|development)|potential)\b/i,
];

/** A mark, a rank, or a number standing in for a person. */
const GRADE = [
  /\b(?:level|band|tier|rating|grade)\b/i,
  /\bscore\b/i,
  /\b\d+%/,
  /\blow specificity\b/i,
];

/** A motive imputed to somebody, which is the one no signal can support. */
const MOTIVE = [
  /\bgam(?:e|ing|ed)\b/i,
  /\bcheat/i,
  /\bfak(?:e|ing|ed)/i,
  /\bdishonest/i,
  /\bmisleading/i,
  /\bsuspicious/i,
  /\bappears? to be\b/i,
  /\bdeliberate\b/i,
  /\binflat/i,
];

/**
 * HOW SOMEBODY IS GETTING ON, which is a verdict even when no adjective appears.
 *
 * Added after "slow to take ownership" sailed through every group above - the
 * sentence that started the whole lead-note correction, and the vocabulary was
 * looking for quality words when the judgement was carried by a verb.
 *
 * This is deliberately about a PERSON'S progress, not about work being late. "The
 * migration is behind" is a fact about a migration. "He is behind on the migration"
 * is a read on him.
 */
const PROGRESS_ON_A_PERSON = [
  /\b(?:slow|quick) to\b/i,
  /\b(?:he|she|they|the \w+) (?:has|have|had) not (?:yet )?(?:taken|shown|demonstrated|managed|got|started)\b/i,
  /\bstruggl(?:es|ing|ed)\b/i,
  /\b(?:is|are|has been|have been) behind\b/i,
  /\bfail(?:s|ing|ed) to\b/i,
  /\bnot (?:proactive|responsive|forthcoming|engaged)\b/i,
  /\bnot (?:yet )?(?:stepping|stepped) up\b/i,
  /\bno(?:t much)? (?:sign of|evidence of) (?:him|her|them)\b/i,
];

/** Telling somebody what to do about a decision that is theirs to make. */
const RECOMMENDATION = [
  /\byou should\b/i,
  /\bwe recommend\b/i,
  /\bprioriti[sz]e\b/i,
  /\bfocus on\b/i,
  /\bthe right (?:call|answer|choice)\b/i,
  /\bought to\b/i,
  /\bbetter to\b/i,
];

export const GROUPS = {
  'quality of a person': QUALITY_OF_A_PERSON,
  character: CHARACTER,
  capability: CAPABILITY,
  grade: GRADE,
  'progress on a person': PROGRESS_ON_A_PERSON,
  motive: MOTIVE,
  recommendation: RECOMMENDATION,
} as const;

export type Group = keyof typeof GROUPS;

/**
 * The first offending phrase, or null.
 *
 * Returns the PHRASE rather than a boolean because every caller needs it: a
 * message that quotes the words back is the difference between somebody rewriting
 * a sentence and somebody deleting the thought.
 */
export function aboutAPerson(text: string, groups: readonly Group[]): string | null {
  if (!text) return null;
  for (const g of groups) {
    for (const p of GROUPS[g]) {
      const hit = text.match(p);
      if (hit) return hit[0];
    }
  }
  return null;
}

/**
 * The four sentences that must always pass, whatever anybody adds above.
 *
 * Exported as data so the shared spec and any caller's own spec can both assert
 * against them. These are the real lines that real patterns really caught, and
 * they are the regression this module exists to prevent - keeping them next to the
 * patterns means somebody tightening a group sees what tightening it broke last
 * time.
 */
export const CAUGHT_WRONGLY_BEFORE = [
  'so it is a weak basis for a decision about anybody',
  'The documents are not doing any work in this picture',
  'Gives real decisions away and lives with how they are made',
  'Mentioned as a direct report who is not delivering on client setup',
];
