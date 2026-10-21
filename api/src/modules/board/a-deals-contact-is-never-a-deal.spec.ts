import { aDealNamedAsAPerson, theDealThePersonIsAt, thePersonsDetailsOnTheDeal, theQuestionBefore } from './a-deals-contact-is-never-a-deal';

/**
 * THE DROP ACCESS SHORT RUN (gw_sweep_drop3), ITEM 8. Joseph's check-in of 14 October, as the conversation holds it, and the two
 * deals the record kept from it (work_items): "Juja Hardware" (Decision maker: the owner) and "Mr Kariuki" (Contact: Mr Kariuki,
 * Need: five units if they're KES 4,500 each). Every board listed "Mr Kariuki" as one of Joseph's deals.
 */
const JOSEPH = 'f87055a6-e165-4384-ba01-d1cb2def3282';
const TURNS = [
  { role: 'AI', content: 'So Wanjiru will be ready to discuss the discount next week. Who at Mama Pima Stores makes the final decision on purchases?' },
  { role: 'PERSON', content: 'Wanjiru is the owner.' },
  { role: 'AI', content: "She is the owner, so she has the final decision on purchases. You also have Juja Hardware on your list. What is the customer's need, their budget?" },
  { role: 'PERSON', content: "Mr Kariuki wants five units if they're KES 4,500 each. I need to ask Grace about that price." },
];
const JUJA = { id: 'd476b4be', kind: 'deal', name: 'Juja Hardware', stage: 'Contacted', ownerParticipantId: JOSEPH, fields: { 'Next step': 'Speak to the owner', 'Decision maker': 'the owner' } };
const MAMA_PIMA = { id: 'mama-pima', kind: 'deal', name: 'Mama Pima Stores', stage: 'Need established', ownerParticipantId: JOSEPH, fields: { Units: '10', Contact: 'Wanjiru' } };
const MR_KARIUKI = { id: 'a9f14f3b', kind: 'deal', name: 'Mr Kariuki', stage: 'Need established', ownerParticipantId: JOSEPH, fields: { Need: "five units if they're KES 4,500 each", Units: 'five', Value: 'KES 22,500', Contact: 'Mr Kariuki', 'Price each': 'KES 4,500' } };

describe('a person named as a deal\'s contact is never a deal', () => {
  it('"Mr Kariuki" is named as a person; Mama Pima Stores and Juja Hardware are not', () => {
    expect(aDealNamedAsAPerson(MR_KARIUKI)).toBe(true);
    expect(aDealNamedAsAPerson(MAMA_PIMA)).toBe(false);
    expect(aDealNamedAsAPerson(JUJA)).toBe(false);
    expect(aDealNamedAsAPerson({ name: 'Mama Mboga Mart', fields: { Contact: 'Rose' } })).toBe(false);
  });

  it('Mr Kariuki is Juja Hardware\'s, from the question Joseph was answering, and becomes its contact', () => {
    const q = theQuestionBefore(TURNS, "Mr Kariuki wants five units if they're KES 4,500 each.");
    expect(q).toMatch(/Juja Hardware/);
    const at = theDealThePersonIsAt(MR_KARIUKI, [JUJA, MAMA_PIMA, MR_KARIUKI], q);
    expect(at?.name).toBe('Juja Hardware');
    expect(thePersonsDetailsOnTheDeal(JUJA, MR_KARIUKI)).toEqual({
      'Next step': 'Speak to the owner', 'Decision maker': 'the owner', Need: "five units if they're KES 4,500 each", Units: 'five', Value: 'KES 22,500', Contact: 'Mr Kariuki', 'Price each': 'KES 4,500',
    });
  });

  it('with no question naming one of his deals, nothing is guessed', () => {
    expect(theDealThePersonIsAt(MR_KARIUKI, [JUJA, MAMA_PIMA], 'What else should I know?')).toBeNull();
  });
});
