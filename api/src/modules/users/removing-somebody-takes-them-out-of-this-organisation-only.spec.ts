import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { ConversationService } from '../conversation/conversation.service';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';

/**
 * REMOVING SOMEBODY TAKES THEM OUT OF THIS ORGANISATION ONLY (Hafsah, 11 October 2026): "their
 * place, check-ins and data in the other organisation stay untouched".
 *
 * Neema Kamau belongs to Msingi Foods and to Lakeview Clinic. Grace, an admin of Msingi, removes
 * her. Before this, Remove found only people whose sign-in pointed at Msingi ("We could not find
 * that sign-in" otherwise), and for those it deactivated the whole sign-in, Lakeview included.
 *
 * One small in-memory store, so every reader below reads the same rows the remove wrote.
 */
const MSINGI = 'msingi';
const LAKEVIEW = 'lakeview';

type Store = ReturnType<typeof aStore>;
function aStore(neemaHome: string) {
  const users: any[] = [
    { id: 'grace', email: 'grace@msingi.test', firstName: 'Grace', lastName: 'Achieng', role: 'ADMIN', organizationId: MSINGI, isActive: true, deletedAt: null, tokenEpoch: 0, isEmailVerified: true, createdAt: new Date('2026-01-01'), awaitingOrgApproval: false },
    { id: 'neema', email: 'neema@lakeview.test', firstName: 'Neema', lastName: 'Kamau', role: neemaHome === LAKEVIEW ? 'LEAD' : 'MEMBER', organizationId: neemaHome, isActive: true, deletedAt: null, tokenEpoch: 0, isEmailVerified: true, createdAt: new Date('2026-02-01'), awaitingOrgApproval: false },
    { id: 'juma', email: 'juma@msingi.test', firstName: 'Juma', lastName: 'Otieno', role: 'MEMBER', organizationId: MSINGI, isActive: true, deletedAt: null, tokenEpoch: 0, isEmailVerified: true, createdAt: new Date('2026-03-01'), awaitingOrgApproval: false },
  ];
  const memberships: any[] = [
    { id: 'm1', userId: 'grace', organizationId: MSINGI, role: 'ADMIN', heldForASeat: false, createdAt: new Date('2026-01-01') },
    { id: 'm2', userId: 'neema', organizationId: LAKEVIEW, role: 'LEAD', heldForASeat: false, createdAt: neemaHome === LAKEVIEW ? new Date('2026-02-01') : new Date('2026-04-01') },
    { id: 'm3', userId: 'neema', organizationId: MSINGI, role: 'MEMBER', heldForASeat: false, createdAt: neemaHome === MSINGI ? new Date('2026-02-01') : new Date('2026-04-01') },
    { id: 'm4', userId: 'juma', organizationId: MSINGI, role: 'MEMBER', heldForASeat: false, createdAt: new Date('2026-03-01') },
  ];
  const orgs: any[] = [
    { id: MSINGI, name: 'Msingi Foods', slug: 'msingi', ownerUserId: 'grace' },
    { id: LAKEVIEW, name: 'Lakeview Clinic', slug: 'lakeview', ownerUserId: 'someone-at-lakeview' },
  ];
  const grounds: any[] = [{ id: 'g-msingi', organizationId: MSINGI }, { id: 'g-lakeview', organizationId: LAKEVIEW }];
  const participants: any[] = [
    { id: 'p-msingi', groundId: 'g-msingi', userId: 'neema', email: 'neema@lakeview.test' },
    { id: 'p-lakeview', groundId: 'g-lakeview', userId: 'neema', email: 'neema@lakeview.test' },
  ];
  const checkIns: any[] = [
    { id: 'c-msingi', groundId: 'g-msingi', participantId: 'p-msingi', status: 'IN_PROGRESS', words: 'Neema said this in Msingi.' },
    { id: 'c-lakeview', groundId: 'g-lakeview', participantId: 'p-lakeview', status: 'IN_PROGRESS', words: 'Neema said this in Lakeview.' },
  ];
  return { users, memberships, orgs, grounds, participants, checkIns };
}

