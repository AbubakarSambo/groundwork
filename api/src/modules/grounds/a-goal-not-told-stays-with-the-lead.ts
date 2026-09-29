/**
 * DECISION 56 (29 September 2026), which replaces part of the file above (decision 48) and the two
 * items of decision 53 that touched an untold goal. It has four parts:
 *
 *   1. The lead sees the goal marked "Not told yet", flagged as needing their attention, and is
 *      nudged to tell the person. (See `theLeadIsNudgedToTell` and `what-today-reads-from-the-record.ts`.)
 *   2. The model in the person's own check-in is given the goal, so it can ask about that work, but
 *      never states the number or the target until the lead has told them. (See `theAreaOfAGoal`,
 *      used in conversation.service.ts and prompt-library.ts, and the reply guard in
 *      conversation.service.ts, `refusesTheUntoldGoalsNumber`.)
 *   3. An untold goal still counts wherever it counts against the person - a judgement, a board line,
 *      a suggestion - and the lead is shown it as a conversation point there. (See
 *      `theConversationPointForTheLead`.) Nothing here removes it from what feeds a judgement; only
 *      `withoutGoalsNotToldIn` below, which shapes what is SERVED, keeps it off what the person and
 *      others read.
 *   4. After a week not told, the person is told plainly that their lead has set a goal about this
 *      work, with no number, and the lead is reminded once. (See `aWeekHasPassedSinceNotTold` and
 *      `whatThePersonReadsAfterAWeek`.)
 *
 * THE ANCHOR FOR "A WEEK" IS `createdAt`, not a dedicated "marked NOT_TOLD" timestamp - the row has
 * no such column, and decision 56 itself allows this: "the goal's createdAt (or when it was marked
 * NOT_TOLD) + 7 days". A goal the lead edits back to NOT_TOLD after telling somebody, then not
 * telling them again, is the one case this reads a little early; adding a real timestamp for that is
 * a schema change, left for later rather than made here.
 */

/*
 * A trailing `\b` after an optional suffix like "%" backtracks the suffix away (there is no word
 * boundary between "%" and a following space), leaving the "%" behind - "12%" matched as "12" and
 * left "%" in the text. Lookaround boundaries instead of `\b` do not have that failure mode.
 */
const NUMBERISH =
  /(?<![a-z0-9])[$£€]?\d[\d,]*(?:\.\d+)?\s?(?:k|m|bn|%|percent)?(?![a-z0-9])|(?<![a-z0-9])Q[1-4](?![a-z0-9])/gi;
const DATE_PHRASE =
  /\b(?:by|on|before|until|due)\s+(?:the\s+)?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|today|tomorrow|tonight|end of (?:the )?(?:week|month|quarter|year)|EOD|EOW|EOM|next week|next month|this week|this month)\b/gi;
const MONTH_DAY =
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\.?\s*\d{0,2}(?:st|nd|rd|th)?\b/gi;
const ISO_DATE = /\b\d{4}-\d{2}-\d{2}\b/g;
const TRAILING_PREPOSITION = /\s+(?:by|on|before|until|due|of|to|for|at)\s*[.]?\s*$/i;

/**
 * THE AREA OF WORK A GOAL IS ABOUT, WITH EVERY NUMBER, AMOUNT, DATE-AS-TARGET AND QUANTITY REMOVED.
 *
 * "Hit 40 stock counts by Friday" becomes "Hit stock counts": the topic survives, the number and the
 * deadline do not. This is what the model in the person's own check-in is given for a goal marked
 * NOT_TOLD, so it can ask about the work without ever being able to say the number the lead has not
 * shared yet - structural, not by instruction alone (the reply guard below is the second layer).
 */
export function theAreaOfAGoal(text: string): string {
  const original = (text ?? '').trim();
  if (!original) return original;
  let out = original
    .replace(ISO_DATE, ' ')
    .replace(DATE_PHRASE, ' ')
    .replace(MONTH_DAY, ' ')
    .replace(NUMBERISH, ' ');
  for (let i = 0; i < 3; i++) out = out.replace(TRAILING_PREPOSITION, '.');
  out = out.replace(/\s{2,}/g, ' ').replace(/\s+([.,;:!?])/g, '$1').replace(/[.]{2,}$/, '.').trim();
  if (!out || out.length < 3) return original;
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/** True once a week has passed since a still-NOT_TOLD goal was created (or last written). */
export function aWeekHasPassedSinceNotTold(
  o: { awareness?: string | null; authoredBy?: string | null; createdAt?: Date | string | null } | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!notToldYet(o)) return false;
  const created = o?.createdAt ? new Date(o.createdAt) : null;
  if (!created || Number.isNaN(created.getTime())) return false;
  return now.getTime() - created.getTime() >= 7 * 24 * 60 * 60 * 1000;
}

/**
 * THE LEAD'S OWN NUDGE, FOR A `forTheLead` ITEM ("Tell Tobi about taking over the scheduling. You
 * set this goal and have not told him yet."). Uses the person's name, never a pronoun.
 */
