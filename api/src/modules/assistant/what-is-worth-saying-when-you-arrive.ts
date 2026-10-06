import { WhatIsTrue } from './what-is-true-for-this-person';
import { itTakesAboutTenMinutes } from './what-it-takes-to-start';

/**
 * WHAT TO SAY TO SOMEBODY WHO HAS JUST OPENED IT.
 *
 * The panel greeted people with "Ask me about your objectives or what you owe
 * this period" — an offer to answer a question they had not asked, from a thing
 * that already knew what was waiting for them. Somebody who has to think of the
 * question is somebody who closes the panel.
 *
 * THE ONE DISTINCTION THIS FILE TURNS ON: stating what is waiting is not
 * chasing. Raising what has slipped is.
 *
 *   A check-in open to somebody is a fact they need in order to do their job,
 *   and saying it every time they open the panel is the panel working. Nobody
 *   resents being told a thing is ready.
 *
 *   A promise they made and have not kept is a different act. Saying it is
 *   useful once and corrosive on the fourth morning, so it is rate limited by
 *   the calendar — and the existing opening already does exactly that, for
 *   exactly that reason, which is why this sits underneath it rather than
 *   replacing it.
 *
 * AND AT MOST ONE THING. A greeting that lists four is a to-do list somebody
 * did not ask for, and the fourth item is what makes the first one ignorable.
 */

export interface WorthSaying {
  line: string;
  /** Where it came from, so the panel and any test can tell them apart. */
  source: 'session_open' | 'session_to_start' | 'target_unexplained' | 'orientation';
}

/**
 * The one thing worth opening on, or null to leave the greeting as it was.
 *
 * The order is what somebody would want in that order, not what the product
 * would like them to do: a session open to them unblocks nothing but their own
 * day, a session waiting on them to start unblocks everybody else's — so that
 * comes first.
 */
export function whatIsWorthSayingWhenYouArrive(
  truth: WhatIsTrue,
  firstName: string,
): WorthSaying {
  const sessions = truth.sessions.value;

  const toStart = sessions.filter((s) => s.standing === 'waiting on you to start');
  if (toStart.length > 0) {
    return {
      /* First, because until this happens nothing on it exists for anybody. It
         is the only item here that is holding other people up. */
      line:
        `${firstName} - "${toStart[0].label}" was set up for you and has not begun. `
        + 'Nothing is asked of anybody on it until you start it.',
      source: 'session_to_start',
    };
  }

  const open = sessions.filter((s) => s.standing === 'open to you');
  if (open.length > 0) {
    return {
      line:
        `${firstName} - your check-in on "${open[0].label}" is open. `
        /* "Released with everybody else's" only where there is somebody else (decision 82, item 5). */
        + (open[0].aboutOnePerson ? 'It takes about ten minutes.' : 'About ten minutes, and what you say is released with everybody else\'s, not before.'),
      source: 'session_open',
    };
  }

  /*
   * THE WEAKEST ONE, AND IT IS STILL WORTH SAYING ONCE.
   *
   * A target with no reason recorded is fine until the quarter it is missed, and
   * then it is the difference between a conversation about the number and a
   * conversation about the person. Said only when NOTHING carries a reason —
   * where some do, the ones that do are already showing what a good one looks
   * like, and saying it again is the product having an opinion about somebody's
   * planning tool.
   */
  const owned = truth.objectives.value.filter((o) => o.theirs);
  const noneExplained =
    owned.length > 0 && owned.every((o) => !o.justification?.trim() && !o.approach?.trim());
  if (noneExplained) {
    return {
      line:
        firstName
        + (owned.length === 1
          ? ' - you own an objective, and it does not record why its number is the number.'
          : ` - you own ${owned.length} objectives, and none of them records why its number is the number.`)
        + ' Worth having before the check-in where it is missed.',
      source: 'target_unexplained',
    };
  }

  return {
    line: `Hello ${firstName}. Ask me about your objectives or what you owe this period.`,
    source: 'orientation',
  };
}

/**
 * Whether this is the kind of thing that may be said every time.
 *
 * Stating what is waiting is not chasing. The only rate-limited opening is the
 * one that raises a promise somebody has not kept, and that one lives above
 * this in the existing code.
 */
export function mayBeSaidEveryTime(source: WorthSaying['source']): boolean {
  return source !== 'target_unexplained';
}
