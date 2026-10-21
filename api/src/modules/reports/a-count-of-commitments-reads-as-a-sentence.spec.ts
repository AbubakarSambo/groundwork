import { howMuchThereIsToGoOn } from './how-much-there-is-to-go-on';

/**
 * THE DROP ACCESS SHORT RUN (gw_sweep_drop3), ITEM 12. Grace's team report of 14 October read "3 of 26 lines are backed by a
 * document. The rest is from memory. 1 of 5 commitment has no owner or no date." The same counts, read again, with Release 1's switch on
 * (release-one-sales-board); with it off, the sentence reads as it did before:
 */
const GRACE_14_OCTOBER = { releaseOne: true, answered: 3, ofPeople: 3, documented: 3, saidInAll: 26, agreed: 0, stillOpen: 2, commitments: 5, commitmentsWithOwnerAndDate: 4 };

describe('a count of commitments reads as a sentence', () => {
  it('Grace reads "1 of the 5 commitments has no owner or no date."', () => {
    const r = howMuchThereIsToGoOn(GRACE_14_OCTOBER).reasons.join(' ');
    expect(r).toContain('1 of the 5 commitments has no owner or no date. Naming one of each would make it checkable.');
    expect(r).not.toMatch(/1 of 5 commitment\b/);
  });
  it('one of one, and all of several, read as sentences too', () => {
    expect(howMuchThereIsToGoOn({ ...GRACE_14_OCTOBER, commitments: 1, commitmentsWithOwnerAndDate: 0 }).reasons.join(' ')).toContain('The one commitment has no owner or no date.');
    expect(howMuchThereIsToGoOn({ ...GRACE_14_OCTOBER, commitments: 3, commitmentsWithOwnerAndDate: 0 }).reasons.join(' ')).toContain('All 3 commitments have no owner or no date. Naming one of each would make them checkable.');
  });
  it('with Release 1\'s switch off, the sentence reads as it did before', () => {
    const r = howMuchThereIsToGoOn({ ...GRACE_14_OCTOBER, releaseOne: false }).reasons.join(' ');
    expect(r).toContain('1 of 5 commitment has no owner or no date. Naming one of each would make it checkable.');
  });
});
