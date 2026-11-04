import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { insteadOfAFiller, notTheSameAsLastTime, THE_SENTENCE_WE_SAID_FIVE_TIMES } from './the-same-sentence-five-times';
import { wordsWeDoNotUse } from './words-we-do-not-use';
import { askedToFinish } from './close-readiness';

/**
 * ONE LIVE CHECK-IN, 23 SEPTEMBER 2026, AND FIVE FAULTS IN IT.
 *
 * "what went well about my work?"                   -> "That goes on this record as you put it."
 * "what do you mean its not about personal"         -> "That goes on this record as you put it."
 * "you are repeating yourself, please end the session" -> "That goes on this record as you put it."
 * "can you have the session end please"             -> another question
 * "no"                                              -> "Your report is ready now. Speak soon. There
 *                                                       is room for 3 more answers in this session."
 */
describe('the sentence we said five times', () => {
  it('is not what a guard says any more', () => {
    for (let turn = 0; turn < 8; turn += 1) {
      expect(insteadOfAFiller(turn)).not.toMatch(/record/i);
    }
  });

  /* An acknowledgement on its own is a dead end, and being ignored is what she read. */
  it('and whatever it says, it asks something', () => {
    for (let turn = 0; turn < 8; turn += 1) expect(insteadOfAFiller(turn)).toMatch(/\?$/);
  });

  it('and never twice running', () => {
    for (let turn = 0; turn < 8; turn += 1) {
      expect(insteadOfAFiller(turn)).not.toBe(insteadOfAFiller(turn + 1));
    }
  });
});

describe('and no reply is the previous reply', () => {
  it('replaces a word-for-word repeat', () => {
    const again = notTheSameAsLastTime('Noted. What else should I know?', 'Noted. What else should I know?', 3);
    expect(again).not.toBe('Noted. What else should I know?');
  });

  /* Punctuation and spacing are not a new sentence. */
  it('and one that differs only in punctuation', () => {
    expect(notTheSameAsLastTime('That is down.', 'That is down', 2)).not.toBe('That is down.');
  });

  it('and leaves a genuinely different reply alone', () => {
    const said = 'Thirty thousand women farmers. Which states?';
    expect(notTheSameAsLastTime(said, 'Noted. What else should I know?', 2)).toBe(said);
  });

  it('and does nothing on the first turn, where there is nothing to repeat', () => {
    expect(notTheSameAsLastTime('Where would you like to start?', null, 0)).toBe('Where would you like to start?');
  });
});

describe('the words themselves', () => {
  /* Her words: "you used on the record alot which is fucking annoying." */
  it('are refused by the vocabulary guard', () => {
    expect(wordsWeDoNotUse(THE_SENTENCE_WE_SAID_FIVE_TIMES)).toContain('on this record');
    expect(wordsWeDoNotUse('That is on the record now.')).toContain('on the record');
  });

  /* The product apologising for itself, three times in one conversation, instead of using the
     correction it was just given. */
  it('and so is the product apologising for itself', () => {
    expect(wordsWeDoNotUse('You are right. My apologies. I got ahead of myself.')).toContain('my apologies');
    expect(wordsWeDoNotUse('You did. My mistake.')).toContain('my mistake');
  });
});

describe('asking to end it', () => {
  it('in the words people actually use', () => {
    for (const said of [
      'you are repeating yourself, please end the session',
      'can you have the session end please',
      'please end this check-in',
      'wrap it up',
      'no more questions',
    ]) expect(askedToFinish([said])).toBe(true);
  });

  /* And an answer about the work is still an answer - the deliberate decision in close-readiness. */
  it('and not when they are answering the question', () => {
    expect(askedToFinish(['Nothing else.'])).toBe(false);
    expect(askedToFinish(['I plan to run interventions to impact 30k women farmers'])).toBe(false);
  });
});

describe('the plumbing does not leak onto a goodbye', () => {
  const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  /* "Your report is ready now. Speak soon. There is room for 3 more answers in this session." */
  /* Changed 3 November 2026: there is no answer ceiling, so there is no room notice to append to any turn. */
  it('no room notice is appended to any turn, closing or not', () => {
    expect(SRC).not.toMatch(/howMuchRoomIsLeft|room for \S+ more answers?/);
  });
});
