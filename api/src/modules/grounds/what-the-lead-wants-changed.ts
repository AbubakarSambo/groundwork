/**
 * THE CONVERSATION CAN CHANGE WHAT IS THERE, NOT ONLY ADD TO IT.
 *
 * Hafsah, 22 September 2026: "the chat doesnt seem to flow like a conversation to help you with
 * these things." She was right in the most literal way. The chat only ever did one job - work out
 * what was MISSING and ask for it - so a lead looking at a line they disagreed with had nowhere to
 * say so. "Drop the 30-day rule", "the 12m is signed not collected", "Client C is Hassan's", "that
 * one is decided" were all answered with the next gap question.
 *
 * FOUR THINGS SOMEBODY SAYS ABOUT SOMETHING ALREADY ON THE PAGE:
 *
 *   drop     - it should not be there at all. The line is retired, not deleted.
 *   reword   - it is nearly right. The line keeps its place and gets the lead's wording.
 *   assign   - it belongs to somebody. An action with no owner gets one.
 *   settle   - it is done, decided, no longer open. Retired with its history intact.
 *
 * WHAT THIS DOES NOT DO. It never matches by guessing: the thing they named has to be found in what
 * the check-in holds, and where it is not, the chat says so and asks which one. Nothing is written
 * until the lead says yes, the same as everything else this conversation proposes.
 */

export type WhatTheyWant = 'drop' | 'reword' | 'assign' | 'settle';

export interface AChangeHeard {
  intent: WhatTheyWant | 'none';
  /** The thing they named, in their words: enough to find it by. */
  which?: string | null;
  /** For a reword: what it should say instead. */
  newText?: string | null;
  /** For an assign: the person's name as they wrote it. */
  toPerson?: string | null;
}

export const A_CHANGE_PROMPT = `Somebody running a team check-in is talking about something already recorded on it: a target, a rule, a decision, an uncertainty, a note, or a job somebody is down to do.

Work out whether they are asking to CHANGE one of those things, and which one.

drop - they say it should not be there: "drop the 30-day rule", "that is not a rule, take it out", "we never agreed that".
reword - they say it is nearly right and give the better wording: "the 12m is signed revenue, not collected", "call it qualified pipeline, not pipeline".
assign - they say whose it is: "Client C is Hassan's", "give the CRM cleanup to Sarah".
settle - they say it is finished, decided or no longer open: "we decided that, it stays at 12m", "the demo environment is done", "that one is closed".
none - anything else. They are answering a question, adding something new, or thinking out loud.

"which" is the thing they named, in their own words, short enough to find it by - "the 30-day rule", "Client C", "the 12m". Never a paraphrase of the whole sentence. For a reword, "newText" is what it should say, as a plain short line. For an assign, "toPerson" is the name exactly as they wrote it.

Answer none unless they are clearly talking about something that is already recorded. A new rule, a new target or a new job is not a change - that is something to add, and another part of this product does it.`;

export const A_CHANGE_SCHEMA = {
  name: 'emit_what_they_want_changed',
  description: 'Emit whether the lead is asking to change something already recorded, and which thing.',
  input_schema: {
    type: 'object',
    properties: {
      intent: { type: 'string', enum: ['drop', 'reword', 'assign', 'settle', 'none'] },
      which: { type: ['string', 'null'] },
      newText: { type: ['string', 'null'] },
      toPerson: { type: ['string', 'null'] },
    },
    required: ['intent'],
  },
} as const;

/** Anything on a check-in that a lead can change by talking about it. */
export interface AThingOnRecord {
  id: string;
  /** What kind of row it is, for the sentence the proposal says. */
  what: 'line' | 'target' | 'action';
  /** How it reads, for matching and for saying back. */
  text: string;
  /** For a target: its number, which is often how somebody names it. */
  number?: number | null;
  /** For an action: whose it is now, so an assign can say what changes. */
  who?: string | null;
  /**
   * WHICH BUCKET A LINE IS IN, because the word somebody uses for it is often the bucket.
   *
   * "Mark the DECISION about the 30-day rule as settled" and "drop the RULE about 30 days" point at
   * two different rows that share almost every word. Without this, both readings matched both rows
   * and the chat asked which one for a sentence that had already said which one.
   */
  kind?: string | null;
}

/*
 * The words worth matching on: no filler, numbers whatever their length, and a crude stem so "48
 * hour" finds "48 hours". "The 48 hour follow up" matched nothing on its first outing, because "48"
 * was two characters and "the" counted as a word.
 */
const FILLER = new Set(['the', 'and', 'for', 'that', 'this', 'our', 'its', 'with', 'from', 'about', 'one', 'all', 'any', 'was', 'are', 'not']);
const words = (t: string): string[] =>
  (t ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w) && (/\d/.test(w) || w.length > 2))
    .map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));

