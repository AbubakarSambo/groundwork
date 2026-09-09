import { howMuchThereIsToGoOn } from './how-much-there-is-to-go-on';

/**
 * SOLID NEEDS SOMETHING TO ACT ON. One document took a session from 60 to 74 and from partial to
 * solid while nobody had committed to anything. The score may say 74; the band may not say solid.
 */
describe('solid needs something to act on', () => {
  const base = { answered: 2, ofPeople: 2, saidInAll: 12, agreed: 1, stillOpen: 0, commitments: 0, commitmentsWithOwnerAndDate: 0 };
  it('full coverage, most lines documented, a comparison, and zero commitments is partial, not solid', () => {
    const c = howMuchThereIsToGoOn({ ...base, documented: 7 });
    expect(c.score).toBeGreaterThanOrEqual(67);
    expect(c.band).toBe('partial');
    expect(c.reasons.join(' ')).toMatch(/nothing here has an owner and a date yet/);
  });
  it('one owned commitment lets the same session be solid', () => {
    const c = howMuchThereIsToGoOn({ ...base, documented: 7, commitments: 1, commitmentsWithOwnerAndDate: 1 });
    expect(c.band).toBe('solid');
  });
  it('a document alone cannot carry a band past partial', () => {
    const c = howMuchThereIsToGoOn({ ...base, documented: 12 });
    expect(c.band).toBe('partial');
  });
});
