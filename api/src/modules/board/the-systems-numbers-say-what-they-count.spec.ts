import { theBoardForThisKind } from './each-kind-gets-its-own-board';

/** A number brought in from another system is served with what it counts, in the organisation's own words, so the board can name the metric in its table. */
describe('what the systems show, as served', () => {
  it('gives each number what it counts without a full stop, beside its own sentence', () => {
    const b: any = theBoardForThisKind({
      kind: 'MarketView Q4', board: {}, people: [], readerRunsIt: true, readerIsTheLead: true, documentSaysOf: new Map(), now: new Date('2026-10-05T09:00:00Z'),
      metrics: [{ key: 'paid_subscriptions', says: 'Paid subscriptions this quarter.', value: 31, unit: 'subscriptions', asOf: new Date('2026-10-04T09:00:00Z'), sourceSystem: 'Paystack', subjectExternalId: 'mv' }],
    } as any);
    expect(b.whatTheSystemsShow.numbers[0].label).toBe('Paid subscriptions this quarter');
    expect(b.whatTheSystemsShow.numbers[0].says).toContain('Paystack shows 31 subscriptions for paid subscriptions this quarter');
  });
});
