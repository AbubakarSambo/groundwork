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
  waitingOn: { what: string; who: string | null; daysOld: number; escalated: boolean }[];
  /** What somebody else's record says they are waiting on from this person. */
  holdingUp: { what: string; who: string | null; daysOld: number }[];
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

/**
 * HOW LONG, IN WORDS SOMEBODY WOULD USE.
 *
 * "0 days now" was read off the page on the day everything was recorded. It is accurate and it
 * reads as a bug, which on a page whose job is to be trusted is the same cost as being wrong.
 */
const howLong = (n: number) => (n === 0 ? 'since today' : n === 1 ? 'since yesterday' : `for ${n} days`);

/**
 * WHAT THEY ARE WAITING ON, AS ITS OWN CLAUSE.
 *
 * The sentence used to run "waiting N days for ${what}", and `what` is text somebody said - so it
 * produced "waiting 0 days for to be paid for the nights". Anything that concatenates a preposition
 * onto captured text will do this eventually. A colon takes whatever the text is.
 */
const theThing = (what: string) => what.replace(/[.\s]+$/, '');

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
   * WHAT THEY ARE HOLDING UP FIRST. Somebody else is stopped, it is the most actionable thing on
   * the page, and the lead is usually the only person who can unstick it.
   */
  for (const d of i.holdingUp) {
    const who = d.who ?? 'Somebody';
    probe.push(`${who} is waiting on them ${howLong(d.daysOld)} for this: ${theThing(d.what)}. Ask what it is waiting on.`);
  }

  for (const d of i.waitingOn) {
    const from = d.who ? ` from ${d.who}` : '';
    if (d.escalated) {
      probe.push(`Waiting ${howLong(d.daysOld)}${from} for this: ${theThing(d.what)}. They have escalated it, so ask what happened after they did.`);
    } else if (earlyDays(i)) {
      probe.push(`Waiting ${howLong(d.daysOld)}${from} for this: ${theThing(d.what)}. No escalation on record, and this early that is worth showing them rather than asking about.`);
    } else {
      probe.push(`Waiting ${howLong(d.daysOld)}${from} for this: ${theThing(d.what)}. No escalation on record. Ask what has stopped them raising it.`);
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

  for (const c of i.concrete.slice(0, 2)) {
    encourage.push(`Put something checkable on record: ${theThing(c)}.`);
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
