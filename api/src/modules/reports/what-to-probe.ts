/**
 * WHAT TO PROBE EACH PERSON ON, AND WHAT TO ENCOURAGE. THE LEAD SEES THIS AND NOBODY ELSE DOES.
 *
 * A lead reads the same report as everybody and then has to decide what to say to each person.
 * The product had nothing for that moment, so the decision was made from a paragraph of synthesis
 * and whatever the lead already believed.
 *
 * THIS RENDERS OBSERVATIONS AND QUESTIONS, NEVER A VERDICT. Not on character, not on motivation,
 * not on effort. No "making excuses", no "not trying", no "underperforming". A line saying
 * somebody has asked twice in three weeks and not escalated is a fact with a date on it, and a
 * lead can raise it. A line saying somebody is not trying is a conclusion the record cannot carry
 * and the person cannot answer.
 *
 * EVERY LINE TRACES TO A ROW. Nothing here is asked of a model and nothing is inferred from
 * absence: the record being silent about whether somebody tried is reported as the record being
 * silent, never as them not having tried. That distinction is the whole file.
 *
 * CALIBRATED TO ROLE AND STAGE. A new hire in session 2 who has not escalated is somebody to coach.
 * The same fact in session 8 of a renewal is a finding. The observation is identical; what changes
 * is what it is worth raising as, and the caller passes the stage so this can say which.
 *
 * IT AGREES WITH WHAT THE PERSON WAS TOLD. The member's own coaching note reads the same rows -
 * the same dependencies, the same surfaced patterns - so a lead probing somebody on a thing will
 * find that person already told to move it. The conversation is not an ambush.
 */
export interface ProbeInput {
  who: string;
  participantId: string;
  role: string | null;
  answeredThisSession: boolean;
  /** Surfaced patterns for this person. Recurrence is carried, because it is the finding. */
  patterns: { code: string; periodsObserved: number; signal: string; probe?: string }[];
  /** What they say they are waiting on. */
  waitingOn: { what: string; who: string | null; daysOld: number; escalated: boolean; kind?: Kind | null }[];
  /** What somebody else's record says they are waiting on from this person. */
  holdingUp: { what: string; who: string | null; daysOld: number; kind?: Kind | null }[];
  /** Anything concrete they put on record: a target, a number, an attached document. */
  concrete: string[];
  documentsAttached: number;
  sessionNumber: number;
  totalSessions: number | null;
  scenario: string | null;
}

export interface WhatToProbe {
  who: string;
  participantId: string;
  /** Specific, answerable, anchored to something in the record. Empty when nothing is. */
  probe: string[];
  /** Real things worth saying, so this is not purely corrective. Empty when there are none. */
  encourage: string[];
  /** What the record shows they did about being stuck. Never whether it was enough. */
  triedToUnblock: string;
}
import { WHAT_IT_MEANS, WHO_CAN_MOVE_IT, type Kind } from '../board/what-kind-of-thing-is-in-the-way';

/**
 * HOW LONG, IN WORDS SOMEBODY WOULD USE.
 *
 * "0 days now" was read off the page on the day everything was recorded. It is accurate, it reads
 * as a bug, and on a page whose job is to be trusted that costs the same as being wrong. Zero
 * duration is suppressed rather than phrased: it carries no information either way.
 */
const howLong = (n: number) => (n <= 0 ? '' : n === 1 ? ' since yesterday' : ` for ${n} days`);

/**
 * WHAT THEY ARE WAITING ON, AS ITS OWN CLAUSE.
 *
 * The sentence used to run "waiting N days for ${what}", and `what` is text somebody said - so it
 * produced "waiting 0 days for to be paid for the nights". Anything that concatenates a preposition
 * onto captured text will do this eventually. A colon takes whatever the text is.
 */
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
const andList = (xs: string[]): string =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

/** Early enough that not escalating is ordinary. Coach it, do not treat it as a finding. */
function earlyDays(i: ProbeInput): boolean {
  if (i.sessionNumber <= 2) return true;
  return i.scenario === 'NEW_HIRE' && i.sessionNumber <= 3;
}

