import { displayName, plainWordsByPerson, type LabelParty } from './party-labels';

/*
 * The browser journeys: the Context tab named two people "Amani Wekesa" and "Baraka Mutua", read out of
 * the addresses the lead invited them by, and the board called the same two "One colleague" and
 * "Another colleague". Both now read the name the same way.
 */
const invited = (id: string, email: string, extra: Partial<LabelParty> = {}): LabelParty =>
  ({ id, partyType: 'PARTY' as any, email, createdAt: new Date(2026, 9, Number(id.replace(/\D/g, '')) || 1), ...extra });

describe('a person invited by address, with no name given', () => {
  /* Changed on 6 October: these asserted a name read out of the address, which is the defect (Hafsah: not even the start of an address is a name). */
  it('is never named from the address, whole or in part', () => {
    expect(displayName(invited('p1', 'amani.wekesa@kito.test'))).toBeNull();
    expect(displayName(invited('p2', 'baraka.mutua@kito.test'))).toBeNull();
  });

  it('is called one colleague and another colleague, with nothing of the address in it', () => {
    const words = plainWordsByPerson([invited('p1', 'amani.wekesa@kito.test'), invited('p2', 'baraka.mutua@kito.test')]);
    expect([...words.values()]).toEqual(['one colleague', 'another colleague']);
    expect(JSON.stringify([...words.values()])).not.toMatch(/@|amani|wekesa|baraka|mutua/i);
  });

  it('keeps the name they were given, and their sign-in name, ahead of the address', () => {
    expect(displayName(invited('p1', 'amani.wekesa@kito.test', { nameGiven: 'Amani W.' }))).toBe('Amani W.');
    expect(displayName(invited('p1', 'amani.wekesa@kito.test', { user: { firstName: 'Amani', lastName: 'Wekesa-Otieno' } }))).toBe('Amani Wekesa-Otieno');
  });

  it('still says a colleague for a desk, an address with digits, and a placeholder address', () => {
    for (const email of ['accounts@kito.test', 'zawadi.u8@kito.test', 'sam@kito.test', 'p-role@kito.test', 'x1f3@unclaimed.invalid']) {
      expect(displayName(invited('p1', email))).toBeNull();
    }
    const words = plainWordsByPerson([invited('p1', 'accounts@kito.test'), invited('p2', 'sales@kito.test')]);
    expect([...words.values()]).toEqual(['one colleague', 'another colleague']);
  });
});
