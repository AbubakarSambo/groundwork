import { createHash } from 'crypto';

/**
 * THE AREA OF A GOAL, WORDED ONCE, KEPT (decision 56, item 2, second pass - 29 September 2026).
 *
 * The first cut of this used a regex to strip digits and dates out of the goal's own sentence
 * (`theAreaOfAGoal` in a-goal-not-told-stays-with-the-lead.ts, kept there for anything still reading
 * it). Read live it was ungrammatical ("Tell Tobi about take over the scheduling and hit 40 stock
 * counts by friday") and, worse, still carried target wording the regex had no way to know about
 * ("hit stock counts" - decision 56 says no target wording, not just no number).
 *
 * So the area is now WORDED, by the model, and only once: at the point a lead's expectation is
 * saved with awareness NOT_TOLD (conversation.service.ts, where the extraction writes the row), or,
 * failing that, by the warm-up before anybody opens a page (decision 7 - opening a page never asks
 * the model; `storedAreaOfAGoal` is the read-only half everything else uses). What is kept is
 * validated on the way in: no digit, no number word, no currency, no percentage, no date or
 * deadline word, no verb that states hitting a target, and short. A goal whose area fails that
 * check, or has never been worded, reads as `FALLBACK_AREA` - never the raw sentence, and never
 * nothing.
 *
 * Storage reuses `WordedLine` (see a-line-worded-once-is-kept.ts): a different key prefix so this
 * can never collide with a report's own kept lines, no schema change.
 */

export const FALLBACK_AREA = 'this part of the work';

const AREA_VERSION = 'goal-area-v1';

function keyFor(goalText: string): string {
  return createHash('sha256').update(`${AREA_VERSION}\u0000${(goalText ?? '').trim()}`).digest('hex');
}

const AREA_STYLE = `You are Groundwork. You are given a GOAL a lead wrote about somebody who works with them, who has \
not been told about it yet.

Reply with a short, plain noun phrase naming only the AREA OF WORK the goal is about - what it is \
about, never what number, date or target is attached to it.

Rules:
- No digits, and no numbers written as words (one, two, forty, a dozen, and so on).
- No currency symbols and no percentages.
- No dates, days of the week, months, quarters, or deadline words such as "by", "due", "deadline", \
"today", "tomorrow", "this week", "end of the month".
- No verb that states hitting, reaching or achieving a target: never "hit", "reach", "achieve", \
"deliver", "cross", "meet the target". Name the work, not the doing of it to a level.
- A short noun phrase only - "the scheduling", "the stock counts", "the client relationship". If the
  goal covers more than one area, join them plainly: "the scheduling and the stock counts".
- Reply with the phrase only. No preamble, no explanation, no quotes, no full stop at the end.`;

/** Every number word this product's goals are likely to use, checked as whole words. */
const NUMBER_WORD =
  /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|dozen|half|quarter|first|second|third|fourth|fifth)\b/i;
const CURRENCY = /[$£€]|\bpercent\b|%/i;
const DATE_OR_DEADLINE =
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|today|tomorrow|tonight|deadline|due|by\b|eod|eow|eom|q1|q2|q3|q4|week|month|year)\b/i;
const TARGET_VERB = /\b(hit|reach|achieve|deliver|cross|exceed|surpass)\b/i;

/**
 * True only for a short, plain noun phrase with none of the above in it. This is the check that
 * matters: the model may say anything at all, and the moment it slips a number or a deadline back
 * in, the fallback ships instead - the same shape as `safeToUse` for report lines, applied to a
 * stricter question (not "keep every fact", but "keep none of these").
 */
export function isAPlainAreaPhrase(text: string): boolean {
  const t = (text ?? '').trim();
  if (!t) return false;
  if (t.length > 60) return false;
  if (t.split(/\s+/).length > 9) return false;
  if (/\d/.test(t)) return false;
  if (NUMBER_WORD.test(t)) return false;
  if (CURRENCY.test(t)) return false;
  if (DATE_OR_DEADLINE.test(t)) return false;
  if (TARGET_VERB.test(t)) return false;
  if (/^(sure|certainly|of course|here'?s|i'?d be happy)/i.test(t)) return false;
  return true;
}

/**
 * READ-ONLY. No model asked, ever - this is what every page read uses. Null where nothing has been
 * worded yet (a goal saved before this feature, or a save whose wording failed and has not been
 * retried); callers use `FALLBACK_AREA` for that case, never the raw goal.
 */
export async function storedAreaOfAGoal(prisma: any, goalText: string): Promise<string | null> {
  const kept = await prisma.wordedLine?.findUnique?.({ where: { key: keyFor(goalText) }, select: { text: true } }).catch(() => null);
  return kept?.text?.trim() || null;
}

/** The stored area, or the fixed fallback - never a model call, safe for a page read. */
export async function areaOfGoalOrFallback(prisma: any, goalText: string): Promise<string> {
  return (await storedAreaOfAGoal(prisma, goalText)) ?? FALLBACK_AREA;
}

/**
 * THE ONE MODEL CALL, made when the goal is saved (conversation.service.ts, where the lead's
 * expectation is written) or by the warm-up. Validates and keeps the result; on any failure -
 * refused by `isAPlainAreaPhrase`, the model call itself failing, the write failing - nothing is
 * kept and a later save or warm-up can try again. Callers never depend on the return value for what
 * to show; they read it back through `storedAreaOfAGoal`/`areaOfGoalOrFallback` afterwards, the same
 * as every other kept line in this codebase.
 */
export async function wordTheAreaOfAGoal(
  anthropic: { respond: (system: string, history: { role: 'user' | 'assistant'; content: string }[]) => Promise<string> },
  prisma: any,
  goalText: string,
): Promise<string | null> {
  const text = (goalText ?? '').trim();
  if (!text) return null;
  const key = keyFor(text);
  const already = await storedAreaOfAGoal(prisma, text);
  if (already) return already;
  let said: string;
  try {
    said = await anthropic.respond(AREA_STYLE, [{ role: 'user', content: `GOAL: ${text}` }]);
  } catch {
    return null;
  }
  const area = (said ?? '').trim().replace(/^["'“”]+|["'“”]+$/g, '').replace(/[.]+$/, '');
  if (!isAPlainAreaPhrase(area)) return null;
  await prisma.wordedLine?.upsert?.({ where: { key }, create: { key, text: area }, update: { text: area } }).catch(() => undefined);
  return area;
}