const matches = (row: any, where: any = {}): boolean => Object.entries(where).every(([k, v]: [string, any]) => {
  if (k === 'user') return matches(fakeUserOf(row), v);
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    if ('not' in v) return row[k] !== v.not;
    if ('in' in v) return v.in.includes(row[k]);
  }
  return row[k] === v;
});
let current: Store;
const fakeUserOf = (m: any) => current.users.find((u) => u.id === m.userId);

function aPrisma(s: Store): any {
  current = s;
  const withOrgAndUser = (m: any) => ({ ...m, organization: s.orgs.find((o) => o.id === m.organizationId), user: s.users.find((u) => u.id === m.userId) });
  const prisma: any = {
    user: {
      findFirst: async ({ where }: any) => s.users.find((u) => matches(u, where)) ?? null,
      findUnique: async ({ where }: any) => {
        const u = s.users.find((x) => x.id === where.id);
        return u ? { ...u, organization: s.orgs.find((o) => o.id === u.organizationId) } : null;
      },
      findMany: async () => [],
      update: async ({ where, data }: any) => { const u = s.users.find((x) => x.id === where.id); Object.assign(u, data); return u; },
      count: async ({ where }: any) => s.users.filter((u) => matches(u, where)).length,
    },
    organization: { findUnique: async ({ where }: any) => s.orgs.find((o) => o.id === where.id) ?? null },
    organizationMembership: {
      findUnique: async ({ where }: any) => {
        const k = where.userId_organizationId;
        const m = s.memberships.find((x) => x.userId === k.userId && x.organizationId === k.organizationId);
        return m ? withOrgAndUser(m) : null;
      },
      findMany: async ({ where }: any = {}) => s.memberships.filter((m) => matches(m, where)).sort((a, b) => a.createdAt - b.createdAt).map(withOrgAndUser),
      count: async ({ where }: any) => s.memberships.filter((m) => matches(m, where)).length,
      deleteMany: async ({ where }: any) => {
        const before = s.memberships.length;
        s.memberships = s.memberships.filter((m) => !matches(m, where));
        current = s;
        return { count: before - s.memberships.length };
      },
    },
    ground: {
      findUnique: async ({ where }: any) => s.grounds.find((g) => g.id === where.id) ?? null,
      findMany: async () => [],
    },
    groundParticipant: { findMany: async () => [] },
    person: { findMany: async () => [] },
    membershipRequest: { findMany: async () => [] },
    checkIn: {
      findUnique: async ({ where }: any) => {
        const c = s.checkIns.find((x) => x.id === where.id);
        if (!c) return null;
        const p = s.participants.find((x) => x.id === c.participantId);
        return { ...c, participant: { ...p, user: s.users.find((u) => u.id === p.userId) } };
      },
    },
  };
  prisma.$transaction = async (fn: any) => fn(prisma);
  return prisma;
}

function services(s: Store) {
  const prisma = aPrisma(s);
  const users = Object.create(UsersService.prototype) as any;
  users.prisma = prisma;
  users.logger = { log: () => {} };
  const auth = Object.create(AuthService.prototype) as any;
  auth.prisma = prisma;
  const conversation = Object.create(ConversationService.prototype) as any;
  conversation.prisma = prisma;
  const jwt = Object.create(JwtStrategy.prototype) as any;
  jwt.prisma = prisma;
  return { users, auth, conversation, jwt, prisma };
}

const peopleOf = async (users: any, organizationId: string) =>
  (await users.findAll(organizationId, { page: 1, limit: 50 }, 'grace')).data.map((p: any) => p.displayName);

