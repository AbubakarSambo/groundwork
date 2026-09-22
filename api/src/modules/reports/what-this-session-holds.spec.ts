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

/** "we have a meeting with the CEO to discuss m..." - a tile that stopped inside a word (22 Sep 2026). */
describe('a tile cuts at a word', () => {
  const { atAGlanceTiles } = require('./what-this-session-holds');
  it('ends on the last whole word, not mid-word, and drops a dangling conjunction', () => {
    const tiles = atAGlanceTiles({
      agreed: 0, stillOpen: 0, movedOnTargets: 0, blocked: 1, waiting: 0, backedPct: null, numberWasSaid: false,
      theBlocker: 'I have heard about it but we have a meeting with the CEO to discuss monetisation next week',
    });
    const blockers = tiles.find((t: any) => t.label === 'Blockers')!;
    expect(blockers.sub).toContain('...');
    expect(blockers.sub).not.toMatch(/\bm\.\.\./);
    expect(blockers.sub).not.toMatch(/\b(and|or|but|to|with|for|of|the)\.\.\./);
  });
});

/**
 * "NO TARGET SET" OVER THIRTEEN TARGETS.
 *
 * Read live, 22 September 2026, minutes after a lead pasted the quarter into the context chat: the
 * Context page listed the team's six numbers and three people's, and the Movement tile beside them
 * said "No target set - nobody has set something to measure this against". Movement is null until
 * two snapshots exist to subtract, and null was being read as "none exist".
 */
describe('movement before a round has closed', () => {
  const { atAGlanceTiles } = require('./what-this-session-holds');
  const tile = (a: any) => atAGlanceTiles({ agreed: 0, stillOpen: 0, movedOnTargets: null, blocked: 0, waiting: 0, backedPct: null, numberWasSaid: false, ...a })
    .find((t: any) => t.label === 'Movement');

  it('says nothing has moved yet, and how many are set', () => {
    const t = tile({ targetsSet: 13 });
    expect(t.value).toBe('Nothing yet');
    expect(t.sub).toBe('13 targets set, and no round has closed to measure from');
    expect(t.sub).not.toMatch(/nobody has set/);
  });

  it('still says nobody set one where nobody did', () => {
    expect(tile({ targetsSet: 0 }).value).toBe('No target set');
    expect(tile({}).value).toBe('No target set');
  });

  it('and a number said with nothing tracking it is only that when nothing is set', () => {
    expect(tile({ targetsSet: 0, numberWasSaid: true }).value).toBe('Not tracked');
    expect(tile({ targetsSet: 6, numberWasSaid: true }).value).toBe('Nothing yet');
  });

  it('one target reads as one', () => {
    expect(tile({ targetsSet: 1 }).sub).toContain('1 target set');
  });
});
