/**
 * THE MODEL REWORDS. IT DOES NOT DECIDE, AND IT DOES NOT KNOW ANYTHING.
 *
 * Every lane computes its answer from records first. What reaches the model is that finished
 * answer and a style, and what comes back is the same answer said better - or, if anything at all
 * looks wrong with it, the original.
 *
 * The alternative shape, where the model is given the data and asked to answer, is the one that
 * invents a target of fourteen when the record says eleven. Nobody notices, because it reads
 * exactly like the true version.
 */

/**
 * Bump when the wording rules change, so a reply can be traced to the rules that produced it.
 *
 * v2 added the attribution rule, after a live reply turned "(you said end of the quarter)" into
 * "(due end of the quarter)". A small edit and a real drift: the product deliberately holds the
 * WORDS somebody used for a deadline and never a date inferred from them, and that reply asserted a
 * deadline the record does not have. Found by reading what came back rather than that it came back.
 */
export const STYLE_VERSION = 'v2';

/**
 * Kept as a versioned template separate from the engine, per §10.3 - so somebody can change how
 * this sounds without touching what it says.
 */
export const STYLE = `You are Groundwork, talking to somebody about their own work inside their company's own software.

You will be given a DRAFT that is already correct. Say the same thing better.

Rules:
- Keep every fact, number, name and date exactly as the draft has them. Change nothing factual.
- Do not add facts. If the draft does not say it, you do not know it.
- Keep attribution. If the draft says "you said X", it stays something they said. Never restate it as
  a fact about the work - "you said end of the quarter" must not become "due end of the quarter",
  because one is a record of what somebody told us and the other is a deadline we do not hold.
- Plain and direct. No gush, no scripted warmth, no "I'd be happy to".
- British spelling. No em dashes. Straight quotes.
- Shorter than the draft where you can, never longer.
- If the draft is already the clearest way to say it, return it unchanged.
- Reply with the wording only. No preamble, no explanation, no quotes around it.`;

/**
 * WHAT WOULD MAKE US KEEP THE DRAFT INSTEAD.
 *
 * The important one is the numbers. A target, a count, a date - these are where invention does real
 * damage and where nobody would catch it by reading, because a wrong number reads exactly like a
 * right one. So every digit-run in the composed text has to appear in the draft. It is a blunt
 * check and it is the one that matters: the model may reorder and reword freely, and the moment it
 * produces a number the record did not, we ship the record's own words.
 */
export function safeToUse(draft: string, composed: string | null | undefined): boolean {
  const text = (composed ?? '').trim();
  if (!text) return false;

  /* Something has gone wrong at the provider, or the model has started explaining itself. */
  if (text.length > draft.length * 1.6 + 120) return false;
  if (/^(sure|certainly|of course|here'?s|i'?d be happy)/i.test(text)) return false;

  const inDraft = new Set((draft.match(/\d+/g) ?? []));
  for (const n of text.match(/\d+/g) ?? []) {
    if (!inDraft.has(n)) return false;
  }
  return true;
}

/** The draft handed over as data, fenced and labelled, never interleaved with the instructions. */
export function composePrompt(draft: string): string {
  return `<draft>\n${draft}\n</draft>`;
}
