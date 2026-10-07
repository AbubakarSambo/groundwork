import { theirOwnFirstNameAsYour } from './what-a-participant-is-told-about-this';

describe('the reader\'s own first name, as a possessive', () => {
  it('"Zawadi\'s first weeks" is "Your first weeks" to Zawadi', () => {
    expect(theirOwnFirstNameAsYour("Zawadi's first weeks", 'Zawadi')).toBe('Your first weeks');
    expect(theirOwnFirstNameAsYour('This is about Zawadi’s first weeks in Sales. Zawadi’s buddy is Amani.', 'Zawadi')).toBe('This is about your first weeks in Sales. Your buddy is Amani.');
  });
  it('nobody else\'s name, and no name without the possessive, is touched', () => {
    expect(theirOwnFirstNameAsYour("Baraka's first weeks", 'Zawadi')).toBe("Baraka's first weeks");
    expect(theirOwnFirstNameAsYour('Zawadi joins on Monday.', 'Zawadi')).toBe('Zawadi joins on Monday.');
    expect(theirOwnFirstNameAsYour("Zawadina's plan", 'Zawadi')).toBe("Zawadina's plan");
    expect(theirOwnFirstNameAsYour(null, 'Zawadi')).toBeNull();
  });
});
