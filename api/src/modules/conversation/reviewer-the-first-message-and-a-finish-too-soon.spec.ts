import { aFinishTooSoon } from './a-finish-too-soon-is-said-plainly';
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

describe('"finish" too soon is said plainly', () => {
  it('Grace reads that she can finish after one more answer, and the model\'s question stays', () => {
    const reply = '"Finish" is an outcome. What would have to exist that does not exist today if Kilele is genuinely closed?';
    expect(aFinishTooSoon(reply, 1)).toBe('You can finish after one more answer. What would have to exist that does not exist today if Kilele is genuinely closed?');
    expect(aFinishTooSoon('What is due next?', 2)).toBe('You can finish after two more answers. What is due next?');
  });
  it('the check-in and the first check-in inside set-up both say it', () => {
    const conv = withoutComments(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
    const entry = withoutComments(readFileSync(join(__dirname, '..', 'entry', 'entry.service.ts'), 'utf8'));
    expect(conv).toMatch(/isTheWordFinish\(message\)\) \{[\s\S]{0,300}aFinishTooSoon\(/);
    expect(entry).toMatch(/if \(theirLast && isTheWordFinish\(theirLast\)\) best = aFinishTooSoon\(best, 2 - personSaid\.length\);/);
  });
});
