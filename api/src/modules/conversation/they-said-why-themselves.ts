/**
 * TWO REASONS A PERSON CAN ONLY GIVE THEMSELVES.
 *
 * The four explanations could not tell apart somebody who does not know how to do a thing from
 * somebody who knows exactly how and is avoiding it, and both landed in EXECUTION - the branch that
 * reads as "the agreed thing is not being done". They need opposite responses. One is taught. The
 * other is a conversation about what is uncomfortable, and teaching at it is insulting.
 *
 * NEITHER IS EVER INFERRED. There is no behavioural signal for "afraid" and anything claiming to be
 * one is a product guessing at somebody's inner life from their calendar. These fire ONLY on the
 * person's own words in their own account, and the words are quoted back so a lead reads what was
 * actually said rather than this file's summary of it.
 *
 * WHAT SOMEBODY ELSE SAID ABOUT THEM NEVER COUNTS. "He is not confident on pricing" is a colleague's
 * opinion, and turning that into a recorded explanation of somebody is how a product ends up
 * carrying a label its subject never agreed to and cannot see.
 */

export type SaidWhy = { kind: 'SKILL' | 'CONFIDENCE'; quote: string } | null;

/*
 * Deliberately narrow and deliberately first-person. Every phrase is somebody describing THEMSELVES.
 * Widening these is how "not sure" in a sentence about the weather becomes a recorded explanation of
 * a person, so the cost of a wrong match is high and the cost of a miss is only that this says
 * nothing, which is what it says almost always anyway.
 */
const NOT_SURE_HOW = [
  'i do not know how', "i don't know how", 'i am not sure how', "i'm not sure how",
  'never done this before', 'never done one before', 'i have not done this before',
  'i do not know where to start', "i don't know where to start",
  'nobody showed me', 'no one showed me', 'i was never trained', 'i have not been trained',
  'i need someone to show me', 'i could use some help with how',
];

const PUTTING_IT_OFF = [
  'i have been putting it off', "i've been putting it off", 'i keep putting it off',
  'i have been avoiding', "i've been avoiding", 'i keep avoiding',
  'i am dreading', "i'm dreading", 'i am nervous about', "i'm nervous about",
  'i am not comfortable', "i'm not comfortable", 'i do not feel confident', "i don't feel confident",
  'i am scared', "i'm scared", 'i am worried about calling', "i'm worried about calling",
  'i have not got round to it', 'i keep meaning to',
];

/** Their sentence, cut to something a lead can read, with their words kept exactly. */
function quotable(line: string): string {
  const t = line.trim().replace(/\s+/g, ' ');
  return t.length <= 160 ? t : `${t.slice(0, 157)}...`;
}

/**
 * ONLY THEIR OWN ACCOUNT GOES IN HERE. Passing anybody else's text is the one way to misuse this,
 * so the caller has to have decided whose words these are before it calls.
 */
export function whatTheySaidAboutWhy(theirOwnLines: string[]): SaidWhy {
  for (const line of theirOwnLines) {
    const low = line.toLowerCase();
    /*
     * SKILL IS CHECKED FIRST because a person often says both in one breath - "I have never done one
     * and I have been putting it off" - and the answer there is to teach them. Reading that as
     * avoidance would have somebody talked to about their nerve when what they wanted was showing.
     */
    if (NOT_SURE_HOW.some((p) => low.includes(p))) return { kind: 'SKILL', quote: quotable(line) };
  }
  for (const line of theirOwnLines) {
    const low = line.toLowerCase();
    if (PUTTING_IT_OFF.some((p) => low.includes(p))) return { kind: 'CONFIDENCE', quote: quotable(line) };
  }
  return null;
}

/**
 * THE QUOTE DOES NOT GO IN THE SHARED REPORT, and finding that out is the most useful thing that
 * happened while building this.
 *
 * The whole design of these two explanations was "quote them rather than describe them" - a lead
 * should read what somebody actually said, not this file's summary of it. That is right. It is also
 * how "I have been putting it off" ends up in a document the person's colleagues read, and the
 * marketing site promises in as many words that the product never shows anyone's raw answers. A
 * guard on that promise is what stopped it, which is the argument for having written the guard.
 *
 * So the explanation travels and the sentence does not. What reaches a shared surface is that they
 * said it themselves, which is the part that changes what a lead should do; the words stay in the
 * conversation they were said in. Off by default, because a surface that has not thought about who
 * reads it is a surface that should not be quoting anybody.
 */
export const SAYS_SKILL = (quote: string, mayQuote = false) =>
  `They have said themselves that they do not know how${mayQuote ? `: "${quote}"` : ''}. That is `
  + 'something to show them, not something to ask them to try harder at.';

export const SAYS_CONFIDENCE = (quote: string, mayQuote = false) =>
  `They have said themselves that they have been putting it off${mayQuote ? `: "${quote}"` : ''}. `
  + 'They know what to do, so the useful conversation is about what makes it hard rather than about '
  + 'the task.';
