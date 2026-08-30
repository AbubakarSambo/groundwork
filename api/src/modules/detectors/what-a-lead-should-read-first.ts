/**
 * WHAT THE RECORD HOLDS ABOUT ONE PERSON, FOR THE CONVERSATION BEFORE THE CONVERSATION.
 *
 * Asked directly: "does this give comments to their leads before a performance evaluation?" The
 * parts have all existed for a while - open findings, what somebody committed to, what is waiting
 * on their desk, which objectives they carry, what the reports they were in came down to - and
 * nothing ever put them in front of the one person about to walk into a room and talk about them.
 * So a lead prepared for that conversation from memory, which is the failure this product was
 * built to end, happening inside the product.
 *
 * IT IS NOT AN ASSESSMENT AND MUST NEVER READ LIKE ONE. Everything here is a question worth asking,
 * carrying where it came from so it can be checked. The moment this produces a number, a rank, or a
 * sentence with "should" in it about a person, it becomes the thing every other guard in this
 * codebase exists to prevent - a machine handing somebody a verdict they did not reach themselves.
 *
 * WHAT IT SAYS IT DOES NOT KNOW is not politeness, it is the point. A read that lists four findings
 * and stops implies those four are the whole picture. Most of what somebody does is not in here,
 * and a lead walking in believing otherwise is worse off than one who brought nothing.
 */

export interface CommitmentRow {
  text: string;
  state: string;
  dueAt: Date | null;
  statedAt: Date;
}

export interface WaitingRow {
  what: string;
  status: string;
  waitingDays: number;
  /** Who it sits with. Named, because a handoff with no name is not a handoff. */
  onLabel: string | null;
  /** Set once the other side has been told. See shouldEscalate. */
  escalatedAt: Date | null;
  /**
   * Whether the claim names who and what - `blockerHasSubstance` in board/reads.ts.
   *
   * Being blocked switches off every negative read about somebody, which makes it the most valuable
   * thing on the board to claim. A read that repeats a one-line mention as though it were a handoff
   * launders an excuse into protection, which is the opposite of what this is for.
   */
  hasSubstance: boolean;
}

export interface FindingRow {
  key: string;
  says: string | null;
  subjectExternalId: string | null;
  firstSeenAt: Date;
}

export interface CarriedSubject {
  externalId: string;
  title: string;
  /** Null when nothing has ever been sent for it - which is itself worth saying. */
  measure: string | null;
  lastSeenAt: Date | null;
}

export interface Material {
  personLabel: string;
  /** Released reports this person was in. Zero is a fact about the record, not about them. */
  finishedCheckIns: number;
  commitments: CommitmentRow[];
  /** Handoffs this person is waiting on somebody else for. */
  waitingOnOthers: WaitingRow[];
  /** Handoffs somebody else is waiting on them for. */
  othersWaiting: WaitingRow[];
  findings: FindingRow[];
  carrying: CarriedSubject[];
  now: Date;
}

export interface Section {
  heading: string;
  /** Each line is a thing that is on the record, phrased as something to ask about. */
  lines: string[];
  /** Where these came from, so the lead can go and look rather than take our word. */
  source: string;
}

export interface TheRead {
  person: string;
  sections: Section[];
  /**
   * How complete this picture is, worked out rather than disclaimed - and the same answer the
   * person it is about gets. See howCompleteThePictureIs.
   */
  completeness: Completeness;
  /** Stated every time, not only when the record is thin. */
  notInHere: string[];
  /** The sentence that has to survive every rewrite of this file. */
  refusal: string;
}

import { ESCALATE_AFTER_DAYS } from '../webhooks/a-handoff-that-has-sat-too-long';
import { ConfidenceBand } from '../reports/confidence-in-the-picture';

export const REFUSAL =
  'This is not an assessment and does not say how this person is doing. It is what the record holds, '
  + 'so you can ask about it rather than remember it. Nothing here has been weighed, scored or ranked, '
  + 'and none of it knows why anything happened.';

/** Late only where a real date was given. Words with no date are what somebody said, never a miss. */
const isLate = (c: CommitmentRow, now: Date) => c.dueAt !== null && c.dueAt < now;

const days = (from: Date, now: Date) => Math.max(0, Math.floor((now.getTime() - from.getTime()) / 86_400_000));

