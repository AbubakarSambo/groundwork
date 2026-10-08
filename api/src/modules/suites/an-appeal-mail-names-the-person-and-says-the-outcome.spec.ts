import { anAppealWaitsForYou, pleaseAddASecondAdmin, theAppealWasDecided } from './a-review-appeal';

/** The appeal mails (after-piece check, 8 October): a person who is named is called by name, not "their", and a decided appeal says what was decided. */
describe('the appeal mails, as each person reads them', () => {
  const read = (m: { subject: string; lines: string[] }) => [m.subject, ...m.lines].join(' ');

  it('never says "their" of the person who is named', () => {
    for (const m of [anAppealWaitsForYou('Grace', 'Imani', 'Baraka'), pleaseAddASecondAdmin('Baraka', 'Imani', true), pleaseAddASecondAdmin('Baraka', 'Imani', false)]) {
      expect(read(m)).not.toMatch(/\btheir (review|side|reasons)\b/);
      expect(read(m)).toContain("Imani's");
    }
  });

  it('the person is told the decision stands, or was changed', () => {
    expect(read(theAppealWasDecided('Imani', 'Grace', true, 'Imani', 'stands'))).toContain('The decision stands.');
    expect(theAppealWasDecided('Imani', 'Grace', true, 'Imani', 'stands').subject).toBe('Your appeal was decided, and the decision stands');
    expect(read(theAppealWasDecided('Imani', 'Grace', true, 'Imani', 'changed'))).toContain('The decision has been changed.');
    expect(theAppealWasDecided('Imani', 'Grace', true, 'Imani', 'changed').subject).toBe('Your appeal was decided, and the decision was changed');
  });

  it('the reviewer is told the same, in their own words, and neither is given the reasons', () => {
    const m = theAppealWasDecided('Baraka', 'Grace', false, 'Imani', 'changed');
    expect(m.subject).toBe("Imani's appeal was decided, and your decision was changed");
    expect(m.lines[1]).toBe("Grace, an admin, has read Imani's appeal of your decision on Imani's review. The decision has been changed.");
    expect(read(m)).not.toMatch(/reasons? (are|is|were)|because/i);
  });
});
