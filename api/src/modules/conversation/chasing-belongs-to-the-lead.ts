import { namesWithTheRestCounted } from '../engagement/a-name-to-call-them';
import { aNumberInWords } from '../engagement/a-number-in-words';
/**
 * THE CHASING BELONGS TO WHOEVER SET THE WORK UP.
 *
 * Day 3, day 7, day 14 was a constant in the reminder service, so every ground in
 * every organisation chased alike: a week-long handover nudged on the same days as
 * a quarter-long delivery, and a lead who wanted it to stop had nowhere to say so.
 * The schedule is now the ground's, and this file is the whole of the decision.
 *
 * TWO RULES, AND THEY ARE WHY THIS IS A FILE RATHER THAN AN `if`.
 *
 *   A LEAD WHO TURNED IT OFF GETS NOTHING. Not fewer emails — none. Somebody who
 *   said stop and was emailed anyway does not say it a second time; they stop
 *   opening the emails, and then the round that mattered is the one they skipped.
 *
 *   THE CHASING ENDS, AND THEN A PERSON HEARS. Nudging somebody who is not going
 *   to start is a chase; nudging them three times and then telling nobody is a
 *   chase that also failed silently. After the last day the lead hears WHO has not
 *   started, by name — see `theEmailForTheLead` for why never a count.
 */

/** What every ground gets when nobody has said otherwise. Days since the check-in opened. */
export const CHASE_AFTER_DAYS = [3, 7, 14];

/** Nobody is nudged twice in a day, whatever the schedule says. */
export const NOT_TWICE_WITHIN_HOURS = 24;

export interface ChasingPolicy {
  days: number[];
  stopped: boolean;
  tellTheLead: boolean;
}

export type WhatToDo =
  | { do: 'nudge them' }
  | { do: 'tell the lead' }
  | { do: 'nothing'; because: string };

/**
 * Pure, and it decides for ONE person on ONE day. Everything the caller knows is
 * an argument, so the reason a nudge did not go out can be read rather than
 * reconstructed from a schedule and a clock.
 */
/** How long after a chase day a missed reminder is still worth sending. */
export const A_MISSED_DAY_IS_STILL_DUE_FOR_DAYS = 3;

export function whatToDoToday(input: {
  policy: ChasingPolicy;
  daysOpen: number;
  hoursSinceLastNudge: number | null;
  leadAlreadyTold: boolean;
}): WhatToDo {
  const { policy, daysOpen } = input;

  if (policy.stopped) return { do: 'nothing', because: 'the lead turned chasing off' };
  if (policy.days.length === 0) return { do: 'nothing', because: 'the lead asked for no reminders' };

  const last = Math.max(...policy.days);

  /*
   * A CHASE DAY THAT HAS PASSED IS STILL DUE.
   *
   * This asked `policy.days.includes(daysOpen)` — exact equality with today. So a chase day was a
   * single cron pass: a deploy that morning, an outage, a queue that ran late, and the day-3 nudge
   * simply never happened. Nothing retried it and nothing recorded that it had been skipped, so
   * the person waiting to be reminded was never reminded and the schedule looked like it had run.
   *
   * The question is now "is there a chase day between the last time we spoke to them and today",
   * which is the same on a normal day and correct on the day after a bad one. `hoursSinceLastNudge`
   * carries where they were up to; nobody is nudged twice for the same day because a served day is
   * behind that mark.
   */
  /*
   * AND ONLY FOR A FEW DAYS. Without a bound, "a passed chase day is still due" means a ground
   * opened forty days ago and never chased sends its day-14 nudge today, and the state where the
   * chasing is finished and the lead is told never arrives. Three days is the width of a bad
   * weekend, which is what this is for — a missed morning, not a forgotten month.
   */
  const dayAtLastNudge =
    input.hoursSinceLastNudge === null ? -1 : daysOpen - Math.floor(input.hoursSinceLastNudge / 24);
  const dueDays = policy.days.filter(
    (d) => d <= daysOpen && d > dayAtLastNudge && daysOpen - d <= A_MISSED_DAY_IS_STILL_DUE_FOR_DAYS,
  );
  if (dueDays.length) {
    if (input.hoursSinceLastNudge !== null && input.hoursSinceLastNudge < NOT_TWICE_WITHIN_HOURS) {
      return { do: 'nothing', because: 'they were nudged in the last day' };
    }
    return { do: 'nudge them' };
  }

  /* Past the last day, and the chasing is done with them. The lead hears once —
     `leadAlreadyTold` is the caller's record of that, because telling a lead the
     same thing every morning is the chase moved one person along. */
  if (daysOpen > last && policy.tellTheLead && !input.leadAlreadyTold) {
    return { do: 'tell the lead' };
  }

  if (daysOpen > last) return { do: 'nothing', because: 'the chasing is done and the lead has been told' };
  /*
   * TWO DIFFERENT SILENCES, said differently. "Not a day this ground chases on" was returned both
   * for day two of a [3,7,14] ground and for the evening of day three after the morning's nudge —
   * and only one of those means the schedule has done its job. The reason is read in logs when
   * somebody is asking why a person was never reminded, so it has to be the true one.
   */
  if (policy.days.some((d) => d <= daysOpen)) {
    return { do: 'nothing', because: 'they have had every reminder due so far' };
  }
  return { do: 'nothing', because: 'not a day this ground chases on' };
}

