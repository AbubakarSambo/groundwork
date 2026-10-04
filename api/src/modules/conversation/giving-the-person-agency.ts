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

When they say yes, you will be told that it has been written down. Say so in one plain sentence, in their words. Say what happened, and do not call it good.`;

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
  const text = (wordForWord ? theirIdea.slice(theirIdea.toLowerCase().indexOf(quoted!.toLowerCase())).slice(0, quoted!.length) : theirIdea).trim();
  return text ? { kind: 'yes', text: text.slice(0, 400) } : null;
}

/** Whether Groundwork has already offered, anywhere in this conversation, so it is offered once. */
export function hasAlreadyOffered(newestFirst: Turn[]): boolean {
  return newestFirst.some((t) => t.role !== 'PERSON' && t.role !== 'user' && isAnOfferToWriteItDown(t.content ?? ''));
}

/** What the model is told on the turn after the person answered an offer. Only what the record shows happened. */
export function whatHappenedToTheOffer(agreed: { kind: 'yes'; text: string } | { kind: 'no' } | null, written: boolean | 'already'): string {
  if (!agreed) return '';
  if (agreed.kind === 'no') {
    return '# They said no to having it written down\n\nNothing was written down. Take it as it is, do not offer it again, and ask one question about something else.';
  }
  if (written === 'already') {
    return `# They said yes, and it was already written down\n\nThey already had this written down as something they will do: "${agreed.text}". Tell them so in one plain sentence, in their words, and ask one question that helps them act on it. Do not call it good.`;
  }
  if (!written) {
    return '# They said yes, but it could not be written down just now\n\nTell them so plainly in one sentence, and do not say it was written down. Ask one question about what is taking most of their attention.';
  }
  return `# They said yes, and it has been written down\n\nYou have written down, as something they will do: "${agreed.text}". Say so in one plain sentence, in their words. Say what happened and do not call it good. Then ask one question that helps them act on it, such as when they will do it or what would make it easier.`;
}

/** The line that tells the model it has already made its one offer. */
export const YOU_HAVE_ALREADY_OFFERED = '# You have already offered\n\nYou have already offered to write something down in this conversation. Do not offer again.';
