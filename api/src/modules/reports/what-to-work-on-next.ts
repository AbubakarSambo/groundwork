import { BAD_FAITH_CODES, POSITIVE_CODES, ALIGNMENT_FEED_ONLY_CODES } from '../patterns/pattern-library';
import { roleMapFor, MIN_COACHING_CONFIDENCE, type RoleMap } from '../board/role-maps';
import { WHAT_IT_MEANS, WHO_CAN_MOVE_IT, type Kind } from '../board/what-kind-of-thing-is-in-the-way';

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
  /**
   * THE PART THAT IS ABOUT YOU AND NOBODY ELSE, AND IT IS FIRST ON PURPOSE.
   *
   * Everything else here is true of a role or a stage. This is true of one person's record, and a
   * reader who sees it first reads the rest as being about them too. Empty where there is nothing
   * of theirs to say, which is a real state and better than a category sentence filling the space.
   */
  aboutYou: string[];
  /** What keeps showing up, in plain words, with what makes it a recurrence. Null when none. */
  showingUp: string | null;
  /** Why it matters for somebody in this role at this point. */
  whyItMatters: string;
  /** The specific things to do before the next session. One or two, never a list of five. */
  beforeNextTime: string[];
  /** True when this is role, stage and blocker guidance rather than a read on a pattern. */
  general: boolean;
  /**
   * WHAT THE ROLE MAP SAYS, WHERE THERE IS ONE. Null when no function was detected, or when it was
   * detected below MIN_COACHING_CONFIDENCE - see `whyNoRoleMap`.
   *
   * `onTrack` and `goingWrong` come from the map verbatim. `noticed`/`lookingLike` are the paired
   * failure and success signals, and only appear when the coaching engine actually recorded which
   * behaviour it noticed: an unpaired failure signal is a label stapled to somebody.
   */
  role: {
    label: string;
    onTrack: string;
    goingWrong: string;
    protectAgainst: string;
    noticed: string | null;
    lookingLike: string | null;
  } | null;
  /** Why there is no role map, said plainly rather than left as an absence. */
  whyNoRoleMap: string | null;
}

/** One thing somebody is waiting on, or one thing they are holding up. */
export interface Dependency {
  what: string;
  /** The other person, named or labelled by the caller. Null when nobody was named. */
  who: string | null;
  /** Whole days since it was first recorded. */
  daysOld: number;
  escalated: boolean;
  /** What kind of thing is in the way, where the person waiting said. Decides who can move it. */
  kind?: Kind | null;
}

export interface CoachingInputs {
  /** Surfaced pattern codes for THIS participant, with how many periods each was observed over. */
  patterns: { code: string; periodsObserved: number }[];
  /** How this person's part is described, when anybody has said. Not the detected function. */
  role: string | null;
  /**
   * WHAT KIND OF WORK THIS PERSON'S RECORD IS ACTUALLY MADE OF, and how sure the engine is.
   *
   * `detectFunction` has been writing these two columns for a long time and nothing on the report
   * ever read them, which is why 749 lines of role map were dead weight here.
   */
  detectedFunction: string | null;
  functionConfidence: number | null;
  /**
   * The behaviour the coaching engine noticed, as it stored it. Matched back against the map's
   * `failureSignals` to find its paired success signal. Null when the engine has never run for
   * this person, which is most people today.
   */
  noticedBehaviour: string | null;
  sessionNumber: number;
  totalSessions: number | null;
  /**
   * WHETHER THIS IS THE CLOSING SESSION, WHICH THE COUNT CANNOT TELL YOU. A lead can end a ground
   * early - "begin the closing session" on session 4 of 6 - and `sessionNumber >= totalSessions`
   * then reads false. Read live: the closing report told the lead what to do "before the next
   * session" and handed them an opener for a conversation that was never going to happen.
   */
  isFinalSession?: boolean;
  scenario: string | null;
  /** What this person says they are waiting on. */
  waitingOn: Dependency[];
  /** What somebody else's record says they are waiting on from this person. */
  holdingUp: Dependency[];
  saidSomethingSpecific: boolean;
  anythingDocumented: boolean;
  /**
   * WHAT THIS PERSON'S OWN RECORD SAYS, WHICH IS WHAT 4.4 WAS ABOUT.
   *
   * The note was built out of the role map and the blockers, and both are about a KIND of person.
   * Read live, the first thing on it was "this kind of sales and expansion work often faces unfair
   * reading, which you should consider before making assumptions about your current standing" -
   * true of every salesperson alive, and deletable with nothing lost.
   *
   * These are sentences that could only have been written for this reader: a figure, a date, or a
   * thing off their own lines. See what-your-own-record-says. Empty is normal and fine.
   */
  aboutYou?: string[];
}

const LIBRARY = new Map([...BAD_FAITH_CODES, ...POSITIVE_CODES].map((c) => [c.code, c]));

