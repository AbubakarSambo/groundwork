import {
  EVERY_CELL, WHERE_IT_BELONGS, theFieldsOf, whichCell, whatThisSurfaceShows,
  placedNowhere, isYourOwn, readsARun, WHAT_A_SESSION_CELL_MAY_NOT_HOLD, NOT_REPORT_CONTENT,
  REACHES_NO_SCREEN,
} from './the-four-reports';
import { RUN_ONLY_FIELDS } from './a-read-needs-a-run';

describe('every field belongs to one of the four', () => {
  it('places each field exactly once', () => {
    const seen = Object.keys(WHERE_IT_BELONGS);
    expect(new Set(seen).size).toBe(seen.length);
    for (const [field, placed] of Object.entries(WHERE_IT_BELONGS)) {
      expect(EVERY_CELL).toContain(placed.cell);
      expect(field.trim()).toBe(field);
    }
  });

  it('gives every cell something, so none of the four is a label with nothing behind it', () => {
    for (const cell of EVERY_CELL) expect(theFieldsOf(cell).length).toBeGreaterThan(0);
  });

  it('keeps what needs a run out of the session cells', () => {
    /* The rule is borrowed from a-read-needs-a-run rather than restated - a rule stated twice is a
       rule that will disagree with itself, and this is one of the two that must not. */
    expect(WHAT_A_SESSION_CELL_MAY_NOT_HOLD).toEqual(RUN_ONLY_FIELDS);
    for (const field of WHAT_A_SESSION_CELL_MAY_NOT_HOLD) {
      const placed = whichCell(field);
      expect(placed).not.toBeNull();
      expect(readsARun(placed!.cell)).toBe(true);
    }
  });

  it('keeps the reads that need several sessions on the run, and out of one sitting', () => {
    for (const field of ['contribution', 'coverage', 'patterns']) {
      expect(readsARun(whichCell(field)!.cell)).toBe(true);
    }
  });

  it('keeps specificity on the session and confidence on the shared half', () => {
    /* two-reads-not-one-grade: specificity is per session and sits on the session; confidence is
       the one read across the history. My record had them as two matching bar rows and that is
       what was removed. */
    expect(whichCell('howClearThisWas')!.cell).toBe('A_SESSION');
    expect(isYourOwn(whichCell('howClearThisWas')!.cell)).toBe(true);
    expect(isYourOwn(whichCell('confidence')!.cell)).toBe(false);
  });

  it('keeps the coaching note on one sitting and out of the run', () => {
    expect(whichCell('coaching')!.cell).toBe('A_SESSION');
  });

  it('never puts a lead-only field on somebody else own half', () => {
    /* A lead-only read is about the shared picture. On somebody's own private half it would be a
       thing written about them that they are being handed. */
    for (const [field, placed] of Object.entries(WHERE_IT_BELONGS)) {
      if (placed.leadOnly) expect(isYourOwn(placed.cell)).toBe(false);
    }
  });

  it('a crop names what it leaves out, never what it takes', () => {
    const whole = whatThisSurfaceShows({ cell: 'B_SESSION' });
    const cropped = whatThisSurfaceShows({
      cell: 'B_SESSION',
      without: { whatEachPersonSaid: 'no room on a phone', confidence: 'read on the page it links to' },
    });
    expect(cropped.length).toBe(whole.length - 2);
    expect(cropped).not.toContain('confidence');
    /* The point of naming absences: a field added to the cell later lands on every crop that did
       not explicitly refuse it. */
    expect(cropped).toContain('sharedPicture');
  });

  it('separates lead-only fields from the rest when asked', () => {
    const lead = theFieldsOf('B_RUN', { leadOnly: true });
    const rest = theFieldsOf('B_RUN', { leadOnly: false });
    expect(lead).toContain('concernFlags');
    expect(rest).not.toContain('concernFlags');
    expect(lead.concat(rest).sort()).toEqual(theFieldsOf('B_RUN').sort());
  });

  it('names a field nobody has decided about', () => {
    expect(placedNowhere(['sharedPicture', 'somethingNew'])).toEqual(['somethingNew']);
    expect(placedNowhere(['sharedPicture', 'coaching'])).toEqual([]);
  });

  it('every field that reaches no screen is still placed', () => {
    /* The dark list is the honest state, not an excuse for leaving something unplaced. A field can
       be invisible and still have one correct home; being invisible is what gets fixed, and being
       unplaced is what lets the next surface decide by accident. */
    for (const field of REACHES_NO_SCREEN) expect(whichCell(field)).not.toBeNull();
  });

  it('and nothing on the dark list is somebody own private half by mistake', () => {
    /* Three of these are lead-only reads about other people. If one were sitting in an A cell it
       would be a thing written about somebody being handed to them the moment it was lit up. */
    for (const field of ['concernFlags', 'hiddenContributors', 'arcSignals']) {
      expect(isYourOwn(whichCell(field)!.cell)).toBe(false);
      expect(whichCell(field)!.leadOnly).toBe(true);
    }
  });

  it('and the plumbing list is a list, not a pattern', () => {
    /* A pattern is how the next unplaced field slips through. */
    expect(NOT_REPORT_CONTENT).toContain('sessionNumber');
    expect(placedNowhere(['sessionNumber'])).toEqual([]);
    expect(placedNowhere(['sessionThing'])).toEqual(['sessionThing']);
  });
});
