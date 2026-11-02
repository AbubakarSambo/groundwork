/**
 * WHAT HAPPENED TO WHAT THEY SAID THEY WOULD DO (week 9 of docs/weekly-plan.md).
 *
 * The next check-in already puts each open commitment to the person: "Ask what happened... Where
 * they say it is done, ask what shows it" (what-the-context-already-holds, whatTheySaidTheyWouldDo).
 * Nothing wrote the answer back, so a commitment stayed UNKNOWN until somebody pressed a button, and
 * "kept 11 of 20" could never be counted. This reads the person's own words from the check-in
 * against the commitments that were open when it started, and settles only what they plainly said:
 *
 *   DONE      they said they did it, in their own words, in the past tense (checked in code).
 *   NOT_DONE  they said they did not do it, and gave no new time for it.
 *
 * Everything else stays open. A new date, "still working on it", "partly" and silence are not a
 * miss: GroundCommitment's own rule is that a promise that moved is a different thing from one that
 * was missed, and reading the second as the first is the unfairest mistake this product could make.
 * A commitment a person settled by hand is never touched, and nothing is settled from anybody's
 * words but their own.
 */

export type ASettlement = 'DONE' | 'NOT_DONE';

export const READ_WHAT_HAPPENED = [
  'You are given the things one person said, in an earlier check-in, that they would do, numbered. Then you are given everything that person said in this check-in, in their own words.',
  '',
  'For each numbered thing, say what THEY said happened to it in this check-in:',
  '  - "DONE" only when they plainly said it already happened, in the past tense ("I sent it on Tuesday", "that is done", "they placed the order yesterday"). For DONE, also give "words": their own words that say it happened, copied exactly from what they said.',
  '  - "NOT_DONE" only when they plainly said they did not do it. They also gave no new time for it. For example: "I did not get to it", "I never called her".',
  '  - "OPEN" for everything else: they did not mention it, they gave a new date or time, they said it is in progress or partly done, or you are not sure.',
  '',
  'RULES:',
  '  - Use only this person\'s own words. Never decide from what somebody else did or what the interviewer said.',
  '  - Some answers come with the question they answered, in brackets before them. The question only tells you what a short answer is about ("I have not done anything further" after a question about following up is about the follow-up). Decide from their answer, never from the question.',
  '  - A new date or a new plan for the same thing is OPEN, never NOT_DONE.',
  '  - A plan, a promise, an expectation, or something they say will count when it happens is OPEN, never DONE: it has not happened yet. For example, "Donholm placing a 100-bag order this week counts as a new account" is OPEN until they say the order came.',
  '  - When in doubt, OPEN.',
].join('\n');

/* The read's own schema is gone: these rules are part of the conversation's assessment now (the-assessment.ts), which is given the open promises by id. */

/** One thing they said, with the question it answered where there was one. */
export type AnAnswer = string | { asked?: string | null; said: string };


/**
 * THE SAME COMMITMENT, WRITTEN TWICE. Ngozi's "I will follow up with Mr. Adebayo again" and "I will
 * follow up with Mr. Adebayo again by tomorrow." were two rows, both with "by tomorrow" as their
 * time, so her You board listed the one promise twice. The key is the words without their time,
 * their case or their punctuation.
 */
