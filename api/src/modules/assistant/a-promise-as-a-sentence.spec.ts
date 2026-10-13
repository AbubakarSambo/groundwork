import { aPromiseAsASentence } from './a-promise-as-a-sentence';

describe('a promise, said back as a sentence', () => {
  it('first person becomes second, once, with the day', () => {
    expect(aPromiseAsASentence('I will send it by Friday now that I have the new name.', 'by Friday')).toBe('You said you would send it by Friday now that you have the new name.');
    expect(aPromiseAsASentence('Send the Kisumu price list', 'by Friday', 'Sales team, Q3')).toBe('In "Sales team, Q3", you said you would send the Kisumu price list by Friday.');
    expect(aPromiseAsASentence('I will settle the 21 day credit rule with finance by the end of October.', 'by the end of October')).toBe('You said you would settle the 21 day credit rule with finance by the end of October.');
  });
  it('a promise with no day of its own takes the one they gave, in its own way of saying it', () => {
    expect(aPromiseAsASentence('Ask Juma about the discount.', 'Next week')).toBe('You said you would ask Juma about the discount next week.');
    expect(aPromiseAsASentence('Ask Juma about the discount.', 'Friday')).toBe('You said you would ask Juma about the discount by Friday.');
    expect(aPromiseAsASentence("I'll call Westgate Deli", null)).toBe('You said you would call Westgate Deli.');
  });
  it('two days that disagree are never both said: the promise\'s own stands', () => {
    expect(aPromiseAsASentence('I will send the deck on Monday.', 'by Friday')).toBe('You said you would send the deck on Monday.');
  });
  it('never a bracket, never a lower-case fragment, always a full stop', () => {
    for (const [t, w] of [['send it', 'Next week'], ['I will chase them', null], ['To confirm the date', 'by Friday']] as const) {
      const out = aPromiseAsASentence(t, w);
      expect(out).toMatch(/^You said you would [a-z].*\.$/);
      expect(out).not.toMatch(/[()]/);
    }
  });
});
