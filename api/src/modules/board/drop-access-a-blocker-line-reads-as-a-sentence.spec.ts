import { AMINA, RUKIA, JUMA, boardAs, handoff } from './the-switchboards-sections-harness';
import { whatItIsHoldingUp } from './the-blockers';

/**
 * DROP ACCESS (TEST), 18 OCTOBER: TWO BLOCKER LINES THAT DID NOT READ AS SENTENCES.
 *
 * Served on gw_sweep_drop10 under `blockers[].holdingUp` on Grace's board:
 *   "Once it is cleared, He wants five units." (a capital pronoun in the middle of the sentence), and
 *   "Once it is cleared, Joseph Kariuki will for that deal to move forward." (a "will" with no verb after it).
 * Now: "Once it is cleared, he wants five units." and "Once it is cleared, that deal can move forward."
 */
describe('Drop Access: a blocker line reads as a sentence', () => {
  it('a pronoun that starts what they said is lower case in the middle of the sentence', () => {
    expect(whatItIsHoldingUp('He wants five units.', null, 'Joseph Kariuki')).toBe('Once it is cleared, he wants five units.');
    expect(whatItIsHoldingUp('She will sign the order', null, 'You')).toBe('Once it is cleared, she will sign the order.');
    expect(whatItIsHoldingUp('They can pay on delivery', null, 'Mercy Wairimu')).toBe('Once it is cleared, they can pay on delivery.');
  });

  it('"for that deal to move forward" says the deal can move forward, never "will for"', () => {
    expect(whatItIsHoldingUp('for that deal to move forward', null, 'Joseph Kariuki')).toBe('Once it is cleared, that deal can move forward.');
    expect(whatItIsHoldingUp('for the delivery to go out', null, 'You')).toBe('Once it is cleared, the delivery can go out.');
  });

  it('the lines that were right stay as they were', () => {
    expect(whatItIsHoldingUp('lead the client meetings', null, 'You')).toBe('Once it is cleared, you will lead the client meetings.');
    expect(whatItIsHoldingUp('the delivery can go out', null, 'You')).toBe('Once it is cleared, the delivery can go out.');
  });

  const SETUP = { dependencies: [handoff('d1', 'p-rukia', 'an answer on the price', { onParticipantId: 'p-amina', then: 'He wants five units.' })] };
  const holdingUp = (b: any) => ((b.blockers ?? []) as any[]).map((x) => x.holdingUp).filter(Boolean);

  it.each([['Amina, who runs it', AMINA], ['Rukia, who is waiting', RUKIA], ['Juma, an admin who only reads', JUMA]])('%s reads the line on the board with a lower-case pronoun', async (_who, [user, role]) => {
    const b = await boardAs(SETUP, user, role);
    const lines = holdingUp(b);
    expect(lines).toContain('Once it is cleared, he wants five units.');
    expect(JSON.stringify(b)).not.toMatch(/cleared, He wants/);
  });
});
