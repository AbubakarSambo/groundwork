import * as fs from 'fs';
import * as path from 'path';
import { WHAT_THE_SCORER_COUNTS, whatIsWrongWith } from './a-line-a-person-can-read';

/**
 * THE CHECK IS THE SCORER'S CHECK. Read straight out of the scorer, so the two cannot drift: if a
 * pattern changes there and not here, this fails.
 */
/* Its comments out first, Python's and any C-style ones, so a pattern in a comment cannot pass. */
const SCORER = fs.readFileSync(path.join(__dirname, '../../../../tools/score_run.py'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*#.*$/gm, '');
const theScorersPatterns = (): Map<string, string> => {
  const start = SCORER.indexOf('PROBLEMS = {');
  const block = SCORER.slice(start, SCORER.indexOf('\n}\n', start));
  const out = new Map<string, string>();
  for (const m of block.matchAll(/^\s*"((?:[^"\\]|\\.)*)":\s*r"((?:[^"\\]|\\.)*)",?\s*$/gm)) {
    out.set(m[1].replace(/\\"/g, '"'), m[2].replace(/\\"/g, '"'));
  }
  return out;
};

describe('a line a person can read: the same tests as the scorer', () => {
  it('has every pattern the scorer has, word for word', () => {
    const scorer = theScorersPatterns();
    expect(scorer.size).toBe(WHAT_THE_SCORER_COUNTS.length);
    for (const p of WHAT_THE_SCORER_COUNTS) expect(p.pattern.source).toBe(scorer.get(p.what));
  });

  const caught = (line: string) => whatIsWrongWith(line).map((h) => h.what);

  it.each([
    ['slot names glued to answers', 'Ngozi said this was for: the Ikeja branch.'],
    ['internal labels shown (initiator, Participant A, the person who set this up)', 'The initiator believes the credit committee is slow.'],
    ['internal labels shown (initiator, Participant A, the person who set this up)', 'Mei, the person who set this up wants to know.'],
    ['machine table words shown (FIELD:, standing:, by kind -, answered ·)', 'FIELD: What is holding up approvals?'],
    ['sentence starting in lower case', 'The team is behind. bring it up next time.'],
    ['"nothing contradicts" then differences', 'But nothing in any single account contradicts it.'],
    ['"1 people"', '1 people answered this check-in.'],
    ['role description used as a name', 'Ngozi Eze was taken on for: Relationship officer, Ikeja. Target 14 approved facilities this quarter.'],
    ['text cut mid-word', 'the "why" behind certain decisions that aren\'t e....'],
    ['doubled quote marks', 'You said ""the date was Friday"" last time.'],
    ['a pronoun that disagrees with the reader', 'You say their goal is to exceed the targets they are given.'],
    ['a verb that disagrees with the reader', 'You say the target was eight, but also says this was not stated.'],
    /* The three a lead read on check-1 and check-2 (the elided middles filled in plainly). */
    ['a verb that disagrees with the reader', 'You also believes the credit committee is the only delay.'],
    ['a verb that disagrees with the reader', 'You expect Tobi Adewale to take on the renewals, but has not communicated this.'],
    ['a verb that disagrees with the reader', 'You expect Tobi Adewale to take on the renewals, and is waiting for Tobi to do something about it.'],
    /* Decision 11: a pattern is never a label on the reader or a named person. See decision 55. */
    ['a pattern used as a label on a person, rather than saying what happened', 'You have a pattern of replacing a decision with a conversation about the decision.'],
    ['a pattern used as a label on a person, rather than saying what happened', 'The record shows a pattern of you holding on to work that should have moved.'],
    ['a pattern used as a label on a person, rather than saying what happened', 'Tobi has a pattern of saying yes in the room and no afterwards.'],
    ['a pattern used as a label on a person, rather than saying what happened', 'This is your pattern, and it is worth naming.'],
  ])('catches %s', (what, line) => {
    expect(caught(line)).toContain(what);
  });

  it('does not flag "you" as the object of a preposition, or a verb that already agrees', () => {
    expect(caught('A key worry for you is that the date moved.')).not.toContain('a verb that disagrees with the reader');
    expect(caught('You also believe the credit committee is the only delay.')).toEqual([]);
    expect(caught('You expect Tobi to take on the renewals, but you have not said so.')).toEqual([]);
  });

  it('leaves a plain line alone', () => {
    expect(whatIsWrongWith('Ngozi sent her file to the credit committee on Friday, and is waiting for their answer.')).toEqual([]);
    expect(whatIsWrongWith('Some documents, e.g. bank statements, are late.')).toEqual([]);
  });

  it('never counts what is inside somebody\'s own words', () => {
    expect(whatIsWrongWith('Ngozi wrote "the initiator. said this was for: nothing" in her notes.')).toEqual([]);
  });
});
