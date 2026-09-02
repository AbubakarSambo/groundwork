import { unmatchedQuotes, withoutQuotesTheyDidNotSay } from './a-quote-has-to-match-what-they-said';

/**
 * The example is real. A lead wrote "Sam is waiting on me and I know it." and the next turn quoted
 * her back with "iss" and an orphan closing mark. One letter, and it is the difference between
 * reading somebody their own words and telling them what they said.
 */
describe('a quote has to match what they said', () => {
  const THEIR_TURNS = [
    'The pricing band has not been agreed. I keep meaning to sit down and do it and then something else takes the week. Sam is waiting on me and I know it.',
  ];

  it('catches the misquote that was actually shipped', () => {
    const reply = 'You named your part in this before I asked: "Sam iss waiting on me and I know it." That matters.';
    expect(unmatchedQuotes(reply, THEIR_TURNS)).toEqual(['Sam iss waiting on me and I know it.']);
  });

  it('lets a true quote through untouched, which is most of them', () => {
    const reply = 'You said it yourself: "Sam is waiting on me and I know it." What is taking the week?';
    expect(unmatchedQuotes(reply, THEIR_TURNS)).toEqual([]);
    expect(withoutQuotesTheyDidNotSay(reply, THEIR_TURNS)).toBe(reply);
  });

  it('ignores punctuation and spacing, which never decide whether somebody was misquoted', () => {
    const reply = 'You said "Sam is waiting on me, and I know it" and that is the part that matters.';
    expect(unmatchedQuotes(reply, THEIR_TURNS)).toEqual([]);
  });

  it('leaves short phrases alone, because those are speech and not attribution', () => {
    /* Guarding these would strip half the product's ordinary sentences. */
    const reply = 'The phrase "takes the week" is doing a lot of work here.';
    expect(unmatchedQuotes(reply, THEIR_TURNS)).toEqual([]);
  });

  it('takes the marks off rather than deleting the sentence', () => {
    /* The sentence around it is usually right. Only the claim that these were their words is wrong. */
    const reply = 'You named it before I asked: "Sam iss waiting on me and I know it." That matters.';
    const fixed = withoutQuotesTheyDidNotSay(reply, THEIR_TURNS);
    expect(fixed).toContain('Sam iss waiting on me and I know it.');
    expect(fixed).not.toContain('"');
    expect(fixed).toContain('That matters');
  });

  it('handles curly quotes, which is what the house style turns them into', () => {
    const reply = 'You said “Sam iss waiting on me and I know it.”';
    expect(unmatchedQuotes(reply, THEIR_TURNS)).toEqual(['Sam iss waiting on me and I know it.']);
  });

  it('says nothing when there is nothing quoted, and survives an empty conversation', () => {
    expect(unmatchedQuotes('No quotation marks here at all.', THEIR_TURNS)).toEqual([]);
    expect(unmatchedQuotes('He said "something they never wrote down anywhere"', [])).toEqual(['something they never wrote down anywhere']);
  });
});
