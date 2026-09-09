import { BAD_FAITH_CODES, POSITIVE_CODES, ALIGNMENT_FEED_ONLY_CODES } from '../patterns/pattern-library';

/**
 * THE COACHING NOTE. THE ONE PART OF A REPORT THAT SPEAKS TO THE PERSON READING IT.
 *
 * IT IS NOT ABOUT SPECIFICITY. The first version of this was, and specificity is an input rather
 * than the subject: how much detail somebody gave is a means, and the subject is what they can
 * move before the next session. It reads four things now.
 *
 *   WHAT KEEPS SHOWING UP. Confirmed pattern detections, in the catalogue's own plain words rather
 *   than as a code. Recurrence is the whole of what makes a pattern: the same reason given across
 *   sessions, the same item carried forward untouched, the same request repeated without ever
 *   being escalated. A single instance is not one and is never reported as one, which is what
 *   `periodsObserved` is for.
 *
 *   ROLE AND STAGE. The same observation means different things in session 2 of a new hire's first
 *   ninety days and in session 9 of a renewal.
 *
 *   WHAT IS BLOCKING THEM. What they are waiting on, from whom, how long, and - the part that
 *   turns it into an action - whether they escalated it or only asked again.
 *
 *   WHAT THEY ARE BLOCKING. Where somebody else's record says they are waiting on this person.
 *   It is the most actionable thing available and it was nowhere in the product.
 *
 * ACTIONS, NOT ENCOURAGEMENT. "Ask again" is not an action. "Put the rota request in writing with
 * a date, or take it to whoever is above them" is.
 *
 * IT IS PRIVATE AND IT IS ABOUT THE READER. Never on the shared report. It may say "you are named
 * as the holdup on X", because that is this person's own conduct. It never says what anybody else
 * should do. The three alignment-feed-only codes are excluded outright: those exist precisely
 * because naming them to the person would do harm.
 */
export interface WhatToWorkOnNext {
  /** What keeps showing up, in plain words, with what makes it a recurrence. Null when none. */
  showingUp: string | null;
  /** Why it matters for somebody in this role at this point. */
  whyItMatters: string;
  /** The specific things to do before the next session. One or two, never a list of five. */
  beforeNextTime: string[];
  /** True when this is role, stage and blocker guidance rather than a read on a pattern. */
  general: boolean;
}

/** One thing somebody is waiting on, or one thing they are holding up. */
export interface Dependency {
  what: string;
  /** The other person, named or labelled by the caller. Null when nobody was named. */
  who: string | null;
  /** Whole days since it was first recorded. */
  daysOld: number;
  escalated: boolean;
}

export interface CoachingInputs {
  /** Surfaced pattern codes for THIS participant, with how many periods each was observed over. */
  patterns: { code: string; periodsObserved: number }[];
  role: string | null;
  sessionNumber: number;
  totalSessions: number | null;
  scenario: string | null;
  /** What this person says they are waiting on. */
  waitingOn: Dependency[];
  /** What somebody else's record says they are waiting on from this person. */
  holdingUp: Dependency[];
  saidSomethingSpecific: boolean;
  anythingDocumented: boolean;
}

const LIBRARY = new Map([...BAD_FAITH_CODES, ...POSITIVE_CODES].map((c) => [c.code, c]));

