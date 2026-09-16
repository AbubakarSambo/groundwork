/**
 * THE LAST THING BEFORE IT REACHES A PERSON: SOMEBODY READS IT.
 *
 * Her design, after reading this on her own screen:
 *
 *   She: "I want 40 shops in Kano stocking our tea by the end of Q4."
 *   It:  "To start, what is the number you are working towards for these 40 shops, and by when do
 *         you expect to hit that number?"
 *
 * Nothing in this codebase could have caught that. Every check we have asks what SHAPE a reply is -
 * did it restate them, is it too long, does it name somebody nobody named, does it end on a
 * question. That sentence passes all of them and is still incoherent, because the fault is in what
 * it MEANS: it asks for the number she had just given.
 *
 * WHY THIS IS NOT THE GUARD PATTERN AGAIN, AND THE DISTINCTION IS THE WHOLE DESIGN.
 *
 * Fifteen guards re-ask the model inside a turn. Measured on one live conversation, four fired and
 * all four logged "the second try was no better; the first stands". They lose for a reason: the
 * call being asked to fix the reply is the same call that wrote it, holding the same eighteen
 * thousand words of instruction that produced it, now with a complaint stapled on.
 *
 * This reader is given the transcript and the draft. Nothing else. No engine rules, no scenario
 * pack, no idea what the product was trying to achieve. It reads the way the person about to
 * receive it reads: cold, with only the conversation in front of it. And it may REWRITE, which no
 * guard here can do - a guard can only ask again and keep whichever it prefers.
 *
 * FIVE CHECKS, HERS, in the order they cost a person something.
 */

export interface TheTurnSoFar {
  /** The conversation, oldest first, both voices, as it actually reads on screen. */
  said: { role: 'person' | 'product'; text: string }[];
  /** What the product is about to send. */
  draft: string;
  /**
   * WHAT THEY SETTLED BEFORE THIS CONVERSATION STARTED, AND WITHOUT IT THE READER IS BLIND.
   *
   * Read live, with the reader running: it passed "Forty shops in Kano by the end of Q4. And for
   * this goal, who else needs to be involved in making that happen?" - to somebody who had named
   * Sahar and Amina in setup, one screen earlier. Check 2 is "does it ask for something they have
   * already given", and the reader could not see that they had given it: the check-in is a new
   * conversation and setup is not in it.
   *
   * So what setup settled goes in front of the transcript, marked as theirs. Anything in here is
   * answered, exactly like anything in the conversation.
   */
  alreadySettled?: string[];
}

/**
 * The reader's whole instruction. Short on purpose: a long one makes it the same reader as the one
 * that wrote the draft, which is the failure this exists to avoid.
 */
export const READ_IT_AS_THEY_WILL = `You are reading one message before it is sent to somebody, and you know nothing about the product that wrote it. You have the conversation and the message. Read it the way the person about to receive it will read it: cold, with only this in front of them.

Six questions, in this order:

0. DOES IT OPEN BY SAYING BACK WHAT THEY JUST SAID, OR BY PRAISING IT? Both fail, always, and this is the most common fault. Somebody who has just typed a sentence does not need it read out to them, and nobody wants their answer marked. Watched live: "A week of production telemetry showing crash-free above 99.5 percent with the new retry path live: that is a clear and specific definition of what good looks like." They wrote the first half; the second half is a grade. Cut both and open on the thing that is NEW - what it means, what it leaves open, or the next question itself. One short clause carrying forward a specific detail is not a restatement; a clause that adds nothing they do not already have is.
1. DOES IT FOLLOW? Does it pick up from what they just said, or does it start somewhere else?
2. DOES IT ASK FOR SOMETHING THEY HAVE ALREADY GIVEN? Anything they said earlier is answered. Asking again is the fastest way to make somebody give up.
3. WOULD A PERSON SAY IT OUT LOUD? Short sentences, subject first, no phrase built by joining two of their own phrases together. If you would not say it to a colleague, it fails.
4. IF IT ASKS FOR SOMETHING ABSTRACT, DOES IT SHOW WHAT AN ANSWER LOOKS LIKE? "What would count", "what would tell you", "what does it look like" are unanswerable cold. Two or three concrete options from THEIR world, in their words, never from another business.
5. DOES IT NEED A LINE SAYING WHY IT IS WORTH ANSWERING? One short clause, not a lecture.

WORDS THAT ARE ALWAYS WRONG, AND A REWRITE MUST NOT REINTRODUCE THEM:
- "your record". Say "the record" or "the check-in". It is not a file being kept on them.
- "what makes you want to do this right now" and every variant of "why do you want to". Ask about
  the timing instead: "what makes this the right time to set this up", with an example or two.
- "who else is making that happen" asked as if only a person counts. A team or another department
  is a real answer, so the question has to allow one.

If it passes all six, reply with exactly: KEEP

Otherwise reply with the message as it should be sent, and nothing else. No preamble, no explanation, no quotation marks around it.

RULES FOR A REWRITE, and breaking one is worse than the fault you are fixing:
- Ask for the same thing the draft was asking for. You are not choosing a different question.
- Use only names, numbers, dates and facts that appear in the conversation above. Never add one.
- One question. An example fragment inside it is part of the question, not a second one.
- Never apologise, never explain yourself, and never mention this review.`;

/** What the reader is shown: the conversation, then the draft, and nothing about us. */
export function whatTheReaderSees(turn: TheTurnSoFar): string {
  const conversation = (turn.said ?? [])
    .filter((t) => (t.text ?? '').trim())
    .map((t) => `${t.role === 'person' ? 'THEM' : 'US'}: ${t.text.trim()}`)
    .join('\n\n');
  const settled = (turn.alreadySettled ?? []).map((t) => (t ?? '').trim()).filter(Boolean);
  const before = settled.length
    ? `THEY ALREADY TOLD US THIS, BEFORE THE CONVERSATION BELOW. ALL OF IT COUNTS AS ANSWERED:\n\n${settled.map((t) => `- ${t}`).join('\n')}\n\n---\n\n`
    : '';
  return `${before}CONVERSATION SO FAR:\n\n${conversation}\n\n---\n\nABOUT TO SEND:\n\n${turn.draft.trim()}`;
}

/** KEEP, or the rewritten message. Anything else is treated as KEEP. */
export function whatTheReaderDecided(answer: string, draft: string): { text: string; changed: boolean } {
  const said = (answer ?? '').trim();
  if (!said || /^keep\b/i.test(said)) return { text: draft, changed: false };
  /*
   * A "rewrite" that is longer than three sentences, or that opens by talking about the message
   * rather than to the person, is the reader explaining itself instead of doing the job. The draft
   * stands: a clumsy question beats a paragraph about a question.
   */
  if (/^(the message|this message|the draft|it |i would|here is|suggested)/i.test(said)) return { text: draft, changed: false };
  const sentences = said.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length > 4) return { text: draft, changed: false };
  return { text: said, changed: said !== draft.trim() };
}

/**
 * HOW MANY TURNS THE READER SEES.
 *
 * Enough to know what has been said, short enough that it reads rather than skims. Six turns is
 * three exchanges, which is where "you already told it that" becomes visible.
 */
export const THE_LAST_FEW_TURNS = 6;

export function theTailOf(said: TheTurnSoFar['said']): TheTurnSoFar['said'] {
  return (said ?? []).slice(-THE_LAST_FEW_TURNS);
}
