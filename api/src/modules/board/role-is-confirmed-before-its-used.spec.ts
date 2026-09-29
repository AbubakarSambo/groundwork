import { needsRoleConfirmation, roleConfirmationQuestion, LOW_CONFIDENCE_CONFIRM_THRESHOLD } from './function-detection';
import { RoleFunction, MIN_COACHING_CONFIDENCE } from './role-maps';

/**
 * A ROLE GUESSED WITH LOW CONFIDENCE IS CONFIRMED BEFORE IT IS USED (decision 57, item 5).
 *
 * The threshold is the existing MIN_COACHING_CONFIDENCE, not a new number - see the comment on
 * LOW_CONFIDENCE_CONFIRM_THRESHOLD for why. These tests fix that reuse in place: if the two ever
 * drift apart, a read could be confident enough to coach from but never asked about, or asked about
 * something it was already confident enough to act on.
 */
describe('the threshold to ask is the one the product already coaches from', () => {
  it('is exactly MIN_COACHING_CONFIDENCE', () => {
    expect(LOW_CONFIDENCE_CONFIRM_THRESHOLD).toBe(MIN_COACHING_CONFIDENCE);
  });
});

describe('needsRoleConfirmation', () => {
  it('asks when a function was guessed below the threshold and nobody has confirmed it', () => {
    expect(needsRoleConfirmation({ fn: RoleFunction.SALES, confidence: 0.4 }, null)).toBe(true);
  });

  it('does not ask when there is no guess at all', () => {
    expect(needsRoleConfirmation({ fn: null, confidence: 0 }, null)).toBe(false);
  });

  it('does not ask once it has been confirmed', () => {
    expect(needsRoleConfirmation({ fn: RoleFunction.SALES, confidence: 0.4 }, new Date())).toBe(false);
  });

  it('does not ask when the read already clears the coaching threshold', () => {
    expect(needsRoleConfirmation({ fn: RoleFunction.SALES, confidence: 0.6 }, null)).toBe(false);
  });

  it('does not ask exactly at the threshold (the same boundary coaching already uses)', () => {
    expect(needsRoleConfirmation({ fn: RoleFunction.SALES, confidence: MIN_COACHING_CONFIDENCE }, null)).toBe(false);
  });
});

describe('roleConfirmationQuestion, plain words, in the person\'s own check-in or the lead\'s Context page', () => {
  it('matches decision 57\'s own example for sales', () => {
    expect(roleConfirmationQuestion(RoleFunction.SALES)).toBe(
      'It sounds like most of your work is sales. Is that right, or would you describe it differently?',
    );
  });

  it('reads as one plain sentence for a multi-word function too', () => {
    expect(roleConfirmationQuestion(RoleFunction.PROJECT_MANAGEMENT)).toBe(
      'It sounds like most of your work is project management. Is that right, or would you describe it differently?',
    );
  });
});
