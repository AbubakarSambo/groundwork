import { noDanglingConditional, houseStyle } from './anthropic.service';

/**
 * "AND IF SO" WITH NOTHING IN FRONT OF IT.
 *
 * The engine has a template it uses often and well - "Does the new hire know that is how you see
 * the role? And if so, how did you describe it to them?" - and about one time in four it drops the
 * first half. Read on a real setup: "That third one, the behavioural change, is often the hardest
 * and the most important. And if so, how was that communicated?" Counted across 1,901 AI turns in
 * the database: three well-formed, one orphaned.
 *
 * The connective goes, not the question. Inventing the missing half would be writing somebody a
 * question nobody asked.
 */
describe('a conditional with nothing in front of it', () => {
  it('drops the connective when no question came before it', () => {
    expect(noDanglingConditional('That is often the hardest. And if so, how was that communicated?'))
      .toBe('That is often the hardest. How was that communicated?');
  });

  /** The common, correct case. Touching this would break a question that works. */
  it('and leaves the two-part question exactly alone', () => {
    const good = 'Does the teammate know that? And if so, how was it put to them?';
    expect(noDanglingConditional(good)).toBe(good);
  });

  it('and leaves a bare "If so" alone when it follows a question', () => {
    const good = 'Have you told them? If so, when?';
    expect(noDanglingConditional(good)).toBe(good);
  });

  it('and handles the orphan at the very start of a turn', () => {
    expect(noDanglingConditional('If so, how was that communicated?'))
      .toBe('How was that communicated?');
  });

  it('and changes nothing else', () => {
    const plain = 'You said the handover was finished in August. Which is right?';
    expect(noDanglingConditional(plain)).toBe(plain);
    expect(noDanglingConditional('')).toBe('');
  });

  it('and runs on every reply, not just in this file', () => {
    expect(houseStyle('That is the hardest one. And if so, how was that communicated?'))
      .toBe('That is the hardest one. How was that communicated?');
  });
});