/**
 * A HANDOFF IS FLAGGED, ADVISED ON, AND THE OTHER SIDE IS TOLD. IT IS NOT A NOTE.
 *
 * The first version of this listed "the schema sign-off - 12 days, blocking." and stopped, which is
 * a lead reading that somebody is stuck and having no idea what to do about it - and the person
 * holding the thing never hearing about it at all. Her words: blockers cannot be excuses, and the
 * person they need the thing from should also know.
 *
 * All three parts already existed and none of them were used here. `blockerHasSubstance` decides
 * whether a claim names who and what; `shouldEscalate` and ESCALATE_AFTER_DAYS decide when it stops
 * being ordinary; and BLOCKER_ESCALATED is the event that tells the other side. This says which of
 * those has happened and what to do next.
 */
export function sayHandoff(w: WaitingRow, now: Date): string {
  const who = w.onLabel?.trim() || 'somebody not named';
  const head = `${w.what} - ${w.waitingDays} days with ${who}, ${w.status.toLowerCase()}.`;

  /*
   * A claim with no substance is reported as what it is. Not called a lie, and not hidden either:
   * being blocked switches off every negative read about a person, so a passing mention repeated
   * here as a handoff is an excuse being laundered into protection.
   */
  if (!w.hasSubstance) {
    return `${head} This one does not name who it sits with or what is actually needed, so it is a`
      + ` remark rather than a handoff - and nothing has been sent to anybody. Ask what exactly is`
      + ` needed and from whom, and it becomes real.`;
  }

  if (w.escalatedAt) {
    return `${head} ${who} has been told - it was raised automatically once it passed`
      + ` ${ESCALATE_AFTER_DAYS} days. If it is still sitting there, the thing to ask is what they`
      + ` need in order to finish it, not whether they will.`;
  }

  const left = ESCALATE_AFTER_DAYS - w.waitingDays;
  if (left > 0) {
    return `${head} ${who} has not been told yet - that happens on its own at`
      + ` ${ESCALATE_AFTER_DAYS} days, so in ${left === 1 ? 'a day' : `${left} days`}. If it matters`
      + ` sooner than that, say so to ${who} today rather than waiting for it.`;
  }
  return `${head} Past ${ESCALATE_AFTER_DAYS} days and not yet raised with ${who}. Raise it.`;
}

export interface Completeness {
  band: ConfidenceBand;
  line: string;
  /** The specific things that would make it more complete. Named, so they can be fixed. */
  gaps: string[];
}

/**
 * HOW MUCH OF A PICTURE THIS IS, COMPUTED - AND THE PERSON IT IS ABOUT GETS THE SAME ANSWER.
 *
 * The first version of this shipped a fixed list of disclaimers, which is the product apologising
 * rather than the product knowing. Her words: it should know when the picture is not complete, and
 * so should the person delivering.
 *
 * So it is worked out from what is actually there, and it uses `ConfidenceBand` from
 * confidence-in-the-picture.ts rather than inventing a second vocabulary - a report saying "thin"
 * and a lead read saying "limited" about the same record is two products.
 *
 * BOTH SIDES GET IT. A lead being told the picture is thin while the person it is about believes
 * they are being read in full is the asymmetry this product exists to remove, so the same function
 * answers for whoever asks.
 */
export function howCompleteThePictureIs(m: Material): Completeness {
  const gaps: string[] = [];

  if (m.finishedCheckIns === 0) {
    gaps.push('No check-in of theirs has finished, so none of their own account of the work is in here.');
  }
  if (!m.carrying.length) {
    gaps.push('No objective has been sent that they are seen working on, so there is nothing here about what they are for.');
  }
  const noMeasure = m.carrying.filter((c) => !c.measure?.trim()).length;
  if (noMeasure) {
    gaps.push(`${noMeasure === 1 ? 'One objective they carry has' : `${noMeasure} objectives they carry have`} no measure, so there is nothing to be doing well or badly against.`);
  }
  const undated = m.commitments.filter((c) => c.dueAt === null).length;
  if (undated) {
    gaps.push(`${undated === 1 ? 'One promise has' : `${undated} promises have`} no date, so neither side can tell whether they are late.`);
  }

  if (m.finishedCheckIns === 0 && !m.carrying.length && !m.commitments.length) {
    return {
      band: 'nothing yet',
      line: 'Nothing has been built here yet. This is not a thin picture of them - it is the absence of one, and it is about the record rather than about them.',
      gaps,
    };
  }
  if (gaps.length >= 3 || m.finishedCheckIns === 0) {
    return {
      band: 'thin',
      line: 'Most of this rests on things nobody has filled in. Treat what follows as a starting point for questions and nothing else.',
      gaps,
    };
  }
  if (gaps.length) {
    return {
      band: 'partly covered',
      line: 'Part of this could be checked against something and part could not. Read the specifics rather than the shape of it.',
      gaps,
    };
  }
  return {
    band: 'well covered',
    line: 'Most of what is here could be checked against something. It is still not an assessment.',
    gaps,
  };
}

