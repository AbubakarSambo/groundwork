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
  /**
   * The same person inside a sentence for this reader: "you" where they are reading their own row, their
   * name otherwise (request 107 b: "Baraka Mwangi and Amani Wekesa are waiting on them" was said to the
   * person they were waiting on). Defaults to `who`.
   */
  whoInASentence?: string;
  participantId: string;
  role: string | null;
  answeredThisSession: boolean;
  /** Surfaced patterns for this person. Recurrence is carried, because it is the finding. */
  patterns: { code: string; periodsObserved: number; signal: string; probe?: string }[];
  /** What they say they are waiting on. */
  /** `since`: the day it began, in words ("27 September"), said in place of a count of days (request 117, part 9). */
  waitingOn: { what: string; who: string | null; daysOld: number; escalated: boolean; kind?: Kind | null; since?: string | null }[];
  /** What somebody else's record says they are waiting on from this person. */
  holdingUp: { what: string; who: string | null; daysOld: number; kind?: Kind | null; since?: string | null }[];
  /** Anything concrete they put on record: a target, a number, an attached document. */
  concrete: string[];
  /** Of `concrete`, the ones stamped as the person's own words, word for word. Only those are quoted. */
  concreteWordForWord?: string[];
  documentsAttached: number;
  /** How many worries or tensions this person has on record, so "nothing is blocked" is not said beside one (B-164). */
  worries?: number;
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
import { aThingInTheirOwnWords } from '../board/a-holder-in-their-own-words';
import { eachWaitUnderWhoeverHoldsIt, waitingOnEachHolder } from './each-wait-under-whoever-holds-it';

/**
 * HOW LONG, IN WORDS SOMEBODY WOULD USE.
 *
 * "0 days now" was read off the page on the day everything was recorded. It is accurate, it reads
 * as a bug, and on a page whose job is to be trusted that costs the same as being wrong. Zero
 * duration is suppressed rather than phrased: it carries no information either way.
 */
const howLong = (n: number) => (n <= 0 ? '' : n === 1 ? ' since yesterday' : ` for ${n} days`);

/**
 * THE DAY THE OLDEST BEGAN, NOT A COUNT OF DAYS FROM THE READING (request 117, part 9). The probe said "for 5
 * days" where the board's row said "4 days", and both moved every time the page was opened. Where the caller
 * gives the day, the sentence says it; a caller that gives only a count keeps the count.
 */
export const theOldestSince = (xs: { daysOld: number; since?: string | null }[]): string | null =>
  [...xs].sort((a, b) => b.daysOld - a.daysOld)[0]?.since ?? null;
const sinceOrHowLong = (xs: { daysOld: number; since?: string | null }[]): string => {
  const since = theOldestSince(xs);
  return since ? ` since ${since}` : howLong(Math.max(...xs.map((d) => d.daysOld)));
};

/**
 * WHAT THEY ARE WAITING ON, AS ITS OWN CLAUSE.
 *
 * The sentence used to run "waiting N days for ${what}", and `what` is text somebody said - so it
 * produced "waiting 0 days for to be paid for the nights". Anything that concatenates a preposition
 * onto captured text will do this eventually. A colon takes whatever the text is.
 */
/** What somebody waits for, said from the reader's side: "my" in their words is "your" to them and "their" to anybody else. */
const theThing = (what: string, theirOwn?: boolean) =>
  (theirOwn === undefined ? what : aThingInTheirOwnWords(what, theirOwn) ?? what).replace(/[.\s]+$/, '');

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

/**
 * Early enough that not escalating is ordinary. Coach it, do not treat it as a finding.
 *
 * AND NEVER WHERE THE ROUND IS NOT KNOWN. This read "This early" on the last session of a
 * three-month engagement, because the caller could not see the check-ins and fell back to session
 * one. A missing session number is not evidence of being early, so a zero or a missing value is
 * treated as "cannot say", and the ordinary sentence is used.
 */
function earlyDays(i: ProbeInput): boolean {
  const n = Number(i.sessionNumber);
  if (!Number.isFinite(n) || n < 1) return false;
  if (n <= 2) return true;
  return i.scenario === 'NEW_HIRE' && n <= 3;
}

