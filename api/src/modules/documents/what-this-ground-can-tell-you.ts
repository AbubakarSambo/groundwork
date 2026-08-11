/**
 * WHAT THIS GROUND WILL AND WILL NOT BE ABLE TO TELL YOU. (G25)
 *
 * Not a test, not a score, and above all not a judgement on whoever set the
 * ground up. A statement about the PRODUCT'S limits, given what it has been
 * given:
 *
 *   "The report will be able to show where your accounts differ and what each of
 *    you meant by doing well. It will not be able to tell you whether the
 *    conditions you set were met, because none have been named. It will not be
 *    able to say whose work this depended on, because only two of you are in it."
 *
 * WHY IT IS FRAMED AS A LIMIT RATHER THAN A GAP. "Your context is 40% complete"
 * makes somebody feel marked and tells them nothing about what to do. "This will
 * not be able to tell you whether the conditions were met, because none have been
 * named" makes reading the context section motivated rather than obedient - it is
 * the difference between a form and a reason.
 *
 * NEVER MANDATORY AND NEVER GRADED. A ground with thin context is still a real
 * ground; plenty of useful ones start from one sentence and a deadline. This
 * exists so nobody is surprised later by a question the record was never able to
 * answer.
 *
 * NOTHING HERE INSPECTS A PERSON. Every input is a count or a presence of
 * something the ground holds, and no branch depends on who anybody is.
 */

export interface GroundContextInputs {
  /** How many parties are in the ground, including the lead. */
  partyCount: number;
  /** Has anybody said what success looks like? */
  hasSuccessDefinition: boolean;
  /** Conditions that were named as needing to be true. G15. */
  conditionCount: number;
  /** Where things stood on day one. G14. Without it there is position, no movement. */
  hasBaseline: boolean;
  /** Objectives held per person rather than one for the ground. G13. */
  perPersonObjectiveCount: number;
  /** Documents that everybody in the ground can read. */
  openDocumentCount: number;
  /** Whether these people can see each other's work at all. */
  peopleWorkTogether: boolean;
  /** Sessions the cadence plans for. One session cannot show change. */
  plannedSessions: number;
}

export interface ContextStrengthRead {
  /** What it will be able to answer. Never empty: a ground always does something. */
  can: string[];
  /** What it will not, each with the reason, which is the part that is actionable. */
  cannot: string[];
}

/**
 * Build the read.
 *
 * Every "cannot" line names the missing thing rather than describing a
 * deficiency, because the sentence has to be usable: somebody should be able to
 * read one and know exactly what to add.
 */
export function whatThisGroundCanTellYou(input: GroundContextInputs): ContextStrengthRead {
  const can: string[] = [];
  const cannot: string[] = [];

  // The floor. Two accounts of the same work is the whole mechanism, and it needs
  // nothing else configured to work.
  if (input.partyCount >= 2) {
    can.push('show where your accounts of the same work differ, and what each of you meant by it');
  } else {
    cannot.push(
      'compare anything, because only one person is in this ground - a single account is a record, not a comparison',
    );
  }

  if (input.hasSuccessDefinition) {
    can.push('show whether you still mean the same thing by doing well as you did at the start');
  } else {
    cannot.push(
      'tell you whether you are on track, because nobody has said what doing well looks like',
    );
  }

  if (input.conditionCount > 0) {
    can.push('tell you whether the conditions you named turned out to be true');
  } else {
    cannot.push(
      'tell you whether the conditions were met, because none have been named',
    );
  }

  if (input.hasBaseline) {
    can.push('show movement, because there is a record of where this stood on day one');
  } else {
    cannot.push(
      'show movement, only position, because there is no record of where this stood at the start',
    );
  }

  if (input.perPersonObjectiveCount >= input.partyCount && input.partyCount > 0) {
    can.push('show each person against what they were personally trying to achieve');
  } else if (input.perPersonObjectiveCount > 0) {
    cannot.push(
      `tell you how ${input.partyCount - input.perPersonObjectiveCount} of you are doing against your own objective, because only ${input.perPersonObjectiveCount} have one`,
    );
  } else {
    cannot.push(
      'show anybody against their own objective, because the only goal here belongs to the ground rather than to a person',
    );
  }

  // Three or more is where "who is this waiting on" becomes answerable at all.
  if (input.partyCount >= 3) {
    can.push('show who is waiting on whom, and where work is landing between you');
  } else {
    cannot.push(
      'say whose work this depended on, because only the two of you are in it',
    );
  }

  if (!input.peopleWorkTogether) {
    cannot.push(
      'confirm anybody\'s account against anybody else\'s, because none of you sees the others\' work - every line will be one account rather than a checked one',
    );
    can.push('show where the same gap appears in account after account, which is what a group in the same role can tell you');
  }

  if (input.plannedSessions <= 1) {
    cannot.push(
      'show anything changing, because one session is a snapshot',
    );
  }

  if (input.openDocumentCount === 0) {
    cannot.push(
      'measure anything against a written standard, because no document has been shared with the ground',
    );
  } else {
    can.push('measure what people describe against the documents you have all been given');
  }

  return { can, cannot };
}

/**
 * The read as one paragraph, for the places that want prose.
 *
 * Written in the second person and about the report rather than about the reader.
 * "It will not be able to" is a fact about a tool; "you have not provided" is an
 * accusation, and they carry the same information.
 */
export function contextStrengthSentence(read: ContextStrengthRead): string {
  const parts: string[] = [];
  if (read.can.length) parts.push(`The report will be able to ${joinPlainly(read.can)}.`);
  if (read.cannot.length) parts.push(`It will not be able to ${joinPlainly(read.cannot)}.`);
  return parts.join(' ');
}

function joinPlainly(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}
