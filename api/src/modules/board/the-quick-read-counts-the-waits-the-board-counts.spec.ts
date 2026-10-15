import { theQuickReadCountsTheWaitsTheBoardCounts } from './the-quick-read-counts-the-waits-the-board-counts';
import { atAGlanceTiles } from '../reports/what-this-session-holds';

const tilesFor = (waiting: number) => atAGlanceTiles({
  agreed: 0, stillOpen: 0, movedOnTargets: null, blocked: 0, waiting, targetsSet: 0, targetsWithANumber: 0, targetsMoved: 0,
  stillToAnswer: 0, backedPct: null, numberWasSaid: false, theDifference: null,
  theBlocker: 'the commercial terms for each client', worries: 0, theWorry: null, waitsFromEarlier: 0,
} as any);

describe('the quick read counts the waits the board counts', () => {
  it('the lead reads the same number in the tile as in the top line (four, not two)', () => {
    const served = theQuickReadCountsTheWaitsTheBoardCounts(tilesFor(2), 4)!;
    const blockers = served.find((t) => t.label === 'Blockers')!;
    expect(blockers.value).toBe('4 waiting');
    expect(blockers.sub).toBe('Work is held up by the commercial terms for each client. Nothing has stopped the work completely.');
  });

  it('a participant who may read only their own waits reads the count the board gave them', () => {
    expect(theQuickReadCountsTheWaitsTheBoardCounts(tilesFor(3), 1)!.find((t) => t.label === 'Blockers')!.value).toBe('1 waiting');
  });

  it('hard blockers, no waits and a board with no count are left as they were', () => {
    const hard = atAGlanceTiles({ ...({} as any), agreed: 0, stillOpen: 0, movedOnTargets: null, blocked: 2, waiting: 0, targetsSet: 0, stillToAnswer: 0, backedPct: null, numberWasSaid: false } as any);
    expect(theQuickReadCountsTheWaitsTheBoardCounts(hard, 5)).toEqual(hard);
    const none = tilesFor(2);
    expect(theQuickReadCountsTheWaitsTheBoardCounts(none, 0)).toBe(none);
    expect(theQuickReadCountsTheWaitsTheBoardCounts(none, null)).toBe(none);
  });
});
