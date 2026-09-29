import { personKeyFrom, jaccard, finalPatternSet } from './pattern-steadiness';

describe('pattern-steadiness: the stable person key survives a run\'s throwaway email', () => {
  it('takes the token before the first dot', () => {
    expect(personKeyFrom('mgr.1790714856050@pip.test')).toBe('mgr');
    expect(personKeyFrom('nathan.1790714856050@pip.test')).toBe('nathan');
  });

  it('falls back sensibly on an email with no timestamp suffix', () => {
    expect(personKeyFrom('femi@pip.test')).toBe('femi');
  });

  it('never throws on nothing', () => {
    expect(personKeyFrom(null)).toBe('unknown');
    expect(personKeyFrom(undefined)).toBe('unknown');
    expect(personKeyFrom('')).toBe('unknown');
  });
});

describe('pattern-steadiness: Jaccard overlap', () => {
  it('is 1 when both sets are identical', () => {
    const a = new Set(['mgr::R2', 'nathan::B9']);
    expect(jaccard(a, new Set(a))).toBe(1);
  });

  it('is 1 when both sets are empty (nothing found, in agreement)', () => {
    expect(jaccard(new Set(), new Set())).toBe(1);
  });

  it('is 0 when the sets share nothing', () => {
    expect(jaccard(new Set(['mgr::R2']), new Set(['nathan::B9']))).toBe(0);
  });

  it('is the size of the overlap over the size of the union', () => {
    const a = new Set(['x::A', 'x::B', 'x::C']);
    const b = new Set(['x::B', 'x::C', 'x::D']);
    // intersection {B,C} = 2, union {A,B,C,D} = 4
    expect(jaccard(a, b)).toBe(0.5);
  });
});

describe('pattern-steadiness: the final pattern set is read from the last, cumulative session', () => {
  it('reads only the last session\'s patterns, keyed by person and code', () => {
    const run = {
      sessions: [
        { session: 1, patterns: [{ code: 'R2', participant: { email: 'mgr.111@pip.test' } }] },
        {
          session: 2,
          patterns: [
            { code: 'R2', participant: { email: 'mgr.111@pip.test' } },
            { code: 'B9', participant: { email: 'nathan.111@pip.test' } },
          ],
        },
      ],
    };
    expect(finalPatternSet(run)).toEqual(new Set(['mgr::R2', 'nathan::B9']));
  });

  it('is empty for a scenario with no sessions', () => {
    expect(finalPatternSet({ sessions: [] })).toEqual(new Set());
  });
});
