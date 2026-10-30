import { aDealsFigure, withoutADealsFigure } from './a-deals-units-are-not-a-target';
import { sayWhatDoesNotAddUp, whatDoesNotAddUp } from '../conversation/what-does-not-add-up';

/**
 * DROP ACCESS RUN 1, ITEMS 27 AND 28, from gw_sweep_drop10's own rows and turns.
 */
const CUSTOMERS = ['Kilele Hotel', 'Savannah Cafe', 'Upper Hill Offices', 'Greenfield Supermarket', 'Tuskys Westgate', 'Mama Pima', 'Juja Hardware', 'Ngong Road Minimart', 'Kawangware Fresh', 'Mama Mboga Mart'];
const PEOPLE = ['Grace', 'Kevin', 'Mercy', 'Joseph'];
const JOSEPH = '9f648012-3951-49af-92a5-9b7968b8a466';
const MERCY = 'fec56b17-a9a5-4ade-b07b-cdb05eac00e6';
const GRACE = '5a27e2d6-56ce-40a7-9e39-e304ad57d824';

describe('a number said about one customer is that deal\'s, not the rep\'s target', () => {
  it.each([
    'My main goal is to close the Mama Pima deal for 10 units.',
    'For Greenfield Supermarket, I expect to sell 25 units',
    "My next goal is to close the deals with Savannah Cafe and Ngong Road Minimart, that'll be 10 units",
    "The 30 units for Tuskys Westgate stands as what we're aiming for.",
  ])('"%s" is a deal\'s figure', (said) => {
    expect(aDealsFigure(said, CUSTOMERS, PEOPLE)).toBe(true);
  });
  it.each([
    'Our team target is 120 units sold by October 30th.',
    'Each rep, Kevin, Mercy, and Joseph, needs to sell 40 units.',
    "I'm aiming for 120 units by October 30.",
    'units sold by 30 October',
    'Signed orders and proof of payment for the 40 units would tell me they were sold.',
    'I want to sell 40 units with Grace by the end of October.',
  ])('"%s" is not', (said) => {
    expect(aDealsFigure(said, CUSTOMERS, PEOPLE)).toBe(false);
  });

  it('the targets read from the record: Joseph keeps the 40 Grace set, and "the Mama Pima deal for 10 units" is not his target', () => {
    const rows = [
      { name: 'units sold by 30 October', target: 40, ownerParticipantId: JOSEPH, setByParticipantId: null },
      { name: 'My main goal is to close the Mama Pima deal for 10 units.', target: 10, ownerParticipantId: JOSEPH, setByParticipantId: JOSEPH },
      { name: 'For Greenfield Supermarket, I expect to sell 25 units', target: 25, ownerParticipantId: MERCY, setByParticipantId: MERCY },
      { name: 'The team is aiming for each rep to open 10 new leads each week', target: 10, ownerParticipantId: null, setByParticipantId: GRACE },
    ];
    expect(withoutADealsFigure(rows, CUSTOMERS, PEOPLE).map((r) => r.name)).toEqual(['units sold by 30 October', 'The team is aiming for each rep to open 10 new leads each week']);
    /* Not a sales check-in: nothing is left out. */
    expect(withoutADealsFigure(rows, null, PEOPLE)).toHaveLength(4);
  });
});

describe('what does not add up, as the model is told it (items 27 and 28)', () => {
  it('Joseph: no "two numbers for one target" from the Mama Pima deal', () => {
    const input = {
      said: [{ text: 'My main goal is to close the Mama Pima deal for 10 units.', type: 'SUCCESS_DEFINITION', session: 1 }],
      thisSession: 9,
      targets: [
        { name: 'units sold by 30 October', target: 40, count: 0, yours: true, setByThem: false },
        { name: 'My main goal is to close the Mama Pima deal for 10 units.', target: 10, count: 0, yours: true, setByThem: true },
      ],
      sessionsLeft: 1,
      aiTurnsThisSession: [],
    };
    /* Before: the deal's 10 was put beside Grace's 40. */
    expect(whatDoesNotAddUp(input).map((d) => d.kind)).toContain('two numbers for one target');
    const after = sayWhatDoesNotAddUp({ ...input, customers: CUSTOMERS, people: PEOPLE });
    expect(after).not.toMatch(/Mama Pima/);
    expect(after).not.toMatch(/two numbers for one target/);
  });
  it('Mercy: her 40 in total and Tuskys Westgate\'s 30 are not one thing counted twice', () => {
    const input = {
      said: [
        { text: 'Signed orders and proof of payment for the 40 units would tell me they were sold.', type: 'SUCCESS_DEFINITION', session: 1 },
        { text: 'For Tuskys Westgate, the 30 units from the quote I sent stands.', type: 'PROGRESS', session: 6 },
      ],
      thisSession: 8,
      targets: [],
      sessionsLeft: 2,
      aiTurnsThisSession: [],
    };
    /* Before: "That is 40 units then 30: down 25%". */
    expect(whatDoesNotAddUp(input).map((d) => d.kind)).toContain('counted differently');
    expect(sayWhatDoesNotAddUp({ ...input, customers: CUSTOMERS, people: PEOPLE })).toBe('');
  });
  it('figures that name no customer on record are not set against each other (Kevin, polish round 1)', () => {
    const input = {
      said: [
        { text: 'I hit 30 units.', type: 'PROGRESS', session: 1 },
        { text: 'Jane will pay for 6 units.', type: 'PROGRESS', session: 4 },
      ],
      thisSession: 5, targets: [], sessionsLeft: 2, aiTurnsThisSession: [], customers: CUSTOMERS, people: PEOPLE,
    };
    expect(whatDoesNotAddUp(input).map((d) => d.kind)).not.toContain('counted differently');
  });

  it('the same customer counted differently is still put to them', () => {
    const input = {
      said: [
        { text: 'Tuskys Westgate wants 40 units.', type: 'PROGRESS', session: 2 },
        { text: 'Tuskys Westgate now wants 30 units.', type: 'PROGRESS', session: 6 },
      ],
      thisSession: 6, targets: [], sessionsLeft: 2, aiTurnsThisSession: [], customers: CUSTOMERS, people: PEOPLE,
    };
    expect(whatDoesNotAddUp(input).map((d) => d.kind)).toEqual(['counted differently']);
  });
});
