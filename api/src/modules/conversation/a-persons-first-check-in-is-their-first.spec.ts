import { whereInTheRun } from './where-in-the-run';

/**
 * RE-TEST, 22 NOVEMBER 2026 EVENING (R-13). Sade was added to the sales team in session 3. Her first check-in opened "Sade, let's talk about
 * your customer work since we last spoke ... Which customers have you worked with since our last check-in?" The model was told where the
 * run stands from the team's session (3 of 12: MIDDLE, "open from what this person said they own"), though she had never spoken to it.
 * A person's first conversation is a first check-in; what is left of the run stays the team's.
 */
describe('where in the run, for somebody added late', () => {
  it('is FIRST for Sade in the team\'s third session, with the team\'s check-ins still to come', () => {
    const lines = whereInTheRun({ sessionNumber: 3, theirOwnSession: 1, totalSessions: 12 });
    expect(lines[0]).toMatch(/^WHERE_IN_THE_RUN: first - /);
    expect(lines[0]).toContain('9 further check-in(s) planned after this one.');
    expect(lines.join('\n')).not.toMatch(/MIDDLE/);
  });
  it('is MIDDLE for somebody in their own third session', () => {
    expect(whereInTheRun({ sessionNumber: 3, theirOwnSession: 3, totalSessions: 12 })[0]).toMatch(/^WHERE_IN_THE_RUN: middle - /);
  });
  it('and for a check-in that runs until the lead ends it', () => {
    expect(whereInTheRun({ sessionNumber: 3, theirOwnSession: 1, runsUntilEnded: true })[0]).toMatch(/^WHERE_IN_THE_RUN: first - /);
  });
});