export function aCommitmentKey(text: string, whenSaid?: string | null): string {
  let t = String(text ?? '').toLowerCase().replace(/[’']/g, "'").replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();
  const when = String(whenSaid ?? '').toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();
  if (when && t.endsWith(` ${when}`)) t = t.slice(0, -when.length).trim();
  return t;
}

/** One of each commitment, the first written kept. */
export function oneOfEach<T extends { text?: string | null; whenSaid?: string | null }>(rows: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const k = aCommitmentKey(r.text ?? '', r.whenSaid);
    if (k && seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

/**
 * A PROMISE IS DONE ONLY WHEN THEY SAY IT HAPPENED (change 3, final evaluation problem 5). The model's
 * DONE is not enough: "Donholm Distributors placing a 100-bag order this week counts as a new account"
 * was a plan, and was kept as done. A DONE stands only when the words it gives are the person's own
 * (found in one of their answers, never in a question put to them), say it already happened (a past
 * tense or "done"), and are not a plan, a hope, a "will" or a "not yet". Anything else stays open, in
 * their words, to be asked about again. Nothing is removed or hidden.
 */
const norm = (t: string) => String(t ?? '').toLowerCase().replace(/[’‘]/g, "'").replace(/[“”"]/g, '').replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();
const NOT_YET = /\b(will|shall|'ll|going to|gonna|plan|plans|planning|intend|intends|expect|expects|expecting|hope|hopes|hoping|should|would|could|might|need|needs|want|wants|trying|about to|counts as|count as|soon|tomorrow|next week|still|yet|waiting|not|no|never|nothing)\b|n't\b/;
const HAPPENED = /\b(done|did|finished|completed|complete|sent|got|made|met|paid|won|went|gave|took|already)\b|\b(has|have|had) been\b|\b\p{L}{2,}ed\b/u;
export function itHappenedInTheirWords(words: unknown, said: readonly AnAnswer[], promised?: string | null): boolean {
  const w = norm(typeof words === 'string' ? words : '');
  if (w.split(' ').length < 2) return false;
  const theirs = said.map((a) => norm(typeof a === 'string' ? a : a.said));
  const at = theirs.findIndex((t) => ` ${t} `.includes(` ${w} `));
  if (at === -1) return false;
  if (NOT_YET.test(w)) return false;
  if (!HAPPENED.test(w)) return false;
  /* The sentence their words sit in, as they said it: "Last week I did nine, maybe ten" is not done even when only "I did nine" is quoted. */
  const raw = said[at];
  const answer = typeof raw === 'string' ? raw : raw.said;
  const sentence = norm(answer.split(/(?<=[.!?])\s+/).find((x) => ` ${norm(x)} `.includes(` ${w} `)) ?? answer);
  if (HEDGED.test(sentence)) return false;
  /* Taken back later in the same check-in: "Honestly eleven was rounding up, it is lower, maybe four or five." */
  if (theirs.slice(at + 1).some((t) => TAKEN_BACK.test(t))) return false;
  if (TAKEN_BACK.test(norm(answer.slice(answer.toLowerCase().indexOf(w.split(' ')[0]))))) return false;
  /* Fewer than they promised: "twelve kits" is not kept by "I did eleven". */
  const owed = theNumbersIn(promised ?? '');
  const did = theNumbersIn(sentence);
  if (owed.length && did.length && Math.max(...did) < Math.max(...owed)) return false;
  return true;
}

/*
 * A STATUS IS FILLED IN FROM WHAT IS CONFIRMED, NEVER FROM A GUESS (Hafsah, 12 October, after night quality run 2). Collins's "Do ten kits"
 * and "twelve kits" were written as kept from "Last week I did nine, maybe ten" and "I did eleven ... It was only the rain that stopped the
 * twelfth", which he took back two answers later ("Honestly eleven was rounding up, it is lower, maybe four or five"). A hedged number, a
 * number below the one promised, or words taken back later in the same check-in leave the promise open.
 */
const HEDGED = /\b(?:about|around) (?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty)\b|\b(maybe|perhaps|probably|roughly|nearly|almost|approximately|or so|more or less|i think|i guess|in principle|as good as|basically|kind of|sort of)\b/;
const TAKEN_BACK = /\b(rounding up|rounded up|round it up|it is lower|it was lower|it's lower|lower than that|less than that|not really|not quite|exaggerat\w*|overstat\w*|i was wrong)\b/;
const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
};
/** The counts a sentence says: "twelve kits" is 12, "nine, maybe ten" is 9 and 10. A year or a time of day is not a count. */
function theNumbersIn(text: string): number[] {
  const out: number[] = [];
  for (const t of norm(text).split(' ')) {
    if (t in NUMBER_WORDS) out.push(NUMBER_WORDS[t]);
    else if (/^\d{1,4}$/.test(t) && !/^(?:19|20)\d\d$/.test(t)) out.push(Number(t));
  }
  return out;
}

/**
 * The settlements to write: only rows that were open and put to them, only DONE or NOT_DONE, one
 * each, in the model's numbering (from 1). Anything else is dropped. A DONE is kept only when their
 * own words say it happened (itHappenedInTheirWords); otherwise the promise stays open.
 */
export function theSettlements<T extends { id: string; status: string; text?: string | null }>(
  open: readonly T[],
  outcomes: readonly { item?: unknown; happened?: unknown; words?: unknown }[] | null | undefined,
  said: readonly AnAnswer[],
): { id: string; status: ASettlement }[] {
  const out = new Map<string, ASettlement>();
  for (const o of outcomes ?? []) {
    const n = typeof o?.item === 'number' && Number.isInteger(o.item) ? o.item : NaN;
    const row = open[n - 1];
    if (!row || row.status !== 'UNKNOWN' || out.has(row.id)) continue;
    if (o.happened === 'DONE' && !itHappenedInTheirWords(o.words, said, row.text)) continue;
    if (o.happened === 'DONE' || o.happened === 'NOT_DONE') out.set(row.id, o.happened);
  }
  return [...out].map(([id, status]) => ({ id, status }));
}

/*
 * WHAT ONE OF THEIR OWN LINES IS CALLED, FROM THE RECORD (night quality run 2). Collins's report marked "Last week I did nine, maybe ten,
 * so I know it works." and "Mama Akinyi says they are happy, they just want to see the kit working at a neighbour's house first." as
 * "This is something you got done." A line read as progress is called done only when proof or a colleague backs it, or when it is their
 * own words saying, in the past tense and without a hedge, that it happened. Otherwise it is called what it is: what they said happened.
 */
export const A_LINE_DONE_SAYS = 'This is something you got done.';
export const A_LINE_SAID_TO_HAVE_HAPPENED_SAYS = 'This is what you said happened. It is not counted as done until something shows it.';
/** "Mama Akinyi says they are happy": somebody else's word, passed on. */
const PASSED_ON = /\b(?:says?|said|told me|tells me|according to)\b/;
export function whatALineOfTheirsIsCalled(line: { type?: string | null; text?: string | null; mark?: string | null }): string | null {
  if (String(line.type ?? '') !== 'PROGRESS') return null;
  if (line.mark === 'proven' || line.mark === 'confirmed') return A_LINE_DONE_SAYS;
  const text = String(line.text ?? '');
  if (PASSED_ON.test(norm(text))) return A_LINE_SAID_TO_HAVE_HAPPENED_SAYS;
  return itHappenedInTheirWords(text, [text]) ? A_LINE_DONE_SAYS : A_LINE_SAID_TO_HAVE_HAPPENED_SAYS;
}
