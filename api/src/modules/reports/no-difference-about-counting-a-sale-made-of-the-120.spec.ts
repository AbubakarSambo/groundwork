import { whatDoesNotAddUpPerPerson } from './the-picture-gets-what-the-conversation-gets';
import { theCustomerALineIsAbout } from '../board/a-deals-units-are-not-a-target';

/**
 * HAFSAH'S ANSWER 7, 18 OCTOBER: "Remove the 'Count a sale' disagreement if it rests on reps repeating the 120 (point 9)."
 *
 * It did. On gw_sweep_drop10 the report was handed, by the product's own difference finder, before this change:
 *   Grace: counting a different thing: They said: "The team target is still 120 units. That's the total." The check-in's own count
 *     against "Units sold by 30 October" is 104 for everybody together. 120 from one person is more than that ...
 *   Joseph: counting a different thing: They said: "I'm aiming for 120 units." ... 120 from one person is more than that ...
 *   Kevin: counting a different thing: They said: "Kilele Hotel bought 40 units for KES 200,000, paid by M-Pesa." ... 200,000 from
 *     one person is more than that, so the two are not counting the same thing.
 * and it wrote "The way sales are counted makes it impossible to know if the team is on track" and "Agree on one way of counting
 * sales". Nobody counted a sale differently: Grace said "proof of payment or a signed order", Mercy "Signed orders and proof of
 * payment", Kevin "I would know the target has been met when I've sold 120 water dispensers." and "The 120 is the team's target.",
 * Joseph "Yes, if I close it, they'd be part of the 120." Those lines, as the record holds them, now give the report nothing.
 */
const CUSTOMERS = ['Kilele Hotel', 'Savannah Cafe', 'Upper Hill Offices', 'Greenfield Supermarket', 'Tuskys Westgate', 'Mama Pima', 'Juja Hardware', 'Kamau Electricals', 'Ngong Road Minimart', 'the kiosk at Thika Road Mall', 'Kasarani Gym', 'Mama Mboga Mart', 'Lavington Spa', 'Kawangware Fresh'];
const TEAM = { name: 'Units sold by 30 October', target: 120, count: 104, yours: false, setByThem: false };
const EACH = { name: 'units sold by 30 October', target: 40, count: 0, yours: true, setByThem: false };
const said = (text: string, session: number, type = 'PROGRESS') => ({ text, type, session });

const PEOPLE = [
  { participantId: 'p-grace', label: 'Grace', targets: [TEAM], said: [
    said('Our team target is 120 units sold by October 30th.', 1, 'SUCCESS_DEFINITION'),
    said('Each rep, Kevin, Mercy, and Joseph, needs to sell 40 units.', 1, 'INTENT'),
    said("We'll know the goal is met when we have proof of payment or a signed order for 120 units in total.", 1, 'SUCCESS_DEFINITION'),
    said('120 units sold in total', 5),
    said("The team target is still 120 units. That's the total.", 10),
  ] },
  { participantId: 'p-joseph', label: 'Joseph', targets: [TEAM, EACH], said: [
    said("Yes, if I close it, they'd be part of the 120.", 1),
    said("I'm aiming for 120 units.", 10),
  ] },
  { participantId: 'p-kevin', label: 'Kevin', targets: [TEAM, EACH], said: [
    said('Kilele Hotel bought 40 units for KES 200,000, paid by M-Pesa.', 1),
    said("I would know the target has been met when I've sold 120 water dispensers.", 1, 'SUCCESS_DEFINITION'),
    said("My next goal is to close the deals with Savannah Cafe and Ngong Road Minimart, that'll be 10 units.", 2),
    said("The 10 units are my personal contribution from the new leads I'm working on.", 2),
    said('Ngong Road Minimart is still thinking about 4 units.', 4),
    said("Savannah Cafe's deposit for 6 units is still coming in on Friday.", 4),
    said('Kasarani Gym paid KES 15,000 for 3 units today.', 10),
  ] },
  { participantId: 'p-mercy', label: 'Mercy', targets: [TEAM, EACH], said: [
    said('Signed orders and proof of payment for the 40 units would tell me they were sold.', 1, 'SUCCESS_DEFINITION'),
    said('Peter liked the samples and wants a quote for 30 units.', 10),
  ] },
];

describe('no difference about counting a sale is made of the 120 said again (answer 7)', () => {
  it('the report is handed no difference in what is counted, from the lines as the record holds them', () => {
    const handed = whatDoesNotAddUpPerPerson(PEOPLE as any, 10, { customers: CUSTOMERS, people: ['Grace', 'Kevin', 'Mercy', 'Joseph'] });
    expect(handed).not.toMatch(/counting a different thing|counted differently|two numbers for one target/);
    expect(handed).not.toMatch(/120 from one person|200,000 from one person/);
  });
  it('a possessive still names the customer, and a line naming two customers is about both', () => {
    expect(theCustomerALineIsAbout("Savannah Cafe's deposit for 6 units is still coming in on Friday.", CUSTOMERS)).toBe('Savannah Cafe');
    expect(theCustomerALineIsAbout("close the deals with Savannah Cafe and Ngong Road Minimart, that'll be 10 units", CUSTOMERS)).toBe('Ngong Road Minimart and Savannah Cafe');
  });
  it('a count that really is larger than everything recorded is still put to the report', () => {
    const kwame = [{ participantId: 'p-k', label: 'Kwame', targets: [{ name: 'approved credit facilities', target: 40, count: 11, yours: false, setByThem: false }], said: [said('I have 22 approved credit facilities so far.', 3)] }];
    expect(whatDoesNotAddUpPerPerson(kwame as any, 3)).toMatch(/counting a different thing/);
  });
});
