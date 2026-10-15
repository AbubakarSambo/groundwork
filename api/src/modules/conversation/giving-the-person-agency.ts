/**
 * THE ANCHOR SCENARIO: GIVING THE PERSON AGENCY, AND TURNING WHAT THEY THINK COULD HAPPEN INTO A COMMITMENT.
 * (docs/anchor-scenario.md, section 16, steps 4 and 5; docs/anchor-scenario-plan.md, piece 17)
 *
 * The model asks the person what THEY think could happen, and when what they say is something they
 * could do themselves, it offers their own words back as a commitment, in one question. That part is
 * guidance, and stays with the model. What the product owns is the part that must never be left to a
 * model: NOTHING IS WRITTEN DOWN UNTIL THE PERSON SAYS YES. The yes is read here from the record of the
 * conversation, not from what the model says it did, and the words written are the person's own.
 *
 * The write itself is the check-in's existing one for what a person has said they will do
 * (`GroundCommitment`, source CHECK_IN, which `what-they-said-they-would-do-next` writes at the end of
 * a session and the next session reads back). This file decides whether and what; it writes nothing.
 *
 * Nothing here praises. The carrot principle (Needs Hafsah 5 and 6) stays open; the guidance says what
 * happened and never that it was good.
 */

/** The model's part: ask what they think could happen, and offer their own words back. */
export const THE_AGENCY_GUIDANCE = `# Asking what they think could happen

After they have told you what moved and what is in the way, give them the lead: ask what THEY think could happen next. For example: "What do you think could happen next?" or "If you could change one thing about this, what would it be?" Ask it once, as the only question in that turn, and take their answer as it is. Do not put an idea of your own in its place.

When what they say is something they could do themselves, you may offer to write it down as something they will do. Offer it in one question, with their own words in quotation marks exactly as they said them: Would you like me to write down "their words" as something you will do?

Nothing is written down until they say yes. If they say no, or change it, take that as it is, and do not offer it again. Offer at most once in a conversation, and never on the first answer they give. Never offer something that is not theirs: not what their lead wants, not what a colleague should do, not an idea you had.

When they say yes, the product writes it down and tells them so itself, in the words just before yours. You then ask one question that helps them act on it. Say what happened, and do not call it good.`;

/** How the model offers it. Read loosely on purpose: a missed offer is only a yes that writes nothing, and the model is told so. */
const AN_OFFER = /\bwould you like me to (?:write|note|put|record|keep|capture|add)\b/i;

