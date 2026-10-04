import { displayName, plainWordsByPerson, type LabelParty } from './party-labels';
import { theNameInAnAddress } from './the-name-in-an-address';

/*
 * The browser journeys: the Context tab named two people "Amani Wekesa" and "Baraka Mutua", read out of
 * the addresses the lead invited them by, and the board called the same two "One colleague" and
 * "Another colleague". Both now read the name the same way.
 */
const invited = (id: string, email: string, extra: Partial<LabelParty> = {}): LabelParty =>
  ({ id, partyType: 'PARTY' as any, email, createdAt: new Date(2026, 9, Number(id.replace(/\D/g, '')) || 1), ...extra });

describe('a person invited by address, with no name given', () => {
  it('is named by the name in the address, as the Context tab names them', () => {
    expect(displayName(invited('p1', 'amani.wekesa@kito.test'))).toBe('Amani Wekesa');
    expect(displayName(invited('p2', 'baraka.mutua@kito.test'))).toBe('Baraka Mutua');
  });

  it('is not called one colleague and another colleague on the board', () => {
    const words = plainWordsByPerson([invited('p1', 'amani.wekesa@kito.test'), invited('p2', 'baraka.mutua@kito.test')]);
    expect(words.size).toBe(0);
  });

  it('keeps the name they were given, and their sign-in name, ahead of the address', () => {
    expect(displayName(invited('p1', 'amani.wekesa@kito.test', { nameGiven: 'Amani W.' }))).toBe('Amani W.');
    expect(displayName(invited('p1', 'amani.wekesa@kito.test', { user: { firstName: 'Amani', lastName: 'Wekesa-Otieno' } }))).toBe('Amani Wekesa-Otieno');
  });

  it('still says a colleague for a desk, an address with digits, and a placeholder address', () => {
    for (const email of ['accounts@kito.test', 'zawadi.u8@kito.test', 'sam@kito.test', 'p-role@kito.test', 'x1f3@unclaimed.invalid']) {
      expect(theNameInAnAddress(email)).toBeNull();
      expect(displayName(invited('p1', email))).toBeNull();
    }
    const words = plainWordsByPerson([invited('p1', 'accounts@kito.test'), invited('p2', 'sales@kito.test')]);
    expect([...words.values()]).toEqual(['one colleague', 'another colleague']);
  });
});
