import { aPromiseAsASentence } from './a-promise-as-a-sentence';

/** B-136: 'In "Sales team, Q4", you said you would two depot visits each week.' */
describe('what somebody said they would do', () => {
  it('reads as a sentence when it is a thing, not an action', () => {
    expect(aPromiseAsASentence('two depot visits each week', null, 'Sales team, Q4')).toBe('In "Sales team, Q4", what you said you would do is two depot visits each week.');
    expect(aPromiseAsASentence('A weekly price list', 'Friday')).toMatch(/^What you said you would do is [Aa] weekly price list by Friday\.$/);
  });
  it('reads as before when it is an action', () => {
    expect(aPromiseAsASentence('I will send the Kisumu price list', 'Friday')).toBe('You said you would send the Kisumu price list by Friday.');
  });
});
