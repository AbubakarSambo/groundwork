import { planFor, namesIn, numbersIn, addressesIn } from './putting-a-whole-company-on';

/*
 * A PHONE NUMBER COMES WITH THE PASTED LINE (Hafsah, 30 October 2026: phone numbers are added with the team; A4 people.txt:224 "One
 * per line: a name and an email, or a WhatsApp number"). Round 1 of the first experience: three of four leads were made to add each
 * number one by one after inviting. A number on the line is read with the name and the address, never as an address of its own.
 */
const PASTED = [
  'Ada Obi, ada@x.com, +254 712 345 678',
  'Brian Otieno\tbrian@x.com\t0712345679',
  'Chinedu Eze cheze@x.com +2348031234567',
  'dami@x.com',
].join('\n');

describe('a phone number on a pasted line', () => {
  it('is read as that person\'s number, beside their name', () => {
    expect(numbersIn(PASTED).get('ada@x.com')).toBe('+254 712 345 678');
    expect(numbersIn(PASTED).get('brian@x.com')).toBe('0712345679');
    expect(numbersIn(PASTED).get('cheze@x.com')).toBe('+2348031234567');
    expect(numbersIn(PASTED).has('dami@x.com')).toBe(false);
    expect(namesIn(PASTED).get('ada@x.com')).toBe('Ada Obi');
    expect(namesIn(PASTED).get('brian@x.com')).toBe('Brian Otieno');
  });

  it('is never read as an address, so nobody gets a "not an email" row for it', () => {
    expect(addressesIn(PASTED)).toEqual(['ada@x.com', 'brian@x.com', 'cheze@x.com', 'dami@x.com']);
    const rows = planFor(PASTED, () => false, null);
    expect(rows.map((r) => r.result)).toEqual(['invited', 'invited', 'invited', 'invited']);
    expect(rows[0]).toMatchObject({ email: 'ada@x.com', name: 'Ada Obi', phone: '+254 712 345 678' });
    expect(rows[3].phone).toBeUndefined();
  });
});
