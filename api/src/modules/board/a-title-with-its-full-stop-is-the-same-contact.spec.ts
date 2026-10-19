import { whatTheOwnerSaidOfEachDeal } from './what-the-owner-said-of-each-deal';

/**
 * "MRS. ACHOLA" IS GREENFIELD'S MRS ACHOLA, SO HER QUOTE IS NEVER FILED ON MAMA ROSE (engine test, Drop Access, Mercy, Friday 16 October).
 *
 * Mercy said "Mama Rose's kiosk bought one unit! Cash sale, KES 5,000." and, asked "What budget did Mrs Achola state for these 25 units,
 * and by when will they buy?", "Mrs. Achola said the quote for KES 125,000 is fine." The weekly report said "Two prices this week are
 * only someone's word: Mama Rose's KES 125,000, ...". Greenfield Supermarket's contact is written "Mrs. Achola".
 */
const at = (s: string) => new Date(s);
const deals = [
  { id: 'rose', name: 'Mama Rose', stage: 'Need established', fields: { Contact: 'Rose' } },
  { id: 'green', name: 'Greenfield Supermarket', stage: 'Quoted', fields: { Contact: 'Mrs. Achola' } },
];
const FRIDAY = [
  { role: 'AI', content: 'Last time you mentioned you were still following up with a few kiosks in Kawangware. What happened with those?', createdAt: at('2026-10-16T11:03:00Z') },
  { role: 'PERSON', content: "I visited a few more today. Mama Rose's kiosk bought one unit! Cash sale, KES 5,000. I have the receipt here.", createdAt: at('2026-10-16T11:03:05Z') },
  { role: 'AI', content: 'What budget did Mrs Achola state for these 25 units, and by when will they buy?', createdAt: at('2026-10-16T11:03:20Z') },
  { role: 'PERSON', content: "Mrs. Achola said the quote for KES 125,000 is fine. She needs her manager's sign-off next week.", createdAt: at('2026-10-16T11:03:25Z') },
];

describe("Mercy's Friday, as it is filed on her deals", () => {
  it('the KES 125,000 quote is Greenfield Supermarket\'s, not Mama Rose\'s', () => {
    const said = whatTheOwnerSaidOfEachDeal(deals, FRIDAY, ['Mercy', 'Grace']);
    expect(said.get('rose')?.set.Quoted).toBeUndefined();
    expect(said.get('green')?.set.Quoted).toBe('KES 125,000');
  });
});
