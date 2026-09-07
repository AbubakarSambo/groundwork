import { forHumans, unwrapRecordNarration, withoutRecordNarration } from './outbound';

/**
 * "SEEMS LIKE LEGAL TERMS IN A COURT."
 *
 * Read back from a live session:
 *
 *   "That Zainab has not been told is now on the record."
 *
 * The rule against this already existed - ENGINE_RULES says "never say 'the record' to a person" -
 * and a strip already existed for it. Both missed, because `NARRATION_LEAD_IN` expects the
 * announcement to LEAD the sentence ("That's now on the record, and...") and here it arrived at the
 * tail with the actual content wedged in the middle.
 *
 * IT IS WORSE THAN STIFF. Telling somebody that a colleague's failure has been entered into a record
 * is the sentence that makes a person stop being candid, and candour is the entire input to this
 * product. Her words for what it should say instead: "has been noted and this helps with context on
 * how you might proceed."
 *
 * THE CLAUSE SURVIVES. "Zainab has not been told" is the finding; only the ceremony around it goes.
 * A strip that deleted the sentence would take the substance with it.
 */
describe('a record is not a courtroom', () => {
  it('unwraps the sentence that was actually photographed', () => {
    expect(unwrapRecordNarration('That Zainab has not been told is now on the record.'))
      .toBe('Zainab has not been told.');
  });

  it('and the same shape however it is conjugated', () => {
    for (const said of [
      'That the brief was never written is on the record.',
      'That they have not been told has been noted onto the record.',
      'And that nobody agreed a date goes into your record.',
    ]) {
      const out = unwrapRecordNarration(said);
      expect(out).not.toBeNull();
      expect(out!.toLowerCase()).not.toContain('record');
    }
  });

  it('leaves an ordinary sentence completely alone', () => {
    /* The clause is the content, so this must not fire on anything that merely mentions a record,
       nor on a sentence that happens to start with "that". */
    for (const said of [
      'That is a clear definition.',
      'Your dispatch record shows 24 hours.',
      'That Zainab has not been told is the most useful thing here.',
    ]) {
      expect(unwrapRecordNarration(said)).toBeNull();
    }
  });

  it('and the whole reply comes out without the ceremony', () => {
    const reply = 'That Zainab has not been told is now on the record. What do you expect of her?';
    expect(forHumans(reply)).toBe('Zainab has not been told. What do you expect of her?');
  });

  it('while the lead-in form it never caught before still works', () => {
    /* The two forms are handled by different rules and the tail one runs first, so this is the
       check that adding it did not shadow the original. */
    /* The lead-in strip leaves the connective it found, which is its long-standing behaviour and
       not what this change is about. What matters is that the ceremony is gone. */
    expect(withoutRecordNarration("That's now on the record, and it matters."))
      .toBe('And it matters.');
  });
})
