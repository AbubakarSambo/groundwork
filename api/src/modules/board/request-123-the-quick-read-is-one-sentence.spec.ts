import { atAGlanceTiles, theBlockersTileNamesThis } from '../reports/what-this-session-holds';
import { theQuickReadCountsTheWaitsTheBoardCounts } from './the-quick-read-counts-the-waits-the-board-counts';

/**
 * REQUEST 123, ITEM 10. The Blockers tile read "One person is waiting on somebody else, work is held up by the commercial terms
 * for each client, including pricing structures and renewal processes. Nothing is hard-blocked.." : a comma splice, two full
 * stops at the end and a word nobody uses. Every reader of the tile (it is the same tile for the lead and the new hire; only the
 * count differs) now reads one sentence about what holds the work up, then one that says nothing has stopped it completely.
 */
const SPLICED = 'One person is waiting on somebody else, work is held up by the commercial terms for each client, including pricing structures and renewal processes.';
const WHOLE = 'Work is held up by the commercial terms for each client, including pricing structures and renewal processes. Nothing has stopped the work completely.';
const tiles = () => atAGlanceTiles({
  agreed: 0, stillOpen: 0, movedOnTargets: null, blocked: 0, waiting: 4, targetsSet: 0, targetsWithANumber: 0, targetsMoved: 0,
  stillToAnswer: 0, backedPct: null, numberWasSaid: false, theDifference: null, theBlocker: SPLICED, worries: 0, theWorry: null, waitsFromEarlier: 0,
} as any);

describe('the Blockers tile', () => {
  it('reads as two clean sentences, as the tile is first built', () => {
    expect(tiles().find((t) => t.label === 'Blockers')!.sub).toBe(WHOLE);
  });

  it('and after the board names the top line\'s wait, and counts the waits the reader may read', () => {
    const named = theBlockersTileNamesThis(tiles(), SPLICED);
    const counted = theQuickReadCountsTheWaitsTheBoardCounts(named, 1)!.find((t) => t.label === 'Blockers')!;
    expect(counted.value).toBe('1 waiting');
    expect(counted.sub).toBe(WHOLE);
    expect(counted.sub).not.toMatch(/\.\.|hard-blocked|somebody else,/);
  });
});
