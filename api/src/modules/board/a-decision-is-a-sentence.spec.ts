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

  it('a difference, said as what each person said, with names this reader may see', () => {
    const names: Record<string, string> = { 'Participant A': 'Brian Mwangi', 'Participant B': 'Miriam Achieng' };
    const [d] = (BoardService.prototype as any).deriveDecisions.call(
      {},
      [{ topic: 'Whether the order is signed', positions: [{ participantLabel: 'Participant A' }, { participantLabel: 'Participant B' }] }],
      [], () => null, [], (l: string) => names[l],
    );
    expect(d.question).toBe('Brian Mwangi and Miriam Achieng said different things about whether the order is signed, so it needs settling.');
    expect(d.why).toBe('What people said about this does not match, so nobody can assume it is agreed.');
  });

  it('a difference where one name is hidden from this reader names nobody', () => {
    const [d] = (BoardService.prototype as any).deriveDecisions.call(
      {},
      [{ topic: 'The main obstacle to signing new shops', positions: [{ participantLabel: 'Participant A' }, { participantLabel: 'Participant B' }] }],
      [], () => null, [], (l: string) => (l === 'Participant A' ? 'Brian Mwangi' : undefined),
    );
    expect(d.question).toBe('People in this check-in said different things about the main obstacle to signing new shops, so it needs settling.');
    expect(d.question).not.toContain('Brian');
  });

  it('never says "account"', () => {
    for (const d of derive([{ topic: 'Pricing' }, {}], [])) {
      expect(`${d.question} ${d.why}`).not.toMatch(/\baccounts?\b/i);
    }
  });

  it('never a label and a colon', () => {
    const all = derive([{ topic: 'Pricing' }, {}], [{ what: 'Stock at Westgate', status: 'BLOCKING', onParticipantId: null, onLabel: 'Finance' }]);
    for (const d of all) expect(d.question).not.toMatch(/^(Unblock|Settle):/);
  });
});