export function theReadFor(m: Material): TheRead {
  const sections: Section[] = [];

  const late = m.commitments.filter((c) => isLate(c, m.now));
  const undated = m.commitments.filter((c) => c.dueAt === null);
  if (late.length || undated.length) {
    sections.push({
      heading: 'What they said they would do',
      lines: [
        ...late.map((c) => `${c.text} - due ${days(c.dueAt!, m.now)} days ago, still open.`),
        /*
         * Undated commitments are still never called late - that would invent a deadline nobody
         * agreed to, and the invented one is what a person gets judged on.
         *
         * But leaving it at "no date given" was passive, and the coach already exists to fix it.
         * An undated promise is a thing NEITHER side can tell the truth about: the person cannot
         * say they are on time and the lead cannot say they are not. So it is named as the gap it
         * is, on both sides, and the next check-in asks for the date rather than this read
         * quietly holding it against them.
         */
        ...undated.map((c) => `${c.text} - said ${days(c.statedAt, m.now)} days ago with no date, so`
          + ` neither of you can tell whether it is late. Their next check-in asks them to put a date`
          + ` on it. Agreeing one in the room is faster.`),
      ],
      source: 'Their own words in a check-in, written down at the time.',
    });
  }

  if (m.othersWaiting.length) {
    sections.push({
      heading: 'What other people are waiting on them for',
      lines: m.othersWaiting.map((w) => sayHandoff(w, m.now)),
      source: 'Handoffs both sides recorded, not one person reporting the other.',
    });
  }

  /*
   * BOTH DIRECTIONS, ALWAYS. A read that lists what somebody owes and not what they are owed is a
   * charge sheet. Somebody blocked for three weeks on a thing they cannot start looks identical to
   * somebody who has not started it, and the only way to tell is to show the other side.
   */
  if (m.waitingOnOthers.length) {
    sections.push({
      heading: 'What they are waiting on other people for',
      lines: m.waitingOnOthers.map((w) => sayHandoff(w, m.now)),
      source: 'The same handoff records, from the other side. Nobody here is taking one person\'s word for it.',
    });
  }

  if (m.findings.length) {
    sections.push({
      heading: 'What the record raised',
      lines: m.findings.map((f) => f.says?.trim() || `A ${f.key.replace(/_/g, ' ')} finding, ${days(f.firstSeenAt, m.now)} days old.`),
      source: 'Detectors reading what was pushed and what was said. Each one is a question, not a conclusion.',
    });
  }

  const noMeasure = m.carrying.filter((c) => !c.measure?.trim());
  if (m.carrying.length) {
    sections.push({
      heading: 'What they are carrying',
      lines: [
        ...m.carrying.map((c) => c.title),
        ...(noMeasure.length
          ? [`${noMeasure.length === 1 ? 'One of these has' : `${noMeasure.length} of these have`} no measure on the record, so there is nothing to be doing well or badly against.`]
          : []),
      ],
      source: 'Objectives your systems sent, and who has been seen working on them.',
    });
  }

  return {
    person: m.personLabel,
    sections,
    completeness: howCompleteThePictureIs(m),
    notInHere: [
      'Anything nobody wrote down. Most of what somebody does is not in here.',
      'Why any of it happened. A missed date and a blocked week look the same from outside.',
      'Anything said in a check-in that has not been released in a report.',
      'Any view of how they are doing. That is yours to form, in the room, with them.',
    ],
    refusal: REFUSAL,
  };
}

/**
 * A read with nothing in it is a real answer and must say so plainly.
 *
 * The tempting failure is to pad it - to reach for something, anything, so the lead feels served.
 * A thin record means the conversation should start by asking rather than by checking.
 */
export const NOTHING_ON_RECORD =
  'The record holds nothing about this person that is worth taking into a conversation. That is not '
  + 'a finding about them - it means they have not been in a check-in that has finished, or nothing '
  + 'has been sent about the work they carry. Go in and ask.';
