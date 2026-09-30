/**
 * A QUESTION THE LEAD WANTS PUT TO SOMEBODY IS ASKED WORD FOR WORD, AND ONLY ONCE THEY HAVE READ IT.
 *
 * Decision 34, Hafsah, 28 September 2026: "A question the lead wants asked of a person may reach that
 * person's session. Before it goes, the lead sees the exact question as Groundwork will ask it, and
 * confirms it, as decision 12 says."
 *
 * Until now there was no exact question to see. The paste gave the lead's own shorthand ("Amina -
 * which accounts actually have a buying process?"), the lead said one yes to the whole list, and the
 * session was told to "ask them in your own words" - so what Amina was actually asked was written by
 * the model, live, and nobody had read it before she did.
 *
 * SO THE PRODUCT WRITES THE QUESTION ONCE, AND THE LEAD CONFIRMS THAT SENTENCE. A model drafts it -
 * a template cannot turn "ask her whether she has sent the Client B proposal" into "Have you sent the
 * Client B proposal?" - but the draft is only ever a proposal. It is checked here in code, it falls
 * back to the lead's own words where it fails, and it reaches nobody until the lead has confirmed it,
 * changed it, or left it out, one question at a time. Their change becomes the question.
 *
 * AND THE SESSION ASKS THAT SENTENCE, NOT ITS OWN VERSION OF IT. The model is given the sentence as a
 * fixed line and decides only when it fits. Where its reply puts the question in other words, the
 * product puts the confirmed sentence back - the same shape as the document citation, where four
 * attempts at instructing the model lost to moving the words into code.
 *
 * THE DRAFTER IS NEVER GIVEN ANYTHING PRIVATE. It reads the person's first name and the lead's
 * question, and nothing else: not the lead's description of the person (decision 30), not the lead's
 * notes about them (decision 32). The check below is the second wall, not the first.
 */

/** How the question reads to the lead before they confirm it. The one sentence they are saying yes to. */
export const whatGroundworkWillAsk = (who: string, exactQuestion: string): string =>
  `Groundwork will ask ${who}: "${exactQuestion}"`;

/** Said under the list the lead is shown, so one yes to a paste is never read as a yes to these. */
export const NONE_IS_ASKED_UNTIL_YOU_CONFIRM_IT =
  'None of these questions is asked until you confirm it. You confirm, change or leave out each one on its own.';

export const THIS_ONE_IS_NOT_ASKED_UNTIL_YOU_CONFIRM_IT =
  'This question is not asked until you confirm it. You can confirm it, change it or leave it out.';

/** For a question written before 28 September, which nobody has confirmed. */
export const WRITTEN_BEFORE_YOU_CONFIRMED_EACH_ONE =
  'You wrote this question before Groundwork asked you to confirm each one. It has not been asked. Confirm it, change it, or leave it out.';

export const THE_EXACT_QUESTION_PROMPT = (name: string): string => `Somebody running a team check-in wants one question put to ${name} in ${name}'s own check-in. Write that question exactly as it will be asked, to ${name}.

- One plain, full sentence that ends with a question mark. Short everyday words that somebody with basic English understands.
- Speak to ${name} as "you". Never use ${name}'s name, and never "he", "she" or "they" for ${name}.
- Keep what the question asks, and only that. Do not add a reason, a second question, or anything the question does not say.
- Never say who wants it asked, and never say that anybody asked for it, unless the question as written says so itself.
- No label on a person and no judgement of them. Ask about the work.
- No work jargon, no colons, no lists.`;

export const THE_EXACT_QUESTION_TOOL = {
  name: 'the_question_as_asked',
  description: 'The question exactly as it will be asked, word for word.',
  input_schema: {
    type: 'object',
    properties: { question: { type: 'string', description: 'One plain full sentence, to the person, ending in a question mark.' } },
    required: ['question'],
  },
};

const squash = (t: string | null | undefined): string => (t ?? '').replace(/\s+/g, ' ').trim();

/** Words in lower case, with the punctuation off, for matching one text against another. */
const wordsOf = (t: string | null | undefined): string[] =>
  squash(t).toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').split(' ').filter(Boolean);

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'is', 'are', 'was', 'were', 'be', 'you', 'your', 'do', 'did', 'does', 'have', 'has', 'had', 'what', 'which', 'who', 'how', 'why', 'when', 'where', 'whether', 'if', 'it', 'that', 'this', 'with', 'at', 'by', 'from', 'can', 'could', 'would', 'will', 'there', 'any', 'about', 'yet', 'so', 'i', 'me', 'my', 'we', 'our']);
const contentWords = (t: string | null | undefined): string[] => wordsOf(t).filter((w) => w.length > 2 && !STOP.has(w));