/**
 * WHICH ROLE MAP APPLIES, AND WHY THERE IS NOT ONE.
 *
 * THE HAND-WRITTEN SWITCH THIS REPLACES was seven lines of `case 'NEW_HIRE': return 'the first
 * months of a new role'` sitting beside 749 lines of role map that says, per function, what on
 * track means, what going wrong looks like, the behaviours to notice, their paired success
 * signals, and what that function's people get unfairly read as. The switch existed because
 * nothing here read `detectedFunction`, which is the column that selects the map.
 *
 * LOW CONFIDENCE DEGRADES TO STAGE, NOT TO A WRONG MAP. `priorFunctionFromRole` returns 0.4 for a
 * title alone, deliberately, because a title is weak evidence - somebody titled product manager
 * whose record is all coordination reads as project management, and coaching them out of the wrong
 * map is worse than not coaching them. Below `MIN_COACHING_CONFIDENCE` there is no map and the
 * note says so, rather than quietly reading against a function nobody established.
 */
export function whichRoleMap(
  detectedFunction: string | null,
  confidence: number | null,
): { map: RoleMap | null; why: string | null } {
  const map = roleMapFor(detectedFunction);
  if (!map) {
    return {
      map: null,
      why: 'What kind of work this is has not been read from the record yet, so this is about where you are rather than about the role.',
    };
  }
  if ((confidence ?? 0) < MIN_COACHING_CONFIDENCE) {
    return {
      map: null,
      why: `Your record looks like ${map.label.toLowerCase()}, but not clearly enough to coach against. Nothing below reads you against that; a few more sessions will settle it.`,
    };
  }
  return { map, why: null };
}

/**
 * THE PAIR, WHERE THE COACHING ENGINE ACTUALLY NOTICED SOMETHING.
 *
 * `failureSignals[n]` and `successSignals[n]` are paired by index so the coach always knows what it
 * is coaching TOWARD. Handing somebody the failure half alone is the label this product refuses to
 * produce, so both or neither.
 *
 * Matched by the stored text rather than by an index, because the index lives inside the coaching
 * engine's own call and the report reads `coachingState.staircase`, which is the behaviour as it
 * was written down.
 */
export function thePair(map: RoleMap, noticed: string | null): { noticed: string; lookingLike: string } | null {
  if (!noticed?.trim() || !map.failureSignals?.length || !map.successSignals?.length) return null;
  const want = noticed.trim().toLowerCase();
  const at = map.failureSignals.findIndex((f) => f.trim().toLowerCase() === want);
  if (at < 0 || at >= map.successSignals.length) return null;
  return { noticed: map.failureSignals[at], lookingLike: map.successSignals[at] };
}

/**
 * HOW LONG, AND NOTHING AT ALL WHEN THE ANSWER CARRIES NO INFORMATION.
 *
 * "Waiting since today", on a session-1 report where every row was written today, tells the reader
 * nothing and costs them a clause. Zero duration is suppressed rather than phrased.
 */
const howLong = (n: number) => (n <= 0 ? '' : n === 1 ? ' since yesterday' : ` for ${n} days`);

/** `what` is text somebody said, so nothing is concatenated onto the front of it. */
const theThing = (what: string) => what.replace(/[.\s]+$/, '');

/**
 * WHAT KIND OF THING IS IN THE WAY, SAID ONCE FOR THE GROUP.
 *
 * Both surfaces said "waiting on X" when the row already knew whether X is a thing that does not
 * exist yet, two parts that do not fit, a decision nobody has made, or something seen coming. The
 * kind decides who can move it, which is the actionable part. One sentence per group, in the
 * library's own words - never composed here - and only when every item in the group agrees, because
 * a mixed group has no single kind and inventing one is worse than saying nothing.
 */
export const whatKindOfThing = (xs: { kind?: Kind | null }[]): string | null => {
  const kinds = [...new Set(xs.map((x) => x.kind).filter(Boolean))] as Kind[];
  if (kinds.length !== 1) return null;
  return `${WHAT_IT_MEANS[kinds[0]]} ${WHO_CAN_MOVE_IT[kinds[0]]}`;
};

/** Two things are "a and b", three are "a, b and c". One list, not one sentence each. */
export const andList = (xs: string[]): string =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

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

/**
 * The map, as the reader gets it. `protectAgainst` travels with it always: it is the fairness half
 * of the map, it is the reason the map is a map rather than a prompt, and dropping it would leave
 * only the stick.
 */
function roleBlock(map: RoleMap | null, pair: { noticed: string; lookingLike: string } | null) {
  if (!map) return null;
  return {
    label: map.label,
    onTrack: map.onTrackMeans,
    goingWrong: map.goingWrongLooksLike,
    protectAgainst: map.protectAgainst,
    noticed: pair?.noticed ?? null,
    lookingLike: pair?.lookingLike ?? null,
  };
}

