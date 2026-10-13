import { describe, it, expect } from 'vitest'
import { readableWithoutFieldNames, splitAtFieldNames } from './no-field-names-on-the-page';

describe('a key-joined string, split back into its parts', () => {
  it('takes the field name out and says each sentence once', () => {
    expect(readableWithoutFieldNames('Clarity on onboarding support. atStake: If this holds, x. If this holds, x.'))
      .toBe('Clarity on onboarding support. If this holds, x.');
  });
  it('splits the topic from its fields', () => {
    expect(splitAtFieldNames('Team integration. atStake: Left out. settledBy: Lunch.')).toEqual({ head: 'Team integration.', fields: { atStake: 'Left out.', settledBy: 'Lunch.' } });
  });
  it('leaves a sentence with no field name as it was', () => {
    expect(readableWithoutFieldNames('Who owns the escalation list: Amani or Juma?')).toBe('Who owns the escalation list: Amani or Juma?');
  });
});
