import { aNameOrNothing } from './a-name-is-short';

/**
 * A WHOLE SENTENCE WHERE A NAME GOES.
 *
 * Read on a live run, on the shared picture, in the place a person's name is printed:
 * "Chidinma Obi - She is handing over key financial processes after running them for five years.:
 * 0 check-ins on record, nothing specific named yet."
 *
 * The person had not signed in, so there was no first name, and the fallback printed the sentence
 * the lead typed about them when inviting them.
 */
describe('a name is short, or it is not a name', () => {
  it('takes the name off the front of the sentence the lead typed', () => {
    expect(
      aNameOrNothing('Chidinma Obi - She is handing over key financial processes after running them for five years.'),
    ).toBe('Chidinma Obi');
  });

  it('keeps a short description, because it is a real way of referring to somebody', () => {
    expect(aNameOrNothing('the lead nurse')).toBe('the lead nurse');
    expect(aNameOrNothing('our finance manager')).toBe('our finance manager');
  });

  it('returns nothing when there is nothing short enough to use', () => {
    expect(
      aNameOrNothing('somebody who has been running the escalation queue since the spring and now also covers weekends'),
    ).toBeNull();
  });

  it('is empty-safe', () => {
    expect(aNameOrNothing(null)).toBeNull();
    expect(aNameOrNothing('   ')).toBeNull();
  });

  it('drops the punctuation that made the live line read as a run-on', () => {
    expect(aNameOrNothing('Chidinma Obi.')).toBe('Chidinma Obi');
  });
});
