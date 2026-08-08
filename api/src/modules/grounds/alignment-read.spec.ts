import { alignmentRead } from './grounds.service';

/**
 * ALIGNMENT IS WHAT THE REPORT NAMES, NOT HOW OFTEN PEOPLE TURNED UP.
 *
 * The ground carried a `confidence` of min(5, completedCheckIns), rendered as
 * "5/5 Aligned" with a five-step ladder from Unresolved to Aligned. It measured
 * activity. Across a ten-ground run it could not tell activity and agreement
 * apart:
 *
 *   Adam, advisor terms       5 agreements, 0 divergences  ->  "5/5 Aligned"
 *   Hafeezah, improvement     0 agreements, 0 divergences  ->  "5/5 Aligned"
 *
 * The second is a formal performance process. Its report contained nothing at
 * all, sixteen check-ins had happened, and the product told both parties they
 * were fully aligned. That is the failure these tests exist to prevent: not an
 * inaccurate number, but a manufactured agreement on the record of someone whose
 * job may depend on it.
 *
 * Two states, never three. The report holds `agreements` and `divergences`; a
 * "partly there" bucket would have to be invented to match a marketing
 * sentence, and inventing a state to fit copy is how a check-in count came to
 * be called "Aligned" in the first place.
 */

describe('an empty record makes no claim', () => {
  it('returns null when the report names nothing at all', () => {
    // Hafeezah's improvement plan, exactly.
    expect(alignmentRead({ agreements: [], divergences: [] })).toBeNull();
  });

  it('returns null when there is no report yet', () => {
    expect(alignmentRead(null)).toBeNull();
    expect(alignmentRead(undefined)).toBeNull();
  });

  it('returns null when the fields are absent or not arrays', () => {
    // Reports are JSON columns; a malformed one must read as "no claim",
    // never as zero-agreed-zero-open dressed up as a result.
    expect(alignmentRead({})).toBeNull();
    expect(alignmentRead({ agreements: null, divergences: undefined })).toBeNull();
    expect(alignmentRead({ agreements: 'three' as any, divergences: 7 as any })).toBeNull();
  });
});

describe('a real record is counted, and only counted', () => {
  it('reads a full consensus', () => {
    expect(alignmentRead({ agreements: [1, 2, 3, 4, 5], divergences: [] })).toEqual({ agreed: 5, open: 0 });
  });

  it('reads a mixed picture', () => {
    expect(alignmentRead({ agreements: [1, 2, 3, 4], divergences: [1] })).toEqual({ agreed: 4, open: 1 });
  });

  it('reads total disagreement', () => {
    expect(alignmentRead({ agreements: [], divergences: [1, 2] })).toEqual({ agreed: 0, open: 2 });
  });

  it('tells a real consensus apart from an empty record - the whole point', () => {
    const adam = alignmentRead({ agreements: [1, 2, 3, 4, 5], divergences: [] });
    const hafeezah = alignmentRead({ agreements: [], divergences: [] });
    expect(adam).not.toEqual(hafeezah);
    expect(hafeezah).toBeNull();
  });
});

describe('nothing about check-ins can reach it', () => {
  it('ignores anything that is not agreements or divergences', () => {
    // The signature guard: the function is given the report and nothing else,
    // so a session count has no route in. Two reports with identical arrays
    // must read identically however much work went into either.
    const quiet = alignmentRead({ agreements: [1], divergences: [1] });
    const busy = alignmentRead({
      agreements: [1],
      divergences: [1],
      ...({ sessions: 76, checkIns: 200, completedCount: 76 } as any),
    });
    expect(busy).toEqual(quiet);
  });
});
