import { refuseANumberOnSomebodyElse, theNumberOnRecord, theSignInFor } from './one-number-for-a-person';

/**
 * SAVING A PERSON'S OWN NUMBER AGAIN IS NEVER REFUSED, AND THEIR ROW SHOWS IT (round 5, the family business admin: "a loop trying to
 * add phone numbers that I had already given the system").
 *
 * Juma was invited on People, so he has a sign-in, and his roster entry is linked to it and holds the number given for him. On the
 * check-in he has not opened his invitation yet, so the check-in knows him only by his address. The row read the number by that empty
 * link and said "Juma Mumbi has no WhatsApp number yet"; typing it again was refused as "already saved for Juma Mumbi". A person is
 * their sign-in, found from their address when the check-in has none linked yet.
 */
const JUMA = { id: 'u-juma', email: 'juma@family.test', firstName: 'Juma', lastName: 'Mumbi', phoneNumber: '+254722111222', deletedAt: null };
const KARANJA = { id: 'u-karanja', email: 'karanja@family.test', firstName: 'Karanja', lastName: 'Mumbi', phoneNumber: '+254733444555', deletedAt: null };

function aDatabase() {
  const users = [JUMA, KARANJA];
  const people = [
    { organizationId: 'org-f', linkedUserId: 'u-juma', email: null, displayName: 'Juma Mumbi', phone: '+254722111222', active: true, updatedAt: 2 },
    { organizationId: 'org-f', linkedUserId: 'u-karanja', email: null, displayName: 'Karanja Mumbi', phone: '+254733444555', active: true, updatedAt: 1 },
  ];
  const one = (p: any, c: any): boolean => c.OR ? c.OR.some((x: any) => one(p, x)) : c.NOT ? (c.NOT.linkedUserId !== undefined ? p.linkedUserId != null && p.linkedUserId !== c.NOT.linkedUserId : p.email != null && p.email.toLowerCase() !== c.NOT.email.equals.toLowerCase())
    : 'linkedUserId' in c ? p.linkedUserId === c.linkedUserId : 'email' in c ? (p.email ?? '').toLowerCase() === String(c.email?.equals ?? c.email).toLowerCase() : true;
  const prisma: any = {
    user: {
      updateMany: async () => ({ count: 0 }),
      findFirst: async ({ where }: any) => users.find((u) =>
        (where.phoneNumber ? where.phoneNumber.in.includes(u.phoneNumber) && u.id !== where.NOT?.id : true)
        && (where.email ? u.email === String(where.email.equals).toLowerCase() : true)) ?? null,
      findUnique: async ({ where }: any) => users.find((u) => u.id === where.id) ?? null,
    },
    person: {
      findFirst: async ({ where }: any) => people.find((p) => p.organizationId === where.organizationId && where.phone.in.includes(p.phone) && p.active && (where.AND ?? []).every((c: any) => one(p, c))) ?? null,
      findMany: async ({ where }: any) => people.filter((p) => p.organizationId === where.organizationId && p.phone && where.OR.some((c: any) => one(p, c))).sort((a, b) => b.updatedAt - a.updatedAt),
    },
    organizationMembership: { findFirst: async () => ({ userId: 'x' }) },
  };
  return prisma;
}

describe('Juma, invited on People, not yet opened on the check-in', () => {
  it('is his sign-in, found from his address', async () => {
    expect(await theSignInFor(aDatabase(), { userId: null, email: 'Juma@family.test' })).toBe('u-juma');
  });

  it('his row on the check-in shows the number given for him', async () => {
    expect(await theNumberOnRecord(aDatabase(), 'org-f', { userId: null, email: 'juma@family.test' })).toBe('+254722111222');
  });

  it('saving his own number again is not refused', async () => {
    await expect(refuseANumberOnSomebodyElse(aDatabase(), '0722 111 222', null, 'org-f', 'juma@family.test')).resolves.toBeUndefined();
  });

  it('Karanja’s number is still refused for Juma, naming Karanja', async () => {
    await expect(refuseANumberOnSomebodyElse(aDatabase(), '+254733444555', null, 'org-f', 'juma@family.test'))
      .rejects.toThrow('This number is already saved for Karanja Mumbi, so it cannot be saved for somebody else too.');
  });
});
