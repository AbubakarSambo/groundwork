import * as fs from 'fs';
import * as path from 'path';
import { whenThisIsOver, theyAskedWhenThisIsOver } from './when-this-is-over';

/**
 * "HOW DO I KNOW IF WE ARE DONE" IS A QUESTION ABOUT THE RUN.
 *
 * Read live on an open link, 22 September 2026: the answer was a summary of the conversation so far.
 * The person was asking whether anything else was coming.
 */
/* A source assertion matches CODE, never a sentence quoting it - see a-guard-that-a-comment-satisfies. */
const withoutComments = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('when this is over', () => {
  it('a one-off read says there is no next session', () => {
    const t = whenThisIsOver({ sessionNumber: 1, roundsPlanned: 1, endsOn: null });
    expect(t).toContain('one-off read');
    expect(t).toContain('no next session');
    expect(t).not.toMatch(/session 1 of/);
  });

  it('a run of six says which one this is and how many follow', () => {
    const t = whenThisIsOver({ sessionNumber: 2, roundsPlanned: 6, endsOn: new Date('2026-10-06T09:00:00Z') });
    expect(t).toContain('This is session 2 of 6.');
    expect(t).toContain('4 more sessions follow this one');
    expect(t).toContain('ends on 6 October 2026');
  });

  it('the last one says nothing follows it', () => {
    expect(whenThisIsOver({ sessionNumber: 6, roundsPlanned: 6, endsOn: null })).toContain('This is the last one');
  });

  it('and with no plan it claims no number', () => {
    const t = whenThisIsOver({ sessionNumber: 3, roundsPlanned: null, endsOn: null });
    expect(t).toContain('How many more there are has not been set.');
    expect(t).not.toMatch(/\bof \d+\b/);
  });

  it('is in the prompt, with the rule that the question is not answered with a summary', () => {
    const t = whenThisIsOver({ sessionNumber: 1, roundsPlanned: 1, endsOn: null });
    expect(t).toContain('Never answer it with a summary of what they said');
    const src = withoutComments(fs.readFileSync(path.join(__dirname, 'conversation.service.ts'), 'utf8'));
    expect(src).toMatch(/const howLongThisRuns = whenThisIsOver\(\{/);
    expect(src).toMatch(/finalSessionContext, howLongThisRuns, returningUserContext/);
  });

  it('knows the question when it is asked, and does not fire on the work', () => {
    for (const asked of [
      'How do i know if we are done?',
      'are we done?',
      'When does this end?',
      'how many more sessions are there',
      'Do I have to do this again?',
      'is there another one after this',
    ]) expect(theyAskedWhenThisIsOver(asked)).toBe(true);
    for (const work of [
      'We are done with the Kano rollout and moving to Kaduna.',
      'The contract is finished, it just needs signing.',
      'How do I know if the feed is selling?',
    ]) expect(theyAskedWhenThisIsOver(work)).toBe(false);
  });

  it('and the line that says they just asked sits with the other right-now blocks, before the three things', () => {
    const src = withoutComments(fs.readFileSync(path.join(__dirname, 'conversation.service.ts'), 'utf8'));
    expect(src).toMatch(/const askedWhenThisEnds = theyAskedWhenThisIsOver\(latestMessage\)/);
    /* The three things stay last - see the-last-thing-it-reads-is-the-thing-it-must-not-miss. */
    expect(src).toMatch(/putThisToThem, askedWhenThisEnds, cannotBeMissed, askedLastTurn, patternProbeBlock\]/);
  });
});
