import { readFileSync } from 'fs';
import { join } from 'path';
import { THE_THREE_THINGS, THEY_JUST_PUSHED_BACK, theThingsThatCannotBeMissed } from './the-last-thing-it-reads-is-the-thing-it-must-not-miss';

/**
 * A RULE IN THE MIDDLE OF 113,000 CHARACTERS IS A SUGGESTION.
 *
 * The evidence, 17 September 2026: a plain ban on answering a complaint with a question about the
 * complaint was written into ENGINE_RULES, seeded, and confirmed present in the active prompt at
 * character 31,345 of 113,543. The very next live run answered "this questions is stupid" with
 * "What makes that question not worth asking?" - the banned sentence, almost word for word.
 *
 * So these three go last, after every other block. This file holds the two things that make that
 * true and keep it true: they are the LAST thing in the assembled prompt, and there are only three
 * of them.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const CONVERSATION = strip(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
const ENTRY = strip(readFileSync(join(__dirname, '..', 'entry', 'entry.service.ts'), 'utf8'));

describe('the three things', () => {
  it('are last in the check-in prompt, after every other block', () => {
    const assembly = CONVERSATION.slice(CONVERSATION.indexOf('return [systemPrompt,'));
    const line = assembly.slice(0, assembly.indexOf('\n'));
    /* Last, or last but for the pattern probe - which is a question this turn owes and is written
       to be the final word when there is one. Both are the "read this last" slot by design. */
    /* Last three, in order: what must not be missed, the question it asked last turn, the probe. A
       live run put the same sentence back twice in a row with the repeat block sitting earlier. */
    expect(line).toMatch(/cannotBeMissed(, askedLastTurn)?(, patternProbeBlock)?\]/);
  });

  it('and last in the setup prompt too', () => {
    const at = ENTRY.indexOf('theThingsThatCannotBeMissed(');
    expect(at).toBeGreaterThan(-1);
    /* Appended after the settled block, which is itself appended after the situation pack. */
    expect(ENTRY.indexOf('theThingsThatCannotBeMissed(', at)).toBeGreaterThan(ENTRY.indexOf('knownDontAsk('));
  });

  /**
   * THREE, AND A FOURTH IS NOT A SMALL ADDITION.
   *
   * The whole mechanism here is that this block is short enough to read as an instruction rather
   * than as more background. A fourth rule dilutes the only part of the prompt that has that
   * property by a third. If one genuinely belongs, something else has to leave.
   */
  it('are three, and stay three', () => {
    const numbered = THE_THREE_THINGS.match(/^\d\./gm) ?? [];
    expect(numbered).toEqual(['1.', '2.', '3.']);
  });

  it('and stay short enough to read as an instruction', () => {
    expect(THE_THREE_THINGS.length).toBeLessThan(2200);
  });

  /* "What do I do about that?" is a request too, and it was the one that got a question back:
     answered 8 times out of 22 against a demanding lead, where "give me something I can use" was
     answered 20 times out of 22. */
  it('and rule one covers being asked what to do, not only being asked for an example', () => {
    expect(THE_THREE_THINGS).toContain('OR FOR WHAT THEY SHOULD DO');
    expect(THE_THREE_THINGS).toMatch(/You do not hand out verdicts/);
    expect(THE_THREE_THINGS).toMatch(/A question back, as though they had not asked, is not one/);
  });

  it('cover answering what was asked, taking a complaint, and one ask', () => {
    expect(THE_THREE_THINGS).toMatch(/ANSWER WHAT THEY ASKED/);
    expect(THE_THREE_THINGS).toMatch(/A COMPLAINT IS INFORMATION/);
    expect(THE_THREE_THINGS).toMatch(/ONE ASK/);
  });
});

describe('and the line that only arrives when it applies', () => {
  it('is added when their last message is pushback on the questions', () => {
    expect(theThingsThatCannotBeMissed('these questions are stupid, I do not want to answer them', true)).toContain(THEY_JUST_PUSHED_BACK);
  });

  it('and is absent otherwise, so it reads as being about this turn when it comes', () => {
    expect(theThingsThatCannotBeMissed('four shops are stocked so far', false)).not.toContain(THEY_JUST_PUSHED_BACK);
  });

  /* The fault it exists for, named so a rewrite cannot quietly reintroduce it. */
  it('and it forbids the sentence that started this', () => {
    expect(THEY_JUST_PUSHED_BACK).toMatch(/do not defend the question/i);
  });
});
