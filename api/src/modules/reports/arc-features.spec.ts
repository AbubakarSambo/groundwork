import { computeArcSignals, tierCopy, ArcInput } from './arc-features';

/**
 * GW-ARC tripwires - the guard test the design hangs on:
 *   1. a CONSISTENT arc lands CONSISTENT_ARC,
 *   2. a back-loaded but HONEST arc (late delivery, documented) must NOT trip
 *      the composite - it stays MIXED, never CONCENTRATED_FINISH,
 *   3. a fabricated-at-the-end arc MUST land CONCENTRATED_FINISH,
 *   4. the word "gamed" (game/gaming) appears in NO user-facing output,
 *   5. F3 is informational and never part of the composite.
 */

const day = (n: number) => new Date(Date.UTC(2026, 0, 1 + n));

function sessions(completed: number[], finalNumber: number): ArcInput['sessions'] {
  const all = [];
  for (let n = 1; n < finalNumber; n++) {
    all.push({ sessionNumber: n, isFinal: false, completedAt: completed.includes(n) ? day(n * 7) : null });
  }
  all.push({ sessionNumber: finalNumber, isFinal: true, completedAt: day(finalNumber * 7) });
  return all;
}

describe('GW-ARC: deterministic arc features', () => {
  it('a consistent arc lands CONSISTENT_ARC and earns the stated reward', () => {
    const input: ArcInput = {
      sessions: sessions([1, 2, 3, 4], 5),
      entries: [
        { sessionNumber: 1, type: 'SUCCESS_DEFINITION', recallBased: true, threadKey: 'goal-a' },
        { sessionNumber: 2, type: 'COMMITMENT', recallBased: false, threadKey: 'goal-a' },
        { sessionNumber: 3, type: 'COMMITMENT', recallBased: false, threadKey: 'goal-b' },
        { sessionNumber: 4, type: 'COMMITMENT', recallBased: true, threadKey: 'goal-a' },
        { sessionNumber: 5, type: 'COMMITMENT', recallBased: false, threadKey: 'goal-a' },
        { sessionNumber: 5, type: 'WORRY', recallBased: true, threadKey: 'goal-b' },
      ],
      docs: [{ createdAt: day(14) }, { createdAt: day(21) }, { createdAt: day(34) }],
      finalCompletedAt: day(35),
    };
    const s = computeArcSignals(input);
    expect(s.tier).toBe('CONSISTENT_ARC');
    expect(s.firedCount).toBe(0);
    expect(tierCopy(s.tier).shared).toContain('consistently');
    expect(tierCopy(s.tier).advisory).toBeNull();
  });

  it('a back-loaded but HONEST arc (late delivery, documented) does NOT trip the composite', () => {
    // Delivery genuinely happened at the end - but it arrives DOCUMENT-ANCHORED
    // (recallBased false) and the docs came during the work, sessions were
    // attended. F1 fires alone; the composite (>=2) must NOT.
    const input: ArcInput = {
      sessions: sessions([1, 2, 3, 4], 5),
      entries: [
        { sessionNumber: 1, type: 'SUCCESS_DEFINITION', recallBased: true, threadKey: 'goal-a' },
        { sessionNumber: 2, type: 'WORRY', recallBased: true, threadKey: 'goal-a' },
        { sessionNumber: 3, type: 'TENSION', recallBased: true, threadKey: 'goal-a' },
        { sessionNumber: 5, type: 'COMMITMENT', recallBased: false, threadKey: 'goal-a' },
        { sessionNumber: 5, type: 'COMMITMENT', recallBased: false, threadKey: 'goal-b' },
        { sessionNumber: 5, type: 'COMMITMENT', recallBased: false, threadKey: 'goal-a' },
      ],
      docs: [{ createdAt: day(10) }, { createdAt: day(20) }, { createdAt: day(34) }],
      finalCompletedAt: day(35),
    };
    const s = computeArcSignals(input);
    expect(s.f1_concentration.fired).toBe(true); // late delivery IS late
    expect(s.f2_lateUnsupported.fired).toBe(false); // but documented, not memory-only
    expect(s.f4_cadenceShape.fired).toBe(false); // and the sessions happened
    expect(s.f5_evidenceTiming.fired).toBe(false); // and the docs came along the way
    expect(s.firedCount).toBe(1);
    expect(s.tier).toBe('MIXED'); // NEVER the negative tier on one feature
  });

  it('a fabricated-at-the-end arc lands CONCENTRATED_FINISH', () => {
    // Thin middle (2 of 5 mid-sessions completed), everything memory-only,
    // new threads appearing only at the close, documents dumped in the last
    // 48h. Every composite feature has something real to detect.
    const input: ArcInput = {
      sessions: sessions([1, 2], 6),
      entries: [
        { sessionNumber: 1, type: 'SUCCESS_DEFINITION', recallBased: true, threadKey: 'goal-a' },
        { sessionNumber: 6, type: 'COMMITMENT', recallBased: true, threadKey: 'goal-x' },
        { sessionNumber: 6, type: 'COMMITMENT', recallBased: true, threadKey: 'goal-y' },
        { sessionNumber: 6, type: 'COMMITMENT', recallBased: true, threadKey: null },
      ],
      docs: [{ createdAt: day(41) }, { createdAt: day(42) }],
      finalCompletedAt: day(42),
    };
    const s = computeArcSignals(input);
    expect(s.f1_concentration.fired).toBe(true);
    expect(s.f2_lateUnsupported.fired).toBe(true);
    expect(s.f4_cadenceShape.fired).toBe(true);
    expect(s.f5_evidenceTiming.fired).toBe(true);
    expect(s.firedCount).toBeGreaterThanOrEqual(2);
    expect(s.tier).toBe('CONCENTRATED_FINISH');
    const copy = tierCopy(s.tier);
    expect(copy.shared).toContain('concentrated in the closing session');
    expect(copy.advisory).toContain('Worth asking about the history');
  });

  it('the words game/gamed/gaming appear in NO user-facing output', () => {
    for (const tier of ['CONSISTENT_ARC', 'MIXED', 'CONCENTRATED_FINISH'] as const) {
      const { shared, advisory } = tierCopy(tier);
      expect(shared).not.toMatch(/\bgam(e|ed|ing)\b/i);
      expect(advisory ?? '').not.toMatch(/\bgam(e|ed|ing)\b/i);
    }
    // and the feature details themselves
    const s = computeArcSignals({ sessions: sessions([1], 2), entries: [], docs: [], finalCompletedAt: day(14) });
    for (const f of [s.f1_concentration, s.f2_lateUnsupported, s.f3_storyShift, s.f4_cadenceShape, s.f5_evidenceTiming]) {
      expect(f.detail).not.toMatch(/\bgam(e|ed|ing)\b/i);
    }
  });

  it('F3 is informational only - it can never enter the composite', () => {
    const s = computeArcSignals({ sessions: sessions([1], 2), entries: [], docs: [], finalCompletedAt: day(14) });
    expect(s.f3_storyShift.informational).toBe(true);
    expect(s.f3_storyShift.fired).toBe(false);
  });
});
