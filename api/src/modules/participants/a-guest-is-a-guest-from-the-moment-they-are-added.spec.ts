import { readFileSync } from 'fs';
import { join } from 'path';
import { aGuestHereIfTheyAreFromElsewhere } from './a-guest-is-a-guest-from-the-moment-they-are-added';

/** A GUEST FROM THE MOMENT THEY ARE ADDED (U.4 review), and never a member. */
function aDb(accounts: any[], memberships: any[]) {
  const made: any[] = [];
  return {
    made,
    db: {
      user: { findUnique: async ({ where }: any) => accounts.find((a) => a.email === where.email) ?? null },
      organizationMembership: {
        findUnique: async ({ where }: any) => memberships.find((m) => m.userId === where.userId_organizationId.userId && m.organizationId === where.userId_organizationId.organizationId) ?? null,
        create: async ({ data }: any) => { made.push(data); memberships.push(data); return data; },
      },
    },
  };
}
const peter = { id: 'peter', email: 'peter@ouma-agencies.co.ke', organizationId: 'ouma', isActive: true, deletedAt: null };
const miriam = { id: 'miriam', email: 'miriam@baridi.co.ke', organizationId: 'baridi', isActive: true, deletedAt: null };

describe('somebody from another organisation, added to a check-in', () => {
  it('gets a GUEST membership here straight away, never MEMBER and never their role at home', async () => {
    const { db, made } = aDb([peter], [{ userId: 'peter', organizationId: 'ouma', role: 'ADMIN' }]);
    expect(await aGuestHereIfTheyAreFromElsewhere(db, 'baridi', ' Peter@Ouma-Agencies.co.ke ')).toBe(true);
    expect(made).toEqual([{ userId: 'peter', organizationId: 'baridi', role: 'GUEST' }]);
  });

  it('and only once: a second check-in, or a role given here later, is left alone', async () => {
    const { db, made } = aDb([peter], [{ userId: 'peter', organizationId: 'baridi', role: 'MEMBER' }]);
    expect(await aGuestHereIfTheyAreFromElsewhere(db, 'baridi', peter.email)).toBe(false);
    expect(made).toEqual([]);
  });
});

describe('nobody else is touched', () => {
  it('not somebody of this organisation, and no account is created for an address with none', async () => {
    const { db, made } = aDb([miriam], []);
    expect(await aGuestHereIfTheyAreFromElsewhere(db, 'baridi', miriam.email)).toBe(false);
    expect(await aGuestHereIfTheyAreFromElsewhere(db, 'baridi', 'new@nowhere.test')).toBe(false);
    expect(made).toEqual([]);
  });

  it('not an account that has been removed', async () => {
    const { db, made } = aDb([{ ...peter, deletedAt: new Date() }], []);
    expect(await aGuestHereIfTheyAreFromElsewhere(db, 'baridi', peter.email)).toBe(false);
    expect(made).toEqual([]);
  });
});

describe('every door that adds a person writes it, after its refusals', () => {
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const grounds = strip(readFileSync(join(__dirname, '..', 'grounds', 'grounds.service.ts'), 'utf8'));
  it('adding one person (and so the setup commit, which calls it), and an admin setting a check-in up for a lead', () => {
    const add = grounds.slice(grounds.indexOf('async addParticipant('), grounds.indexOf('const participant = await this.prisma.$transaction(async (tx) => {', grounds.indexOf('async addParticipant(')));
    /* Where they stand is written in one place now, a guest included (theirPlaceHereOnceAdded, 26 November 2026); a re-add still uses the guest write. */
    expect(add).toContain('await aGuestHereIfTheyAreFromElsewhere(this.prisma as any, ground.organizationId, dto.email);');
    expect(add).toContain('await theirPlaceHereOnceAdded(this.prisma as any, ground.organizationId, dto.email,');
    /* The last refusal before the row is written comes before the place is written. */
    expect(add.lastIndexOf('throw new')).toBeLessThan(add.lastIndexOf('theirPlaceHereOnceAdded'));
    expect(grounds).toContain('await theirPlaceHereOnceAdded(tx as any, organizationId, p.email,');
  });
});
