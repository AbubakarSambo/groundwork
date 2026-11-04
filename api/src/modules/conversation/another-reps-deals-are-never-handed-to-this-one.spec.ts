import { theSetTheySpokeToPartOf, theCustomersThatAreNotTheirs, withoutTheseCustomers } from './asking-for-what-they-left-out';

/**
 * THE DROP ACCESS SHORT RUN (gw_sweep_drop3, 12 October), ITEM 6. Grace said in her check-in "I'm going to be following up more
 * closely with each rep on the details of their active deals, especially Kilele Hotel, Greenfield Supermarket, and Mama Pima
 * Stores." Her words were handed to each rep's check-in as a set to ask about, and the reps read:
 *   Mercy:  "Beyond Greenfield Supermarket, you also have Kilele Hotel and Mama Pima Stores."
 *   Kevin:  "What about Greenfield Supermarket and Mama Pima Stores?"
 *   Joseph: "However, Grace also mentioned Kilele Hotel and Greenfield Supermarket."
 * Kilele Hotel is Kevin's, Greenfield Supermarket Mercy's, Mama Pima Stores Joseph's.
 */
const KEVIN = 'p-kevin';
const MERCY = 'p-mercy';
const JOSEPH = 'p-joseph';
const DEALS = [
  { name: 'Kilele Hotel', ownerParticipantId: KEVIN },
  { name: 'Greenfield Supermarket', ownerParticipantId: MERCY },
  { name: 'Mama Pima Stores', ownerParticipantId: JOSEPH },
  { name: 'Tuskys Westgate', ownerParticipantId: MERCY },
  { name: 'Mama Mboga Mart', ownerParticipantId: MERCY },
];
const GRACE = [{ text: "I'm going to be following up more closely with each rep on the details of their active deals, especially Kilele Hotel, Greenfield Supermarket, and Mama Pima Stores. I'll also check in on the new leads they're developing.", namedBy: 'Grace named' }];
const PEOPLE = ['Grace', 'Achieng', 'Kevin', 'Omondi', 'Mercy', 'Wairimu', 'Joseph', 'Kariuki'];
const turns = (said: string) => [{ role: 'AI', content: 'Which of those conversations was with someone who can actually decide?' }, { role: 'PERSON', content: said }];

describe('a rep is asked only about the deals that are theirs', () => {
  it('as it was: Grace\'s three customers made a set, and Mercy was asked about Kevin\'s and Joseph\'s', () => {
    const set = theSetTheySpokeToPartOf(GRACE, turns("For Greenfield Supermarket, I spoke directly with Mrs. Njeri, and she's the buyer there.") as any, PEOPLE);
    expect(set?.leftOut).toEqual(['Kilele Hotel', 'Mama Pima Stores']);
  });

  it('Mercy is never asked about Kilele Hotel or Mama Pima Stores', () => {
    const set = theSetTheySpokeToPartOf(withoutTheseCustomers(GRACE, theCustomersThatAreNotTheirs(DEALS, MERCY)), turns("For Greenfield Supermarket, I spoke directly with Mrs. Njeri, and she's the buyer there.") as any, PEOPLE);
    expect(set).toBeNull();
  });

  it('Kevin is never asked about Greenfield Supermarket or Mama Pima Stores, nor Joseph about Kilele Hotel or Greenfield Supermarket', () => {
    expect(theSetTheySpokeToPartOf(withoutTheseCustomers(GRACE, theCustomersThatAreNotTheirs(DEALS, KEVIN)), turns('Well, today Kilele Hotel bought 40 units.') as any, PEOPLE)).toBeNull();
    expect(theSetTheySpokeToPartOf(withoutTheseCustomers(GRACE, theCustomersThatAreNotTheirs(DEALS, JOSEPH)), turns('I need to follow up with Wanjiru at Mama Pima Stores.') as any, PEOPLE)).toBeNull();
  });

  it('only whole names are taken out: Mama Pima Stores goes from Mercy\'s, Mama Mboga Mart stays hers', () => {
    expect(theCustomersThatAreNotTheirs(DEALS, MERCY)).toEqual(['Kilele Hotel', 'Mama Pima Stores']);
    const [w] = withoutTheseCustomers([{ text: 'Mama Pima Stores and Mama Mboga Mart.', namedBy: 'x' }], theCustomersThatAreNotTheirs(DEALS, MERCY));
    expect(w.text).toBe(' and Mama Mboga Mart.');
  });
});
