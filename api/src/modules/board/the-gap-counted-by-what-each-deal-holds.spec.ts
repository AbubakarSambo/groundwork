import { toCloseTheGap, theHeading } from './to-close-the-gap';

/**
 * TO CLOSE THE GAP, COUNTED BY WHAT EACH DEAL HOLDS (Drop Access, 17 October 2026). Grace's board read "To close the gap, all
 * seven of these" for 55 units still to sell, over seven open deals that hold 13 units between them on record. The prototype
 * (B5-the-board/board-as-lead.txt) reads "To close the gap, two of these three". Where the aim counts units or value, each deal
 * counts for what it holds; a deal with nothing on record for it is said, never guessed.
 */
const NOW = new Date('2026-10-16T15:00:00Z');
const END = new Date('2026-10-30T12:00:00Z');
const row = (id: string, name: string, group: string, fields: Record<string, string>) => ({ id, kind: 'deal', name, group, owner: 'Kevin Omondi', fields, nextSays: null } as any);
const sections = (rows: any[]) => [{ key: 'deals', rows }] as any;
const UNITS = { name: 'Units sold by 30 October', target: 120, count: 65, ownerParticipantId: null, fromTheDeals: { counts: 'units', currency: null } };

describe('the heading over the open deals', () => {
  it('says "all seven of these" only when all seven are needed and enough', () => {
    expect(theHeading(7, [], [1, 1, 1, 1, 1, 1, 1])).toBe('To close the gap, all seven of these');
    expect(theHeading(13, [], [6, 4, 3, null, null, null, null])).toBe('To close the gap, three of these seven');
    expect(theHeading(55, [], [6, 4, 3, null, null, null, null])).toBe('To close the gap, more than these seven deals are needed');
  });

  it('says how few would be enough, the largest first, as the prototype does', () => {
    expect(theHeading(9, [], [6, 4, 3])).toBe('To close the gap, two of these three');
    expect(theHeading(5, [], [6, 4, 3])).toBe('To close the gap, one of these three');
  });

  it('counts what the deals likely to close hold first, and says nothing where they are enough', () => {
    expect(theHeading(10, [6], [4, 3])).toBe('To close the gap, one of these two');
    expect(theHeading(5, [6], [4, 3])).toBeNull();
  });
});

describe('Grace\'s board, an aim of 120 units with 65 sold', () => {
  it('says that even if every open deal closes, the gap stays open, and how many deals have no units on record', () => {
    const gap = toCloseTheGap('sales org', sections([
      row('a', 'Savannah Cafe', 'possible', { Units: '6' }), row('b', 'Ngong Road Minimart', 'possible', { Units: '4' }),
      row('c', 'Kasarani Gym', 'possible', { Units: '3' }), row('d', 'Mama Mboga Mart', 'possible', { Units: 'two' }),
      row('e', 'Tuskys Westgate', 'possible', {}), row('f', 'Juja Hardware', 'possible', {}), row('g', 'Upper Hill Offices', 'possible', {}),
    ]), [UNITS], END, NOW)!;
    expect(gap.heading).toBe('To close the gap, more than these seven deals are needed');
    expect(gap.says).toBe('55 more units are needed by 30 October. The seven open deals still possible hold 15 units on record, so even if all of them close, 40 more units would be needed. Three of them have nothing on record for how many units, so they are not counted.');
  });

  it('says how many of them would be enough when they are', () => {
    const gap = toCloseTheGap('sales org', sections([
      row('a', 'Savannah Cafe', 'possible', { Units: '30' }), row('b', 'Ngong Road Minimart', 'possible', { Units: '30' }), row('c', 'Kasarani Gym', 'possible', { Units: '3' }),
    ]), [UNITS], END, NOW)!;
    expect(gap.heading).toBe('To close the gap, two of these three');
    expect(gap.says).toBe('55 more units are needed by 30 October. The three open deals still possible hold 63 units on record, so two of these three would need to close.');
  });

  it('an aim in money counts each deal by its value, in the aim\'s currency', () => {
    const gap = toCloseTheGap('sales org', sections([
      row('a', 'Savannah Cafe', 'possible', { Value: 'KES 30,000' }), row('b', 'Ngong Road Minimart', 'possible', { Value: 'KES 80,000' }),
    ]), [{ name: 'KES 2,000,000 in sales by 30 October', target: 2_000_000, count: 1_900_000, ownerParticipantId: null, fromTheDeals: { counts: 'value', currency: 'KES' } }], END, NOW)!;
    expect(gap.heading).toBe('To close the gap, both of these');
    expect(gap.says).toBe('KES 100,000 more is needed by 30 October. The two open deals still possible hold KES 110,000 on record, so both of these would need to close.');
  });
});

describe('a deal with no next step on record reads the kit\'s "Nothing booked" (Hafsah\'s point 4, 17 October)', () => {
  const rows = () => sections([
    { ...row('f', 'Juja Hardware', 'possible', {}), owner: 'Joseph Kariuki', next: null, nextSays: 'Nobody has said what happens next.' },
    { ...row('d', 'Mama Mboga Mart', 'possible', { Units: 'two' }), owner: 'Mercy Wairimu', next: null, nextStep: 'Waiting on Rose for the purchase of the two units', nextSays: 'Nobody has said what happens next.' },
    { ...row('a', 'Savannah Cafe', 'possible', { Units: '6' }), next: 'Kevin Omondi committed to follow up with Jane at Savannah Cafe.', nextSays: 'Kevin Omondi committed to follow up with Jane at Savannah Cafe.' },
  ]);

  it('with Release 1\'s sales board on, Grace reads "Nothing booked." where nothing is booked, and the step where one is', () => {
    const gap = toCloseTheGap('sales team', rows(), [UNITS], END, NOW, { nothingBooked: true })!;
    const says = gap.deals.map((d) => d.says);
    expect(says).toContain("Juja Hardware is Joseph Kariuki's deal. Nothing booked.");
    expect(says).toContain("Mama Mboga Mart is Mercy Wairimu's deal. Waiting on Rose for the purchase of the two units.");
    expect(says).toContain("Savannah Cafe is Kevin Omondi's deal. Kevin Omondi committed to follow up with Jane at Savannah Cafe.");
    expect(says.join(' ')).not.toContain('Nobody has said what happens next.');
  });

  it('switched off, the gap reads as it did before', () => {
    const gap = toCloseTheGap('sales team', rows(), [UNITS], END, NOW)!;
    expect(gap.deals.map((d) => d.says)).toContain("Juja Hardware is Joseph Kariuki's deal. Nobody has said what happens next.");
  });
});
