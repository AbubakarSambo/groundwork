/**
 * THE FIRST THING IT SAYS IS ITS OWN JOB.
 *
 * The opener is written from the whole engine prompt - 113,769 characters - plus one line saying
 * "the person has just arrived". Measured on 18 September 2026, across all 22 situations from both
 * sides, that produced the same fault nearly every time:
 *
 *   "This check-in is for getting a clear picture of your workplan and budget for the next 90 days."
 *   "This record is for what you build and deliver."
 *   "This check-in is about getting things back on track."
 *
 * Fifteen of twenty-two lead openers and TWENTY of twenty-two participant openers explained what the
 * check-in was for before asking anything. The engine prompt bans exactly this - "do not say what
 * this record is for, its function is understood" - and the ban is somewhere in the middle of a
 * hundred thousand characters written for a conversation in progress rather than for its first line.
 *
 * IT IS WORSE ON THE SIDE THAT MATTERS MOST. A participant was invited into a colleague's check-in
 * and has never seen this product. The first thing they get is a paragraph about the product.
 *
 * SO THE OPENER GETS ITS OWN INSTRUCTION, SHORT, AT THE END. Not another rule in the middle of the
 * engine: the engine still supplies everything it knows about this person and this situation, and
 * this arrives last, about the one message being written. The same move as the three things that go
 * last on every turn, which is the only change this week that measured clean.
 */
export const THE_OPENER_IS_ONE_MESSAGE = `YOU ARE WRITING THE FIRST THING THIS PERSON SEES. Everything above tells you what you know. This tells you what to do with it, and it is the last word.

NEVER SAY WHAT THE CHECK-IN IS FOR. Not "this check-in is for", not "this record is about", not "this is where you", not "it helps build a picture of". They can see where they are. Explaining the product is the single most common thing this opener has done wrong, and it is what a form does before a person does.

OPEN ON SOMETHING ONLY THIS SITUATION HAS. A name, a number, a date, a thing that was agreed, the reason somebody set this up - from what you were told above. If you genuinely have nothing specific, open on the question itself rather than on a description of the exercise.

THEN ONE QUESTION. One thing to answer. If what you are asking for is abstract, put two concrete options in it, from their world.

THREE SENTENCES AT MOST, AND TWO IS BETTER.

DO NOT TELL THEM WHAT THEIR ANSWER MEANS BEFORE THEY GIVE IT. "Fine is often code for something not being fine" and "fine is where the real picture hides" both went out live. You have not heard from them yet.`;

/**
 * AND THE ONE THAT LOOKED LIKE A FAULT AND IS NOT.
 *
 * Seven of twenty-two participant openers were "are you the person this check-in is about, or
 * somebody working alongside them?" I scored that down. It is deliberate: WHO_ARE_YOU_IN_THIS is
 * the product's own first question to a non-lead in the seven STARTING situations, and on a new
 * hire's ground with two people the roster genuinely does not say which of them is the new hire.
 * Asking is right. My fixture set nobody's role, so it asked every time, correctly.
 *
 * WHAT IS WORTH FIXING IS THE CASE WHERE THE ROSTER DOES SAY. When somebody was added with a role
 * described - "the new hire", "her manager" - the answer is already on their row, and spending the
 * first message on a question already answered is the same fault as every other re-ask.
 *
 * ONLY THEIR OWN WORDS COUNT, 27 September 2026 (request 36). For somebody the lead invited, the role
 * on the row is the lead's sentence about them, which the model is no longer handed. So the caller
 * passes `aRoleInTheirOwnWords` here, and an invited person is asked, as somebody with no role is.
 */
export function theRosterAlreadySaysWhoTheyAre(roleAsDescribed?: string | null): boolean {
  return !!roleAsDescribed && roleAsDescribed.trim().length > 2;
}
