import { howACheckInIsGoing } from './how-a-check-in-is-going';

/**
 * SHE FINISHED SESSION 1 AND THE BOARD SAID NOBODY HAD ANSWERED.
 *
 * "Progress 0 of 1 rounds, 0 of 1 answered this round", "0 sessions done", on a board opened
 * straight after completing the whole first session through the entry flow. The whole board read as
 * empty, on the one check-in she had just done.
 *
 * Next round's check-in rows are written ahead of time and sit NOT_STARTED. This file took the round
 * to be the highest session number it could see, which is that untouched row, so every count below
 * was counting a round with nothing in it.
 *
 * FOURTH COPY OF THIS RULE, THIRD FOUND TODAY. board.service had one, which-round-is-open had
 * another that disagreed with it, and this one was a plain max. It is one function now.
 */
describe('a round nobody has opened is not this round', () => {
  const ci = (sessionNumber: number, status: string, participantId: string) =>
    ({ sessionNumber, status, participantId }) as any;

  const going = (checkIns: any[], people: string[]) => howACheckInIsGoing({
    checkIns,
    /* Joined, which is what the population rule reads - see how-many-have-answered. */
    participants: people.map((id) => ({ id, managingOnly: false, userId: `u-${id}` })) as any,
    dependencies: [],
    timelineDays: null,
    cadence: null,
    sharedPicture: null,
  } as any);

  it('counts the round she answered, not the row written for next time', () => {
    const g = going([ci(1, 'COMPLETED', 'p1'), ci(2, 'NOT_STARTED', 'p1')], ['p1']);
    expect(g.glance.progress.answeredThisRound).toBe(1);
    expect(g.glance.progress.ofPeople).toBe(1);
    expect(g.glance.progress.roundsDone).toBe(1);
  });

  it('and still says nobody has answered when nobody has', () => {
    const g = going([ci(1, 'NOT_STARTED', 'p1')], ['p1']);
    expect(g.glance.progress.answeredThisRound).toBe(0);
    expect(g.glance.progress.roundsDone).toBe(0);
  });

  it('holds the round open while one person of three has not answered', () => {
    const g = going(
      [ci(1, 'COMPLETED', 'p1'), ci(1, 'COMPLETED', 'p2'), ci(1, 'NOT_STARTED', 'p3'), ci(2, 'NOT_STARTED', 'p1')],
      ['p1', 'p2', 'p3'],
    );
    expect(g.glance.progress.answeredThisRound).toBe(2);
    expect(g.glance.progress.ofPeople).toBe(3);
    expect(g.glance.progress.roundsDone).toBe(0);
  });

  it('moves on once everybody has met the round', () => {
    const g = going([ci(1, 'COMPLETED', 'p1'), ci(2, 'COMPLETED', 'p1')], ['p1']);
    expect(g.glance.progress.roundsDone).toBe(2);
  });
});
