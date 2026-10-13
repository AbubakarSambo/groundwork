import { atAGlanceTiles } from '../reports/what-this-session-holds';

/** B-165: "Nobody is waiting on anybody." beside a worry that says three shops are waiting. */
describe('the Blockers tile over a worry it cannot quote', () => {
  it('the Blockers tile never says nobody is waiting where a worry it cannot quote is on record', () => {
    const base = { agreed: 0, stillOpen: 0, movedOnTargets: null, blocked: 0, waiting: 0, backedPct: null, numberWasSaid: false } as const;
    const sub = String(atAGlanceTiles({ ...base, worries: 1, theWorry: null }).find((t) => t.label === 'Blockers')!.sub);
    expect(sub).toBe('1 worry is on record. It was not kept in the words it was said, so it is not quoted here. No wait has been recorded against a named person.');
    expect(sub).not.toMatch(/nobody is waiting/i);
  });
});
