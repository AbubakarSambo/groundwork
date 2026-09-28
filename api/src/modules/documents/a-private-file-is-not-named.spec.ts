import { namesNotEverybodyMayOpen, withoutPrivateFileNames } from './a-private-file-is-not-named';

describe('a private file is not named to anybody else', () => {
  const names = namesNotEverybodyMayOpen([
    { fileName: 'team-plan.txt', visibility: 'OWN' },
    { fileName: 'budget.xlsx', visibility: 'CLOSED' },
    { fileName: 'price-list.pdf', visibility: 'OPEN' },
    { fileName: 'notes.docx' },
  ]);

  it('lists every file that is not open to everybody, and none that is', () => {
    expect(names.sort()).toEqual(['budget.xlsx', 'notes.docx', 'team-plan.txt']);
  });

  it('takes the name out, with the words that only introduced it', () => {
    expect(withoutPrivateFileNames('The attached team-plan.txt document confirms the split between Aisha and Tunde.', names))
      .toBe('The document confirms the split between Aisha and Tunde.');
    expect(withoutPrivateFileNames('Here is the context we have from team-plan.txt - the quarter plan.', names))
      .toBe('Here is the context we have from a document - the quarter plan.');
    expect(withoutPrivateFileNames('She said the numbers are in "budget.xlsx".', names))
      .toBe('She said the numbers are in a document.');
  });

  it('reads as a sentence where the file was the only thing named', () => {
    expect(withoutPrivateFileNames('The numbers on this check-in come from team-plan.txt.', names))
      .toBe('The numbers on this check-in come from a document.');
  });

  it('leaves an open file, and ordinary words, alone', () => {
    const t = 'The price-list.pdf shows 76,000, and the team plan is still being agreed.';
    expect(withoutPrivateFileNames(t, names)).toBe(t);
  });
});
