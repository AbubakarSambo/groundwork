/**
 * A SENTENCE IN A TURN STARTS WITH A CAPITAL, OR IT IS NOT A SENTENCE.
 *
 * Two turns on seniorhire, run 10, both the model's own writing:
 *
 *   "You have completed the health reports for all five clients and found a generally positive
 *    picture, with clients satisfied. address two minor issues proactively matters: what
 *    specifically did you address, and what did that change?"
 *
 *   "That you haven't explicitly named renewals to David yet is useful to have on record. bring it
 *    up in your next one-on-one is a specific next step. What do you expect to have happen in that
 *    conversation?"
 *
 * The lower-case start is the visible half of the fault. The other half is that neither is a
 * sentence: a piece of the person's plan, then "matters:" or "is a specific next step" stuck on
 * behind it. Capitalising it would hide the first half and keep the second. So, before the turn is
 * saved:
 *
 *   A broken statement goes. The turn reads whole without it, because the question is still there.
 *   A broken lead-in to a question loses the lead-in: "... matters: what specifically did you
 *     address?" becomes "What specifically did you address?".
 *   A question, or the only thing left, gets its capital, because a turn with no question strands
 *     somebody and an empty turn is worse than an odd one.
 *
 * The test is the one tools/score_run.py counts ("sentence starting in lower case"), so what this
 * repairs is exactly what the run measures. Nothing inside quotation marks is touched: those are the
 * person's own words, and a person may write in lower case.
 */
import { LOWER_CASE_START } from '../reports/a-line-a-person-can-read';
import { quotationsIn } from '../reports/a-quote-is-what-they-said';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function aSentenceStartsWithACapital(text: string): { text: string; changed: boolean } {
  if (!text) return { text, changed: false };
  /* Their words held aside, so a stop inside a quote never starts a sentence here. */
  const held: string[] = [];
  let masked = '';
  let from = 0;
  for (const q of quotationsIn(text)) {
    masked += `${text.slice(from, q.start)}${held.push(text.slice(q.start, q.end)) - 1}`;
    from = q.end;
  }
  masked += text.slice(from);
  if (!new RegExp(LOWER_CASE_START.source).test(masked)) return { text, changed: false };

  /* Sentences, each carrying its own trailing space, so joining them back needs nothing added. */
  const pieces = masked.match(/[^.!?]+(?:[.!?]+["”’)\]]*\s*|$)/g) ?? [masked];
  const out: string[] = [];
  pieces.forEach((piece, i) => {
    /* The scorer's own test, at this boundary only: "e.g. the" and "etc. and" are not a new sentence. */
    const soFar = out.join('');
    const startsLower = i > 0 && soFar.endsWith('. ')
      && [...`${soFar}${piece.slice(0, 40)}`.matchAll(new RegExp(LOWER_CASE_START.source, 'g'))].some((m) => m.index === soFar.length - 2);
    if (!startsLower) { out.push(piece); return; }
    const isAQuestion = /\?\s*$/.test(piece);
    const colon = piece.indexOf(': ');
    if (isAQuestion && colon > 0) { out.push(cap(piece.slice(colon + 2))); return; }
    const isTheLast = i === pieces.length - 1;
    if (isAQuestion || isTheLast) { out.push(cap(piece)); return; }
    /* A broken statement with more turn after it: dropped. */
  });
  const joined = out.join('').replace(/\s+$/, (m) => (/\s$/.test(text) ? m : ''));
  const restored = joined.replace(/(\d+)/g, (_m, n) => held[Number(n)] ?? '');
  return { text: restored, changed: restored !== text };
}
