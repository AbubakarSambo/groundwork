import { recordAndMoveOn } from './a-refusal-is-an-answer';
import { NOTHING_TO_APOLOGISE_FOR } from './an-apology-is-not-owed';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE CHECK-IN'S OWN FIXED LINES, DIRECT (Hafsah, 20 October 2026, part 4; the only words since release batch 1, 4 November 2026).
 *
 * What a rep such as Kevin, or a lead such as Grace, reads in a check-in when the product writes the turn rather than the model: a
 * question let go and an apology. The answer ceiling and the close lines ("Nothing said this time carries a date ...", "No decision from you
 * is on this record yet ...") went on 3 November 2026 (Hafsah: no question limits and no forced close). Nothing is said about how
 * "this record" will read, and nothing defends the tool.
 */
describe('the check-in\'s own lines: plain, and nothing about how the record reads', () => {
  it('a question let go is let go, and the next question follows', () => {
    expect(recordAndMoveOn({ question: 'Which deal closes next?' })).toBe('Understood. Which deal closes next?');
    /* Changed 29 October 2026 (two-week check): "We can leave that there" followed Brian's correction and read as brushing it off. */
    expect(recordAndMoveOn({})).toBe('Thank you, that is noted.');
  });
  it('the apology', () => {
    expect(NOTHING_TO_APOLOGISE_FOR).toBe('No need to say sorry.');
  });
  it('none of them says "record", "how it will read" or "lost"', () => {
    for (const l of [recordAndMoveOn({}), recordAndMoveOn({ owed: 'what moved since yesterday' }), NOTHING_TO_APOLOGISE_FOR]) {
      expect(l).not.toMatch(/record|how it will read|lost|judgement/i);
    }
  });
  it('there is no ceiling to announce: no "session is full" and no "twenty answers" anywhere in the check-in', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
    expect(src).not.toMatch(/session is full|twenty answers|room for (?:one|\$\{left\}|\d+) more answer/i);
  });
});
