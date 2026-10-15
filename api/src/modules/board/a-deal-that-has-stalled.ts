import { aLineNamesTheCustomer } from './one-deal-per-customer';

/**
 * A DEAL HAS STALLED WHEN THE CUSTOMER HAS NOT ANSWERED FOR THREE WORKING DAYS, FROM THE RECORD (pilots after fixes, A4).
 *
 * Joseph said on 18 October "Mama Pima has not answered my calls since Wednesday." and the board never said the deal had
 * stalled: nothing counted a customer not answering. Now a check-in line that names the customer and says they are not
 * answering starts the count, from the day it names ("since Wednesday") or else the day it was said. A later line saying
 * they answered, paid, signed or ordered ends it. Three working days (Monday to Friday) without an answer is stalled.
 */
export const STALLED_AFTER_WORKING_DAYS = 3;

const NOT_ANSWERING = /\b(?:not|hasn'?t|has not|haven'?t|have not|isn'?t|is not|no longer|never)\s+(?:been\s+)?(?:answer(?:ed|ing)?|respond(?:ed|ing)?|repl(?:ied|ying)|pick(?:ed|ing)\s+up|got(?:ten)?\s+back|returned)\b|\bno\s+(?:reply|response|answer|word)\b|\bgone\s+(?:quiet|silent)\b|\bignor(?:ed|ing)\b|\bunanswered\b/i;
const THEY_MOVED = /\b(?:answered|replied|responded|called\s+back|got\s+back|paid|signed|ordered|agreed|confirmed|placed\s+(?:an?\s+)?order|said\s+yes)\b/i;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY = 86_400_000;
const dayStart = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/** The day the silence began, as the line says it: "since Wednesday" is the Wednesday before it was said; else the day it was said. */
export function theDaySilenceBegan(text: string, saidOn: Date): Date {
  const t = (text ?? '').toLowerCase();
  const said = dayStart(saidOn);
  if (/\bsince\s+yesterday\b/.test(t)) return new Date(said - DAY);
  if (/\bsince\s+last\s+week\b/.test(t)) return new Date(said - 7 * DAY);
  const m = /\bsince\s+(?:last\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/.exec(t);
  if (m) {
    const want = WEEKDAYS.indexOf(m[1]);
    let back = (new Date(said).getUTCDay() - want + 7) % 7;
    if (back === 0) back = 7;
    return new Date(said - back * DAY);
  }
  return new Date(said);
}

/** Monday-to-Friday days after `from`, up to and including `now`'s day. */
export function workingDaysSince(from: Date, now: Date): number {
  let n = 0;
  for (let d = dayStart(from) + DAY; d <= dayStart(now); d += DAY) {
    const w = new Date(d).getUTCDay();
    if (w !== 0 && w !== 6) n += 1;
  }
  return n;
}

/** When the customer stopped answering, as the record has it now, or null when nothing says so (or they answered since). */
export function notAnsweringSince(dealName: string, lines: { text: string; createdAt: Date | string }[]): Date | null {
  const theirs = lines
    .filter((l) => aLineNamesTheCustomer(l.text, dealName))
    .map((l) => ({ text: l.text, on: new Date(l.createdAt) }))
    .filter((l) => !Number.isNaN(l.on.getTime()))
    .sort((a, b) => a.on.getTime() - b.on.getTime());
  let since: Date | null = null;
  for (const l of theirs) {
    if (NOT_ANSWERING.test(l.text)) {
      const began = theDaySilenceBegan(l.text, l.on);
      if (!since || began < since) since = began;
    } else if (THEY_MOVED.test(l.text) && !/\b(?:not|no|never|hasn'?t|haven'?t)\b/i.test(l.text)) {
      since = null;
    }
  }
  return since;
}

export function hasStalled(since: Date | null, now: Date): boolean {
  return !!since && workingDaysSince(since, now) >= STALLED_AFTER_WORKING_DAYS;
}
