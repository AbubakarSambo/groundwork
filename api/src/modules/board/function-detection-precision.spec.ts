import { detectFunction } from './function-detection';

/**
 * ORDINARY ENGLISH IS NOT A SALES SIGNAL.
 *
 * An eighteen-ground org run classified an entire software project team as SALES
 * at 0.65-0.82 confidence, and the board then read each of them against "named
 * buyers with budget and authority, real pipeline moving". They were agreeing
 * scope and ownership on a build.
 *
 * The cause was the signal list, which contained bare `close[ds]?`, `lead[s]?`,
 * `intro` and `demo`. "Closed out three of the open questions with Priya" is
 * project work in any company; it scored SALES. A lens becomes a label the
 * moment it is confidently wrong, and 0.78 is confident.
 */

const acct = (...t: string[]) => t;

describe('generic work words no longer read as sales', () => {
  it('does not call closing out questions a sale', () => {
    const r = detectFunction('Delivery lead', acct('Closed out 3 of the open questions with Priya this week'));
    expect(r.fn).not.toBe('SALES');
  });

  it('does not call leading a workstream a sale', () => {
    const r = detectFunction('Delivery lead', acct('I lead the migration workstream and unblocked two people'));
    expect(r.fn).not.toBe('SALES');
  });

  it('does not call an internal demo a sale', () => {
    const r = detectFunction(null, acct('Gave a demo of the new dashboard to the team on Tuesday'));
    expect(r.fn).not.toBe('SALES');
  });

  it('does not call an intro a sale', () => {
    const r = detectFunction(null, acct('Did an intro session for the two new joiners'));
    expect(r.fn).not.toBe('SALES');
  });
});

describe('actual sales work still reads as sales', () => {
  it('closing a deal', () => {
    expect(detectFunction(null, acct('Closed the deal with Acme on Tuesday, they are paying')).fn).toBe('SALES');
  });

  it('prospects and pipeline', () => {
    expect(detectFunction(null, acct('Two new prospects in the pipeline, one is a budget holder')).fn).toBe('SALES');
  });

  it('a proposal into procurement', () => {
    expect(detectFunction(null, acct('Sent the proposal to their procurement team last week')).fn).toBe('SALES');
  });
});

describe('what happens when the account says nothing useful', () => {
  it('falls back to a stated role, held below the coaching threshold', () => {
    const r = detectFunction('Engineering lead - I own the platform', acct('Going well, no real problems'));
    expect(r.fn).toBe('ENGINEERING');
    expect(r.confidence).toBeLessThan(0.5);
  });

  it('returns nothing at all rather than guessing, when there is no role either', () => {
    // Correct, and worth pinning: the honest answer to "who is this person,
    // functionally" can be "we do not know yet". Inventing one is how the board
    // starts judging someone against a bar from a different job.
    const r = detectFunction('scope, who owns what', acct('Going well', 'Not much to add'));
    expect(r.fn).toBeNull();
    expect(r.confidence).toBe(0);
  });
});
