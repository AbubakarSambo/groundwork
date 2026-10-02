import { AMINA, RUKIA, JUMA, boardAs, handoff } from './the-switchboards-sections-harness';
import { whatItIsHoldingUp } from './the-blockers';

/**
 * ITEM 18 (THE ONBOARDING AND PROJECT BOARDS): WHAT A WAIT HOLDS UP IS SAID WITH ITS PERSON IN IT.
 *
 * Served from the local test database on 2 October 2026, under `blockers[].holdingUp`:
 *   Tobi read "Once it is cleared, lead the client meetings." (an order with nobody in it), and "You said what you
 *   will do once it is cleared." where the record held "I can lead a client meeting and discuss pricing and renewals".
 *   Samuel read "Once it is cleared, submit the request to Finance for approval."
 * Now: "Once it is cleared, you will lead the client meetings.", "Once it is cleared, you can lead a client meeting
 * and discuss pricing and renewals." and "Once it is cleared, you will submit the request to Finance for approval."
 */
describe('item 18: what a wait holds up has its person in it', () => {
  it('the sentences, for the person and for somebody else', () => {
    expect(whatItIsHoldingUp('lead the client meetings', null, 'You')).toBe('Once it is cleared, you will lead the client meetings.');
    expect(whatItIsHoldingUp('submit the request to Finance for approval', null, 'Samuel Aryee')).toBe('Once it is cleared, Samuel Aryee will submit the request to Finance for approval.');
    expect(whatItIsHoldingUp('I can lead a client meeting and discuss pricing and renewals', null, 'You')).toBe('Once it is cleared, you can lead a client meeting and discuss pricing and renewals.');
    expect(whatItIsHoldingUp('the delivery can go out', null, 'You')).toBe('Once it is cleared, the delivery can go out.');
    expect(whatItIsHoldingUp('I will ask Chandarana for the signed agreement', null, 'Baraka Mwangi')).toBe('Once it is cleared, Baraka Mwangi will ask Chandarana for the signed agreement.');
  });

  const SETUP = { dependencies: [handoff('d1', 'p-rukia', 'an invitation to lead a client meeting', { onParticipantId: 'p-amina', then: 'lead the client meetings' })] };
  const holdingUp = (b: any) => ((b.blockers ?? []) as any[]).map((x) => x.holdingUp).filter(Boolean);

  it('Rukia, who is waiting, reads "you will"', async () => {
    const b = await boardAs(SETUP, ...RUKIA);
    expect(holdingUp(b)).toContain('Once it is cleared, you will lead the client meetings.');
  });

  it.each([['Amina, who runs it', AMINA], ['Juma, an admin who only reads', JUMA]])('%s never reads an order with nobody in it', async (_who, [user, role]) => {
    const b = await boardAs(SETUP, user, role);
    expect(JSON.stringify(b)).not.toMatch(/Once it is cleared, lead the client meetings/);
  });
});
