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
    const ask = sayItWithoutThose(['it sounds like'], 'It sounds like Rita is ahead. What is holding up supply?');
    expect(ask).toContain('"it sounds like"');
    /*
     * The offending SENTENCE goes back too. Naming the word alone left the guard clean twice out of
     * ten across nineteen live check-ins - the same failure the restating guard had, fixed the same
     * way.
     */
    expect(ask).toContain('"It sounds like Rita is ahead."');
    expect(ask).toMatch(/do not reach for a longer way of saying the same thing/);
    expect(ask).toMatch(/ask the question straight/);
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

describe('and it reaches the check-in', () => {
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  it('the check-in path asks again when it finds one', () => {
    const src = strip(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
    expect(src).toMatch(/const notOurWords = wordsWeDoNotUse\(screened\.text, theirWords\)/);
    expect(src).toMatch(/sayItWithoutThose\(notOurWords, screened\.text\)/);
  });
  /* Changed 4 November 2026 (fix plan, group 5): on the setup path this check only wrote a log line after the reply had gone, and it is
     removed with the other word matchers there. The setup prompt carries the words it does not use; the check-in keeps its check. */
  it('and the setup path no longer reads its reply for them after the fact', () => {
    const src = strip(readFileSync(join(__dirname, '..', 'entry', 'entry.service.ts'), 'utf8'));
    expect(src).not.toMatch(/wordsWeDoNotUse\(/);
  });
});

/*
 * Nineteen live check-ins, twice. Banned phrases went from two to eight the moment the restating
 * guard started succeeding more often - because that guard REPLACES the reply, and the replacement
 * was never checked against this list. The ban check sat fourth of seven.
 */
describe('and it is the last guard, so it reads what actually ships', () => {
  const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('runs after every guard that can replace the reply', () => {
    const banAt = src.indexOf('const notOurWords = wordsWeDoNotUse(screened.text');
    expect(banAt).toBeGreaterThan(-1);
    for (const earlier of [
      'if (isADeadEnd(screened.text',
      'if (alreadyAskedTwice(screened.text',
      'if (isAnEssay(screened.text',
      'if (isAVerdictAboutSomebodyElse(message',
      'if (opensByRepeatingThem(message, screened.text))',
    ]) {
      expect(src.indexOf(earlier)).toBeLessThan(banAt);
    }
  });

  it('and nothing reads the reply after it except the line that sends it', () => {
    const banAt = src.indexOf('const notOurWords = wordsWeDoNotUse(screened.text');
    const shipsAt = src.indexOf('reply = screened.text || (isAnAcknowledgement(message) ?');
    expect(shipsAt).toBeGreaterThan(banAt);
    const between = src.slice(banAt, shipsAt);
    expect(between).not.toMatch(/screened = second;[\s\S]*screened = second;[\s\S]*screened = second;/);
  });

  it('its own retry cannot undo the guard it now runs after', () => {
    expect(src).toMatch(/!opensByRepeatingThem\(message, second\.text\)/);
  });
});
