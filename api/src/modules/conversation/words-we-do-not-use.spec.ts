import { readFileSync } from 'fs';
import { join } from 'path';
import {
  wordsWeDoNotUse, sayItWithoutThose, PHRASES_WE_NEVER_WRITE,
  WORDS_WE_DO_NOT_INTRODUCE, THE_PROMPT_BANS_THESE_AND_IT_IS_WRONG,
} from './words-we-do-not-use';

/*
 * The prompt banned these outright and 237 of 8,317 real turns carried one anyway. A literal
 * string is a shape, not a judgement, so it is checked in code.
 */
describe('the words this product does not use', () => {
  it('catches the one that leaked 125 times', () => {
    expect(wordsWeDoNotUse('It sounds like Rita is well ahead. What is holding up supply?')).toEqual(['it sounds like']);
  });

  it('catches performed empathy whatever the person said', () => {
    expect(wordsWeDoNotUse('I understand. What happened next?', ['I understand the brief now'])).toEqual(['I understand']);
  });

  it('does not let the product introduce the language of assessment', () => {
    expect(wordsWeDoNotUse('What does that mean for her performance?')).toEqual(['performance']);
  });

  it('but handing somebody their own word back is not the fault', () => {
    expect(wordsWeDoNotUse('What does that mean for her performance?', ['my performance review is in March'])).toEqual([]);
  });

  it('leaves the product’s own vocabulary alone, which the prompt does not', () => {
    const hers = 'What is on track, and what is off?';
    expect(wordsWeDoNotUse(hers)).toEqual([]);
    for (const w of THE_PROMPT_BANS_THESE_AND_IT_IS_WRONG) {
      expect(wordsWeDoNotUse(`Something to ${w} against.`)).toEqual([]);
    }
  });

  it('and "track" really is her own word, so this is not a preference', () => {
    const table = readFileSync(join(__dirname, 'the-scenario-table.ts'), 'utf8');
    expect(table).toMatch(/keep track of how the work is going/);
  });

  it('says a whole word, not a word inside another', () => {
    expect(wordsWeDoNotUse('The upgrade was a staged rollout.')).toEqual([]);
    expect(wordsWeDoNotUse('She ranked the options.')).toEqual([]);
  });

  it('names what it found, so the retry fixes that and not something else', () => {
    const ask = sayItWithoutThose(['it sounds like', 'performance']);
    expect(ask).toContain('"it sounds like"');
    expect(ask).toContain('"performance"');
    expect(ask).toMatch(/Do not replace a banned word with a longer way of saying the same word/);
  });

  it('is clean on an ordinary reply, because a guard that fires on everything is noise', () => {
    expect(wordsWeDoNotUse('Sixty of the hundred and fifty. What is holding up the supply side?')).toEqual([]);
  });

  it('holds both lists in one place, which the prompt did not', () => {
    expect(PHRASES_WE_NEVER_WRITE.length).toBeGreaterThan(10);
    expect(WORDS_WE_DO_NOT_INTRODUCE).toContain('employee');
    expect(WORDS_WE_DO_NOT_INTRODUCE).toContain('staff');
  });
});

describe('and it reaches both conversations', () => {
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  it('the check-in path asks again when it finds one', () => {
    const src = strip(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
    expect(src).toMatch(/const notOurWords = wordsWeDoNotUse\(screened\.text, theirWords\)/);
    expect(src).toMatch(/sayItWithoutThose\(notOurWords\)/);
  });
  it('and so does the setup path, where a person meets the product first', () => {
    const src = strip(readFileSync(join(__dirname, '..', 'entry', 'entry.service.ts'), 'utf8'));
    expect(src).toMatch(/const notOurWords = wordsWeDoNotUse\(text, personSaid\)/);
  });
});
