import { atAGlanceTiles } from './what-this-session-holds';

/**
 * Rerun, 20 Sep 2026, loan cohort: Halima had lost 220 birds, Aisha's diesel was N90,000 over, and the
 * tile read "Blockers: None". Nobody had raised a dependency; they had said a worry.
 */
describe('worries reach the Blockers tile when nothing is blocked', () => {
  const base = { agreed: 0, stillOpen: 0, movedOnTargets: null, blocked: 0, waiting: 0, backedPct: null, numberWasSaid: false };
  const blockers = (tiles: any[]) => tiles.find((t) => t.label === 'Blockers');

  it('says how many were said and names the first, instead of None', () => {
    const b = blockers(atAGlanceTiles({ ...base, worries: 3, theWorry: 'I lost 220 birds and missed a payment.' }));
    expect(b.value).toBe('3 worries');
    expect(b.sub).toContain('I lost 220 birds and missed a payment, and 2 more');
    expect(b.tone).toBe('warn');
  });

  it('one worry is a worry', () => {
    expect(blockers(atAGlanceTiles({ ...base, worries: 1, theWorry: 'Diesel is N90,000 a month more.' })).value).toBe('1 worry');
  });

  it('a hard block still comes first, and None still means none', () => {
    expect(blockers(atAGlanceTiles({ ...base, blocked: 1, worries: 3, theBlocker: 'legal to sign', theWorry: 'x' })).value).toBe('1');
    const none = blockers(atAGlanceTiles(base));
    expect(none.value).toBe('None');
    expect(none.tone).toBe('good');
  });
});
