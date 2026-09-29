import { theStreamedRouteRunsThePlainRoute } from './__fixtures__/the-streamed-route-is-the-plain-route';
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

  it('catches a misquote wearing an unbalanced quotation mark', () => {
    /*
     * Live, with the paired check already running: `Board prep took mostt of last week" and in that
     * trade-off, the pricing band lost.` One closing mark, no opening one, and one letter wrong. The
     * pair matcher never saw it, so it shipped and nothing was logged.
     */
    const said = ['Board prep took most of last week and I told myself the pricing band could wait.'];
    const reply = 'Board prep took mostt of last week" and in that trade-off, the pricing band lost.';
    expect(unmatchedQuotes(reply, said)).toEqual(['Board prep took mostt of last week']);
    expect(withoutQuotesTheyDidNotSay(reply, said)).not.toContain('"');
  });

  it('leaves an unbalanced mark alone when the words really are theirs', () => {
    const said = ['Board prep took most of last week and the band could wait.'];
    const reply = 'Board prep took most of last week" and that is the trade-off.';
    expect(unmatchedQuotes(reply, said)).toEqual([]);
  });

  it('says nothing when there is nothing quoted, and survives an empty conversation', () => {
    expect(unmatchedQuotes('No quotation marks here at all.', THEIR_TURNS)).toEqual([]);
    expect(unmatchedQuotes('He said "something they never wrote down anywhere"', [])).toEqual(['something they never wrote down anywhere']);
  });
});

/**
 * AND IT IS WIRED INTO THE REPLY, WHICH IT WAS NOT.
 *
 * This module was written weeks ago and reached the coaching and the report. The reply - the only
 * text a person actually reads - ran without it. Read in the browser, 22 September 2026, one turn
 * after a document was confirmed: 'You also mentioned earlier that "What moved in your part?"' - the
 * product's own question from the turn before, in quotation marks, attributed to her.
 */
describe('the reply goes through it too', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, 'conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  it('on the turn path', () => {
    expect(src).toContain('const honestlyQuoted = withoutQuotesTheyDidNotSay(reply, personWords)');
    expect(src).toContain('a quotation nobody said lost its marks');
  });

  it('and on the streaming path, which is the one the screen uses', () => {
    /* Changed 28 Sep 2026: the streamed route now runs sendMessage itself (the-streamed-route-is-the-plain-route), so a rule held on both paths is in sendMessage once, and the stream runs it. */
    expect(theStreamedRouteRunsThePlainRoute(src)).toBe(true);
    expect(src.slice(src.indexOf('async sendMessage(checkInId'))).toMatch(/withoutQuotesTheyDidNotSay\(/);
  });

  it('and the product question that started this loses its marks', () => {
    const { withoutQuotesTheyDidNotSay: strip } = require('./a-quote-has-to-match-what-they-said');
    const said = ['We are about 7.8m booked and I have not checked the invoices.'];
    const reply = 'You also mentioned earlier that "What moved in your part?" What has moved since?';
    expect(strip(reply, said)).toBe('You also mentioned earlier that What moved in your part? What has moved since?');
    /* And a real quotation keeps its marks. */
    expect(strip('You said "We are about 7.8m booked and I have not checked the invoices." What changed?', said))
      .toContain('"We are about 7.8m booked');
  });
});