/**
 * THE LEAD'S OWN QUESTION, MADE A SENTENCE, WHERE THE DRAFT CANNOT BE USED.
 *
 * Nothing is reworded here: the lead's words stay the lead's. The only things taken off are the
 * handle that says who it is for ("Amina -", "Ask Amina:"), which the lead is already shown beside
 * it, and the only things added are a capital letter and a question mark.
 */
export function plainQuestionFrom(leadQuestion: string | null | undefined, name?: string | null): string {
  let q = squash(leadQuestion);
  const first = squash(name).split(' ')[0];
  if (first) {
    const n = first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    q = q.replace(new RegExp(`^(?:please\\s+)?(?:ask\\s+)?${n}\\s*(?:[-:,–]\\s*)`, 'i'), '');
  }
  q = q.replace(/^(?:please\s+)?ask\s+(?:them|him|her)\s*[-:,]\s*/i, '').trim();
  if (!q) return '';
  q = q.charAt(0).toUpperCase() + q.slice(1);
  return /[?]$/.test(q) ? q : `${q.replace(/[.!;,]+$/, '')}?`;
}

/* Saying who wants it asked turns a question into a message from the lead, which it is not. */
const SAYS_WHO_WANTS_IT = /\b(your (?:lead|manager|boss|supervisor)|the lead|the person (?:running|who runs)|(?:wants|asked) (?:me )?to (?:know|ask)|asked me|i was asked|someone wants|somebody wants|they want to know)\b/i;
/* The labels this product never puts on a person. See "a verdict, told like a signal". */
const A_LABEL = /\b(pip|performance improvement plan|at risk|flight risk|underperform\w*|low performer|poor performer|not good enough|lazy|exit(?:ed|ing)?|fired|let go)\b/i;
const A_THIRD_PERSON = /\b(he|she|his|him|her|hers)\b/i;

/**
 * Why a draft may not stand, or null where it may. Every test is on the text itself.
 *
 * `privateWords` are the lead's own description of this person and their notes about them. The
 * drafter never reads them; this is here so that a draft which somehow carries three words in a row
 * from them is refused anyway, unless those words are in the lead's question too - in which case the
 * lead wrote them into the question themselves, and it is theirs to confirm or change.
 */
export function whyTheDraftDoesNotHold(
  draft: string | null | undefined,
  ctx: { leadQuestion: string; name?: string | null; privateWords?: (string | null | undefined)[] },
): string | null {
  const d = squash(draft);
  if (!d) return 'it is empty';
  if (d.length > 300) return 'it is too long to be one question';
  if (!d.endsWith('?')) return 'it is not a question';
  if ((d.match(/\?/g) ?? []).length > 1) return 'it is more than one question';
  if (/[:;•]|\s-\s|\n/.test(d)) return 'it is pieces, not a sentence';
  const lead = squash(ctx.leadQuestion);
  if (SAYS_WHO_WANTS_IT.test(d) && !SAYS_WHO_WANTS_IT.test(lead)) return 'it says who wants it asked';
  if (A_LABEL.test(d) && !A_LABEL.test(lead)) return 'it puts a label on a person';
  const first = squash(ctx.name).split(' ')[0];
  if (first && first.length >= 2 && wordsOf(d).includes(first.toLowerCase())) return 'it talks about them rather than to them';
  if (A_THIRD_PERSON.test(d) && A_THIRD_PERSON.test(lead)) return 'it talks about them rather than to them';
  /* Every word of the question has to have come from somewhere the lead wrote, or be an ordinary word. */
  const leadWords = new Set(wordsOf(lead));
  const draftWords = wordsOf(d);
  for (const text of ctx.privateWords ?? []) {
    const w = wordsOf(text);
    for (let i = 0; i + 3 <= w.length; i++) {
      const run = w.slice(i, i + 3);
      if (run.every((x) => STOP.has(x))) continue;
      if (run.every((x) => leadWords.has(x))) continue;
      const at = draftWords.findIndex((_, j) => run.every((x, k) => draftWords[j + k] === x));
      if (at >= 0) return 'it carries words from your private notes';
    }
  }
  /* And it still asks what the lead asked: most of their words that carry meaning are in it. */
  const theirs = contentWords(lead);
  if (theirs.length >= 2) {
    const kept = theirs.filter((w) => draftWords.some((x) => x === w || (x.length > 4 && w.length > 4 && x.slice(0, 5) === w.slice(0, 5)))).length;
    if (kept / theirs.length < 0.5) return 'it asks something other than what you asked';
  }
  return null;
}

