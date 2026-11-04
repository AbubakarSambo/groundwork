import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * NINE GUARDS ON EVERY REPLY, AND NONE AT ALL ON THE FIRST ONE.
 *
 * `send` checks each reply for length, for asking nothing, for restating the person back at
 * themselves, for the words this product does not use, and five more. `open` ran `forHumans` and
 * put the result on the screen.
 *
 * Found by running every scenario the product has, two answers each, and scoring the replies the
 * way the guards do. Of twenty-two openers:
 *
 *   six were over the length bar - 61, 61, 71, 72, 77 and 92 words, against sixty
 *   three asked nothing at all
 *   one asked what good looks like without showing what an answer looks like
 *
 * Nobody had looked, because a long opener reads as the scenario pack being wordy rather than as
 * a guard being missing.
 */
const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('the opener is held to the same bar', () => {
  it('the opener is checked before it is stored, not after it is read', () => {
    const held = SRC.indexOf('theOpenerIsHeldToTheSameBar(checkIn.id');
    // Changed 26 October 2026 (Hafsah: item 1): the stored opener now has the opening line in front (not on a correction); it is still checked first.
    /* Changed 26 October 2026 (Hafsah after round 3): "What would you like to add?" (add-something.ts) opens without the ten-minute line too. */
    const stored = SRC.indexOf('checkInId: checkIn.id, role: TurnRole.AI, content: (checkIn as any).isSelfCorrection || alreadyWritten === WHAT_WOULD_YOU_LIKE_TO_ADD ? opening : withTheOpeningLine(opening)');
    expect(held).toBeGreaterThan(-1);
    expect(stored).toBeGreaterThan(held);
  });

  it('and what is stamped is what was kept, not the reply before the check', () => {
    /* The stamp fed `forHumans(reply)` while the turn carried something else, which is how a
       turn ends up described by a sentence nobody read. */
    expect(SRC).toMatch(/askedFor: stampWhatItAskedFor\(opening\)/);
    expect(SRC).not.toMatch(/content: forHumans\(reply\)/);
  });

  it('holds it to length, to asking something, and to the words we do not use', () => {
    const fn = SRC.slice(SRC.indexOf('private async theOpenerIsHeldToTheSameBar'));
    const body = fn.slice(0, fn.indexOf('\n  }') + 4);
    expect(body).toMatch(/isAnEssay\(text, false\)/);
    expect(body).toMatch(/isADeadEnd\(text, false\)/);
    expect(body).toMatch(/wordsWeDoNotUse\(text, \[\]\)/);
    /* And to showing what an answer looks like: the opener is the question asked completely cold. */
    expect(body).toMatch(/asksForAShapeWithoutShowingOne\(text\)/);
  });

  it('asks again once, and keeps the second only when it clears every bar', () => {
    const fn = SRC.slice(SRC.indexOf('private async theOpenerIsHeldToTheSameBar'));
    const body = fn.slice(0, fn.indexOf('\n  }') + 4);
    expect(body).toMatch(/faults\(second\)\.length === 0/);
    expect(body).toMatch(/return opener;/);
    /* One retry. A loop here is a person watching a blank screen. */
    expect((body.match(/this\.anthropic\s*\n?\s*\.respond/g) ?? []).length).toBe(1);
  });
});
