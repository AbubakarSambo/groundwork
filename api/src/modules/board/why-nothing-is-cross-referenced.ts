/**
 * WHY THERE IS NOTHING TO COMPARE, SAID ONCE, FROM THE NUMBERS THE PAGE IS ALREADY SHOWING.
 *
 * Read live on two boards, 22 September 2026:
 *
 *   Differences   Nothing to compare yet
 *                 everybody answered, and the written report names no agreement and no gap yet
 *   ...
 *   Where people differ
 *                 Nothing cross-referenced yet. This fills in once more than one person has checked in.
 *
 * Both sentences about the same round, a few inches apart, and the second one contradicts the first.
 * It was a constant in the page: one sentence for every empty divergence section, whatever the reason
 * the section was empty. On a one-person check-in it was true but useless (nobody is coming), on a
 * fully answered round it was simply false.
 *
 * So the reason is computed where the counts are, from the one counter (how-many-have-answered.ts),
 * and the page prints what it is given.
 */
export function whyNothingIsCrossReferenced(a: {
  /** How many people this round is waiting on, from the one counter. */
  stillToAnswer: number | null | undefined;
  /** How many people are expected to answer at all. Below two, no round can ever compare anything. */
  peopleExpected: number | null | undefined;
}): string {
  const expected = a.peopleExpected ?? 0;
  if (expected > 0 && expected < 2) {
    return 'There is nothing to compare yet. This compares what different people said, and there is only one person on this check-in.';
  }
  const waiting = a.stillToAnswer ?? null;
  if (waiting == null) {
    return 'Nothing cross-referenced yet. This fills in once more than one person has answered.';
  }
  if (waiting > 0) {
    return `Nothing cross-referenced yet. ${waiting === 1 ? 'One person has' : `${waiting} people have`} still to answer.`;
  }
  return 'Everybody answered, and nothing in the written report reads as a difference or an agreement yet.';
}
