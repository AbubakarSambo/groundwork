import { boardAs, answered, handoff, AMINA, RUKIA, JUMA } from './the-switchboards-sections-harness';
import { yourOwnReadSaysYou } from './your-own-read-says-you';

/**
 * ITEM 21, THE ENGINEERING BOARD: A PERSON'S OWN WAIT, IN THEIR OWN READ, SAYS "YOU".
 *
 * "Rebuilding the payments integration" (local test database, c6e70dcb): Samuel read on his own row of
 * "Contribution against role": "What they say is in the way sits outside this check-in, with the new
 * provider, and nothing on record says anybody has chased it." The rest of his row already said "you"
 * (item 18). Nobody else's row changes.
 */
const setup = {
  checkIns: [answered('p-rukia', 1), answered('p-baraka', 1), answered('p-rukia', 2), answered('p-baraka', 2)],
  waitsAreReadOnTheirOwn: true,
  dependencies: [handoff('d-creds', 'p-rukia', 'the sandbox credentials', { onLabel: 'the new provider', status: 'BLOCKING' })],
  lines: [
    { id: 'l-1', participantId: 'p-rukia', type: 'PROGRESS', text: 'I requested the sandbox credentials from the provider on 20 September.', verifiability: 'HIGH', checkIn: { sessionNumber: 1 }, disputedAt: null },
    { id: 'l-2', participantId: 'p-rukia', type: 'PROGRESS', text: 'The payment callback fix for 3 merchants is merged and tested.', verifiability: 'HIGH', checkIn: { sessionNumber: 2 }, disputedAt: null },
  ],
};
const rukiasReason = async (reader: readonly [string, string]) => ((await boardAs(setup as any, ...reader)).contribution ?? []).find((r: any) => r.participantId === 'p-rukia')?.reason as string | undefined;

describe('a wait outside the check-in, in the read of the person waiting', () => {
  it('Rukia reads it as hers', async () => {
    const r = await rukiasReason(RUKIA);
    expect(r).toMatch(/What you say is in the way sits outside this check-in, with the new provider,/);
    expect(r).not.toMatch(/What they say/);
  });
  it.each([['Amina, who runs it', AMINA], ['Juma, an admin', JUMA]])('%s reads it about Rukia, as before', async (_w, reader) => {
    const r = await rukiasReason(reader as readonly [string, string]);
    expect(String(r ?? '')).not.toMatch(/What you say/);
  });
  it('the sentences', () => {
    expect(yourOwnReadSaysYou('Other people were still naming them as the reason things moved.')).toBe('Other people were still naming you as the reason things moved.');
    expect(yourOwnReadSaysYou('3 check-ins in a row added nothing specific, and nothing is blocking them.')).toBe('3 check-ins in a row added nothing specific, and nothing is blocking you.');
  });
});
