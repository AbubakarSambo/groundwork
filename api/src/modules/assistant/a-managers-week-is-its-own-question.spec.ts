import { route } from './the-router-is-deterministic';
import { NOTHING_FLAGGED, NOT_A_RANKING } from '../detectors/who-needs-you-this-week';

/**
 * TWO QUESTIONS ABOUT THE SAME HANDOFFS, WANTING DIFFERENT ANSWERS.
 *
 * "What am I waiting on" is a list somebody chases. "Where am I needed" is a week grouped by what it
 * asks of the person asking.
 *
 * The lane it genuinely collides with is `how_am_i_doing`, not the handoff lane I expected: "what
 * should I focus on this week" is the same words as somebody asking after their own standing, and
 * the two want opposite answers - one is that person's own record, the other is four lists of other
 * people. Driving the assembled router is what said so; with this lane removed, every other phrasing
 * simply falls through unplaced. Which is why this file calls `route` rather than testing patterns.
 */
describe('a manager asking where they are needed', () => {
  for (const asked of [
    'where am I needed?',
    'who needs me this week',
    'who needs my attention',
    'what should I focus on this week',
    'where do I start?',
    'how is my week looking',
  ]) {
    it(`routes "${asked}" to the week`, () => {
      expect(route(asked).lane).toBe('where_am_i_needed');
    });
  }
});

describe('and the questions it must not swallow', () => {
  for (const [asked, lane] of [
    ['what am I waiting on?', 'what_is_stuck'],
    ['who is waiting on me', 'what_is_stuck'],
    ["what's blocked", 'what_is_stuck'],
  ] as const) {
    it(`leaves "${asked}" with ${lane}`, () => {
      expect(route(asked).lane).toBe(lane);
    });
  }

  it('does not take a question about how somebody is doing', () => {
    expect(route('how am I doing?').lane).not.toBe('where_am_i_needed');
  });

  it('but does take the one phrasing that lane would otherwise swallow', () => {
    /*
     * The real boundary. "What should I focus on this week" reads to `how_am_i_doing` as a question
     * about the asker and to this lane as a question about their team, and the team answer is the
     * one somebody wants when they say "this week".
     */
    expect(route('what should I focus on this week').lane).toBe('where_am_i_needed');
  });
});

describe('what the answer refuses to mean', () => {
  it('an empty week never reads as everybody being fine', () => {
    expect(NOTHING_FLAGGED).toContain('does not tell you how anybody is');
  });

  it('and the caveat is three separate things, because one sentence gets skimmed', () => {
    expect(NOT_A_RANKING).toHaveLength(3);
    expect(NOT_A_RANKING.join(' ')).toContain('not being compared');
  });
});
