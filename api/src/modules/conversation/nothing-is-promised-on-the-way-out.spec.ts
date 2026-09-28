import { withoutPromisingTheReport, WHAT_ACTUALLY_HAPPENS_NEXT, theReportIsNotTheirsYet } from './the-report-is-not-yours-to-promise';

/**
 * THE LAST THING IT SAYS IS THE THING IT IS MOST TRUSTED ON.
 *
 * Both of these were read live in the close of the update run, 23 September 2026, to somebody who
 * had followed a link once from an organisation she had no relationship with: that her report was
 * ready, which was not for this conversation to say, and "Speak soon", which nobody had arranged.
 */
describe('the close of a one-time answer', () => {
  it('keeps what they said and drops what nobody can keep', () => {
    const close = 'You said you will send the volumes by Friday. Your report is ready now. Speak soon.';
    const out = withoutPromisingTheReport(close);
    expect(out).toBe(`You said you will send the volumes by Friday. ${WHAT_ACTUALLY_HAPPENS_NEXT}`);
  });

  it('drops the goodbye even where nothing was claimed about the report', () => {
    expect(withoutPromisingTheReport('Thank you for the detail. Speak soon.'))
      .toBe(`Thank you for the detail. ${WHAT_ACTUALLY_HAPPENS_NEXT}`);
    expect(withoutPromisingTheReport('That is noted. See you in two weeks.'))
      .toBe(`That is noted. ${WHAT_ACTUALLY_HAPPENS_NEXT}`);
  });

  /* The only thing the product gives back for five minutes of somebody's work. */
  it('and never the thanks', () => {
    const out = withoutPromisingTheReport('Thanks for your time. Your report is ready now.');
    expect(out).toContain('Thanks for your time.');
  });

  it('and leaves a close that promised nothing exactly as it was', () => {
    const honest = 'You said you will speak to the aggregators in Kogi this month.';
    expect(withoutPromisingTheReport(honest)).toBe(honest);
  });

  it('only where the organiser is the one who releases it', () => {
    expect(theReportIsNotTheirsYet('TEAM_UPDATES')).toBe(true);
    expect(theReportIsNotTheirsYet('ALIGNMENT')).toBe(false);
  });
});
