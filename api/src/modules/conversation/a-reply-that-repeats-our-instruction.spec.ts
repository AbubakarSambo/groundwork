import { readFileSync } from 'fs';
import { join } from 'path';
import { repeatsTheInstruction, SAY_THE_DATE, theQuestionTheProductAsks } from './a-period-is-not-a-day';

/*
 * JIDE READ OUR NOTE TO THE MODEL AS THE PRODUCT TALKING TO HIM.
 *
 * The handover scenario, fix6-2, sessions[0].people[2].turns[8]. The date retry sent SAY_THE_DATE,
 * the model handed that instruction back reworded, it contained the date, so it was accepted and
 * sent. This is the reply he read, exactly as stored.
 */
describe('a reply that repeats our own instruction to a person is never sent', () => {
  const JIDE_READ_THIS =
    'You said "year-end", which is a period rather than a day, and 31 December 2026 is what the product reads that as - a reading they have never seen and cannot confirm unless you say it. Write the reply again as that one question and nothing else: year-end - so 31 December 2026? Nothing before it, no second question after it, and do not explain why you are asking. Saying the date is not repeating them back: the date is ours, not theirs.';
  const theInstruction = SAY_THE_DATE('year-end', '31 December 2026');

  it('refuses the reply Jide read', () => {
    expect(repeatsTheInstruction(JIDE_READ_THIS, theInstruction)).toBe(true);
  });

  it('refuses it by the run of words alone, without the tell-tale phrases', () => {
    const reworded = 'Nothing before it, no second question after it, so here it is. Is it 31 December 2026?';
    expect(repeatsTheInstruction(reworded, theInstruction)).toBe(true);
  });

  it('and refuses each phrase only the instruction uses', () => {
    for (const reply of [
      'Year-end is a period rather than a day. Do you mean 31 December 2026?',
      'So 31 December 2026 is what the product reads it as?',
      'Write the reply again: do you mean 31 December 2026?',
    ]) {
      expect({ reply, refused: repeatsTheInstruction(reply, theInstruction) }).toEqual({ reply, refused: true });
    }
  });

  it('accepts the question the instruction asks for, which is quoted inside it', () => {
    expect(repeatsTheInstruction('When you say year-end, do you mean 31 December 2026?', theInstruction)).toBe(false);
    expect(repeatsTheInstruction(theQuestionTheProductAsks('year-end', '31 December 2026'), theInstruction)).toBe(false);
    expect(repeatsTheInstruction('So by year-end you mean 31 December 2026, is that right?', theInstruction)).toBe(false);
  });

  it('is wired into the date retry, so a refused reply falls back to the product asking', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/const theInstruction = SAY_THE_DATE\(period, dateItHadToSay\);/);
    expect(src).toMatch(/!repeatsTheInstruction\(second\.text, theInstruction\)\s*\)\s*\{\s*screened = second;/);
  });
});
