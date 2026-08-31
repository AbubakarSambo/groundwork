import { hasCoachingRunOut, HowItHasGone, PERIODS_BEFORE_A_CONVERSATION } from './when-coaching-has-stopped-being-enough';

/* The shape where every condition holds. Each test below breaks exactly one of them. */
const RUN_OUT: HowItHasGone = {
  what: 'send the pricing over to Dele',
  periods: 3,
  seen: true,
  blockers: 0,
  stepsOffered: 2,
  stepsManaged: 0,
};

describe('escalation recommends a conversation and decides nothing', () => {
  it('recommends one when the ordinary cycle has been tried and nothing moved', () => {
    const e = hasCoachingRunOut(RUN_OUT);
    expect(e.recommend).toBe(true);
  });

  it('quotes what they said rather than describing them', () => {
    const e = hasCoachingRunOut(RUN_OUT) as any;
    expect(e.says).toContain('"send the pricing over to Dele"');
  });

  it('never says anybody is failing, and never decides anything', () => {
    const e = hasCoachingRunOut(RUN_OUT) as any;
    const said = e.says.toLowerCase();
    /*
     * The line between a recommendation and a verdict is the whole product. These are the words a
     * recommendation of this kind slides into once somebody edits it in a hurry.
     */
    for (const verdict of ['failing', 'underperform', 'warning', 'formal', 'disciplin', 'poor performer', 'must improve', 'final']) {
      expect(said).not.toContain(verdict);
    }
  });

  it('says the reason is still open rather than supplying one', () => {
    const e = hasCoachingRunOut(RUN_OUT) as any;
    expect(e.says).toContain('still');
    expect(e.says.toLowerCase()).toContain('open question');
  });

  it('says nothing at all before three check-ins, because twice is a fortnight', () => {
    expect(hasCoachingRunOut({ ...RUN_OUT, periods: PERIODS_BEFORE_A_CONVERSATION - 1 }).recommend).toBe(false);
  });

  it('says nothing when they were never shown it, which is the unfairest escalation there is', () => {
    const e = hasCoachingRunOut({ ...RUN_OUT, seen: false });
    expect(e.recommend).toBe(false);
    expect((e as any).because).toContain('not been shown');
  });

  it('says nothing while something is recorded as blocking it', () => {
    const e = hasCoachingRunOut({ ...RUN_OUT, blockers: 1 });
    expect(e.recommend).toBe(false);
    expect((e as any).because).toContain('different conversation');
  });

  it('says nothing when no smaller step was ever offered, because that is skipping the part that helps', () => {
    const e = hasCoachingRunOut({ ...RUN_OUT, stepsOffered: 0 });
    expect(e.recommend).toBe(false);
    expect((e as any).because).toContain('has not been tried');
  });

  it('says nothing when some of it moved, because slower than hoped is not stuck', () => {
    expect(hasCoachingRunOut({ ...RUN_OUT, stepsManaged: 1 }).recommend).toBe(false);
  });

  it('always gives a reason when it declines, so a lead is never left wondering', () => {
    for (const broken of [
      { ...RUN_OUT, periods: 1 }, { ...RUN_OUT, seen: false }, { ...RUN_OUT, blockers: 2 },
      { ...RUN_OUT, stepsOffered: 0 }, { ...RUN_OUT, stepsManaged: 3 },
    ]) {
      const e = hasCoachingRunOut(broken) as any;
      expect(e.recommend).toBe(false);
      expect(e.because.length).toBeGreaterThan(20);
    }
  });
});
