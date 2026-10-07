import { whereOneStands } from './heres-what-is-new';
import { aCheckInInASentence } from '../whatsapp/the-leads-daily-summary';

/** "In "Realigning operations", all two people have checked in" read like a slip. With two people, both have. */
describe('two people who have both checked in', () => {
  it('are "both people" in the lead\'s mail, Ask and WhatsApp summary', () => {
    expect(whereOneStands({ label: 'Realigning operations', ofHowMany: 2, answered: 2, notYet: [], round: 1 })).toBe('In "Realigning operations", both people have checked in for the first check-in.');
    expect(aCheckInInASentence({ label: 'Realigning operations', ofHowMany: 2, answered: 2, notYet: [] })).toBe('In "Realigning operations", both people have checked in.');
  });
  it('and three or more are still "all"', () => {
    expect(whereOneStands({ label: 'Sales', ofHowMany: 3, answered: 3, notYet: [], round: 2 })).toBe('In "Sales", all three people have checked in for the second check-in.');
    expect(aCheckInInASentence({ label: 'Sales', ofHowMany: 6, answered: 6, notYet: [] })).toBe('In "Sales", all 6 people have checked in.');
  });
});