export interface TheLeadsEmail {
  subject: string;
  text: string;
}

/**
 * NEVER A COUNT.
 *
 * "3 people have not started" is a number somebody can do nothing with: they have
 * to go and find out who, and the finding out is the work the email was supposed
 * to save. Names, and what each of them is sitting on.
 */
export function theEmailForTheLead(input: {
  leadName: string | null;
  groundLabel: string;
  whoHasNotStarted: string[];
  chasedOn: number[];
  link: string;
  /** The people Groundwork really did send a reminder to, and the day of the last one, from the record of what was sent. When absent, the schedule is said instead. */
  remindedNames?: string[];
  lastRemindedOn?: string | null;
  /** The lead's own check-in is still open too: said as her own line, and she is never in the list of others. */
  leadIsOpenToo?: boolean;
}): TheLeadsEmail | null {
  if (input.whoHasNotStarted.length === 0) return null;

  /* Somebody with no name is counted, never listed as "Someone and Someone", and never shown as their email address. */
  const names = namesWithTheRestCounted(input.whoHasNotStarted, aNumberInWords);
  const listed = names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  const have = input.whoHasNotStarted.length === 1 && names[0] !== 'you' ? 'has' : 'have';
  const sentenceStart = (t: string) => `${t.charAt(0).toUpperCase()}${t.slice(1)}`;
  const days = input.chasedOn.length ? `day ${input.chasedOn.join(', day ')}` : null;

  /*
   * WHAT GROUNDWORK DID, SAID AS ITS OWN DOING (decision 109, journey 3). The lead is not handed the chasing: "so this is yours now rather than the
   * system's" told her a job was hers. She is told who has not started, what was sent and when, that it has stopped, and offered words she may send.
   * Only people who were really sent a reminder are said to have been reminded.
   */
  const reminded = namesWithTheRestCounted(input.remindedNames ?? input.whoHasNotStarted, aNumberInWords);
  const remindedList = reminded.length < 2 ? reminded.join('') : `${reminded.slice(0, -1).join(', ')} and ${reminded[reminded.length - 1]}`;
  const all = (input.remindedNames ?? input.whoHasNotStarted).length === input.whoHasNotStarted.length;
  const did = reminded.length === 0
    ? 'Groundwork has stopped sending them reminders.'
    : `Groundwork reminded ${all ? 'them' : remindedList}${input.lastRemindedOn ? `, the last time on ${input.lastRemindedOn}` : days ? `, on ${days}` : ''}, and has now stopped reminding ${all ? 'them' : (input.remindedNames ?? input.whoHasNotStarted).length === 1 ? 'that person' : 'those people'}.`;

  const lines = [
    input.leadName ? `${input.leadName},` : 'Hello,',
    '',
    `${sentenceStart(listed)} ${have} not started their check-in on "${input.groundLabel}".${input.leadIsOpenToo ? ' Your own check-in is still open too.' : ''}`,
    '',
    did,
    '',
    'Groundwork will not remind them again. If you still want their view, a short note from you is the next step. You can send a fresh link from the check-in page with Resend invite.',
    '',
    `You could write, "I would value your view on ${input.groundLabel}. It takes about five minutes, and I will send you a fresh link if you reply."`,
    '',
    input.link,
  ];

  return {
    subject: `${sentenceStart(listed)} ${have} not started "${input.groundLabel}"${reminded.length ? ', and Groundwork has reminded them' : ''}`,
    text: lines.join('\n'),
  };
}
