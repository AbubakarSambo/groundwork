/**
 * WHAT AN OBJECTIVE NEEDS THAT NOBODY HAS PICKED UP.
 *
 * Not "what did you commit to" - a tool that reports back what people already told it is a
 * spreadsheet with a chat box. This is the other direction: here is a gap in the work, derived from
 * the objective, who is on it, what they have actually committed to, and what the detectors saw.
 *
 * EVERY GAP HERE IS AN ABSENCE OF A RECORD, NOT AN ABSENCE OF EFFORT. Nobody has committed to this
 * objective; nobody owns it; two people describe it differently. Each of those is checkable and
 * none of them says anybody is not trying - which matters, because the same shape said carelessly
 * becomes a machine telling a manager who is slacking.
 */

export interface SubjectFacts {
  externalId: string;
  title: string;
  ownerExternalId: string | null;
  contributorExternalIds: string[];
  /** Identity ids of people with an open commitment against this subject. */
  committedBy: string[];
  /** Open finding keys against this subject, so a recommendation can point at one. */
  findingKeys: string[];
  findingIds: string[];
}

export type RecommendationKind = 'owner_needed' | 'todo' | 'conversation_needed' | 'dependency_record';

export interface Proposed {
  kind: RecommendationKind;
  subjectExternalId: string;
  personExternalId: string | null;
  body: string;
  rationale: Record<string, unknown>;
  sourceDetectorIds: string[];
}

/**
 * The gaps, in the order they are worth raising.
 *
 * Ordered because a list of five suggestions against one objective is a list nobody reads. An
 * objective with no owner is a different kind of problem from one where two people disagree, and
 * putting them in one undifferentiated pile makes both easier to ignore.
 */
export function whatIsMissing(s: SubjectFacts): Proposed[] {
  const out: Proposed[] = [];

  /*
   * NO OWNER. The one gap where nothing else can be true until it is closed - there is nobody to
   * ask about anything else, so it goes first and alone.
   */
  if (!s.ownerExternalId) {
    return [{
      kind: 'owner_needed',
      subjectExternalId: s.externalId,
      personExternalId: null,
      body: `${s.title} has no owner. Somebody needs to be the person to ask about it.`,
      rationale: { observed: 'no ownerExternalId on the imported subject' },
      sourceDetectorIds: [],
    }];
  }

  /*
   * TWO PEOPLE DESCRIBING IT DIFFERENTLY IS A CONVERSATION, NOT A TASK.
   *
   * The recommendation that follows a divergence must not be "write it down properly" - that
   * presumes one of them is right. Ten minutes agreeing which it is, before more work goes into
   * either version, is the actual remedy.
   */
  if (s.findingKeys.includes('goal_divergence')) {
    out.push({
      kind: 'conversation_needed',
      subjectExternalId: s.externalId,
      personExternalId: s.ownerExternalId,
      body: `People on ${s.title} describe it as different work. Worth agreeing what it is before more goes into it.`,
      rationale: { observed: 'goal_divergence on this subject' },
      sourceDetectorIds: s.findingIds,
    });
  }

  if (s.findingKeys.includes('undeclared_dependency')) {
    out.push({
      kind: 'dependency_record',
      subjectExternalId: s.externalId,
      personExternalId: s.ownerExternalId,
      body: `${s.title} looks like it depends on other work that is not recorded anywhere. Worth writing the link down where the other team can see it.`,
      rationale: { observed: 'undeclared_dependency on this subject' },
      sourceDetectorIds: s.findingIds,
    });
  }

  /*
   * NOBODY HAS SAID WHAT THEY WILL DO ABOUT IT.
   *
   * Named per person rather than as one lament about the objective, because "somebody should
   * commit to this" is advice nobody can act on. The person named is one who is already on it -
   * this never suggests adding anybody, which would be the product reorganising a team.
   */
  const onIt = [s.ownerExternalId, ...s.contributorExternalIds].filter(Boolean) as string[];
  const silent = onIt.filter((p) => !s.committedBy.includes(p));
  if (silent.length && silent.length === onIt.length) {
    out.push({
      kind: 'todo',
      subjectExternalId: s.externalId,
      personExternalId: s.ownerExternalId,
      body: `Nobody on ${s.title} has said what they will do about it. One concrete next step from whoever owns it would give the rest of it something to hang on.`,
      rationale: { observed: 'no open commitments from anybody assigned', peopleOnIt: onIt.length },
      sourceDetectorIds: [],
    });
  }

  return out;
}

/**
 * A GAP THAT IS NOBODY'S IS ITS OWN FINDING.
 *
 * `unowned_gap` in the spec's vocabulary. Kept as a detector as well as a recommendation because
 * the two answer different questions: the finding is "this is true of your objectives", and the
 * recommendation is "here is what to do about this one".
 */
export function unownedGaps(subjects: SubjectFacts[]): SubjectFacts[] {
  return subjects.filter((s) => !s.ownerExternalId);
}
