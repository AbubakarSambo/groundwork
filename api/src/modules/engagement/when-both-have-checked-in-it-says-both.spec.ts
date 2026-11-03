import { whereOneStands } from './heres-what-is-new';
import { aCheckInInASentence } from '../whatsapp/the-leads-daily-summary';

/** "In "Realigning operations", all two people have checked in" read like a slip. With two people, both have. */
describe('two people who have both checked in', () => {
  it('are "both people" in the lead\'s mail, Ask and WhatsApp summary', () => {
    /* Changed 3 November (F5 part 3): Ask says the one count's sentence (grounds/this-sessions-count.ts theCountSaid). */
    expect(whereOneStands({ label: 'Realigning operations', ofHowMany: 2, answered: 2, notYet: [], round: 1, says: 'All 2 have checked in.' })).toBe('In "Realigning operations", all 2 have checked in.');
    expect(aCheckInInASentence({ label: 'Realigning operations', ofHowMany: 2, answered: 2, notYet: [] })).toBe('In "Realigning operations", both people have checked in.');
  });
  it('and three or more are still "all"', () => {
    expect(whereOneStands({ label: 'Sales', ofHowMany: 3, answered: 3, notYet: [], round: 2, says: 'All 3 have checked in.' })).toBe('In "Sales", all 3 have checked in.');
    expect(aCheckInInASentence({ label: 'Sales', ofHowMany: 6, answered: 6, notYet: [] })).toBe('In "Sales", all 6 people have checked in.');
  });
});