describe.each([
  ['her sign-in points at Lakeview Clinic, and she was invited into Msingi Foods', LAKEVIEW],
  ['her sign-in points at Msingi Foods, and she also belongs to Lakeview Clinic', MSINGI],
])('Grace removes Neema from Msingi Foods when %s', (_how, home) => {
  let s: Store;
  let svc: ReturnType<typeof services>;
  beforeEach(async () => {
    s = aStore(home);
    svc = services(s);
    expect(await peopleOf(svc.users, MSINGI)).toContain('Neema Kamau');
    await svc.users.remove('neema', MSINGI, 'grace');
  });

  it('she is no longer on Msingi Foods\' people list', async () => {
    expect((await peopleOf(svc.users, MSINGI)).sort()).toEqual(['Grace Achieng', 'Juma Otieno']);
  });

  it('she cannot switch into Msingi Foods', async () => {
    await expect(svc.auth.switchOrganization('neema', MSINGI)).rejects.toThrow('You are not a member of that organisation, so switch to one you belong to.');
  });

  it('she cannot open Msingi Foods\' check-in, and is told why in a sentence', async () => {
    await expect(svc.conversation.loadOwnedCheckIn('c-msingi', 'neema')).rejects.toThrow(ForbiddenException);
    await expect(svc.conversation.loadOwnedCheckIn('c-msingi', 'neema')).rejects.toThrow('You are no longer part of the organisation this check-in belongs to, so you cannot open it.');
  });

  it('she still signs in, and her sign-in now points at Lakeview Clinic with her role there', async () => {
    const who = await svc.jwt.validate({ sub: 'neema', epoch: 0 });
    expect(who.organizationId).toBe(LAKEVIEW);
    expect(who.role).toBe('LEAD');
    expect(who.email).toBe('neema@lakeview.test');
    const neema = s.users.find((u) => u.id === 'neema');
    expect(neema.isActive).toBe(true);
    expect(neema.deletedAt).toBeNull();
  });

  it('her Lakeview Clinic membership, check-in and words are unchanged', async () => {
    expect(s.memberships.filter((m) => m.userId === 'neema')).toEqual([expect.objectContaining({ organizationId: LAKEVIEW, role: 'LEAD', heldForASeat: false })]);
    const c = await svc.conversation.loadOwnedCheckIn('c-lakeview', 'neema');
    expect(c.words).toBe('Neema said this in Lakeview.');
    expect((await svc.auth.myOrganizations('neema')).map((o: any) => [o.name, o.active])).toEqual([['Lakeview Clinic', true]]);
  });

  it('nothing she said in Msingi Foods is deleted', () => {
    expect(s.checkIns.find((c) => c.id === 'c-msingi')?.words).toBe('Neema said this in Msingi.');
    expect(s.participants.find((p) => p.id === 'p-msingi')?.userId).toBe('neema');
  });
});

describe('what Grace\'s People page is served before she removes anybody', () => {
  it('names the other organisation Neema belongs to, so Remove can say she keeps her place there, and none for Juma', async () => {
    const svc = services(aStore(LAKEVIEW));
    const rows = (await svc.users.findAll(MSINGI, { page: 1, limit: 50 }, 'grace')).data;
    expect(rows.find((r: any) => r.id === 'neema').alsoIn).toEqual(['Lakeview Clinic']);
    expect(rows.find((r: any) => r.id === 'juma').alsoIn).toEqual([]);
  });
});

describe('somebody whose only organisation is Msingi Foods is removed as before', () => {
  it('the sign-in is deactivated and anonymised, and their words stay', async () => {
    const s = aStore(LAKEVIEW);
    const svc = services(s);
    expect(await svc.users.remove('juma', MSINGI, 'grace')).toEqual({ message: 'User deactivated' });
    const juma = s.users.find((u) => u.id === 'juma');
    expect(juma.isActive).toBe(false);
    expect(juma.deletedAt).toBeInstanceOf(Date);
    expect(juma.email).toBe('deleted-juma@groundwork.deleted');
    await expect(svc.jwt.validate({ sub: 'juma', epoch: 0 })).rejects.toThrow(UnauthorizedException);
    expect(await peopleOf(svc.users, MSINGI)).not.toContain('Juma Otieno');
  });
});

describe('only an admin of the organisation can remove somebody from it (the existing rule)', () => {
  it('the route is for admins only', () => {
    const { UsersController } = require('./users.controller');
    const roles = Reflect.getMetadata('roles', UsersController.prototype.remove);
    expect(roles).toEqual(['ADMIN']);
  });

  it('an admin of Lakeview Clinic cannot reach Juma, who is only in Msingi Foods', async () => {
    const s = aStore(LAKEVIEW);
    const svc = services(s);
    await expect(svc.users.remove('juma', LAKEVIEW, 'someone-at-lakeview')).rejects.toThrow('We could not find that sign-in, so sign in again and try once more.');
    expect(s.users.find((u) => u.id === 'juma').isActive).toBe(true);
  });
});
