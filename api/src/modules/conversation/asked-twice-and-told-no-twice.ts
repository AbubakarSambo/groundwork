/**
 * WHEN SOMEBODY SAYS THE QUESTIONS ARE WRONG, ASKING THE SAME ONE AGAIN IS THE WORST ANSWER.
 *
 * Read off a live check-in. A lead came to set objectives for her team. She was asked which
 * conversation was closest to a decision, which is a sales pipeline question and she had no
 * pipeline, and she said so:
 *
 *   "we dont have one. It just want to set ovjectives for my team and i feel you are asking the
 *    wrong questions which is annoying"
 *
 * It acknowledged that, explained why it needed what it needed, and carried on. Four turns later:
 *
 *   "this line of questioning does not align with what i need to do, please just set targets for my
 *    team and track it"
 *
 * And it asked her to name the wider company objective. Again. The prompt told it to: "do not
 * proceed until the gap is addressed". That instruction is right about a gap worth having and wrong
 * about a person who has now twice said no.
 *
 * WHY THIS IS CODE AND NOT MORE PROMPT. The wording has been changed too, and that is worth doing.
 * But this exact failure IS an instruction being followed - a prompt that says "drop it" sits in the
 * same file as a prompt that says "do not proceed", and the model picks one. What can be checked
 * without knowing anything about the subject is the shape: did they push back on the questioning,
 * and is the reply asking them the same thing again. Nothing here writes a word. The model is asked
 * again with the refusal named, exactly as the dead-end and invention guards do.
 */

/**
 * DID THEY PUSH BACK ON THE QUESTIONING ITSELF, rather than on the subject?
 *
 * Deliberately narrow. "That is wrong" about a fact is not this. This is about somebody objecting to
 * what they are being asked, which nearly always names the asking: the questions, what you are
 * asking, this line of questioning.
 */
const AT_THE_QUESTIONS =
  /\b(?:question|questions|questioning|asking|line of enquiry|line of inquiry)\b/i;

