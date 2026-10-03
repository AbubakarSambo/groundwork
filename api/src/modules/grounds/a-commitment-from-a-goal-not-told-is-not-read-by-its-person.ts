import { notToldYet } from './a-goal-not-told-stays-with-the-lead';

/**
 * A GOAL THE LEAD SET AS A COMMITMENT AND HAS NOT TOLD THEM ABOUT IS NOT IN THEIR LIST OF WHAT THEY OWE (decisions 48 and 56).
 *
 * When the lead says somebody is to do something, the conversation keeps it as a goal and copies it to the organisation's commitments so
 * it can be followed across check-ins. The copy knew nothing of whether the lead had told the person, so Tobi read "close eight renewals
 * a quarter" under "what you owe" before Amina had said a word. The copy is now made only once the goal is told
 * (`mayThisGoalBeCopiedToCommitments`), and every read of a person's own commitments leaves out a copy whose goal is still not told
 * (`withoutCommitmentsFromGoalsNotToldYet`), which also covers rows copied before this rule.
 */

/** Whether the goal may be copied to the commitments now: one the person set themselves, or one the lead has told them about. */
export function mayThisGoalBeCopiedToCommitments(goal: { awareness?: string | null; authoredBy?: string | null }): boolean {
  return !notToldYet(goal);
}

/** The commitments of a person's own, less any copied from a goal the lead has not told them about. Rows without a source are all kept. */
export async function withoutCommitmentsFromGoalsNotToldYet<T extends { sourcePersonObjectiveId?: string | null }>(prisma: any, rows: readonly T[]): Promise<T[]> {
  const ids = [...new Set(rows.map((r) => r.sourcePersonObjectiveId).filter((x): x is string => !!x))];
  if (!ids.length) return [...rows];
  const goals: any[] = ((await prisma.personObjective?.findMany?.({
    where: { id: { in: ids }, awareness: 'NOT_TOLD' },
    select: { id: true, awareness: true, authoredBy: true },
  })?.catch?.(() => [])) ?? []) as any[];
  const notTold = new Set(goals.filter(notToldYet).map((g) => g.id as string));
  return notTold.size ? rows.filter((r) => !(r.sourcePersonObjectiveId && notTold.has(r.sourcePersonObjectiveId))) : [...rows];
}
