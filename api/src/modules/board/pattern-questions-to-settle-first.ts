import type { AServedPattern } from '../patterns/who-reads-a-pattern';

/**
 * WHAT TO SETTLE FIRST, WITH WHAT KEEPS COMING UP IN IT AGAIN, FOR WHOEVER RUNS THE CHECK-IN (decision 86, item 1).
 *
 * The questions the report built from patterns were taken out of the lead's "what to settle first" while
 * patterns did not reach the lead (`overTimeAsServed` still takes the stored ones out: they were written at
 * synthesis, with the engine's own sentence, from patterns seen once, before the person had read them). Decision
 * 86 gives the lead a person's pattern again, after the person has had their turn: after their answer, or three
 * days after they were shown it, or seven days after it was ready. So the questions come back, built here from
 * what the lead is already served (`servedPatterns`, which keeps that timing and the three periods), never from
 * the stored text.
 *
 * What each line holds: the pattern's plain name, whose check-ins it came up in and how often, and the person's
 * own answer beside it where there is one. Never the engine's sentence about the work and never how the pattern
 * was put to the person, which are theirs. A pattern about the reader themselves is not a question to settle with
 * anybody, so it is not here.
 */
export const AT_MOST_THIS_MANY_PATTERN_QUESTIONS = 2;

export function patternQuestionsToSettleFirst(
  served: readonly AServedPattern[] | null | undefined,
  nameOf: (participantId: string) => string | null | undefined,
): string[] {
  const out: string[] = [];
  for (const p of served ?? []) {
    if (out.length >= AT_MOST_THIS_MANY_PATTERN_QUESTIONS) break;
    if (p.yours || p.talkedAbout) continue;
    const name = (nameOf(p.participantId) ?? '').trim();
    if (!name) continue;
    const often = String(p.howOften ?? '').trim();
    const said = (p.theirWords ?? '').trim();
    const answer = said
      ? `${name} said, “${said.replace(/[“”"]/g, '')}${/[.!?]$/.test(said) ? '' : '.'}” Ask ${name} what has changed since then.`
      : `${name} has not answered it yet. Ask ${name} what is behind it.`;
    out.push(`“${p.heading}” keeps coming up in ${name}’s check-ins.${often ? ` ${often}` : ''} ${answer}`);
  }
  return out;
}
