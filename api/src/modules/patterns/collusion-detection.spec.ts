import {
  collusionRuleGate,
  ALIGNMENT_FEED_ONLY_CODES,
  PATTERN_PROBE_BY_CODE,
  CollusionGateInput,
} from './pattern-library';

/**
 * COLLUSION_RISK guards.
 *
 * (1) BOUNDARY (the non-negotiable): COLLUSION_RISK must be admin-feed-only and
 *     have NO live probe, so it can never surface to the accused or enter a
 *     participant-facing report. Remove it from the feed-only set -> it would
 *     flow into the report via concernFlags -> this bites.
 *
 * (2) FALSE-POSITIVE DESIGN (the part to get right): genuine agreement must NOT
 *     flag. The rule gate is pure; these prove an independent anchor exempts the
 *     pair (hard gate), reciprocity is mandatory, and a real shared claim is
 *     required - while a truly circular, unanchored, reciprocal pair does flag.
 */

const colluding: CollusionGateInput = {
  aNamesB: true,
  bNamesA: true,
  aCompletionOnShared: true,
  bCompletionOnShared: true,
  sharedTopicTokens: ['migration', 'rollout'],
  hasIndependentAnchor: false,
};

describe('COLLUSION_RISK boundary (feed-only, no probe)', () => {
  it('is admin-feed-only', () => {
    expect(ALIGNMENT_FEED_ONLY_CODES.has('COLLUSION_RISK')).toBe(true);
  });
  it('has no live probe (never surfaces to the accused in conversation)', () => {
    expect(PATTERN_PROBE_BY_CODE.has('COLLUSION_RISK')).toBe(false);
  });
});

describe('COLLUSION_RISK rule gate - genuine agreement must not flag', () => {
  it('flags a reciprocal, unanchored, shared-claim pair', () => {
    expect(collusionRuleGate(colluding).candidate).toBe(true);
  });

  it('HARD GATE: an independent anchor exempts the pair even if all else matches', () => {
    const r = collusionRuleGate({ ...colluding, hasIndependentAnchor: true });
    expect(r.candidate).toBe(false);
    expect(r.reason).toMatch(/independent anchor/i);
  });

  it('does NOT flag one-directional credit (R3, not collusion)', () => {
    expect(collusionRuleGate({ ...colluding, bNamesA: false }).candidate).toBe(false);
  });

  it('does NOT flag when there is no shared claim (no topic overlap)', () => {
    expect(collusionRuleGate({ ...colluding, sharedTopicTokens: [] }).candidate).toBe(false);
  });

  it('does NOT flag without completion framing on the shared claim', () => {
    expect(collusionRuleGate({ ...colluding, aCompletionOnShared: false }).candidate).toBe(false);
  });

  it('anchor check wins over reciprocity - order matters (anchor reported first)', () => {
    // both broken: anchored AND one-directional. The hard gate must be the reason.
    const r = collusionRuleGate({ ...colluding, hasIndependentAnchor: true, bNamesA: false });
    expect(r.candidate).toBe(false);
    expect(r.reason).toMatch(/independent anchor/i);
  });
});
