import { readFileSync } from 'fs';
import { join } from 'path';
import {
  whatToDoAboutTheirDeadline,
  theDateItHadToSay,
  theQuestionTheProductAsks,
  SAY_THE_DATE,
} from './a-period-is-not-a-day';

/*
 * "YEAR-END - SO 31 DECEMBER 2026?" SEVEN TIMES, AND IT ENDED PATIENCE'S CHECK-IN.
 *
 * The handover scenario, run twice on 26 September (fix6-1 and fix6-2). Patience is leaving, and
 * she is the one person who knows the year-end reconciliation runs off a spreadsheet on her own
 * drive. She said so. The product asked whether year-end meant 31 December 2026. She said no, the
 * last year-end was 31 December 2023. It asked again, word for word, and she answered again, word
 * for word, until the question limit closed her check-in. These are her exact messages.
 */
describe('the date question is asked once, only about a deadline, and in a full sentence', () => {
  const on = new Date(Date.UTC(2026, 8, 26));

  const HER_FIRST_MESSAGE =
    'There are a couple of things, mostly payment arrangements and reconciliations. For instance, the verbal agreement with our main printing supplier for 60-day payment terms, which I made with their MD in 2022. The written contract states 30 days. Also, my year-end reconciliation runs off a spreadsheet on my personal drive that has evolved over eleven years with various adjustments.';
  const HER_CORRECTION =
    'No, the last year-end was 31 December 2023. My spreadsheet was used for that, and the preceding ten years.';

  it('does not ask about "year-end" when she is describing her work, not promising a date', () => {
    expect(whatToDoAboutTheirDeadline(HER_FIRST_MESSAGE, on)).toBeNull();
    expect(theDateItHadToSay(HER_FIRST_MESSAGE, on)).toBeNull();
  });

  it('does not ask again when her answer already names a day', () => {
    expect(whatToDoAboutTheirDeadline(HER_CORRECTION, on)).toBeNull();
    expect(theDateItHadToSay(HER_CORRECTION, on)).toBeNull();
  });

  it('and Jide saying he has never done a year-end close is not a deadline either', () => {
    const jide = "Well, I've never actually done a year-end close before, so that would definitely be a guess for me if I had to do it this week.";
    expect(whatToDoAboutTheirDeadline(jide, on)).toBeNull();
  });

  it('still checks a real deadline, and asks it in a full sentence', () => {
    const said = 'I will have it done by the end of the year';
    const instruction = whatToDoAboutTheirDeadline(said, on)!;
    expect(instruction).toContain('"When you say end of the year, do you mean 31 December 2026?"');
    const theDate = theDateItHadToSay(said, on)!;
    expect(theDate).toBe('31 December 2026');
    /* What the person reads when the product has to ask the question itself. */
    expect(theQuestionTheProductAsks('end of the year', theDate)).toBe('When you say end of the year, do you mean 31 December 2026?');
    expect(theQuestionTheProductAsks('year-end', theDate)).toBe('When you say year-end, do you mean 31 December 2026?');
    expect(SAY_THE_DATE('end of the year', theDate)).toContain('"When you say end of the year, do you mean 31 December 2026?"');
  });

  it('"by" still makes a period a deadline, and so does a person saying what they will do', () => {
    expect(whatToDoAboutTheirDeadline('we want it by the end of the year', on)).toContain('31 December 2026');
    expect(whatToDoAboutTheirDeadline('the handover notes before year-end', on)).toContain('31 December 2026');
    expect(whatToDoAboutTheirDeadline('we will deliver this quarter', on)).toBeTruthy();
  });

  it('does not ask again about a period it already asked about earlier in this check-in', () => {
    const said = 'I will have it done by the end of the year';
    const askedBefore = ['When you say end of the year, do you mean 31 December 2026?'];
    expect(whatToDoAboutTheirDeadline(said, on, askedBefore)).toBeNull();
    expect(theDateItHadToSay(said, on, askedBefore)).toBeNull();
    /* The old wording, as it sits in her stored turns, counts as already asked too. */
    const theOldLine = ['Year-end - so 31 December 2026?'];
    expect(whatToDoAboutTheirDeadline('I will send it before year-end', on, theOldLine)).toBeNull();
    /* A reply that only said the same date counts as well. */
    expect(whatToDoAboutTheirDeadline(said, on, ['So the reconciliation is due on 31 December?'])).toBeNull();
  });

  it('but a different period in the same check-in is still asked about', () => {
    const askedBefore = ['When you say end of the year, do you mean 31 December 2026?'];
    expect(whatToDoAboutTheirDeadline('I will finish the ledger by end of October', on, askedBefore)).toContain('31 October 2026');
  });

  it('the live turn passes only this check-in\'s own replies to both checks', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/repliesInThisCheckIn = herEarlierAiTurns\.filter\(\(r\) => r\.checkInId === checkIn\.id\)/);
    expect(src).toMatch(/whatToDoAboutTheirDeadline\(message, new Date\(\), repliesInThisCheckIn\)/);
    expect(src).toMatch(/theDateItHadToSay\(message, new Date\(\), repliesInThisCheckIn\)/);
  });
});
