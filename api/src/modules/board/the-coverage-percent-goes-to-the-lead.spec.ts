import { coverageAsThisReaderMayRead, withNoRatingNumber } from './no-rating-is-served';

/**
 * DECISION 141 (3), 12 October 2026: "The coverage bar as a percentage beside a person's name: bring it
 * back for the lead, as the prototype shows. Never sort or rank people by it."
 *
 * The engine's read (reads.ts) carries `pct` with its confidence. The lead is served the percentage as
 * `landingPercent`; nobody else is, the engine's own `pct`, confidence and count of evidence still reach
 * nobody, and the rows stay in the engine's order.
 */
const read = (participantId: string, name: string, pct: number, extra: Record<string, unknown> = {}) => ({
  participantId, name, scope: 'role', pct, confidence: 0.4, evidenceCount: 6, kind: 'STABLE', trend: 'stable',
  what: 'x', reason: 'r', reasonText: 'y', ownVoice: null, coupledToBlocker: false, remitDefined: true, shown: true, ...extra,
});
const THE_ENGINES_READ = {
  scope: 'role',
  reads: [read('p-rukia', 'Rukia Otieno', 10), read('p-brian', 'Brian Mwangi', 70), read('p-amani', 'Amani Njeri', 30), read('p-jo', 'Jo Ade', 50, { remitDefined: false }), read('p-kim', 'Kim Oti', 90, { shown: false })],
};

describe('the coverage percentage', () => {
  it('the lead is served each person\'s percentage, in the engine\'s order, and it survives the net under the board', () => {
    const served = withNoRatingNumber({ coverage: coverageAsThisReaderMayRead(THE_ENGINES_READ, 'p-lead', { theLead: true }) });
    const reads = served.coverage!.reads as any[];
    expect(reads.map((r) => [r.name, r.landingPercent])).toEqual([
      ['Rukia Otieno', 10], ['Brian Mwangi', 70], ['Amani Njeri', 30],
      /* No role to measure against, and a read too thin to show: no percentage. */
      ['Jo Ade', undefined], ['Kim Oti', undefined],
    ]);
    for (const r of reads) {
      expect(r).not.toHaveProperty('pct');
      expect(r).not.toHaveProperty('confidence');
      expect(r).not.toHaveProperty('evidenceCount');
    }
  });

  it('a participant is never served a percentage, not even on their own row', () => {
    const reads = coverageAsThisReaderMayRead(THE_ENGINES_READ, 'p-rukia')!.reads as any[];
    expect(reads.some((r) => 'landingPercent' in r || 'pct' in r)).toBe(false);
  });
});
