/**
 * The one lane that starts a piece of work rather than answering a question.
 */
import { route } from './the-router-is-deterministic';
import { whatTheyWantToCallIt } from './what-they-want-to-call-it';

describe('routing to objective setting', () => {
  it.each([
    'set an objective for the quarter',
    "let's set our objectives",
    'help me write a goal for onboarding',
    'I want to create a new objective',
    'objective setting',
  ])('takes "%s"', (message) => {
    expect(route(message).lane).toBe('set_an_objective');
  });

  it.each([
    'what are my objectives',
    'how are we doing against the objective',
    'who owns the revenue objective',
  ])('and leaves "%s" to the lanes that answer questions', (message) => {
    /* The cost of a false positive here is higher than elsewhere: this lane
       opens a draft and starts asking questions, which is intrusive in a way a
       wrong answer is not. */
    expect(route(message).lane).not.toBe('set_an_objective');
  });
});

describe('the working title', () => {
  it('is their own words with the asking removed', () => {
    expect(whatTheyWantToCallIt('I want to set an objective for onboarding the September companies')).toBe(
      'onboarding the September companies',
    );
    expect(whatTheyWantToCallIt("let's set a goal about cutting time to first check-in")).toBe(
      'cutting time to first check-in',
    );
  });

  it('and is null when they have not said what it is about yet', () => {
    /* Better than an empty title: the lane asks, rather than opening a draft
       called nothing. */
    expect(whatTheyWantToCallIt('set an objective')).toBeNull();
    expect(whatTheyWantToCallIt('help me set some objectives')).toBeNull();
  });

  it('and never cuts a word in half', () => {
    const long = `set an objective for ${'onboarding companies '.repeat(20)}`;
    const title = whatTheyWantToCallIt(long)!;
    expect(title.length).toBeLessThanOrEqual(120);
    expect(title).not.toMatch(/\s$/);
    expect(long).toContain(title);
  });
});
