import { theDealWasDropped, theLostDeal, theLostLine } from './a-deal-that-was-dropped';

/**
 * A LOST DEAL, AND WHY (Hafsah, 18 October 2026; the prototype's "Lost deals, and why"). Kevin's real lines about Kamau Electricals
 * from the Drop Access run (gw_sweep_drop10): on 13 October "Kamau Electricals on Ngong Road said no to our units. They're happy
 * with Aqua Pure.", and on 19 October "Kamau Electricals said no because they already buy from Aqua Pure."
 */
const KEVIN = 'p-kevin';
const KAMAU = { name: 'Kamau Electricals', stage: 'Contacted', ownerParticipantId: KEVIN, fields: null };
const line = (text: string, on: string, more: Record<string, any> = {}) => ({ text, participantId: KEVIN, createdAt: new Date(`${on}T11:00:00Z`), disputedAt: null, ...more });

describe('Kamau Electricals is lost, with Kevin\'s own words as the record', () => {
  const d = theDealWasDropped(KAMAU, [
    line("Kamau Electricals on Ngong Road said no to our units. They're happy with Aqua Pure.", '2026-10-13'),
    line('Kamau Electricals said no because they already buy from Aqua Pure.', '2026-10-19'),
  ], { lastStage: 'Won' })!;
  it('Grace reads the reason, that Kevin said it, and no lesson the record does not hold', () => {
    expect(theLostDeal('Kamau Electricals', d, 'Kevin')).toEqual({
      reason: 'They already buy from Aqua Pure.',
      reasonFrom: 'Kevin said it.',
      lesson: null,
      says: 'Kamau Electricals was lost, because they already buy from Aqua Pure.',
    });
  });
  it('Kevin reads it as his own', () => {
    expect(theLostDeal('Kamau Electricals', d, 'You').reasonFrom).toBe('You said it.');
  });
  it('the day it was lost is the day the reason was said', () => {
    expect(d.on).toBe('2026-10-19');
  });
});

describe('the reason, what shows it, and what it teaches', () => {
  it('a customer who only said no gave no reason, and the row says every lost deal needs one', () => {
    const d = theDealWasDropped(KAMAU, [line('Kamau Electricals said no.', '2026-10-19')], { lastStage: 'Won' })!;
    expect(theLostDeal('Kamau Electricals', d, 'Kevin')).toEqual({
      reason: null,
      reasonFrom: 'No reason given.',
      lesson: 'Every lost deal needs a reason.',
      says: 'Kamau Electricals was lost, and no reason was given.',
    });
  });
  it('a deal given up after no reply is lost with that reason, in the rep\'s words', () => {
    const upper = { name: 'Upper Hill Offices', stage: 'Contacted', ownerParticipantId: KEVIN, fields: null };
    const d = theDealWasDropped(upper, [line("Upper Hill Offices: I've stopped chasing them. I called three times with no reply, so I'm moving on.", '2026-10-15')], { lastStage: 'Won' })!;
    expect(theLostDeal('Upper Hill Offices', d, 'Kevin').reason).toBe("Upper Hill Offices: I've stopped chasing them. I called three times with no reply, so I'm moving on.");
  });
  it('a reason that came in with a document is shown by proof', () => {
    const d = theDealWasDropped(KAMAU, [line('Kamau Electricals said no because they already buy from Aqua Pure.', '2026-10-19', { anchoredDocumentId: 'doc-1' })], { lastStage: 'Won' })!;
    expect(theLostDeal('Kamau Electricals', d, 'Kevin').reasonFrom).toBe('Proof shows it.');
  });
  it('a reader who may not read the rep\'s words reads only that it was lost', () => {
    const d = theDealWasDropped(KAMAU, [line("Kamau Electricals is not interested, they have signed with Aqua Pure.", '2026-10-19')], { lastStage: 'Won' })!;
    expect(theLostLine('Kamau Electricals', d, null)).toBe('Kamau Electricals was lost.');
    expect(theLostDeal('Kamau Electricals', d, null).reason).toBeNull();
  });
});
