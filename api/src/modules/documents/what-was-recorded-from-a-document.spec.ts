import { whatWasRecordedFromADocument } from './what-was-recorded-from-a-document';

/* What each reader reads after a yes to a document's numbers, word for word. */
describe('what a person reads after a yes to a document\'s numbers', () => {
  it('in a check-in, one number for one person', () => {
    expect(whatWasRecordedFromADocument({ fileName: 'Q3 targets.pdf', forAPerson: 1, forEveryone: 0, reader: 'check-in' }))
      .toBe('I have recorded this from Q3 targets.pdf. One number is now set for the person it belongs to. Nobody is measured against a number until they have seen it.');
  });

  it('in a check-in, with the person\'s own number instead of the document\'s', () => {
    expect(whatWasRecordedFromADocument({ fileName: 'Q3 targets.pdf', forAPerson: 1, forEveryone: 0, corrected: { name: 'Q3 sales', theirs: 45, documents: 40 }, reader: 'check-in' }))
      .toBe('I have recorded this from Q3 targets.pdf. For Q3 sales, I have written 45, as you said, instead of the 40 in the document. One number is now set for the person it belongs to. Nobody is measured against a number until they have seen it.');
  });

  it('twelve numbers are in figures, one count to a sentence', () => {
    expect(whatWasRecordedFromADocument({ fileName: 'plan.xlsx', forAPerson: 12, forEveryone: 3, reader: 'check-in' }))
      .toBe('I have recorded this from plan.xlsx. 12 numbers are now set, each for the person it belongs to. Three numbers are for the whole check-in, and everybody here sees them. Nobody is measured against a number until they have seen it.');
  });

  it('the lead setting up a check-in is told they set it, and where to see it', () => {
    expect(whatWasRecordedFromADocument({ fileName: 'Q3 targets.pdf', forAPerson: 1, forEveryone: 0, reader: 'setup' }))
      .toBe('I have recorded this from Q3 targets.pdf. One number is now set for the person it belongs to. It is marked as set by you, and that person has not seen it yet. You can see it on the Context and resources page now, and every check-in will ask about it.');
    expect(whatWasRecordedFromADocument({ fileName: 'Q3 targets.pdf', forAPerson: 2, forEveryone: 1, reader: 'setup' }))
      .toBe('I have recorded this from Q3 targets.pdf. Two numbers are now set, each for the person it belongs to. Each one is marked as set by you, and the person it belongs to has not seen it yet. One number is for the whole check-in, and everybody here sees it. You can see them on the Context and resources page now, and every check-in will ask about them.');
  });

  it('nothing written twice says so in a sentence', () => {
    expect(whatWasRecordedFromADocument({ fileName: 'Q3 targets.pdf', forAPerson: 0, forEveryone: 0, reader: 'check-in' }))
      .toBe('Those numbers are already recorded, so I have not written them a second time.');
  });

  it('no clipped piece: every part has a verb and ends in a full stop', () => {
    const said = whatWasRecordedFromADocument({ fileName: 'Q3 targets.pdf', forAPerson: 3, forEveryone: 2, reader: 'check-in' });
    expect(said).not.toMatch(/\d+ numbers? against/);
    expect(said).not.toMatch(/^Recorded from/);
  });
});