/** Quoted words: straight or curly. */
const A_QUOTE = /["“]([^"”]{6,400})["”]/;

const A_YES = /^\s*(?:yes|yeah|yep|yup|sure|ok|okay|please do|please|go ahead|do it|that'?s right|that is right|correct|absolutely|definitely|of course)\b/i;
const NOT_PLAIN = /\b(?:no|not|don'?t|dont|rather not|wait|but|actually|instead|change|except|only if)\b/i;
const A_NO = /^\s*(?:no|nope|nah|not really|not now|don'?t|rather not|please don'?t|leave it)\b/i;

/** A plain yes: short, starting with a yes, with no "but" or "not" in it. Anything else is not a yes. */
export function aPlainYes(answer: string): boolean {
  const a = (answer ?? '').trim();
  return a.length > 0 && a.length <= 120 && A_YES.test(a) && !NOT_PLAIN.test(a);
}

export function aPlainNo(answer: string): boolean {
  const a = (answer ?? '').trim();
  return a.length > 0 && a.length <= 120 && A_NO.test(a);
}

export function isAnOfferToWriteItDown(aiTurn: string): boolean {
  return AN_OFFER.test(aiTurn ?? '');
}

type Turn = { role: string; content: string | null };

/**
 * WHAT THE ANSWER JUST GIVEN AGREED TO, read from the record. `newestFirst` is the conversation before this answer, newest first.
 * - Yes: the last thing Groundwork said was an offer to write something down, and the answer is a plain yes. The words to keep are the
 *   person's own: the words in quotation marks in the offer, when they are word for word in what the person said just before it; otherwise
 *   what the person said just before it.
 * - No: the last thing was an offer and the answer is a plain no.
 * - Nothing: anything else, including a yes to something that was not an offer.
 */
export function whatTheAnswerAgreedTo(newestFirst: Turn[], answer: string): { kind: 'yes'; text: string } | { kind: 'no' } | null {
  const last = newestFirst[0];
  if (!last || last.role === 'PERSON' || last.role === 'user') return null;
  const offer = last.content ?? '';
  if (!isAnOfferToWriteItDown(offer)) return null;
  if (aPlainNo(answer)) return { kind: 'no' };
  if (!aPlainYes(answer)) return null;
  const theirIdea = (newestFirst.slice(1).find((t) => t.role === 'PERSON' || t.role === 'user')?.content ?? '').trim();
  if (!theirIdea) return null;
  const quoted = A_QUOTE.exec(offer)?.[1]?.trim();
  const wordForWord = quoted && theirIdea.toLowerCase().includes(quoted.toLowerCase());
  const text = (wordForWord ? theirIdea.slice(theirIdea.toLowerCase().indexOf(quoted!.toLowerCase())).slice(0, quoted!.length) : theTurnTheOfferIsAbout(theirIdea, offer)).trim();
  return text ? { kind: 'yes', text: text.slice(0, 400) } : null;
}

/**
 * WHEN THE OFFER DID NOT QUOTE THEM, THE SENTENCE OF THEIRS IT IS ABOUT. A person's turn can hold several things ("those are finished, and I could
 * also ask Tunde to forward me the photos"), and only one of them is what was offered. That one sentence is kept, exactly as they typed it, when
 * the offer shares at least half of its words; otherwise everything they said just before it is kept, because guessing which part is worse.
 */
function theTurnTheOfferIsAbout(theirIdea: string, offer: string): string {
  const sentences = theirIdea.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
  if (sentences.length < 2) return theirIdea;
  const offered = new Set((offer.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []));
  let best: { sentence: string; score: number } | null = null;
  for (const sentence of sentences) {
    const words = sentence.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? [];
    if (words.length < 4) continue;
    const score = words.filter((w) => offered.has(w)).length / words.length;
    if (!best || score > best.score) best = { sentence, score };
  }
  return best && best.score >= 0.5 ? best.sentence : theirIdea;
}

/** Whether Groundwork has already offered, anywhere in this conversation, so it is offered once. */
export function hasAlreadyOffered(newestFirst: Turn[]): boolean {
  return newestFirst.some((t) => t.role !== 'PERSON' && t.role !== 'user' && isAnOfferToWriteItDown(t.content ?? ''));
}

/**
 * WHAT THE PRODUCT ITSELF SAYS ABOUT THE OFFER, BEFORE THE MODEL SPEAKS. Whether something was written down is a fact about the record, so the
 * product states it, not the model, and it is never stated unless the record shows it. The model then asks the one question that follows.
 */
export function weSayAboutTheOffer(agreed: { kind: 'yes'; text: string } | { kind: 'no' } | null, written: boolean | 'already'): string {
  if (!agreed || agreed.kind === 'no') return '';
  if (written === 'already') return 'You already had that written down as something you will do.';
  return written ? 'I have written that down as something you will do.' : 'I could not write that down just now.';
}

/** What the model is told on the turn after the person answered an offer. Only what the record shows happened. */
export function whatHappenedToTheOffer(agreed: { kind: 'yes'; text: string } | { kind: 'no' } | null, written: boolean | 'already'): string {
  if (!agreed) return '';
  if (agreed.kind === 'no') {
    return '# They said no to having it written down\n\nNothing was written down. Take it as it is, do not offer it again, and ask one question about something else.';
  }
  if (written === 'already') {
    return '# They said yes, and it was already written down\n\nThey have just been told, in the words before yours, that they already had this written down as something they will do. Do not say it again and do not repeat their words. Ask one question that helps them act on it, such as when they will do it or what would make it easier.';
  }
  if (!written) {
    return '# They said yes, but it could not be written down just now\n\nThey have just been told so, in the words before yours. Do not say it again and do not say it was written down. Ask one question about what is taking most of their attention.';
  }
  return '# They said yes, and it has been written down\n\nThey have just been told, in the words before yours, that it is written down as something they will do. Do not say it again, do not repeat their words, and do not call it good. Ask one question that helps them act on it, such as when they will do it or what would make it easier.';
}

/** The line that tells the model it has already made its one offer. */
export const YOU_HAVE_ALREADY_OFFERED = '# You have already offered\n\nYou have already offered to write something down in this conversation. Do not offer again.';

/**
 * WHETHER THE QUESTION THAT GIVES THEM THE LEAD HAS BEEN ASKED YET, read from Groundwork's own earlier turns in this check-in. The engine's
 * own questions about what a person will do, and by when, come naturally after every answer and win over a line that merely asks to go
 * first, so the record is read and the model is told plainly that this one is still owed. It is context handed to the model: it does not
 * choose the words.
 */
const THE_AGENCY_QUESTION = [
  /what do you think (?:could|might|will|should) (?:happen|change|be done)/i,
  /what (?:could|might) happen next/i,
  /if you could change one thing/i,
  /what would you (?:do|change|try) (?:if|about)/i,
];

export function hasAskedWhatTheyThinkCouldHappen(newestFirst: Turn[]): boolean {
  return newestFirst.some((t) => t.role !== 'PERSON' && t.role !== 'user' && THE_AGENCY_QUESTION.some((r) => r.test(t.content ?? '')));
}

/** Owed from their second answer on, and until it has been asked or an offer has been made. */
export function whatIsStillOwedToThem(newestFirst: Turn[]): string {
  const theirAnswers = newestFirst.filter((t) => t.role === 'PERSON' || t.role === 'user').length + 1;
  if (theirAnswers < 2) return '';
  if (hasAskedWhatTheyThinkCouldHappen(newestFirst) || hasAlreadyOffered(newestFirst)) return '';
  return '# Still owed to them in this check-in\n\nYou have not yet asked what THEY think could happen next. Ask that now, in your own words, as the only question this turn, and do not ask what they will do, by when, or what happens if it goes wrong until they have answered it.';
}

/**
 * THE PRODUCT HAS ALREADY SAID IT WAS WRITTEN DOWN, SO THE MODEL'S OWN TELLING OF IT IS TAKEN OUT. The model is asked not to say it again and
 * sometimes does, which reads as the same sentence twice. Only sentences that say something was written, noted or recorded are removed, and
 * never the question; if nothing would be left, the reply is kept as it is.
 */
const SAYS_IT_WAS_WRITTEN = /\b(?:written|wrote|noted|recorded|saved|captured)\b[^.?!]{0,30}\b(?:down|it|that|this)\b|\b(?:have|has|had|'ve) (?:written|noted|recorded|saved|captured)\b/i;

const wordsOf = (s: string): string[] => (s.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []);

/** A statement that gives most of their words back, which is a second telling of what the product has just said, and may not be word for word. */
function echoesTheirWords(sentence: string, theirWords: string): boolean {
  const ours = new Set(wordsOf(sentence));
  const theirs = wordsOf(theirWords);
  if (ours.size < 5 || theirs.length < 5) return false;
  const shared = theirs.filter((w) => ours.has(w)).length;
  return shared / theirs.length >= 0.6;
}

export function withoutTheSecondTellingOfIt(reply: string, theirWords = ''): string {
  const parts = (reply ?? '').split(/(?<=[.!?])\s+/);
  const kept = parts.filter((p) => {
    if (p.trim().endsWith('?')) return true;
    return !(SAYS_IT_WAS_WRITTEN.test(p) || (theirWords && echoesTheirWords(p, theirWords)));
  });
  const out = kept.join(' ').trim();
  return out && out.includes('?') ? out : reply;
}

/**
 * WHAT THEY JUST SAID LOOKS LIKE SOMETHING THEY COULD DO THEMSELVES, read from their own words with the plainest of tests: "I will", "I could",
 * "I would", "I am going to", "the quickest thing is". It never decides anything. It tells the model that the offer may be due, and the model
 * judges whether it really is theirs to do. Not once an offer has been made in this conversation.
 */
const SOUNDS_LIKE_THEIR_OWN_STEP = /\b(?:i|we)\s*(?:will|'ll|would|could|can|am going to|'m going to|plan to|intend to|might)\b(?!\s*not\b)(?!n't)|\bi'd\b|\bi think the (?:quickest|best|simplest|easiest|first) thing is\b/i;

export function whatTheyJustSaidMayBeTheirOwnStep(newestFirst: Turn[], answer: string): string {
  const a = (answer ?? '').trim();
  if (!a || hasAlreadyOffered(newestFirst) || !SOUNDS_LIKE_THEIR_OWN_STEP.test(a)) return '';
  return '# What they just said may be something they could do themselves\n\nIf it is theirs to do, and not what their lead wants or what a colleague should do, your question this turn is the offer to write it down as something they will do, with their own words in quotation marks. If it is not, ask your next question as you would.';
}
