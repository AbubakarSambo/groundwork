/**
 * SETTING ONE UP BY SAYING WHAT IT IS ABOUT.
 *
 * The last thing about a check-in that was a form. Somebody can already start
 * one that exists; this is opening one that does not.
 *
 * IT IS THE FIRST CAPABILITY THAT EMAILS PEOPLE, and that changes what care
 * means here. Everything else the assistant does is recoverable — a wrong answer
 * is corrected in the next sentence. An invitation is in somebody's inbox.
 *
 * So two rules that are not negotiable:
 *
 *   THE CONFIRMATION NAMES THEM. Not "and 4 others". "And 4 others" is how
 *   somebody presses yes on a mistake, and the mistake is a colleague receiving
 *   an invitation to account for themselves that nobody meant to send.
 *
 *   AN UNCERTAIN SITUATION IS A QUESTION, NEVER A GUESS. There are twenty
 *   situations and each is a different interview. Picking the wrong one produces
 *   a session that asks a new hire about a contract ending, which is worse than
 *   asking which it is.
 */

/** The situations this can recognise from words. Deliberately not all twenty. */
const RECOGNISABLE: { scenario: string; says: string; patterns: RegExp[] }[] = [
  {
    scenario: 'NEW_HIRE',
    says: 'somebody joining',
    patterns: [/\b(new (hire|joiner|starter)|joining|just joined|starts? (on )?monday|onboard(ing)?)\b/i],
  },
  {
    scenario: 'NEW_PROJECT',
    says: 'something new starting',
    patterns: [/\b(new (project|piece of work|workstream)|kick(ing)? off|starting (a|the) (project|work))\b/i],
  },
  {
    scenario: 'OKR_ALIGNMENT',
    says: "the quarter's objectives",
    patterns: [/\b(objectives?|okrs?|goals?|the quarter)\b/i],
  },
  {
    scenario: 'DRIFT',
    says: 'work that has gone off track',
    patterns: [/\b(off track|drift(ing)?|slipp(ing|ed)|behind|stalled)\b/i],
  },
  {
    scenario: 'REALIGN_TEAM',
    says: 'people seeing it differently',
    patterns: [/\b(see it differently|disagree|not aligned|different (views?|pictures?)|pulling in different)\b/i],
  },
  {
    scenario: 'PULSE_CHECK',
    says: 'a regular read on live work',
    patterns: [/\b(pulse|regular read|how (things are|it is) going|weekly read)\b/i],
  },
  {
    scenario: 'ROLE_HANDOVER',
    says: 'a role changing hands',
    patterns: [/\b(handover|hand(ing|s)? over|changing hands|taking over|leaving|successor)\b/i],
  },
];

export interface WhichSituation {
  scenario: string;
  says: string;
}

/**
 * Which situation they described, or null.
 *
 * NULL WHEN TWO MATCH AS WELL AS ONE. "The new project's objectives" is both a
 * new project and objectives, and those are different interviews — so it asks
 * rather than choosing the one that happened to be listed first.
 */
export function whichSituation(said: string): WhichSituation | { ambiguous: WhichSituation[] } | null {
  const hits = RECOGNISABLE.filter((r) => r.patterns.some((p) => p.test(said)));
  if (hits.length === 0) return null;
  if (hits.length > 1) {
    return { ambiguous: hits.map((h) => ({ scenario: h.scenario, says: h.says })) };
  }
  return { scenario: hits[0].scenario, says: hits[0].says };
}

/** What to ask when nothing matched, or when several did. */
export function askWhichSituation(candidates?: WhichSituation[]): string {
  if (candidates?.length) {
    return (
      'That could be ' + candidates.map((c) => c.says).join(' or ')
      + ' — they are different conversations, so which is it?'
    );
  }
  return 'What is it about? Somebody joining, something new starting, the quarter\'s objectives, work that has gone off track, people seeing it differently, a regular read, or a role changing hands.';
}

export interface OnTheRoster {
  externalId: string;
  displayName: string | null;
  managerExternalId: string | null;
  active: boolean;
}

/**
 * Who would be asked: the people who report to them.
 *
 * A guess, and said as one. It is right often enough to save somebody typing
 * four names and wrong often enough that it must never be acted on silently —
 * which is what the naming rule is for.
 */
export function whoWouldBeAsked(roster: OnTheRoster[], me: string): OnTheRoster[] {
  return roster.filter((p) => p.active && p.managerExternalId === me && p.externalId !== me);
}

/**
 * The confirmation. Names everybody who will be emailed.
 *
 * Not a count. "And 4 others" is how somebody presses yes on a mistake, and the
 * mistake is a colleague receiving an invitation to account for themselves that
 * nobody meant to send.
 */
export function askBeforeOpeningIt(input: {
  says: string;
  label: string;
  people: OnTheRoster[];
}): string {
  const names = input.people.map((p) => p.displayName ?? p.externalId);

  if (names.length === 0) {
    return (
      `I can open a check-in about ${input.says} — "${input.label}". `
      + 'Nobody reports to you on the roster, so tell me who should be in it and I will name them back before anything is sent.'
    );
  }

  return (
    `I can open a check-in about ${input.says} — "${input.label}" — and ask `
    + saidAsAList(names)
    + `. ${names.length === 1 ? 'That is who reports' : 'They are who report'} to you on the roster; say if it should be somebody else. `
    + `${names.length === 1 ? 'They will be emailed' : 'They will each be emailed'} an invitation. Open it?`
  );
}

/** Every name, always. The list is the safeguard. */
export function saidAsAList(names: string[]): string {
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Why one cannot be opened at all. */
export function whyItCannotBeOpened(input: { label: string | null; people: number }): string | null {
  if (!input.label || input.label.trim().length < 3) {
    return 'Give it a name somebody would recognise in a list — a few words about what it is.';
  }
  if (input.people === 0) {
    return 'A check-in needs somebody in it other than you. Name who should be asked.';
  }
  return null;
}
