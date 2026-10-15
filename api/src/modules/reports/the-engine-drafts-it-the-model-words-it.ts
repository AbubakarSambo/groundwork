import { STYLE, STYLE_VERSION, safeToUse, timesItSaysTheReaderSaidIt } from '../assistant/the-model-words-it-and-nothing-more';
import { PLAIN_WORDS, SPOKEN_TO_THE_READER } from '../conversation/plain-words';

/**
 * THE REPORT'S PHRASING LAYER, WHICH IS THE ASSISTANT'S, REACHED FROM HERE.
 *
 * Every engine on this page built its sentences by substitution, so three blockers read as one
 * sentence three times with the noun swapped, and every person in the same role in every
 * organisation read the same words. Correct, and useless the second time somebody sees it.
 *
 * The layer that fixes it already existed and this page did not use it. `STYLE` tells the model it
 * is given a draft that is already correct and may only say it better. `safeToUse` refuses the
 * result on an invented number, a DROPPED number, an invented capitalised word, sudden length, or
 * a "Sure, here's" - and on refusal the draft ships. It is versioned so a line can be traced to
 * the rules that produced it.
 *
 * WHY THE DRAFT IS BUILT FIRST AND GROUPED FIRST. A phrasing pass over three near-identical
 * sentences is a model being asked to vary a mail merge, which is the wrong job and produces the
 * wrong thing. Grouping is a decision about what is being claimed, so it belongs to the engine.
 * By the time anything gets here, one claim is one line.
 *
 * WHAT THIS ADDS ON TOP OF `safeToUse`, and why it needs to.
 *
 * `safeToUse` guards a single sentence. Here a surface is a block of lines, and a block invites
 * two failures a single sentence cannot have: the model merging two lines into one, and the model
 * dropping a line that carried no number and no name. Both are the composer editing the record.
 * So the line count is held exactly, and each line is guarded on its own.
 */
export type Drafted = {
  key: string;
  text: string;
  /**
   * WORDS THE ENGINE TOOK FROM A ROW, WHICH THE MODEL MAY NOT RESTRUCTURE.
   *
   * Driven live and this is not hypothetical. The draft said the person was waiting for "a named
   * on-call person published by Friday each week" - somebody's own words for the thing they are
   * owed. It came back as "Each Friday, give Hafsah in writing a reply and a named on-call
   * person", which moves the weekly cadence off the awaited item and onto the action. Different
   * claim, no invented number, no invented name, so `safeToUse` saw nothing.
   *
   * A row's text is quoted material. It is passed through `mustKeep`, so the sentence around it
   * may be rewritten freely and the row itself has to survive intact or the draft ships.
   */
  mustKeep?: string[];
  /**
   * CONTEXT THE MODEL WRITES FROM, WITHOUT QUOTING IT.
   *
   * The first pass at the coaching box handed the role map's sentences to the model as DRAFT lines
   * and asked it to reword them. Under `STYLE` a draft that is already clear comes back unchanged,
   * so every person in the same function read the map verbatim: "seems to be quoting directly from
   * the role map instead of using it as context for what to say."
   *
   * A line with `context` is a different job. The draft is the claim about THIS person and this
   * session; the context is what the map knows about this kind of work; the model writes the line
   * in its own words, informed by the context, and must not lift the context's sentences. The guard
   * still holds every number and every capitalised word - but words that appear in the context are
   * allowed, because the context is engine text too.
   */
  context?: string;
};

/**
 * AND THE MODEL IS TOLD HOW MANY LINES TO SEND BACK, WHICH IT WAS NOT BEFORE.
 *
 * The rules this composer runs under end with the plain-words rulebook, and that rulebook says
 * "write one plain, full sentence in every field". It is right about a field. This is not a field:
 * it is a block of separate claims, and the model read the rule the only way it could and sent one
 * sentence back for the whole block.
 *
 * Measured on the run of 26 September against the run before the rulebook reached here: the
 * refusals used to be near misses, nine lines out and eight back, ten out and nine back. Afterwards
 * they were collapses - eight out and one back, thirteen out and one back, fourteen out and one
 * back. Every one of those throws the whole rewrite away and ships the engine's own words, so the
 * change made to remove jargon was quietly putting it back.
 *
 * Nothing here weakens the guard. The line count is still held exactly and every line is still
 * checked on its own; the model is simply told what shape the answer has to be, which is the one
 * thing the prompt never said.
 */
export function oneLineBackForEachLineIn(lines: string[]): string {
  return [
    `Below are ${lines.length} separate lines. Each one is its own claim about its own thing, and each`,
    'one is read on its own by a person, in its own place on the page.',
    '',
    `Send back exactly ${lines.length} lines, in the same order, one line for each line given. Say each`,
    'one better, as one plain, full sentence. Never merge two lines into one, never split one line',
    'into two, never add a line, and never drop a line - not even a line that holds no number and no',
    'name. Do not number them and do not add anything around them.',
    '',
    `<draft>\n${lines.join('\n')}\n</draft>`,
  ].join('\n');
}

