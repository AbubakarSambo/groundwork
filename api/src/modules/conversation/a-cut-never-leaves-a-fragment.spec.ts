import { readFileSync } from 'fs';
import { join } from 'path';
import { isAFragment, aCutThatLeavesAFragment, afterTheCut, A_CLOSE_THAT_CLAIMS_NOTHING } from './a-cut-never-leaves-a-fragment';
import { withinTheHomeworkBudget } from './the-close-is-held-once';

/*
 * "BEFORE WE CLOSE," AND "SPEAK SOON." WERE WHOLE TURNS.
 *
 * fix7-2, project: the homework budget cut the question and Ifeoma Chukwu read "Before we close,".
 * run-7, crisis: the promise guard cut the sentence and Elena Rossi read "Speak soon.".
 */
describe('no guard\'s cut ever leaves a fragment to send', () => {
  it('"Before we close," is a fragment', () => {
    expect(isAFragment('Before we close,')).toBe(true);
    expect(isAFragment('Before we close')).toBe(true);
    expect(isAFragment('Thank you for all of that. One more thing:')).toBe(true);
  });

  it('"Speak soon." is a fragment', () => {
    expect(isAFragment('Speak soon.')).toBe(true);
  });

  it('a short question is not', () => {
    expect(isAFragment('Which Friday?')).toBe(false);
  });

  it('the homework cut that left "Before we close," sends the turn as it was instead', () => {
    const before = 'Before we close, what will you do about the vendor contract, and by when?';
    const after = 'Before we close,';
    expect(aCutThatLeavesAFragment(before, after)).toBe(true);
    expect(afterTheCut(before, after, { closing: false, mayRestore: true })).toBe(before);
    expect(afterTheCut(before, after, { closing: true, mayRestore: true })).toBe(before);
  });

  it('a cut of something untrue never puts it back, and on the close becomes the plain close', () => {
    const before = 'You said you would send the rota by Friday. Speak soon.';
    expect(afterTheCut(before, 'Speak soon.', { closing: true, mayRestore: false })).toBe('Thank you. Your check-in is saved.');
    expect(afterTheCut(before, 'Speak soon.', { closing: true, mayRestore: false })).toBe(A_CLOSE_THAT_CLAIMS_NOTHING);
    expect(afterTheCut(before, 'Speak soon.', { closing: false, mayRestore: false })).toBe('Speak soon.');
  });

  it('on the close, a text that was a fragment before the cut becomes the plain close too', () => {
    expect(afterTheCut('Thanks. Before we close,', 'Thanks.', { closing: true, mayRestore: true }))
      .toBe('Thank you. Your check-in is saved.');
  });

  it('a normal cut is kept', () => {
    const before = 'The vendor contract is the thing to settle first. What will you do about it, and by when?';
    const after = 'The vendor contract is the thing to settle first.';
    expect(aCutThatLeavesAFragment(before, after)).toBe(false);
    expect(afterTheCut(before, after, { closing: false, mayRestore: true })).toBe(after);
  });

  it('what the homework budget actually cut, run through the net', () => {
    /* Over budget: the homework question has already been asked, so it comes out. */
    const earlier = ['What will you do about the pricing sheet, and by when?', 'What will you do about the forms, and by when?'];
    const reply = 'Before we close, what will you do about the vendor contract, and by when?';
    const budget = withinTheHomeworkBudget(reply, earlier, false);
    const sent = afterTheCut(reply, budget.text, { closing: false, mayRestore: true });
    expect(isAFragment(sent)).toBe(false);
  });

  it('every cut site in the reply path goes through the net', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src.match(/!aCutThatLeavesAFragment\(screened\.text, withoutIt\)/g)).toHaveLength(3);
    expect(src).toMatch(/if \(trimmed && !aCutThatLeavesAFragment\(better\.text, trimmed\)\)/);
    expect(src).toMatch(/afterTheCut\(screened\.text, noHomework\.text, \{ closing: closingNow, mayRestore: true \}\)/);
    expect(src).toMatch(/afterTheCut\(screened\.text, budget\.text, \{ closing: closingNow, mayRestore: true \}\)/);
    expect(src).toMatch(/afterTheCut\(screened\.text, unsupported\.text, \{ closing: closingNow, mayRestore: false \}\)/);
    expect(src).toMatch(/whatIsLeftToSend\(screened\.text, promiseNobodyMade, closingNow\)/);
  });
});
