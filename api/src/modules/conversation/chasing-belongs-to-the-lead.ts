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

  if (policy.days.includes(daysOpen)) {
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
}): TheLeadsEmail | null {
  if (input.whoHasNotStarted.length === 0) return null;

  const days = input.chasedOn.join(', ');
  const lines = [
    input.leadName ? `${input.leadName},` : 'Hello,',
    '',
    `On "${input.groundLabel}", these people have not started their check-in:`,
    ...input.whoHasNotStarted.map((n) => `- ${n}`),
    '',
    `They were reminded on ${days === '' ? 'no days' : `day ${days}`} and the reminders have stopped, so this is yours now rather than the system's.`,
    '',
    input.link,
  ];

  return {
    subject: `Not started on "${input.groundLabel}"`,
    text: lines.join('\n'),
  };
}
