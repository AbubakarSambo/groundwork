import { readFileSync } from 'fs';
import { join } from 'path';
import { theirHome } from './where-somebody-is-from';

/**
 * "guestFrom" names where somebody is from, not where they last looked (U.4 third review). Baraka's
 * home is Pembe Test Co; he had switched to Mto Test Supplies, and the reply said he was from Mto.
 */
const m = (organizationId: string, name: string, role: string, day: number, owner: string | null = null) =>
  ({ organizationId, role, createdAt: new Date(2026, 8, day), organization: { name, ownerUserId: owner } });

describe('where somebody is from', () => {
  it('the organisation they own, whatever they last switched to', () => {
    expect(theirHome('baraka', [m('mto', 'Mto Test Supplies', 'MEMBER', 1), m('pembe', 'Pembe Test Co', 'ADMIN', 5, 'baraka')]))
      .toEqual({ id: 'pembe', name: 'Pembe Test Co' });
  });
  it('or the first one they joined as anything but a guest', () => {
    expect(theirHome('baraka', [m('mto', 'Mto Test Supplies', 'GUEST', 1), m('pembe', 'Pembe Test Co', 'MEMBER', 3), m('kilimo', 'Kilimo', 'MEMBER', 9)]))
      .toEqual({ id: 'pembe', name: 'Pembe Test Co' });
  });
  it('never a guest membership, even the only one', () => {
    expect(theirHome('baraka', [m('mto', 'Mto Test Supplies', 'GUEST', 1)])).toBeNull();
  });
  it('and the add reply reads it from the memberships, not User.organizationId', () => {
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const grounds = strip(readFileSync(join(__dirname, '..', 'grounds', 'grounds.service.ts'), 'utf8'));
    expect(grounds).toContain('const home = account ? theirHome(account.id, theirMemberships as any) : null;');
    expect(grounds).toContain("? { guestFrom: home?.name ?? 'another organisation' }");
    expect(grounds).not.toMatch(/guestFrom: theirHome!\.organization/);
  });
});
