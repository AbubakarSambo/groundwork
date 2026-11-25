import { atAGlanceTiles } from './what-this-session-holds';

/**
 * "THE QUICK READ IS TOO GENERIC." Hafsah, 19 September 2026, reading a live board.
 *
 *   DIFFERENCES  1   still open, as the written report reads it
 *   BLOCKERS     1   named as holding work up
 *
 * Both true, both a count with its own label said back. The difference had a name and the blocker
 * was one line somebody typed, and both were sitting two screens further down the same page. The
 * count says how much; the sub-line now says what.
 */
const base = {
  agreed: 0, movedOnTargets: null, waiting: 0, backedPct: null, numberWasSaid: false, stillToAnswer: 0,
};
const tile = (tiles: ReturnType<typeof atAGlanceTiles>, label: string) => tiles.find((t) => t.label === label)!;

describe('the quick read names the thing', () => {
  it('names the difference rather than repeating the label', () => {
    const t = tile(atAGlanceTiles({ ...base, stillOpen: 1, blocked: 0, theDifference: "The team's primary focus" }), 'Differences');
    expect(t.value).toBe('1');
    expect(t.sub).toBe("People said different things about the team's primary focus.");
  });

  it('and says how many more there are when there are more', () => {
    const t = tile(atAGlanceTiles({ ...base, stillOpen: 3, blocked: 0, theDifference: 'Who owns renewals' }), 'Differences');
    expect(t.sub).toBe('People said different things about who owns renewals. 2 more differences are still open.');
  });

  it('names the blocker in the words it was raised in', () => {
    const t = tile(atAGlanceTiles({ ...base, stillOpen: 0, blocked: 1, theBlocker: 'Legal to review the contract, on Tunde' }), 'Blockers');
    expect(t.value).toBe('1');
    expect(t.sub).toBe('Work is held up by Legal to review the contract, on Tunde.');
  });

  /* A tile is glanced at. A blocker somebody typed three sentences into shows its first sentence,
     whole, and never a piece of one: see what-this-session-holds (a tile shows a whole sentence). */
  it('and shows the first sentence of a long one rather than filling the tile with it', () => {
    const long = 'Marketing stopped sending leads in August. Nobody has picked it up since then, which means the whole pipeline is running on old names.';
    const t = tile(atAGlanceTiles({ ...base, stillOpen: 0, blocked: 1, theBlocker: long }), 'Blockers');
    expect(t.sub).toBe('Marketing stopped sending leads in August.');
    expect(t.sub).not.toContain('...');
  });

  /* And where there is nothing to name, every word it said before is still what it says. */
  it('falls back to what it always said when nothing is named', () => {
    const tiles = atAGlanceTiles({ ...base, stillOpen: 1, blocked: 1 });
    /* Changed 24 November (page audit): said plainly, without "the written report". */
    expect(tile(tiles, 'Differences').sub).toBe('It has not been settled yet.');
    expect(tile(tiles, 'Blockers').sub).toBe('Something is named as holding work up.');
  });

  it('and nothing blocked is still good news, named or not', () => {
    const t = tile(atAGlanceTiles({ ...base, stillOpen: 0, blocked: 0 }), 'Blockers');
    expect(t.value).toBe('None');
    expect(t.tone).toBe('good');
  });
});

/* And the other half of naming it: the row carries who it sits with, and the line often already
   says so. "legal to look at the contract for the Lagos deal, on legal" was read off a live board. */
describe('who it sits with', () => {
  it('is added where the line does not already say it', () => {
    const t = atAGlanceTiles({ ...base, stillOpen: 0, blocked: 1, theBlocker: 'The price list, on Finance' }).find((x) => x.label === 'Blockers')!;
    expect(t.sub).toBe('Work is held up by the price list, on Finance.');
  });
});
