import { WANTS_OUT } from './close-readiness';

/** Mercy's answer on Wednesday 14 October (Drop Access, messages test, fourth run), which closed her check-in after two questions. */
describe('"That\'s all I can do for now."', () => {
  it('is an answer about the work, not a wish to leave', () => {
    expect(WANTS_OUT.test("I called Joseph on Tuesday, and he said he'd have them for me on Thursday. That's all I can do for now.")).toBe(false);
    expect(WANTS_OUT.test('That is all we know so far.')).toBe(false);
  });
  it('"That\'s all.", "That\'s it for today" and "That is everything" still are', () => {
    expect(WANTS_OUT.test("That's all.")).toBe(true);
    expect(WANTS_OUT.test("That's it for today.")).toBe(true);
    expect(WANTS_OUT.test('That is everything from me.')).toBe(true);
  });
});
