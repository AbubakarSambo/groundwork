import { forHumans, oneWordForTheThing } from './outbound';

/**
 * THE WORD THE MODEL SAYS BACK.
 *
 * The vocabulary decision - the object is a "check-in", the thing inside it is a "session" - was
 * enforced by a guard that walks the CLIENT tree. So every string a person can type was fixed and
 * nothing ever checked what the model says. Seen live: a reply reading "confirm the renewal ground"
 * on a screen whose every button, tab and email says check-in.
 *
 * AN INSTRUCTION WAS ALREADY THERE. `VOCABULARY_RULE` says it in the prompt, in plain words. It leaks
 * anyway and always will: "ground" is ordinary English and the model has no memory of which sense
 * this product forbids. So it is fixed at the boundary every reply already passes through.
 */
describe('the model says check-in too', () => {
  it('replaces the word this product does not use', () => {
    expect(oneWordForTheThing('confirm the renewal ground')).toBe('confirm the renewal check-in');
  });

  it('and its plural', () => {
    expect(oneWordForTheThing('your open grounds')).toBe('your open check-ins');
  });

  /**
   * A CAPITAL SURVIVES THE REPAIR where the rule applies. A bare sentence-opening "Ground closed."
   * is deliberately NOT converted - see the narrowness note below; without a determiner there is no
   * way to tell the product's noun from the everyday word, and the safe answer is to leave it.
   */
  it('keeps the capital where the sentence needs one', () => {
    expect(oneWordForTheThing('This Ground is closed.')).toBe('This Check-in is closed.');
  });

  /**
   * THE BRAND CONTAINS THE WORD, and a naive replace turns the product's own name into
   * "Check-inwork". Protected before the plain-word pass and restored after.
   */
  it('never damages the product name', () => {
    expect(oneWordForTheThing('Groundwork keeps the record.')).toBe('Groundwork keeps the record.');
    expect(oneWordForTheThing('Groundwork holds this ground.')).toBe('Groundwork holds this check-in.');
  });

  /**
   * ORDINARY ENGLISH IS NOT THE PRODUCT'S NOUN. These are words that happen to contain it, or use it
   * in its everyday sense, and rewriting them would produce nonsense in somebody's own record.
   */
  it('leaves ordinary English alone', () => {
    for (const phrase of [
      'the background to this',
      'we covered a lot of ground floor detail',
      'that claim is groundless',
      'a grounded answer',
      'grounding the decision in evidence',
    ]) {
      expect(oneWordForTheThing(phrase)).toBe(phrase);
    }
  });

  /**
   * THE CASES THAT DECIDED HOW NARROW THIS IS. It runs on text that QUOTES PEOPLE, so a wrong
   * replacement puts words in somebody's mouth inside their own record - the one thing this product
   * must never do. When in doubt, the word stays.
   */
  it('leaves the everyday sense alone even where it reads like ours', () => {
    for (const phrase of [
      'we covered a lot of ground',
      'they gained ground on the backlog',
      'the ground rules were clear',
      'grounds for concern',
      'ground truth',
      'Ground closed.',
    ]) {
      expect(oneWordForTheThing(phrase)).toBe(phrase);
    }
  });

  /** It runs on the real boundary, not only when called directly. */
  it('is applied to every reply that reaches a person', () => {
    expect(forHumans('Shall we confirm the renewal ground?')).toContain('renewal check-in');
  });
})