/** What this kind of check-in is about, in the second person, in one clause. */
export function whatThisRoleIsFor(scenario: string | null, role: string | null): string {
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

/** "0 days" is accurate on the day something is recorded and reads as a bug. See what-to-probe. */
const howLong = (n: number) => (n === 0 ? 'since today' : n === 1 ? 'since yesterday' : `for ${n} days`);

/** `what` is text somebody said, so nothing is concatenated onto the front of it. */
const theThing = (what: string) => what.replace(/[.\s]+$/, '');

/**
 * WHAT TO DO ABOUT SOMETHING YOU ARE WAITING ON.
 *
 * The action turns on one fact and it is a fact the record holds: whether this was escalated or
 * only repeated. Asking a fourth time is what somebody does instead of escalating, and telling
 * them to ask again is telling them to keep doing the thing that has not worked.
 */
function aboutWaiting(d: Dependency): string {
  const from = d.who ? ` from ${d.who}` : '';
  const it = theThing(d.what);
  if (d.escalated) {
    return `You have escalated this already: ${it}. Put a date on when you need it by, and say what you will do if it does not arrive.`;
  }
  if (d.daysOld >= 14) {
    return `You have been waiting ${howLong(d.daysOld)}${from} for this, without escalating: ${it}. Put the request in writing with a date, or take it to whoever is above them.`;
  }
  return `Put this in writing${from}, with the date you need it by: ${it}.`;
}

export function whatToWorkOnNext(i: CoachingInputs): WhatToWorkOnNext {
  const about = whatThisRoleIsFor(i.scenario, i.role);
  const where = i.totalSessions ? `session ${i.sessionNumber} of ${i.totalSessions}` : `session ${i.sessionNumber}`;
  const early = i.sessionNumber <= 2;
  const last = i.totalSessions != null && i.sessionNumber >= i.totalSessions;

  const actions: string[] = [];

  /*
   * WHAT THEY ARE BLOCKING GOES FIRST, ALWAYS. Somebody else is stopped, which outranks anything
   * this person is waiting on and anything a pattern says about them.
   */
  for (const d of i.holdingUp.slice(0, 2)) {
    const who = d.who ? `${d.who} has` : 'Somebody has';
    actions.push(
      `${who} been waiting on you ${howLong(d.daysOld)} for this: ${theThing(d.what)}. Either do it, or tell them a date you can do it by.`,
    );
  }
  for (const d of i.waitingOn.slice(0, 2 - Math.min(2, i.holdingUp.length))) {
    actions.push(aboutWaiting(d));
  }

  /*
   * RECURRENCE IS WHAT MAKES A PATTERN. A detection observed in one period has not survived the
   * three-period rule and is not put to somebody as a thing they keep doing.
   */
  const recurring = i.patterns
    .filter((p) => p.periodsObserved >= 2 && !ALIGNMENT_FEED_ONLY_CODES.has(p.code) && LIBRARY.has(p.code))
    .sort((a, b) => b.periodsObserved - a.periodsObserved)[0];
  const entry = recurring ? LIBRARY.get(recurring.code)! : null;

  if (entry && recurring) {
    if (entry.probe?.trim()) actions.push(entry.probe.trim());
    return {
      showingUp: `${entry.signal} Read across ${recurring.periodsObserved} sessions, not once.`,
      whyItMatters: `This is ${where} of ${about}. Something read once is an incident. Read across sessions it becomes what people expect of you, and it is far easier to change now than to argue with later.`,
      beforeNextTime: actions.slice(0, 3),
      general: false,
    };
  }

  if (!actions.length) {
    actions.push(
      !i.saidSomethingSpecific
        ? 'Pick one thing you actually did and write it with a date and who else was involved. One is enough to change what this can say.'
        : !i.anythingDocumented
          ? 'Everything you gave was from memory. Bring one thing next time somebody else could open: a message, a document, a number from a system.'
          : last
            ? 'This is the last session. Say plainly what is still unresolved and who you think owns it, because after this the record stops.'
            : 'Say what happened to the thing you said you would do, with a date.',
    );
  }

  return {
    showingUp: null,
    whyItMatters: early
      ? `This is ${where} of ${about}. Nothing repeats yet, which is normal this early. What decides whether the later sessions are worth anything is what you can point at.`
      : `This is ${where} of ${about}. Nothing has recurred often enough to call it a pattern, which is worth keeping that way.`,
    beforeNextTime: actions.slice(0, 3),
    general: true,
  };
}
