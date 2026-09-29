import { BoardService } from './board.service';

/**
 * REQUEST 68: A DECISION THE BOARD LISTS IS A SENTENCE, NOT "UNBLOCK:" OR "SETTLE:" AND A COLON.
 *
 * Built by the one function the board's decisions list comes from.
 */
describe('a decision on the board is a sentence', () => {
  const derive = (divergences: any[], deps: any[]) =>
    (BoardService.prototype as any).deriveDecisions.call({}, divergences, deps, (id: string) => (id === 'p-juma' ? 'Juma Otieno' : null), []);

  it('a blocker', () => {
    const [d] = derive([], [{ what: 'The discount decision', status: 'BLOCKING', onParticipantId: 'p-juma', onLabel: null }]);
    expect(d.question).toBe('Somebody is waiting on the discount decision, so it needs deciding.');
    expect(d.owner).toBe('Juma Otieno');
  });

  it('a difference between accounts', () => {
    const [d] = derive([{ topic: 'The main obstacle to signing new shops' }], []);
    expect(d.question).toBe('The accounts differ on the main obstacle to signing new shops, so it needs settling.');
  });

  it('never a label and a colon', () => {
    const all = derive([{ topic: 'Pricing' }, {}], [{ what: 'Stock at Westgate', status: 'BLOCKING', onParticipantId: null, onLabel: 'Finance' }]);
    for (const d of all) expect(d.question).not.toMatch(/^(Unblock|Settle):/);
  });
});
