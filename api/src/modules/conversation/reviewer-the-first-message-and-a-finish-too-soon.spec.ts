import * as aFinishTooSoonModule from './a-finish-too-soon-is-said-plainly';
import { isADeadEnd } from './a-reply-that-asks-nothing-is-a-dead-end';
import { withAQuestion } from './nobody-is-left-looking-at-a-paragraph';
import { readFileSync } from 'fs';
import { join } from 'path';

/** REVIEWER, 14 OCTOBER (THIRD PASS): Kevin's first WhatsApp message asked nothing; Grace's "finish" was read as an answer. */
const withoutComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the first message ends on a question', () => {
  const KEVIN = "This is our first check-in, and it's about getting a regular read on the work you're doing.";
  it('Kevin\'s opening is a dead end, and is given a question', () => {
    expect(isADeadEnd(KEVIN, false)).toBe(true);
    const fixed = withAQuestion(KEVIN, { opening: true });
    expect(fixed.startsWith(KEVIN)).toBe(true);
    expect(fixed.trim().endsWith('?')).toBe(true);
  });
  it('the opening is checked after every guard that can take a question out', () => {
    const src = withoutComments(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
    /* Wrapped since 26 October 2026 in anOpeningWithNothingLeftOver, which only takes out a stray quote mark and a question pointing at nothing. */
    expect(src).toMatch(/const opening = anOpeningWithNothingLeftOver\(isADeadEnd\(guarded, false\) \? withAQuestion\(guarded, \{ opening: true \}\) : guarded\);/);
  });
});

/*
 * "FINISH" TOO SOON. Until 3 November 2026 Grace read "You can finish after one more answer." Since then there is no floor of answers
 * (Hafsah: no question limits and no forced close): "finish" is a person finishing, in the check-in and in setup alike.
 */
describe('"finish" is never too soon', () => {
  it('nothing says "You can finish after N more answers" any more', () => {
    expect(Object.keys(aFinishTooSoonModule)).not.toContain('aFinishTooSoon');
    expect(Object.keys(aFinishTooSoonModule)).not.toContain('youCanFinishAfter');
    const conv = withoutComments(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
    const entry = withoutComments(readFileSync(join(__dirname, '..', 'entry', 'entry.service.ts'), 'utf8'));
    for (const src of [conv, entry]) expect(src).not.toMatch(/aFinishTooSoon|You can finish after/);
  });
  it('in setup, "finish" after one answer closes the conversation on what they said', () => {
    const entry = withoutComments(readFileSync(join(__dirname, '..', 'entry', 'entry.service.ts'), 'utf8'));
    expect(entry).toMatch(/if \(theirLast && \(askedToFinish\(\[theirLast\]\) \|\| isTheWordFinish\(theirLast\)\) && personSaid\.length >= 1\) \{[\s\S]{0,300}closed: true/);
  });
});