const A_REFUSAL =
  /\b(?:wrong|not (?:what|aligned|relevant|helpful|useful)|does ?n[o']?t align|annoying|irrelevant|pointless|stop asking|just (?:set|do|help|give)|please just)\b/i;

export function theyPushedBackOnTheQuestions(text: string): boolean {
  const said = text ?? '';
  return AT_THE_QUESTIONS.test(said) && A_REFUSAL.test(said);
}

/** Words that carry no subject, so two questions are not "the same" for sharing them. */
const CARRIES_NO_SUBJECT = new Set([
  'what', 'who', 'when', 'where', 'which', 'why', 'how', 'the', 'a', 'an', 'is', 'are', 'was', 'were',
  'do', 'does', 'did', 'you', 'your', 'yours', 'we', 'our', 'i', 'me', 'my', 'it', 'its', 'this',
  'that', 'these', 'those', 'to', 'of', 'in', 'on', 'for', 'and', 'or', 'but', 'with', 'as', 'at',
  'by', 'from', 'would', 'could', 'can', 'will', 'be', 'been', 'have', 'has', 'had', 'there', 'here',
  'so', 'if', 'then', 'now', 'else', 'able', 'name', 'tell', 'say', 'about',
]);

/**
 * NUMBERS ARE SUBJECT WORDS, and leaving them out is what let the worst example through.
 *
 * "500 contracts, daaa. and the sales linked to them" came back as "500 contracts and the sales
 * linked to them by the end of the year." Reading only letters, the figure at the front of both -
 * the most obviously repeated thing in the pair - counted for nothing.
 */
function subjectWords(text: string): Set<string> {
  return new Set(
    (text ?? '').toLowerCase().match(/[a-z']{3,}|\d+/g)?.filter((w) => !CARRIES_NO_SUBJECT.has(w)) ?? [],
  );
}

/**
 * IS THIS THE SAME QUESTION AGAIN, in the only sense that matters to somebody reading it?
 *
 * Not string equality: it is always reworded, which is part of why it grates. Two questions that
 * share most of what they are ABOUT are the same question wearing a different coat. Measured on the
 * real pair - "how does this objective connect to the company's overall direction" and "can you name
 * the wider company objective that this sales target directly supports" - which share company,
 * objective and direction/supports, and on unrelated pairs, which share nothing.
 *
 * The threshold is deliberately high. A false positive costs one extra model call and a differently
 * worded question, which is harmless. Missing it costs a person's patience, which is not.
 */
export function asksTheSameThingAgain(earlier: string, now: string): boolean {
  const a = subjectWords(earlier);
  const b = subjectWords(now);
  if (a.size < 2 || b.size < 2) return false;
  let shared = 0;
  for (const w of b) if (a.has(w)) shared += 1;
  return shared / Math.min(a.size, b.size) >= 0.5;
}

/**
 * The instruction added to the next attempt. It names what happened and leaves every word to the
 * model, the same as the other retries in this file's neighbourhood.
 */
export const THEY_ALREADY_SAID_NO = `The person has told you the questions are not what they need, and you have just asked them the same thing again in different words. They heard it the first time.

Drop it. Do not ask it a third time, do not rephrase it, and do not explain why you wanted it. Say in one short sentence that you will leave it, and then ask for the thing they actually came for, in their own words, or help them with it directly.

If what they asked for is to set targets and track them, ask about the targets.`;

/**
 * A REPLY THAT OPENS BY SAYING THEIR OWN ANSWER BACK TO THEM.
 *
 * Every turn of a real check-in opened this way. She said "500 contracts, daaa. and the sales linked
 * to them", and got back "500 contracts and the sales linked to them by the end of the year. Got it.
 * To make sure this objective is aligned..." She said "150 each and i have a target of 50", and got
 * "This makes up the 500 total." Her words for the whole conversation were "repeat and going around
 * in circles".
 *
 * It is not a wrong answer, which is why no guard caught it. It is the same words twice, and half of
 * every reply being your own last message is what makes a conversation feel like it is not moving.
 *
 * ONLY THE OPENING IS CHECKED. Quoting somebody later in a turn is often the right thing - the
 * product does it deliberately when a document contradicts them. What grates is leading with it.
 */
export function opensByRepeatingThem(theySaid: string, reply: string): boolean {
  const theirs = subjectWords(theySaid);
  if (theirs.size < 3) return false;
  /*
   * THE OPENING, WHICH IS THE FIRST SENTENCE OR THE FIRST TWO.
   *
   * One sentence was not enough. Once a give-back was added, the reply opened with a real fact and
   * restated her in the sentence AFTER it, which is the same fault one place further along:
   *
   *   "Sixty of your hundred and fifty. That means the supply side is the bottleneck, and you're
   *    worried about Rita. What's holding up the supply side specifically?"
   *
   * Sentence one earns its place. Sentence two is her own message handed back. Found by running a
   * turn, and it passed the one-sentence version of this check.
   *
   * Two, not all of them: quoting somebody later in a turn is often right, and the product does it
   * deliberately where a document contradicts them. What grates is leading with it.
   */
  const sentences = (reply ?? '')
    .split(/(?<=[.?!])\s/)
    .filter((x) => x.trim() && !/\?\s*$/.test(x.trim()))
    .slice(0, 2);

  /*
   * EACH OF THE FIRST TWO, SEPARATELY. Joining them and measuring the pair was the first attempt and
   * it made the check weaker rather than wider: sentence two carries new words, they dilute sentence
   * one's restatement, and the pair scores under the line while sentence one on its own is plainly
   * her message handed back. One restating sentence at the top is the fault, whichever of the two.
   */
  return sentences.some((sentence) => {
    const opener = subjectWords(sentence);
    if (opener.size < 3) return false;
    let shared = 0;
    for (const w of opener) if (theirs.has(w)) shared += 1;
    return shared / opener.size >= 0.6;
  });
}

/** Named for the model, which then writes its own opening. */
export const DO_NOT_SAY_IT_BACK = `Your reply opens by repeating what they just told you before asking the next thing. They know what they said. Reading their own answer handed back is what makes a check-in feel like it is going in circles.

Write it again without the restatement. Go straight to the next question. A two or three word acknowledgement is fine if something genuinely landed; a summary of their last message is not.`;
