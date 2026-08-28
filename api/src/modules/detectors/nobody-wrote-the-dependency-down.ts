/**
 * TWO OBJECTIVES THAT DEPEND ON EACH OTHER IN PRACTICE, AND NOTHING SAYS SO.
 *
 * The spec calls this the demo, and it is right about why: no OKR tool can produce it, because
 * seeing it needs both the graph AND the conversations. Their tool knows what is written down.
 * Groundwork hears somebody who owns one objective talking about another one they do not own, week
 * after week, with no link between them anywhere.
 *
 * WHAT COUNTS AS EVIDENCE, AND WHAT DOES NOT.
 *
 * Mentioning another team's objective once is a conversation. Mentioning it repeatedly, while
 * owning something else, and with no recorded relationship between the two, is a dependency nobody
 * declared. The difference is repetition and the absence of a link - and both are checkable facts
 * rather than an inference about what somebody meant.
 *
 * THIS IS A SIGNAL, NOT A VERDICT. It is a reason to ask "is this blocking you", and the answer is
 * frequently no. The output says who and which two objectives, and stops there.
 */

export interface SubjectRef {
  externalId: string;
  title: string;
  ownerExternalId: string | null;
  contributorExternalIds: string[];
  parentExternalId: string | null;
}

export interface Mention {
  /** Who said it. */
  personExternalId: string;
  /** The subject their words referred to. */
  subjectExternalId: string;
  at: Date;
}

/** Said once is a conversation. This is where it stops being one. */
export const MENTIONS_BEFORE_ITS_A_PATTERN = 3;

export interface UndeclaredDependency {
  personExternalId: string;
  /** What they own. */
  fromSubjectExternalId: string;
  /** What they keep talking about and do not own. */
  toSubjectExternalId: string;
  mentions: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

/**
 * A LINK IN EITHER DIRECTION COUNTS AS DECLARED.
 *
 * If A is B's parent or B is A's parent, somebody has recorded the relationship and this has
 * nothing to add. Reporting it anyway would be the product telling a customer something their own
 * tool already says, which is how a findings list becomes noise.
 */
function alreadyDeclared(a: SubjectRef, b: SubjectRef): boolean {
  return a.parentExternalId === b.externalId || b.parentExternalId === a.externalId;
}

/**
 * BEING ON IT IS NOT A DEPENDENCY. Somebody listed as a contributor on the other objective is
 * meant to be talking about it - that is the arrangement working, and flagging it would train
 * people to ignore the findings.
 */
function isOnIt(person: string, s: SubjectRef): boolean {
  return s.ownerExternalId === person || s.contributorExternalIds.includes(person);
}

export function findUndeclaredDependencies(
  subjects: SubjectRef[],
  mentions: Mention[],
  threshold = MENTIONS_BEFORE_ITS_A_PATTERN,
): UndeclaredDependency[] {
  const byId = new Map(subjects.map((s) => [s.externalId, s]));
  const owned = new Map<string, SubjectRef[]>();
  for (const s of subjects) {
    if (!s.ownerExternalId) continue;
    owned.set(s.ownerExternalId, [...(owned.get(s.ownerExternalId) ?? []), s]);
  }

  /* Grouped by who said it and what about, so the threshold is per pair rather than per person. */
  const grouped = new Map<string, Mention[]>();
  for (const m of mentions) {
    const k = `${m.personExternalId}::${m.subjectExternalId}`;
    grouped.set(k, [...(grouped.get(k) ?? []), m]);
  }

  const out: UndeclaredDependency[] = [];
  for (const [k, group] of grouped) {
    if (group.length < threshold) continue;
    const [person, mentioned] = k.split('::');
    const target = byId.get(mentioned);
    if (!target) continue;
    if (isOnIt(person, target)) continue;

    for (const mine of owned.get(person) ?? []) {
      if (mine.externalId === mentioned) continue;
      if (alreadyDeclared(mine, target)) continue;

      const times = group.map((m) => m.at.getTime());
      out.push({
        personExternalId: person,
        fromSubjectExternalId: mine.externalId,
        toSubjectExternalId: target.externalId,
        mentions: group.length,
        firstSeenAt: new Date(Math.min(...times)),
        lastSeenAt: new Date(Math.max(...times)),
      });
    }
  }
  /* Most-mentioned first: the strongest signal is the one worth a conversation. */
  return out.sort((a, b) => b.mentions - a.mentions);
}

/**
 * The sentence a person reads. Names both objectives and asks, rather than concluding.
 *
 * "Nobody has written that down" is the finding. Whether it matters is theirs to say, and the
 * wording has to leave room for "it does not".
 */
export function sayIt(d: UndeclaredDependency, titleOf: (id: string) => string): string {
  return `${titleOf(d.fromSubjectExternalId)} and ${titleOf(d.toSubjectExternalId)} may depend on each other. `
    + `Whoever owns the first has raised the second ${d.mentions} times, and nothing records a link between them. `
    + `If one is waiting on the other, it is worth saying so somewhere the other team can see.`;
}