export function whatToWorkOnNext(i: CoachingInputs): WhatToWorkOnNext {
  /* First on the page and first here: the part that could only have been written for this reader. */
  const aboutYou = i.aboutYou ?? [];
  const { map, why: whyNoRoleMap } = whichRoleMap(i.detectedFunction, i.functionConfidence);
  const pair = map ? thePair(map, i.noticedBehaviour) : null;
  const where = i.totalSessions ? `session ${i.sessionNumber} of ${i.totalSessions}` : `session ${i.sessionNumber}`;
  /*
   * WHAT THIS IS ABOUT, FROM THE MAP WHERE THERE IS ONE. The map's label is what kind of work this
   * person's record is made of, which is a stronger fact than the scenario the check-in was opened
   * under - a new-hire check-in for a sales hire is still sales.
   *
   * The labels are domain names ("Operations and people", "Project management"), so they take a
   * preposition badly: "in operations and people" was read back off the page as wrong, and it is.
   * They sit after "work" instead, which is the only position that holds for all ten.
   */
  const about = map
    ? `${map.label.toLowerCase()} work`
    : i.role?.trim() ? `your work as ${i.role.trim().toLowerCase()}` : 'this work';

  const early = i.sessionNumber <= 2;
  const last = i.isFinalSession === true || (i.totalSessions != null && i.sessionNumber >= i.totalSessions);
  const actions: string[] = [];

  /*
   * GROUPING HAPPENS HERE, NOT IN THE PHRASING.
   *
   * Three things one person is waiting on used to be three sentences, each "Put this in writing,
   * with the date you need it by: X". A phrasing pass over three near-identical drafts is a model
   * being asked to vary a mail merge, which is the wrong job and produces the wrong thing. One
   * claim about three items is one drafted sentence.
   *
   * WHAT THEY ARE BLOCKING GOES FIRST, ALWAYS. Somebody else is stopped, which outranks anything
   * this person is waiting on and anything a pattern says about them.
   */
  if (i.holdingUp.length) {
    const named = [...new Set(i.holdingUp.map((d) => d.who).filter(Boolean))] as string[];
    const who = named.length === 1 ? named[0] : named.length ? `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}` : 'Somebody';
    const items = i.holdingUp.map((d) => theThing(d.what));
    const oldest = Math.max(...i.holdingUp.map((d) => d.daysOld));
    actions.push(
      `${who} ${named.length > 1 ? 'are' : 'is'} waiting on you${howLong(oldest)} for ${andList(items)}. Either do ${items.length > 1 ? 'them' : 'it'}, or give a date you can do ${items.length > 1 ? 'them' : 'it'} by.`,
    );
    const kind = whatKindOfThing(i.holdingUp);
    if (kind) actions.push(kind);
  }

  if (i.waitingOn.length) {
    const escalated = i.waitingOn.filter((d) => d.escalated);
    const notYet = i.waitingOn.filter((d) => !d.escalated);
    if (notYet.length) {
      const from = [...new Set(notYet.map((d) => d.who).filter(Boolean))] as string[];
      const oldest = Math.max(...notYet.map((d) => d.daysOld));
      const items = andList(notYet.map((d) => theThing(d.what)));
      actions.push(
        oldest >= 14
          ? `You have been waiting${howLong(oldest)}${from.length ? ` on ${andList(from)}` : ''} for ${items}, without escalating. Put the request in writing with a date, or take it to whoever is above them.`
          : `Put ${items} in writing${from.length ? ` to ${andList(from)}` : ''}, with the date you need ${notYet.length > 1 ? 'them' : 'it'} by.`,
      );
      const kind = whatKindOfThing(notYet);
      if (kind) actions.push(kind);
    }
    if (escalated.length) {
      actions.push(
        `You have escalated ${andList(escalated.map((d) => theThing(d.what)))} already. Put a date on when you need ${escalated.length > 1 ? 'them' : 'it'} by, and say what you will do if nothing arrives.`,
      );
    }
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
      aboutYou,
      /* Says where it comes from: the same shape came up in N of their own sessions. "Read across 3 sessions"
         read as a verdict handed down rather than a count of their own record (20 Sep 2026). */
      showingUp: `${entry.signal} This came up in ${recurring.periodsObserved} of your sessions, not once.`,
      /* The map is CONTEXT for how this is said, not a sentence in it. See the service, which hands
         the map to the wording pass as context; the engine's claim is the stage and the recurrence. */
      whyItMatters: `This is ${where} of ${about}. Something read once is an incident. Read across sessions it becomes what people expect of you, and it is far easier to change now than to argue with later.`,
      /* All of them. The list can hold six and the pattern probe is pushed last, so a cap at three
         made the probe the first thing cut - the one line that was about the recurrence itself. The
         page shows the first three and the rest under "also"; nothing is dropped here. */
      beforeNextTime: actions,
      general: false,
      role: roleBlock(map, pair),
      whyNoRoleMap,
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
    aboutYou,
    showingUp: null,
    whyItMatters: early
      ? `This is ${where} of ${about}. Nothing repeats yet, which is normal this early. What decides whether the later sessions are worth anything is what you can point at.`
      : `This is ${where} of ${about}. Nothing has recurred often enough to call it a pattern, which is worth keeping that way.`,
    beforeNextTime: actions,
    general: true,
    role: roleBlock(map, pair),
    whyNoRoleMap,
  };
}
