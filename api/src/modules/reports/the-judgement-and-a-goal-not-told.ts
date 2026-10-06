import { theConversationPointForTheLead } from '../grounds/a-goal-not-told-stays-with-the-lead';

/**
 * DECISION 56, POINT 3, FOR THE LEAD'S JUDGEMENT.
 *
 * An untold goal still counts wherever it counts against a person, and the lead is shown the
 * conversation point beside it: "Tobi has not been told about this goal yet, so talk it through with
 * Tobi before reading anything into it." The Context page, Today, the board and the suggestions
 * already do. The judgement did not, so a lead could read "Tobi has not started on the scheduling"
 * with nothing beside it saying Tobi had never been told the scheduling was his.
 *
 * WRITTEN BY THE PRODUCT, NEVER BY THE MODEL. The sentence is the one fixed sentence from
 * `theConversationPointForTheLead`, added to the judgement after it is written, so a model can
 * neither leave it out nor change it.
 *
 * ONLY WHERE THE JUDGEMENT RESTS ON THE GOAL. A judgement that names Tobi for some other reason does
 * not get it. It rests on an untold goal when it names the person AND uses a distinctive word or
 * number from that goal's own text (the model paraphrases, but it keeps the subject of the work).
 *
 * LEAD ONLY. The caller calls this for the lead alone, and a judgement a participant reads is already
 * gone (the-judgement-is-the-leads). Nothing here decides who reads it.
 */
const SMALL_WORDS = new Set([
  'about', 'their', 'there', 'would', 'should', 'could', 'which', 'these', 'those', 'where', 'other',
  'being', 'after', 'before', 'every', 'while', 'through', 'within', 'during', 'across', 'taking', 'making',
]);

function everyStringIn(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => everyStringIn(x, out));
  else if (v && typeof v === 'object') Object.values(v as Record<string, unknown>).forEach((x) => everyStringIn(x, out));
  return out;
}

function distinctiveWordsOf(goal: string): string[] {
  const words = (goal.toLowerCase().match(/[a-z]{5,}/g) ?? []).filter((w) => !SMALL_WORDS.has(w));
  const numbers = goal.match(/\d[\d,.]*/g) ?? [];
  return [...new Set([...words, ...numbers])];
}

function escaped(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function theJudgementWithItsConversationPoints<T>(
  judgement: T,
  untold: { name: string; goal: string }[],
): T {
  if (!judgement || typeof judgement !== 'object' || Array.isArray(judgement)) return judgement;
  const text = everyStringIn(judgement).join('\n');
  const lower = text.toLowerCase();
  const points: string[] = [];
  for (const u of untold) {
    const name = (u.name ?? '').trim();
    if (!name || name.length < 2) continue;
    if (!new RegExp(`(^|[^\\p{L}])${escaped(name)}([^\\p{L}]|$)`, 'iu').test(text)) continue;
    if (!distinctiveWordsOf(u.goal ?? '').some((w) => lower.includes(w))) continue;
    const point = theConversationPointForTheLead(name);
    if (!points.includes(point)) points.push(point);
  }
  if (!points.length) return judgement;
  return { ...(judgement as any), conversationPoints: points };
}