/** The style for a line that has context: write from it, do not quote it. */
export const STYLE_WITH_CONTEXT = `You are Groundwork, writing one short paragraph to somebody about their own work.
You will be given a DRAFT, which is what must be said, and CONTEXT, which is what is known about this kind of work.
Rules:
- Say what the draft says. Keep every fact, number, name and date in the draft exactly. Add no facts of your own.
- Use the context to choose what to emphasise and how to put it. Do not copy a sentence from the context; do not quote it; do not list it. Fold it into how you say the draft.
- Speak to the person: "you", plainly. No praise, no scripted warmth, no "I'd be happy to".
- Never guess anybody's pronoun from their name; where the draft does not say, write they and their.
- British spelling. No em dashes. Straight quotes.
- Two to four sentences. Reply with the paragraph only.

${PLAIN_WORDS}

${SPOKEN_TO_THE_READER}`;

export function composeWithContext(draft: string, context: string): string {
  return `<draft>\n${draft}\n</draft>\n<context>\n${context}\n</context>`;
}

/** What a caller has to give us to reach a model. Kept as a function so nothing imports Nest here. */
export type Compose = (system: string, draft: string) => Promise<string | null>;

/**
 * A LINE THAT VANISHES IS A CLAIM THAT VANISHES.
 *
 * Checked before the per-line guard, because a merged block can still pass every per-line check
 * when the lines are compared pairwise against the wrong drafts.
 */
export function sameShape(draft: string[], composed: string[]): boolean {
  return draft.length === composed.length && composed.every((l) => l.trim().length > 0);
}

/**
 * Reword a block of drafted claims, or return the block.
 *
 * All-or-nothing per surface. Half a section in the model's words and half in the engine's reads
 * as two writers, and the reader cannot tell which half to trust.
 */
export async function wordedByTheModel(
  drafts: Drafted[],
  compose: Compose,
  onRefusal?: (why: string) => void,
): Promise<Drafted[]> {
  /*
   * LINES WITH CONTEXT GO ONE AT A TIME, UNDER THEIR OWN STYLE. They are paragraphs written from a
   * draft plus context, not rewordings of a block, so the line-count rule does not apply to them and
   * the guard compares against draft AND context. Everything else takes the block path below.
   */
  const withContext = drafts.filter((d) => d.text.trim() && d.context?.trim());
  const contextual = new Map<string, string>();
  await Promise.all(withContext.map(async (d) => {
    try {
      const out = await compose(STYLE_WITH_CONTEXT, composeWithContext(d.text.trim(), d.context!.trim()));
      const text = (out ?? '').trim();
      /* No sentence of the context may come through whole: that is the quotation this mode exists to stop. */
      /* Sentences AND the clauses after a colon: the map writes "What on track looks like: X", and X
         lifted whole is the quotation, whether or not the label came with it. */
      const quoted = d.context!.split(/(?<=[.!?])\s+|:\s+/).some((piece) => piece.trim().length > 24 && text.includes(piece.trim()));
      /* The context is what is known about the work, never what the reader said: a "you said" or "you confirmed" counts against the draft alone.
         Night quality run 1: the role context "This is about what you said work" let "You said that a short account is not a weak one" through to Esther. */
      const putInTheirMouth = timesItSaysTheReaderSaidIt(text) > timesItSaysTheReaderSaidIt(d.text);
      if (text && !quoted && !putInTheirMouth && safeToUse(`${d.text}\n${d.context}`, text, d.mustKeep ?? [])) contextual.set(d.key, text);
      else onRefusal?.(`${d.key}: the contextual line ${quoted ? 'quoted the context' : 'did not survive the guard'}`);
    } catch (err: any) {
      onRefusal?.(`${d.key}: the model call failed: ${err?.message}`);
    }
  }));

  const kept = drafts.filter((d) => d.text.trim() && !d.context?.trim());
  const lines = kept.map((d) => d.text.trim());
  const keep = kept.map((d) => d.mustKeep ?? []);
  if (!lines.length) return drafts.map((d) => (d.context?.trim() && contextual.has(d.key) ? { ...d, text: contextual.get(d.key)! } : d));

  const block = lines.join('\n');
  let composed: string | null = null;
  try {
    composed = await compose(STYLE, oneLineBackForEachLineIn(lines));
  } catch (err: any) {
    onRefusal?.(`the model call failed: ${err?.message}`);
    return drafts.map((d) => (d.context?.trim() && contextual.has(d.key) ? { ...d, text: contextual.get(d.key)! } : d));
  }

  const back = (composed ?? '').trim().split('\n').map((l) => l.trim()).filter(Boolean);
  const withContextual = () => drafts.map((d) => (d.context?.trim() && contextual.has(d.key) ? { ...d, text: contextual.get(d.key)! } : d));
  if (!sameShape(lines, back)) {
    onRefusal?.(`${lines.length} claims went out and ${back.length} came back`);
    return withContextual();
  }
  for (let n = 0; n < lines.length; n++) {
    if (!safeToUse(lines[n], back[n], keep[n])) {
      onRefusal?.(`line ${n + 1} did not survive the guard`);
      return withContextual();
    }
  }

  let at = 0;
  return drafts.map((d) => {
    if (d.context?.trim()) return contextual.has(d.key) ? { ...d, text: contextual.get(d.key)! } : d;
    return d.text.trim() ? { ...d, text: back[at++] } : d;
  });
}

export { STYLE_VERSION };
