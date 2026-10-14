import { onlyRecordsTheLinesSay } from './the-kind-of-work';

/**
 * PILOTS AFTER FIXES, 14 OCTOBER (A1): Joseph's "She wants 12,000 for 10 units", about Mercy, became a deal named "Mercy" on
 * the sales board. A person in the check-in is never a customer or a deal.
 */
const PEOPLE = [
  { id: 'p-joseph', firstName: 'Joseph', lastName: 'Kariuki' },
  { id: 'p-mercy', firstName: 'Mercy', lastName: 'Wairimu' },
];
const LINES = [{ id: 'e1', text: "Mercy says she wants 12,000 for 10 units from Mama Pima's shop.", participantId: 'p-joseph' }];

describe('a person is never a deal', () => {
  it('"Mercy" and "Mercy Wairimu" are dropped; the real customer is kept', () => {
    const kept = onlyRecordsTheLinesSay('sales org', [
      { lineId: 'e1', kind: 'deal', name: 'Mercy' },
      { lineId: 'e1', kind: 'deal', name: "Mercy's" },
      { lineId: 'e1', kind: 'deal', name: 'Mama Pima' },
    ] as any, LINES, null, PEOPLE);
    expect(kept.map((r) => r.name)).toEqual(['Mama Pima']);
  });
});
