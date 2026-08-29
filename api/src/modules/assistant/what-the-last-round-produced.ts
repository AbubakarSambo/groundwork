/**
 * WHAT THE LAST ROUND PRODUCED, SO NOBODY HAS TO REMEMBER IT.
 *
 * The assistant has memory of its own turns and of the org's knowledge cards, and knows nothing at
 * all about the thing the product actually does. Every check-in that ran, every report that was
 * written, every question a group agreed was the central one - none of it reached the assistant.
 * Somebody thinking about next quarter was answered from their own chat history and a handbook,
 * which is a product with a memory of the conversation and no memory of the work.
 *
 * WHAT MAY CROSS, AND WHAT MAY NOT. A released report is a shared document: its central question,
 * its agreements and its divergences were written to be read by everybody in that check-in, and
 * recalling them to one of those same people discloses nothing new. Everything else in a report is
 * per-person material - `engagement`, `finalSynthesis.tiers`, `arcSignals`, `inferences` - and
 * `own-reads-only.ts` exists because that material once went to everybody. None of it is read here.
 * The list below is an allowlist for that reason: a field added to `Report` later is invisible to
 * this file until somebody decides it should not be, which is the safe direction for the default
 * to fail in.
 *
 * DIVERGENCES ARE INCLUDED, and that is the point rather than an oversight. A gap between two
 * accounts is the most useful thing a check-in produces and the first thing a recollection loses.
 * It is stated as a gap, never as one side being right, which is how the report already frames it.
 */

/** Only the shared fields. Adding one here is a decision, which is why the shape is explicit. */
export interface PastRound {
  groundLabel: string;
  releasedAt: Date;
  centralQuestion: string | null;
  agreements: unknown;
  divergences: unknown;
}

export interface Recalled {
  label: string;
  when: Date;
  question: string | null;
  agreed: string[];
  diverged: string[];
}

/**
 * `agreements` and `divergences` are JSON and have carried more than one shape over the life of the
 * product: an array of strings, an array of objects with a `text`, and an object keyed by label.
 * A recall that renders "[object Object]" at somebody is worse than one that says nothing, so this
 * reads what it recognises and drops the rest rather than stringifying it.
 */
export function lines(value: unknown): string[] {
  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === 'string' && v.trim()) out.push(v.trim());
    else if (v && typeof v === 'object') {
      const t = (v as { text?: unknown; statement?: unknown; summary?: unknown });
      for (const candidate of [t.text, t.statement, t.summary]) {
        if (typeof candidate === 'string' && candidate.trim()) { out.push(candidate.trim()); return; }
      }
    }
  };
  if (Array.isArray(value)) value.forEach(push);
  else if (value && typeof value === 'object') Object.values(value as Record<string, unknown>).forEach(push);
  return out;
}

export function recall(round: PastRound): Recalled {
  return {
    label: round.groundLabel,
    when: round.releasedAt,
    question: round.centralQuestion?.trim() || null,
    agreed: lines(round.agreements),
    diverged: lines(round.divergences),
  };
}

/** How much of one round is worth putting in a chat reply before it stops being read. */
export const PER_ROUND = 3;

/**
 * THE SENTENCE, AND WHY IT NAMES THE CHECK-IN.
 *
 * Somebody in four check-ins asked what was agreed gets four answers, and without the label they
 * are four unattributed claims about their own work. The label and the date are what make a recall
 * checkable against the report it came from - which is the difference between memory and assertion.
 */
export function saidOf(r: Recalled, howLongAgo: string): string[] {
  const out = [`${r.label}, ${howLongAgo}.`];
  if (r.question) out.push(`  The question it came down to: ${r.question}`);
  for (const a of r.agreed.slice(0, PER_ROUND)) out.push(`  Agreed: ${a}`);
  for (const d of r.diverged.slice(0, PER_ROUND)) out.push(`  Not agreed: ${d}`);
  const more = Math.max(0, r.agreed.length - PER_ROUND) + Math.max(0, r.diverged.length - PER_ROUND);
  if (more) out.push(`  and ${more} more in the report itself.`);
  return out;
}

/**
 * Nothing to recall is a real answer with two different causes, and saying which one it is matters:
 * a person with no finished check-ins is not the same as a person whose check-ins are still running.
 */
export const NOTHING_FINISHED =
  'Nothing has finished yet that I can recall for you. A check-in reaches me once its report is released to the people in it.';

export const NOTHING_AT_ALL =
  'I have no finished check-ins of yours to recall. Once one has run and its report is released, I can tell you what it came down to and what was agreed.';
