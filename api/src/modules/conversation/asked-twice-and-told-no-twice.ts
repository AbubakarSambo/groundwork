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

/**
 * AND THE WAYS SOMEBODY PUSHES BACK WITHOUT USING THE WORD "QUESTION".
 *
 * The rule above needed both halves - a word about the questioning AND a word of refusal - and
 * that is the polite form of pushback. Read live on 17 September 2026, none of the real ones
 * matched: "this questions is stupid" (misspelled, so no "question" word), "this is a waste of
 * time", "it is not about the targets". Three genuine objections, three misses, and the line that
 * exists for exactly this moment never arrived.
 *
 * These are the blunt forms, and each is a whole objection on its own rather than half of one.
 */
const BLUNTLY =
  /\b(?:waste of (?:my )?time|wasting my time|this is stupid|that is stupid|stupid question|pointless|you (?:already )?asked (?:me )?(?:that|this)|already (?:told|said|answered)|i (?:just )?(?:told|said to) you|that'?s what i (?:just )?said|going (?:round|around) in circles|going over (?:this|that|it) again|why are we (?:going over|back on|discussing) (?:this|that)|we(?:'ve| have) (?:covered|done|been through) (?:this|that)|not (?:what|why) (?:i|we)|missing the point|beside the point)\b/i;

export function theyPushedBackOnTheQuestions(text: string): boolean {
  const said = text ?? '';
  if (BLUNTLY.test(said)) return true;
  /* A misspelling is still an objection: "this questions is stupid" has no clean word boundary. */
  if (/\bquestion/i.test(said) && /\bstupid\b/i.test(said)) return true;
  return AT_THE_QUESTIONS.test(said) && A_REFUSAL.test(said);
}

/** Words that carry no subject, so two questions are not "the same" for sharing them. */
const CARRIES_NO_SUBJECT = new Set([
  'what', 'who', 'when', 'where', 'which', 'why', 'how', 'the', 'a', 'an', 'is', 'are', 'was', 'were',
  'do', 'does', 'did', 'you', 'your', 'yours', 'we', 'our', 'i', 'me', 'my', 'it', 'its', 'this',
  'that', 'these', 'those', 'to', 'of', 'in', 'on', 'for', 'and', 'or', 'but', 'with', 'as', 'at',
  'by', 'from', 'would', 'could', 'can', 'will', 'be', 'been', 'have', 'has', 'had', 'there', 'here',
  'so', 'if', 'then', 'now', 'else', 'able', 'name', 'tell', 'say', 'about',
  /* "Last time" is when, not what: it matched "what has moved since last time" to a question about what
     almost went wrong (run 8, 21 Sep 2026). */
  'last', 'time', 'since', 'next', 'one', 'thing', 'something', 'anything', 'specific', 'specifically', 'today', 'period',
]);

/**
 * NUMBERS ARE SUBJECT WORDS, and leaving them out is what let the worst example through.
 *
 * "500 contracts, daaa. and the sales linked to them" came back as "500 contracts and the sales
 * linked to them by the end of the year." Reading only letters, the figure at the front of both -
 * the most obviously repeated thing in the pair - counted for nothing.
 */
/* A target, a figure, an amount and a number are one subject: "what is your target" and "what is the
   specific number" asked for the same thing three times (run 12, Emeka). And "Q3" is a word. */
