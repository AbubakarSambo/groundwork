import { readFileSync } from 'fs';
import { join } from 'path';
import { whereTheEndStands, itIsTimeToClose, whatToSayAboutTheEnd, itIsTimeToSayTheyCanEnd, saysThereIsNothingMore, A_SHORT_DAY, ANYTHING_ELSE, THE_DAY_IS_COVERED, THEY_ADDED_SOMETHING, WHEN_TODAY_IS_COVERED, YOU_CAN_END_NOW, ASK_ANYTHING_ELSE_AGAIN } from './a-short-day';
import { asItReadsOnWhatsApp } from './the-opening-line';

/** Hafsah, after round 3 (26 October 2026): no question limit and no forced close. */
describe('no question limit and no forced close', () => {
  it('nothing closes on a count of answers', () => {
    const end = whereTheEndStands(['What is next for Westgate?', 'Which day?'], 'Friday, and then I will call Ali about the price.');
    for (const answers of [5, 8, 15, 30]) {
      expect(itIsTimeToClose(end, false)).toBe(false);
      expect(whatToSayAboutTheEnd(answers, end, false)).toBe(WHEN_TODAY_IS_COVERED);
    }
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
    expect(src).not.toMatch(/itMustCloseNow|theCloseThatCoversToday/);
  });

  it('once today is covered it asks "Anything else I should know?", and closes after a no', () => {
    expect(WHEN_TODAY_IS_COVERED).toContain(ANYTHING_ELSE);
    const end = whereTheEndStands([`Thanks. ${ANYTHING_ELSE}`], 'No, that is all.');
    expect(end).toEqual({ asked: true, followUps: 0, nothingMore: true });
    expect(itIsTimeToClose(end, false)).toBe(true);
    expect(whatToSayAboutTheEnd(6, end, false)).toBe(THE_DAY_IS_COVERED);
  });

  /* Changed 26 October 2026 (Mercy was closed while still adding things): after two follow-ups it asks again, and only a "no" closes. */
  it('what they add at the end is taken, with at most two follow-ups, then "Anything else I should know?" again', () => {
    const added = whereTheEndStands([ANYTHING_ELSE], 'Oh, Savannah Cafe wants six more units next month.');
    expect(itIsTimeToClose(added, false)).toBe(false);
    expect(whatToSayAboutTheEnd(6, added, false)).toBe(THEY_ADDED_SOMETHING);
    expect(THEY_ADDED_SOMETHING).toMatch(/at most 2 follow-up questions.*the day, or the proof/);
    expect(THEY_ADDED_SOMETHING).toMatch(/Never close while they are still adding something/);
    const afterTwo = whereTheEndStands(['Which day will they pay?', 'What shows the order?', ANYTHING_ELSE], 'Friday.');
    expect(itIsTimeToClose(afterTwo, false)).toBe(false);
    expect(whatToSayAboutTheEnd(8, afterTwo, false)).toBe(ASK_ANYTHING_ELSE_AGAIN);
    const thenNo = whereTheEndStands([ANYTHING_ELSE, 'Which day will they pay?', 'What shows the order?'], 'No, that is all.');
    expect(itIsTimeToClose(thenNo, false)).toBe(true);
  });

  it('a long check-in is offered an end once, never given one', () => {
    expect(itIsTimeToSayTheyCanEnd(9, false, [])).toBe(false);
    expect(itIsTimeToSayTheyCanEnd(10, false, [])).toBe(true);
    expect(itIsTimeToSayTheyCanEnd(12, false, [`Noted. ${YOU_CAN_END_NOW}`])).toBe(false);
    expect(asItReadsOnWhatsApp(`Noted.\n\n${YOU_CAN_END_NOW}`)).toBe('Noted.\n\nWe’ve covered what’s needed today. You can reply END now, or tell me anything else.');
  });

  it('something said outside the question is taken and filed, never pushed back', () => {
    expect(A_SHORT_DAY).toMatch(/If they say something outside your question, take it.*Never push them back to your question, and never cut them off/);
    expect(A_SHORT_DAY).not.toMatch(/5 TO 7|QUESTIONS IN ALL/);
  });

  it('"no" means nothing more, and an answer with something in it does not', () => {
    for (const m of ['No', 'Nothing else', "That's all, thanks", 'No, thank you']) expect(saysThereIsNothingMore(m)).toBe(true);
    for (const m of ['Not yet, but Ali will pay on Friday', 'Yes, Kilele wants ten more']) expect(saysThereIsNothingMore(m)).toBe(false);
  });
});