export function whatToProbe(i: ProbeInput): WhatToProbe {
  const probe: string[] = [];
  const encourage: string[] = [];

  if (!i.answeredThisSession) {
    probe.push('Has not answered this session. Nothing below is from this round.');
  }

  /*
   * ONE CLAIM ABOUT THREE THINGS IS ONE SENTENCE.
   *
   * Three items one person is waiting on used to be three probes, identical apart from the noun.
   * Read back off the page as exactly that. Grouping belongs in the draft: a phrasing pass over
   * three near-identical sentences is a model being asked to vary a mail merge.
   *
   * WHAT THEY ARE HOLDING UP FIRST. Somebody else is stopped, it is the most actionable thing on
   * the page, and the lead is usually the only person who can unstick it.
   */
  if (i.holdingUp.length) {
    const named = [...new Set(i.holdingUp.map((d) => d.who).filter(Boolean))] as string[];
    const who = named.length ? andList(named) : 'Somebody';
    const oldest = Math.max(...i.holdingUp.map((d) => d.daysOld));
    probe.push(
      `${who} ${named.length > 1 ? 'are' : 'is'} waiting on them${howLong(oldest)} for ${andList(i.holdingUp.map((d) => theThing(d.what)))}. Ask what that is waiting on.`,
    );
    const kind = whatKindOfThing(i.holdingUp);
    if (kind) probe.push(kind);
  }

  if (i.waitingOn.length) {
    const escalated = i.waitingOn.filter((d) => d.escalated);
    const notYet = i.waitingOn.filter((d) => !d.escalated);
    if (escalated.length) {
      const oldest = Math.max(...escalated.map((d) => d.daysOld));
      probe.push(
        `Waiting${howLong(oldest)} for ${andList(escalated.map((d) => theThing(d.what)))}, and has escalated. Ask what happened after they did.`,
      );
    }
    if (notYet.length) {
      const from = [...new Set(notYet.map((d) => d.who).filter(Boolean))] as string[];
      const oldest = Math.max(...notYet.map((d) => d.daysOld));
      const items = andList(notYet.map((d) => theThing(d.what)));
      probe.push(
        earlyDays(i)
          ? `Waiting${howLong(oldest)}${from.length ? ` on ${andList(from)}` : ''} for ${items}, with no escalation on record. This early that is worth showing them rather than asking about.`
          : `Waiting${howLong(oldest)}${from.length ? ` on ${andList(from)}` : ''} for ${items}, with no escalation on record. Ask what has stopped them raising it.`,
      );
      const kind = whatKindOfThing(notYet);
      if (kind) probe.push(kind);
    }
  }

  /*
   * RECURRENCE AS A FACT WITH ITS HISTORY. "Observed across four sessions" is countable and the
   * person can answer it. Anything about why they do it is not.
   */
  for (const p of i.patterns.filter((x) => x.periodsObserved >= 2)) {
    probe.push(
      `${p.signal} On record across ${p.periodsObserved} sessions.${p.probe ? ` Worth asking: ${p.probe}` : ''}`,
    );
  }

  if (i.concrete.length) {
    encourage.push(`Put something checkable on record: ${andList(i.concrete.slice(0, 2).map(theThing))}.`);
  }
  if (i.documentsAttached > 0) {
    encourage.push(
      `Attached ${i.documentsAttached === 1 ? 'a document' : `${i.documentsAttached} documents`}, so their side can be checked rather than taken on trust.`,
    );
  }
  if (i.answeredThisSession && !encourage.length && (i.waitingOn.length || i.patterns.length)) {
    encourage.push('Named a problem out loud rather than reporting everything as fine.');
  }

  /*
   * WHAT THEY DID ABOUT BEING STUCK, AND NOTHING ABOUT WHETHER IT WAS ENOUGH.
   *
   * The third read is the one most likely to turn into a verdict, so it is the most literal. A
   * silent record says so. Reading effort out of an empty table is how a product ends up telling a
   * manager that somebody is not trying.
   */
  let triedToUnblock: string;
  if (!i.waitingOn.length && !i.holdingUp.length) {
    triedToUnblock = 'Nothing recorded as blocked, so there is nothing here about unblocking.';
  } else {
    const escalated = i.waitingOn.filter((d) => d.escalated).length;
    const asked = i.waitingOn.length - escalated;
    if (escalated && asked) {
      triedToUnblock = `Escalated ${escalated} of ${i.waitingOn.length}. The ${asked === 1 ? 'other was' : 'others were'} asked for and not escalated.`;
    } else if (escalated) {
      triedToUnblock = `Escalated ${escalated === 1 ? 'it' : `all ${escalated}`}.`;
    } else if (asked) {
      triedToUnblock = `Asked, and the record shows no escalation. It does not say whether anything happened outside the check-ins.`;
    } else {
      triedToUnblock = 'The record does not say what they did about it.';
    }
  }

  return { who: i.who, participantId: i.participantId, probe, encourage, triedToUnblock };
}