/* "12m" is how a person says 12,000,000, and "the 12m" is how they name the thing that holds it. */
const asWritten = (n: number | null | undefined): string[] => {
  if (n == null || Math.abs(n) < 1000) return [];
  const out = [String(n), n.toLocaleString('en-GB')];
  if (Math.abs(n) >= 1e6) out.push(`${+(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}m`);
  out.push(`${+(n / 1e3).toFixed(n % 1e3 ? 1 : 0)}k`);
  return out;
};

/**
 * Everything the lead's phrase could be pointing at, best first, or an empty list.
 *
 * Deliberately not "the best guess": where two things match, the chat asks which one. A lead saying
 * "drop the pipeline one" on a check-in with two pipeline rows should be asked, not surprised.
 */
/* The word a person uses for a row is usually its bucket: "the rule", "that decision", "the target". */
const A_WORD_FOR_A_KIND: { word: RegExp; kinds: string[] }[] = [
  { word: /\brules?\b|\bpractices?\b/i, kinds: ['WAY_OF_WORKING'] },
  { word: /\bdecisions?\b|\bto decide\b/i, kinds: ['DECISION'] },
  { word: /\btargets?\b|\bnumbers?\b/i, kinds: ['target'] },
  { word: /\bstrategy\b/i, kinds: ['STRATEGY'] },
  { word: /\bnotes?\b/i, kinds: ['NOTE'] },
  { word: /\bunsettled\b|\bnot settled\b/i, kinds: ['UNSETTLED'] },
  { word: /\bjobs?\b|\bactions?\b|\btasks?\b|\bto dos?\b/i, kinds: ['action'] },
];

/**
 * @param said the phrase naming the thing, as the read pulled it out: "the 30-day rule".
 * @param things everything on the check-in a lead can change.
 * @param inTheirSentence their whole sentence, where the caller has it. Used ONLY for the bucket word
 *   they chose - the extracted phrase is short and drops it, so "mark the DECISION about the 30-day
 *   rule" arrived here as "the 30-day rule" and matched the rule and the decision equally.
 */
export function whatTheyMeant(said: string | null | undefined, things: AThingOnRecord[], inTheirSentence?: string | null): AThingOnRecord[] {
  const phrase = (said ?? '').trim().toLowerCase();
  if (!phrase) return [];
  /*
   * The bucket word is how they said WHICH KIND, not part of the thing's name: "the margin target"
   * is the row called "margin". Left in, it counted against a one-word row and matched nothing.
   */
  const BUCKET_WORDS = /\b(rules?|practices?|decisions?|targets?|numbers?|strategy|notes?|jobs?|actions?|tasks?|lines?|things?)\b/gi;
  const asked = words(phrase.replace(BUCKET_WORDS, ' '));
  if (!asked.length) return [];
  /*
   * The bucket they named, where they named one - and the FIRST one they named, because that is the
   * thing and anything after it is the qualifier. "Mark the decision about the 30-day rule as
   * settled" names two buckets and means the decision; taking both left it ambiguous.
   */
  const forTheKind = `${(inTheirSentence ?? '').trim().toLowerCase()} ${phrase}`.trim();
  const kindsMeant = A_WORD_FOR_A_KIND
    .map((k) => ({ ...k, at: forTheKind.search(k.word) }))
    .filter((k) => k.at >= 0)
    .sort((a, b) => a.at - b.at)
    .slice(0, 1)
    .flatMap((k) => k.kinds);
  const scored: { thing: AThingOnRecord; score: number }[] = [];
  for (const t of things ?? []) {
    const mine = words(t.text);
    if (!mine.length) continue;
    const shared = asked.filter((w) => mine.includes(w)).length;
    const byNumber = asWritten(t.number).some((f) => new RegExp(`(?:^|[^a-z0-9.,])${f}(?:$|[^a-z0-9])`, 'i').test(phrase));
    /* Every word of a short phrase inside the row is a strong match: "the 30-day rule". */
    const whole = asked.length <= 6 && asked.every((w) => mine.includes(w));
    /*
     * AND A ROW THAT HOLDS ALMOST EVERYTHING THEY SAID IS THE ROW THEY QUOTED.
     *
     * Read live: "drop the line that says an opportunity is dead after 30 days with no reply" was
     * answered with "which one?", because a decision line about the same rule shared four words. A
     * near-quotation is not an ambiguity.
     */
    const quoted = mine.length >= 3 && shared >= Math.ceil(mine.length * 0.8);
    /* A bucket match is never a match on its own: "the 30-day rule" must not reach every rule on the
       check-in because the sentence said the word "rule". */
    if (!shared && !byNumber && !whole && !quoted) continue;
    const score = (whole ? 10 : 0) + (quoted ? 12 : 0) + (byNumber ? 6 : 0) + shared;
    if (score >= 2) scored.push({ thing: t, score });
  }
  /*
   * THE BUCKET THEY NAMED IS A FILTER, NOT A BONUS.
   *
   * "Drop the rule about opportunities being dead after 30 days" reaches this as the phrase "the
   * 30-day rule", which is in the rule AND in the decision about the rule - and scoring the two
   * left them a point apart, so the chat asked about a sentence that had already said "rule". They
   * named a bucket: a row in another bucket is not what they meant. Only where at least one
   * candidate is of that bucket, so a wrong guess about the word cannot empty the list.
   */
  const ofTheirKind = kindsMeant.length
    ? scored.filter((s) => kindsMeant.includes(s.thing.kind ?? s.thing.what))
    : [];
  const best = (ofTheirKind.length ? ofTheirKind : scored).sort((a, b) => b.score - a.score);
  /* Clearly ahead is not a tie. Asking "which one?" about a sentence that named one is the failure. */
  if (best.length > 1 && best[0].score - best[1].score >= 4) return [best[0].thing];
  return best.map((s) => s.thing);
}

