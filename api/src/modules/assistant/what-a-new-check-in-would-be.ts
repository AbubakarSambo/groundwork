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
    patterns: [/\b(pulse|regular read|how (things are|it is) going|weekly read|updates? from (my|our|the) (team|people|staff))\b/i],
  },
  {
    scenario: 'CONTRACT_REVIEW',
    says: 'an agreement before it is signed',
    /* "Sign" is the word that separates these two, and it is worth being narrow: somebody who says
       "contract" alone could mean either, and asking which is better than guessing. */
    patterns: [/\b(before (we|they) sign|about to sign|not signed yet|draft (agreement|contract)|reviewing the (contract|agreement))\b/i],
  },
  {
    scenario: 'IMPLEMENTATION_TRACKING',
    says: 'an agreement that is running',
    patterns: [/\b(revenue share|royalt(y|ies)|reconcile|reconciliation|under the (contract|agreement)|contract is running|licen[cs]e (fees?|reporting))\b/i],
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
      + ' - they are different conversations, so which is it?'
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

/** Every name, always. The list is the safeguard. */
export function saidAsAList(names: string[]): string {
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Why one cannot be opened at all. */
export function whyItCannotBeOpened(input: { label: string | null; people: number }): string | null {
  if (!input.label || input.label.trim().length < 3) {
    return 'Give it a name somebody would recognise in a list - a few words about what it is.';
  }
  if (input.people === 0) {
    return 'A check-in needs somebody in it other than you. Name who should be asked.';
  }
  return null;
}

/**
 * SAYING "GET UPDATES FROM MY TEAM ON ..." IS ASKING FOR A NEW CHECK-IN, even for somebody who already has one going (chat is king, step 2).
 * Without this the sentence was answered only for a person with no check-in at all.
 */
/**
 * "SET UP A CHECK-IN" IS ASKING FOR A NEW ONE, NOT TO START THE ONE THAT IS OPEN (Hafsah's own chat, 23 November 2026; local run, 27 November).
 * Wairimu, with her own check-in open, typed "set up a checkin" and was told "Your check-in on Sales team, Q4 is open". Starting, beginning or
 * opening "my" check-in is the one already there; setting one up, creating, making, or a new or another one is a new one.
 */
export const ASKS_TO_SET_ONE_UP = /\b(?:set\s*up|setup|create|make)\s+(?:a\s+|an\s+|one\s+|another\s+|new\s+)*(?:new\s+)?check[\s-]?ins?\b|\b(?:a\s+new|another)\s+check[\s-]?in\b/i;

export const ASKS_FOR_A_NEW_ONE_BY_SAYING_SO = /^\s*(?:please\s+|can\s+you\s+)?(?:get|collect|gather|have)\s+(?:me\s+)?(?:updates?|reports?)\s+from\s+(?:my|our|the)\s+(?:team|people|staff)\b/i;
