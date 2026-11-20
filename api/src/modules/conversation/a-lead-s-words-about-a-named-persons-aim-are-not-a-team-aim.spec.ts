import { anAimHeldByAnotherPerson } from './the-assessment';

/** Run 9: "Mary wants to aim higher on her own" reached Sam's, Asha's and Amani's recaps because it was kept as a team aim. */
describe('an aim held by a named person is never kept as the team aim', () => {
  const lucy = 'Lucy Kamau';
  it('is about Mary, so it is not kept for everybody', () => {
    expect(anAimHeldByAnotherPerson({ whose: 'Mary', target: null }, lucy)).toBe(true);
  });
  it('keeps the team aim and the lead\'s own aim', () => {
    expect(anAimHeldByAnotherPerson({ whose: 'The team', target: 30 }, lucy)).toBe(false);
    expect(anAimHeldByAnotherPerson({ whose: 'Lucy', target: null }, lucy)).toBe(false);
    expect(anAimHeldByAnotherPerson({ target: null }, lucy)).toBe(false);
  });
  it('leaves a numbered aim on the road it always had', () => {
    expect(anAimHeldByAnotherPerson({ whose: 'Mary', target: 35 }, lucy)).toBe(false);
  });
});