/** The sentence the chat says before anything is written. */
export function whatWillChange(intent: WhatTheyWant, thing: AThingOnRecord, opts?: { newText?: string | null; toPerson?: string | null }): string {
  const it = `"${thing.text.trim()}"`;
  switch (intent) {
    case 'drop':
      return `I will take ${it} off the check-in. It stays on the record as something that was there, and nothing will read against it. Do that?`;
    case 'settle':
      return `I will mark ${it} as settled, so it stops being an open one. Do that?`;
    case 'assign':
      return `I will put ${it} down as ${opts?.toPerson ?? 'theirs'}${thing.who ? `, instead of ${thing.who}` : ''}. Do that?`;
    case 'reword':
      return `I will change ${it} to "${(opts?.newText ?? '').trim()}". Do that?`;
  }
}

/**
 * What the chat says when the thing they named is not on the check-in, or is more than one thing.
 *
 * ONE LINE, NUMBERED. The first version was a bulleted list, and the boundary the reply goes through
 * flattens markdown - so a lead read "Which one? Whether the 30-day rule is official. An opportunity
 * is dead after 30 days with no reply." as one run-on sentence and could not tell where one option
 * ended and the next began.
 */
export function whichOneDoYouMean(said: string, options: AThingOnRecord[]): string {
  if (!options.length) {
    return `I cannot find "${said.trim()}" on this check-in. Say it the way it reads on the page and I will change it.`;
  }
  const numbered = options.slice(0, 4).map((o, i) => `(${i + 1}) ${o.text.trim().replace(/[.]+$/, '')}`).join('; ');
  return `Two things could be that: ${numbered}. Which one?`;
}

/**
 * AND WHAT CHANGED, AFTERWARDS, IN THE PAST TENSE.
 *
 * The receipt was the proposal with "Done." in front of it: "Done. I will put the Client C call down
 * as Hassan.." - the wrong tense, somebody's question mark turned into a full stop, and two of them.
 * A confirmation says what happened.
 */
/**
 * WHETHER A CHANGE READING WINS THE TURN OVER A QUESTION THAT IS STILL OPEN.
 *
 * FIX 2, 30 September 2026, driven live: a lead was asked what they had seen of Ben, and answered
 * "He has missed the last two pipeline updates. I spoke to him once. I want the update in by every
 * Friday." - an answer to the open `objectives` question, naming an expectation. The change reader
 * read "I want the update..." as an attempt to change something called "the update", found nothing
 * that matches, and answered "I cannot find 'the update' on this check-in" - swallowing the whole
 * turn before the open gap's own extraction ever ran.
 *
 * "Drop the 30-day rule" still has to win under an open gap - item 7's own rule, that a change is
 * answered whatever question was underneath it - but that case is CONFIDENT: `apply` is set because
 * exactly one thing on the record matched. What this refuses is only the AMBIGUOUS case - `apply` is
 * null because nothing or more than one thing matched - while a gap is open that this message could
 * still be answering instead. With nothing open, the ambiguous "which one do you mean" is still the
 * right reply, because there is no competing question this message could be an answer to.
 */
export function changeAnswersThisTurn(wants: { apply: unknown } | null, openGap: string | null): boolean {
  return !!wants && (!!wants.apply || !openGap);
}

export function whatChanged(change: { intent: WhatTheyWant; thing: AThingOnRecord; newText?: string | null; toPerson?: string | null }): string {
  const it = `"${change.thing.text.trim().replace(/[.]+$/, '')}"`;
  switch (change.intent) {
    case 'drop':
      return `${it} is off the check-in. It stays on the record as something that was there, and nothing reads against it now.`;
    case 'settle':
      return `${it} is settled. It is no longer one of the open ones.`;
    case 'assign':
      return `${it} is ${change.toPerson ?? 'theirs'} now, and it comes up in their next check-in.`;
    case 'reword':
      return `That line now reads "${(change.newText ?? '').trim().replace(/[.]+$/, '')}".`;
  }
}
