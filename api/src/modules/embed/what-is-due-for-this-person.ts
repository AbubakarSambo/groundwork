import { howLongItTakes } from '../assistant/what-it-takes-to-start';

/**
 * WHAT IS DUE FOR THE PERSON THE PANEL IS SIGNED IN AS.
 *
 * One shape behind three surfaces: the launcher's badge, the pulse while the badge is above zero,
 * and the first line the panel says. The panel used to open on a hello for somebody whose check-in
 * was waiting, and the launcher could draw a count that nothing ever set. Pure, so the counting and
 * the wording can be read without a database.
 */

export interface ASessionStanding {
  checkInId: string | null;
  groundId: string;
  label: string;
  standing: 'waiting on you to start' | 'open to you' | 'invitation not accepted';
  /** A performance plan, a probation or a review: nobody else's answers to release theirs with. */
  aboutOnePerson?: boolean;
}

export interface ADueCheckIn {
  checkInId: string;
  groundId: string;
  label: string;
  /** The team's session, as every other page counts it. */
  sessionNumber: number;
  /** Whether this is their own first conversation (theirOwnSessionNumber), whatever the team's session: somebody added in session 3. */
  theirFirst: boolean;
  /** What their own earlier sessions left open, in their own words. Theirs, shown to them. */
  leftOpen: string[];
  /** A check-in about one person, where nothing is "released with everybody else's". */
  aboutOnePerson?: boolean;
}

export interface WhatIsDue {
  checkIns: ADueCheckIn[];
  toStart: { groundId: string; label: string }[];
  slippedCommitments: number;
  /** What the badge shows. Every item here is something only this person can move. */
  count: number;
}

export function whatIsDueFor(args: {
  sessions: ASessionStanding[];
  sessionNumbers: Map<string, number>;
  /** The check-ins that are their own first. Without it, session 1 is. */
  theirFirst?: Set<string>;
  leftOpen: Map<string, string[]>;
  slippedCommitments: number;
}): WhatIsDue {
  const checkIns = args.sessions
    .filter((s) => s.standing === 'open to you' && s.checkInId)
    .map((s) => ({
      checkInId: s.checkInId as string,
      groundId: s.groundId,
      label: s.label,
      sessionNumber: args.sessionNumbers.get(s.checkInId as string) ?? 1,
      theirFirst: args.theirFirst ? args.theirFirst.has(s.checkInId as string) : (args.sessionNumbers.get(s.checkInId as string) ?? 1) === 1,
      leftOpen: args.leftOpen.get(s.checkInId as string) ?? [],
      aboutOnePerson: !!s.aboutOnePerson,
    }));
  const toStart = args.sessions
    .filter((s) => s.standing === 'waiting on you to start')
    .map((s) => ({ groundId: s.groundId, label: s.label }));
  return {
    checkIns,
    toStart,
    slippedCommitments: args.slippedCommitments,
    count: checkIns.length + toStart.length + args.slippedCommitments,
  };
}

/** Something the panel can DO from a chip, not only say. */
export interface AnAct {
  label: string;
  kind: 'open_a_check_in' | 'confirm_a_check_in';
  id: string;
}

/**
 * The first line when a check-in is waiting. Leads with the one thing that is theirs to move,
 * says which session it is, and says what they left open last time so they arrive with their own
 * thread in hand rather than a blank box. One item quoted, never a list read back at them.
 */
export function openingOnWhatIsDue(due: WhatIsDue, firstName: string): {
  line: string;
  source: 'session_to_start' | 'session_open';
  suggestions: string[];
  acts: AnAct[];
} {
  if (due.toStart.length && !due.checkIns.length) {
    const g = due.toStart[0];
    return {
      line: `${firstName}, "${g.label}" was set up for you and has not begun. Nothing is asked of anybody on it until you start it.`,
      source: 'session_to_start',
      suggestions: ['What is due?'],
      acts: [{ label: `Read it and start`, kind: 'confirm_a_check_in', id: g.groundId }],
    };
  }
  const c = due.checkIns[0];
  const which = c.theirFirst ? 'your first check-in' : `check-in ${c.sessionNumber}`;
  const more = due.checkIns.length > 1 ? ` ${due.checkIns.length - 1} more ${due.checkIns.length - 1 === 1 ? 'is' : 'are'} open as well.` : '';
  const thread = c.leftOpen.length ? ` Last time you left this open: "${c.leftOpen[0]}".` : '';
  return {
    /* "Released with everybody else's" only where there is somebody else (decision 82, item 5). */
    line: `${firstName}, ${which} on "${c.label}" is open. ${howLongItTakes(c.aboutOnePerson)}${thread}${more}`,
    source: 'session_open',
    suggestions: ['What is due?', 'What did I commit to?'],
    acts: [{ label: 'Start it', kind: 'open_a_check_in', id: c.checkInId }],
  };
}
