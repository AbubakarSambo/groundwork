import { BAD_FAITH_CODES, POSITIVE_CODES, ALIGNMENT_FEED_ONLY_CODES } from '../patterns/pattern-library';

/**
 * THE COACHING NOTE, WHICH IS THE ONE PART OF A REPORT THAT SPEAKS TO THE PERSON READING IT.
 *
 * `postReportGuide` already existed and was three lines about the conversation to have next.
 * Useful, and thin: it was written from one session's text, so on session two it said roughly what
 * it said on session one, and it knew nothing about what keeps happening to this person or about
 * what somebody in their role should be doing by now.
 *
 * This is built from three things instead:
 *
 *   WHAT KEEPS SHOWING UP - the confirmed pattern detections for this person, in the library's own
 *   plain words rather than as a code. A code on a screen is a diagnosis nobody can argue with.
 *
 *   WHERE THEY ARE - their role and how far into the run they are. The same observation means
 *   different things in session 2 of a new hire's first ninety days and in session 9 of a renewal.
 *
 *   WHAT TO DO BEFORE THE NEXT ONE - the library's own probe, which is already written as a
 *   question somebody can go and answer.
 *
 * IT IS PRIVATE, AND IT IS ABOUT THE READER. Never rendered on the shared report, never about
 * anybody else, and never a recommendation about what another person should do. The three
 * alignment-feed-only codes are excluded outright: those exist precisely because naming them to
 * the person would do harm.
 *
 * A GENERAL NOTE BEATS NO NOTE. With no pattern confirmed yet - which is most of session 1 and
 * 2 - it says what somebody at this point in this kind of check-in should be doing. An empty
 * coaching surface on session 2 teaches a person the product has nothing to say to them.
 */
export interface WhatToWorkOnNext {
  /** What keeps showing up, in plain words. Null when nothing is confirmed yet. */
  showingUp: string | null;
  /** Why it matters for somebody in this role at this point. */
  whyItMatters: string;
  /** The specific thing to do before the next session. */
  beforeNextTime: string;
  /** True when this is role and stage guidance rather than a read on a pattern. */
  general: boolean;
}

export interface CoachingInputs {
  /** Confirmed pattern codes for THIS participant, most recent first. */
  confirmedCodes: string[];
  /** How this person's part is described, when anybody has said. */
  role: string | null;
  sessionNumber: number;
  totalSessions: number | null;
  scenario: string | null;
  /** Whether this person named anything specific this session. */
  saidSomethingSpecific: boolean;
  /** Whether anything they said was anchored to a document. */
  anythingDocumented: boolean;
}

const LIBRARY = new Map(
  [...BAD_FAITH_CODES, ...POSITIVE_CODES].map((c) => [c.code, c]),
);

/** What somebody in this kind of check-in is for, in the second person, in one clause. */
function whatThisRoleIsFor(scenario: string | null, role: string | null): string {
  if (role?.trim()) return `your part in this, which is ${role.trim().toLowerCase()}`;
  switch (scenario) {
    case 'NEW_HIRE': return 'the first months of a new role';
    case 'NEW_MANAGER': return 'taking on a team';
    case 'ROLE_HANDOVER': return 'a role changing hands';
    case 'PIP': return 'getting back on track';
    case 'CONTRACT_RENEWAL': return 'a renewal decision';
    case 'DRIFT': case 'REALIGN_TEAM': return 'getting back onto the same page';
    case 'CRISIS_ALIGNMENT': case 'ACUTE_SHOCK': return 'a situation that just changed';
    default: return 'this piece of work';
  }
}

export function whatToWorkOnNext(i: CoachingInputs): WhatToWorkOnNext {
  const about = whatThisRoleIsFor(i.scenario, i.role);
  const early = i.sessionNumber <= 2;
  const last = i.totalSessions != null && i.sessionNumber >= i.totalSessions;
  const where = i.totalSessions
    ? `session ${i.sessionNumber} of ${i.totalSessions}`
    : `session ${i.sessionNumber}`;

  const code = i.confirmedCodes.find((c) => !ALIGNMENT_FEED_ONLY_CODES.has(c) && LIBRARY.has(c));
  const entry = code ? LIBRARY.get(code)! : null;

  if (entry) {
    return {
      showingUp: entry.signal,
      whyItMatters: `This is ${where} of ${about}. Something read once is an incident. Read across sessions it becomes the thing people expect of you, and it is far easier to change now than to argue with later.`,
      beforeNextTime: entry.probe?.trim()
        ? entry.probe
        : 'Pick the one thing above that you can answer with a date, a number or a document, and bring that answer next time.',
      general: false,
    };
  }

  /*
   * NO PATTERN YET, SO THE ADVICE IS ABOUT THE RECORD ITSELF - which is the honest thing to coach
   * on early, because a record with nothing checkable in it cannot produce a pattern, a
   * disagreement worth resolving, or a defence if somebody later remembers it differently.
   */
  const beforeNextTime = !i.saidSomethingSpecific
    ? 'Before the next one, pick one thing you actually did and write it with a date and who else was involved. One is enough to change what this can say.'
    : !i.anythingDocumented
      ? 'Everything you gave was from memory. Bring one thing next time that somebody else could open: a message, a document, a number from a system.'
      : last
        ? 'This is the last session. Say plainly what is still unresolved and who you think owns it, because after this the record stops.'
        : 'Before the next one, pick the thing you said you would do and be ready to say what happened, with a date.';

  return {
    showingUp: null,
    whyItMatters: early
      ? `This is ${where} of ${about}. Nothing repeats yet, which is normal this early. What decides whether the later sessions are worth anything is how checkable this one was.`
      : `This is ${where} of ${about}. Nothing has recurred often enough to call it a pattern, which is a good sign and worth keeping that way.`,
    beforeNextTime,
    general: true,
  };
}
