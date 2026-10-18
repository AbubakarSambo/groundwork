import { aCountOfPlacesVisited, withoutADealsFigure } from './a-deals-units-are-not-a-target';

/**
 * THE DROP ACCESS SHORT RUN (gw_sweep_drop3), ITEM 7. Kevin, 12 October, asked "Which part of the plan is yours to do?", said "My part
 * of the plan is sending the price list to Savannah Cafe tomorrow morning, and tomorrow I'm also visiting two shops on Ngong Road."
 * The record kept a target of his own, ground_objectives: name "tomorrow I'm also visiting two shops on Ngong Road", target 2,
 * set by him. On 13 October he was asked "You said your aim is 2 shops; Grace set 40 units by October 30th. Which stands now?" and
 * "Your own aim is 2 shops."
 */
const KEVIN = 'c70d2a56-1a2d-48ac-948f-635b6aa817fe';
const CUSTOMERS = ['Kilele Hotel', 'Savannah Cafe', 'Upper Hill Offices', 'Ngong Road Minimart', 'Greenfield Supermarket', 'Mama Pima Stores'];
const ON_RECORD = [
  { id: 'o-team', name: 'Units sold by 30 October', target: 120, ownerParticipantId: null, setByParticipantId: 'p-grace' },
  { id: 'o-kevin', name: 'units sold by 30 October', target: 40, ownerParticipantId: KEVIN, setByParticipantId: 'p-grace' },
  { id: 'o-visit', name: "tomorrow I'm also visiting two shops on Ngong Road", target: 2, ownerParticipantId: KEVIN, setByParticipantId: KEVIN },
];

describe('a count of places visited is not an aim', () => {
  it('Kevin\'s two shops on Ngong Road are a visit, and no reader is handed them as his aim', () => {
    expect(aCountOfPlacesVisited("tomorrow I'm also visiting two shops on Ngong Road")).toBe(true);
    expect(withoutADealsFigure(ON_RECORD, CUSTOMERS, ['Grace', 'Kevin']).map((o) => o.id)).toEqual(['o-team', 'o-kevin']);
  });

  it('an aim with something to sell, sign or win in it stays an aim', () => {
    expect(aCountOfPlacesVisited('Visit 10 shops and sign 3 of them this week')).toBe(false);
    expect(aCountOfPlacesVisited('Sell 40 units by 30 October')).toBe(false);
    expect(aCountOfPlacesVisited('Open 10 new leads a week')).toBe(false);
  });

  it('away from a sales check-in (no customers on record) nothing is left out', () => {
    expect(withoutADealsFigure(ON_RECORD, null).map((o) => o.id)).toEqual(['o-team', 'o-kevin', 'o-visit']);
  });
});
