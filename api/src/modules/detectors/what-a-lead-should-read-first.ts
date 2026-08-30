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
  /** Stated every time, not only when the record is thin. */
  notInHere: string[];
  /** The sentence that has to survive every rewrite of this file. */
  refusal: string;
}

export const REFUSAL =
  'This is not an assessment and does not say how this person is doing. It is what the record holds, '
  + 'so you can ask about it rather than remember it. Nothing here has been weighed, scored or ranked, '
  + 'and none of it knows why anything happened.';

/** Late only where a real date was given. Words with no date are what somebody said, never a miss. */
const isLate = (c: CommitmentRow, now: Date) => c.dueAt !== null && c.dueAt < now;

const days = (from: Date, now: Date) => Math.max(0, Math.floor((now.getTime() - from.getTime()) / 86_400_000));

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
         * Undated commitments are listed as what they are. Calling them late would invent a
         * deadline nobody agreed to, and that invented deadline is what somebody gets judged on.
         */
        ...undated.map((c) => `${c.text} - said ${days(c.statedAt, m.now)} days ago, no date given.`),
      ],
      source: 'Their own words in a check-in, written down at the time.',
    });
  }

  if (m.othersWaiting.length) {
    sections.push({
      heading: 'What other people are waiting on them for',
      lines: m.othersWaiting.map((w) => `${w.what} - ${w.waitingDays} days, ${w.status.toLowerCase()}.`),
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
      lines: m.waitingOnOthers.map((w) => `${w.what} - ${w.waitingDays} days, ${w.status.toLowerCase()}.`),
      source: 'The same handoff records, from the other side.',
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
