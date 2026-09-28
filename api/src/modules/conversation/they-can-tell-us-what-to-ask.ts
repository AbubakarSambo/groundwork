/**
 * THEY CAN TELL US WHAT TO ASK, AND WE HAVE TO FOLLOW.
 *
 * The brief for the update scenario says it to the person answering, in their own words: "You can
 * simply state your needs, or you can directly tell the AI what you want it to explore or ask you
 * about. The AI should follow your lead."
 *
 * It could not. Nothing read an instruction about what to ask, so somebody who typed "ask me about
 * how I vet distributors" was asked about volumes instead - promised something and refused it in
 * the same five minutes, which is worse than never offering.
 *
 * AND ONE SHAPE OF STEER WAS BEING THROWN AWAY. Tested on six phrasings, five survived as ordinary
 * answers and one did not: "you keep asking about volumes, ask me about distribution" opens with a
 * complaint, so `a-remark-about-the-tool-is-not-the-work` classified the whole turn as a remark
 * about the product - answered politely, and the instruction inside it discarded. A steer arriving
 * with a complaint attached is the commonest shape of steer there is, because people only steer
 * when the questions have already gone somewhere they do not want.
 *
 * WHY DETERMINISTIC. A steer has to be recognised on the turn it arrives, before the reply is
 * composed, or the person is answered wrongly once and has to say it twice. That rules out a model
 * call. The phrasings are few and stable - the ones below are the ones people actually use - and a
 * missed steer costs one turn, where a false one drags the conversation somewhere nobody asked for.
 * So this is narrow on purpose: an explicit instruction about what to ask, and nothing else.
 */

/**
 * The ways people say it. Each one captures the subject as its last group.
 *
 * Deliberately NOT matching bare "what about X" or "and X?" - those are how people carry on a
 * conversation, not how they redirect it, and treating them as steers would hand the conversation
 * to whatever noun somebody last mentioned.
 */
const TELLING_US_WHAT_TO_ASK: RegExp[] = [
  /\b(?:can|could|would)\s+you\s+(?:please\s+)?ask\s+(?:me\s+)?(?:about|on)\s+(.{3,90})/i,
  /\bask\s+me\s+(?:about|on)\s+(.{3,90})/i,
  /\b(?:let'?s|lets)\s+(?:talk|speak)\s+about\s+(.{3,90})/i,
  /\bi\s+(?:want|would like|need)\s+to\s+(?:talk|speak)\s+about\s+(.{3,90})/i,
  /\bexplore\s+(?:my\s+|our\s+)?(.{3,90})\s+with\s+me\b/i,
  /\bfocus\s+on\s+(.{3,90})/i,
  /\bi\s+(?:want|would like)\s+(?:you\s+)?to\s+(?:ask|explore)\s+(?:me\s+)?(?:about\s+)?(.{3,90})/i,
];

/** Trailing scaffolding people add to a steer that is not part of the subject. */
const NOT_PART_OF_THE_SUBJECT =
  /\b(instead|please|first|next|as well|too|if you can|if possible|rather than.*)\s*$/i;

/**
 * What they asked us to ask about, or null where they asked for nothing.
 *
 * The phrase comes back in their words: it is used to name the subject back to them, and a
 * paraphrase would mean somebody being told we would ask about something they did not say.
 */
export function whatTheyWantAsked(text: string | null | undefined): string | null {
  const said = (text ?? '').trim();
  if (!said) return null;
  for (const rx of TELLING_US_WHAT_TO_ASK) {
    const m = rx.exec(said);
    if (!m?.[1]) continue;
    const subject = m[1]
      /* One clause. "ask me about distribution, we lost three agents last year" steers to
         distribution; the rest of the sentence is an answer and stays an answer. */
      .split(/[,.;:!?]/)[0]
      .replace(NOT_PART_OF_THE_SUBJECT, '')
      .replace(/^\s*(?:my|our|the)\s+/i, '')
      .trim();
    /* Two characters is not a subject, and "it" is a subject we cannot name back to them. */
    if (subject.length < 3 || /^(it|that|this|them|things?)$/i.test(subject)) continue;
    return subject;
  }
  return null;
}

/** Whether this turn is an instruction about what to ask, whatever else is wrapped around it. */
export function theyAreSteeringUs(text: string | null | undefined): boolean {
  return whatTheyWantAsked(text) !== null;
}

/**
 * A steer, as a subject to cover.
 *
 * Their phrase becomes the subject and the words that show they have covered it, so the coverage
 * machinery that already exists decides when it is done - see the-ground-the-brief-asks-us-to-cover.
 * The id is stable for the same phrase, so saying it twice does not make two subjects.
 */
export function asSomethingToCover(subject: string): { id: string; subject: string; ask: string; words: string[] } {
  const slug = subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);
  return {
    id: `asked-${slug}`,
    subject,
    /* Named back in their words, because the point is that they were followed. */
    ask: `You said you wanted to talk about ${subject}. Tell me about that.`,
    words: subject.split(/\s+/).filter((w) => w.length >= 4),
  };
}

/** What the conversation is told when somebody has asked for something and not had it yet. */
export function followTheirLead(subject: string): string {
  return [
    'THEY HAVE TOLD YOU WHAT TO ASK ABOUT, AND THAT OUTRANKS EVERYTHING ELSE YOU WERE GOING TO ASK.',
    `They asked you to cover: ${subject}.`,
    'Ask about that now, in their words, and keep asking about it until they have said what they want to say. The brief told them they could direct this conversation, so being asked something else instead is the product breaking a promise it made before they typed anything.',
    'If they have already told you about it, say what you took from it and ask them what else they want covered.',
  ].join('\n');
}
