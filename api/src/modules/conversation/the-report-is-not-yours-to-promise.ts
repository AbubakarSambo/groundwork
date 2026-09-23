/**
 * THE REPORT IS NOT YOURS TO PROMISE.
 *
 * Hafsah, 23 September 2026: "it also tole my collegue the report is ready."
 *
 * It is not. On a check-in run across a network - one link, a hundred answers - there is no report
 * at the end of any single conversation. The picture is synthesised once enough accounts are in and
 * it reaches people when the ORGANISER sends it, which may be days later. Everything the product
 * says about it on the way out is a promise somebody else has to keep.
 *
 * The closing line is written for a two- or three-person alignment check-in, where it is true: the
 * report exists the moment the last person finishes, and it is theirs. The same sentence on a
 * broadcast is a lie told at the most trusting moment in the whole conversation - the person has
 * just given five minutes of their own work and is being thanked.
 *
 * WHY A REWRITE RATHER THAN A PROMPT RULE. The prompt already says it: "Until the session is
 * actually closing, never say the report is ready." It said that before today, and the sentence
 * arrived anyway - twice, in two different runs, which is what a prompt rule is worth against a
 * phrase the model has good reason to reach for. This is the read, in code.
 */
import { GroundScenario } from '@prisma/client';

/**
 * Check-ins where the report is the organiser's to release, not this conversation's to hand over.
 *
 * TEAM_UPDATES is the one people are pointed at by a link. OPEN_READ is the same shape: many
 * separate accounts, one picture, released once.
 */
const THE_ORGANISER_RELEASES_IT: string[] = [GroundScenario.TEAM_UPDATES, 'OPEN_READ'];

export function theReportIsNotTheirsYet(scenario: string | null | undefined): boolean {
  return THE_ORGANISER_RELEASES_IT.includes(String(scenario ?? ''));
}

/** Every way the closing turn claims the report exists and belongs to them. */
const CLAIMS_THE_REPORT = [
  /\byour report is (?:ready|yours|now yours)(?: now)?\b\.?/gi,
  /\bthe report is (?:ready|yours)(?: now)?\b\.?/gi,
  /\byour report will be ready\b[^.!?]*\.?/gi,
  /\bnothing in it needs acting on(?: today)?\b\.?/gi,
];

/**
 * WHAT IS TRUE INSTEAD, and it is also the reason they answered.
 *
 * Said once, in place of the claim, rather than appended - a turn that says the report is ready AND
 * that it comes later is worse than either sentence alone.
 */
export const WHAT_ACTUALLY_HAPPENS_NEXT = 'The consolidated report goes out once everybody has answered.';

/**
 * AND THE GOODBYE IS THE SAME PROMISE IN ONE WORD.
 *
 * "Speak soon." It is the right line to a colleague you check in with every fortnight, and the
 * prompt asks for it by name. Said to somebody who followed a link once, from an organisation that
 * has no relationship with them and no second round scheduled, it promises a conversation nobody
 * has arranged. Read live in the close of the update run on 23 September 2026.
 *
 * Only the ones that claim another meeting. "Thank you" and "thanks for your time" stay: they are
 * the only thing the product ever gives back for five minutes of somebody's work.
 */
const PROMISES_ANOTHER_CONVERSATION = [
  /\b(?:speak|talk|chat)\s+(?:to you\s+)?(?:soon|again|next time|in [^.!?]{1,24})\b\.?/gi,
  /\b(?:see|catch)\s+you\s+(?:soon|again|next time|in [^.!?]{1,24}|then)\b\.?/gi,
  /\buntil (?:next time|then)\b\.?/gi,
];

export function withoutPromisingTheReport(text: string): string {
  let out = text ?? '';
  let claimed = false;
  for (const rx of [...CLAIMS_THE_REPORT, ...PROMISES_ANOTHER_CONVERSATION]) {
    rx.lastIndex = 0;
    if (rx.test(out)) claimed = true;
    rx.lastIndex = 0;
    out = out.replace(rx, '');
  }
  /*
   * AND THE JOIN THAT HELD THE TWO CLAIMS TOGETHER.
   *
   * "Your report is ready now, and nothing in it needs acting on today." Removing both claims left
   * ", and" - a fragment, at the front of the replacement sentence. Caught by writing the test with
   * the real sentence in it rather than a tidy one.
   */
  out = out
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([.,;!?])/g, '$1')
    .replace(/^[\s,;]*(?:and|but|so)\b[\s,;]*/i, '')
    .replace(/[\s,;]+(?:and|but|so)\s*$/i, '')
    .replace(/^[\s,;.]+|[\s,;]+$/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!claimed) return text ?? '';
  /* Where taking the claim out leaves nothing, the true sentence is the whole turn. */
  return out ? `${out} ${WHAT_ACTUALLY_HAPPENS_NEXT}`.replace(/\s+/g, ' ').trim() : WHAT_ACTUALLY_HAPPENS_NEXT;
}
