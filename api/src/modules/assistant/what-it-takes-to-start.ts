/**
 * STARTING A CHECK-IN BY SAYING SO.
 *
 * Everything about a check-in was reachable from the chat except starting one,
 * which was a button. Asking for it in words is the difference between a panel
 * that answers questions and a panel somebody works in.
 *
 * WHAT THIS FILE DOES NOT DO IS START ANYTHING. It works out which of four
 * situations somebody is in and says so. The act itself is a `next_step` the
 * panel performs, for the same reason the accept line stopped carrying a path:
 * this code cannot know which application it is being read inside, and a
 * customer whose own system has a place for this should be able to use it.
 *
 * The four are genuinely different and were one silence before:
 *   - something set up for them, waiting on them to start it
 *   - a session already open to them
 *   - a session that exists and whose invitation they have not accepted
 *   - nothing
 */

export interface WaitingOnThem {
  /** Grounds they are the named lead of, not yet begun. */
  toStart: { groundId: string; label: string }[];
  /** Sessions open to them now. `aboutOnePerson`: a performance plan, a probation or a review, with nobody else's answers. */
  open: { checkInId: string; label: string; aboutOnePerson?: boolean }[];
  /** Sessions that exist and are not theirs to open yet. */
  notAccepted: { label: string }[];
}

export interface WhatToSay {
  line: string;
  act: { kind: 'confirm_a_check_in' | 'open_a_check_in'; id: string; label: string } | null;
}

/**
 * ONE THING OFFERED, NOT A MENU.
 *
 * Starting something set up for them comes first: until that happens nothing on
 * it exists for anybody, so it is the one that unblocks other people rather than
 * only themselves.
 *
 * Where there are several, the rest are NAMED but not offered. A list of buttons
 * is a decision about which to do first handed back to somebody who asked the
 * product to get on with it.
 */
export function whatItTakesToStart(waiting: WaitingOnThem): WhatToSay {
  if (waiting.toStart.length > 0) {
    const [first, ...rest] = waiting.toStart;
    return {
      line:
        `"${first.label}" was set up for you and has not begun. Nothing is asked of anybody on it until you start it.`
        + andTheRest(rest.map((g) => g.label), 'also waiting on you to start'),
      act: { kind: 'confirm_a_check_in', id: first.groundId, label: 'Start it' },
    };
  }

  if (waiting.open.length > 0) {
    const [first, ...rest] = waiting.open;
    return {
      line:
        `Your check-in on "${first.label}" is open. ${itTakesAboutTenMinutes(first.aboutOnePerson)}`
        + andTheRest(rest.map((c) => c.label), 'also open to you'),
      act: { kind: 'open_a_check_in', id: first.checkInId, label: 'Open it' },
    };
  }

  if (waiting.notAccepted.length > 0) {
    return {
      line:
        `There is a check-in for you on "${waiting.notAccepted[0].label}", and the invitation has not been accepted yet. `
        + 'Accepting is how somebody agrees to take part, so it is not something I can do for you - it is in the email you were sent.',
      act: null,
    };
  }

  return {
    line:
      'There is no check-in waiting for you. One is opened by whoever is leading a piece of work, '
      + 'and I will tell you the moment there is.',
    act: null,
  };
}

/**
 * HOW LONG IT TAKES, AND WHEN WHAT THEY SAY IS RELEASED, ONLY WHERE THAT IS TRUE (decision 82, item 5).
 * A check-in with a team releases what each person says with everybody else's. A check-in about one
 * person has nobody else's to release it with, so it says only how long it takes, as the WhatsApp
 * opening notice does.
 */
export function itTakesAboutTenMinutes(aboutOnePerson: boolean | undefined): string {
  return aboutOnePerson
    ? 'It takes about ten minutes.'
    : "It takes about ten minutes, and what you say is released with everybody else's, not before.";
}

/** Named, not offered. See the note above. */
function andTheRest(labels: string[], what: string): string {
  if (labels.length === 0) return '';
  return ` There ${labels.length === 1 ? 'is one other' : `are ${labels.length} others`} ${what}: ${labels.map((l) => `"${l}"`).join(', ')}.`;
}
