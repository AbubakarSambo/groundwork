import { boardAs, answered, AMINA, BARAKA, RUKIA, JUMA, SETUP_ADMIN, handoff } from './the-switchboards-sections-harness';
import { whatItIsHoldingUp } from './the-blockers';

/**
 * REQUEST 115 (e): "Once it is cleared, I will ask Chandarana for the signed agreement on 2 October when
 * they decide." was a blocker line in the first person with no name, so nobody could tell who "I" was.
 * Now the person's words are quoted as theirs where they typed them, and never changed.
 */
const THEN = 'I will ask Chandarana for the signed agreement on 2 October when they decide.';
const setup = {
  createdByUserId: 'u-setup',
  checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)],
  turns: [{ checkInId: 'c1-p-baraka', content: `I am waiting on Rukia for the discount decision. ${THEN}` }],
  dependencies: [handoff('d-baraka', 'p-baraka', 'the discount decision', { onParticipantId: 'p-rukia', status: 'BLOCKING', then: THEN, sourceCheckInId: 'c1-p-baraka' })],
};
const holdingUp = (board: any) => (board.blockers ?? []).find((b: any) => b.id === 'd-baraka')?.holdingUp;

describe('request 115 (e): what a blocker holds up says whose words they are', () => {
  it.each([['Amina, the lead', AMINA], ['the admin who set it up', SETUP_ADMIN], ['Juma, an admin who only reads', JUMA]])(
    '%s reads Baraka\'s words quoted as his', async (_who, reader) => {
      const board = await boardAs(setup as any, ...(reader as readonly [string, string]));
      expect(holdingUp(board)).toBe(`Baraka Otieno said that once it is cleared, "${THEN}"`);
    },
  );

  it('Baraka reads them as his own', async () => {
    expect(holdingUp(await boardAs(setup as any, ...BARAKA))).toBe(`You said that once it is cleared, "${THEN}"`);
  });

  it('Rukia, who holds it, reads them with his name', async () => {
    expect(holdingUp(await boardAs(setup as any, ...RUKIA))).toBe(`Baraka Otieno said that once it is cleared, "${THEN}"`);
  });

  it('no reader is sent a first-person blocker line with no name', async () => {
    for (const reader of [AMINA, SETUP_ADMIN, JUMA, BARAKA, RUKIA] as (readonly [string, string])[]) {
      const line = holdingUp(await boardAs(setup as any, ...reader));
      if (line) expect(line).not.toMatch(/^Once it is cleared, I\b/);
    }
  });

  it('where the words are the record\'s, not typed, "I will" becomes the name, and nothing else is changed', () => {
    expect(whatItIsHoldingUp('I will ask Chandarana for the signed agreement on 2 October.', null, 'Baraka Otieno'))
      .toBe('Once it is cleared, Baraka Otieno will ask Chandarana for the signed agreement on 2 October.');
    expect(whatItIsHoldingUp('I will ask my manager for the signed agreement.', null, 'Baraka Otieno'))
      .toBe('Baraka Otieno said what they will do once it is cleared.');
    expect(whatItIsHoldingUp('the delivery can go out', null, 'Baraka Otieno')).toBe('Once it is cleared, the delivery can go out.');
  });
});
