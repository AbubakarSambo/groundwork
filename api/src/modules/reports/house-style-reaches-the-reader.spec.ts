import { withoutDashes, hasDashes } from './forensic-voice';

/**
 * THE STYLE RULE HAS TO APPLY TO WHAT THE PRODUCT WRITES, NOT ONLY TO WHAT WE
 * WRITE.
 *
 * From a real shared report, on a finished twelve-session ground:
 *
 *   "clearing the ticket queue—the only concrete metric he had been given"
 *
 * No em dashes and no en dashes is the house rule for every word written for
 * this product, and it had been applied to none of the words the product writes
 * for itself. The model used the punctuation it was trained on and nothing in
 * the system noticed.
 *
 * WHY THIS ONE IS FIXED IN CODE WHEN THE FORENSIC PHRASES ARE ONLY DETECTED.
 *
 * Nothing here is a judgement call. A dash between clauses is a comma, and that
 * substitution cannot change what a sentence means. Cutting "both records
 * describe" out of a sentence, by contrast, leaves something that says a
 * different thing, and quietly altering a claim inside an accountability record
 * would be far worse than a stiff sentence.
 *
 * Deterministic gets fixed. Judgement gets reported.
 */

describe('dashes do not reach the reader', () => {
  it('turns a clause dash into a comma, exactly as it appeared live', () => {
    expect(withoutDashes('clearing the ticket queue—the only concrete metric he had been given'))
      .toBe('clearing the ticket queue, the only concrete metric he had been given');
  });

  it('handles the spaced form too', () => {
    expect(withoutDashes('He owned two accounts — including the calls.'))
      .toBe('He owned two accounts, including the calls.');
  });

  it('handles an en dash', () => {
    expect(withoutDashes('Week seven – the turning point – changed it.'))
      .toBe('Week seven, the turning point, changed it.');
  });

  it('does not leave a doubled comma where the sentence already had one', () => {
    expect(withoutDashes('First, the queue—then the accounts.'))
      .toBe('First, the queue, then the accounts.');
  });
});

describe('what it must not touch', () => {
  it('leaves a sentence with no dashes exactly as it was', () => {
    const clean = 'For the first six weeks, the two of you meant different things by doing well.';
    expect(withoutDashes(clean)).toBe(clean);
  });

  it('leaves hyphens alone, which are a different character and are correct', () => {
    const hyphens = 'A twelve-session ground with a well-defined, end-to-end handover.';
    expect(withoutDashes(hyphens)).toBe(hyphens);
  });

  it('survives empty input', () => {
    expect(withoutDashes('')).toBe('');
  });
});

describe('the detector behind it', () => {
  it('spots what it is meant to spot', () => {
    expect(hasDashes('queue—the only metric')).toBe(true);
    expect(hasDashes('week seven – the turning point')).toBe(true);
  });

  it('does not fire on hyphens', () => {
    expect(hasDashes('end-to-end ownership of two client accounts')).toBe(false);
  });

  it('confirms the live sentence is clean once fixed', () => {
    // The exact string that shipped, run through and checked.
    const live = 'while Abubakar focused on clearing the ticket queue—the only concrete metric he had been given.';
    expect(hasDashes(live)).toBe(true);
    expect(hasDashes(withoutDashes(live))).toBe(false);
  });
});
