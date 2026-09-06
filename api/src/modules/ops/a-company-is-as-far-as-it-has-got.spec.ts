/**
 * Three fields described one journey, and the board read the wrong one.
 *
 * A company carried its own stage, a deal carried another, and a deployment a
 * third. Meridian Care sat at LINED_UP while its deployment was ONBOARDING and
 * its deal was at MEETING — and the target list board, which counts by the company
 * field, reported that nothing had moved all month.
 *
 * Nobody had done anything wrong. Sahar advanced the deployment, which is the
 * record that describes the work; nothing asked her to also update a summary of
 * it. That is not a discipline problem, it is a design one.
 *
 * Found on the company page, which put all three side by side for the first
 * time. Neither the code nor any single table showed it.
 */
import { furthestReached, isBehind } from './a-company-is-as-far-as-it-has-got';

describe('how far a company has actually got', () => {
  it('is the stored stage when nothing else has happened', () => {
    expect(furthestReached({ stored: 'LINED_UP', salesStages: [], deploymentStages: [] })).toBe('LINED_UP');
  });

  it('is pulled forward by a deployment in progress — the case that started this', () => {
    expect(
      furthestReached({ stored: 'LINED_UP', salesStages: ['DEMO_DISCOVERY'], deploymentStages: ['ONBOARDING'] }),
    ).toBe('ONBOARDED');
  });

  it('and by a deal that reached a demo, even with no deployment', () => {
    expect(furthestReached({ stored: 'LINED_UP', salesStages: ['DEMO_DISCOVERY'], deploymentStages: [] })).toBe(
      'USE_CASE_CONFIRMED',
    );
  });

  it('never goes backwards, because a stage reached is a fact', () => {
    /**
     * A deployment record deleted, or a deal reopened, must not un-live a
     * company that went live. Losing that would be worse than any staleness.
     */
    expect(furthestReached({ stored: 'LIVE', salesStages: ['LEAD'], deploymentStages: [] })).toBe('LIVE');
  });

  it('and a lost deal proves nothing about how far they got', () => {
    expect(furthestReached({ stored: 'LINED_UP', salesStages: ['LOST'], deploymentStages: [] })).toBe(
      'LINED_UP',
    );
  });

  it('takes the furthest of several, not the first or the last', () => {
    expect(
      furthestReached({
        stored: 'LINED_UP',
        salesStages: ['LOST', 'VERBAL_YES', 'LEAD'],
        deploymentStages: ['LIVE', 'SETUP'],
      }),
    ).toBe('LIVE');
  });
});

describe('saying that the summary was stale', () => {
  /**
   * Said out loud rather than silently corrected. A number that moves on its own
   * with no explanation is the thing that makes people distrust a board.
   */
  it('is true when the stored stage is behind', () => {
    expect(isBehind('LINED_UP', 'ONBOARDED')).toBe(true);
  });

  it('and false when it is not', () => {
    expect(isBehind('ONBOARDED', 'ONBOARDED')).toBe(false);
    expect(isBehind('LIVE', 'ONBOARDED')).toBe(false);
  });
});