const A_DIRECT_QUESTION = /^(?:what|which|who|whom|whose|how|why|when|where|have|has|had|do|does|did|is|are|was|were|can|could|will|would|should|shall|may|might)\b/i;
const STARTS_WITH_AN_INSTRUCTION = /^(?:please\s+)?(?:ask|tell|find out|check|see|get|let me know)\b/i;

/**
 * THE LEAD'S OWN WORDS, WHERE SHE WROTE THE QUESTION TO THE PERSON (request 92, point 9).
 *
 * "Have the Kilimani shops paid their deposits yet?" was kept as "Do you know if the Kilimani shops
 * have paid their deposits yet?": the drafter tidied a question that was already a question, and the
 * lead was shown words she had not written. When the paste holds the question as a plain, direct
 * question with no name, no "he" or "she" and no instruction in front of it, it is already asked of
 * the person, so her words are kept exactly as she typed them. Only the handle saying who it is for
 * and a capital letter are touched, as `plainQuestionFrom` does. Anything else is left to the drafter.
 *
 * The question is found in what she pasted by the words it shares with the question the paste was
 * read as, so it is her own sentence and never one put together from the reading.
 */
export function theLeadsOwnQuestionIfAddressedToThem(
  pasted: string | null | undefined,
  readAs: string | null | undefined,
  ctx: { name?: string | null; privateWords?: (string | null | undefined)[] },
): string | null {
  const wanted = contentWords(readAs);
  if (!wanted.length) return null;
  const segments = [...(pasted ?? '').matchAll(/[^.!?\n]*\?/g)].map((m) => m[0].replace(/^[\s\-\u2022*"\u201C\u2018']+/, '').replace(/["\u201D\u2019']+$/, '').trim());
  let best: { text: string; score: number } | null = null;
  for (const seg of segments) {
    const words = contentWords(seg);
    if (!words.length) continue;
    const shared = wanted.filter((w) => words.some((x) => x === w || (x.length > 4 && w.length > 4 && x.slice(0, 5) === w.slice(0, 5)))).length;
    const score = shared / wanted.length;
    if (score >= 0.6 && (!best || score > best.score)) best = { text: seg, score };
  }
  if (!best) return null;
  const candidate = plainQuestionFrom(best.text, ctx.name);
  if (!candidate || STARTS_WITH_AN_INSTRUCTION.test(candidate) || !A_DIRECT_QUESTION.test(candidate)) return null;
  return whyTheDraftDoesNotHold(candidate, { leadQuestion: candidate, name: ctx.name, privateWords: ctx.privateWords }) === null ? candidate : null;
}

/** The draft where it holds, and the lead's own question made a sentence where it does not. */
export function theExactQuestion(
  draft: string | null | undefined,
  ctx: { leadQuestion: string; name?: string | null; privateWords?: (string | null | undefined)[] },
): { exactQuestion: string; fromTheDraft: boolean } {
  const why = whyTheDraftDoesNotHold(draft, ctx);
  if (!why) return { exactQuestion: squash(draft), fromTheDraft: true };
  return { exactQuestion: plainQuestionFrom(ctx.leadQuestion, ctx.name), fromTheDraft: false };
}

/*
 * ------------------------------------------------------------------------------------------------
 * IN THE PERSON'S OWN SESSION.
 * ------------------------------------------------------------------------------------------------
 */

const forMatching = (t: string | null | undefined): string => wordsOf(t).join(' ');

/** Whether this text asks the confirmed question word for word. Case and punctuation aside. */
export function asksItWordForWord(text: string | null | undefined, exactQuestion: string): boolean {
  const q = forMatching(exactQuestion);
  return !!q && ` ${forMatching(text)} `.includes(` ${q} `);
}

/** Whether any earlier turn of this check-in already asked it, so it is never asked twice. */
export const alreadyAsked = (earlierTurns: (string | null | undefined)[], exactQuestion: string): boolean =>
  (earlierTurns ?? []).some((t) => asksItWordForWord(t, exactQuestion));

/**
 * THE REPLY WITH THE CONFIRMED SENTENCE IN IT, WHERE THE MODEL PUT THE QUESTION IN OTHER WORDS.
 *
 * A question sentence in the reply that shares most of the meaning-carrying words of the confirmed
 * one is the model asking it its own way. That sentence is replaced with the confirmed one, whole.
 * Where no sentence is that close, the model has not asked it this turn, which is its call - it
 * decides when - and the reply is left alone.
 */
export function withTheQuestionAsConfirmed(
  reply: string,
  exactQuestion: string,
): { text: string; asked: boolean; putBack: boolean } {
  const text = reply ?? '';
  if (!exactQuestion?.trim()) return { text, asked: false, putBack: false };
  if (asksItWordForWord(text, exactQuestion)) return { text, asked: true, putBack: false };
  const theirs = contentWords(exactQuestion);
  if (!theirs.length) return { text, asked: false, putBack: false };
  /* Sentences ending in a question mark, found in place so the rest of the reply is untouched. */
  const sentences = [...text.matchAll(/[^.!?\n]*\?/g)];
  let best: { at: number; len: number; score: number } | null = null;
  for (const m of sentences) {
    const s = m[0];
    const words = contentWords(s);
    if (!words.length) continue;
    const shared = theirs.filter((w) => words.some((x) => x === w || (x.length > 4 && w.length > 4 && x.slice(0, 5) === w.slice(0, 5)))).length;
    const score = shared / theirs.length;
    if (score >= 0.6 && (!best || score > best.score)) best = { at: m.index ?? 0, len: s.length, score };
  }
  if (!best) return { text, asked: false, putBack: false };
  const before = text.slice(0, best.at);
  const lead = before.length && !/\s$/.test(before) ? ' ' : '';
  const out = `${before}${lead}${exactQuestion.trim()}${text.slice(best.at + best.len)}`.replace(/[ \t]{2,}/g, ' ');
  return { text: out, asked: true, putBack: true };
}

/**
 * A question whose words the lead changed somewhere other than its own card - the Context page, or
 * "reword that one" in the chat. It goes back to waiting, with their new words made a sentence as
 * the proposal, because a yes to the old sentence is not a yes to the new one.
 */
export const aQuestionReworded = (text: string): { exactQuestion: string | null; questionConfirmedAt: null } => ({
  exactQuestion: plainQuestionFrom(text) || null,
  questionConfirmedAt: null,
});

/** One question as the lead's card shows it. */
export interface AQuestionForAPerson {
  id: string;
  participantId: string | null;
  who: string;
  /** The sentence Groundwork will ask, word for word. */
  exactQuestion: string;
  /** "Groundwork will ask Ngozi: "…"", the line the card leads with. */
  says: string;
  status: 'waiting' | 'confirmed';
  confirmedAt: string | null;
  /** True for a line kept before 28 September, which had no exact sentence until now. */
  writtenBeforeConfirming: boolean;
  /** The sentence to show under it where it was written before, or an admin confirmed it in the
   *  lead's place (decision 63), or both, one under the other; null when neither applies. */
  note: string | null;
  /** DECISION 63: set only when an admin confirmed or declined this in the lead's place, because the
   *  lead had left the organisation - the plain sentence naming them. Null when the lead did it. */
  confirmedByAdminNote: string | null;
}

/** The card for one stored line. An older line with no sentence is shown its words made a sentence. */
export function aQuestionAsTheLeadReadsIt(
  line: { id: string; text: string; aboutParticipantId?: string | null; exactQuestion?: string | null; questionConfirmedAt?: Date | string | null; confirmedByAdminNote?: string | null },
  who: string,
): AQuestionForAPerson {
  const stored = (line.exactQuestion ?? '').trim();
  const exactQuestion = stored || plainQuestionFrom(line.text, who);
  const confirmed = !!(stored && line.questionConfirmedAt);
  const confirmedByAdminNote = (line.confirmedByAdminNote ?? '').trim() || null;
  const writtenBeforeNote = stored ? null : WRITTEN_BEFORE_YOU_CONFIRMED_EACH_ONE;
  return {
    id: line.id,
    participantId: line.aboutParticipantId ?? null,
    who,
    exactQuestion,
    says: whatGroundworkWillAsk(who, exactQuestion),
    status: confirmed ? 'confirmed' : 'waiting',
    confirmedAt: confirmed ? new Date(line.questionConfirmedAt as any).toISOString() : null,
    writtenBeforeConfirming: !stored,
    note: [writtenBeforeNote, confirmedByAdminNote].filter(Boolean).join(' ') || null,
    confirmedByAdminNote,
  };
}
