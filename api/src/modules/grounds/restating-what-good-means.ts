/**
 * RESTATING WHAT DOING WELL LOOKS LIKE, MID-CONVERSATION. FIX 6, inventory item 16.
 *
 * Driven live: "Change what good means: every stage has an owner and a next date, because the board
 * kept going stale." answered, on both doors, "I cannot find 'what good means' on this check-in." -
 * the generic change reader (`whatTheyWantChanged`) only ever matches things on `whatThisCheckInHolds`
 * (lines, targets, actions), and what doing well looks like is not one of those. It lives in its own
 * table, `GroundBaseline`, versioned, with a reason recorded whenever it changes and every earlier
 * version kept - see `stateBaseline`.
 *
 * WHY THIS IS ITS OWN, NARROW, DETERMINISTIC MATCH, rather than one more thing the generic change
 * reader tries to catch. `whatTheyWantChanged` matches by finding the thing referred to among rows
 * that already exist; a success statement is not a row to be found, it is a whole new statement to be
 * RECORDED, the same shape as the ordinary `success` gap. Recognising the phrase in code, rather than
 * asking a model "is this a restatement", keeps the trigger testable without a model in the loop -
 * the same reasoning `parseContextLine` and `parseLeadNote` already use for their own trigger words.
 */

const TRIGGER =
  /\b(?:change|redefine|restate|update)\s+(?:what\s+(?:doing well|good|success)\s+(?:looks like|means)|success)\b\s*[:,-]?\s*/i;
/** "what doing well looks like is now ..." / "what good means now is ..." */
const TRIGGER_IS_NOW =
  /\bwhat\s+(?:doing well|good|success)\s+(?:looks like|means)\s+(?:is now|now is)\s*[:,-]?\s*/i;

export interface RestatedSuccess {
  /** The new statement, with the trigger phrase and any leading punctuation stripped. */
  newSuccess: string;
  /** The reason, from a "because ..." clause, or null if none was given. */
  reason: string | null;
}

/**
 * Reads a restatement out of the lead's own sentence, or returns null when this message is not one.
 *
 * `newSuccess` and `reason` are the lead's own words, split on "because" - never invented, never
 * asked of a model. A message with the trigger phrase and nothing after it (or nothing but the
 * reason) has no statement to record, and is left to the ordinary conversation to ask about.
 */
export function restatesSuccess(said: string | null | undefined): RestatedSuccess | null {
  const text = (said ?? '').trim();
  if (!text) return null;
  const trigger = TRIGGER.test(text) ? TRIGGER : (TRIGGER_IS_NOW.test(text) ? TRIGGER_IS_NOW : null);
  if (!trigger) return null;
  const rest = text.replace(trigger, '').trim();
  if (!rest) return null;

  /* Split on the first "because", which introduces the reason - the rest is the new statement. */
  const becauseAt = rest.search(/\bbecause\b/i);
  const newSuccess = (becauseAt >= 0 ? rest.slice(0, becauseAt) : rest).replace(/[.,;\s]+$/, '').trim();
  const reason = becauseAt >= 0 ? rest.slice(becauseAt).replace(/^because\b/i, '').replace(/^[\s:,-]+/, '').replace(/[.\s]+$/, '').trim() : null;

  if (!newSuccess) return null;
  return { newSuccess, reason: reason || null };
}

/**
 * WHAT THE LEAD READS ONCE THE RESTATEMENT IS SAVED. FOUND LIVE, 30 September 2026, on the four live
 * checks: this used to be a fragment glued together with a colon and a parenthesis -
 *
 *   Recorded. What doing well looks like now: "every stage has an owner and a next date" (the board
 *   kept going stale)
 *
 * - joined pieces rather than a sentence a person reads. This is the same information, said as plain,
 * full sentences: what it is now, in quotes; why, in its own clause rather than bracketed on the end;
 * and, only once there was an earlier version to speak of, that it was kept rather than lost.
 */
export function saidBackForRestatedSuccess(baseline: { version: number; successLooksLike: string | null; changeReason: string | null }): string {
  const text = baseline.successLooksLike ?? '';
  const base = `What doing well looks like is now "${text}"`;
  if (baseline.version <= 1 || !baseline.changeReason) return `${base}.`;
  return `${base}, because ${baseline.changeReason}. The earlier version is kept.`;
}

/**
 * WHAT THE LEAD IS ASKED, BEFORE THE RESTATEMENT IS SAVED. FOUND LIVE, 30 September 2026, on the
 * four live checks: this used to be the same colon-joined fragment `saidBackForRestatedSuccess`
 * above was fixed for - "I will record that as what doing well looks like now: '...'" - shown at the
 * propose stage with a Yes underneath it, before the lead had said anything. Said as a question
 * instead, the same shape as every other say-back: the quote sits inside the sentence as its own
 * clause, and there is no colon.
 */
export function askToRestateSuccess(restated: RestatedSuccess, existingSuccess: boolean): string {
  const base = `Shall I change what doing well looks like to "${restated.newSuccess}"`;
  const asked = restated.reason ? `${base}, because ${restated.reason}?` : `${base}?`;
  return existingSuccess ? `${asked} The earlier version is kept.` : asked;
}