export function whatToProbe(i: ProbeInput): WhatToProbe {
  const probe: string[] = [];
  const encourage: string[] = [];
  /* Every sentence has its person in it, by name or as "you", never "them" and never no subject at all (request 107 b). */
  const them = (i.whoInASentence ?? i.who).trim() || 'this person';
  const you = them.toLowerCase() === 'you';
  const He = you ? 'You' : them.charAt(0).toUpperCase() + them.slice(1);
  const is = you ? 'are' : 'is';
  const has = you ? 'have' : 'has';

  if (!i.answeredThisSession) {
    probe.push(`${He} ${has} not answered this session, so nothing below is from this round.`);
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
    const Who = `${who.charAt(0).toUpperCase()}${who.slice(1)}`;
    const many = named.length > 1 || /^you$/i.test(who);
    /* Each thing once: a wait recorded twice is one thing (item 18). */
    const items = andList([...new Map(i.holdingUp.map((d) => [theThing(d.what, false).toLowerCase(), theThing(d.what, false)] as const)).values()]);
    const since = theOldestSince(i.holdingUp);
    probe.push(
      !since
        ? `${Who} ${many ? 'are' : 'is'} waiting on ${you ? 'you' : them}${howLong(oldest)} for ${items}. Ask what that is waiting on.`
        : i.holdingUp.length === 1 && !many
          ? `${Who} has been waiting on ${you ? 'you' : them} for ${items} since ${since}. Ask what that is waiting on.`
          : `${Who} ${many ? 'are' : 'is'} waiting on ${you ? 'you' : them} for ${items}. The first of these waits began on ${since}. Ask what that is waiting on.`,
    );
    const kind = whatKindOfThing(i.holdingUp);
    if (kind) probe.push(kind);
  }

  if (i.waitingOn.length) {
    const escalated = i.waitingOn.filter((d) => d.escalated);
    const notYet = i.waitingOn.filter((d) => !d.escalated);
    if (escalated.length) {
      probe.push(
        `${He} ${has} been waiting for ${andList(escalated.map((d) => theThing(d.what, you)))}${sinceOrHowLong(escalated)}, and ${has} raised it higher. Ask what happened after that.`,
      );
    }
    /*
     * A WAIT ON THE READER IS NOT ONE TO RAISE HIGHER (item 21, the founder's board). Ada read "Tunde Bakare has
     * been waiting on you for the formalized agreement, ... since 30 September, and nothing on record says it was
     * raised higher. Ask what has stopped Tunde Bakare raising it." The person who could move it is the one
     * reading, so the sentence says that instead, in the words the board's own row uses.
     */
    const onTheReader = notYet.filter((d) => /^you$/i.test((d.who ?? '').trim()));
    if (onTheReader.length && !you) {
      const since = theOldestSince(onTheReader);
      const things = andList([...new Map(onTheReader.map((d) => [theThing(d.what, false).toLowerCase(), theThing(d.what, false)] as const)).values()]);
      probe.push(`${He} ${has} been waiting on you for ${things}${since ? ` since ${since}` : howLong(Math.max(...onTheReader.map((d) => d.daysOld)))}. Give ${them} an answer, or say when you will.`);
      const kind = whatKindOfThing(onTheReader);
      if (kind) probe.push(kind);
    }
    const elsewhere = onTheReader.length && !you ? notYet.filter((d) => !onTheReader.includes(d)) : notYet;
    if (elsewhere.length) {
      const notYet = elsewhere;
      const oldest = Math.max(...notYet.map((d) => d.daysOld));
      /* Each wait under whoever holds it, and each thing once (item 18). See each-wait-under-whoever-holds-it.ts. */
      const onEach = waitingOnEachHolder(eachWaitUnderWhoeverHoldsIt(notYet));
      const since = theOldestSince(notYet);
      /* With the day it began where the caller gives it: "has been waiting on you for the price list since 28 September". */
      const waited = since
        ? `${He} ${has} been waiting ${onEach}${onEach.includes(', and ') ? ',' : ''} since ${since}`
        : `${He} ${has} been waiting${howLong(oldest)} ${onEach}`;
      probe.push(
        earlyDays(i)
          ? `${waited}, and nothing on record says it was raised higher. ${you ? 'It is early. What is being held up, and would help raising it be useful?' : `It is early, so ask ${them} what is being held up and whether help raising it would be useful.`}`
          : `${waited}, and nothing on record says it was raised higher. Ask what has stopped ${you ? 'you' : them} raising it.`,
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
    const said = /[.!?]$/.test(p.signal.trim()) ? p.signal.trim() : `${p.signal.trim()}.`;
    probe.push(
      `${said} On record across ${p.periodsObserved} sessions.${p.probe ? ` Worth asking: ${p.probe}` : ''}`,
    );
  }

  if (i.concrete.length) {
    /* "Checkable" is the product's own word for this and it does not belong in front of a person -
       it is on the list of words we do not use, and it was printed three times on one report. */
    /*
     * THEIR OWN LINES, IN QUOTATION MARKS, AND THE POINT IN A SENTENCE OF ITS OWN (request 111 e). It read
     * "Worth getting on record, where anyone could check it later: Twelve signed supply contracts ... and I
     * want us to sign 12 shops.": two pieces joined with a colon, and "I" in the middle of a sentence about
     * somebody else. The lines are what the person said, so they are quoted as theirs.
     */
    const chosen = i.concrete.slice(0, 2);
    const theirWords = new Set(i.concreteWordForWord ?? []);
    if (chosen.every((t) => theirWords.has(t))) {
      const lines = chosen.map((t) => `"${theThing(t).replace(/^["“]|["”]$/g, '')}."`);
      encourage.push(lines.length === 1
        ? `${He} said, ${lines[0]} That is worth getting on record, so anyone can check it later.`
        : `${He} said, ${lines[0]} ${He} also said, ${lines[1]} Both are worth getting on record, so anyone can check them later.`);
    } else {
      /* A line the record wrote in its own words is not a quote, and it is not ours to reword, so it is counted. */
      encourage.push(`${He} put ${chosen.length === 1 ? 'one thing' : 'two things'} on record that anyone could check later, which is worth recognising.`);
    }
  }
  if (i.documentsAttached > 0) {
    encourage.push(
      /* With its person in it (item 21, the distribution operations board): "Attached a document, ..." had no subject. */
      `${He} attached ${i.documentsAttached === 1 ? 'a document' : `${i.documentsAttached} documents`}, so ${you ? 'your' : 'their'} side can be checked rather than taken on trust.`,
    );
  }
  if (i.answeredThisSession && !encourage.length && (i.waitingOn.length || i.patterns.length)) {
    /* Kwabena read "Named a problem out loud rather than reporting everything as fine." with nobody in it (item 21). */
    encourage.push(`${He} named a problem out loud rather than reporting everything as fine.`);
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
    /*
     * A FULL SENTENCE THAT IS TRUE OF THE RECORD (B-164). "There is nothing recorded as blocked." was read beside Esther's own worry that three shops
     * were waiting on a credit decision. No wait row is not no worry, so the sentence says which of the two the record holds.
     */
    const ownWork = (i.whoInASentence ?? i.who) === 'you' ? 'your work' : `${i.who}'s work`;
    triedToUnblock = (i.worries ?? 0) > 0
      ? `No wait has been recorded against a named person, but ${i.worries === 1 ? `a worry about ${ownWork} is` : `${i.worries} worries about ${ownWork} are`} on record, so the record does not say what was done about it.`
      : `Nothing is recorded as holding up ${ownWork}.`;
  } else {
    const escalated = i.waitingOn.filter((d) => d.escalated).length;
    const asked = i.waitingOn.length - escalated;
    if (escalated && asked) {
      triedToUnblock = `${escalated} of ${i.waitingOn.length} ${escalated === 1 ? 'was' : 'were'} taken above the person ${escalated === 1 ? 'it was' : 'they were'} with. The ${asked === 1 ? 'other was' : 'others were'} asked for, and nothing more is on record.`;
    } else if (escalated) {
      triedToUnblock = escalated === 1 ? 'It was taken above the person it was with.' : `All ${escalated} were taken above the person they were with.`;
    } else if (asked) {
      triedToUnblock = `It was asked for, and nothing on record shows it was taken any further. It does not say whether anything happened outside the check-ins.`;
    } else {
      triedToUnblock = 'The record does not say what they did about it.';
    }
  }

  return { who: i.who, participantId: i.participantId, probe, encourage, triedToUnblock };
}