export function theLeadIsNudgedToTell(personName: string, goalText: string): { decide: string; why: string } {
  const name = (personName ?? 'them').trim() || 'them';
  const area = theAreaOfAGoal(goalText ?? '').replace(/[.!?]+$/, '').trim();
  const about = area ? area.charAt(0).toLowerCase() + area.slice(1) : 'this goal';
  return {
    decide: `Tell ${name} about ${about}.`,
    why: `You set this goal and have not told ${name} yet.`,
  };
}

/**
 * WHEREVER AN UNTOLD GOAL COUNTS AGAINST THE PERSON - a judgement, a board line, a suggestion - the
 * lead is also shown it as a conversation point, so nothing is read into it before they have talked
 * it through. Uses the person's name throughout, never "him" or "her".
 */
export function theConversationPointForTheLead(personName: string): string {
  const name = (personName ?? 'They').trim() || 'They';
  return `${name} has not been told about this goal yet, so talk it through with ${name} before reading anything into it.`;
}

/**
 * WHAT THE PERSON READS, ONCE A WEEK HAS PASSED WITHOUT BEING TOLD: that their lead has set a goal
 * about this work, and will talk it through with them. No number, no target wording - only the area.
 */
export function whatThePersonReadsAfterAWeek(leadName: string, goalText: string): string {
  const lead = (leadName ?? 'Your lead').trim() || 'Your lead';
  const area = theAreaOfAGoal(goalText ?? '').replace(/[.!?]+$/, '').trim();
  const about = area ? area.charAt(0).toLowerCase() + area.slice(1) : 'this';
  return `${lead} has set a goal about ${about}, and will talk it through with you.`;
}

/**
 * A GOAL THE LEAD HAS NOT TOLD THE PERSON ABOUT STAYS WITH THE LEAD (the more private option,
 * 29 September 2026).
 *
 * The lead writes what they expect of somebody and says whether they have told them (`awareness`:
 * TOLD, NOT_TOLD, UNSURE, NOT_ASKED). Tobi's You board listed "Take over the scheduling." while the
 * lead had said they had not told him yet, and his check-in page carried the lead's own words about
 * it ("I need to talk to Tobi about taking over the scheduling..."). Learning a goal from a screen,
 * before the lead has said it, is not how anybody should be told.
 *
 * So a lead-written goal marked NOT_TOLD reaches the lead and nobody else: not the person, not a
 * colleague, not an admin who only reads. Once the lead says they told them, it shows as before.
 * A goal the person wrote themselves is theirs and is never held back.
 *
 * Not `seenBySubject`: that flag turns true only when the person is shown the goal
 * (markMyExpectationShown), so hiding everything it marks false would mean nobody is ever shown one.
 */
export function notToldYet(o: { awareness?: string | null; authoredBy?: string | null } | null | undefined): boolean {
  return !!o && String(o.awareness ?? '').toUpperCase() === 'NOT_TOLD' && o.authoredBy !== 'self';
}

/** The goals this reader may read: all of them for the lead, and none not told yet for anybody else. */
export function goalsThisReaderMaySee<T extends { awareness?: string | null; authoredBy?: string | null }>(rows: readonly T[], isTheLead: boolean): T[] {
  return isTheLead ? [...rows] : rows.filter((o) => !notToldYet(o));
}

const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/[’‘`´]/g, "'").toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();

/**
 * AND NO PRODUCT SENTENCE GIVES IT EITHER. A sentence that carries the goal's own words is taken out
 * of what this reader is served (a report, a board). Only goals long enough to be recognised are
 * matched, so a two-word goal cannot empty unrelated sentences.
 */
export function withoutGoalsNotToldIn<T>(value: T, goals: readonly string[]): T {
  const keys = goals.map((g) => plain(g ?? '')).filter((g) => g.length >= 12);
  if (!keys.length) return value;
  const sentencesOf = (t: string) => t.match(/[^.!?\n]+(?:[.!?]+|\n|$)\s*/g) ?? [t];
  const strip = (t: string): string => {
    const all = sentencesOf(t);
    const kept = all.filter((s) => !keys.some((k) => plain(s).includes(k)));
    return kept.length === all.length ? t : kept.join('').trim();
  };
  const NOT_WORDS = /^(?:id|.*Id|.*Ids|.*[Tt]oken|.*[Uu]rl|href|slug|email|.*At)$/;
  const walk = (v: any): any => {
    if (typeof v === 'string') return strip(v);
    if (v === null || typeof v !== 'object' || v instanceof Date) return v;
    if (Array.isArray(v)) return v.map(walk).filter((x, i) => !(typeof v[i] === 'string' && v[i].trim() && !String(x).trim()));
    if (![Object.prototype, null].includes(Object.getPrototypeOf(v))) return v;
    const out: Record<string, any> = {};
    for (const [k, x] of Object.entries(v)) out[k] = typeof x === 'string' && NOT_WORDS.test(k) ? x : walk(x);
    return out;
  };
  return walk(value);
}
