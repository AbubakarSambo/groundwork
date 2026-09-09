import { STYLE, STYLE_VERSION, safeToUse, composePrompt } from '../assistant/the-model-words-it-and-nothing-more';

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
};

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
  const kept = drafts.filter((d) => d.text.trim());
  const lines = kept.map((d) => d.text.trim());
  const keep = kept.map((d) => d.mustKeep ?? []);
  if (!lines.length) return drafts;

  const block = lines.join('\n');
  let composed: string | null = null;
  try {
    composed = await compose(STYLE, composePrompt(block));
  } catch (err: any) {
    onRefusal?.(`the model call failed: ${err?.message}`);
    return drafts;
  }

  const back = (composed ?? '').trim().split('\n').map((l) => l.trim()).filter(Boolean);
  if (!sameShape(lines, back)) {
    onRefusal?.(`${lines.length} claims went out and ${back.length} came back`);
    return drafts;
  }
  for (let n = 0; n < lines.length; n++) {
    if (!safeToUse(lines[n], back[n], keep[n])) {
      onRefusal?.(`line ${n + 1} did not survive the guard`);
      return drafts;
    }
  }

  let at = 0;
  return drafts.map((d) => (d.text.trim() ? { ...d, text: back[at++] } : d));
}

export { STYLE_VERSION };
