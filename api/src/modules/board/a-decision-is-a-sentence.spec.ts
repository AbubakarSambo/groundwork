import { BoardService } from './board.service';

/**
 * REQUEST 68: A DECISION THE BOARD LISTS IS A SENTENCE, NOT "UNBLOCK:" OR "SETTLE:" AND A COLON.
 *
 * Built by the one function the board's decisions list comes from.
 */
/* Expectations updated (Hafsah, 30 October 2026: plain language for an impatient first-time lead; a difference is said as what people said, with no "needs settling".) */
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
    /* Changed 3 November (F5 part 3, stage 8 and 9): named people "see it differently", in the approved journey's words. */
    expect(d.question).toBe('Brian Mwangi and Miriam Achieng see differently whether the order is signed.');
    expect(d.why).toBe('What people said about this does not match.');
  });

  it('a difference where one name is hidden from this reader names nobody', () => {
    const [d] = (BoardService.prototype as any).deriveDecisions.call(
      {},
      [{ topic: 'The main obstacle to signing new shops', positions: [{ participantLabel: 'Participant A' }, { participantLabel: 'Participant B' }] }],
      [], () => null, [], (l: string) => (l === 'Participant A' ? 'Brian Mwangi' : undefined),
    );
    expect(d.question).toBe('People in this check-in said different things about the main obstacle to signing new shops.');
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
