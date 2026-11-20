import { boardAs } from './the-switchboards-sections-harness';
import { review5, REVIEW_5_PEOPLE, RUKIA_RUNS_IT, AMANI } from './__fixtures__/sales-board-review-5';

/**
 * REQUEST 121, PART 4: FARAJI, WHO IS WAITING TO BE LET IN, IS NOT CHASED IN "THE TEAM TODAY", read as each person who reads the board.
 */
describe('request 121 (4): somebody waiting to be let in is not chased', () => {
  const waiting = REVIEW_5_PEOPLE.map((p) => (p.id === 'p-faraji' ? { ...p, user: { ...p.user, awaitingOrgApproval: true } } : p));

  it('Rukia reads that Faraji Odhiambo is waiting to be let in, and is not asked to chase him', async () => {
    const b = await boardAs(review5({ people: waiting }), ...RUKIA_RUNS_IT);
    const row = (b.eachPerson as any[]).find((r) => r.participantId === 'p-faraji');
    expect(row.notLetIn).toBe(true);
    expect(row.says).toBe('Faraji Odhiambo is waiting to be let in, so there is nobody to ask yet.');
    expect(row.ask).toBeNull();
    const today = JSON.stringify(b.eachPersonToday ?? []);
    expect(today).not.toMatch(/Ask Faraji Odhiambo to check in|Faraji Odhiambo has not checked in/);
  });

  it('Faraji is still chased when he has been let in', async () => {
    const b = await boardAs(review5(), ...RUKIA_RUNS_IT);
    const row = (b.eachPerson as any[]).find((r) => r.participantId === 'p-faraji');
    expect(row.notLetIn).toBe(false);
    expect(row.says).toBe('Faraji Odhiambo has not checked in yet.');
  });

  it('nobody else is told anything about him that they were not told before', async () => {
    const before = await boardAs(review5(), ...AMANI);
    const after = await boardAs(review5({ people: waiting }), ...AMANI);
    expect(JSON.stringify(after.eachPerson ?? null)).toBe(JSON.stringify(before.eachPerson ?? null));
  });
});
