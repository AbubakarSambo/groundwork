import { worthWritingDown, theOnesToKeep, aClearAction, READ_WHAT_THEY_PROMISED } from './what-they-said-they-would-do-next';
import { itIsTheirs, AN_AIM_IN_WORDS, A_PERIOD_REPORTED } from './a-promise-is-theirs-not-ours';
import { goalFromTarget, onePromiseOneState } from '../grounds/your-board';

/**
 * WHAT PEOPLE SAY BECOMES A PROMISE ONE WAY (fix plan, pattern 5; quarter test). The whole pattern: half-sentences kept as promises with
 * nobody named, hedges, misses and Groundwork's own sentences kept as someone's promise or goal, one goal shown twice, and "reached"
 * said of work not done. Every case below is one the quarter found.
 */
describe('only a promise about the future is kept', () => {
  it('leaves out hedges, misses and work in progress with no finish', () => {
    for (const action of ['I would have to check that', 'I was planning to follow up this week', 'I forgot my promise to call Upper Hill again', 'Forgot my promise to call Upper Hill again', 'I am drafting the costs claim', 'Today. I promise.']) {
      expect({ action, kept: worthWritingDown({ action }) }).toEqual({ action, kept: false });
    }
  });

  it('keeps a real promise, and work in progress said with when it will be done', () => {
    expect(worthWritingDown({ action: 'I will call Mrs Achola on Friday about the delivery' })).toBe(true);
    expect(worthWritingDown({ action: 'I am drafting the costs claim', when: 'by Thursday' })).toBe(true);
  });

  it('the reading is told the question each answer replied to, and to name who "her" is', () => {
    expect(READ_WHAT_THEY_PROMISED).toMatch(/after the question Groundwork asked/);
    expect(READ_WHAT_THEY_PROMISED).toMatch(/Put the names and things in place of "her", "them", "it", "that" and "then"/);
  });
});

describe('a promise is kept as a clear action, beside their words', () => {
  it('keeps the clear action the model gave, and drops one that still names nobody', () => {
    expect(aClearAction('confirm the delivery time with Mrs Achola on Friday.')).toBe('Confirm the delivery time with Mrs Achola on Friday');
    expect(aClearAction('Follow up with her then')).toBeNull();
    expect(aClearAction('I will call them')).toBeNull();
    expect(theOnesToKeep([{ action: 'I need to confirm that with Mrs. Achola', clear: 'Confirm the delivery date with Mrs Achola', when: 'tomorrow' }])[0]).toMatchObject({ clear: 'Confirm the delivery date with Mrs Achola' });
  });

  it('every page shows the clear action where there is one, and their words where there is not', () => {
    const said = onePromiseOneState([
      { id: 'c1', groundId: 'g', participantId: 'p', text: 'Need to confirm that with Mrs. Achola.', whenSaid: null, status: 'UNKNOWN', action: 'Confirm the delivery date with Mrs Achola', createdAt: new Date('2026-10-14') },
      { id: 'c2', groundId: 'g', participantId: 'p', text: 'I will send the price list to Savannah Cafe', whenSaid: null, status: 'UNKNOWN', createdAt: new Date('2026-10-14') },
    ], [], () => 'Sales team, Q4', new Date('2026-10-15'));
    expect(said.map((p) => p.text)).toEqual(['Confirm the delivery date with Mrs Achola', 'Send the price list to Savannah Cafe']);
    expect(said[0].raw).toBe('Need to confirm that with Mrs. Achola.');
  });
});

describe('a promise or goal of theirs is in their words, never Groundwork’s', () => {
  const transcript = [
    'GROUNDWORK: I can help you by reminding you of previous updates, discussing further steps on the Jamii Clinics matter, or any other aspect of your daily check-in that you would like to address.',
    'PERSON: I will finish two more Jamii Clinics witness statements by Friday.',
  ].join('\n');
  it('Aisha’s goal in Groundwork’s words is not hers', () => {
    expect(itIsTheirs('I can help you by reminding you of previous updates, discussing further steps on the Jamii Clinics matter', transcript)).toBe(false);
    expect(itIsTheirs('Finish two more Jamii Clinics witness statements by Friday', transcript)).toBe(true);
  });
  it('a figure reported is not a target', () => {
    expect(A_PERIOD_REPORTED.test('November collections KES 720,000') && !AN_AIM_IN_WORDS.test('November collections KES 720,000')).toBe(true);
    /* "Four proposals", restating a target, names no period: it stays an aim. */
    expect(A_PERIOD_REPORTED.test('Four proposals')).toBe(false);
    expect(AN_AIM_IN_WORDS.test('Collect KES 720,000 by the end of November')).toBe(true);
  });
});
