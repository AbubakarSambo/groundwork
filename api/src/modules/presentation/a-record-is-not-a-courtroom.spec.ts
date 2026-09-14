import { forHumans, unwrapRecordNarration, withoutRecordNarration, withoutTheMark } from './outbound';

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

/**
 * AND THE OTHER RULE THAT WAS NOT HOLDING: never open by judging their answer.
 *
 * ENGINE_RULES forbids it - "Never open by judging their answer. Not 'that's a specific example',
 * not 'that's really thoughtful'" - and a stripper existed for it. Both missed three sentences from
 * one live session: "That is a clean definition", "That is worth knowing", "That makes sense".
 *
 * The stripper enumerated ADJECTIVES, so the model simply reached for one that was not on the list.
 * It is anchored on the NOUN now - definition, answer, example, point, distinction, observation,
 * framing, read, target - because a sentence whose whole content is "that is a <something>
 * <one of those>" is talking about the answer, whatever adjective it picked. A sentence about the
 * work names the work, and keeps its noun.
 */
describe('a mark is not a reply', () => {
  const strip = (s: string) => withoutTheMark(`${s} Who else is in this?`);

  it('removes the ones that were photographed', () => {
    for (const mark of ['That is a clean definition.', 'That is worth knowing.', 'That makes sense.']) {
      expect(strip(mark)).toBe('Who else is in this?');
    }
  });

  it('and the shapes it already caught', () => {
    expect(strip("That's a very clear definition.")).toBe('Who else is in this?');
    expect(strip('Thank you for sharing that.')).toBe('Who else is in this?');
  });

  it('but never a sentence that is about the work', () => {
    /* The whole risk of a noun anchor: "that is a written brief" is content, not a compliment. */
    for (const said of [
      'That is a written brief.',
      'That is the whole story.',
      'That is not subtle.',
      'That is a fear based prototype.',
    ]) {
      expect(strip(said)).toBe(`${said} Who else is in this?`);
    }
  });

  it('and never leaves the turn empty', () => {
    /* If every sentence was a mark, the reply said nothing; sending nothing is worse than sending
       the mark, so the original stands. */
    expect(withoutTheMark('That makes sense.')).toBe('That makes sense.');
  });
})

/**
 * "AND IT IS IN YOUR RECORD" - THE SAME NARRATION, TWO WORDS OUTSIDE THE PATTERN.
 *
 * Walked the participant side in a browser and this came back after somebody said they had chased
 * legal twice:
 *
 *   "That's a specific action on your part, and it is in your record."
 *
 * The stripper was already here, written after the same complaint. It matched "it is NOW in THE
 * record" and this said "it is in YOUR record" - no "now", and "your" for "the". Missed by two
 * words, and the banned word went out to a person.
 *
 * AND THE COMMA IT WAS HANGING OFF. Taking the clause away left "...on your part, ." because the
 * comma belongs to the sentence, not to the narration. A stripper that leaves debris is one
 * somebody turns off.
 */
describe('the narration goes, in whichever words it arrives', () => {
  it('takes the tail clause and the comma with it', () => {
    expect(withoutRecordNarration("That's a specific action on your part, and it is in your record."))
      .toBe("That's a specific action on your part.");
  });

  it('with or without "now", and for "your" as well as "the"', () => {
    for (const said of [
      'It is in your record.',
      "It's now on the record.",
      'It is on your record.',
    ]) expect(withoutRecordNarration(said)).toBe('');
  });

  it('and an ordinary sentence about the work is left alone', () => {
    /* The risk of widening a pattern over text that quotes people: this must not move. */
    const plain = 'The build ships on the 14th and the migration follows it.';
    expect(withoutRecordNarration(plain)).toBe(plain);
  });
});
