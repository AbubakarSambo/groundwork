import { whatAddingSomebodySays, anOrdinal } from './what-a-month-costs';

/**
 * THE COST LINE WHERE SOMEBODY IS ADDED (Hafsah, 21 November 2026). One line, worked out from the prices Plan and billing reads,
 * and a price only when it will be charged.
 */
describe('the cost line', () => {
  const PAYING = { charged: true, taken: 15, included: 20, extraSeatCents: 500 } as const;
  it('within the seats: the seat it is, and that the bill does not change, with no yes needed', () => {
    expect(whatAddingSomebodySays(PAYING)).toEqual({ line: 'This is your 16th of 20 seats, so your bill doesn’t change.', needsAYes: false, whatsappLine: null });
  });
  it('a new seat: what it adds from today, and a yes, by name', () => {
    expect(whatAddingSomebodySays({ ...PAYING, taken: 20, name: 'Juma' })).toEqual({ line: 'This needs a new seat. It adds $5 a month from today. Add Juma?', needsAYes: true, whatsappLine: null });
  });
  it('WhatsApp: what it adds to this month, only where the person is not already counted', () => {
    expect(whatAddingSomebodySays({ ...PAYING, name: 'Juma', whatsapp: { personCents: 400, alreadyCounted: false } }).whatsappLine).toBe('If Juma checks in on WhatsApp this month, it adds $4 to this month’s bill.');
    expect(whatAddingSomebodySays({ ...PAYING, whatsapp: { personCents: 400, alreadyCounted: true } }).whatsappLine).toBeNull();
  });
  it('while the free trial\'s switch is off, nothing is charged and no price is said', () => {
    const r = whatAddingSomebodySays({ ...PAYING, charged: false, whyFree: 'free trial', taken: 25, whatsapp: { personCents: 400, alreadyCounted: false } });
    expect(r).toEqual({ line: 'Nothing is charged during your free trial.', needsAYes: false, whatsappLine: null });
    expect(JSON.stringify(r)).not.toMatch(/\$/);
  });
  it('the 21st, 22nd, 23rd, 11th and 112th seat', () => {
    expect([21, 22, 23, 11, 112].map(anOrdinal)).toEqual(['21st', '22nd', '23rd', '11th', '112th']);
  });
});