const ONE_SUBJECT: Record<string, string> = { target: 'number', targets: 'number', figure: 'number', figures: 'number', amount: 'number', total: 'number', count: 'number' };
function subjectWords(text: string): Set<string> {
  return new Set(
    /* "others" is "other" and "targets" is "target": a plural is the same subject. */
    (text ?? '').toLowerCase().match(/[a-z']{3,}|\d+|\bq[1-4]\b/g)?.filter((w) => !CARRIES_NO_SUBJECT.has(w)).map((w) => ONE_SUBJECT[w] ?? (w.length >= 5 && /[^s]s$/.test(w) ? w.slice(0, -1) : w)) ?? [],
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
/**
 * THE QUESTION, NOT THE PREAMBLE. "That simplifies the credit sales and arrears part of the target for
 * your contribution. What is your sales target for Q3?" - "I don't have a Q3 target" - "The record
 * needs a number for your Q3 sales. What is the specific number you are working towards for Q3?" - three
 * times (run 12, Emeka). Read whole, the first turn's preamble put eight subject words round a three-word
 * question and the second ask shared a quarter of them; read as questions, they share two thirds. Where
 * a turn asks something, the asking is what is compared.
 */
const theQuestionIn = (text: string): string => {
  const qs = (text ?? '').split(/(?<=[.!?])\s+/).filter((x) => /\?\s*$/.test(x));
  return qs.length ? qs.join(' ') : (text ?? '');
};

export function asksTheSameThingAgain(earlier: string, now: string): boolean {
  const a = subjectWords(theQuestionIn(earlier));
  const b = subjectWords(theQuestionIn(now));
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
/*
 * THE INSTRUCTION THAT LOST FOUR TIMES OUT OF FIVE.
 *
 * Measured across 19 live check-ins on 15 September 2026: the guard fired 75 times, the second try
 * fixed it 12 times, and 58 times the model restated them again and the first reply stood. As a
 * detector this works. As an instruction it did not.
 *
 * Why it lost, reading the failures: it said what NOT to do and left the model to find the opening
 * on its own, and the easiest opening in the world is the sentence you were just given. So it now
 * names the offending sentence back, gives the rule as a positive - the first sentence must carry
 * something they do not already have - and shows the move.
 */
export function doNotSayItBack(theirLast: string, reply: string): string {
  const theOpener = (reply ?? '').split(/(?<=[.?!])\s/)[0]?.trim() ?? '';
  return `Your reply opens by handing them back what they just said. They know what they said. Reading their own answer back is the single most common complaint about this product, in those words: "it is repeat and going around in circles".

This is the sentence that does it:
"${theOpener}"

Write the reply again with that sentence GONE. Not reworded, not shortened, not moved: gone.

The first sentence of the new reply must carry something they do not already have. Any of these:
- a figure or a fact from the record they have not been shown
- what their answer changes, or what it means for the thing they are working towards
- the question itself, asked straight

Two or three words of acknowledgement are fine ("Understood." "That is a lot."). A sentence that
summarises their message is not, however different the words are. Their content in your phrasing is
still their content.`;
}

/** Kept for the callers that have no access to what was said - the standing form of the same rule. */
export const DO_NOT_SAY_IT_BACK = doNotSayItBack('', '');

/**
 * ASKED TWICE ALREADY AND STILL ASKING. NOBODY HAS TO OBJECT FOR THIS TO BE WRONG.
 *
 * The guard above fires when somebody says the questions are wrong. Most people never say that. They
 * answer something adjacent, or answer a different question, and a polite person will do that all
 * day while the same question keeps coming back.
 *
 * Run through a first setup conversation, a lead was asked how her objective connects to the company
 * direction in three consecutive turns:
 *
 *   "How does that objective of 500 contracts by year-end connect to the company direction?"
 *   "How does that overall objective of 500 contracts by year-end connect to the company direction?"
 *   "How does this objective connect to the company's overall direction?"
 *
 * She never complained. She answered "150 each and I have a target of 50 myself", then "finance
 * confirms the numbers", both real answers to something, and got the same question back both times.
 * From her side that is the product not listening. From the prompt's side it is a step that has not
 * been satisfied. Neither half can see the other.
 *
 * TWICE IS THE LIMIT. Once is asking. Twice is checking you were heard. A third time is the thing a
 * person remembers about the product, and whatever it was going to learn is worth less than that. If
 * it matters and nobody has answered it, it belongs in the report as still open, which is what the
 * report is for.
 */
/**
 * THE SAME QUESTION, WORD FOR WORD, STRAIGHT AFTER ITSELF. "How many more acres are you able to farm on
 * your own land now, and how many are you covering for your neighbours?" went out twice in a row with
 * one answer between (smoke run, 20 Sep 2026). Two asks share a subject at half their words; a copy
 * shares nearly all of them, and a copy does not need a third go to be the fault.
 */
export function repeatsTheLastAskWordForWord(reply: string, lastAsk: string | null | undefined): boolean {
  if (!lastAsk?.trim()) return false;
  /* The question sentences only, flattened: a reworded second ask is allowed (see the spec next
     door); a copy is the same sentence with the same words in the same order. */
  const earlier = theQuestionsIn(lastAsk);
  /* Or one inside the other: "You said delivery ... Did that happen?" is "Last time you said delivery ... Did that happen?" again (pilots, problem 4). */
  return theQuestionsIn(reply).some((q) => earlier.includes(q) || earlier.some((e) => Math.min(e.split(' ').length, q.split(' ').length) >= 8 && (e.includes(q) || q.includes(e))));
}

/*
 * A SHORT QUESTION IS ASKED WITH THE SENTENCE BEFORE IT (pilots, 13 October 2026, problem 4). "Last time you said
 * delivery for Kilele Hotel was happening on Wednesday. Did that happen?" was asked four times after Kevin said
 * "Delivered Kilele today". The question sentence on its own, "Did that happen?", is three words and was never
 * compared; what it asks is in the sentence before it. So a question of fewer than five words is read together
 * with that sentence.
 */
const flat = (x: string) => x.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const sentencesOfAReply = (t: string): string[] => (t ?? '').split(/(?<=[.!?])\s+/).filter((x) => x.trim());
function theQuestionsIn(t: string): string[] {
  const all = sentencesOfAReply(t);
  return all
    .map((x, i) => (/\?\s*$/.test(x) ? (flat(x).split(' ').length < 5 && i > 0 ? flat(`${all[i - 1]} ${x}`) : flat(x)) : ''))
    .filter((x) => x && x.split(' ').length >= 5);
}

export function alreadyAskedTwice(reply: string, earlierAsks: string[]): boolean {
  const asked = (earlierAsks ?? []).filter((a) => (a ?? '').trim());
  if (repeatsTheLastAskWordForWord(reply, asked[asked.length - 1])) return true;
  if (asked.length < 2) return false;
  /*
   * ANY TWO EARLIER TURNS, NOT THE LAST TWO. This read only the two most recent asks, so "what is
   * stopping you" at turns 9, 11 and 13 with another question in between never counted, and the
   * convener of a discovery session got it three times (adversarial run, 20 Sep 2026). A thing
   * asked twice anywhere in the session, and now a third time, is the fault whatever sat between.
   */
  /*
   * TWO EARLIER ASKS NEED LESS OVERLAP EACH. "What specific numbers are you now tracking for how the
   * asset is working" went to Ibrahim four times in one session, reworded each time, and no pair
   * reached half (run 7, 21 Sep 2026). Two earlier turns sharing two fifths of a question's subject is
   * the same question three times.
   */
  return asked.filter((a) => asksTheSameThingAgain(a, reply) || asksMuchTheSameThing(a, reply)).length >= 2;
}

/**
 * THE SAME QUESTION STRAIGHT BACK, AFTER IT WAS ANSWERED. "What specific thing are you doing to keep
 * them healthy right now?" - "Vaccinating them." - and two turns later "What specific thing are you
 * doing to keep your 260 hens healthy right now?" - "I just said. Vaccinating them." (run 11, Halima).
 * Not word for word, so repeatsTheLastAskWordForWord let it by; not a third ask, so alreadyAskedTwice
 * did. A second ask that shares four fifths of the last one's subject, straight after a real answer
 * to it, is the fault on its own. Stricter than asksTheSameThingAgain on purpose: a follow-up on the
 * same subject ("what would get the Kano invoice moving" after "what moved on the Kano invoice") is
 * how a conversation goes deeper, and shares about two fifths.
 */
export function asksItAgainAfterTheAnswer(lastAsk: string | null | undefined, reply: string): boolean {
  if (!lastAsk?.trim() || !/\?/.test(reply ?? '')) return false;
  const a = subjectWords(lastAsk.split(/(?<=[.!?])\s+/).filter((x) => /\?\s*$/.test(x)).join(' ') || lastAsk);
  const b = subjectWords((reply ?? '').split(/(?<=[.!?])\s+/).filter((x) => /\?\s*$/.test(x)).join(' '));
  if (a.size < 3 || b.size < 3) return false;
  let shared = 0;
  for (const w of b) if (a.has(w)) shared += 1;
  return shared / Math.min(a.size, b.size) >= 0.8;
}

/**
 * AND THE SAME QUESTION BACK AFTER AN ANSWER FURTHER UP, NOT ONLY THE LAST ONE.
 *
 * asksItAgainAfterTheAnswer reads the last ask only. Hana, shock scenario, run 9 (27 Sep 2026):
 *
 *   "Meridian gave notice on Friday. What just happened with Meridian, as you understand it?"
 *   "Meridian gave notice. I understand this means they are cancelling their contract with us."
 *   "Understood. When did you first learn about Meridian giving notice, and from whom?"
 *   "I learned about Meridian giving notice this morning, from this check-in."
 *   "That means nobody told you directly before this. What just happened with Meridian, as you understand it?"
 *
 * Word for word, two turns after she answered it. Not the last ask, so the straight-back check let
 * it by; asked twice, not three times, so alreadyAskedTwice did too.
 *
 * THE LAST ASK AT FOUR FIFTHS, AN EARLIER ONE WORD FOR WORD. Read over every Groundwork turn in runs
 * 8, 9 and 10 (2,163 of them): four fifths on any earlier question found 17 more, and five of those
 * were a real follow-up ("who else saw your work on the onboarding flow" after "what part of the
 * onboarding flow did you work on"). The same question sentence, word for word, found seven, and
 * every one was the same question sent again after an answer.
 *
 * @param turns this session's turns, oldest first, the person's latest answer last
 * @param answered whether a person's reply was a real answer (not declined, not pushing back)
 */
export function anAnsweredQuestionAskedAgain(
  turns: { role: 'AI' | 'PERSON'; content: string }[],
  reply: string,
  answered: (theySaid: string) => boolean,
): { ask: string; answer: string } | null {
  let theLastAsk = true;
  for (let i = turns.length - 2; i >= 0; i -= 1) {
    const ask = turns[i];
    const next = turns[i + 1];
    if (ask.role !== 'AI' || next.role !== 'PERSON') continue;
    const isTheLast = theLastAsk;
    theLastAsk = false;
    if (!/\?/.test(ask.content ?? '') || !answered(next.content ?? '')) continue;
    const again = isTheLast ? asksItAgainAfterTheAnswer(ask.content, reply) : repeatsTheLastAskWordForWord(reply, ask.content);
    if (again) return { ask: ask.content, answer: next.content };
  }
  return null;
}

function asksMuchTheSameThing(earlier: string, now: string): boolean {
  const a = subjectWords(earlier);
  const b = subjectWords(now);
  if (a.size < 4 || b.size < 4) return false;
  let shared = 0;
  for (const w of b) if (a.has(w)) shared += 1;
  return shared / Math.min(a.size, b.size) >= 0.4;
}

export const ASKED_IT_TWICE_ALREADY = `You have now asked this same thing three turns running. They have answered each time, just not with what you were looking for, and asking again is what makes a check-in feel like it is going nowhere.

Let it go and ask about something else that matters here. Do not rephrase it and do not explain why you wanted it. If it genuinely matters and nobody has answered it, it belongs in the report as still open, not in a fourth question.`;

/**
 * THE OPENING SENTENCE, REMOVED, WHEN ASKING TWICE HAS NOT WORKED.
 *
 * Every other guard in this codebase keeps the first reply when the retry fails: a flat reply beats
 * no reply, and cutting text usually takes something real with it. The warning against text surgery
 * elsewhere in this file is about stripping a trailing question, which takes out the probe.
 *
 * This fault is the exception, because of what the fault IS. The sentence being removed carries
 * nothing the person did not just say - that is the definition of the thing the guard caught. What
 * is left is the part of the reply that was doing work.
 *
 * Narrow deliberately. Returns null - meaning leave it alone - unless all of this holds:
 *  - the restatement really is the first sentence, not something further in
 *  - there is more than one sentence
 *  - what remains still asks them something, so this cannot create a dead end
 *  - what remains is long enough to be a reply at all
 */
/**
 * THE SHORT ECHO THE OVERLAP TEST CANNOT SEE.
 *
 * `opensByRepeatingThem` measures how much of the opening sentence is words they just used, and it
 * needs at least three content words to say anything - which is right for a paragraph handed back,
 * and blind to the shortest version of the same fault. Read live in a discovery session:
 *
 *   they  "That is all I have."
 *   it    "That is all you have."
 *
 * Four words, one pronoun flipped, and it is the purest form of saying nothing. So this is a second
 * test with a different shape: strip the pronouns that swap sides in a conversation, and if what is
 * left is the same sentence, it is theirs handed back whatever its length.
 */
const SWAPS: [RegExp, string][] = [
  [/\bi\b/g, 'you'], [/\bmy\b/g, 'your'], [/\bme\b/g, 'you'], [/\bmine\b/g, 'yours'],
  [/\bwe\b/g, 'you'], [/\bour\b/g, 'your'], [/\bam\b/g, 'are'], [/\bi\'m\b/g, 'you are'],
];

export function isTheirOwnSentenceBack(theySaid: string, sentence: string): boolean {
  const bare = (t: string) => {
    let out = (t ?? '').toLowerCase().replace(/[^a-z0-9\s']/g, ' ');
    for (const [re, to] of SWAPS) out = out.replace(re, to);
    return out.replace(/\s+/g, ' ').trim();
  };
  const theirs = bare(theySaid);
  const mine = bare(sentence);
  if (!mine || mine.split(' ').length < 3) return false;
  return theirs === mine || theirs.includes(mine);
}

export function withoutTheSentenceThatSaysItBack(theySaid: string, reply: string): string | null {
  const sentences = (reply ?? '').split(/(?<=[.?!])\s+/).filter((s) => s.trim());
  if (sentences.length < 2) return null;
  /* Either shape of the same fault: the long restatement, or the four-word echo. */
  if (!opensByRepeatingThem(theySaid, sentences[0]) && !isTheirOwnSentenceBack(theySaid, sentences[0])) return null;

  /*
   * UNLESS THE SENTENCE CARRIES A FIGURE THEY NEVER SAID, WHICH IS THE WHOLE JUSTIFICATION GONE.
   *
   * The comment above says this is allowed because the sentence being removed carries nothing the
   * person did not just say. Driven live the day it was written, that turned out to have an
   * exception: she said "closed by the end of the year", the interview came back "the end of the
   * year - so 31 December 2026?", and this cut the opening as a restatement. What reached her was
   * "Is that the date you mean?" - a question about a date the product had just deleted.
   *
   * A number, a date or a name in the opening that is NOT in what they said is the product giving
   * something back, which is the opposite of handing their own words over. The guard above may
   * still ask for a better reply; this stops the surgery.
   */
  const theirs = (theySaid ?? '').toLowerCase();
  const newFigures = (sentences[0].match(/\b\d[\d,.]*\b|\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/gi) ?? [])
    .filter((f) => !theirs.includes(f.toLowerCase().replace(/[.,]$/, '')));
  if (newFigures.length) return null;

  const rest = sentences.slice(1).join(' ').trim();
  if (rest.split(/\s+/).length < 5) return null;
  if (!/\?/.test(rest)) return null;
  if (opensByRepeatingThem(theySaid, rest)) return null;
  return rest;
}

/**
 * AND WHEN THE SECOND TRY ASKS IT A FOURTH TIME, THE PRODUCT TAKES THE QUESTION OUT.
 *
 * Read on a live session about shops in Kano. The date question went out four turns running:
 *
 *   "By the end of Q4, do you have a specific date in mind, even if it is an estimate?"
 *   "What date in Q4 are you hoping to hit the 40-shop target by, even if that is a stretch goal?"
 *   "And a target of 40 by the end of Q4. What specific date are you working towards?"
 *
 * The guard above caught the third one and asked again, exactly as designed, and the retry asked it
 * again in new words - which is the designed fallback, and the fallback is the bug: the person is
 * still reading the same question for the fourth time.
 *
 * So the question comes out. What is left of the reply is whatever else it said, which is usually an
 * acknowledgement of what they just told it, and the conversation moves on without the product
 * pretending nobody noticed. Where the question was the whole reply, there is nothing to keep and
 * the caller falls back to what it had.
 *
 * "There is no date yet" is a real answer to a date question, and after three asks the honest thing
 * is to treat the silence as that answer rather than to keep asking for one.
 */
export function withoutTheQuestionAskedAgain(reply: string, earlierAsks: string[]): string {
  const sentences = reply.match(/[^.!?\n]+[.!?]*/g) ?? [];
  const drop = new Set<number>();
  sentences.forEach((sentence, i) => {
    if (!sentence.includes('?')) return;
    if (earlierAsks.some((asked) => asksTheSameThingAgain(asked, sentence))) { drop.add(i); return; }
    /* A short question goes with the sentence that says what it asks, and both come out together (problem 4). */
    if (i > 0 && flat(sentence).split(' ').length < 5 && earlierAsks.some((asked) => repeatsTheLastAskWordForWord(`${sentences[i - 1].trim()} ${sentence.trim()}`, asked))) {
      drop.add(i);
      drop.add(i - 1);
    }
  });
  const kept = sentences.filter((_, i) => !drop.has(i));
  return kept.join('').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * THEY CORRECTED US (Hafsah, 13 October 2026: "AI is always going to make mistakes; what matters is people can go in their
 * chat and clarify"). David wrote "I told you, the title search came back yesterday. It is not blocked." and was asked
 * "What is the date you will have an answer by?" about the same title search. A correction is read in code: "I told you",
 * "I said", "as I said", "that is wrong", "it was David, not Otieno", "it is not blocked". What they say is the record from
 * here (the newest account is what the record keeps when the check-in closes), and the thing they corrected is not asked
 * about again in this check-in.
 */
const A_CORRECTION = /\b(?:i (?:already )?(?:told|said to) you|i (?:already )?said (?:that|it|so)|i said it already|as i (?:said|told you)|like i said|that(?:'s| is) (?:wrong|not right|not true|not what i said)|you(?:'ve| have)? got (?:it|that) wrong|it(?:'s| is) not blocked|(?:it|that) was \w+,? not \w+|not \w+,? (?:it was|but) \w+)\b/i;
export const theyCorrectedUs = (said: string): boolean => A_CORRECTION.test(said ?? '');

/** The subject a correction is about, so a reply asking about it again can be told from one that moved on. */
export function asksAboutWhatTheyCorrected(correction: string, reply: string, lastAsk?: string | null): boolean {
  const theirs = subjectWords(correction);
  const asked = (reply ?? '').split(/(?<=[.!?])\s+/).filter((x) => /\?\s*$/.test(x)).join(' ');
  if (!asked) return false;
  /*
   * THEY POINTED AT PROOF ALREADY SENT (reviewer, 14 October): "I told you, Kevin already sent the M-Pesa screenshot." was answered
   * with a request to describe the screenshot. Proof they say was sent is not asked for again, nor described back to us.
   */
  if (/\b(?:screenshot|photo|picture|receipt|document|invoice|m-?pesa|file|attached|sent (?:it|them|the))\b/i.test(correction)
    && /\b(?:screenshot|photo|picture|receipt|document|invoice|proof|describe|show(?:s|ing)?|send|attach|share|upload)\b/i.test(asked)) return true;
  /* They said it is not in the way any more, so no question about what is in the way: "What specifically is the hold-up with Kasarani?" */
  if (/\bnot (?:blocked|stuck|held up|waiting)\b|\bcame back\b|\b(?:has |have )?arrived\b|\b(?:is|was|it's) (?:done|sorted|cleared|in)\b/i.test(correction)
    && /\b(?:hold-?ups?|blocked|blocking|stuck|waiting|delay(?:ed|s)?|unblock|in the way|slowing)\b/i.test(asked)) return true;
  /* A follow-up on the thing the last question was about, once they corrected it: "What is the date you will have an answer by?" */
  if (lastAsk) {
    const before = subjectWords(lastAsk);
    let onIt = 0;
    for (const w of before) if (theirs.has(w)) onIt += 1;
    if (onIt >= 2 && /\b(?:by when|what date|the date|a date|unblock|answer by|still waiting|chase|when will|how long)\b/i.test(asked)) return true;
  }
  const words = subjectWords(asked);
  let shared = 0;
  for (const w of words) if (theirs.has(w)) shared += 1;
  return shared >= 2 || (shared >= 1 && words.size <= 3);
}

export const THEY_CORRECTED_YOU = 'THEY HAVE JUST CORRECTED YOU. What they said is the record now. In one short sentence, say back what they told you, in their words, without arguing and without "I understand". Do not ask about that thing again in any wording, and do not ask how they will unblock or finish something they say is done or not blocked. Then ask about something else from their work, or close if they said they are done.';
