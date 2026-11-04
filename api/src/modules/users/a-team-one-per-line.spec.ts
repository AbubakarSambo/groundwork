import { peopleOnLines, numbersIn, namesIn } from './putting-a-whole-company-on';

/**
 * A TEAM, ONE PERSON PER LINE (Hafsah, 31 October 2026: "Judge it by how fast a lead can get their whole team in, with phone numbers,
 * without repeating themselves."). The one reader the organisation's invite box, the setup's save card and a check-in's People and
 * setup all use. A line with a name and a number but no address is still that person.
 */
describe('a team typed one per line', () => {
  it('reads a name, an email and a phone number on each line, in any order, and a line with no email', () => {
    expect(peopleOnLines([
      'Sarah Chebet, sarah@sales.test, +254 712 345 678',
      'David Kariuki david@sales.test 0722 111 222',
      'Fatuma Hassan, +254 733 000 111',
      '',
      'james@sales.test',
    ].join('\n'))).toEqual([
      { name: 'Sarah Chebet', email: 'sarah@sales.test', phone: '+254 712 345 678' },
      { name: 'David Kariuki', email: 'david@sales.test', phone: '0722 111 222' },
      { name: 'Fatuma Hassan', email: null, phone: '+254 733 000 111' },
      { name: null, email: 'james@sales.test', phone: null },
    ]);
  });

  it('is the same reading the organisation\'s invite box makes of the names and numbers', () => {
    const pasted = 'Sarah Chebet, sarah@sales.test, +254 712 345 678\nDavid Kariuki david@sales.test 0722 111 222';
    expect(numbersIn(pasted).get('sarah@sales.test')).toBe('+254 712 345 678');
    expect(namesIn(pasted).get('david@sales.test')).toBe('David Kariuki');
  });
});
