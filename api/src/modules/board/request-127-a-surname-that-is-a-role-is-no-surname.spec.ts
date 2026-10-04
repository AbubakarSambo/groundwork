import { GroundScenario, PartyType } from '@prisma/client';
import { person, boardAs, answered } from './the-switchboards-sections-harness';
import { displayName } from '../reports/party-labels';
import { aSurnameOrNothing } from '../reports/a-title-is-not-a-first-name';

/** Request 127 item 9: "Wanjiru Lead has not said it", where "Wanjiru" is used elsewhere. */
describe('a person whose surname field holds "Lead"', () => {
  it('is named Wanjiru everywhere', () => {
    expect(aSurnameOrNothing('Lead')).toBeUndefined();
    expect(aSurnameOrNothing('Mwangi')).toBe('Mwangi');
    expect(displayName({ user: { firstName: 'Wanjiru', lastName: 'Lead' } } as any)).toBe('Wanjiru');
    expect(displayName({ user: { firstName: 'Wanjiru', lastName: 'Mwangi' } } as any)).toBe('Wanjiru Mwangi');
  });
  it('is named Wanjiru on the board as the lead, and to the other person', async () => {
    const people = [person('p-w', 'u-w', 'Wanjiru', 'Lead', PartyType.INITIATOR), person('p-k', 'u-k', 'Kwame', 'Mensah')];
    const setup: any = { scenario: GroundScenario.OKR_ALIGNMENT, people, initiatorId: 'u-w', label: 'Q3', checkIns: [answered('p-k', 1, '2026-09-02T16:00:00Z')] };
    for (const reader of ['u-w', 'u-k']) {
      const b = JSON.stringify(await boardAs(setup, reader, 'MEMBER'));
      expect(b).not.toMatch(/Wanjiru Lead/);
    }
  });
});
